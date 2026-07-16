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

module.exports = { resolverIdentidade };
