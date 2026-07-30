const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CAMINHO_DATA = path.join(__dirname, "..", "data");
const CAMINHO_PERFIL = path.join(CAMINHO_DATA, "profile.json");
const CAMINHO_MENSAGENS = path.join(CAMINHO_DATA, "minhas-mensagens.json");

/**
 * O .txt exportado do WhatsApp vem no formato:
 * [DD/MM/AAAA HH:MM:SS] Nome: mensagem
 * Essa função extrai só as linhas do nome informado.
 */
function extrairMinhasMensagens(textoCompleto, meuNome) {
  const linhas = textoCompleto.split("\n");
  const minhasMensagens = [];

  // Regex tolerante a variações de formato entre Android/iPhone/idiomas.
  const regexLinha = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(:\d{2})?)\]?\s*[-]?\s*([^:]+):\s(.*)$/;

  for (const linha of linhas) {
    const match = linha.match(regexLinha);
    if (!match) continue;

    const [, , , , remetente, mensagem] = match;

    if (remetente.trim() === meuNome) {
      minhasMensagens.push(mensagem.trim());
    }
  }

  return minhasMensagens;
}

// Conta emojis de verdade nas mensagens, em vez de deixar a IA "achar" um
// número — LLMs tendem a superestimar uso de emoji ao descrever texto.
const REGEX_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

function calcularEstatisticasEmoji(mensagens) {
  const comEmoji = mensagens.filter((m) => REGEX_EMOJI.test(m)).length;
  const proporcao = mensagens.length > 0 ? comEmoji / mensagens.length : 0;
  return {
    mensagens_com_emoji: comEmoji,
    total_mensagens: mensagens.length,
    proporcao: Number(proporcao.toFixed(3)), // ex: 0.04 = emoji em 4% das mensagens
  };
}

async function gerarPerfilDeEstilo(mensagens) {
  // Embaralha antes de recortar, para a amostra não ficar enviesada
  // para o primeiro arquivo lido (caso haja mais de um .txt).
  const embaralhadas = [...mensagens].sort(() => Math.random() - 0.5);
  const amostra = embaralhadas.slice(0, 400).join("\n");

  const resposta = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "Você é um analista de linguagem. Vai receber uma lista de mensagens reais " +
          "de WhatsApp de uma pessoa. Analise o estilo de escrita dela e responda " +
          "APENAS em JSON válido, sem texto extra, seguindo exatamente este formato:\n" +
          `{
  "tom": "descrição do tom geral (formal, informal, bem-humorado, direto...)",
  "tamanho_medio_respostas": "curtas | médias | longas",
  "uso_de_emoji": "descrição de como e quais emojis usa, se usa",
  "girias_e_expressoes": ["lista", "de", "expressões", "recorrentes"],
  "saudacoes_comuns": ["formas", "de", "cumprimentar"],
  "despedidas_comuns": ["formas", "de", "encerrar", "assunto"],
  "pontuacao": "descrição do uso de pontuação (usa muitos '...', reticências, sem acentos, tudo minúsculo, etc)",
  "observacoes_gerais": "qualquer outro padrão notável"
}`,
      },
      {
        role: "user",
        content: `Mensagens para análise:\n\n${amostra}`,
      },
    ],
    temperature: 0.3, // baixa, porque aqui queremos análise consistente, não criatividade
    response_format: { type: "json_object" },
  });

  return JSON.parse(resposta.choices[0].message.content);
}

/** Lista os .txt disponíveis em data/, para a interface (CLI ou web) escolher quais usar. */
function listarArquivosDisponiveis() {
  if (!fs.existsSync(CAMINHO_DATA)) return [];
  return fs.readdirSync(CAMINHO_DATA).filter((nome) => nome.toLowerCase().endsWith(".txt"));
}

/**
 * Função principal: lê os .txt (todos, ou só os informados em `arquivos`),
 * gera o perfil de estilo e salva profile.json + minhas-mensagens.json.
 * Usada tanto pelo script de CLI quanto pela rota da API web.
 */
async function analisarEstilo({ arquivos = [], meuNome } = {}) {
  const nomeUsado = meuNome || process.env.MEU_NOME_WHATSAPP || "Você";

  if (!fs.existsSync(CAMINHO_DATA)) {
    fs.mkdirSync(CAMINHO_DATA, { recursive: true });
  }

  const todosArquivosTxt = listarArquivosDisponiveis();
  const arquivosTxt =
    arquivos.length > 0 ? todosArquivosTxt.filter((nome) => arquivos.includes(nome)) : todosArquivosTxt;

  if (arquivosTxt.length === 0) {
    throw new Error(
      `Nenhum arquivo .txt encontrado (ou os nomes informados não batem com os arquivos em ${CAMINHO_DATA}).`
    );
  }

  const textoCompleto = arquivosTxt
    .map((nome) => fs.readFileSync(path.join(CAMINHO_DATA, nome), "utf-8"))
    .join("\n");

  const minhasMensagens = extrairMinhasMensagens(textoCompleto, nomeUsado);

  if (minhasMensagens.length === 0) {
    throw new Error(
      `Nenhuma mensagem encontrada com o nome "${nomeUsado}". Confirme o nome exato de exibição do seu WhatsApp (variável MEU_NOME_WHATSAPP no .env, ou configurável pelo painel).`
    );
  }

  const perfil = await gerarPerfilDeEstilo(minhasMensagens);

  // Sobrescreve o campo de emoji da IA com um dado medido de verdade —
  // evita a IA exagerar a frequência de emoji ao descrever o texto.
  const statsEmoji = calcularEstatisticasEmoji(minhasMensagens);
  perfil.uso_de_emoji_medido = statsEmoji;
  perfil.uso_de_emoji = `Emoji aparece em ${(statsEmoji.proporcao * 100).toFixed(1)}% das mensagens (${statsEmoji.mensagens_com_emoji} de ${statsEmoji.total_mensagens}). ${
    statsEmoji.proporcao < 0.1
      ? "Uso raro — evite usar emoji na maioria das respostas."
      : statsEmoji.proporcao < 0.3
      ? "Uso ocasional — use emoji só às vezes."
      : "Uso frequente."
  }`;

  fs.writeFileSync(CAMINHO_PERFIL, JSON.stringify(perfil, null, 2), "utf-8");

  const mensagensUteis = minhasMensagens.filter((m) => m.length >= 8);
  fs.writeFileSync(CAMINHO_MENSAGENS, JSON.stringify(mensagensUteis, null, 2), "utf-8");

  return {
    perfil,
    totalMensagens: minhasMensagens.length,
    mensagensUteisSalvas: mensagensUteis.length,
    arquivosUsados: arquivosTxt,
  };
}

module.exports = { analisarEstilo, listarArquivosDisponiveis };
