const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const { gerarResposta } = require("./ia");

// Nível "silent" faz o Baileys parar de despejar logs técnicos no terminal.
// Se algo der errado e você precisar depurar, troque para "debug" temporariamente.
const logger = pino({ level: "silent" });

// Tempo de espera antes de responder, em milissegundos — deixa o bot mais
// natural (ninguém responde no mesmo instante). Configurável no .env.
const DELAY_MIN_MS = Number(process.env.DELAY_MIN_MS) || 50_000; // 50s
const DELAY_MAX_MS = Number(process.env.DELAY_MAX_MS) || 60_000; // 60s

// Guarda, por conversa (remetente), as mensagens ainda não respondidas e o
// timer agendado. Se chegar mais de uma mensagem no meio do tempo de espera,
// agrupamos tudo numa resposta só, como uma pessoa real faria ao ler depois.
const filasPendentes = new Map();

function agendarResposta(sock, remetente) {
  const fila = filasPendentes.get(remetente);
  if (!fila) return;

  // Cada mensagem nova reinicia o timer — a resposta só sai quando a pessoa
  // "para" de mandar mensagem por um tempo, igual conversa real.
  if (fila.timer) clearTimeout(fila.timer);

  const delay = Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
  console.log(`⏳ Vou responder ${remetente} em ${Math.round(delay / 1000)}s...`);

  fila.timer = setTimeout(async () => {
    const mensagens = fila.mensagens;
    filasPendentes.delete(remetente);

    // Junta todas as mensagens acumuladas em um só texto pra IA responder de uma vez.
    const textoCompleto = mensagens.join("\n");

    try {
      await sock.sendPresenceUpdate("composing", remetente);
      const respostaIA = await gerarResposta(textoCompleto);
      console.log(`🤖 Resposta gerada para ${remetente}: ${respostaIA}`);
      await sock.sendMessage(remetente, { text: respostaIA });
    } catch (erro) {
      console.error("❌ Erro ao gerar/enviar resposta da IA:", erro.message);
    }
  }, delay);
}

async function iniciarBot(tentativas = 0) {
  // useMultiFileAuthState guarda a "sessão" (credenciais de login) em disco,
  // na pasta ./auth (raiz do projeto). Assim você não precisa escanear o QR
  // toda vez que reiniciar. path.join com ".." porque este arquivo está em src/.
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "..", "auth"));

  // fetchLatestBaileysVersion() às vezes retorna um valor "bundled" que já ficou
  // desatualizado (bug conhecido, WhatsApp #2679). fetchLatestWaWebVersion() busca
  // a versão diretamente dos servidores do WhatsApp, o que resolve o erro 405.
  const { version, isLatest } = await fetchLatestWaWebVersion({});
  console.log(`ℹ️  Usando versão do WhatsApp Web: ${version.join(".")} (mais recente: ${isLatest})`);

  const sock = makeWASocket({
    auth: state,
    version,
    logger,
    // printQRInTerminal foi descontinuado nas versões novas do Baileys,
    // por isso tratamos o QR manualmente no evento connection.update abaixo.
  });

  // Sempre que as credenciais mudam (login, refresh de sessão), salvamos em disco.
  sock.ev.on("creds.update", saveCreds);

  // Esse evento dispara em: geração de QR code, conexão aberta, conexão fechada.
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Escaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      // Verifica se a desconexão foi por logout manual ou por outro motivo
      // (queda de rede, expiração de sessão etc). Se não foi logout, reconecta.
      const erro = new Boom(lastDisconnect?.error);
      const motivo = erro?.output?.statusCode;
      const deveReconectar = motivo !== DisconnectReason.loggedOut;

      console.log(`\n❌ Conexão encerrada. Código: ${motivo}`);
      console.log(`   Mensagem: ${lastDisconnect?.error?.message}`);

      tentativas++;
      if (tentativas > 5) {
        console.log("\n🛑 Muitas tentativas falharam seguidas. Parando pra evitar loop infinito.");
        console.log("   Isso geralmente é rede/firewall/antivírus bloqueando, não bug de código.");
        return;
      }

      if (deveReconectar) {
        console.log(`   Reconectando... (tentativa ${tentativas}/5)\n`);
        iniciarBot(tentativas);
      } else {
        console.log("Sessão deslogada. Apague a pasta 'auth' e escaneie o QR novamente.");
      }
    } else if (connection === "open") {
      tentativas = 0;
      console.log("✅ Conectado ao WhatsApp com sucesso!");
    }
  });

  // Esse evento dispara toda vez que uma mensagem nova chega (ou é enviada por você).
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    // "notify" = mensagem nova chegando em tempo real (ignoramos histórico antigo).
    if (type !== "notify") return;

    const msg = messages[0];

    // Ignora mensagens sem conteúdo (ex: reações, status) e mensagens enviadas por nós mesmos.
    if (!msg.message || msg.key.fromMe) return;

    const remetente = msg.key.remoteJid; // ID de quem mandou (número ou grupo)
    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    console.log(`📩 Mensagem de ${remetente}: ${texto}`);

    if (!texto) return;

    // Acumula a mensagem na fila dessa conversa e (re)agenda a resposta.
    if (!filasPendentes.has(remetente)) {
      filasPendentes.set(remetente, { mensagens: [], timer: null });
    }
    filasPendentes.get(remetente).mensagens.push(texto);
    agendarResposta(sock, remetente);
  });

  return sock;
}

iniciarBot();
