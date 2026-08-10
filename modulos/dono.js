const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, obterAlvo } = require('./jidUtils');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Detecta se a mensagem usou @menção explícita (em vez de responder/reply).
// Precisamos saber disso pra parsear corretamente args.slice(1) vs args:
// se teve @menção, o token "@numero" ocupa args[0]; se foi só resposta,
// não tem esse token e o texto útil começa já em args[0].
const temMencaoExplicita = (mensagem) => {
    const c = mensagem.message?.extendedTextMessage?.contextInfo;
    return !!(c?.mentionedJid && c.mentionedJid[0]);
};

module.exports = async (sock, msg, comando, args, db, salvarDB) => {
    const from = msg.key.remoteJid;
    let sender = resolverIdentidade(msg.key);

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
    if (!db.config_bot.comandos_desativados) db.config_bot.comandos_desativados = [];

    switch (comando) {
        case 'menudono': {
            const textoMenuDono = `░▒▓█████████████████████████████████████▓▒░\n👑  𝗣𝗔𝗜𝗡𝗘𝗟 𝗦𝗨𝗣𝗥𝗘𝗠𝗢 𝗗𝗢 𝗗𝗘𝗦𝗘𝗡𝗩𝗢𝗟𝗩𝗘𝗗𝗢𝗥  👑\n░▒▓█████████████████████████████████████▓▒░\n\n⚙️ Olá Chefe *Olden*! Aqui estão as ferramentas de controle absoluto do Leicybot:\n\n💻 *⚙️ SISTEMA & MANUTENÇÃO:*\n🔹 *!manutencao on/off* ➔ Ativa ou desativa o modo manutenção global.\n🔹 *!desativarcmd [nome]* ➔ Banir um comando específico do bot.\n🔹 *!ativarcmd [nome]* ➔ Reativar um comando removido.\n🔹 *!reiniciar* ➔ Reiniciar buffers e contêineres do Railway.\n🔹 *!desligar / !ligar* ➔ Pausa ou retoma o processamento de comandos.\n🔹 *!ping* ➔ Uptime, RAM e carga do servidor.\n🔹 *!backup* ➔ Envia o database.json atual no seu privado.\n🔹 *!listagrupos* ➔ Lista os grupos onde estou presente.\n🔹 *!estatisticas* ➔ Números gerais do bot.\n🔹 *!migrarv2* ➔ Rodar 1x só, depois de atualizar pra v2 (reset de golds + migração de títulos).\n\n🌟 *👑 CONTROLE DE TÍTULOS E PERMISSÕES DE ELITE:*\n🔹 *!criartitulo [nome]* ➔ Registra um novo título no sistema do bot.\n🔹 *!dartitulo [@membro ou responda] [nome]* ➔ Concede um título (com anúncio se for especial).\n🔹 *!addcelestial [@membro ou responda]* ➔ Atalho para dar o título especial Celestial direto.\n🔹 *!removoertitulo [@membro ou responda] [nome]* ➔ Retira um título de um usuário.\n🔹 *!concederpermissao [@membro ou responda] [cmd]* ➔ Dá acesso a comandos ADM para não-adms.\n\n💰 *🪙 CONTROLE ECONÔMICO:*\n🔹 *!addgold [@membro/número/responda] [quantia]* ➔ Injetar saldo na conta de alguém.\n🔹 *!remgold [@membro ou responda] [quantia]* ➔ Aplicar multa e reter dinheiro.\n🔹 *!limpardb* ➔ Reset geral de todas as carteiras de Moedas.\n\n🎨 *🖼️ ESTÉTICA INTERNA:*\n🔹 *!setfoto [URL]* ou responda uma imagem com *!setfoto* ➔ Modificar a imagem oficial do menu principal.\n🔹 *!nomebot [texto]* ➔ Mudar a alcunha do bot.\n🔹 *!transmitir [texto]* ➔ Envia um aviso para todos os grupos conhecidos.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: textoMenuDono }, { quoted: msg });
            break;
        }

        case 'criartitulo': {
            const novoTitulo = args.join(" ").trim();
            if (!novoTitulo) return sock.sendMessage(from, { text: "❌ Insira o nome do título que deseja criar! Ex: `!criartitulo Imperador`" }, { quoted: msg });

            if (db.config_bot.titulos_criados.includes(novoTitulo)) {
                return sock.sendMessage(from, { text: "⚠️ Esse título já está cadastrado no sistema!" }, { quoted: msg });
            }
            db.config_bot.titulos_criados.push(novoTitulo);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ *TÍTULO CRIADO:* O título *${novoTitulo}* foi adicionado com sucesso e já pode ser distribuído!` }, { quoted: msg });
            break;
        }

        case 'dartitulo': {
            const teveMencaoDar = temMencaoExplicita(msg);
            const alvoDar = obterAlvo(msg);
            const tituloParaDar = (teveMencaoDar ? args.slice(1) : args).join(" ").trim();

            if (!alvoDar || !tituloParaDar) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!dartitulo [@membro ou responda] [Nome do Título]*" }, { quoted: msg });
            }

            if (!db.usuarios[alvoDar]) db.usuarios[alvoDar] = criarUsuarioPadrao();

            const especiais = db.config_bot.titulos_criados.filter(t => ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"].includes(t))
                .concat(["Celestial", "4Espadas⚔️🌊", "Gavião da noite"]);

            if (especiais.includes(tituloParaDar)) {
                // Slot 2 — título especial, só o dono concede
                db.usuarios[alvoDar].titulo_especial = tituloParaDar;
                db.usuarios[alvoDar].apresentacao = true;
                salvarDB(db);
                await sock.sendMessage(from, { text: `👑 *DECRETO REAL DA COROA:* @${alvoDar.split('@')[0]} recebeu o título de classe especial 🌟 *${tituloParaDar}* concedido por Olden! Sua entrada passará a ser anunciada no chat.`, mentions: [alvoDar] }, { quoted: msg });
            } else {
                if (!db.config_bot.titulos_criados.includes(tituloParaDar)) {
                    return sock.sendMessage(from, { text: "❌ Esse título ainda não foi criado. Crie-o primeiro usando `!criartitulo`." }, { quoted: msg });
                }
                // Slot 1 — título comprado/regular. Como o dono está concedendo
                // manualmente, sobrescreve direto (sem exigir !vendertitulo antes).
                db.usuarios[alvoDar].titulo_comprado = tituloParaDar;
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ O título regular *${tituloParaDar}* foi atribuído com sucesso para @${alvoDar.split('@')[0]}!`, mentions: [alvoDar] }, { quoted: msg });
            }
            break;
        }

        case 'addcelestial': {
            const alvoCelestial = obterAlvo(msg);
            if (!alvoCelestial) return sock.sendMessage(from, { text: "❌ Marque ou responda quem vai receber o título Celestial! Ex: `!addcelestial @membro`" }, { quoted: msg });

            if (!db.usuarios[alvoCelestial]) db.usuarios[alvoCelestial] = criarUsuarioPadrao();
            db.usuarios[alvoCelestial].titulo_especial = "Celestial";
            db.usuarios[alvoCelestial].apresentacao = true;
            salvarDB(db);
            await sock.sendMessage(from, { text: `👑 @${alvoCelestial.split('@')[0]} recebeu o título especial *Celestial* diretamente!`, mentions: [alvoCelestial] }, { quoted: msg });
            break;
        }

        case 'removoertitulo': {
            const teveMencaoRem = temMencaoExplicita(msg);
            const alvoRemover = obterAlvo(msg);
            const tituloParaRemover = (teveMencaoRem ? args.slice(1) : args).join(" ").trim();

            if (!alvoRemover || !tituloParaRemover) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!removoertitulo [@membro ou responda] [Nome do Título]*" }, { quoted: msg });
            }

            if (db.usuarios[alvoRemover]) {
                if (db.usuarios[alvoRemover].titulo_especial === tituloParaRemover) {
                    db.usuarios[alvoRemover].titulo_especial = null;
                    db.usuarios[alvoRemover].apresentacao = false;
                } else if (db.usuarios[alvoRemover].titulo_comprado === tituloParaRemover) {
                    db.usuarios[alvoRemover].titulo_comprado = null;
                    db.usuarios[alvoRemover].data_expiracao = null;
                } else {
                    return sock.sendMessage(from, { text: "❌ O membro não possui esse título ativo." }, { quoted: msg });
                }
                salvarDB(db);
                await sock.sendMessage(from, { text: `📉 *TÍTULO CASSADO:* O título *${tituloParaRemover}* foi destituído de @${alvoRemover.split('@')[0]} por ordem superior.`, mentions: [alvoRemover] }, { quoted: msg });
            }
            break;
        }

        case 'concederpermissao': {
            const teveMencaoPerm = temMencaoExplicita(msg);
            const alvoPerm = obterAlvo(msg);
            const cmdPerm = (teveMencaoPerm ? args[1] : args[0]) ? (teveMencaoPerm ? args[1] : args[0]).toLowerCase().replace('!', '') : null;

            if (!alvoPerm || !cmdPerm) {
                return sock.sendMessage(from, { text: "❌ Uso correto: *!concederpermissao [@membro ou responda] [nome_do_comando]*" }, { quoted: msg });
            }

            if (!db.usuarios[alvoPerm]) db.usuarios[alvoPerm] = criarUsuarioPadrao();
            if (!db.usuarios[alvoPerm].permissoes_especiais) db.usuarios[alvoPerm].permissoes_especiais = [];

            if (!db.usuarios[alvoPerm].permissoes_especiais.includes(cmdPerm)) {
                db.usuarios[alvoPerm].permissoes_especiais.push(cmdPerm);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🔑 *PERMISSÃO ESPECÍFICA CONCEDIDA:* O usuário @${alvoPerm.split('@')[0]} agora possui autoridade para executar o comando *!${cmdPerm}* mesmo sem ser Administrador do grupo!`, mentions: [alvoPerm] }, { quoted: msg });
            break;
        }

        case 'manutencao': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                return sock.sendMessage(from, { text: "🌊 Use: *!manutencao on* ou *!manutencao off* 💧" }, { quoted: msg });
            }
            db.config_bot.manutencao = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `⚙️ *PAINEL SUPREMO:* Modo manutenção definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'burlar': {
            if (!db.usuarios[sender]) db.usuarios[sender] = criarUsuarioPadrao();
            db.usuarios[sender].trabalhos_hoje = 0;
            db.usuarios[sender].mineracoes_hoje = 0;
            db.usuarios[sender].pescas_hoje = 0;
            db.usuarios[sender].raspadinhas_hoje = 0;
            salvarDB(db);
            await sock.sendMessage(from, { text: "⚡ *MODO DEUS:* Energias e limites diários zerados para você testar à vontade, Chefe Olden! 🌊" }, { quoted: msg });
            break;
        }

        case 'desativarcmd': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando deseja desativar! Ex: `!desativarcmd assaltar`" }, { quoted: msg });
            if (!db.config_bot.comandos_desativados.includes(args[0])) {
                db.config_bot.comandos_desativados.push(args[0]);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🚫 O comando *!${args[0]}* foi desativado globalmente por ordem de Olden.` }, { quoted: msg });
            break;
        }

        case 'ativarcmd': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando deseja reativar!" }, { quoted: msg });
            db.config_bot.comandos_desativados = db.config_bot.comandos_desativados.filter(c => c !== args[0]);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ O comando *!${args[0]}* foi reativado e liberado para os membros! 🌊` }, { quoted: msg });
            break;
        }

        case 'addgold': {
            const alvoMencaoAdd = obterAlvo(msg);
            const mencionado = alvoMencaoAdd || (args[0] && /^\d+$/.test(args[0].replace(/\D/g, '')) && args[0].replace(/\D/g, '').length >= 8 ? args[0].replace(/\D/g, '') + '@s.whatsapp.net' : null);
            const quantia = parseInt(args[1] || args[0]);
            if (!mencionado || isNaN(quantia)) return sock.sendMessage(from, { text: "❌ Uso: *!addgold [@membro / número / responda] [quantidade]*" }, { quoted: msg });

            if (!db.usuarios[mencionado]) db.usuarios[mencionado] = criarUsuarioPadrao();
            db.usuarios[mencionado].golds += quantia;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🪙 *BANCO DE LEICYBOT:* Injetados *${quantia} Moedas* na conta do usuário! 🌊` }, { quoted: msg });
            break;
        }

        case 'remgold': {
            const alvoRem = obterAlvo(msg);
            const quantiaRem = parseInt(args[1] || args[0]);
            if (!alvoRem || isNaN(quantiaRem)) return sock.sendMessage(from, { text: "❌ Uso: *!remgold [@membro ou responda] [quantidade]*" }, { quoted: msg });

            if (!db.usuarios[alvoRem]) db.usuarios[alvoRem] = criarUsuarioPadrao();
            db.usuarios[alvoRem].golds = Math.max(0, db.usuarios[alvoRem].golds - quantiaRem);
            salvarDB(db);
            await sock.sendMessage(from, { text: `📉 *MULTA APLICADA:* Removidas *${quantiaRem} Moedas* da conta do infrator.` }, { quoted: msg });
            break;
        }

        case 'limpardb': {
            db.usuarios = {};
            salvarDB(db);
            await sock.sendMessage(from, { text: "🚨 *RESET GLOBAL:* Todo o banco de dados econômico foi apagado. Todos voltaram a ter 0 Moedas 🪙." }, { quoted: msg });
            break;
        }

        case 'setfoto': {
            // v2: "!setfoto padrao" limpa qualquer override salvo (URL ou base64),
            // devolvendo o controle pro arquivo local em assets/.
            if (args[0]?.toLowerCase() === 'padrao') {
                db.config_bot.url_foto_menu = null;
                db.config_bot.foto_menu_base64 = null;
                salvarDB(db);
                return sock.sendMessage(from, { text: "🖼️ Removido o override salvo — o !menu volta a usar o arquivo local de assets/foto-menu.* (ou a imagem de segurança, se esse arquivo não existir)." }, { quoted: msg });
            }

            // aceita responder a uma imagem, além do !setfoto [URL] de sempre.
            const ctxFoto = msg.message.extendedTextMessage?.contextInfo;
            const imagemCitada = ctxFoto?.quotedMessage?.imageMessage;

            if (imagemCitada) {
                try {
                    const mensagemFalsa = {
                        key: {
                            remoteJid: from,
                            id: ctxFoto.stanzaId,
                            participant: ctxFoto.participant
                        },
                        message: ctxFoto.quotedMessage
                    };
                    const bufferFoto = await downloadMediaMessage(mensagemFalsa, 'buffer', {});
                    db.config_bot.foto_menu_base64 = bufferFoto.toString('base64');
                    db.config_bot.url_foto_menu = null;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🖼️ A foto oficial do !menu foi atualizada com a imagem que você respondeu! 🌊" }, { quoted: msg });
                } catch (e) {
                    console.error('[SETFOTO] Erro ao baixar imagem citada:', e.message);
                    return sock.sendMessage(from, { text: "❌ Não consegui baixar essa imagem. Tente enviar o link direto: `!setfoto [URL]`" }, { quoted: msg });
                }
            }

            if (!args[0]) return sock.sendMessage(from, { text: "❌ Envie o link da imagem (URL) ou responda a uma imagem com *!setfoto*." }, { quoted: msg });
            db.config_bot.url_foto_menu = args[0];
            db.config_bot.foto_menu_base64 = null;
            salvarDB(db);
            await sock.sendMessage(from, { text: "🖼️ A foto oficial do comando *!menu* foi alterada com sucesso!" }, { quoted: msg });
            break;
        }

        case 'nomebot': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o novo nome do bot." }, { quoted: msg });
            db.config_bot.nome_bot = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: `🤖 Meu nome interno foi alterado para *${args.join(" ")}*!` }, { quoted: msg });
            break;
        }

        case 'transmitir': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o texto da transmissão global." }, { quoted: msg });
            const textoTransmissao = `📢 *TRANSMISSÃO OFICIAL DE OLDEN:*\n\n${args.join(" ")}`;
            const gruposConhecidos = Object.keys(db.grupos || {});
            let enviadosOk = 0;
            for (const grupoId of gruposConhecidos) {
                try {
                    await sock.sendMessage(grupoId, { text: textoTransmissao });
                    enviadosOk++;
                } catch (e) { /* ignora grupo indisponível e segue para o próximo */ }
            }
            await sock.sendMessage(from, { text: `📢 Transmissão enviada com sucesso para *${enviadosOk}* de *${gruposConhecidos.length}* grupo(s) conhecido(s)!` }, { quoted: msg });
            break;
        }

        case 'reiniciar': {
            await sock.sendMessage(from, { text: "🔄 Reiniciando containers e limpando buffers no Railway... Volto em 5 segundos!" }, { quoted: msg });
            process.exit(0);
            break;
        }

        case 'desligar': {
            db.config_bot.pausado = true;
            salvarDB(db);
            await sock.sendMessage(from, { text: "💤 Bot pausado! Vou ignorar comandos normais até você mandar *!ligar*." }, { quoted: msg });
            break;
        }

        case 'ligar': {
            db.config_bot.pausado = false;
            salvarDB(db);
            await sock.sendMessage(from, { text: "🔌 Bot reativado! Todos os sistemas operando normalmente. 🌊" }, { quoted: msg });
            break;
        }

        case 'ping': {
            const inicioPing = Date.now();
            const usoMemoria = process.memoryUsage();
            const ramUsadaMB = (usoMemoria.rss / 1024 / 1024).toFixed(1);
            const uptimeSegundos = process.uptime();
            const horasUp = Math.floor(uptimeSegundos / 3600);
            const minutosUp = Math.floor((uptimeSegundos % 3600) / 60);
            let cargaCpuTexto = "N/D";
            try {
                cargaCpuTexto = require('os').loadavg()[0].toFixed(2);
            } catch (e) { /* loadavg pode não existir em alguns ambientes */ }

            const latenciaMs = Date.now() - inicioPing;
            const textoPing = `🏓 *PONG!* (${latenciaMs}ms de processamento)\n\n🕐 Uptime: *${horasUp}h ${minutosUp}m*\n💾 RAM em uso: *${ramUsadaMB} MB*\n⚙️ Carga de CPU (1min): *${cargaCpuTexto}*`;
            await sock.sendMessage(from, { text: textoPing }, { quoted: msg });
            break;
        }

        case 'backup': {
            try {
                const jsonStr = JSON.stringify(db, null, 2);
                const bufferBackup = Buffer.from(jsonStr, 'utf-8');
                const nomeArquivo = `backup-leicybot-${new Date().toISOString().slice(0, 10)}.json`;
                await sock.sendMessage(sender, { document: bufferBackup, fileName: nomeArquivo, mimetype: 'application/json' });
                if (from !== sender) {
                    await sock.sendMessage(from, { text: "📦 Backup do database.json enviado no seu privado! 🌊" }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: "📦 Backup do database.json enviado acima! 🌊" }, { quoted: msg });
                }
            } catch (e) {
                console.error('[BACKUP] Erro ao enviar backup:', e.message);
                await sock.sendMessage(from, { text: "❌ Não consegui gerar/enviar o backup. Verifique os logs do servidor." }, { quoted: msg });
            }
            break;
        }

        case 'listagrupos': {
            const gruposDb = Object.keys(db.grupos || {});
            if (gruposDb.length === 0) return sock.sendMessage(from, { text: "📋 Nenhum grupo conhecido registrado ainda." }, { quoted: msg });

            let textoGrupos = `📋 *GRUPOS CONHECIDOS (${gruposDb.length}):*\n\n`;
            for (const idGrupo of gruposDb) {
                try {
                    const metaGrupo = await sock.groupMetadata(idGrupo);
                    textoGrupos += ` • ${metaGrupo.subject} (${metaGrupo.participants.length} membros)\n`;
                } catch (e) {
                    textoGrupos += ` • [grupo inacessível: ${idGrupo.split('@')[0]}]\n`;
                }
            }
            await sock.sendMessage(from, { text: textoGrupos }, { quoted: msg });
            break;
        }

        case 'estatisticas': {
            const totalUsuarios = Object.keys(db.usuarios || {}).length;
            const totalGrupos = Object.keys(db.grupos || {}).length;
            const totalGoldsCirculando = Object.values(db.usuarios || {}).reduce((soma, u2) => soma + (u2.golds || 0) + (u2.banco || 0), 0);
            const usuariosComTitulo = Object.values(db.usuarios || {}).filter(u2 => u2.titulo_comprado || u2.titulo_especial).length;
            const uptimeSegundos = process.uptime();
            const horasUp = Math.floor(uptimeSegundos / 3600);
            const minutosUp = Math.floor((uptimeSegundos % 3600) / 60);

            const textoStats = `📊 *ESTATÍSTICAS GERAIS DO LEICYBOT*\n\n👥 Usuários registrados: *${totalUsuarios}*\n💬 Grupos conhecidos: *${totalGrupos}*\n🪙 Golds em circulação (mãos + banco): *${totalGoldsCirculando}*\n👑 Usuários com título ativo: *${usuariosComTitulo}*\n🕐 Uptime atual: *${horasUp}h ${minutosUp}m*`;
            await sock.sendMessage(from, { text: textoStats }, { quoted: msg });
            break;
        }

        case 'mesclarusuario': {
            // Corrige registros fantasma: quando a mesma pessoa acabou tendo 2
            // entradas em db.usuarios (normalmente por ter usado o bot antes da
            // correção de identidade da v2, ou por causa de @lid). Soma tudo do
            // ID duplicado no ID principal e apaga o duplicado.
            const bruto1 = args[0];
            const bruto2 = args[1];
            if (!bruto1 || !bruto2) {
                return sock.sendMessage(from, { text: "❌ Uso: *!mesclarusuario [id_principal] [id_duplicado]*\n\n👉 Pode ser o número puro (ex: 258877080511) ou o JID completo (ex: 258877080511@s.whatsapp.net ou algo@lid). Use *!backup* e procure no database.json pra achar o ID exato do registro duplicado." }, { quoted: msg });
            }

            const normalizarEntrada = (v) => v.includes('@') ? v : v.replace(/\D/g, '') + '@s.whatsapp.net';
            const idPrincipal = normalizarEntrada(bruto1);
            const idDuplicado = normalizarEntrada(bruto2);

            if (idPrincipal === idDuplicado) {
                return sock.sendMessage(from, { text: "❌ Os dois IDs são iguais, não há o que mesclar." }, { quoted: msg });
            }
            if (!db.usuarios[idDuplicado]) {
                return sock.sendMessage(from, { text: `❌ Não encontrei nenhum registro pra *${idDuplicado}*.` }, { quoted: msg });
            }
            if (!db.usuarios[idPrincipal]) db.usuarios[idPrincipal] = criarUsuarioPadrao();

            const principal = db.usuarios[idPrincipal];
            const duplicado = db.usuarios[idDuplicado];

            principal.golds = (principal.golds || 0) + (duplicado.golds || 0);
            principal.banco = (principal.banco || 0) + (duplicado.banco || 0);
            principal.mensagens_contadas = (principal.mensagens_contadas || 0) + (duplicado.mensagens_contadas || 0);
            principal.ultima_interacao = Math.max(principal.ultima_interacao || 0, duplicado.ultima_interacao || 0);
            principal.beijados = (principal.beijados || 0) + (duplicado.beijados || 0);
            principal.abracados = (principal.abracados || 0) + (duplicado.abracados || 0);
            if (!principal.titulo_comprado && duplicado.titulo_comprado) {
                principal.titulo_comprado = duplicado.titulo_comprado;
                principal.data_expiracao = duplicado.data_expiracao;
            }
            if (!principal.titulo_especial && duplicado.titulo_especial) {
                principal.titulo_especial = duplicado.titulo_especial;
            }
            principal.historico_roubos = [...(principal.historico_roubos || []), ...(duplicado.historico_roubos || [])];
            principal.emprestimos_feitos = [...(principal.emprestimos_feitos || []), ...(duplicado.emprestimos_feitos || [])];
            principal.emprestimos_recebidos = [...(principal.emprestimos_recebidos || []), ...(duplicado.emprestimos_recebidos || [])];

            delete db.usuarios[idDuplicado];
            salvarDB(db);

            await sock.sendMessage(from, { text: `🔧 *MESCLAGEM CONCLUÍDA:*\n\n✅ Golds, banco, títulos e histórico de *${idDuplicado}* foram somados/transferidos para *${idPrincipal}*.\n🗑️ O registro duplicado foi apagado.\n\n⚠️ Isso só mexe no banco de dados do bot — não afeta o contato/conversa no WhatsApp de verdade.` }, { quoted: msg });
            break;
        }

        case 'migrarv2': {
            const ID_EXEMPLO_MIG = 'exemplo_modelo_usuario@s.whatsapp.net';
            let usuariosMigrados = 0;
            let titulosMigrados = 0;
            for (const idUsuario of Object.keys(db.usuarios)) {
                if (idUsuario === ID_EXEMPLO_MIG) continue;
                const usr = db.usuarios[idUsuario];

                usr.golds = 0;
                usuariosMigrados++;

                if (!usr.titulo_comprado) {
                    if (usr.titulo_1) {
                        usr.titulo_comprado = usr.titulo_1;
                        titulosMigrados++;
                    } else if (usr.titulo_2) {
                        usr.titulo_comprado = usr.titulo_2;
                        titulosMigrados++;
                    }
                }
                delete usr.titulo_1;
                delete usr.titulo_2;
            }
            salvarDB(db);
            await sock.sendMessage(from, { text: `🔧 *MIGRAÇÃO V2 CONCLUÍDA:*\n\n👥 Usuários processados: *${usuariosMigrados}*\n👑 Títulos migrados pro slot único: *${titulosMigrados}*\n🪙 Todos os saldos em mãos foram zerados (o banco não foi mexido).\n\n⚠️ Rode esse comando *só uma vez*. Rodar de novo vai zerar os golds outra vez!` }, { quoted: msg });
            break;
        }

        default:
            break;
    }
};
