const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const qrcode = require("qrcode-terminal");
const bot = require("./whatsapp");

// Modo terminal: só imprime o QR e os status no console, usando o núcleo
// compartilhado em whatsapp.js (o mesmo usado pelo painel web em server.js).
bot.on("qr", (qr) => {
  console.log("\n📱 Escaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n");
  qrcode.generate(qr, { small: true });
});

bot.on("status", (status, info) => {
  if (status === "conectado") {
    console.log("✅ Conectado ao WhatsApp com sucesso!");
  } else if (status === "reconectando") {
    console.log(`\n❌ Conexão encerrada. Código: ${info?.motivo}`);
    console.log(`   Mensagem: ${info?.mensagem}`);
    console.log(`   Reconectando... (tentativa ${info?.tentativa}/5)\n`);
  } else if (status === "erro" || status === "deslogado") {
    console.log(`\n🛑 ${info?.mensagem}`);
  }
});

bot.on("mensagem", ({ remetente, texto, permitido }) => {
  console.log(`📩 Mensagem de ${remetente}: ${texto}`);
  if (!permitido) {
    console.log(`   ⛔ Contato não liberado — libere no painel web (npm start) ou marque permitido:true em data/conversas.json`);
  }
});

bot.on("resposta-enviada", ({ remetente, resposta }) => {
  console.log(`🤖 Resposta enviada para ${remetente}: ${resposta}`);
});

bot.on("erro", (erro) => {
  console.error("❌ Erro ao gerar/enviar resposta da IA:", erro.message);
});

bot.iniciar();
