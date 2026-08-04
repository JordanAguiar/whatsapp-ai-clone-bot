// Dicionário de traduções do painel. Cada chave corresponde a um
// data-i18n="chave" no HTML, ou é usada diretamente via t("chave") no app.js
// pra textos gerados dinamicamente.
const TRADUCOES = {
  pt: {
    marca_subtitulo: "Painel de controle",
    aba_conexao: "Conexão",
    aba_conversas: "Conversas",
    aba_negocio: "Negócio",
    aba_config: "Configurações",
    aba_estilo: "Estilo",
    aba_calibracao: "Calibração",

    conexao_titulo: "Conexão com o WhatsApp",
    conexao_desc: "Escaneie o QR code para conectar o número que vai usar o bot.",
    conexao_iniciando: "Iniciando conexão...",
    conexao_instrucao_qr: "Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho",
    conexao_conectado: "Conectado! O bot já está respondendo mensagens.",

    negocio_titulo: "Modo Negócio",
    negocio_desc: "Transforme o bot num assistente de agendamento com FAQ, em vez do clone do seu jeito de falar.",
    negocio_toggle: "Modo Negócio ativo",
    negocio_toggle_ajuda: "Quando ligado, o bot para de imitar seu estilo pessoal e passa a agendar horários e responder FAQ.",
    negocio_dados_titulo: "Dados do negócio",
    negocio_nome_label: "Nome do negócio",
    negocio_duracao_label: "Duração de cada atendimento (minutos)",
    negocio_calendarid_label: "ID do calendário (deixe \"primary\" se for o principal da sua conta Google)",
    negocio_horarios_titulo: "Horário de funcionamento",
    negocio_horario_ate: "até",
    negocio_google_titulo: "Google Calendar",
    negocio_google_conectar: "Conectar Google Calendar",
    negocio_google_desconectar: "Desconectar",
    negocio_faq_titulo: "Perguntas frequentes (FAQ)",
    negocio_faq_nova_pergunta: "Nova pergunta",
    negocio_faq_resposta: "Resposta",
    negocio_faq_adicionar: "Adicionar pergunta",
    negocio_salvar: "Salvar configurações do negócio",

    config_titulo: "Configurações",
    config_desc: "Ajuste o tempo de resposta e adicione instruções extras de comportamento.",
    config_idioma_painel: "Idioma do painel",
    config_delay_min: "Delay mínimo antes de responder (segundos)",
    config_delay_max: "Delay máximo antes de responder (segundos)",
    config_instrucoes: "Instruções adicionais de comportamento",
    config_aprendizado: "Aprendizado contínuo",
    config_aprendizado_ajuda:
      "Quando ativado, toda mensagem que você mesmo digitar no WhatsApp (em qualquer conversa, não só nas que o bot responde) vira um novo exemplo de estilo automaticamente — sem precisar exportar nada. Desligado por padrão, porque isso captura texto de conversas suas em geral. Ative só se topar isso.",
    config_salvar: "Salvar configurações",
    config_salvo: "✅ Salvo!",

    estilo_titulo: "Perfil de estilo",
    estilo_desc: "Envie conversas exportadas do WhatsApp e gere (ou re-gere) o perfil de escrita.",
    estilo_conversas_titulo: "Conversas exportadas (.txt)",
    estilo_arraste: "Arraste arquivos aqui ou",
    estilo_selecione: "selecione",
    estilo_gerar_perfil: "Gerar perfil de estilo",
    estilo_perfil_atual: "Perfil atual",
    estilo_nenhum_perfil: "Nenhum perfil gerado ainda.",
    estilo_analisando: "Analisando (pode levar alguns segundos)...",
    estilo_mensagens_analisadas: "mensagens analisadas.",
    estilo_nenhum_arquivo: "Nenhum arquivo enviado ainda.",

    calibracao_titulo: "Calibração interativa",
    calibracao_desc: "Digite uma mensagem simulada, veja o que o bot responderia, e corrija se não soar como você.",
    calibracao_mensagem_label: "Mensagem recebida (simulada)",
    calibracao_gerar: "Gerar resposta",
    calibracao_bolha_label: "Resposta do bot",
    calibracao_pergunta: "Essa resposta soa como você?",
    calibracao_sim: "Sim, tá bom",
    calibracao_nao: "Não, vou corrigir",
    calibracao_resposta_real_label: "Como você responderia de verdade?",
    calibracao_salvar_correcao: "Salvar correção",
    calibracao_correcoes_salvas: "Correções salvas",
    calibracao_gerando: "Gerando...",

    erro_desconhecido: "Erro desconhecido",

    conversas_titulo: "Conversas",
    conversas_legenda: "Contatos liberados respondem automaticamente",
    conversas_selecione: "Selecione uma conversa à esquerda para ver o histórico.",
    conversas_nenhuma: "Nenhuma mensagem recebida ainda.",
    conversas_bloqueado: "bloqueado",
    conversas_liberado: "liberado",
    conversas_respondendo: "respondendo automaticamente",

    status_iniciando: "iniciando...",
    status_aguardando_qr: "aguardando leitura do QR",
    status_conectado: "conectado",
    status_reconectando: "reconectando...",
    status_deslogado: "sessão deslogada",
    status_erro: "erro de conexão",
    status_offline: "servidor offline",
    status_reconectando_tentativa: "Reconectando... (tentativa",

    ia_verificando: "IA: verificando...",
    ia_aguardando: "IA: aguardando primeira resposta",
    ia_indisponivel: "IA: status indisponível",

    perfil_tom: "Tom",
    perfil_tamanho: "Tamanho das respostas",
    perfil_emoji: "Uso de emoji",
    perfil_pontuacao: "Pontuação",
    perfil_girias: "Gírias/expressões",
    perfil_saudacoes: "Saudações",
    perfil_despedidas: "Despedidas",
    perfil_observacoes: "Observações",

    correcoes_nenhuma: "Nenhuma correção salva ainda.",
    correcoes_remover: "remover",

    negocio_google_conectado: "✅ Google Calendar conectado.",
    negocio_google_nao_conectado: "Não conectado ainda.",
    negocio_faq_nenhuma: "Nenhuma pergunta configurada ainda.",

    dia_seg: "Segunda",
    dia_ter: "Terça",
    dia_qua: "Quarta",
    dia_qui: "Quinta",
    dia_sex: "Sexta",
    dia_sab: "Sábado",
    dia_dom: "Domingo",
  },

  en: {
    marca_subtitulo: "Control panel",
    aba_conexao: "Connection",
    aba_conversas: "Chats",
    aba_negocio: "Business",
    aba_config: "Settings",
    aba_estilo: "Style",
    aba_calibracao: "Calibration",

    conexao_titulo: "WhatsApp Connection",
    conexao_desc: "Scan the QR code to connect the number that will use the bot.",
    conexao_iniciando: "Starting connection...",
    conexao_instrucao_qr: "Open WhatsApp → Settings → Linked devices → Link a device",
    conexao_conectado: "Connected! The bot is already replying to messages.",

    negocio_titulo: "Business Mode",
    negocio_desc: "Turn the bot into a scheduling assistant with FAQ, instead of cloning your personal writing style.",
    negocio_toggle: "Business Mode active",
    negocio_toggle_ajuda: "When on, the bot stops imitating your personal style and starts scheduling appointments and answering FAQ.",
    negocio_dados_titulo: "Business info",
    negocio_nome_label: "Business name",
    negocio_duracao_label: "Duration of each appointment (minutes)",
    negocio_calendarid_label: "Calendar ID (leave \"primary\" if it's your main Google account calendar)",
    negocio_horarios_titulo: "Business hours",
    negocio_horario_ate: "to",
    negocio_google_titulo: "Google Calendar",
    negocio_google_conectar: "Connect Google Calendar",
    negocio_google_desconectar: "Disconnect",
    negocio_faq_titulo: "Frequently Asked Questions (FAQ)",
    negocio_faq_nova_pergunta: "New question",
    negocio_faq_resposta: "Answer",
    negocio_faq_adicionar: "Add question",
    negocio_salvar: "Save business settings",

    config_titulo: "Settings",
    config_desc: "Adjust the response time and add extra behavior instructions.",
    config_idioma_painel: "Panel language",
    config_delay_min: "Minimum delay before replying (seconds)",
    config_delay_max: "Maximum delay before replying (seconds)",
    config_instrucoes: "Extra behavior instructions",
    config_aprendizado: "Continuous learning",
    config_aprendizado_ajuda:
      "When enabled, every message YOU type on WhatsApp (in any chat, not just the ones the bot replies to) automatically becomes a new style example — no need to export anything. Off by default, since this captures text from your chats in general. Only enable if you're comfortable with that.",
    config_salvar: "Save settings",
    config_salvo: "✅ Saved!",

    estilo_titulo: "Style profile",
    estilo_desc: "Upload exported WhatsApp chats and generate (or regenerate) the writing profile.",
    estilo_conversas_titulo: "Exported chats (.txt)",
    estilo_arraste: "Drag files here or",
    estilo_selecione: "select",
    estilo_gerar_perfil: "Generate style profile",
    estilo_perfil_atual: "Current profile",
    estilo_nenhum_perfil: "No profile generated yet.",
    estilo_analisando: "Analyzing (this can take a few seconds)...",
    estilo_mensagens_analisadas: "messages analyzed.",
    estilo_nenhum_arquivo: "No file uploaded yet.",

    calibracao_titulo: "Interactive calibration",
    calibracao_desc: "Type a simulated message, see what the bot would reply, and correct it if it doesn't sound like you.",
    calibracao_mensagem_label: "Received message (simulated)",
    calibracao_gerar: "Generate reply",
    calibracao_bolha_label: "Bot's reply",
    calibracao_pergunta: "Does this reply sound like you?",
    calibracao_sim: "Yes, it's good",
    calibracao_nao: "No, I'll correct it",
    calibracao_resposta_real_label: "How would you really reply?",
    calibracao_salvar_correcao: "Save correction",
    calibracao_correcoes_salvas: "Saved corrections",
    calibracao_gerando: "Generating...",

    erro_desconhecido: "Unknown error",

    conversas_titulo: "Chats",
    conversas_legenda: "Allowed contacts get automatic replies",
    conversas_selecione: "Select a chat on the left to see the history.",
    conversas_nenhuma: "No messages received yet.",
    conversas_bloqueado: "blocked",
    conversas_liberado: "allowed",
    conversas_respondendo: "auto-replying",

    status_iniciando: "starting...",
    status_aguardando_qr: "waiting for QR scan",
    status_conectado: "connected",
    status_reconectando: "reconnecting...",
    status_deslogado: "session logged out",
    status_erro: "connection error",
    status_offline: "server offline",
    status_reconectando_tentativa: "Reconnecting... (attempt",

    ia_verificando: "AI: checking...",
    ia_aguardando: "AI: waiting for first reply",
    ia_indisponivel: "AI: status unavailable",

    perfil_tom: "Tone",
    perfil_tamanho: "Reply length",
    perfil_emoji: "Emoji usage",
    perfil_pontuacao: "Punctuation",
    perfil_girias: "Slang/expressions",
    perfil_saudacoes: "Greetings",
    perfil_despedidas: "Sign-offs",
    perfil_observacoes: "Notes",

    correcoes_nenhuma: "No corrections saved yet.",
    correcoes_remover: "remove",

    negocio_google_conectado: "✅ Google Calendar connected.",
    negocio_google_nao_conectado: "Not connected yet.",
    negocio_faq_nenhuma: "No questions configured yet.",

    dia_seg: "Monday",
    dia_ter: "Tuesday",
    dia_qua: "Wednesday",
    dia_qui: "Thursday",
    dia_sex: "Friday",
    dia_sab: "Saturday",
    dia_dom: "Sunday",
  },

  es: {
    marca_subtitulo: "Panel de control",
    aba_conexao: "Conexión",
    aba_conversas: "Conversaciones",
    aba_negocio: "Negocio",
    aba_config: "Configuración",
    aba_estilo: "Estilo",
    aba_calibracao: "Calibración",

    conexao_titulo: "Conexión con WhatsApp",
    conexao_desc: "Escanea el código QR para conectar el número que usará el bot.",
    conexao_iniciando: "Iniciando conexión...",
    conexao_instrucao_qr: "Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo",
    conexao_conectado: "¡Conectado! El bot ya está respondiendo mensajes.",

    negocio_titulo: "Modo Negocio",
    negocio_desc: "Convierte el bot en un asistente de citas con FAQ, en vez de clonar tu forma de escribir.",
    negocio_toggle: "Modo Negocio activo",
    negocio_toggle_ajuda: "Cuando está activado, el bot deja de imitar tu estilo personal y empieza a agendar citas y responder FAQ.",
    negocio_dados_titulo: "Datos del negocio",
    negocio_nome_label: "Nombre del negocio",
    negocio_duracao_label: "Duración de cada cita (minutos)",
    negocio_calendarid_label: "ID del calendario (deja \"primary\" si es el principal de tu cuenta Google)",
    negocio_horarios_titulo: "Horario de atención",
    negocio_horario_ate: "hasta",
    negocio_google_titulo: "Google Calendar",
    negocio_google_conectar: "Conectar Google Calendar",
    negocio_google_desconectar: "Desconectar",
    negocio_faq_titulo: "Preguntas frecuentes (FAQ)",
    negocio_faq_nova_pergunta: "Nueva pregunta",
    negocio_faq_resposta: "Respuesta",
    negocio_faq_adicionar: "Agregar pregunta",
    negocio_salvar: "Guardar configuración del negocio",

    config_titulo: "Configuración",
    config_desc: "Ajusta el tiempo de respuesta y agrega instrucciones extra de comportamiento.",
    config_idioma_painel: "Idioma del panel",
    config_delay_min: "Demora mínima antes de responder (segundos)",
    config_delay_max: "Demora máxima antes de responder (segundos)",
    config_instrucoes: "Instrucciones adicionales de comportamiento",
    config_aprendizado: "Aprendizaje continuo",
    config_aprendizado_ajuda:
      "Cuando está activado, cada mensaje que TÚ escribas en WhatsApp (en cualquier chat, no solo en los que el bot responde) se convierte automáticamente en un nuevo ejemplo de estilo, sin necesidad de exportar nada. Desactivado por defecto, ya que esto captura texto de tus chats en general. Actívalo solo si estás de acuerdo.",
    config_salvar: "Guardar configuración",
    config_salvo: "✅ ¡Guardado!",

    estilo_titulo: "Perfil de estilo",
    estilo_desc: "Sube conversaciones exportadas de WhatsApp y genera (o regenera) el perfil de escritura.",
    estilo_conversas_titulo: "Conversaciones exportadas (.txt)",
    estilo_arraste: "Arrastra archivos aquí o",
    estilo_selecione: "selecciona",
    estilo_gerar_perfil: "Generar perfil de estilo",
    estilo_perfil_atual: "Perfil actual",
    estilo_nenhum_perfil: "Aún no se generó ningún perfil.",
    estilo_analisando: "Analizando (puede tardar unos segundos)...",
    estilo_mensagens_analisadas: "mensajes analizados.",
    estilo_nenhum_arquivo: "Aún no se subió ningún archivo.",

    calibracao_titulo: "Calibración interactiva",
    calibracao_desc: "Escribe un mensaje simulado, mira qué respondería el bot, y corrígelo si no suena como tú.",
    calibracao_mensagem_label: "Mensaje recibido (simulado)",
    calibracao_gerar: "Generar respuesta",
    calibracao_bolha_label: "Respuesta del bot",
    calibracao_pergunta: "¿Esta respuesta suena como tú?",
    calibracao_sim: "Sí, está bien",
    calibracao_nao: "No, la voy a corregir",
    calibracao_resposta_real_label: "¿Cómo responderías de verdad?",
    calibracao_salvar_correcao: "Guardar corrección",
    calibracao_correcoes_salvas: "Correcciones guardadas",
    calibracao_gerando: "Generando...",

    erro_desconhecido: "Error desconocido",

    conversas_titulo: "Conversaciones",
    conversas_legenda: "Los contactos permitidos reciben respuestas automáticas",
    conversas_selecione: "Selecciona una conversación a la izquierda para ver el historial.",
    conversas_nenhuma: "Aún no se recibieron mensajes.",
    conversas_bloqueado: "bloqueado",
    conversas_liberado: "permitido",
    conversas_respondendo: "respondiendo automáticamente",

    status_iniciando: "iniciando...",
    status_aguardando_qr: "esperando lectura del QR",
    status_conectado: "conectado",
    status_reconectando: "reconectando...",
    status_deslogado: "sesión cerrada",
    status_erro: "error de conexión",
    status_offline: "servidor fuera de línea",
    status_reconectando_tentativa: "Reconectando... (intento",

    ia_verificando: "IA: verificando...",
    ia_aguardando: "IA: esperando primera respuesta",
    ia_indisponivel: "IA: estado no disponible",

    perfil_tom: "Tono",
    perfil_tamanho: "Longitud de las respuestas",
    perfil_emoji: "Uso de emoji",
    perfil_pontuacao: "Puntuación",
    perfil_girias: "Jergas/expresiones",
    perfil_saudacoes: "Saludos",
    perfil_despedidas: "Despedidas",
    perfil_observacoes: "Observaciones",

    correcoes_nenhuma: "Aún no hay correcciones guardadas.",
    correcoes_remover: "eliminar",

    negocio_google_conectado: "✅ Google Calendar conectado.",
    negocio_google_nao_conectado: "Aún no conectado.",
    negocio_faq_nenhuma: "Aún no hay preguntas configuradas.",

    dia_seg: "Lunes",
    dia_ter: "Martes",
    dia_qua: "Miércoles",
    dia_qui: "Jueves",
    dia_sex: "Viernes",
    dia_sab: "Sábado",
    dia_dom: "Domingo",
  },
};

