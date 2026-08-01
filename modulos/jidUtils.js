// modulos/jidUtils.js
// Ajuda a lidar com o formato @lid que o WhatsApp vem usando em alguns
// contatos/grupos no lugar do JID tradicional baseado em número de
// telefone (<numero>@s.whatsapp.net). Isso é uma mudança da própria
// plataforma WhatsApp (privacidade de número), não um bug do bot — mas
// quebra qualquer comparação feita contra um número fixo (ex: DONO_OFICIAL).

/**
 * Resolve a identidade real de um remetente a partir da chave da mensagem.
 * Prioriza o participantAlt/participantPn quando o JID está mascarado como @lid.
 * @param {object} msgKey - A chave da mensagem (msg.key)
 * @returns {string} JID normalizado
 */
function resolverIdentidade(msgKey) {
    if (!msgKey) return '';

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

    return participante || '';
}

/**
 * Retorna o JID bruto do participante, sem fallback para alternativo.
 * @param {object} msgKey - A chave da mensagem (msg.key)
 * @returns {string} JID bruto
 */
function participanteBruto(msgKey) {
    if (!msgKey) return '';

    let participante = msgKey.participant || msgKey.remoteJid;

    if (participante && participante.includes(':')) {
        participante = participante.split(':')[0] + '@s.whatsapp.net';
    }

    return participante || '';
}

/**
 * Obtém o alvo de um comando a partir da mensagem.
 * Primeiro verifica se há menção (@), depois se a mensagem é uma resposta
 * a outro usuário, e retorna o JID do alvo normalizado.
 * @param {object} msg - O objeto completo da mensagem
 * @returns {string|null} JID do alvo ou null se não encontrado
 */
function obterAlvo(msg) {
    if (!msg || !msg.message) return null;

    // 1. Tenta obter de menção direta (@)
    const mencionados = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mencionados && mencionados.length > 0) {
        let alvo = mencionados[0];
        if (alvo && alvo.includes(':')) {
            alvo = alvo.split(':')[0] + '@s.whatsapp.net';
        }
        return alvo;
    }

    // 2. Tenta obter da mensagem respondida (quoted message)
    const quotedMsg = msg.message.extendedTextMessage?.contextInfo;
    if (quotedMsg && quotedMsg.participant) {
        let alvo = quotedMsg.participant;
        if (alvo && alvo.includes(':')) {
            alvo = alvo.split(':')[0] + '@s.whatsapp.net';
        }
        return alvo;
    }

    // 3. Se a mensagem respondida não tem participant, tenta extrair do remoteJid da mensagem citada
    // (para mensagens no privado ou casos específicos)
    if (quotedMsg && quotedMsg.remoteJid && !quotedMsg.remoteJid.endsWith('@g.us')) {
        let alvo = quotedMsg.remoteJid;
        if (alvo && alvo.includes(':')) {
            alvo = alvo.split(':')[0] + '@s.whatsapp.net';
        }
        return alvo;
    }

    return null;
}

module.exports = { resolverIdentidade, participanteBruto, obterAlvo };