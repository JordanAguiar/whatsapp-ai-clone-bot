// ---------- Navegação entre abas ----------
const abas = document.querySelectorAll(".aba");
const paineis = document.querySelectorAll(".painel");

abas.forEach((aba) => {
  aba.addEventListener("click", () => {
    abas.forEach((a) => a.classList.remove("ativa"));
    paineis.forEach((p) => p.classList.remove("ativo"));
    aba.classList.add("ativa");
    document.getElementById(`painel-${aba.dataset.aba}`).classList.add("ativo");
  });
});

// ---------- Status da conexão (polling simples a cada 2s) ----------
const statusBolinha = document.getElementById("status-bolinha");
const statusTexto = document.getElementById("status-texto");
const qrArea = document.getElementById("qr-area");
const conexaoLegenda = document.getElementById("conexao-legenda");

async function atualizarStatus() {
  try {
    const resposta = await fetch("/api/status");
    const dados = await resposta.json();

    const chavesStatus = {
      iniciando: "status_iniciando",
      aguardando_qr: "status_aguardando_qr",
      conectado: "status_conectado",
      reconectando: "status_reconectando",
      deslogado: "status_deslogado",
      erro: "status_erro",
    };
    statusTexto.textContent = t(chavesStatus[dados.status] || dados.status);
    statusBolinha.className = "bolinha";
    if (dados.status === "conectado") statusBolinha.classList.add("conectado");
    else if (dados.status === "aguardando_qr") statusBolinha.classList.add("aguardando");
    else if (dados.status === "erro" || dados.status === "deslogado") statusBolinha.classList.add("erro");

    if (dados.status === "aguardando_qr" && dados.qr) {
      qrArea.innerHTML = `<img src="${dados.qr}" alt="QR code do WhatsApp" />`;
      conexaoLegenda.textContent = t("conexao_instrucao_qr");
    } else if (dados.status === "conectado") {
      qrArea.innerHTML = `<div style="font-size:48px">✅</div>`;
      conexaoLegenda.textContent = t("conexao_conectado");
    } else if (dados.status === "reconectando") {
      qrArea.innerHTML = `<div class="carregando"><span></span><span></span><span></span></div>`;
      conexaoLegenda.textContent = `${t("status_reconectando_tentativa")} ${dados.info?.tentativa || "?"}/5)`;
    } else if (dados.status === "erro" || dados.status === "deslogado") {
      qrArea.innerHTML = `<div style="font-size:40px">⚠️</div>`;
      conexaoLegenda.textContent = dados.info?.mensagem || "Algo deu errado. Reinicie o servidor.";
    } else {
      qrArea.innerHTML = `<div class="carregando"><span></span><span></span><span></span></div>`;
      conexaoLegenda.textContent = t("conexao_iniciando");
    }
  } catch {
    statusTexto.textContent = t("status_offline");
  }
}
atualizarStatus();
setInterval(atualizarStatus, 2000);

// ---------- Status do provedor de IA (Gemini/Groq) ----------
const iaBolinha = document.getElementById("ia-bolinha");
const iaTexto = document.getElementById("ia-texto");

async function atualizarStatusIA() {
  try {
    const resposta = await fetch("/api/provedor-ia");
    const dados = await resposta.json();

    iaBolinha.className = "bolinha";
    if (dados.ativo) {
      iaTexto.textContent = `IA: ${dados.ativo}`;
      const provedorAtivo = dados.provedores.find((p) => p.nome === dados.ativo);
      iaBolinha.classList.add(provedorAtivo?.disponivel === false ? "erro" : "conectado");
    } else {
      iaTexto.textContent = t("ia_aguardando");
    }

    // Se algum provedor estiver bloqueado (cota esgotada), avisa visualmente.
    const algumBloqueado = dados.provedores.some((p) => !p.disponivel);
    if (algumBloqueado) {
      const nomes = dados.provedores.filter((p) => !p.disponivel).map((p) => p.nome).join(", ");
      iaTexto.title = `Sem cota no momento: ${nomes}`;
    } else {
      iaTexto.title = "";
    }
  } catch {
    iaTexto.textContent = t("ia_indisponivel");
  }
}
atualizarStatusIA();
setInterval(atualizarStatusIA, 5000);

