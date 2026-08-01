const { GoogleGenAI } = require("@google/genai");

const MODELO = "gemini-3.1-flash-lite"; // limites gratuitos generosos (30 RPM / 1.500 por dia)

let cliente = null;
function obterCliente() {
  if (!cliente) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
    cliente = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return cliente;
}

async function gerar({ contents, systemInstruction, temperature, maxOutputTokens, modoJson }) {
  const resposta = await obterCliente().models.generateContent({
    model: MODELO,
    contents,
    config: {
      systemInstruction,
      temperature,
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
      ...(modoJson ? { responseMimeType: "application/json" } : {}),
    },
  });
  return resposta.text;
}

function ehErroDeCota(erro) {
  const m = erro?.message || "";
  return m.includes("RESOURCE_EXHAUSTED") || m.includes('"code":429') || m.toLowerCase().includes("quota");
}

function ehErroSobrecarga(erro) {
  const m = erro?.message || "";
  return m.includes("UNAVAILABLE") || m.includes("high demand") || m.includes('"code":503');
}

module.exports = { nome: "Gemini", gerar, ehErroDeCota, ehErroSobrecarga };
