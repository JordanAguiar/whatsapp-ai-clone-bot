const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
const { analisarEstilo } = require("../estilo");

// Permite rodar "node analisar-estilo.js eric.txt Sergyo.txt" para usar só
// arquivos específicos (útil quando conversas diferentes têm registros muito
// diferentes, ex: conversa com parceiro(a) vs conversa com amigos).
// Sem argumentos, usa todos os .txt encontrados em data/.
async function main() {
  const arquivos = process.argv.slice(2);

  try {
    console.log(arquivos.length > 0 ? `📖 Usando arquivos: ${arquivos.join(", ")}` : "📖 Lendo todos os .txt em data/...");
    const resultado = await analisarEstilo({ arquivos });

    console.log(`✅ Encontradas ${resultado.totalMensagens} mensagens suas no total.`);
    console.log(`📁 Arquivos usados: ${resultado.arquivosUsados.join(", ")}`);
    console.log("✅ Perfil de estilo salvo em data/profile.json");
    console.log(resultado.perfil);
    console.log(`✅ ${resultado.mensagensUteisSalvas} mensagens salvas em data/minhas-mensagens.json`);
  } catch (erro) {
    console.error(`❌ ${erro.message}`);
    process.exit(1);
  }
}

main();