// ---------- Configurações ----------
const delayMinInput = document.getElementById("delay-min");
const delayMaxInput = document.getElementById("delay-max");
const instrucoesExtrasInput = document.getElementById("instrucoes-extras");
const aprendizadoContinuoToggle = document.getElementById("aprendizado-continuo-toggle");
const salvarConfigBotao = document.getElementById("salvar-config");
const configFeedback = document.getElementById("config-feedback");
const idiomaPainelSelect = document.getElementById("idioma-painel-select");

idiomaPainelSelect.value = obterIdiomaAtual();
idiomaPainelSelect.addEventListener("change", () => {
  definirIdioma(idiomaPainelSelect.value);
});

async function carregarConfig() {
  const resposta = await fetch("/api/config");
  const cfg = await resposta.json();
  delayMinInput.value = Math.round(cfg.delayMinMs / 1000);
  delayMaxInput.value = Math.round(cfg.delayMaxMs / 1000);
  instrucoesExtrasInput.value = cfg.instrucoesExtras || "";
  aprendizadoContinuoToggle.checked = Boolean(cfg.aprendizadoContinuo);
}
carregarConfig();

salvarConfigBotao.addEventListener("click", async () => {
  const corpo = {
    delayMinMs: Number(delayMinInput.value) * 1000,
    delayMaxMs: Number(delayMaxInput.value) * 1000,
    instrucoesExtras: instrucoesExtrasInput.value,
    aprendizadoContinuo: aprendizadoContinuoToggle.checked,
  };
  await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  configFeedback.textContent = t("config_salvo");
  setTimeout(() => (configFeedback.textContent = ""), 2000);
});

// ---------- Estilo: upload de arquivos e listagem ----------
const inputArquivo = document.getElementById("input-arquivo");
const botaoSelecionar = document.getElementById("botao-selecionar");
const uploadArea = document.getElementById("upload-area");
const listaArquivos = document.getElementById("lista-arquivos");
const analisarBotao = document.getElementById("analisar-botao");
const analisarFeedback = document.getElementById("analisar-feedback");
const perfilVisualizacao = document.getElementById("perfil-visualizacao");

botaoSelecionar.addEventListener("click", () => inputArquivo.click());

inputArquivo.addEventListener("change", () => {
  enviarArquivos(inputArquivo.files);
});

["dragover", "dragleave", "drop"].forEach((evento) => {
  uploadArea.addEventListener(evento, (e) => e.preventDefault());
});
uploadArea.addEventListener("dragover", () => uploadArea.classList.add("arrastando"));
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("arrastando"));
uploadArea.addEventListener("drop", (e) => {
  uploadArea.classList.remove("arrastando");
  enviarArquivos(e.dataTransfer.files);
});

async function enviarArquivos(arquivos) {
  for (const arquivo of arquivos) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    await fetch("/api/upload-conversa", { method: "POST", body: formData });
  }
  carregarListaArquivos();
}

async function carregarListaArquivos() {
  const resposta = await fetch("/api/arquivos");
  const arquivos = await resposta.json();
  listaArquivos.innerHTML = arquivos.length
    ? arquivos.map((nome) => `<li>${nome}</li>`).join("")
    : `<li style="color:var(--texto-fraco)">${t("estilo_nenhum_arquivo")}</li>`;
}
carregarListaArquivos();

analisarBotao.addEventListener("click", async () => {
  analisarFeedback.textContent = t("estilo_analisando");
  analisarBotao.disabled = true;
  try {
    const resposta = await fetch("/api/analisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arquivos: [] }),
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || t("erro_desconhecido"));
    analisarFeedback.textContent = `✅ ${dados.totalMensagens} ${t("estilo_mensagens_analisadas")}`;
    renderizarPerfil(dados.perfil);
  } catch (erro) {
    analisarFeedback.textContent = `❌ ${erro.message}`;
  } finally {
    analisarBotao.disabled = false;
  }
});

