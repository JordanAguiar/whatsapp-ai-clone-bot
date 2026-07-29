const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CAMINHO_PERFIL = path.join(__dirname, "..", "data", "profile.json");
const CAMINHO_MENSAGENS = path.join(__dirname, "..", "data", "minhas-mensagens.json");
const CAMINHO_CORRECOES = path.join(__dirname, "..", "data", "correcoes.json");

// Carregados uma vez, na inicialização do bot (não a cada mensagem, por performance).
let perfilEstilo = null;
let minhasMensagens = [];
let correcoes = [];

try {
  perfilEstilo = JSON.parse(fs.readFileSync(CAMINHO_PERFIL, "utf-8"));
  minhasMensagens = JSON.parse(fs.readFileSync(CAMINHO_MENSAGENS, "utf-8"));
  console.log(`ℹ️  Perfil de estilo carregado (${minhasMensagens.length} mensagens de referência).`);
} catch {
  console.warn("⚠️  profile.json ou minhas-mensagens.json não encontrados. Rode 'node analisar-estilo.js' primeiro.");
}

try {
  correcoes = JSON.parse(fs.readFileSync(CAMINHO_CORRECOES, "utf-8"));
  if (correcoes.length > 0) {
    console.log(`ℹ️  ${correcoes.length} correções de calibração carregadas.`);
  }
} catch {
  // Arquivo ainda não existe — normal antes de rodar "node calibrar.js" pela primeira vez.
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

function buscarCorrecoesSimilares(mensagemRecebida, quantidade = 3) {
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
function buscarExemplosSimilares(mensagemRecebida, quantidade = 5) {
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
  if (!perfilEstilo) {
    return (
      "Você é um assistente respondendo mensagens de WhatsApp. " +
      "Seja breve, direto e natural, como uma conversa real de chat."
    );
  }

  return `Você está respondendo mensagens de WhatsApp como se fosse a própria pessoa (não como assistente/IA).
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

/**
 * Gera uma resposta usando a IA da Groq, no estilo de escrita da pessoa,
 * usando o perfil de estilo + exemplos reais parecidos (RAG leve).
 */
async function gerarResposta(mensagemRecebida) {
  const exemplos = buscarExemplosSimilares(mensagemRecebida);
  const correcoesSimilares = buscarCorrecoesSimilares(mensagemRecebida);

  // Se não achar correções parecidas pelo assunto, usa as mais recentes como
  // referência geral de estilo (ainda mais confiável que o histórico minerado,
  // já que vieram de feedback direto seu).
  const correcoesParaUsar =
    correcoesSimilares.length > 0 ? correcoesSimilares : correcoes.slice(-3);

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

  const resposta = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // modelo gratuito e rápido da Groq
    messages: [
      {
        role: "system",
        content: montarPromptDeSistema() + contextoExemplos + contextoCorrecoes,
      },
      {
        role: "user",
        content: mensagemRecebida,
      },
    ],
    temperature: 0.6, // reduzido de 0.8 — temperatura alta tende a puxar pra respostas mais "elaboradas"/genéricas
    max_tokens: 300,
  });

  return resposta.choices[0]?.message?.content?.trim() || "Não consegui gerar uma resposta.";
}

module.exports = { gerarResposta };
