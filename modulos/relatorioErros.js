// Relatório de erros em TXT, direto no WhatsApp do dono.
//
// Como funciona: este módulo "embrulha" o console.error. O erro continua
// aparecendo no log do servidor exatamente como antes, e uma cópia vai pra uma
// fila. De tempos em tempos (janela de ~15 s) a fila vira UM arquivo TXT enviado
// pro privado do dono, com duas partes:
//   PARTE 1 — o texto EXATO que apareceu no log.
//   PARTE 2 — explicação em português: o que é, em que arquivo e linha do bot
//             aconteceu, possível causa e o que fazer.
//
// Proteções (pra não virar um problema pior que os erros):
//  - Erros iguais na mesma janela viram um só, com contador ("repetiu 3x").
//  - Bot desconectado: guarda (até 200) e envia quando reconectar.
//  - No máximo 1 TXT a cada 30 s; se vier uma enxurrada (5 TXT em 10 min),
//    passa a 1 TXT a cada 5 min, pra não parecer spam pro WhatsApp.
//  - Falha ao enviar o TXT NUNCA gera outro relatório (evita loop): é registrada
//    com o console.error ORIGINAL, que não passa pela fila.
//  - Chaves/tokens óbvios são mascarados com *** antes de sair do servidor.
const fs = require('fs');
const path = require('path');
const util = require('util');

const RAIZ = path.resolve(__dirname, '..');
const FUSO = 'Africa/Maputo';

const PADRAO = {
    janelaMs: 15 * 1000,                 // espera juntando erros antes de enviar
    intervaloMinMs: 30 * 1000,           // mínimo entre dois TXT
    janelaEnxurradaMs: 10 * 60 * 1000,   // período usado pra detectar enxurrada
    enxurradaEnvios: 5,                  // TXT nesse período = enxurrada
    intervaloEnxurradaMs: 5 * 60 * 1000, // mínimo entre TXT durante enxurrada
    maxPendentes: 200,                   // erros diferentes guardados na fila
    maxErrosPorArquivo: 25,              // erros diferentes em cada TXT
    maxCharsPorErro: 20000,              // corte ao capturar
    maxCharsLog: 150000,                 // teto da PARTE 1 de cada TXT
    maxFalhas: 3,                        // tentativas de envio antes de descartar
    // Continuam aparecendo no log do servidor, mas não geram TXT: avisos que
    // saem em TODO boot e não são erro de verdade (o bot hospedado no Render
    // não usa Volume do Railway, então esse aviso apareceria sempre).
    ignorar: [/Nenhum Volume do Railway anexado/i]
};

let erroOriginal = null;
const estado = {
    iniciado: false,
    config: { ...PADRAO },
    obterDonoJid: null,
    sock: null,
    fila: [],
    descartadas: 0,
    timer: null,
    enviando: false,
    ultimoEnvio: 0,
    enviosRecentes: [],
    falhas: 0
};

// ─── Utilidades de data ─────────────────────────────────────────────────────
function horaCurta(data) {
    try {
        return data.toLocaleTimeString('pt-PT', { timeZone: FUSO, hour12: false });
    } catch (_) {
        return data.toISOString().slice(11, 19);
    }
}

function dataHoraCompleta(data) {
    try {
        return data.toLocaleString('pt-PT', { timeZone: FUSO, hour12: false });
    } catch (_) {
        return data.toISOString();
    }
}

function nomeDoArquivo(data) {
    try {
        const s = data.toLocaleString('sv-SE', { timeZone: FUSO }); // 2026-10-24 22:01:30
        return `erro_leicybot_${s.slice(0, 10)}_${s.slice(11, 13)}h${s.slice(14, 16)}m${s.slice(17, 19)}s.txt`;
    } catch (_) {
        return `erro_leicybot_${data.toISOString().replace(/[:.]/g, '-')}.txt`;
    }
}