let ultimoPerfilCarregado = null;

function renderizarPerfil(perfil) {
  ultimoPerfilCarregado = perfil;
  if (!perfil) {
    perfilVisualizacao.innerHTML = `<p class="vazio">${t("estilo_nenhum_perfil")}</p>`;
    return;
  }
  const item = (rotulo, valor) => `<div class="item"><strong>${rotulo}</strong>${valor || "—"}</div>`;
  perfilVisualizacao.innerHTML = [
    item(t("perfil_tom"), perfil.tom),
    item(t("perfil_tamanho"), perfil.tamanho_medio_respostas),
    item(t("perfil_emoji"), perfil.uso_de_emoji),
    item(t("perfil_pontuacao"), perfil.pontuacao),
    item(t("perfil_girias"), (perfil.girias_e_expressoes || []).join(", ")),
    item(t("perfil_saudacoes"), (perfil.saudacoes_comuns || []).join(", ")),
    item(t("perfil_despedidas"), (perfil.despedidas_comuns || []).join(", ")),
    item(t("perfil_observacoes"), perfil.observacoes_gerais),
  ].join("");
}

async function carregarPerfilExistente() {
  const resposta = await fetch("/api/perfil");
  const perfil = await resposta.json();
  renderizarPerfil(perfil);
}
carregarPerfilExistente();

// ---------- Calibração ----------
const mensagemSimuladaInput = document.getElementById("mensagem-simulada");
const testarBotao = document.getElementById("testar-botao");
const resultadoTeste = document.getElementById("resultado-teste");
const respostaIaTexto = document.getElementById("resposta-ia-texto");
const soaSimBotao = document.getElementById("soa-sim");
const soaNaoBotao = document.getElementById("soa-nao");
const correcaoArea = document.getElementById("correcao-area");
const respostaRealInput = document.getElementById("resposta-real");
const salvarCorrecaoBotao = document.getElementById("salvar-correcao");
const listaCorrecoes = document.getElementById("lista-correcoes");
const totalCorrecoes = document.getElementById("total-correcoes");

let ultimaMensagem = "";
let ultimaRespostaIA = "";

testarBotao.addEventListener("click", async () => {
  const mensagem = mensagemSimuladaInput.value.trim();
  if (!mensagem) return;

  testarBotao.disabled = true;
  testarBotao.textContent = t("calibracao_gerando");

  try {
    const resposta = await fetch("/api/testar-resposta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem }),
    });
    const dados = await resposta.json();

    ultimaMensagem = mensagem;
    ultimaRespostaIA = dados.resposta;

    respostaIaTexto.textContent = dados.resposta;
    resultadoTeste.classList.remove("escondido");
    correcaoArea.classList.add("escondido");
    respostaRealInput.value = "";
  } finally {
    testarBotao.disabled = false;
    testarBotao.textContent = t("calibracao_gerar");
  }
});

soaSimBotao.addEventListener("click", () => {
  resultadoTeste.classList.add("escondido");
  mensagemSimuladaInput.value = "";
});

soaNaoBotao.addEventListener("click", () => {
  correcaoArea.classList.remove("escondido");
  respostaRealInput.focus();
});

salvarCorrecaoBotao.addEventListener("click", async () => {
  const respostaReal = respostaRealInput.value.trim();
  if (!respostaReal) return;

  await fetch("/api/correcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mensagem_recebida: ultimaMensagem,
      resposta_ia_original: ultimaRespostaIA,
      resposta_real: respostaReal,
    }),
  });

  resultadoTeste.classList.add("escondido");
  mensagemSimuladaInput.value = "";
  carregarCorrecoes();
});

