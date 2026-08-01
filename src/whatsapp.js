const path = require("path");
const EventEmitter = require("events");

// A lib libsignal (usada internamente pelo Baileys pro protocolo de
// criptografia) escreve alguns logs direto via console.log/console.error,
// ignorando o "logger: silent" que passamos pro Baileys. Isso é ruído
// normal de renegociação de sessão (não é erro fatal), então filtramos
// especificamente essas linhas conhecidas, sem esconder outros logs.
const RUIDOS_CONHECIDOS = [
  "Closing session:",
  "Closing open session in favor of incoming prekey bundle",
  "Failed to decrypt message with any known session",
  "Session error:",
];

function deveFiltrar(args) {
  const primeiro = args[0];
  return typeof primeiro === "string" && RUIDOS_CONHECIDOS.some((ruido) => primeiro.startsWith(ruido));
}

const logOriginal = console.log;
console.log = (...args) => {
  if (deveFiltrar(args)) return;
  logOriginal(...args);
};

const errorOriginal = console.error;
console.error = (...args) => {
  if (deveFiltrar(args)) return;
  errorOriginal(...args);
};

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const { gerarResposta, capturarMensagemReal } = require("./ia");
const { getConfig } = require("./config");
const conversas = require("./conversas");

// Nível "silent" faz o Baileys parar de despejar logs técnicos no terminal.
const logger = pino({ level: "silent" });

/**
 * Núcleo da conexão com o WhatsApp, independente de como o resultado é
 * exibido (terminal ou painel web). Emite eventos:
 * - "qr" (string bruta do QR code)
 * - "status" (string: aguardando_qr | conectado | reconectando | deslogado | erro)
 * - "mensagem" ({ remetente, texto, permitido }) — mensagem recebida, antes da resposta
 * - "resposta-enviada" ({ remetente, texto, resposta })
 * - "erro" (Error)
 */
class WhatsAppBot extends EventEmitter {
  constructor() {
    super();
    this.sock = null;
    this.filasPendentes = new Map();
    this.tentativas = 0;
    this.status = "iniciando";
    // Guarda os IDs das mensagens que o PRÓPRIO bot enviou, pra diferenciar
    // do "eco" delas (o WhatsApp também entrega de volta como fromMe) de
    // mensagens que o usuário digitou de verdade, manualmente, no celular.
    this.idsEnviadosPeloBot = new Set();
  }

  async iniciar() {
    // useMultiFileAuthState guarda a "sessão" (credenciais de login) em disco,
    // na pasta ./auth (raiz do projeto). Assim não precisa escanear o QR toda
    // vez que reiniciar.
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "..", "auth"));

    // fetchLatestBaileysVersion() às vezes retorna um valor "bundled" desatualizado
    // (bug conhecido, WhatsApp #2679). fetchLatestWaWebVersion() busca a versão
    // diretamente dos servidores do WhatsApp, o que resolve o erro 405.
    const { version } = await fetchLatestWaWebVersion({});

    const sock = makeWASocket({ auth: state, version, logger });
    this.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.status = "aguardando_qr";
        this.emit("qr", qr);
        this.emit("status", this.status);
      }

      if (connection === "close") {
        const erro = new Boom(lastDisconnect?.error);
        const motivo = erro?.output?.statusCode;
        const deveReconectar = motivo !== DisconnectReason.loggedOut;

        this.tentativas++;

        if (!deveReconectar) {
          this.status = "deslogado";
          this.emit("status", this.status, { mensagem: "Sessão deslogada. Apague a pasta auth/ e escaneie de novo." });
          return;
        }

        if (this.tentativas > 5) {
          this.status = "erro";
          this.emit("status", this.status, {
            mensagem: "Muitas tentativas de reconexão falharam seguidas (geralmente rede/firewall/antivírus).",
          });
          return;
        }

        this.status = "reconectando";
        this.emit("status", this.status, { motivo, mensagem: lastDisconnect?.error?.message, tentativa: this.tentativas });
        this.iniciar();
      } else if (connection === "open") {
        this.tentativas = 0;
        this.status = "conectado";
        this.emit("status", this.status);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      const msg = messages[0];
      if (!msg.message) return;

      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!texto) return;

      if (msg.key.fromMe) {
        // Pode ser eco de uma mensagem que o próprio bot mandou (o WhatsApp
        // entrega de volta como fromMe também), ou uma mensagem que VOCÊ
        // digitou de verdade, manualmente, no celular.
        if (this.idsEnviadosPeloBot.has(msg.key.id)) {
          this.idsEnviadosPeloBot.delete(msg.key.id);
          return; // eco do próprio bot — já foi registrado no momento do envio
        }

        // Mensagem real, escrita por você. Se o aprendizado contínuo estiver
        // ligado (Configurações), isso vira exemplo novo de estilo na hora.
        if (getConfig().aprendizadoContinuo) {
          capturarMensagemReal(texto);
        }
        return;
      }

      const remetente = msg.key.remoteJid;

      // Cria a conversa no armazenamento se for a primeira vez que ela aparece
      // (por padrão entra bloqueada — precisa ser liberada no painel).
      const nomeContato = msg.pushName || null;
      const conversa = conversas.obterOuCriarConversa(remetente, nomeContato);
      conversas.registrarMensagem(remetente, { de: "eles", texto });

      this.emit("mensagem", { remetente, texto, permitido: conversa.permitido });

      if (!conversa.permitido) return; // bot não responde contatos não liberados

      if (!this.filasPendentes.has(remetente)) {
        this.filasPendentes.set(remetente, { mensagens: [], timer: null });
      }
      this.filasPendentes.get(remetente).mensagens.push(texto);
      this._agendarResposta(remetente);
    });

    return sock;
  }

  _agendarResposta(remetente) {
    const fila = this.filasPendentes.get(remetente);
    if (!fila) return;

    // Cada mensagem nova reinicia o timer — a resposta só sai quando a pessoa
    // "para" de mandar mensagem por um tempo, igual conversa real.
    if (fila.timer) clearTimeout(fila.timer);

    const { delayMinMs, delayMaxMs } = getConfig();
    const delay = Math.floor(Math.random() * (delayMaxMs - delayMinMs + 1)) + delayMinMs;

    fila.timer = setTimeout(async () => {
      const mensagens = fila.mensagens;
      this.filasPendentes.delete(remetente);

      // Re-checa permissão: o usuário pode ter desativado essa conversa
      // durante o tempo de espera, entre a mensagem chegar e o bot responder.
      const conversaAtual = conversas.obterConversa(remetente);
      if (!conversaAtual?.permitido) return;

      const textoCompleto = mensagens.join("\n");

      try {
        await this.sock.sendPresenceUpdate("composing", remetente);
        const resposta = await gerarResposta(textoCompleto);
        const enviado = await this.sock.sendMessage(remetente, { text: resposta });
        if (enviado?.key?.id) this.idsEnviadosPeloBot.add(enviado.key.id);
        conversas.registrarMensagem(remetente, { de: "bot", texto: resposta });
        this.emit("resposta-enviada", { remetente, texto: textoCompleto, resposta });
      } catch (erro) {
        this.emit("erro", erro);
      }
    }, delay);
  }
}

// Exportamos uma instância única (singleton) — só existe uma conexão de
// WhatsApp por processo, faz sentido compartilhar entre quem usar o módulo.
module.exports = new WhatsAppBot();
