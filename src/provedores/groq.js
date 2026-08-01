const Groq = require("groq-sdk");

const MODELO = "llama-3.3-70b-versatile";

let cliente = null;
function obterCliente() {
  if (!cliente) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY não configurada.");
    cliente = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return cliente;
}

async function gerar({ contents, systemInstruction, temperature, maxOutputTokens, modoJson }) {
  const resposta = await obterCliente().chat.completions.create({
    model: MODELO,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: contents },
    ],
    temperature,
    ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
    ...(modoJson ? { response_format: { type: "json_object" } } : {}),
  });
  return resposta.choices[0]?.message?.content;
}

function ehErroDeCota(erro) {
  const status = erro?.status || erro?.statusCode;
  const m = (erro?.message || "").toLowerCase();
  return status === 429 || m.includes("rate limit") || m.includes("rate_limit") || m.includes("quota");
}

function ehErroSobrecarga(erro) {
  const status = erro?.status || erro?.statusCode;
  const m = (erro?.message || "").toLowerCase();
  return status === 503 || m.includes("unavailable") || m.includes("overloaded");
}

module.exports = { nome: "Groq", gerar, ehErroDeCota, ehErroSobrecarga };
