# 🤖 WhatsApp AI Clone Bot

Bot de WhatsApp que aprende o seu jeito de escrever e responde mensagens como se fosse você — usando IA gratuita (Gemini) e uma conexão não-oficial com o WhatsApp ([Baileys](https://github.com/WhiskeySockets/Baileys)).

Feito como projeto de portfolio para automação com IA + integração de mensageria.

## ✨ O que ele faz

- Conecta no seu WhatsApp via QR code (igual ao WhatsApp Web)
- Analisa seu histórico de conversas exportado e extrai um **perfil de estilo de escrita** (tom, gírias, uso de emoji, pontuação, etc — medido de dados reais, não "achismo" da IA)
- Usa esse perfil + exemplos reais parecidos (RAG leve) pra gerar respostas no seu tom
- Modo de **calibração interativa**: você conversa com o bot no terminal e corrige as respostas que não soarem como você — essas correções viram exemplos de altíssima prioridade
- Responde com um delay realista (configurável), agrupando mensagens seguidas antes de responder, como uma pessoa faria

## 🛠️ Stack

- **[Baileys](https://github.com/WhiskeySockets/Baileys)** — conexão com o WhatsApp (não-oficial)
- **[Gemini](https://ai.google.dev)** — inferência de IA gratuita do Google (gemini-2.5-flash)
- **Node.js**

## 📁 Estrutura

```
src/
├── index.js              # bot principal — conexão + fila de respostas com delay
├── ia.js                 # integração com Gemini + perfil de estilo + busca de exemplos
└── scripts/
    ├── analisar-estilo.js  # gera o perfil de estilo a partir do histórico exportado
    └── calibrar.js         # modo interativo de calibração/correção
```

## 🚀 Como rodar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org) 18+
- Uma chave de API gratuita do [Gemini](https://ai.google.dev) (AI Studio → Get API Key)

### 2. Instalação
```bash
npm install
```

### 3. Configuração
Copie o `.env.example` para `.env` e preencha:
```
GEMINI_API_KEY=sua_chave_aqui
MEU_NOME_WHATSAPP=SeuNomeDeExibicaoNoWhatsApp
```

### 4. Gerar seu perfil de estilo
Exporte uma ou mais conversas do WhatsApp (**Conversa → Exportar conversa → Sem mídia**), salve os `.txt` dentro de `data/`, e rode:
```bash
npm run analisar
```

### 5. (Opcional, mas recomendado) Calibrar interativamente
```bash
npm run calibrar
```

### 6. Rodar o bot
```bash
npm start
```
Escaneie o QR code que aparecer no terminal com **WhatsApp → Configurações → Aparelhos conectados**.

## ⚠️ Avisos importantes

- Este projeto usa uma **conexão não-oficial** com o WhatsApp (via Baileys), não a API oficial da Meta. Existe risco (baixo, mas real) de o número levar um bloqueio temporário. Recomendado para testes e portfolio, não para uso em número principal de um negócio sem avisar do risco.
- **Nunca** compartilhe seu arquivo `.env` — ele contém sua chave de API pessoal.
- Os dados em `data/` (histórico de conversas, perfil de estilo, correções) são pessoais e **não são versionados** (estão no `.gitignore`) — contêm conversas suas e de outras pessoas.

## 📄 Licença

Este projeto está sob a licença MIT — veja o arquivo [LICENSE](./LICENSE) para detalhes.
