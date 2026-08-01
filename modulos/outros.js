// modulos/outros.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { obterAlvo } = require('./jidUtils');

const outrosModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        let sender = msg.key.participant || msg.key.remoteJid;

        // Normaliza JID multi-dispositivo
        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        // Garante que o usuário exista
        if (!db.usuarios) db.usuarios = {};
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = criarUsuarioPadrao();
        }

        const u = db.usuarios[sender];

        switch (comando) {
            case 'menuoutros': {
                const txtMenuOutros = `░▒▓█████████████████████████████████████▓▒░\n📊       📊  𝗖𝗘𝗡𝗧𝗥𝗔𝗟 𝗗𝗘 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟𝗜𝗭𝗔𝗖̧𝗔̃𝗢  📊       📊\n░▒▓█████████████████████████████████████▓▒░\n\nConfigure sua identidade interna no Leicybot:\n\n🔹 *!perfil* ➔ Exibe seu cartão de perfil global (ou responda a alguém para ver o dessa pessoa).\n🔹 *!setbio [texto]* ➔ Altera a biografia do seu perfil.\n🔹 *!setidade [número]* ➔ Define sua idade.\n\n💍 *Casamento virtual mora no !menujogos* (comandos !casar, !aceitar, !divorciar).\n\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: txtMenuOutros }, { quoted: msg });
                break;
            }

            case 'perfil': {
                // Mecânica de resposta: se houver alvo (menção/resposta), mostra o perfil dele
                const alvo = obterAlvo(msg) || sender;
                if (!db.usuarios[alvo]) {
                    db.usuarios[alvo] = criarUsuarioPadrao();
                }
                const uAlvo = db.usuarios[alvo];

                // Formata os títulos para exibição
                let titulosTxt = '';
                if (uAlvo.titulo_slot1) {
                    titulosTxt += `🎖️ Título Comprado: ${uAlvo.titulo_slot1}\n`;
                }
                if (uAlvo.titulo_slot2) {
                    titulosTxt += `🌟 Título Especial: ${uAlvo.titulo_slot2}\n`;
                }
                if (!titulosTxt) titulosTxt = 'Nenhum título equipado.\n';

                const estadoCivil = uAlvo.conjugue ? `Casado(a) com @${uAlvo.conjugue.split('@')[0]}` : 'Solteiro(a)';

                const txtPerfil = `👤 *PERFIL DE USUÁRIO* 👤\n\n➔ *Marcador:* @${alvo.split('@')[0]}\n➔ *Idade:* ${uAlvo.idade || "Não informada"}\n➔ *Estado Civil:* ${estadoCivil}\n➔ *Biografia:* ${uAlvo.bio || "Sem bio definida."}\n${titulosTxt}`;

                const mentions = [alvo];
                if (uAlvo.conjugue) mentions.push(uAlvo.conjugue);

                await sock.sendMessage(from, { text: txtPerfil, mentions }, { quoted: msg });
                break;
            }

            case 'setbio': {
                const novaBio = args.join(" ").trim();
                if (!novaBio) return sock.sendMessage(from, { text: "❌ Digite a nova biografia! Ex: `!setbio Programador nas horas vagas`" }, { quoted: msg });
                u.bio = novaBio;
                salvarDB(db);
                await sock.sendMessage(from, { text: "✅ *Biografia atualizada com sucesso!*" }, { quoted: msg });
                break;
            }

            case 'setidade': {
                const novaIdade = args[0];
                if (!novaIdade || isNaN(novaIdade) || Number(novaIdade) <= 0 || Number(novaIdade) > 120) {
                    return sock.sendMessage(from, { text: "❌ Informe uma idade válida em números (entre 1 e 120)!" }, { quoted: msg });
                }
                u.idade = `${novaIdade} anos`;
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ *Idade definida para ${novaIdade} anos!*` }, { quoted: msg });
                break;
            }

            default:
                break;
        }
    } catch (error) {
        console.error("Erro interno detectado no outros.js: ", error);
    }
};

module.exports = outrosModulo;
module.exports.outrosModulo = outrosModulo;
module.exports.default = outrosModulo;