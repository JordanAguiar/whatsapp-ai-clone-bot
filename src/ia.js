const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const { listarCorrecoes } = require("./correcoes");
const { getConfig } = require("./config");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = "gemini-3.1-flash-lite"; // limites gratuitos bem mais generosos (30 RPM / 1.500 por dia) que o Flash normal, ideal pra respostas curtas e frequentes

/**
 * O Gemini às vezes retorna 503/UNAVAILABLE por sobrecarga temporária no
 * servidor do Google — não é erro nosso, e quase sempre se resolve sozinho
 * em alguns segundos. Em vez de desistir na primeira falha, tentamos de
 * novo automaticamente, com espera crescente entre as tentativas.
 */
async function chamarComRetentativas(chamada, tentativasRestantes = 3, esperaMs = 3000) {
  try {
    return await chamada();
  } catch (erro) {
    const mensagem = erro?.message || "";
    const ehSobrecarga = mensagem.includes("UNAVAILABLE") || mensagem.includes("high demand") || mensagem.includes('"code":503');
    const ehCotaEsgotada = mensagem.includes("RESOURCE_EXHAUSTED") || mensagem.includes('"code":429') || mensagem.includes("quota");

    if (ehCotaEsgotada) {
      // Cota diária/por minuto excedida — tentar de novo agora não resolve.
      // RPM se recupera em ~1min, RPD só reseta à meia-noite (horário do Pacífico dos EUA).
      console.error(
        "🛑 Cota gratuita do Gemini esgotada. Se for por minuto (RPM), espere ~1min. Se for diária (RPD), só reseta à meia-noite (horário da Califórnia)."
      );
      throw erro;
    }

    if (ehSobrecarga && tentativasRestantes > 0) {
      console.log(`⏳ Gemini sobrecarregado, tentando de novo em ${esperaMs / 1000}s... (restam ${tentativasRestantes} tentativas)`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
      return chamarComRetentativas(chamada, tentativasRestantes - 1, esperaMs * 2);
    }

    throw erro;
  }
}

const CAMINHO_PERFIL = path.join(__dirname, "..", "data", "profile.json");
const CAMINHO_MENSAGENS = path.join(__dirname, "..", "data", "minhas-mensagens.json");

// Carregados em memória; recarregados sob demanda via recarregarPerfil()
// (chamado pelo painel web depois de rodar uma nova análise de estilo).
let perfilEstilo = null;
let minhasMensagens = [];

function recarregarPerfil() {
  try {
    perfilEstilo = JSON.parse(fs.readFileSync(CAMINHO_PERFIL, "utf-8"));
    minhasMensagens = JSON.parse(fs.readFileSync(CAMINHO_MENSAGENS, "utf-8"));
    console.log(`ℹ️  Perfil de estilo carregado (${minhasMensagens.length} mensagens de referência).`);
  } catch {
    perfilEstilo = null;
    minhasMensagens = [];
    console.warn("⚠️  profile.json ou minhas-mensagens.json não encontrados ainda.");
  }
}
recarregarPerfil(); // carga inicial

// Limite pra não deixar o arquivo de exemplos crescer sem parar — mantém
// sempre as mais recentes, que refletem melhor como você escreve hoje.
const LIMITE_MENSAGENS_APRENDIDAS = 3000;

/**
 * Chamada quando o usuário digita uma mensagem de verdade no WhatsApp
 * (não o bot) e o aprendizado contínuo está ativado. Vira exemplo novo
 * de estilo imediatamente, sem precisar exportar/analisar nada depois.
 */
function capturarMensagemReal(texto) {
  const limpo = (texto || "").trim();
  if (limpo.length < 8) return; // mensagens muito curtas não ajudam como exemplo

  minhasMensagens.push(limpo);
  if (minhasMensagens.length > LIMITE_MENSAGENS_APRENDIDAS) {
    minhasMensagens = minhasMensagens.slice(-LIMITE_MENSAGENS_APRENDIDAS);
  }

  try {
    fs.writeFileSync(CAMINHO_MENSAGENS, JSON.stringify(minhasMensagens, null, 2), "utf-8");
  } catch (erro) {
    console.error("Erro ao salvar mensagem aprendida em tempo real:", erro.message);
  }
}

/**
 * Similaridade simples por sobreposição de palavras (sem embeddings, sem custo,
 * sem dependências externas). Não é state-of-the-art, mas pra achar mensagens
 * "no mesmo assunto/tom" já funciona surpreendentemente bem.
 */
function palavrasChave(texto) {
  return new Set(
    texto
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "") // remove pontuação, mantém letras/números/acentos
      .split(/\s+/)
      .filter((p) => p.length > 2) // ignora palavras muito curtas (ex: "de", "eu")
  );
}

function buscarCorrecoesSimilares(mensagemRecebida, correcoes, quantidade = 2) {
  if (correcoes.length === 0) return [];

  const palavrasAlvo = palavrasChave(mensagemRecebida);
  if (palavrasAlvo.size === 0) return [];

  const pontuadas = correcoes.map((c) => {
    const palavrasMsg = palavrasChave(c.mensagem_recebida);
    let intersecao = 0;
    for (const palavra of palavrasAlvo) {
      if (palavrasMsg.has(palavra)) intersecao++;
    }
    return { c, pontuacao: intersecao };
  });

  return pontuadas
    .filter((p) => p.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, quantidade)
    .map((p) => p.c);
}

