const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const fs = require("fs");
const readline = require("readline/promises");
const { gerarResposta } = require("../ia");

const CAMINHO_CORRECOES = path.join(__dirname, "..", "..", "data", "correcoes.json");

function carregarCorrecoes() {
  try {
    return JSON.parse(fs.readFileSync(CAMINHO_CORRECOES, "utf-8"));
  } catch {
    return [];
  }
}

function salvarCorrecoes(correcoes) {
  fs.writeFileSync(CAMINHO_CORRECOES, JSON.stringify(correcoes, null, 2), "utf-8");
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const correcoes = carregarCorrecoes();

  console.log("=".repeat(60));
  console.log("MODO CALIBRAÇÃO");
  console.log("Digite uma mensagem como se alguém tivesse te mandado no WhatsApp.");
  console.log("O bot vai tentar responder como você. Se não soar certo,");
  console.log("digite como você responderia de verdade — isso vira exemplo");
  console.log("de alta qualidade pro bot usar dali pra frente.");
  console.log("Digite 'sair' a qualquer momento pra encerrar e salvar tudo.");
  console.log("=".repeat(60));
  console.log(`(${correcoes.length} correções já salvas de sessões anteriores)\n`);

  while (true) {
    const mensagemSimulada = await rl.question("\n📩 Mensagem recebida: ");
    if (mensagemSimulada.trim().toLowerCase() === "sair") break;
    if (!mensagemSimulada.trim()) continue;

    const respostaIA = await gerarResposta(mensagemSimulada);
    console.log(`🤖 Resposta do bot: ${respostaIA}`);

    const feedback = await rl.question("Essa resposta soa como você? (s/n): ");

    if (feedback.trim().toLowerCase() === "n") {
      const respostaReal = await rl.question("Como você responderia de verdade? ");
      if (respostaReal.trim()) {
        correcoes.push({
          mensagem_recebida: mensagemSimulada,
          resposta_ia_original: respostaIA,
          resposta_real: respostaReal,
          data: new Date().toISOString(),
        });
        salvarCorrecoes(correcoes);
        console.log(`✅ Salvo! (${correcoes.length} correções no total)`);
      }
    } else {
      console.log("👍 Beleza, seguindo.");
    }
  }

  rl.close();
  console.log(`\nSessão encerrada. ${correcoes.length} correções salvas em correcoes.json`);
}

main();
