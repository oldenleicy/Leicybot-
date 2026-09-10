// modulos/jidUtils.js
// Ajuda a lidar com o formato @lid que o WhatsApp vem usando em alguns
// contatos/grupos no lugar do JID tradicional baseado em número de
// telefone (<numero>@s.whatsapp.net). Isso é uma mudança da própria
// plataforma WhatsApp (privacidade de número), não um bug do bot — mas
// quebra qualquer comparação feita contra um número fixo (ex: DONO_OFICIAL).
// Entrega 3 (v2) adiciona um cache @lid → número real (ver
// cacheAlternativoPorLid abaixo) que reduz esse problema também para
// quem é ALVO (mencionado ou respondido), não só para quem envia.

// ══════════════════════════════════════════════════════════════════
// Cache de identidade @lid → número real (Entrega 3).
// Populado sozinho, sem precisar mexer em mais nenhum arquivo: toda vez
// que resolverIdentidade recebe um @lid que já vem com o "JID
// alternativo" (participantAlt/participantPn) exposto pelo Baileys, a
// tradução é gravada aqui. Como resolverIdentidade roda no topo de todo
// módulo em toda mensagem processada (incluindo o comandos.js central),
// o cache vai se populando organicamente conforme cada @lid do grupo vai
// mandando mensagem. Isso é o que permite limparJid/obterAlvo resolverem
// um @lid mesmo quando ele é só o ALVO (mencionado ou respondido) — caso
// em que o Baileys não expõe o JID alternativo na mensagem atual (ver
// aviso em obterAlvo, abaixo).
// Só em memória, mesmo padrão do mensagensRecentesPorUsuario logo mais
// embaixo: reinicia com o bot, sem persistência no database.json.
// ══════════════════════════════════════════════════════════════════
const cacheAlternativoPorLid = new Map(); // @lid -> número real (@s.whatsapp.net)

function resolverIdentidade(msgKey) {
    let participante = msgKey.participant || msgKey.remoteJid;
    if (participante && participante.includes(':')) {
        participante = participante.split(':')[0] + '@s.whatsapp.net';
    }

    if (participante && participante.endsWith('@lid')) {
        // Baileys (a partir da 6.8.0) expõe o "JID alternativo" (o número
        // de telefone real) quando o participante vem mascarado como @lid.
        const alternativo = msgKey.participantAlt || msgKey.participantPn;
        if (alternativo) {
            let alt = alternativo;
            if (alt.includes(':')) alt = alt.split(':')[0] + '@s.whatsapp.net';
            cacheAlternativoPorLid.set(participante, alt);
            return alt;
        }
    }

    return participante;
}

function participanteBruto(msgKey) {
    let participante = msgKey.participant || msgKey.remoteJid;
    if (participante && participante.includes(':')) {
        participante = participante.split(':')[0] + '@s.whatsapp.net';
    }
    return participante;
}

// Normaliza um JID solto (tira o sufixo ":xx" de dispositivo, se houver),
// igual ao tratamento que já era feito manualmente em cada comando.
// Entrega 3: se o resultado ainda terminar em @lid, consulta o cache
// populado por resolverIdentidade antes de devolver o valor bruto.
function limparJid(jid) {
    if (!jid) return jid;
    if (jid.includes(':')) jid = jid.split(':')[0] + '@s.whatsapp.net';
    if (jid.endsWith('@lid')) {
        const alternativoEmCache = cacheAlternativoPorLid.get(jid);
        if (alternativoEmCache) return alternativoEmCache;
    }
    return jid;
}

// Pega o contextInfo de onde ele existir — extendedTextMessage é o caso
// comum (texto normal), mas imagem/vídeo com legenda também carregam
// contextInfo próprio (então @menção numa legenda também funciona).
function obterContextInfo(msg) {
    const m = msg.message;
    if (!m) return null;
    return m.extendedTextMessage?.contextInfo
        || m.imageMessage?.contextInfo
        || m.videoMessage?.contextInfo
        || null;
}

// obterAlvo(msg) — helper único de "marcar ou responder" (plano v2).
// Prioridade 1: @menção explícita na mensagem.
// Prioridade 2 (fallback): a mensagem é uma RESPOSTA a alguém — usa o
// autor da mensagem citada como alvo.
// Retorna o JID do alvo, ou null se não achou nenhum dos dois.
//
// ⚠️ Limitação conhecida (reduzida pela Entrega 3, não eliminada): se o
// autor da mensagem citada estiver mascarado como @lid, o Baileys atual
// não expõe um "JID alternativo" pra esse participante citado dentro da
// mensagem atual — só pra quem está mandando a mensagem atual
// (participantAlt/participantPn, ver resolverIdentidade acima). limparJid
// agora consulta o cacheAlternativoPorLid antes de devolver o valor
// bruto, então se esse @lid já mandou alguma mensagem no grupo desde que
// o bot está no ar, o cache resolve. Só continua caindo no @lid bruto se
// a pessoa citada nunca mandou mensagem (cache ainda vazio pra ela).
function obterAlvo(msg) {
    const ctx = obterContextInfo(msg);
    if (!ctx) return null;

    if (ctx.mentionedJid && ctx.mentionedJid[0]) {
        return limparJid(ctx.mentionedJid[0]);
    }

    if (ctx.participant) {
        return limparJid(ctx.participant);
    }

    return null;
}

// Detecta se a mensagem usou @menção explícita (em vez de responder/reply).
// Compartilhado entre módulos que precisam parsear args.slice(1) vs args
// dependendo de ter ou não o token "@numero" ocupando uma posição do array.
function temMencaoExplicita(mensagem) {
    const c = mensagem.message?.extendedTextMessage?.contextInfo;
    return !!(c?.mentionedJid && c.mentionedJid[0]);
}

// ══════════════════════════════════════════════════════════════════
// Rastreador leve de mensagens recentes por usuário+grupo (v2).
// Só em memória, NÃO é salvo no database.json — reinicia quando o bot
// reinicia. Usado pelo !limparmsg do adm.js: o Baileys não guarda
// histórico de mensagens por padrão, então só é possível apagar
// mensagens enviadas DEPOIS que o bot processou elas (não dá pra
// recuperar retroativamente o que foi enviado antes do bot estar no ar).
// ══════════════════════════════════════════════════════════════════
const mensagensRecentesPorUsuario = new Map();
const LIMITE_MENSAGENS_POR_USUARIO = 15;

function registrarMensagemRecente(from, sender, msgKey) {
    const chave = `${from}|${sender}`;
    if (!mensagensRecentesPorUsuario.has(chave)) mensagensRecentesPorUsuario.set(chave, []);
    const lista = mensagensRecentesPorUsuario.get(chave);
    lista.push(msgKey);
    if (lista.length > LIMITE_MENSAGENS_POR_USUARIO) lista.shift();
}

function obterMensagensRecentes(from, sender) {
    return mensagensRecentesPorUsuario.get(`${from}|${sender}`) || [];
}

function limparMensagensRecentes(from, sender) {
    mensagensRecentesPorUsuario.delete(`${from}|${sender}`);
}

module.exports = {
    resolverIdentidade, participanteBruto, obterAlvo,
    temMencaoExplicita,
    registrarMensagemRecente, obterMensagensRecentes, limparMensagensRecentes
};