async function carregarCorrecoes() {
  const resposta = await fetch("/api/correcoes");
  const correcoes = await resposta.json();

  totalCorrecoes.textContent = correcoes.length;
  listaCorrecoes.innerHTML = correcoes.length
    ? correcoes
        .map(
          (c, indice) => `
        <li>
          <div class="linha">
            <span class="msg-recebida">📩 "${escaparHtml(c.mensagem_recebida)}"</span>
            <button class="remover" data-indice="${indice}">${t("correcoes_remover")}</button>
          </div>
          <div class="resp-real">✅ "${escaparHtml(c.resposta_real)}"</div>
        </li>`
        )
        .join("")
    : `<li style="color:var(--texto-fraco)">${t("correcoes_nenhuma")}</li>`;

  listaCorrecoes.querySelectorAll(".remover").forEach((botao) => {
    botao.addEventListener("click", async () => {
      await fetch(`/api/correcoes/${botao.dataset.indice}`, { method: "DELETE" });
      carregarCorrecoes();
    });
  });
}
carregarCorrecoes();

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Quando o idioma do painel muda, o data-i18n cuida dos textos estáticos
// sozinho — mas listas geradas via JavaScript (horários, FAQ, correções,
// contatos, perfil) precisam ser re-renderizadas manualmente.
document.addEventListener("idioma-alterado", () => {
  if (negocioAtual) {
    renderizarHorarios();
    renderizarFaq();
  }
  carregarCorrecoes();
  carregarListaContatos();
  if (jidSelecionado) carregarThread(jidSelecionado);
  renderizarPerfil(ultimoPerfilCarregado);
});

// ---------- Negócio ----------
const DIAS = [
  { chave: "seg", chaveI18n: "dia_seg" },
  { chave: "ter", chaveI18n: "dia_ter" },
  { chave: "qua", chaveI18n: "dia_qua" },
  { chave: "qui", chaveI18n: "dia_qui" },
  { chave: "sex", chaveI18n: "dia_sex" },
  { chave: "sab", chaveI18n: "dia_sab" },
  { chave: "dom", chaveI18n: "dia_dom" },
];

const negocioAtivoToggle = document.getElementById("negocio-ativo-toggle");
const negocioNomeInput = document.getElementById("negocio-nome");
const negocioDuracaoInput = document.getElementById("negocio-duracao");
const negocioCalendarIdInput = document.getElementById("negocio-calendar-id");
const horariosListaEl = document.getElementById("horarios-lista");
const faqListaEl = document.getElementById("faq-lista");
const faqPerguntaInput = document.getElementById("faq-pergunta");
const faqRespostaInput = document.getElementById("faq-resposta");
const faqAdicionarBotao = document.getElementById("faq-adicionar-botao");
const salvarNegocioBotao = document.getElementById("salvar-negocio-botao");
const negocioFeedback = document.getElementById("negocio-feedback");
const googleStatusTexto = document.getElementById("google-status-texto");
const googleConectarBotao = document.getElementById("google-conectar-botao");
const googleDesconectarBotao = document.getElementById("google-desconectar-botao");

let negocioAtual = null;

function renderizarHorarios() {
  horariosListaEl.innerHTML = DIAS.map(({ chave, chaveI18n }) => {
    const h = negocioAtual.horarios[chave];
    const aberto = Boolean(h);
    return `
      <div class="horario-linha" data-dia="${chave}">
        <label><input type="checkbox" class="dia-aberto-checkbox" data-dia="${chave}" ${aberto ? "checked" : ""} /> ${t(chaveI18n)}</label>
        <input type="time" class="dia-inicio" data-dia="${chave}" value="${h?.inicio || "09:00"}" ${aberto ? "" : "disabled"} />
        <span>${t("negocio_horario_ate")}</span>
        <input type="time" class="dia-fim" data-dia="${chave}" value="${h?.fim || "18:00"}" ${aberto ? "" : "disabled"} />
      </div>`;
  }).join("");

  horariosListaEl.querySelectorAll(".dia-aberto-checkbox").forEach((chk) => {
    chk.addEventListener("change", () => {
      const linha = horariosListaEl.querySelector(`.horario-linha[data-dia="${chk.dataset.dia}"]`);
      linha.querySelectorAll("input[type='time']").forEach((inp) => (inp.disabled = !chk.checked));
    });
  });
}

