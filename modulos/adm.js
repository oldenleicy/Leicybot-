// modulos/adm.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, participanteBruto, obterAlvo } = require('./jidUtils');

module.exports = async (sock, msg, comando, args, db, salvarDB, possuiPermissaoComando = false) => {
    const from = msg.key.remoteJid;
    let sender = resolverIdentidade(msg.key);
    const senderBruto = participanteBruto(msg.key);
    const isGroup = from.endsWith('@g.us');

    if (!isGroup) {
        return sock.sendMessage(from, { text: "❌ Este comando só pode ser executado dentro de grupos! 🌊" }, { quoted: msg });
    }

    // Metadados do grupo para validar administradores
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const botIdLid = sock.user.lid ? (sock.user.lid.includes('@') ? sock.user.lid.split(':')[0] : sock.user.lid.split(':')[0] + '@lid') : null;

    const adms = [];
    participants.forEach(p => {
        if (p.admin !== null) {
            adms.push(p.id);
            const alt = p.phoneNumber || p.pn || p.jid;
            if (alt && alt !== p.id) adms.push(alt);
        }
    });

    const isAdmin = adms.includes(sender) || adms.includes(senderBruto);
    const botIsAdmin = adms.includes(botId) || (botIdLid && adms.includes(botIdLid));

    // Inicializar configurações do grupo
    if (!db.grupos) db.grupos = {};
    if (!db.grupos[from]) {
        db.grupos[from] = {
            boasvindas: false,
            antilink: false,
            antilink2: false,
            fakes: false,
            antimidia: false,
            regras: "Nenhuma regra definida ainda.",
            bv_ativo: "bv1",
            bv1: "Seja muito bem-vindo(a) ao grupo! 🌊",
            bv2: "Opa! Um novo integrante entrou no recinto! Respeite as regras e divirta-se. 💧",
            bv3: "Saudações! Nova presença detectada sob o comando de Olden! 🔥",
            comandos_bloqueados: [],
            palavras_proibidas: [],
            slowmode_segundos: 0,
            antiflood: null,
            fechado_ate: null
        };
    }
    let gConfig = db.grupos[from];

    // Validação de permissão: comandos restritos a admins ou permissão especial
    const exigeAdmin = !['menuadm', 'regras', 'atividade', 'online', 'config', 'bv1', 'bv2', 'bv3'].includes(comando);
    if (exigeAdmin && !isAdmin && !possuiPermissaoComando) {
        return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Este comando é exclusivo para administradores do grupo ou membros autorizados! 🛡️" }, { quoted: msg });
    }

    switch (comando) {
        case 'menuadm': {
            const menuAdmTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🛡️  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗢𝗗𝗘𝗥𝗔𝗖𝗔𝗢  🛡️      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de contenção e segurança ativa.\n\n ➔ *!menuadm* ➔ Exibe este menu.\n ➔ *!adv [@user]* ➔ Adiciona 1 advertência (3 em 2 semanas = Ban Automático).\n ➔ *!ban / !kick [@user]* ➔ Remove um infrator.\n ➔ *!mutar [@user] [minutos]* ➔ Silencia membro temporariamente.\n ➔ *!promover [@user]* ➔ Concede privilégios de ADM.\n ➔ *!rebaixar [@user]* ➔ Retira privilégios de ADM.\n ➔ *!antilink [on/off]* ➔ Apaga links comuns.\n ➔ *!antilink2 [on/off]* ➔ Deleta link e bane o membro.\n ➔ *!antimidia [on/off]* ➔ Bloqueia envio de mídias por não-admins.\n ➔ *!antipalavra [add/rem/list] [palavra]* ➔ Lista negra de palavras.\n ➔ *!antiflood [max] [segundos]* ➔ Limita mensagens em intervalo (punição: mute).\n ➔ *!modolento [segundos]* ➔ Slow mode (uma mensagem a cada X segundos).\n ➔ *!fakes [on/off]* ➔ Expulsa números gringos.\n ➔ *!bloquearcmd [comando]* ➔ Alterna bloqueio de comando no grupo.\n ➔ *!fechar [segundos]* ➔ Fecha o grupo temporariamente.\n ➔ *!grupo [abrir/fechar]* ➔ Altera permissões do chat (permanente).\n ➔ *!limparmsg [@user] [qtd]* ➔ Apaga últimas mensagens de um membro.\n ➔ *!inativos [dias] [remover]* ➔ Lista/remove membros inativos.\n ➔ *!limpar* ➔ Limpa o histórico de exibição do chat.\n ➔ *!marcar* ➔ Menciona todos os integrantes.\n ➔ *!adms* ➔ Chama a equipe de ADMs.\n ➔ *!setregras [texto]* ➔ Define o estatuto interno.\n ➔ *!regras* ➔ Exibe as normas salvas.\n ➔ *!boasvindas [on/off]* ➔ Liga/Desliga saudações.\n ➔ *!setwelcome1 / 2 / 3 [texto]* ➔ Modifica os slots de BV.\n ➔ *!bv1 / !bv2 / !bv3* ➔ Escolhe modelo ativo.\n ➔ *!atividade* ➔ Ranking de mensagens.\n ➔ *!online* ➔ Membros ativos em 24h.\n ➔ *!config* ➔ Resumo das configurações do grupo.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuAdmTxt }, { quoted: msg });
            break;
        }

        case 'adv': {
            const alvoAdv = obterAlvo(msg) || msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoAdv) return sock.sendMessage(from, { text: "❌ Marque o membro para advertir!" }, { quoted: msg });
            if (alvoAdv === botId) return sock.sendMessage(from, { text: "❌ Você não pode advertir o bot." }, { quoted: msg });

            if (!db.usuarios[alvoAdv]) db.usuarios[alvoAdv] = criarUsuarioPadrao();
            if (!db.usuarios[alvoAdv].advertencias) db.usuarios[alvoAdv].advertencias = [];

            const agora = Date.now();
            db.usuarios[alvoAdv].advertencias.push(agora);
            const duasSemanasMs = 14 * 24 * 60 * 60 * 1000;
            db.usuarios[alvoAdv].advertencias = db.usuarios[alvoAdv].advertencias.filter(t => agora - t <= duasSemanasMs);
            const total = db.usuarios[alvoAdv].advertencias.length;
            salvarDB(db);

            if (total >= 3) {
                if (!botIsAdmin) {
                    return sock.sendMessage(from, { text: `🚨 Limite de ${total} advertências atingido, mas não sou admin para banir.` }, { quoted: msg });
                }
                await sock.groupParticipantsUpdate(from, [alvoAdv], "remove");
                db.usuarios[alvoAdv].advertencias = [];
                salvarDB(db);
                await sock.sendMessage(from, { text: `🔨 *BAN AUTOMÁTICO:* @${alvoAdv.split('@')[0]} acumulou 3 advertências em 2 semanas e foi banido!`, mentions: [alvoAdv] });
            } else {
                await sock.sendMessage(from, { text: `⚠️ *ADVERTÊNCIA:* @${alvoAdv.split('@')[0]} [${total}/3] advertências ativas.`, mentions: [alvoAdv] }, { quoted: msg });
            }
            break;
        }

        case 'ban':
        case 'kick': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para remover membros!" }, { quoted: msg });
            const alvoBan = obterAlvo(msg) || msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoBan) return sock.sendMessage(from, { text: "❌ Marque o membro a ser removido!" }, { quoted: msg });
            if (alvoBan === botId) return sock.sendMessage(from, { text: "🤔 Tentar me banir usando meus próprios comandos? Genial." }, { quoted: msg });

            await sock.groupParticipantsUpdate(from, [alvoBan], "remove");
            await sock.sendMessage(from, { text: `🔨 *JUSTIÇA APLICADA:* @${alvoBan.split('@')[0]} foi removido do grupo!`, mentions: [alvoBan] }, { quoted: msg });
            break;
        }

        case 'mutar': {
            const alvoMute = obterAlvo(msg);
            if (!alvoMute) return sock.sendMessage(from, { text: "❌ Marque ou responda ao membro que será silenciado." }, { quoted: msg });
            if (alvoMute === botId) return sock.sendMessage(from, { text: "❌ Não posso me silenciar." }, { quoted: msg });

            const minutos = parseInt(args[1] || args[0]) || 10; // padrão 10 min
            if (minutos <= 0 || minutos > 1440) return sock.sendMessage(from, { text: "❌ Duração inválida (1 a 1440 minutos)." }, { quoted: msg });

            if (!db.usuarios[alvoMute]) db.usuarios[alvoMute] = criarUsuarioPadrao();
            db.usuarios[alvoMute].mutado_ate = Date.now() + minutos * 60 * 1000;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🤫 @${alvoMute.split('@')[0]} foi silenciado por ${minutos} minutos.`, mentions: [alvoMute] }, { quoted: msg });
            break;
        }

        case 'promover': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para promover." }, { quoted: msg });
            const alvoPromover = obterAlvo(msg) || msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoPromover) return sock.sendMessage(from, { text: "❌ Marque o novo administrador!" }, { quoted: msg });
            await sock.groupParticipantsUpdate(from, [alvoPromover], "promote");
            await sock.sendMessage(from, { text: `✨ Novo ADM: @${alvoPromover.split('@')[0]}!`, mentions: [alvoPromover] }, { quoted: msg });
            break;
        }

        case 'rebaixar': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para rebaixar." }, { quoted: msg });
            const alvoRebaixar = obterAlvo(msg) || msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoRebaixar) return sock.sendMessage(from, { text: "❌ Marque o administrador a ser rebaixado!" }, { quoted: msg });
            await sock.groupParticipantsUpdate(from, [alvoRebaixar], "demote");
            await sock.sendMessage(from, { text: `📉 @${alvoRebaixar.split('@')[0]} perdeu privilégios administrativos.`, mentions: [alvoRebaixar] }, { quoted: msg });
            break;
        }

        case 'antilink': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink on* ou *!antilink off*" }, { quoted: msg });
            gConfig.antilink = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🛡️ Anti-Link: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'antilink2': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink2 on* ou *!antilink2 off* (Modo Hard-Ban)" }, { quoted: msg });
            gConfig.antilink2 = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚨 Anti-Link Hard: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'antimidia': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antimidia on* ou *!antimidia off*" }, { quoted: msg });
            gConfig.antimidia = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🎵 Anti-Mídia: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'antipalavra': {
            const acao = args[0]?.toLowerCase();
            if (!acao || !['add', 'rem', 'list'].includes(acao)) {
                return sock.sendMessage(from, { text: "❌ Use: `!antipalavra add/rem/list [palavra]`" }, { quoted: msg });
            }
            if (!gConfig.palavras_proibidas) gConfig.palavras_proibidas = [];
            const palavra = args.slice(1).join(" ").trim().toLowerCase();

            if (acao === 'list') {
                const lista = gConfig.palavras_proibidas.length > 0 ? gConfig.palavras_proibidas.join(', ') : '(vazia)';
                return sock.sendMessage(from, { text: `📋 Palavras proibidas: ${lista}` }, { quoted: msg });
            }
            if (!palavra) return sock.sendMessage(from, { text: "❌ Digite a palavra." }, { quoted: msg });

            if (acao === 'add') {
                if (gConfig.palavras_proibidas.includes(palavra)) return sock.sendMessage(from, { text: "⚠️ Palavra já está na lista." }, { quoted: msg });
                gConfig.palavras_proibidas.push(palavra);
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ Palavra "${palavra}" adicionada à lista negra.` }, { quoted: msg });
            } else if (acao === 'rem') {
                const index = gConfig.palavras_proibidas.indexOf(palavra);
                if (index === -1) return sock.sendMessage(from, { text: "❌ Palavra não encontrada." }, { quoted: msg });
                gConfig.palavras_proibidas.splice(index, 1);
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ Palavra "${palavra}" removida.` }, { quoted: msg });
            }
            break;
        }

        case 'antiflood': {
            if (args.length === 0) {
                if (gConfig.antiflood) {
                    return sock.sendMessage(from, { text: `🌊 Antiflood ativo: ${gConfig.antiflood.max} msgs / ${gConfig.antiflood.intervalo}s.` }, { quoted: msg });
                }
                return sock.sendMessage(from, { text: "🌊 Antiflood desativado. Use: `!antiflood [max] [segundos]`" }, { quoted: msg });
            }
            const max = parseInt(args[0]);
            const intervalo = parseInt(args[1]);
            if (isNaN(max) || isNaN(intervalo) || max <= 0 || intervalo <= 0) {
                return sock.sendMessage(from, { text: "❌ Use: `!antiflood [max mensagens] [segundos]`" }, { quoted: msg });
            }
            gConfig.antiflood = { max, intervalo, acao: 'mute' };
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚨 Antiflood configurado: ${max} mensagens em ${intervalo}s (punição: mute 5 min).` }, { quoted: msg });
            break;
        }

        case 'modolento': {
            const segundos = parseInt(args[0]);
            if (isNaN(segundos) || segundos < 0) {
                return sock.sendMessage(from, { text: "❌ Use: `!modolento [segundos]` (0 para desativar)." }, { quoted: msg });
            }
            gConfig.slowmode_segundos = segundos;
            salvarDB(db);
            if (segundos === 0) {
                await sock.sendMessage(from, { text: "🐢 Modo lento desativado." }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: `🐢 Modo lento ativado: 1 mensagem a cada ${segundos}s por membro.` }, { quoted: msg });
            }
            break;
        }

        case 'fakes': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!fakes on* ou *!fakes off*" }, { quoted: msg });
            gConfig.fakes = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🌐 Bloqueio de DDI estrangeiro: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'bloquearcmd': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Informe o comando a alternar bloqueio. Ex: `!bloquearcmd roleta`" }, { quoted: msg });
            const cmdBloq = args[0].toLowerCase().replace('!', '');
            if (!gConfig.comandos_bloqueados) gConfig.comandos_bloqueados = [];
            const pos = gConfig.comandos_bloqueados.indexOf(cmdBloq);
            if (pos === -1) {
                gConfig.comandos_bloqueados.push(cmdBloq);
                salvarDB(db);
                await sock.sendMessage(from, { text: `🚫 Comando !${cmdBloq} bloqueado neste grupo.` }, { quoted: msg });
            } else {
                gConfig.comandos_bloqueados.splice(pos, 1);
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ Comando !${cmdBloq} desbloqueado.` }, { quoted: msg });
            }
            break;
        }

        case 'fechar': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso de privilégios de ADM para fechar o grupo!" }, { quoted: msg });
            const segundos = parseInt(args[0]);
            if (isNaN(segundos) || segundos <= 0) return sock.sendMessage(from, { text: "❌ Use: `!fechar [segundos]`" }, { quoted: msg });
            gConfig.fechado_ate = Date.now() + segundos * 1000;
            await sock.groupSettingUpdate(from, 'announcement');
            salvarDB(db);
            await sock.sendMessage(from, { text: `🔒 Grupo fechado por ${segundos} segundos. Apenas admins podem falar.` }, { quoted: msg });
            break;
        }

        case 'grupo': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso de privilégios de ADM para alterar o status do grupo!" }, { quoted: msg });
            if (args[0] === 'fechar') {
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: "🔒 *CHAT FECHADO:* Apenas administradores podem enviar mensagens!" }, { quoted: msg });
            } else if (args[0] === 'abrir') {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sock.sendMessage(from, { text: "🔓 *CHAT ABERTO:* Todos podem interagir livremente! 🌊" }, { quoted: msg });
            } else {
                return sock.sendMessage(from, { text: "❌ Use: *!grupo abrir* ou *!grupo fechar*" }, { quoted: msg });
            }
            break;
        }

        case 'limparmsg': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Admin para limpar mensagens." }, { quoted: msg });
            const alvoLimpar = obterAlvo(msg) || msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoLimpar) return sock.sendMessage(from, { text: "❌ Marque ou responda ao membro cujas mensagens serão apagadas." }, { quoted: msg });

            let qtd = parseInt(args[1] || args[0]) || 1;
            if (qtd > 10) qtd = 10; // limite seguro

            try {
                const mensagens = await sock.loadMessages(from, 50); // carrega últimas 50
                const msgsAlvo = mensagens.filter(m => m.key.participant === alvoLimpar || m.key.remoteJid === alvoLimpar).slice(0, qtd);
                for (const m of msgsAlvo) {
                    await sock.sendMessage(from, { delete: m.key }).catch(() => {});
                }
                await sock.sendMessage(from, { text: `🧹 ${msgsAlvo.length} mensagens de @${alvoLimpar.split('@')[0]} apagadas.`, mentions: [alvoLimpar] }, { quoted: msg });
            } catch (e) {
                console.error('[limparmsg] Erro:', e);
                await sock.sendMessage(from, { text: "❌ Não foi possível carregar as mensagens. Tente novamente." }, { quoted: msg });
            }
            break;
        }

        case 'inativos': {
            const dias = parseInt(args[0]) || 30;
            const remover = args.includes('remover');
            const limite = Date.now() - dias * 24 * 60 * 60 * 1000;

            const inativos = participants.filter(p => {
                const id = p.id;
                const user = db.usuarios[id];
                return !user || !user.ultima_interacao || user.ultima_interacao < limite;
            });

            if (inativos.length === 0) {
                return sock.sendMessage(from, { text: `✅ Nenhum membro inativo há ${dias} dias.` }, { quoted: msg });
            }

            let listaInativos = `💤 *MEMBROS INATIVOS (${dias} dias):*\n`;
            inativos.forEach(p => {
                listaInativos += `➔ @${p.id.split('@')[0]}\n`;
            });

            if (remover && botIsAdmin) {
                for (const p of inativos) {
                    await sock.groupParticipantsUpdate(from, [p.id], "remove").catch(() => {});
                }
                listaInativos += `\n🚨 ${inativos.length} membros removidos.`;
                await sock.sendMessage(from, { text: listaInativos, mentions: inativos.map(p => p.id) }, { quoted: msg });
            } else {
                if (remover) listaInativos += "\n❌ Não sou admin para remover.";
                await sock.sendMessage(from, { text: listaInativos, mentions: inativos.map(p => p.id) }, { quoted: msg });
      