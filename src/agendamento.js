const provedorIA = require("./ia-provedor");
const googleCalendar = require("./googleCalendar");
const { getNegocio } = require("./negocio");
const conversas = require("./conversas");

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function formatarData(data) {
  return data.toISOString().slice(0, 10); // AAAA-MM-DD
}

function formatarHorario(data) {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function formatarDataLegivel(data) {
  return data.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
}

/**
 * Usa a IA só pra CLASSIFICAR a intenção (uma chamada barata, resposta em
 * JSON curto) — a ação de verdade (consultar calendário, criar evento) é
 * feita em código puro, não pela IA. Isso evita que a IA "invente" horários
 * ou confirme agendamentos que não existem de verdade.
 */
async function classificarIntencao(mensagem) {
  const hoje = new Date().toISOString().slice(0, 10);

  const texto = await provedorIA.gerar({
    contents: mensagem,
    systemInstruction: `Classifique a intenção de uma mensagem de cliente de WhatsApp para um negócio.
Hoje é ${hoje} (formato AAAA-MM-DD). Se a pessoa mencionar "hoje", "amanhã", "sexta que vem" etc, calcule a data real.
Responda APENAS em JSON, sem texto extra, neste formato:
{
  "intencao": "agendar" | "escolher_horario" | "cancelar" | "faq" | "outro",
  "data_mencionada": "AAAA-MM-DD ou null",
  "numero_escolhido": "número do horário escolhido (1, 2, 3...) se a pessoa estiver respondendo a uma lista de opções, ou null"
}`,
    temperature: 0.1,
    modoJson: true,
  });

  return JSON.parse(texto);
}

function buscarFaqMaisParecida(mensagem, faq) {
  if (!faq || faq.length === 0) return null;

  const palavras = (t) =>
    new Set(
      t
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(/\s+/)
        .filter((p) => p.length > 2)
    );

  const palavrasMsg = palavras(mensagem);
  let melhor = null;
  let melhorPontuacao = 0;

  for (const item of faq) {
    const palavrasPergunta = palavras(item.pergunta);
    let pontuacao = 0;
    for (const p of palavrasMsg) if (palavrasPergunta.has(p)) pontuacao++;
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhor = item;
    }
  }

  return melhorPontuacao > 0 ? melhor : null;
}

/** Consulta o calendário e monta uma lista numerada de horários disponíveis. */
async function oferecerHorarios({ remetente, dataAlvo, negocio }) {
  const diaSemana = DIAS_SEMANA[new Date(`${dataAlvo}T12:00:00`).getDay()];
  const horarioFuncionamento = negocio.horarios[diaSemana];

  if (!horarioFuncionamento) {
    return `A gente não abre nesse dia. Nosso funcionamento é: ${Object.entries(negocio.horarios)
      .filter(([, h]) => h)
      .map(([dia, h]) => `${dia} ${h.inicio}-${h.fim}`)
      .join(", ")}.`;
  }

  const slots = await googleCalendar.listarHorariosDisponiveis({
    data: dataAlvo,
    duracaoMinutos: negocio.duracaoAtendimentoMin,
    horaInicio: horarioFuncionamento.inicio,
    horaFim: horarioFuncionamento.fim,
    calendarId: negocio.calendarId,
  });

  if (slots.length === 0) {
    return `Não tem horário livre em ${formatarDataLegivel(new Date(`${dataAlvo}T12:00:00`))}. Quer tentar outro dia?`;
  }

  conversas.definirEstadoAgendamento(remetente, { aguardandoEscolha: true, slots: slots.map((s) => s.toISOString()) });

  const lista = slots.slice(0, 6).map((s, i) => `${i + 1}) ${formatarHorario(s)}`).join("\n");
  return `Horários disponíveis em ${formatarDataLegivel(new Date(`${dataAlvo}T12:00:00`))}:\n${lista}\n\nResponde com o número da opção que preferir.`;
}