function coletarHorariosDoFormulario() {
  const horarios = {};
  DIAS.forEach(({ chave }) => {
    const aberto = horariosListaEl.querySelector(`.dia-aberto-checkbox[data-dia="${chave}"]`).checked;
    if (!aberto) {
      horarios[chave] = null;
    } else {
      horarios[chave] = {
        inicio: horariosListaEl.querySelector(`.dia-inicio[data-dia="${chave}"]`).value,
        fim: horariosListaEl.querySelector(`.dia-fim[data-dia="${chave}"]`).value,
      };
    }
  });
  return horarios;
}

function renderizarFaq() {
  faqListaEl.innerHTML = negocioAtual.faq.length
    ? negocioAtual.faq
        .map(
          (item, indice) => `
        <div class="faq-item">
          <button class="faq-remover" data-indice="${indice}">${t("correcoes_remover")}</button>
          <div class="faq-pergunta">${escaparHtml(item.pergunta)}</div>
          <div>${escaparHtml(item.resposta)}</div>
        </div>`
        )
        .join("")
    : `<p class="vazio">${t("negocio_faq_nenhuma")}</p>`;

  faqListaEl.querySelectorAll(".faq-remover").forEach((botao) => {
    botao.addEventListener("click", () => {
      negocioAtual.faq.splice(Number(botao.dataset.indice), 1);
      renderizarFaq();
    });
  });
}

async function carregarNegocio() {
  const resposta = await fetch("/api/negocio");
  negocioAtual = await resposta.json();

  negocioAtivoToggle.checked = Boolean(negocioAtual.modoAtivo);
  negocioNomeInput.value = negocioAtual.nomeNegocio || "";
  negocioDuracaoInput.value = negocioAtual.duracaoAtendimentoMin || 30;
  negocioCalendarIdInput.value = negocioAtual.calendarId || "primary";

  renderizarHorarios();
  renderizarFaq();
}
carregarNegocio();

faqAdicionarBotao.addEventListener("click", () => {
  const pergunta = faqPerguntaInput.value.trim();
  const resposta = faqRespostaInput.value.trim();
  if (!pergunta || !resposta) return;

  negocioAtual.faq.push({ pergunta, resposta });
  faqPerguntaInput.value = "";
  faqRespostaInput.value = "";
  renderizarFaq();
});