// ─── Mascarar segredos ──────────────────────────────────────────────────────
function mascarar(texto) {
    let mascarado = false;
    const trocar = (re, sub) => {
        texto = texto.replace(re, (...a) => {
            mascarado = true;
            return typeof sub === 'function' ? sub(...a) : sub;
        });
    };
    trocar(/\b(gsk_|sk-|xox[bap]-|ghp_|github_pat_|AIza)[A-Za-z0-9_\-]{16,}/g, (m, prefixo) => `${prefixo}***`);
    trocar(/(Bearer\s+)[A-Za-z0-9._\-]{16,}/gi, (m, prefixo) => `${prefixo}***`);
    trocar(/((?:api[_-]?key|token|secret|password|senha|authorization)["']?\s*[:=]\s*["']?)[^\s"',;]{6,}/gi, (m, prefixo) => `${prefixo}***`);
    trocar(/[A-Za-z0-9+\/=]{300,}/g, (m) => `[conteúdo longo omitido: ${m.length} caracteres]`);
    return { texto, mascarado };
}

// ─── Pilha de chamadas → arquivo e linha ────────────────────────────────────
function lerFrames(stack) {
    const frames = [];
    for (const linha of String(stack || '').split('\n')) {
        const m = linha.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/);
        if (!m) continue;
        frames.push({
            funcao: m[1] || null,
            arquivo: m[2].replace(/^file:\/\//, ''),
            linha: Number(m[3])
        });
    }
    return frames;
}

// Devolve { tipo: 'projeto'|'biblioteca', ... } ou null (interno do Node / deste módulo).
function classificarFrame(f) {
    const arq = f.arquivo;
    if (arq.startsWith('node:') || !/[\\/]/.test(arq)) return null;
    if (arq === __filename) return null;
    if (/node_modules[\\/]/.test(arq)) {
        const resto = arq.split(/node_modules[\\/]/).pop();
        const pedacos = resto.split(/[\\/]/);
        const pacote = resto.startsWith('@') ? pedacos.slice(0, 2).join('/') : pedacos[0];
        return { tipo: 'biblioteca', pacote, ...f };
    }
    if (arq.startsWith(RAIZ + path.sep) || arq.startsWith(RAIZ + '/')) {
        const relativo = path.relative(RAIZ, arq).split(path.sep).join('/');
        return { tipo: 'projeto', relativo, ...f };
    }
    return null;
}

function primeiroClassificado(frames, tipo) {
    for (const f of frames) {
        const c = classificarFrame(f);
        if (c && (!tipo || c.tipo === tipo)) return c;
    }
    return null;
}

function trechoDeCodigo(arquivo, linha) {
    try {
        const l = fs.readFileSync(arquivo, 'utf-8').split('\n')[linha - 1];
        if (l === undefined) return null;
        const t = l.trim();
        return t.length > 180 ? t.slice(0, 180) + '…' : t;
    } catch (_) {
        return null;
    }
}

// ─── Explicações em português ───────────────────────────────────────────────
const ETIQUETAS = [
    ['PLAY/VIDEO', 'Comando !play ou !video (baixar música/vídeo)'],
    ['TIKTOK', 'Comando !tiktok'],
    ['INSTAGRAM', 'Comando !instagram'],
    ['STICKER', 'Comando !sticker / !s (figurinhas)'],
    ['COPIARSTICKER', 'Comando !copiarsticker'],
    ['ATTP', 'Comando !attp (figurinha animada com texto)'],
    ['BRAT', 'Comando !brat'],
    ['MEME', 'Comando !meme'],
    ['EMOJIMIX', 'Comando !emojimix'],
    ['TOMP3', 'Comando !tomp3 / !toaudio'],
    ['OCR', 'Comando !ocr (extrair texto de imagem)'],
    ['ANIME', 'Comando !anime'],
    ['SETFOTO', 'Comando !setfoto (foto do menu)'],
    ['MIDIA OPCIONAL', 'Módulo de mídia opcional'],
    ['MIDIA', 'Módulo de mídia (figurinhas, downloads, ffmpeg)'],
    ['GROQ', 'Inteligência artificial (Groq)'],
    ['DATABASE', 'Banco de dados (database.json)'],
    ['BACKUP', 'Backup'],
    ['ENQUETE', 'Enquetes'],
    ['ANTILINK', 'Proteção anti-link do grupo'],
    ['ANTIPALAVRA', 'Proteção anti-palavra do grupo'],
    ['ANTIMIDIA', 'Proteção anti-mídia do grupo'],
    ['BOAS-VINDAS', 'Mensagem de boas-vindas do grupo'],
    ['FAKES', 'Remoção automática de números estrangeiros'],
    ['GROUP-UPDATE', 'Eventos de grupo (entrada/saída de membros)'],
    ['ERRO GLOBAL', 'Erro que nenhum trecho do código tratou (pode ter travado parte do bot)'],
    ['ERRO INTERNO CAPTURADO', 'Erro dentro de um comando (o bot capturou e seguiu funcionando)'],
    ['ERRO CRÍTICO', 'Erro ao carregar o código do bot (comandos.js ou módulos) — o bot pode não ter ligado direito'],
    ['ERRO PAREAMENTO', 'Conexão com o WhatsApp: pareamento (código de login do aparelho)'],
    ['ERRO INICIALIZAÇÃO', 'Falha ao ligar o bot'],
    ['ERRO LIMPEZA', 'Limpeza da pasta de sessão do WhatsApp'],
    ['ERRO VARIÁVEL SESSÃO', 'Sessão do WhatsApp guardada em variável de ambiente'],
    ['WHATSAPP', 'Conexão com o WhatsApp'],
    ['CONEXÃO', 'Conexão com o WhatsApp'],
    ['SISTEMA', 'Sistema geral do bot (arranque, sessão, atualizações)']
];

function categoriaDoErro(texto) {
    const inicio = texto.slice(0, 200);
    const etiqueta = inicio.match(/\[([^\]\n]{2,40})\]/);
    if (etiqueta) {
        const nome = etiqueta[1].toUpperCase();
        for (const [chave, descricao] of ETIQUETAS) {
            if (nome === chave || nome.startsWith(chave)) return descricao;
        }
        return `Módulo "${etiqueta[1]}"`;
    }
    const interno = inicio.match(/Erro interno detectado no ([\w.]+\.js)/i);
    if (interno) return `Erro dentro de um comando do arquivo ${interno[1]} (o bot capturou e seguiu funcionando)`;
    if (/rodada de 30 segundos/i.test(inicio)) return 'Jogo da rodada de 30 segundos';
    return null;
}

