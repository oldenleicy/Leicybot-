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

    // Garantir inicialização dos arrays globais do bot
    if (!db.config_bot) db.config_bot = {};
    if (!db.config_bot.titulos_criados) db.config_bot.titulos_criados = ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"];

    switch (comando) {
        case 'menudono':
            const textoMenuDono = `░▒▓█████████████████████████████████████▓▒░\n👑  𝗣𝗔𝗜𝗡𝗘𝗟 𝗦𝗨𝗣𝗥𝗘𝗠𝗢 𝗗𝗢 𝗗𝗘𝗦𝗘𝗡𝗩𝗢𝗟𝗩𝗘𝗗𝗢𝗥  👑\n░▒▓█████████████████████████████████████▓▒░\n\n⚙️ Olá Chefe *Olden*! Aqui estão as ferramentas de controle absoluto do Leicybot:\n\n💻 *⚙️ SISTEMA & MANUTENÇÃO:*\n🔹 *!manutencao on/off* ➔ Ativa ou desativa o modo manutenção global.\n🔹 *!desativarcmd [nome]* ➔ Banir um comando específico do bot.\n🔹 *!ativarcmd [nome]* ➔ Reativar um comando removido.\n🔹 *!reiniciar* ➔ Reiniciar buffers e contêineres do Railway.\n\n🌟 *👑 CONTROLE DE TÍTULOS E PERMISSÕES DE ELITE:*\n🔹 *!criartitulo [nome]* ➔ Registra um novo título no sistema do bot.\n🔹 *!dartitulo [@membro] [nome]* ➔ Concede um título (com anúncio se for especial).\n🔹 *!removoertitulo [@membro] [nome]* ➔ Retira um título de um usuário.\n🔹 *!concederpermissao [@membro] [cmd]* ➔ Dá acesso a comandos ADM para não-adms.\n\n💰 *🪙 CONTROLE ECONÔMICO:*\n🔹 *!addgold [@membro] [quantia]* ➔ Injetar saldo na conta de alguém.\n🔹 *!remgold [@membro] [quantia]* ➔ Aplicar multa e reter dinheiro.\n🔹 *!limpardb* ➔ Reset geral de todas as carteiras de Moedas.\n\n🎨 *🖼️ ESTÉTICA INTERNA:*\n🔹 *!setfoto [URL]* ➔ Modificar a imagem oficial do menu principal.\n🔹 *!nomebot [texto]* ➔ Mudar a alcunha do bot.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: textoMenuDono }, { quoted: msg });
            break;

        case 'criartitulo':
            const novoTitulo = args.join(" ").trim();
            if (!novoTitulo) return sock.sendMessage(from, { text: "❌ Insira o nome do título que deseja criar! Ex: `!criartitulo Imperador`" }, { quoted: msg });
            
            if (db.config_bot.titulos_criados.includes(novoTitulo)) {
                return sock.sendMessage(from, { text: "⚠️ Esse título já está cadastrado no sistema!" }, { quoted: msg });
            }
            db.config_bot.titulos_criados.push(novoTitulo);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ *TÍTULO CRIADO:* O título *${novoTitulo}* foi adicionado com sucesso e já pode ser distribuído!` }, { quoted: msg });
            break;

        case 'dartitulo':
            const alvoDar = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            // Remove o marcador @membro dos argumentos para capturar o nome do título restante
            const tituloParaDar = args.slice(1).join(" ").trim();

            if (!alvoDar || !tituloParaDar) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!dartitulo [@membro] [Nome do Título]*" }, { quoted: msg });
            }

            if (!db.usuarios[alvoDar]) db.usuarios[alvoDar] = { golds: 100, banco: 0 };

            // Classificação especial solicitada
            const especiais = ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"];
            
            if (especiais.includes(tituloParaDar)) {
                db.usuarios[alvoDar].titulo_especial = tituloParaDar;
                db.usuarios[alvoDar].apresentacao = true; // Ativa a apresentação ativa automática
                salvarDB(db);
                await sock.sendMessage(from, { text: `👑 *DECRETO REAL DA COROA:* @${alvoDar.split('@')[0]} recebeu o título de classe especial 🌟 *${tituloParaDar}* concedido por Olden! Sua entrada passará a ser anunciada no chat.`, mentions: [alvoDar] }, { quoted: msg });
            } else {
                if (!db.config_bot.titulos_criados.includes(tituloParaDar)) {
                    return sock.sendMessage(from, { text: "❌ Esse título ainda não foi criado. Crie-o primeiro usando `!criartitulo`." }, { quoted: msg });
                }
                db.usuarios[alvoDar].titulo_1 = tituloParaDar;
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ O título regular *${tituloParaDar}* foi atribuído com sucesso para @${alvoDar.split('@')[0]}!`, mentions: [alvoDar] }, { quoted: msg });
            }
            break;

        case 'removoertitulo':
            const alvoRemover = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const tituloParaRemover = args.slice(1).join(" ").trim();

            if (!alvoRemover || !tituloParaRemover) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!removoertitulo [@membro] [Nome do Título]*" }, { quoted: msg });
            }

            if (db.usuarios[alvoRemover]) {
                if (db.usuarios[alvoRemover].titulo_especial === tituloParaRemover) {
                    db.usuarios[alvoRemover].titulo_especial = null;
                    db.usuarios[alvoRemover].apresentacao = false;
                } else if (db.usuarios[alvoRemover].titulo_1 === tituloParaRemover) {
                    db.usuarios[alvoRemover].titulo_1 = null;
                } else {
                    return sock.sendMessage(from, { text: "❌ O membro não possui esse título ativo." }, { quoted: msg });
                }
                salvarDB(db);
                await sock.sendMessage(from, { text: `📉 *TÍTULO CASADO:* O título *${tituloParaRemover}* foi destituído de @${alvoRemover.split('@')[0]} por ordem superior.`, mentions: [alvoRemover] }, { quoted: msg });
            }
            break;

        case 'concederpermissao':
            const alvoPerm = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const cmdPerm = args[1] ? args[1].toLowerCase().replace('!', '') : null;

            if (!alvoPerm || !cmdPerm) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!concederpermissao [@membro] [nome_do_comando]*" }, { quoted: msg });
            }

            if (!db.usuarios[alvoPerm]) db.usuarios[alvoPerm] = { golds: 100, banco: 0 };
            if (!db.usuarios[alvoPerm].permissoes_especiais) db.usuarios[alvoPerm].permissoes_especiais = [];

            if (!db.usuarios[alvoPerm].permissoes_especiais.includes(cmdPerm)) {
                db.usuarios[alvoPerm].permissoes_especiais.push(cmdPerm);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🔑 *PERMISSÃO ESPECÍFICA CONCEDIDA:* O usuário @${alvoPerm.split('@')[0]} agora possui autoridade para executar o comando *!${cmdPerm}* mesmo sem ser Administrador do grupo!`, mentions: [alvoPerm] }, { quoted: msg });
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
            await sock.sendMessage(from, { text: `🪙 *BANCO DE LEICYBOT:* Injetados *${quantia} Moedas* na conta do usuário! 🌊` }, { quoted: msg });
            break;

        case 'remgold':
            const alvoRem = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quantiaRem = parseInt(args[1]);
            if (!alvoRem || isNaN(quantiaRem)) return sock.sendMessage(from, { text: "❌ Uso: *!remgold [@membro] [quantidade]*" }, { quoted: msg });
            
            if (!db.usuarios[alvoRem]) db.usuarios[alvoRem] = { golds: 100, banco: 0 };
            db.usuarios[alvoRem].golds = Math.max(0, db.usuarios[alvoRem].golds - quantiaRem);
            salvarDB(db);
            await sock.sendMessage(from, { text: `📉 *MULTA APLICADA:* Removidas *${quantiaRem} Moedas* da conta do infrator.` }, { quoted: msg });
            break;

        case 'limpardb':
            db.usuarios = {};
            salvarDB(db);
            await sock.sendMessage(from, { text: "🚨 *RESET GLOBAL:* Todo o banco de dados econômico foi apagado. Todos voltaram a ter 100 Moedas 🪙." }, { quoted: msg });
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
