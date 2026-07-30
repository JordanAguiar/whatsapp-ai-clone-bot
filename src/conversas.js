const fs = require("fs");
const path = require("path");

const CAMINHO_CONVERSAS = path.join(__dirname, "..", "data", "conversas.json");
const MAX_MENSAGENS_POR_CONVERSA = 200; // evita o arquivo crescer sem limite

function carregar() {
  try {
    return JSON.parse(fs.readFileSync(CAMINHO_CONVERSAS, "utf-8"));
  } catch {
    return {};
  }
}

function salvar(dados) {
  fs.mkdirSync(path.dirname(CAMINHO_CONVERSAS), { recursive: true });
  fs.writeFileSync(CAMINHO_CONVERSAS, JSON.stringify(dados, null, 2), "utf-8");
}

/**
 * Garante que a conversa existe no armazenamento. Contatos novos entram
 * como "permitido: false" por padrão — o bot só responde depois que a
 * pessoa liberar manualmente pelo painel. Isso evita responder gente
 * aleatória sem querer.
 */
function obterOuCriarConversa(jid, nomeSugerido) {
  const dados = carregar();

  if (!dados[jid]) {
    dados[jid] = {
      nome: nomeSugerido || jid,
      permitido: false,
      mensagens: [],
    };
    salvar(dados);
  } else if (nomeSugerido && dados[jid].nome !== nomeSugerido && dados[jid].nome === jid) {
    // Só atualiza o nome automaticamente se ainda não tinha um nome "de verdade"
    // (evita sobrescrever caso o usuário renomeie manualmente no futuro).
    dados[jid].nome = nomeSugerido;
    salvar(dados);
  }

  return dados[jid];
}

function registrarMensagem(jid, { de, texto }) {
  const dados = carregar();
  if (!dados[jid]) {
    dados[jid] = { nome: jid, permitido: false, mensagens: [] };
  }

  dados[jid].mensagens.push({ de, texto, timestamp: Date.now() });

  if (dados[jid].mensagens.length > MAX_MENSAGENS_POR_CONVERSA) {
    dados[jid].mensagens = dados[jid].mensagens.slice(-MAX_MENSAGENS_POR_CONVERSA);
  }

  salvar(dados);
}

function listarConversas() {
  const dados = carregar();
  return Object.entries(dados)
    .map(([jid, c]) => {
      const ultima = c.mensagens[c.mensagens.length - 1];
      return {
        jid,
        nome: c.nome,
        permitido: c.permitido,
        totalMensagens: c.mensagens.length,
        ultimaMensagem: ultima ? ultima.texto : null,
        ultimoTimestamp: ultima ? ultima.timestamp : 0,
      };
    })
    .sort((a, b) => b.ultimoTimestamp - a.ultimoTimestamp);
}

function obterConversa(jid) {
  const dados = carregar();
  return dados[jid] || null;
}

function definirPermissao(jid, permitido) {
  const dados = carregar();
  if (!dados[jid]) throw new Error("Conversa não encontrada.");
  dados[jid].permitido = Boolean(permitido);
  salvar(dados);
  return dados[jid];
}

module.exports = {
  obterOuCriarConversa,
  registrarMensagem,
  listarConversas,
  obterConversa,
  definirPermissao,
};