const REGRAS = [
    {
        re: /sign in to confirm|not a bot/i,
        resumo: 'O YouTube bloqueou o download, achando que o servidor é um robô.',
        causa: 'O IP do servidor é de datacenter e o YouTube desconfia desses IPs.',
        acao: 'O !play já tenta o SoundCloud como reserva. Cookies de uma conta Google secundária (variável COOKIES_TXT_B64) também ajudam.'
    },
    {
        re: /python3?\b.{0,60}no such file|env: 'python3'/i,
        resumo: 'O servidor não tem o Python 3, que o yt-dlp (downloads) precisa.',
        causa: 'O ambiente de execução não traz o python3 instalado.',
        acao: 'Instalar o python3 no ambiente, ou usar o binário standalone do yt-dlp (não precisa de Python).'
    },
    {
        re: /javascript runtime|js-runtimes/i,
        resumo: 'O yt-dlp não encontrou um runtime de JavaScript para o YouTube.',
        causa: 'Versão do Node abaixo de 22 ou runtime não ativado.',
        acao: 'Confirmar que o servidor usa Node 22 ou superior (arquivo .node-version e variável NODE_VERSION no Render).'
    },
    {
        re: /ffmpeg|drawtext|libvpx|libwebp|libx264/i,
        resumo: 'Problema com o ffmpeg (programa que mexe com vídeo, áudio e figurinhas).',
        causa: 'O ffmpeg pode estar ausente, incompleto (sem drawtext/libvpx) ou ter recebido um arquivo/argumento inválido.',
        acao: 'Veja a mensagem original na Parte 1: ela traz o que o ffmpeg reclamou. Teste de novo com outro arquivo.'
    },
    {
        re: /enoent|no such file or directory/i,
        resumo: 'Arquivo, pasta ou programa não encontrado.',
        causa: 'O código tentou abrir algo que não existe (ex.: arquivo temporário já apagado, programa não instalado).',
        acao: 'Veja na Parte 1 qual caminho/programa faltou e confirme se ele existe no servidor.'
    },
    {
        re: /enospc|no space left/i,
        resumo: 'O disco do servidor está cheio.',
        causa: 'Arquivos temporários ou downloads acumulados.',
        acao: 'Reiniciar o serviço costuma limpar os temporários; se repetir, reduzir o que o bot guarda em disco.'
    },
    {
        re: /heap|out of memory|enomem|\bkilled\b/i,
        resumo: 'O servidor ficou sem memória.',
        causa: 'O plano gratuito tem pouca RAM e o processo (vídeo/figurinha) precisou de mais.',
        acao: 'Testar com arquivos menores; se for frequente, considerar um plano com mais memória.'
    },
    {
        re: /eacces|eperm/i,
        resumo: 'Sem permissão para ler ou gravar um arquivo/pasta.',
        causa: 'O processo do bot não tem acesso ao caminho indicado.',
        acao: 'Conferir permissões da pasta (ou usar uma pasta gravável, como a temporária).'
    },
    {
        re: /enotfound|eai_again/i,
        resumo: 'Não consegui encontrar o endereço do site (DNS).',
        causa: 'Internet do servidor instável ou endereço digitado errado no código.',
        acao: 'Costuma passar sozinho. Se repetir, confira o endereço (URL) usado no código.'
    },
    {
        re: /etimedout|econnreset|econnrefused|socket hang up|fetch failed|timed? ?out|timeout/i,
        resumo: 'Falha de rede: o site ou serviço demorou demais ou recusou a conexão.',
        causa: 'Serviço externo fora do ar, lento, ou bloqueando o servidor.',
        acao: 'Costuma passar sozinho. Se repetir, teste o serviço no navegador.'
    },
    {
        re: /\b429\b|rate.?limit|rate-overlimit|too many requests/i,
        resumo: 'Limite de pedidos atingido: muitas chamadas em pouco tempo.',
        causa: 'O serviço (ou o WhatsApp) pediu para diminuir o ritmo.',
        acao: 'Esperar alguns minutos. Se for o WhatsApp, evitar mandar muitas mensagens seguidas.'
    },
    {
        re: /\b401\b|\b403\b|unauthorized|forbidden|invalid api key|incorrect api key/i,
        resumo: 'Acesso negado pelo serviço.',
        causa: 'Chave/token inválido ou expirado, ou o serviço bloqueou o servidor.',
        acao: 'Conferir a chave da API (variáveis de ambiente) e se ela ainda é válida.'
    },
    {
        re: /bad mac|failed to decrypt|no matching sessions|no session found|sessionerror/i,
        resumo: 'Uma mensagem do WhatsApp não pôde ser decifrada (sessão de criptografia).',
        causa: 'Acontece de vez em quando, principalmente depois de reconexões.',
        acao: 'Normalmente é inofensivo e pontual. Só investigar se acontecer o tempo todo.'
    },
    {
        re: /connection (closed|failure|lost)|stream errored|precondition required|logged ?out/i,
        resumo: 'A conexão do bot com o WhatsApp caiu.',
        causa: 'Instabilidade de rede, reinício do servidor ou aparelho desconectado.',
        acao: 'O bot tenta reconectar sozinho. Se ele avisar que parou de tentar, reinicie o serviço.'
    },
    {
        re: /cannot read propert(y|ies) of (undefined|null)/i,
        resumo: 'Erro de código: o programa tentou usar um valor que estava vazio.',
        causa: 'Uma variável veio vazia (undefined/null) onde o código esperava um valor.',
        acao: 'Veja o arquivo e a linha indicados acima em "Onde": o valor vazio está nessa linha ou logo antes dela.'
    },
    {
        re: /is not a function|is not defined|is not iterable|is not a constructor/i,
        resumo: 'Erro de código: função ou variável inexistente (ou com nome errado).',
        causa: 'Nome digitado errado, import faltando ou biblioteca que não carregou.',
        acao: 'Veja o arquivo e a linha indicados acima em "Onde" e confira o nome usado.'
    },
    {
        re: /unexpected token|syntaxerror|json\.parse|in json at position/i,
        resumo: 'Texto/arquivo em formato inválido (JSON corrompido) ou erro de sintaxe no código.',
        causa: 'Um arquivo como o database.json pode ter ficado incompleto, ou o código tem um erro de escrita.',
        acao: 'Se for o database.json, restaure o último backup (!backup). Se for código, veja o arquivo e a linha indicados acima em "Onde".'
    }
];