salvarNegocioBotao.addEventListener("click", async () => {
  const corpo = {
    modoAtivo: negocioAtivoToggle.checked,
    nomeNegocio: negocioNomeInput.value,
    duracaoAtendimentoMin: Number(negocioDuracaoInput.value) || 30,
    calendarId: negocioCalendarIdInput.value || "primary",
    horarios: coletarHorariosDoFormulario(),
    faq: negocioAtual.faq,
  };

  await fetch("/api/negocio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  negocioFeedback.textContent = t("config_salvo");
  setTimeout(() => (negocioFeedback.textContent = ""), 2000);
});

async function atualizarStatusGoogle() {
  const resposta = await fetch("/api/google/status");
  const dados = await resposta.json();

  if (dados.conectado) {
    googleStatusTexto.textContent = t("negocio_google_conectado");
    googleConectarBotao.classList.add("escondido");
    googleDesconectarBotao.classList.remove("escondido");
  } else {
    googleStatusTexto.textContent = t("negocio_google_nao_conectado");
    googleConectarBotao.classList.remove("escondido");
    googleDesconectarBotao.classList.add("escondido");
  }
}
atualizarStatusGoogle();

googleConectarBotao.addEventListener("click", async () => {
  const resposta = await fetch("/api/google/auth-url");
  const dados = await resposta.json();
  if (dados.url) {
    window.open(dados.url, "_blank");
  } else {
    alert(dados.erro || "Erro ao gerar link de autorização.");
  }
});

googleDesconectarBotao.addEventListener("click", async () => {
  await fetch("/api/google/desconectar", { method: "POST" });
  atualizarStatusGoogle();
});

// ---------- Conversas (estilo WhatsApp Web) ----------
const listaContatos = document.getElementById("lista-contatos");
const threadVazia = document.getElementById("thread-vazia");
const threadConteudo = document.getElementById("thread-conteudo");
const threadNome = document.getElementById("thread-nome");
const threadJid = document.getElementById("thread-jid");
const threadMensagens = document.getElementById("thread-mensagens");
const threadPermitidoToggle = document.getElementById("thread-permitido-toggle");
const threadPermitidoTexto = document.getElementById("thread-permitido-texto");

let jidSelecionado = null;

function formatarHora(timestamp) {
  const locale = { pt: "pt-BR", en: "en-US", es: "es-ES" }[obterIdiomaAtual()] || "pt-BR";
  return new Date(timestamp).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

async function carregarListaContatos() {
  const resposta = await fetch("/api/conversas");
  const lista = await resposta.json();

  if (lista.length === 0) {
    listaContatos.innerHTML = `<li class="vazio-contatos">${t("conversas_nenhuma")}</li>`;
    return;
  }

  listaContatos.innerHTML = lista
    .map(
      (c) => `
      <li class="contato ${c.jid === jidSelecionado ? "selecionado" : ""}" data-jid="${escaparHtml(c.jid)}">
        <div class="contato-linha-topo">
          <span class="contato-nome">${escaparHtml(c.nome)}</span>
          <span class="contato-tag ${c.permitido ? "liberado" : "bloqueado"}">${c.permitido ? t("conversas_liberado") : t("conversas_bloqueado")}</span>
        </div>
        <span class="contato-ultima-msg">${c.ultimaMensagem ? escaparHtml(c.ultimaMensagem) : ""}</span>
      </li>`
    )
    .join("");

  listaContatos.querySelectorAll(".contato").forEach((li) => {
    li.addEventListener("click", () => selecionarContato(li.dataset.jid));
  });
}

async function selecionarContato(jid) {
  jidSelecionado = jid;
  carregarListaContatos(); // reaplica destaque de selecionado
  await carregarThread(jid);
}

async function carregarThread(jid) {
  const resposta = await fetch(`/api/conversas/${encodeURIComponent(jid)}`);
  if (!resposta.ok) return;
  const conversa = await resposta.json();

  threadVazia.classList.add("escondido");
  threadConteudo.classList.remove("escondido");

  threadNome.textContent = conversa.nome;
  threadJid.textContent = jid;
  threadPermitidoToggle.checked = conversa.permitido;
  threadPermitidoTexto.textContent = conversa.permitido ? t("conversas_respondendo") : t("conversas_bloqueado");

  threadMensagens.innerHTML = conversa.mensagens
    .map(
      (m) => `
      <div class="msg-bolha ${m.de === "bot" ? "bot" : "deles"}">
        ${escaparHtml(m.texto)}
        <span class="msg-hora">${formatarHora(m.timestamp)}</span>
      </div>`
    )
    .join("");

  threadMensagens.scrollTop = threadMensagens.scrollHeight;
}

threadPermitidoToggle.addEventListener("change", async () => {
  if (!jidSelecionado) return;
  const permitido = threadPermitidoToggle.checked;

  await fetch(`/api/conversas/${encodeURIComponent(jidSelecionado)}/permissao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permitido }),
  });

  threadPermitidoTexto.textContent = permitido ? t("conversas_respondendo") : t("conversas_bloqueado");
  carregarListaContatos();
});

carregarListaContatos();
setInterval(() => {
  carregarListaContatos();
  if (jidSelecionado) carregarThread(jidSelecionado);
}, 3000);
