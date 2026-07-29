# Processo — Chatbot WhatsApp com IA no meu estilo

Documentação passo a passo da construção de um bot de WhatsApp que aprende
meu jeito de escrever e responde como se fosse eu, usando Baileys (conexão
não-oficial com WhatsApp) + Groq (IA gratuita).

---

## Etapa 1 — Estrutura do projeto

**Objetivo:** montar o esqueleto do projeto Node.js e entender o papel de
cada dependência antes de escrever qualquer lógica.

**Dependências instaladas (`package.json`):**

| Pacote | Papel |
|---|---|
| `@whiskeysockets/baileys` | Biblioteca não-oficial que fala o protocolo do WhatsApp Web (conecta, envia e recebe mensagens) |
| `qrcode-terminal` | Renderiza o QR code de login direto no terminal |
| `@hapi/boom` | Usado internamente pelo Baileys para identificar o motivo de uma desconexão (códigos de erro HTTP-like) |
| `groq-sdk` | Cliente oficial pra chamar a IA da Groq |
| `dotenv` | Carrega variáveis sensíveis (chave de API) de um arquivo `.env`, fora do código |
| `pino` | Logger exigido internamente pelo Baileys |

**Comando:**
```bash
npm install
```

---

## Etapa 2 — Conexão com o WhatsApp (Baileys)

**Objetivo:** autenticar no WhatsApp via QR code e confirmar que dá pra
receber e responder mensagens (com um simples eco, sem IA ainda).

**Conceitos principais do `index.js`:**

- `useMultiFileAuthState("auth")` — guarda a sessão autenticada em disco na
  pasta `auth/`, evitando escanear o QR toda vez que o bot reinicia.
- Evento `connection.update` — dispara em três momentos: QR gerado, conexão
  aberta, conexão fechada. É onde tratamos reconexão automática.
- Evento `messages.upsert` — dispara a cada mensagem nova. Filtramos
  `type !== "notify"` (ignora histórico antigo re-sincronizado) e
  `msg.key.fromMe` (ignora mensagens enviadas por nós mesmos, evitando loop).

### Problemas reais encontrados e como resolvemos

**1. QR code não aparecia**
O logger interno do Baileys (`pino`) estava no nível padrão, despejando
JSON técnico no terminal e "afogando" o desenho do QR.
**Fix:** configurar `pino({ level: "silent" })` e passar como `logger` no
`makeWASocket`.

**2. Loop de erro 405 "Connection Failure"**
Testamos em rede doméstica, depois em 5G (celular) — o erro persistiu
identicamente nos dois ambientes, o que descartou causa de rede/firewall/
antivírus. Pesquisa nas issues oficiais do Baileys confirmou: é um bug
conhecido, causado por a lib usar uma versão desatualizada do protocolo do
WhatsApp Web internamente. O WhatsApp rejeita handshakes com versões
antigas antes até de gerar o QR.
**Fix:** buscar a versão atual em tempo real com `fetchLatestWaWebVersion()`
e passar explicitamente como `version` no `makeWASocket` (a função irmã
`fetchLatestBaileysVersion()` também existe, mas estava retornando um valor
desatualizado no momento deste projeto).

**3. Erro 515 "Stream Errored (restart required)" logo após escanear o QR**
Comportamento **esperado**, não é bug: o WhatsApp sempre derruba a conexão
uma vez após o primeiro pareamento, exigindo reconexão pra confirmar a
sessão. Nossa lógica de reconexão automática (com limite de 5 tentativas
pra evitar loop infinito) trata isso sozinha.

**Resultado:** bot conectado, sessão persistida em `auth/`, eco de
mensagem funcionando de ponta a ponta.

---

## Próxima etapa

Etapa 3 — trocar o eco pela chamada real à IA (Groq), com um prompt
genérico primeiro, antes de incorporar o estilo de escrita pessoal.