function identificar(texto) {
    return REGRAS.find(r => r.re.test(texto)) || null;
}

// ─── Captura ────────────────────────────────────────────────────────────────
function capturar(args) {
    let texto = util.format(...args);
    if (!texto || !texto.trim()) return;

    let cortado = 0;
    if (texto.length > estado.config.maxCharsPorErro) {
        cortado = texto.length;
        texto = texto.slice(0, estado.config.maxCharsPorErro);
    }
    if (estado.config.ignorar.some(re => re.test(texto))) return;
    const m = mascarar(texto);
    texto = m.texto;

    // Onde o console.error foi chamado (arquivo e linha do bot).
    const registro = primeiroClassificado(lerFrames(new Error().stack));

    // Onde o erro nasceu, se algum argumento for um Error com pilha.
    const comPilha = args.find(a => a && typeof a === 'object' && typeof a.stack === 'string');
    let origem = null;
    let bibliotecaTopo = null;
    if (comPilha) {
        const frames = lerFrames(comPilha.stack);
        origem = primeiroClassificado(frames, 'projeto');
        const topo = primeiroClassificado(frames);
        if (topo && topo.tipo === 'biblioteca') bibliotecaTopo = topo.pacote;
    }

    const base = texto.slice(0, 300).replace(/\d+/g, '#').replace(/[0-9a-f]{8,}/gi, '#');
    const chave = `${base}|${registro ? `${registro.arquivo}:${registro.linha}` : ''}`;
    const agora = new Date();

    const existente = estado.fila.find(e => e.chave === chave);
    if (existente) {
        existente.vezes++;
        existente.ultima = agora;
        return;
    }
    if (estado.fila.length >= estado.config.maxPendentes) {
        estado.fila.shift();
        estado.descartadas++;
    }
    estado.fila.push({
        chave, texto, cortado,
        mascarado: m.mascarado,
        vezes: 1, primeira: agora, ultima: agora,
        registro, origem, bibliotecaTopo,
        temPilha: !!comPilha
    });
    agendar();
}