/** Confirma o horário escolhido e cria o evento de verdade no Google Calendar. */
async function confirmarHorario({ remetente, numeroEscolhido, negocio }) {
  const estado = conversas.obterEstadoAgendamento(remetente);
  if (!estado?.aguardandoEscolha) {
    return "Não tenho nenhum horário pendente de confirmação. Quer marcar um atendimento? Me diz o dia que prefere.";
  }

  const indice = Number(numeroEscolhido) - 1;
  const slotISO = estado.slots[indice];
  if (!slotISO) {
    return "Não entendi esse número. Responde com um dos números da lista que te mandei.";
  }

  const inicio = new Date(slotISO);
  const fim = new Date(inicio.getTime() + negocio.duracaoAtendimentoMin * 60000);

  await googleCalendar.criarEvento({
    inicio,
    fim,
    titulo: `Atendimento — ${negocio.nomeNegocio || "Agendamento"}`,
    descricao: `Agendado automaticamente via WhatsApp (${remetente}).`,
    calendarId: negocio.calendarId,
  });

  conversas.definirEstadoAgendamento(remetente, null);

  return `Confirmado! Te esperamos ${formatarDataLegivel(inicio)} às ${formatarHorario(inicio)}. Até lá!`;
}

/**
 * Ponto de entrada do modo negócio: recebe a mensagem, classifica a
 * intenção, e decide entre agendar, responder FAQ, ou repassar pra
 * conversa genérica.
 */
async function processarMensagemNegocio({ remetente, texto }) {
  const negocio = getNegocio();
  const estadoAtual = conversas.obterEstadoAgendamento(remetente);

  const intencaoInfo = await classificarIntencao(texto);

  // Se já tem uma lista de horários pendente e a pessoa parece estar
  // respondendo com um número, prioriza a confirmação.
  if (estadoAtual?.aguardandoEscolha && (intencaoInfo.intencao === "escolher_horario" || /^\s*\d+\s*$/.test(texto))) {
    const numero = intencaoInfo.numero_escolhido || texto.trim();
    return confirmarHorario({ remetente, numeroEscolhido: numero, negocio });
  }

  if (intencaoInfo.intencao === "agendar") {
    if (!googleCalendar.estaConectado()) {
      return "Ainda não consigo consultar a agenda automaticamente (Google Calendar não conectado). Vou te colocar em contato com alguém pra confirmar o horário.";
    }
    const dataAlvo = intencaoInfo.data_mencionada || new Date().toISOString().slice(0, 10);
    return oferecerHorarios({ remetente, dataAlvo, negocio });
  }

  if (intencaoInfo.intencao === "faq") {
    const faqEncontrada = buscarFaqMaisParecida(texto, negocio.faq);
    if (faqEncontrada) return faqEncontrada.resposta;
    return "Boa pergunta — não tenho essa informação configurada ainda. Vou verificar e te retorno.";
  }

  if (intencaoInfo.intencao === "cancelar") {
    conversas.definirEstadoAgendamento(remetente, null);
    return "Sem problemas, não vou confirmar nenhum horário. Se quiser remarcar depois, é só chamar.";
  }

  // "outro" — assunto fora do escopo de agendamento/FAQ. Resposta genérica,
  // profissional, sem tentar imitar estilo pessoal (isso é o modo clone).
  const textoGenerico = await provedorIA.gerar({
    contents: texto,
    systemInstruction: `Você é o assistente virtual do negócio "${negocio.nomeNegocio || "nosso negócio"}". Seja educado, breve e direto. Se não souber responder algo específico do negócio, diga que vai verificar com a equipe. Não invente informações sobre preços, endereço ou horários — isso você não tem certeza.`,
    temperature: 0.5,
    maxOutputTokens: 150,
  });

  return textoGenerico?.trim() || "Certo, vou verificar isso e te retorno.";
}

module.exports = { processarMensagemNegocio };