const IDIOMAS_SUPORTADOS = ["pt", "en", "es"];

function detectarIdiomaPadrao() {
  const salvo = localStorage.getItem("idiomaPainel");
  if (salvo && IDIOMAS_SUPORTADOS.includes(salvo)) return salvo;

  const navegador = (navigator.language || "pt").slice(0, 2).toLowerCase();
  return IDIOMAS_SUPORTADOS.includes(navegador) ? navegador : "pt";
}

let idiomaAtual = detectarIdiomaPadrao();

function t(chave) {
  return TRADUCOES[idiomaAtual]?.[chave] || TRADUCOES.pt[chave] || chave;
}

function definirIdioma(novoIdioma) {
  if (!IDIOMAS_SUPORTADOS.includes(novoIdioma)) return;
  idiomaAtual = novoIdioma;
  localStorage.setItem("idiomaPainel", novoIdioma);
  aplicarTraducoes();
  // Avisa o resto do app (listas geradas dinamicamente: horários, FAQ,
  // correções, contatos, perfil) que precisa re-renderizar no novo idioma.
  document.dispatchEvent(new CustomEvent("idioma-alterado"));
}

function obterIdiomaAtual() {
  return idiomaAtual;
}

/** Aplica as traduções em todos os elementos marcados com data-i18n / data-i18n-placeholder. */
function aplicarTraducoes() {
  document.documentElement.lang = idiomaAtual;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });

  const seletor = document.getElementById("idioma-painel-select");
  if (seletor) seletor.value = idiomaAtual;
}

document.addEventListener("DOMContentLoaded", aplicarTraducoes);
