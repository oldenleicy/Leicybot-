// modulos/outros.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, obterAlvo } = require('./jidUtils');

const outrosModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        // v2: usa o resolvedor de identidade central (antes fazia a limpeza de
        // ":dispositivo" na mão e não tratava @lid — mesmo problema de
        // fragmentação de conta corrigido nos outros módulos).
        const sender = resolverIdentidade(msg.key);

        if (!db.usuarios) db.usuarios = {};
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = criarUsuarioPadrao();
        }

        const u = db.usuarios[sender];

        switch (comando) {
            case 'menuoutros': {
                const txtMenuOutros = `░▒▓█████████████████████████████████████▓▒░\n📊       📊  𝗖𝗘𝗡𝗧𝗥𝗔𝗟 𝗗𝗘 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟𝗜𝗭𝗔𝗖̧𝗔̃𝗢  📊       📊\n░▒▓█████████████████████████████████████▓▒░\n\nConfigure sua identidade interna no Leicybot:\n\n🔹 *!perfil* ➔ Exibe seu cartão de perfil global (responda alguém pra ver o dela).\n🔹 *!setbio [texto]* ➔ Altera a biografia do seu perfil.\n🔹 *!setidade [número]* ➔ Define sua idade.\n\n💍 *Casamento virtual mora no !menujogos* (comandos !casar, !aceitar, !divorciar).\n\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: txtMenuOutros }, { quoted: msg });
                break;
            }

            case 'perfil': {
                // v2: responder à mensagem de alguém mostra o perfil dessa pessoa,
                // igual o !gold — mesma mecânica de marcar/responder (obterAlvo).
                const alvoPerfilMarcado = obterAlvo(msg);
                let alvoPerfilId = sender;
                if (alvoPerfilMarcado && alvoPerfilMarcado !== sender) {
                    if (!db.usuarios[alvoPerfilMarcado]) db.usuarios[alvoPerfilMarcado] = criarUsuarioPadrao();
                    alvoPerfilId = alvoPerfilMarcado;
                }
                const uPerfilAlvo = db.usuarios[alvoPerfilId];

                const txtPerfil = `👤 *PERFIL DE USUÁRIO* 👤\n\n➔ *Marcador:* @${alvoPerfilId.split('@')[0]}\n➔ *Idade:* ${uPerfilAlvo.idade || "Não informada"}\n➔ *Estado Civil:* ${uPerfilAlvo.estado_civil || "Solteiro(a)"}\n➔ *Biografia:* ${uPerfilAlvo.bio || "Sem bio definida."}`;
                await sock.sendMessage(from, { text: txtPerfil, mentions: [alvoPerfilId] }, { quoted: msg });
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
