// modulos/outros.js

const outrosModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        let sender = msg.key.participant || msg.key.remoteJid;

        // Limpa ID de dispositivo do remetente
        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        // Garante que o usuário exista na database
        if (!db.usuarios) db.usuarios = {};
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = { 
                golds: 100, 
                banco: 0, 
                bio: "Nenhuma descrição definida ainda. Use !setbio",
                idade: "Não informada",
                estado_civil: "Solteiro(a)",
                casamentos_total: 0
            };
        }

        const u = db.usuarios[sender];

        switch (comando) {
            case 'menuoutros':
                const txtMenuOutros = `░▒▓█████████████████████████████████████▓▒░\n📊       📊  𝗖𝗘𝗡𝗧𝗥𝗔𝗟 𝗗𝗘 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟𝗜𝗭𝗔𝗖̧𝗔̃𝗢  📊       📊\n░▒▓█████████████████████████████████████▓▒░\n\nConfigure sua identidade interna no Leicybot:\n\n🔹 *!perfil* ➔ Exibe seu cartão de perfil global.\n🔹 *!setbio [texto]* ➔ Altera a biografia do seu perfil.\n🔹 *!setidade [número]* ➔ Define sua idade.\n🔹 *!marcarcasamento [@membro]* ➔ Propõe casamento a alguém.\n🔹 *!divorciar* ➔ Finaliza a união atual.\n\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: txtMenuOutros }, { quoted: msg });
                break;

            case 'perfil':
                const txtPerfil = `👤 *PERFIL DE USUÁRIO* 👤\n\n➔ *Marcador:* @${sender.split('@')[0]}\n➔ *Idade:* ${u.idade || "Não informada"}\n➔ *Estado Civil:* ${u.estado_civil || "Solteiro(a)"}\n➔ *Biografia:* ${u.bio || "Sem bio definida."}`;
                await sock.sendMessage(from, { text: txtPerfil, mentions: [sender] }, { quoted: msg });
                break;

            case 'setbio':
                const novaBio = args.join(" ").trim();
                if (!novaBio) return sock.sendMessage(from, { text: "❌ Digite a nova biografia! Ex: `!setbio Programador nas horas vagas`" }, { quoted: msg });
                u.bio = novaBio;
                salvarDB(db);
                await sock.sendMessage(from, { text: "✅ *Biografia atualizada com sucesso!*" }, { quoted: msg });
                break;

            case 'setidade':
                const novaIdade = args[0];
                if (!novaIdade || isNaN(novaIdade)) return sock.sendMessage(from, { text: "❌ Informe uma idade válida em números!" }, { quoted: msg });
                u.idade = `${novaIdade} anos`;
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ *Idade definida para ${novaIdade} anos!*` }, { quoted: msg });
                break;

            case 'marcarcasamento':
            case 'divorciar':
                await sock.sendMessage(from, { text: "⏳ Os comandos do sistema de casamento estão em fase de calibração e serão liberados em breve!" }, { quoted: msg });
                break;

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
