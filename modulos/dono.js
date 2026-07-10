module.exports = async (sock, msg, comando, args, db, salvarDB) => {
    const from = msg.key.remoteJid;
    let sender = msg.key.participant || msg.key.remoteJid;

    // Remove qualquer ID de dispositivo ou sufixo extra (Evita o erro de não reconhecer dono)
    if (sender && sender.includes(':')) {
        sender = sender.split(':')[0] + '@s.whatsapp.net';
    }

    // ══════════════════════════════════════════════════════════════
    // ⚠️ CONFIGURAÇÃO DO ID DO DONO
    // ══════════════════════════════════════════════════════════════
    const DONO_OFICIAL = '258877080511@s.whatsapp.net'; 

    // Bloqueio de segurança contra impostores
    if (sender !== DONO_OFICIAL) {
        return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Apenas o meu criador supremo, *Olden*, pode usar este comando! 🌊" }, { quoted: msg });
    }

    switch (comando) {
        // Correção: Adicionado o painel para o comando !menudono responder
        case 'menudono':
            const textoMenuDono = `░▒▓█████████████████████████████████████▓▒░\n👑  𝗣𝗔𝗜𝗡𝗘𝗟 𝗦𝗨𝗣𝗥𝗘𝗠𝗢 𝗗𝗢 𝗗𝗘𝗦𝗘𝗡𝗩𝗢𝗟𝗩𝗘𝗗𝗢𝗥  👑\n░▒▓█████████████████████████████████████▓▒░\n\n⚙️ Olá Chefe *Olden*! Aqui estão as ferramentas de controle absoluto do Leicybot-:\n\n💻 *⚙️ SISTEMA & MANUTENÇÃO:*\n🔹 *!manutencao on/off* ➔ Ativa ou desativa o modo manutenção global.\n🔹 *!desativarcmd [nome]* ➔ Banir um comando específico do bot.\n🔹 *!ativarcmd [nome]* ➔ Reativar um comando removido.\n🔹 *!reiniciar* ➔ Reiniciar buffers e contêineres do Railway.\n\n💰 *💳 CONTROLE ECONÔMICO:*\n🔹 *!addgold [@membro] [quantia]* ➔ Injetar saldo na conta de alguém.\n🔹 *!remgold [@membro] [quantia]* ➔ Aplicar multa e reter dinheiro.\n🔹 *!addcelestial [@membro]* ➔ Conceder o título divino Celestial.\n🔹 *!limpardb* ➔ Reset geral de todas as carteiras de Golds.\n\n🎨 *🖼️ ESTÉTICA INTERNA:*\n🔹 *!setfoto [URL]* ➔ Modificar a imagem oficial do menu principal.\n🔹 *!nomebot [texto]* ➔ Mudar a alcunha do bot.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: textoMenuDono }, { quoted: msg });
            break;

        case 'manutencao':
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                return sock.sendMessage(from, { text: "🌊 Use: *!manutencao on* ou *!manutencao off* 💧" }, { quoted: msg });
            }
            db.config_bot.manutencao = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `⚙️ *PAINEL SUPREMO:* Modo manutenção definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'burlar':
            if (!db.usuarios[sender]) db.usuarios[sender] = { golds: 100, banco: 0, trabalhos_hoje: 0, mineracoes_hoje: 0 };
            db.usuarios[sender].trabalhos_hoje = 0;
            db.usuarios[sender].mineracoes_hoje = 0;
            salvarDB(db);
            await sock.sendMessage(from, { text: "⚡ *MODO DEUS:* Energias e limites diários zerados para você testar à vontade, Chefe Olden! 🌊" }, { quoted: msg });
            break;

        case 'desativarcmd':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando deseja desativar! Ex: `!desativarcmd assaltar`" }, { quoted: msg });
            if (!db.config_bot.comandos_desativados.includes(args[0])) {
                db.config_bot.comandos_desativados.push(args[0]);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🚫 O comando *!${args[0]}* foi desativado globalmente por ordem de Olden.` }, { quoted: msg });
            break;

        case 'ativarcmd':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando deseja reativar!" }, { quoted: msg });
            db.config_bot.comandos_desativados = db.config_bot.comandos_desativados.filter(c => c !== args[0]);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ O comando *!${args[0]}* foi reativado e liberado para os membros! 🌊` }, { quoted: msg });
            break;

        case 'addgold':
            const mencionado = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || (args[0] ? args[0] + '@s.whatsapp.net' : null);
            const quantia = parseInt(args[1] || args[0]);
            if (!mencionado || isNaN(quantia)) return sock.sendMessage(from, { text: "❌ Uso: *!addgold [@membro] [quantidade]*" }, { quoted: msg });
            
            if (!db.usuarios[mencionado]) db.usuarios[mencionado] = { golds: 100, banco: 0 };
            db.usuarios[mencionado].golds += quantia;
            salvarDB(db);
            await sock.sendMessage(from, { text: `💳 *BANCO DE LEICYBOT:* Injetados *${quantia} Golds* na conta do usuário! 🌊` }, { quoted: msg });
            break;

        case 'remgold':
            const alvoRem = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quantiaRem = parseInt(args[1]);
            if (!alvoRem || isNaN(quantiaRem)) return sock.sendMessage(from, { text: "❌ Uso: *!remgold [@membro] [quantidade]*" }, { quoted: msg });
            
            if (!db.usuarios[alvoRem]) db.usuarios[alvoRem] = { golds: 100, banco: 0 };
            db.usuarios[alvoRem].golds = Math.max(0, db.usuarios[alvoRem].golds - quantiaRem);
            salvarDB(db);
            await sock.sendMessage(from, { text: `📉 *MULTA APLICADA:* Removidos *${quantiaRem} Golds* da conta do infrator.` }, { quoted: msg });
            break;

        case 'addcelestial':
            const alvoCel = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoCel) return sock.sendMessage(from, { text: "❌ Mencione quem receberá o título divino Celestial!" }, { quoted: msg });
            
            if (!db.usuarios[alvoCel]) db.usuarios[alvoCel] = { golds: 100, banco: 0 };
            db.usuarios[alvoCel].titulo_1 = "🌌 Celestial 💎";
            db.usuarios[alvoCel].data_expiracao = Date.now() + 604800000; 
            salvarDB(db);
            await sock.sendMessage(from, { text: `🌌 *DECRETO REAL:* @${alvoCel.split('@')[0]} foi coroado com o título de prestígio *Celestial* por Olden!`, mentions: [alvoCel] }, { quoted: msg });
            break;

        case 'setfoto':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Insira o link da imagem (URL)." }, { quoted: msg });
            db.config_bot.url_foto_menu = args[0];
            salvarDB(db);
            await sock.sendMessage(from, { text: "🖼️ A foto oficial do comando *!menu* foi alterada com sucesso!" }, { quoted: msg });
            break;

        case 'nomebot':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o novo nome do bot." }, { quoted: msg });
            await sock.sendMessage(from, { text: `🤖 Meu nome interno foi alterado para *${args.join(" ")}*!` }, { quoted: msg });
            break;

        case 'limpardb':
            db.usuarios = {};
            salvarDB(db);
            await sock.sendMessage(from, { text: "🚨 *RESET GLOBAL:* Todo o banco de dados econômico foi apagado. Todos voltaram a ter 100 Golds." }, { quoted: msg });
            break;

        case 'transmitir':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o texto da transmissão global." }, { quoted: msg });
            await sock.sendMessage(from, { text: `📢 Transmissão enviada para as centrais de comando!` }, { quoted: msg });
            break;

        case 'reiniciar':
            await sock.sendMessage(from, { text: "🔄 Reiniciando containers e limpando buffers no Railway... Volto em 5 segundos!" }, { quoted: msg });
            process.exit(0);
            break;

        case 'desligar':
            await sock.sendMessage(from, { text: "💤 Desligando módulos de resposta por tempo indeterminado..." }, { quoted: msg });
            break;
            
        default:
            break;
    }
};
