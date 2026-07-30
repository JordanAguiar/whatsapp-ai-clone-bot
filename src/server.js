const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const fs = require("fs");
const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");

const bot = require("./whatsapp");
const { getConfig, salvarConfig } = require("./config");
const { analisarEstilo, listarArquivosDisponiveis } = require("./estilo");
const { listarCorrecoes, adicionarCorrecao, removerCorrecao } = require("./correcoes");
const conversas = require("./conversas");
const { gerarResposta, recarregarPerfil } = require("./ia");

const CAMINHO_DATA = path.join(__dirname, "..", "data");
const CAMINHO_PERFIL = path.join(CAMINHO_DATA, "profile.json");

fs.mkdirSync(CAMINHO_DATA, { recursive: true });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Upload de conversas exportadas (.txt) direto pela web, sem precisar mexer
// em pasta manualmente.
const upload = multer({ dest: path.join(CAMINHO_DATA, "tmp_uploads") });

// --- Estado da conexão, atualizado pelos eventos do núcleo whatsapp.js ---
let estadoConexao = { status: "iniciando", qr: null, info: null };

bot.on("qr", async (qr) => {
  try {
    estadoConexao.qr = await QRCode.toDataURL(qr);
  } catch (erro) {
    console.error("Erro ao gerar imagem do QR:", erro.message);
  }
});

bot.on("status", (status, info) => {
  estadoConexao.status = status;
  estadoConexao.info = info || null;
  if (status !== "aguardando_qr") estadoConexao.qr = null; // QR só faz sentido nesse estado
});

// Sem isso, qualquer erro ao gerar/enviar resposta (ex: chave da API errada,
// modelo inválido) ficava silencioso no modo painel web — só aparecia no
// modo terminal (index.js). Agora aparece no log do servidor também.
bot.on("erro", (erro) => {
  console.error("❌ Erro ao gerar/enviar resposta da IA:", erro.message);
});

// ---------------- Rotas da API ----------------

// Conexão / status
app.get("/api/status", (req, res) => {
  res.json(estadoConexao);
});

// Configurações (delay, instruções extras do prompt)
app.get("/api/config", (req, res) => {
  res.json(getConfig());
});

app.post("/api/config", (req, res) => {
  const atualizado = salvarConfig(req.body || {});
  res.json(atualizado);
});

// Perfil de estilo (visualizar e editar manualmente)
app.get("/api/perfil", (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(CAMINHO_PERFIL, "utf-8")));
  } catch {
    res.json(null);
  }
});

app.post("/api/perfil", (req, res) => {
  fs.writeFileSync(CAMINHO_PERFIL, JSON.stringify(req.body, null, 2), "utf-8");
  recarregarPerfil();
  res.json({ ok: true });
});

// Arquivos de conversa (.txt) disponíveis em data/
app.get("/api/arquivos", (req, res) => {
  res.json(listarArquivosDisponiveis());
});

app.post("/api/upload-conversa", upload.single("arquivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: "Nenhum arquivo enviado." });

  const nomeDestino = req.file.originalname.endsWith(".txt")
    ? req.file.originalname
    : `${req.file.originalname}.txt`;

  fs.renameSync(req.file.path, path.join(CAMINHO_DATA, nomeDestino));
  res.json({ ok: true, nome: nomeDestino });
});

// Análise de estilo (equivalente ao "npm run analisar", mas pela web)
app.post("/api/analisar", async (req, res) => {
  try {
    const resultado = await analisarEstilo({ arquivos: req.body?.arquivos || [] });
    recarregarPerfil();
    res.json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Calibração: testar resposta e salvar correções
app.get("/api/correcoes", (req, res) => {
  res.json(listarCorrecoes());
});

app.post("/api/testar-resposta", async (req, res) => {
  try {
    const resposta = await gerarResposta(req.body?.mensagem || "");
    res.json({ resposta });
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

app.post("/api/correcoes", (req, res) => {
  const { mensagem_recebida, resposta_ia_original, resposta_real } = req.body || {};
  if (!mensagem_recebida || !resposta_real) {
    return res.status(400).json({ erro: "mensagem_recebida e resposta_real são obrigatórios." });
  }
  const correcoes = adicionarCorrecao({ mensagem_recebida, resposta_ia_original, resposta_real });
  res.json(correcoes);
});

app.delete("/api/correcoes/:indice", (req, res) => {
  try {
    const correcoes = removerCorrecao(Number(req.params.indice));
    res.json(correcoes);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// Conversas: histórico estilo "WhatsApp Web" + controle de quem o bot responde
app.get("/api/conversas", (req, res) => {
  res.json(conversas.listarConversas());
});

app.get("/api/conversas/:jid", (req, res) => {
  const conversa = conversas.obterConversa(decodeURIComponent(req.params.jid));
  if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada." });
  res.json(conversa);
});

app.post("/api/conversas/:jid/permissao", (req, res) => {
  try {
    const conversa = conversas.definirPermissao(decodeURIComponent(req.params.jid), req.body?.permitido);
    res.json(conversa);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
  console.log(`🌐 Painel disponível em http://localhost:${PORTA}`);
});

// Inicia a conexão com o WhatsApp em paralelo ao servidor web.
bot.iniciar().catch((erro) => {
  console.error("❌ Erro ao iniciar conexão com WhatsApp:", erro.message);
});
