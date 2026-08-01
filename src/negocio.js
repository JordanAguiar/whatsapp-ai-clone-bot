const fs = require("fs");
const path = require("path");

const CAMINHO_NEGOCIO = path.join(__dirname, "..", "data", "negocio.json");

// Estrutura padrão — usada até o usuário configurar algo diferente pelo painel.
const PADRAO = {
  modoAtivo: false, // quando true, o bot vira "assistente de negócio" em vez de clone pessoal
  nomeNegocio: "",
  duracaoAtendimentoMin: 30,
  calendarId: "primary",
  // Horário de funcionamento por dia da semana. null = fechado nesse dia.
  horarios: {
    dom: null,
    seg: { inicio: "09:00", fim: "18:00" },
    ter: { inicio: "09:00", fim: "18:00" },
    qua: { inicio: "09:00", fim: "18:00" },
    qui: { inicio: "09:00", fim: "18:00" },
    sex: { inicio: "09:00", fim: "18:00" },
    sab: null,
  },
  // Lista de perguntas frequentes: [{ pergunta, resposta }]. O bot responde
  // com base nisso, sem "inventar" informação de negócio (preço, endereço etc).
  faq: [],
};

function getNegocio() {
  try {
    const salvo = JSON.parse(fs.readFileSync(CAMINHO_NEGOCIO, "utf-8"));
    return { ...PADRAO, ...salvo, horarios: { ...PADRAO.horarios, ...(salvo.horarios || {}) } };
  } catch {
    return { ...PADRAO };
  }
}

function salvarNegocio(novosValores) {
  const atual = getNegocio();
  const atualizado = {
    ...atual,
    ...novosValores,
    horarios: { ...atual.horarios, ...(novosValores.horarios || {}) },
  };
  fs.mkdirSync(path.dirname(CAMINHO_NEGOCIO), { recursive: true });
  fs.writeFileSync(CAMINHO_NEGOCIO, JSON.stringify(atualizado, null, 2), "utf-8");
  return atualizado;
}

module.exports = { getNegocio, salvarNegocio };
