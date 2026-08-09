// modulos/jidUtils.js
// Ajuda a lidar com o formato @lid que o WhatsApp vem usando em alguns
// contatos/grupos no lugar do JID tradicional baseado em número de
// telefone (<numero>@s.whatsapp.net). Isso é uma mudança da própria
// plataforma WhatsApp (privacidade de número), não um bug do bot — mas
// quebra qualquer comparação feita contra um número fixo (ex: DONO_OFICIAL).

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
function limparJid(jid) {
    if (!jid) return jid;
    if (jid.includes(':')) jid = jid.split(':')[0] + '@s.whatsapp.net';
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
// ⚠️ Limitação conhecida: se o autor da mensagem citada estiver mascarado
// como @lid, não existe (no Baileys atual) um "JID alternativo" exposto
// pra esse participante citado — só existe pra quem está mandando a
// mensagem atual (participantAlt/participantPn, ver resolverIdentidade
// acima). Ou seja, responder a alguém em @lid pode retornar o @lid bruto
// em vez do número de telefone real.
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