// ─── Montagem do TXT ────────────────────────────────────────────────────────
function descreverLocal(l) {
    if (!l) return null;
    const nome = l.tipo === 'projeto' ? l.relativo : `biblioteca "${l.pacote}"`;
    const fn = l.funcao ? ` (função ${l.funcao})` : '';
    return `${nome}, linha ${l.linha}${fn}`;
}

function explicar(e, numero) {
    const out = [];
    const cabecalho = e.vezes > 1
        ? `▶ ERRO ${numero} — repetiu ${e.vezes}x, de ${horaCurta(e.primeira)} até ${horaCurta(e.ultima)}`
        : `▶ ERRO ${numero} — às ${horaCurta(e.primeira)}`;
    out.push(cabecalho);

    const categoria = categoriaDoErro(e.texto);
    if (categoria) out.push(`  Parte do bot: ${categoria}`);

    const regra = identificar(e.texto);
    out.push(`  O que aconteceu: ${regra ? regra.resumo : 'Não reconheci este tipo de erro automaticamente — leia o texto exato na Parte 1.'}`);

    if (e.registro) {
        out.push(`  Onde (arquivo e linha): ${descreverLocal(e.registro)} — foi aqui que o bot registrou o erro.`);
        if (e.registro.tipo === 'projeto') {
            const trecho = trechoDeCodigo(e.registro.arquivo, e.registro.linha);
            if (trecho) out.push(`    Código dessa linha: ${trecho}`);
        }
    } else {
        out.push('  Onde (arquivo e linha): não consegui descobrir.');
    }

    if (e.origem && !(e.registro && e.registro.arquivo === e.origem.arquivo && e.registro.linha === e.origem.linha)) {
        out.push(`  Onde o erro nasceu: ${descreverLocal(e.origem)}`);
        const trecho = trechoDeCodigo(e.origem.arquivo, e.origem.linha);
        if (trecho) out.push(`    Código dessa linha: ${trecho}`);
    } else if (!e.temPilha) {
        out.push('  Onde o erro nasceu: indisponível — o bot registrou só a mensagem, sem a pilha de chamadas.');
    }
    if (e.bibliotecaTopo) out.push(`  Biblioteca envolvida: ${e.bibliotecaTopo}`);

    if (regra) {
        out.push(`  Possível causa: ${regra.causa}`);
        out.push(`  O que fazer: ${regra.acao}`);
    } else {
        out.push('  O que fazer: copie a Parte 1 deste erro e me mande que eu analiso.');
    }
    out.push('');
    return out;
}

