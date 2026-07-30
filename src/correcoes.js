const fs = require("fs");
const path = require("path");

const CAMINHO_CORRECOES = path.join(__dirname, "..", "data", "correcoes.json");

function listarCorrecoes() {
  try {
    return JSON.parse(fs.readFileSync(CAMINHO_CORRECOES, "utf-8"));
  } catch {
    return [];
  }
}

function adicionarCorrecao({ mensagem_recebida, resposta_ia_original, resposta_real }) {
  const correcoes = listarCorrecoes();
  correcoes.push({
    mensagem_recebida,
    resposta_ia_original,
    resposta_real,
    data: new Date().toISOString(),
  });
  fs.mkdirSync(path.dirname(CAMINHO_CORRECOES), { recursive: true });
  fs.writeFileSync(CAMINHO_CORRECOES, JSON.stringify(correcoes, null, 2), "utf-8");
  return correcoes;
}

function removerCorrecao(indice) {
  const correcoes = listarCorrecoes();
  if (indice < 0 || indice >= correcoes.length) {
    throw new Error("Índice de correção inválido.");
  }
  correcoes.splice(indice, 1);
  fs.writeFileSync(CAMINHO_CORRECOES, JSON.stringify(correcoes, null, 2), "utf-8");
  return correcoes;
}

module.exports = { listarCorrecoes, adicionarCorrecao, removerCorrecao };
