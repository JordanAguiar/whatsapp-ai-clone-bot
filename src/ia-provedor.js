const gemini = require("./provedores/gemini");
const groq = require("./provedores/groq");

// Ordem de prioridade: Gemini primeiro, Groq como reserva. Groq só entra na
// lista se a chave estiver configurada (é opcional).
function providersDisponiveis() {
  const lista = [gemini];
  if (process.env.GROQ_API_KEY) lista.push(groq);
  return lista;
}

// Quando um provedor bate a cota, ele fica "de molho" por um tempo antes de
// tentarmos ele de novo — evita ficar batendo na mesma cota esgotada a cada
// mensagem. Não sabemos a hora exata do reset (pode ser por minuto ou por
// dia), então usamos um cooldown conservador e vamos reavaliando.
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos
const bloqueadoAte = {};
let provedorAtivoAtual = null;
let ultimaTrocaEm = null;

function estaBloqueado(provedor) {
  return bloqueadoAte[provedor.nome] && Date.now() < bloqueadoAte[provedor.nome];
}

function bloquear(provedor) {
  bloqueadoAte[provedor.nome] = Date.now() + COOLDOWN_MS;
}

/**
 * Gera texto tentando os provedores em ordem de prioridade. Se um provedor
 * bater cota ou estiver sobrecarregado, migra pro próximo automaticamente.
 */
async function gerar(opcoes) {
  const providers = providersDisponiveis();
  let ultimoErro = null;

  for (const provedor of providers) {
    if (estaBloqueado(provedor)) continue;

    try {
      const texto = await provedor.gerar(opcoes);

      if (provedorAtivoAtual !== provedor.nome) {
        console.log(`✅ Usando ${provedor.nome} como provedor de IA.`);
        ultimaTrocaEm = Date.now();
      }
      provedorAtivoAtual = provedor.nome;
      return texto;
    } catch (erro) {
      ultimoErro = erro;

      if (provedor.ehErroDeCota(erro)) {
        console.error(`🛑 Cota do ${provedor.nome} esgotada. Migrando pra próxima IA disponível (se houver).`);
        bloquear(provedor);
        continue;
      }

      if (provedor.ehErroSobrecarga?.(erro)) {
        console.log(`⏳ ${provedor.nome} sobrecarregado, tentando próximo provedor...`);
        continue;
      }

      // Erro desconhecido (ex: chave inválida, bug de código) — não adianta
      // trocar de provedor, isso não vai se resolver sozinho.
      throw erro;
    }
  }

  throw ultimoErro || new Error("Nenhuma IA disponível no momento (todas sem cota ou indisponíveis).");
}

function obterProvedorAtivo() {
  return provedorAtivoAtual;
}

function obterStatusProvedores() {
  return providersDisponiveis().map((p) => ({
    nome: p.nome,
    disponivel: !estaBloqueado(p),
    bloqueadoAte: bloqueadoAte[p.nome] || null,
  }));
}

module.exports = { gerar, obterProvedorAtivo, obterStatusProvedores };