function buscarExemplosSimilares(mensagemRecebida, quantidade = 3) {
  const palavrasAlvo = palavrasChave(mensagemRecebida);
  if (palavrasAlvo.size === 0) return [];

  const pontuadas = minhasMensagens.map((msg) => {
    const palavrasMsg = palavrasChave(msg);
    let intersecao = 0;
    for (const palavra of palavrasAlvo) {
      if (palavrasMsg.has(palavra)) intersecao++;
    }
    return { msg, pontuacao: intersecao };
  });

  return pontuadas
    .filter((p) => p.pontuacao > 0)
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, quantidade)
    .map((p) => p.msg);
}

function montarPromptDeSistema() {
  const config = getConfig();

  let prompt;
  if (!perfilEstilo) {
    prompt =
      "Você é um assistente respondendo mensagens de WhatsApp. " +
      "Seja breve, direto e natural, como uma conversa real de chat.";
  } else {
    prompt = `Você está respondendo mensagens de WhatsApp como se fosse a própria pessoa (não como assistente/IA).
Imite o estilo de escrita real dela, descrito abaixo. Responda como ela responderia, sem se identificar como IA.

Perfil de estilo:
- Tom: ${perfilEstilo.tom}
- Tamanho típico das respostas: ${perfilEstilo.tamanho_medio_respostas}
- Uso de emoji: ${perfilEstilo.uso_de_emoji}
- Gírias/expressões recorrentes: ${(perfilEstilo.girias_e_expressoes || []).join(", ")}
- Saudações comuns: ${(perfilEstilo.saudacoes_comuns || []).join(", ")}
- Despedidas comuns: ${(perfilEstilo.despedidas_comuns || []).join(", ")}
- Pontuação: ${perfilEstilo.pontuacao}
- Observações: ${perfilEstilo.observacoes_gerais}

Responda SEMPRE nesse estilo, mesmo que o assunto mude. Não seja formal demais nem explique demais — responda como uma mensagem de chat real, curta quando fizer sentido.
Regra crítica: siga o dado medido de uso de emoji à risca. Se ele diz uso raro, NÃO coloque emoji na resposta a menos que o exemplo abaixo mostre um. Não compense com pontuação exagerada ou textão. LLMs tendem a exagerar em polidez e emoji — resista a essa tendência aqui.`;
  }

  if (config.instrucoesExtras && config.instrucoesExtras.trim()) {
    prompt += `\n\nInstruções adicionais definidas pelo usuário (siga também):\n${config.instrucoesExtras.trim()}`;
  }

  return prompt;
}

/**
 * Gera uma resposta usando a IA do Gemini, no estilo de escrita da pessoa,
 * usando o perfil de estilo + exemplos reais parecidos (RAG leve) + correções
 * de calibração (lidas sempre "ao vivo", pra refletir edições feitas pela web
 * sem precisar reiniciar o bot).
 */
async function gerarResposta(mensagemRecebida) {
  const correcoes = listarCorrecoes();
  const exemplos = buscarExemplosSimilares(mensagemRecebida);
  const correcoesSimilares = buscarCorrecoesSimilares(mensagemRecebida, correcoes);

  // Se não achar correções parecidas pelo assunto, usa as mais recentes como
  // referência geral de estilo (ainda mais confiável que o histórico minerado,
  // já que vieram de feedback direto seu).
  const correcoesParaUsar =
    correcoesSimilares.length > 0 ? correcoesSimilares : correcoes.slice(-2);

  const contextoExemplos =
    exemplos.length > 0
      ? `\n\nExemplos reais de como essa pessoa já escreveu em situações parecidas (use APENAS como referência de estilo, não copie literalmente se não fizer sentido no contexto):\n${exemplos.map((e) => `- "${e}"`).join("\n")}`
      : "";

  const contextoCorrecoes =
    correcoesParaUsar.length > 0
      ? `\n\nCORREÇÕES DIRETAS DA PESSOA (prioridade MÁXIMA — mais confiável que qualquer outro exemplo, pois foi ela mesma quem corrigiu):\n${correcoesParaUsar
          .map((c) => `- Quando recebeu algo como "${c.mensagem_recebida}", ela respondeu: "${c.resposta_real}" (e NÃO como: "${c.resposta_ia_original}")`)
          .join("\n")}`
      : "";

  const resposta = await chamarComRetentativas(() =>
    ai.models.generateContent({
      model: MODELO,
      contents: mensagemRecebida,
      config: {
        systemInstruction: montarPromptDeSistema() + contextoExemplos + contextoCorrecoes,
        temperature: 0.6, // reduzido de 0.8 — temperatura alta tende a puxar pra respostas mais "elaboradas"/genéricas
        maxOutputTokens: 150, // reduzido de 300 — respostas de WhatsApp são curtas por natureza, e isso economiza cota
      },
    })
  );

  return resposta.text?.trim() || "Não consegui gerar uma resposta.";
}

module.exports = { gerarResposta, recarregarPerfil, capturarMensagemReal };
