module.exports = async (sock, msg, comando, args, db, salvarDB) => {
    const from = msg.key.remoteJid;
    let sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    if (!isGroup) {
        return sock.sendMessage(from, { text: "❌ Este comando só pode ser executado dentro de grupos! 🌊" }, { quoted: msg });
    }

    // Limpeza de ID de dispositivo no sender para garantir validação de ADM
    if (sender && sender.includes(':')) {
        sender = sender.split(':')[0] + '@s.whatsapp.net';
    }

    // Obter metadados do grupo para validar administradores
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    const adms = participants.filter(p => p.admin !== null).map(p => p.id);
    const isAdmin = adms.includes(sender);
    const botIsAdmin = adms.includes(botId);

    // Permissões exclusivas de Administradores do Grupo
    if (!isAdmin) {
        return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Este comando é exclusivo para os Administradores do grupo! 🛡️" }, { quoted: msg });
    }

    // Inicializar configurações do grupo no DB caso não existam
    if (!db.grupos) db.grupos = {};
    if (!db.grupos[from]) {
        db.grupos[from] = {
            boasvindas: false, // Nova chave adicionada para o comando funcionar
            antilink: false,
            antilink2: false,
            fakes: false,
            regras: "Nenhuma regra definida ainda pelo comando !setregras.",
            bv_ativo: "bv1",
            bv1: "Seja muito bem-vindo(a) ao grupo! 🌊",
            bv2: "Opa! Um novo integrante entrou no recinto! Respeite as regras e divirta-se. 💧",
            bv3: "Saudações! Nova presença detectada sob o comando de Olden! 🔥"
        };
    }
    let gConfig = db.grupos[from];

    switch (comando) {
        case 'menuadm':
            const menuAdmTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🛡️  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗢𝗗𝗘𝗥𝗔𝗖𝗔𝗢  🛡️      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de contenção e segurança activa.\n\n ➔ *!ban / !kick [@user]* - Remove um infrator.\n ➔ *!promover [@user]* - Concede privilégios de ADM.\n ➔ *!rebaixar [@user]* - Retira privilégios de ADM.\n ➔ *!antilink [on/off]* - Apaga links comuns enviadas.\n ➔ *!antilink2 [on/off]* - Deleta link e bane o membro.\n ➔ *!fakes [on/off]* - Expulsa números gringos (+ de 1 DDI).\n ➔ *!grupo [abrir/fechar]* - Altera permissões do chat.\n ➔ *!limpar* - Limpa o histórico de exibição do chat.\n ➔ *!marcar* - Menciona todos os integrantes de uma vez.\n ➔ *!adms* - Chama a equipe técnica de ADMs.\n ➔ *!setregras [texto]* - Define o estatuto interno.\n ➔ *!regras* - Exibe as normas atuais salvas.\n ➔ *!boasvindas [on/off]* - Liga/Desliga o sistema de saudações.\n ➔ *!setwelcome1 / 2 / 3 [texto]* - Modifica os slots de BV.\n ➔ *!bv1 / !bv2 / !bv3* - Escolhe qual modelo fica ativo.\n ➔ *!atividade* - Exibe ranking de mensagens enviadas.\n ➔ *!online* - Lista membros que interagiram recentemente.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuAdmTxt }, { quoted: msg });
            break;

        // Comando Corrigido: !boasvindas agora ativo no switch
        case 'boasvindas':
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                return sock.sendMessage(from, { text: "🌊 Use: *!boasvindas on* ou *!boasvindas off*" }, { quoted: msg });
            }
            gConfig.boasvindas = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `👋 Sistema de *Boas-Vindas* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'ban':
        case 'kick':
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para remover membros! 💧" }, { quoted: msg });
            const alvoBan = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoBan) return sock.sendMessage(from, { text: "❌ Marque o membro que deseja banir!" }, { quoted: msg });
            if (alvoBan === botId) return sock.sendMessage(from, { text: "🤔 Tentar me banir usando meus próprios comandos? Genial." }, { quoted: msg });
            
            await sock.groupParticipantsUpdate(from, [alvoBan], "remove");
            await sock.sendMessage(from, { text: `🔨 *JUSTIÇA APLICADA:* @${alvoBan.split('@')[0]} foi devidamente removido do grupo por má conduta!`, mentions: [alvoBan] }, { quoted: msg });
            break;

        case 'promover':
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para alterar cargos!" }, { quoted: msg });
            const alvoPromover = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoPromover) return sock.sendMessage(from, { text: "❌ Marque o membro para torná-lo ADM!" }, { quoted: msg });
            
            await sock.groupParticipantsUpdate(from, [alvoPromover], "promote");
            await sock.sendMessage(from, { text: `✨ Novo Administrador alocado: @${alvoPromover.split('@')[0]}!`, mentions: [alvoPromover] }, { quoted: msg });
            break;

        case 'rebaixar':
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para alterar cargos!" }, { quoted: msg });
            const alvoRebaixar = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoRebaixar) return sock.sendMessage(from, { text: "❌ Marque o administrador que deseja rebaixar!" }, { quoted: msg });
            
            await sock.groupParticipantsUpdate(from, [alvoRebaixar], "demote");
            await sock.sendMessage(from, { text: `📉 O membro @${alvoRebaixar.split('@')[0]} perdeu suas credenciais administrativas!`, mentions: [alvoRebaixar] }, { quoted: msg });
            break;

        case 'antilink':
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink on* ou *!antilink off*" }, { quoted: msg });
            gConfig.antilink = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🛡️ Sistema *Anti-Links Comuns* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'antilink2':
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink2 on* ou *!antilink2 off* (Modo Hard-Ban)" }, { quoted: msg });
            gConfig.antilink2 = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚨 Sistema *Anti-Links Modo Hard (Ban)* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'fakes':
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!fakes on* ou *!fakes off*" }, { quoted: msg });
            gConfig.fakes = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🌐 Bloqueio automático de DDI estrangeiro definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'grupo':
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso de privilégios de ADM para alterar o status do grupo!" }, { quoted: msg });
            if (args[0] === 'fechar') {
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: "🔒 *CHAT FECHADO:* Apenas administradores podem enviar mensagens a partir de agora!" }, { quoted: msg });
            } else if (args[0] === 'abrir') {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sock.sendMessage(from, { text: "🔓 *CHAT ABERTO:* Todos os integrantes já podem interagir livremente! 🌊" }, { quoted: msg });
            } else {
                return sock.sendMessage(from, { text: "❌ Use: *!grupo abrir* ou *!grupo fechar*" }, { quoted: msg });
            }
            break;

        case 'limpar':
            let blocosVazios = " \n".repeat(250) + "🧹 *Histórico do chat limpo pela moderação!* 🌊";
            await sock.sendMessage(from, { text: blocosVazios });
            break;

        case 'marcar':
            let todosMembros = participants.map(p => p.id);
            let mencTxt = `📣 *𝗠𝗔𝗥𝗖𝗔𝗖𝗔𝗢 𝗚𝗘𝗥𝗔𝗟 𝗠𝗢𝗗𝗘𝗥𝗔𝗖𝗔𝗢* 📣\n\n💬 *Aviso:* ${args.join(" ") || "Olhem o chat!"}\n\n`;
            todosMembros.forEach(m => { mencTxt += `➔ @${m.split('@')[0]}\n`; });
            await sock.sendMessage(from, { text: mencTxt, mentions: todosMembros });
            break;

        case 'adms':
            let apenasAdms = participants.filter(p => p.admin !== null).map(p => p.id);
            let admTxt = `🛡️ *𝗖𝗛𝗔𝗠𝗔𝗡𝗗𝗢 𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗗𝗢𝗥𝗘𝗦* 🛡️\n\n📌 *Chamado por:* @${sender.split('@')[0]}\n⚠️ *Motivo:* ${args.join(" ") || "Revisar infração no grupo."}\n\n`;
            apenasAdms.forEach(a => { admTxt += `⚡ @${a.split('@')[0]}\n`; });
            await sock.sendMessage(from, { text: admTxt, mentions: [...apenasAdms, sender] }, { quoted: msg });
            break;

        case 'setregras':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Forneça o texto com as novas regras! Ex: `!setregras 1. Sem Spam`" }, { quoted: msg });
            gConfig.regras = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: "📝 *ESTATUTO CONFIGURADO:* As regras oficiais do grupo foram salvas com sucesso! Use *!regras* para ler." }, { quoted: msg });
            break;

        case 'regras':
            const regrasTxt = `╔═══════════════════════════════════════╗\n          📜  𝗡𝗢𝗥𝗠𝗔𝗦 𝗗𝗢 𝗚𝗥𝗨𝗣𝗢  📜\n╚═══════════════════════════════════════╝\n\n ${gConfig.regras || "Nenhuma regra cadastrada ainda."}\n\n─────────────────────────────────────────\n 🌊 Evite punições, colabore com o grupo! 💧\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: regrasTxt }, { quoted: msg });
            break;

        case 'setwelcome1':
        case 'setwelcome2':
        case 'setwelcome3':
            const slotNum = comando.replace('setwelcome', '');
            if (!args[0]) return sock.sendMessage(from, { text: `❌ Digite o texto para salvar no slot de Boas-Vindas ${slotNum}!` }, { quoted: msg });
            gConfig[`bv${slotNum}`] = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ *SLOT DE BOAS-VINDAS ${slotNum} CONFIGURADO!*` }, { quoted: msg });
            break;

        case 'bv1':
        case 'bv2':
        case 'bv3':
            gConfig.bv_ativo = comando;
            salvarDB(db);
            await sock.sendMessage(from, { text: `📢 *SISTEMA ATIVADO:* O modelo de recepção padrão agora está definido para o slot *${comando.toUpperCase()}*!` }, { quoted: msg });
            break;

        case 'atividade':
            let membrosAtividade = Object.keys(db.usuarios).map(id => {
                return { id, msgCont: db.usuarios[id].mensagens_contadas || 0 };
            }).sort((a, b) => b.msgCont - a.msgCont).slice(0, 15);

            let ativTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      📊  𝗠𝗢𝗡𝗜𝗧𝗢𝗥𝗔𝗠𝗘𝗡𝗧𝗢 𝗗𝗘 𝗫𝗣  📊      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Membros com maior tráfego de mensagens no bot:\n\n`;
            membrosAtividade.forEach((m, i) => {
                ativTxt += ` 💧 *${i + 1}º* @${m.id.split('@')[0]} ➔ 💬 *${m.msgCont} mensagens*\n`;
            });
            await sock.sendMessage(from, { text: ativTxt, mentions: membrosAtividade.map(m => m.id) }, { quoted: msg });
            break;

        case 'online':
            let onlineFiltrados = Object.keys(db.usuarios).filter(id => (db.usuarios[id].mensagens_contadas || 0) > 5).slice(0, 20);
            let onTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🟢  𝗠𝗘𝗠𝗕𝗥𝗢𝗦 𝗔𝗧𝗜𝗩𝗢𝗦 𝗡𝗢 𝗖𝗛𝗔𝗧  🟢      ██▓\n░▒▓█████████████████████████████████████▓▒░\n🌊 Integrantes em atividade recente verificada:\n\n`;
            onlineFiltrados.forEach(id => {
                onTxt += ` ➔ @${id.split('@')[0]} [⚡ 𝗟𝗢𝗚𝗚𝗘𝗗]\n`;
            });
            await sock.sendMessage(from, { text: onTxt, mentions: onlineFiltrados }, { quoted: msg });
            break;

        default:
            break;
    }
};
