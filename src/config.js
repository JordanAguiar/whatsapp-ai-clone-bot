const fs = require("fs");
const path = require("path");

const CAMINHO_CONFIG = path.join(__dirname, "..", "data", "config.json");

// Valores padrão — usados até o usuário salvar algo diferente pelo painel web.
const PADRAO = {
  delayMinMs: 50_000,
  delayMaxMs: 60_000,
  instrucoesExtras: "", // texto livre, somado ao prompt de sistema (ex: "nunca fale de política")
  aprendizadoContinuo: false, // captura mensagens que VOCÊ digita manualmente no WhatsApp (qualquer conversa) como novos exemplos de estilo. Desligado por padrão por privacidade.
};

function getConfig() {
  try {
    const salvo = JSON.parse(fs.readFileSync(CAMINHO_CONFIG, "utf-8"));
    return { ...PADRAO, ...salvo };
  } catch {
    return { ...PADRAO };
  }
}

function salvarConfig(novosValores) {
  const atualizado = { ...getConfig(), ...novosValores };
  fs.mkdirSync(path.dirname(CAMINHO_CONFIG), { recursive: true });
  fs.writeFileSync(CAMINHO_CONFIG, JSON.stringify(atualizado, null, 2), "utf-8");
  return atualizado;
}

module.exports = { getConfig, salvarConfig };