function montarRelatorio(lote, descartadas) {
    const agora = new Date();
    const totalOcorrencias = lote.reduce((s, e) => s + e.vezes, 0);
    const limitePorErro = Math.max(1000, Math.floor(estado.config.maxCharsLog / lote.length));
    const linhas = [];

    linhas.push('LEICYBOT — RELATÓRIO DE ERRO');
    linhas.push(`Gerado em: ${dataHoraCompleta(agora)} (hora de Maputo)`);
    linhas.push(`Erros diferentes: ${lote.length} | Ocorrências no total: ${totalOcorrencias}`);
    if (descartadas > 0) linhas.push(`Atenção: ${descartadas} erro(s) mais antigo(s) foram descartados por excesso de erros.`);
    linhas.push('');
    linhas.push('════════════════════════════════════════════════');
    linhas.push('PARTE 1 — O QUE APARECEU NO LOG (texto exato)');
    linhas.push('════════════════════════════════════════════════');
    let algumCortado = false;
    lote.forEach((e, i) => {
        linhas.push('');
        linhas.push(e.vezes > 1
            ? `--- Erro ${i + 1} | ${horaCurta(e.primeira)} até ${horaCurta(e.ultima)} | repetiu ${e.vezes}x (texto da 1ª vez) ---`
            : `--- Erro ${i + 1} | ${horaCurta(e.primeira)} ---`);
        if (e.texto.length > limitePorErro) {
            algumCortado = true;
            linhas.push(e.texto.slice(0, limitePorErro));
            linhas.push(`[... texto cortado: tinha ${e.cortado || e.texto.length} caracteres ...]`);
        } else {
            linhas.push(e.texto);
            if (e.cortado) {
                algumCortado = true;
                linhas.push(`[... texto cortado: tinha ${e.cortado} caracteres ...]`);
            }
        }
    });
    linhas.push('');
    linhas.push('════════════════════════════════════════════════');
    linhas.push('PARTE 2 — EXPLICAÇÃO EM PORTUGUÊS');
    linhas.push('════════════════════════════════════════════════');
    linhas.push('(Leitura automática: é um palpite útil, não uma garantia. O que vale é o texto exato da Parte 1.)');
    linhas.push('');
    lote.forEach((e, i) => linhas.push(...explicar(e, i + 1)));

    if (lote.some(e => e.mascarado)) linhas.push('Nota: chaves/tokens foram mascarados com *** antes do envio.');
    if (algumCortado) linhas.push('Nota: textos muito longos foram cortados; o log completo continua no servidor.');

    // Legenda (aparece antes de abrir o arquivo).
    const primeiro = lote[0];
    const resumoPrimeiro = (identificar(primeiro.texto) || {}).resumo
        || primeiro.texto.split('\n')[0].slice(0, 140);
    const localLegenda = primeiro.origem || (primeiro.registro && primeiro.registro.tipo === 'projeto' ? primeiro.registro : null);
    const onde = localLegenda ? `\n📁 ${localLegenda.relativo}, linha ${localLegenda.linha}` : '';
    const legenda = `🚨 LeicyBot: ${lote.length === 1 ? '1 erro' : `${lote.length} erros`}`
        + `${totalOcorrencias > lote.length ? ` (${totalOcorrencias} ocorrências)` : ''}\n`
        + `${resumoPrimeiro}${onde}`;

    return { nome: nomeDoArquivo(agora), conteudo: linhas.join('\n'), legenda };
}

