const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const CAMINHO_TOKENS = path.join(__dirname, "..", "data", "google-tokens.json");

function criarClienteOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET não configurados no .env. Veja o README para criar as credenciais no Google Cloud Console."
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function estaConectado() {
  return fs.existsSync(CAMINHO_TOKENS);
}

function desconectar() {
  if (fs.existsSync(CAMINHO_TOKENS)) fs.unlinkSync(CAMINHO_TOKENS);
}

/** Gera a URL de consentimento do Google (o usuário abre isso no navegador uma vez). */
function gerarUrlAutorizacao() {
  const client = criarClienteOAuth();
  return client.generateAuthUrl({
    access_type: "offline", // necessário pra ganhar um refresh_token e não precisar reautorizar sempre
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
}

/** Troca o código retornado pelo Google por tokens de acesso, e salva em disco. */
async function trocarCodigoPorTokens(code) {
  const client = criarClienteOAuth();
  const { tokens } = await client.getToken(code);
  fs.mkdirSync(path.dirname(CAMINHO_TOKENS), { recursive: true });
  fs.writeFileSync(CAMINHO_TOKENS, JSON.stringify(tokens, null, 2), "utf-8");
  return tokens;
}

function obterClienteAutenticado() {
  if (!estaConectado()) {
    throw new Error("Google Calendar não conectado. Vá na aba Negócio e clique em 'Conectar Google Calendar'.");
  }
  const client = criarClienteOAuth();
  const tokens = JSON.parse(fs.readFileSync(CAMINHO_TOKENS, "utf-8"));
  client.setCredentials(tokens);

  // Se o Google renovar o access_token automaticamente, salvamos o token novo.
  client.on("tokens", (novosTokens) => {
    const atualizado = { ...tokens, ...novosTokens };
    fs.writeFileSync(CAMINHO_TOKENS, JSON.stringify(atualizado, null, 2), "utf-8");
  });

  return client;
}

/**
 * Lista horários livres num dia específico, dentro do horário de
 * funcionamento informado, em blocos de `duracaoMinutos`.
 */
async function listarHorariosDisponiveis({ data, duracaoMinutos, horaInicio, horaFim, calendarId = "primary" }) {
  const auth = obterClienteAutenticado();
  const calendar = google.calendar({ version: "v3", auth });

  const inicioDia = new Date(`${data}T${horaInicio}:00`);
  const fimDia = new Date(`${data}T${horaFim}:00`);

  const resposta = await calendar.freebusy.query({
    requestBody: {
      timeMin: inicioDia.toISOString(),
      timeMax: fimDia.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const ocupados = resposta.data.calendars?.[calendarId]?.busy || [];

  const slots = [];
  let cursor = new Date(inicioDia);
  const agora = new Date();

  while (cursor.getTime() + duracaoMinutos * 60000 <= fimDia.getTime()) {
    const fimSlot = new Date(cursor.getTime() + duracaoMinutos * 60000);

    const conflitaComEvento = ocupados.some((bloqueio) => {
      const bInicio = new Date(bloqueio.start);
      const bFim = new Date(bloqueio.end);
      return cursor < bFim && fimSlot > bInicio;
    });

    // Não oferece horário que já passou (relevante se "data" for hoje).
    if (!conflitaComEvento && cursor > agora) {
      slots.push(new Date(cursor));
    }

    cursor = new Date(cursor.getTime() + duracaoMinutos * 60000);
  }

  return slots;
}

/** Cria o evento de fato no calendário, confirmando o agendamento. */
async function criarEvento({ inicio, fim, titulo, descricao, calendarId = "primary" }) {
  const auth = obterClienteAutenticado();
  const calendar = google.calendar({ version: "v3", auth });

  const resposta = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: titulo,
      description: descricao,
      start: { dateTime: inicio.toISOString() },
      end: { dateTime: fim.toISOString() },
    },
  });

  return resposta.data;
}

module.exports = {
  estaConectado,
  desconectar,
  gerarUrlAutorizacao,
  trocarCodigoPorTokens,
  listarHorariosDisponiveis,
  criarEvento,
};