// ─── Envio ──────────────────────────────────────────────────────────────────
function agendar() {
    if (estado.timer || estado.enviando || !estado.sock || estado.fila.length === 0) return;
    const cfg = estado.config;
    const agora = Date.now();
    const recentes = estado.enviosRecentes.filter(t => agora - t < cfg.janelaEnxurradaMs);
    estado.enviosRecentes = recentes;
    const intervalo = recentes.length >= cfg.enxurradaEnvios ? cfg.intervaloEnxurradaMs : cfg.intervaloMinMs;
    const espera = Math.max(cfg.janelaMs, estado.ultimoEnvio + intervalo - agora);
    estado.timer = setTimeout(descarregar, espera);
    if (estado.timer.unref) estado.timer.unref();
}

async function descarregar() {
    estado.timer = null;
    if (!estado.sock || estado.enviando || estado.fila.length === 0) return;

    let jid = null;
    try { jid = estado.obterDonoJid && estado.obterDonoJid(); } catch (_) { /* segue */ }
    if (!jid) return;

    estado.enviando = true;
    const lote = estado.fila.splice(0, estado.config.maxErrosPorArquivo);
    const descartadas = estado.descartadas;
    estado.descartadas = 0;
    try {
        const { nome, conteudo, legenda } = montarRelatorio(lote, descartadas);
        await estado.sock.sendMessage(jid, {
            document: Buffer.from(conteudo, 'utf-8'),
            fileName: nome,
            mimetype: 'text/plain',
            caption: legenda
        });
        estado.falhas = 0;
        estado.enviosRecentes.push(Date.now());
    } catch (e) {
        estado.falhas++;
        // Console ORIGINAL de propósito: não pode virar outro relatório (loop).
        erroOriginal(`[RELATÓRIO DE ERROS] Não consegui enviar o TXT pro dono (falha ${estado.falhas}/${estado.config.maxFalhas}):`, e && e.message ? e.message : e);
        if (estado.falhas < estado.config.maxFalhas) {
            estado.fila.unshift(...lote);
            estado.descartadas += descartadas;
        } else {
            estado.falhas = 0; // desiste deste lote; o próximo recomeça a contagem
        }
    } finally {
        estado.ultimoEnvio = Date.now();
        estado.enviando = false;
        agendar();
    }
}

// ─── API pública ────────────────────────────────────────────────────────────
function iniciar({ obterDonoJid, ...opcoes } = {}) {
    if (estado.iniciado) return;
    estado.iniciado = true;
    estado.obterDonoJid = obterDonoJid;
    estado.config = { ...PADRAO, ...opcoes };

    erroOriginal = console.error.bind(console);
    console.error = (...args) => {
        erroOriginal(...args); // o log do servidor continua igual
        try { capturar(args); } catch (_) { /* nunca quebrar o bot por causa do relatório */ }
    };
}

// Chamar quando a conexão com o WhatsApp abrir (envia o que ficou guardado).
function conectar(sock) {
    estado.sock = sock;
    agendar();
}

// Chamar quando a conexão cair (os erros passam a ficar guardados na fila).
function desconectar() {
    estado.sock = null;
    if (estado.timer) {
        clearTimeout(estado.timer);
        estado.timer = null;
    }
}

module.exports = { iniciar, conectar, desconectar };
