// modulos/dono.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, obterAlvo } = require('./jidUtils');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = async (sock, msg, comando, args, db, salvarDB) => {
    const from = msg.key.remoteJid;
    let sender = resolverIdentidade(msg.key);

    // ⚠️ CONFIGURAÇÃO DO DONO OFICIAL
    const DONO_OFICIAL = '258877080511@s.whatsapp.net';

    if (sender !== DONO_OFICIAL) {
        return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Apenas o meu criador supremo, *Olden*, pode usar este comando! 🌊" }, { quoted: msg });
    }

    // Inicializações preventivas
    if (!db.config_bot) db.config_bot = {};
    if (!db.config_bot.titulos_criados) db.config_bot.titulos_criados = ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"];
    if (!db.config_bot.comandos_desativados) db.config_bot.comandos_desativados = [];

    // Função auxiliar para formatar bytes
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    switch (comando) {
        case 'menudono': {
            const textoMenuDono = `░▒▓█████████████████████████████████████▓▒░\n👑  𝗣𝗔𝗜𝗡𝗘𝗟 𝗦𝗨𝗣𝗥𝗘𝗠𝗢 𝗗𝗢 𝗗𝗘𝗦𝗘𝗡𝗩𝗢𝗟𝗩𝗘𝗗𝗢𝗥  👑\n░▒▓█████████████████████████████████████▓▒░\n\n⚙️ Olá Chefe *Olden*! Aqui estão as ferramentas de controle absoluto do Leicybot:\n\n💻 *⚙️ SISTEMA & MANUTENÇÃO:*\n🔹 *!manutencao on/off* ➔ Ativa ou desativa o modo manutenção global.\n🔹 *!desativarcmd [nome]* ➔ Banir um comando específico do bot.\n🔹 *!ativarcmd [nome]* ➔ Reativar um comando removido.\n🔹 *!ping* ➔ Ver latência, uptime, memória e CPU do servidor.\n🔹 *!reiniciar* ➔ Reiniciar o processo do bot no servidor.\n🔹 *!desligar / !ligar* ➔ Pausa ou retoma o processamento de comandos.\n🔹 *!backup* ➔ Envia o banco de dados atual no seu privado.\n🔹 *!listagrupos* ➔ Lista todos os grupos onde o bot está.\n🔹 *!estatisticas* ➔ Visão geral de usuários, grupos e economia.\n\n🌟 *👑 CONTROLE DE TÍTULOS E PERMISSÕES DE ELITE:*\n🔹 *!criartitulo [nome]* ➔ Registra um novo título no sistema.\n🔹 *!dartitulo [@membro] [nome]* ➔ Concede um título (especiais vão para o slot 2, regulares para slot 1).\n🔹 *!addcelestial [@membro]* ➔ Atalho para dar o título especial Celestial (slot 2).\n🔹 *!removoertitulo [@membro] [nome]* ➔ Retira um título de um usuário.\n🔹 *!concederpermissao [@membro] [cmd]* ➔ Dá acesso a comandos ADM para não-adms.\n\n💰 *🪙 CONTROLE ECONÔMICO:*\n🔹 *!addgold [@membro] [quantia]* ➔ Injetar saldo na conta de alguém.\n🔹 *!remgold [@membro] [quantia]* ➔ Aplicar multa e reter dinheiro.\n🔹 *!limpardb* ➔ Reset geral de todas as carteiras de Moedas.\n\n🎨 *🖼️ ESTÉTICA INTERNA:*\n🔹 *!setfoto* [responder imagem] ou [URL] ➔ Define a foto do menu principal.\n🔹 *!nomebot [texto]* ➔ Mudar a alcunha do bot.\n🔹 *!transmitir [texto]* ➔ Envia um aviso para todos os grupos conhecidos.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: textoMenuDono }, { quoted: msg });
            break;
        }

        case 'ping': {
            const start = Date.now();
            const uptimeSeg = process.uptime();
            const uptimeStr = `${Math.floor(uptimeSeg / 3600)}h ${Math.floor((uptimeSeg % 3600) / 60)}m ${Math.floor(uptimeSeg % 60)}s`;
            const memTotal = os.totalmem();
            const memLivre = os.freemem();
            const memUso = ((memTotal - memLivre) / memTotal * 100).toFixed(1);
            const cpuLoad = os.loadavg()[0].toFixed(2);
            const ping = Date.now() - start;

            const pingTxt = `🏓 *PONG!*\n\n⏱️ Latência: ${ping}ms\n⏳ Uptime: ${uptimeStr}\n💾 RAM: ${formatBytes(memTotal - memLivre)} / ${formatBytes(memTotal)} (${memUso}%)\n⚡ CPU Load: ${cpuLoad}\n📦 Node: ${process.version}`;
            await sock.sendMessage(from, { text: pingTxt }, { quoted: msg });
            break;
        }

        case 'backup': {
            try {
                const dbBuffer = Buffer.from(JSON.stringify(db, null, 2), 'utf-8');
                // Envia no privado do dono
                await sock.sendMessage(DONO_OFICIAL, {
                    document: dbBuffer,
                    mimetype: 'application/json',
                    fileName: `backup_${new Date().toISOString().slice(0,10)}.json`
                });
                await sock.sendMessage(from, { text: "📁 *BACKUP:* O banco de dados foi enviado no seu privado, Chefe." }, { quoted: msg });
            } catch (e) {
                console.error('[BACKUP] Erro:', e);
                await sock.sendMessage(from, { text: "❌ Falha ao gerar o backup." }, { quoted: msg });
            }
            break;
        }

        case 'listagrupos': {
            const grupos = Object.keys(db.grupos || {});
            if (grupos.length === 0) {
                return sock.sendMessage(from, { text: "📋 Nenhum grupo conhecido ainda." }, { quoted: msg });
            }
            let lista = `📋 *GRUPOS CONHECIDOS (${grupos.length})*\n\n`;
            for (let i = 0; i < grupos.length; i++) {
                try {
                    const meta = await sock.groupMetadata(grupos[i]);
                    lista += `${i+1}. ${meta.subject} (${grupos[i]})\n`;
                } catch (e) {
                    lista += `${i+1}. ${grupos[i]} (sem acesso)\n`;
                }
            }
            await sock.sendMessage(from, { text: lista }, { quoted: msg });
            break;
        }

        case 'estatisticas': {
            const totalUsuarios = Object.keys(db.usuarios || {}).length;
            const totalGrupos = Object.keys(db.grupos || {}).length;
            let totalGolds = 0;
            Object.values(db.usuarios || {}).forEach(u => {
                totalGolds += (u.golds || 0) + (u.banco || 0);
            });
            const statsTxt = `📊 *ESTATÍSTICAS GERAIS*\n\n👥 Usuários registrados: ${totalUsuarios}\n🌐 Grupos conhecidos: ${totalGrupos}\n🪙 Golds em circulação: ${totalGolds}\n📅 Títulos criados: ${db.config_bot.titulos_criados?.length || 0}`;
            await sock.sendMessage(from, { text: statsTxt }, { quoted: msg });
            break;
        }

        case 'criartitulo': {
            const novoTitulo = args.join(" ").trim();
            if (!novoTitulo) return sock.sendMessage(from, { text: "❌ Insira o nome do título. Ex: `!criartitulo Imperador`" }, { quoted: msg });
            if (db.config_bot.titulos_criados.includes(novoTitulo)) {
                return sock.sendMessage(from, { text: "⚠️ Esse título já está cadastrado." }, { quoted: msg });
            }
            db.config_bot.titulos_criados.push(novoTitulo);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ Título *${novoTitulo}* criado e disponível para concessão.` }, { quoted: msg });
            break;
        }

        case 'dartitulo': {
            const alvo = obterAlvo(msg) || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const tituloParaDar = args.slice(1).join(" ").trim(); // primeiro arg é o @, ignoramos

            if (!alvo || !tituloParaDar) {
                return sock.sendMessage(from, { text: "❌ Uso: *!dartitulo @membro [Nome do Título]*" }, { quoted: msg });
            }
            if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();

            // Lista de títulos especiais (fixos) que vão para o slot 2
            const especiais = ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"];
            if (especiais.includes(tituloParaDar)) {
                // Slot 2 – Título Especial (substitui o que estiver lá)
                db.usuarios[alvo].titulo_slot2 = tituloParaDar;
                db.usuarios[alvo].apresentacao = true; // ativa anúncio automático
                salvarDB(db);
                await sock.sendMessage(from, { text: `👑 *DECRETO REAL:* @${alvo.split('@')[0]} recebeu o título especial 🌟 *${tituloParaDar}* (Slot 2).`, mentions: [alvo] }, { quoted: msg });
            } else {
                // Título regular (slot 1)
                if (!db.config_bot.titulos_criados.includes(tituloParaDar)) {
                    return sock.sendMessage(from, { text: "❌ Esse título não foi criado ainda. Use `!criartitulo` primeiro." }, { quoted: msg });
                }
                db.usuarios[alvo].titulo_slot1 = tituloParaDar;
                salvarDB(db);
                await sock.sendMessage(from, { text: `✅ Título regular *${tituloParaDar}* atribuído a @${alvo.split('@')[0]} (Slot 1).`, mentions: [alvo] }, { quoted: msg });
            }
            break;
        }

        case 'addcelestial': {
            const alvoCelestial = obterAlvo(msg) || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!alvoCelestial) return sock.sendMessage(from, { text: "❌ Marque ou responda a quem receberá o título Celestial." }, { quoted: msg });

            if (!db.usuarios[alvoCelestial]) db.usuarios[alvoCelestial] = criarUsuarioPadrao();
            db.usuarios[alvoCelestial].titulo_slot2 = "Celestial";
            db.usuarios[alvoCelestial].apresentacao = true;
            salvarDB(db);
            await sock.sendMessage(from, { text: `👑 @${alvoCelestial.split('@')[0]} agora possui o título especial *Celestial* (Slot 2)!`, mentions: [alvoCelestial] }, { quoted: msg });
            break;
        }

        case 'removoertitulo': {
            const alvoRemover = obterAlvo(msg) || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const tituloParaRemover = args.slice(1).join(" ").trim();

            if (!alvoRemover || !tituloParaRemover) {
                return sock.sendMessage(from, { text: "❌ Uso: *!removoertitulo @membro [Nome do Título]*" }, { quoted: msg });
            }

            if (db.usuarios[alvoRemover]) {
                const u = db.usuarios[alvoRemover];
                if (u.titulo_slot1 === tituloParaRemover) {
                    u.titulo_slot1 = null;
                } else if (u.titulo_slot2 === tituloParaRemover) {
                    u.titulo_slot2 = null;
                    u.apresentacao = false; // desliga anúncio se não houver mais título especial
                } else {
                    return sock.sendMessage(from, { text: "❌ O membro não possui esse título." }, { quoted: msg });
                }
                salvarDB(db);
                await sock.sendMessage(from, { text: `📉 Título *${tituloParaRemover}* removido de @${alvoRemover.split('@')[0]}.`, mentions: [alvoRemover] }, { quoted: msg });
            }
            break;
        }

        case 'concederpermissao': {
            const alvoPerm = obterAlvo(msg) || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const cmdPerm = args[1] ? args[1].toLowerCase().replace('!', '') : null;

            if (!alvoPerm || !cmdPerm) {
                return sock.sendMessage(from, { text: "❌ Uso: *!concederpermissao @membro [comando]*" }, { quoted: msg });
            }

            if (!db.usuarios[alvoPerm]) db.usuarios[alvoPerm] = criarUsuarioPadrao();
            if (!db.usuarios[alvoPerm].permissoes_especiais) db.usuarios[alvoPerm].permissoes_especiais = [];

            if (!db.usuarios[alvoPerm].permissoes_especiais.includes(cmdPerm)) {
                db.usuarios[alvoPerm].permissoes_especiais.push(cmdPerm);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🔑 Permissão para *!${cmdPerm}* concedida a @${alvoPerm.split('@')[0]}.`, mentions: [alvoPerm] }, { quoted: msg });
            break;
        }

        case 'manutencao': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                return sock.sendMessage(from, { text: "🌊 Use: *!manutencao on* ou *!manutencao off*" }, { quoted: msg });
            }
            db.config_bot.manutencao = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `⚙️ Modo manutenção: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'burlar': {
            if (!db.usuarios[sender]) db.usuarios[sender] = criarUsuarioPadrao();
            db.usuarios[sender].trabalhos_hoje = 0;
            db.usuarios[sender].mineracoes_hoje = 0;
            db.usuarios[sender].pescas_hoje = 0;
            db.usuarios[sender].raspadinhas_hoje = 0;
            salvarDB(db);
            await sock.sendMessage(from, { text: "⚡ *MODO DEUS:* Limites diários zerados para você, Chefe." }, { quoted: msg });
            break;
        }

        case 'desativarcmd': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando desativar. Ex: `!desativarcmd assaltar`" }, { quoted: msg });
            const cmd = args[0].toLowerCase().replace('!', '');
            if (!db.config_bot.comandos_desativados.includes(cmd)) {
                db.config_bot.comandos_desativados.push(cmd);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🚫 Comando *!${cmd}* desativado globalmente.` }, { quoted: msg });
            break;
        }

        case 'ativarcmd': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Diga qual comando reativar." }, { quoted: msg });
            const cmd = args[0].toLowerCase().replace('!', '');
            db.config_bot.comandos_desativados = db.config_bot.comandos_desativados.filter(c => c !== cmd);
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ Comando *!${cmd}* reativado.` }, { quoted: msg });
            break;
        }

        case 'addgold': {
            const alvo = obterAlvo(msg) || (args[0] ? args[0].replace(/\D/g, '') + '@s.whatsapp.net' : null);
            const quantia = parseInt(args[1] || args[0]);
            if (!alvo || isNaN(quantia)) return sock.sendMessage(from, { text: "❌ Uso: *!addgold @membro [quantidade]*" }, { quoted: msg });

            if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();
            db.usuarios[alvo].golds = (db.usuarios[alvo].golds || 0) + quantia;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🪙 *BANCO DE LEICYBOT:* Adicionados *${quantia} 🪙* à conta de @${alvo.split('@')[0]}.`, mentions: [alvo] }, { quoted: msg });
            break;
        }

        case 'remgold': {
            const alvo = obterAlvo(msg) || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const quantia = parseInt(args[1]);
            if (!alvo || isNaN(quantia)) return sock.sendMessage(from, { text: "❌ Uso: *!remgold @membro [quantidade]*" }, { quoted: msg });

            if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();
            db.usuarios[alvo].golds = Math.max(0, (db.usuarios[alvo].golds || 0) - quantia);
            salvarDB(db);
            await sock.sendMessage(from, { text: `📉 Removidas *${quantia} 🪙* da conta de @${alvo.split('@')[0]}.`, mentions: [alvo] }, { quoted: msg });
            break;
        }

        case 'limpardb': {
            db.usuarios = {};
            salvarDB(db);
            await sock.sendMessage(from, { text: "🚨 *RESET GLOBAL:* Todas as carteiras foram zeradas." }, { quoted: msg });
            break;
        }

        case 'setfoto': {
            // Primeiro tenta extrair imagem de uma mensagem respondida
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg?.imageMessage) {
                try {
                    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    // Salva no volume persistente ou caminho local; como fallback, armazena base64 no config
                    // Para simplicidade, vamos converter para base64 e salvar no db.config_bot.url_foto_menu como data URL
                    const base64 = buffer.toString('base64');
                    db.config_bot.url_foto_menu = `data:image/jpeg;base64,${base64}`;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: "🖼️ Foto do menu alterada com sucesso (via imagem respondida)!" }, { quoted: msg });
                    return;
                } catch (e) {
                    console.error('[setfoto] Erro ao processar imagem:', e);
                    // falha, continua para tentar URL
                }
            }

            // Fallback: URL fornecida como argumento
            const url = args.join(" ");
            if (!url) return sock.sendMessage(from, { text: "❌ Responda a uma imagem com `!setfoto` ou forneça uma URL." }, { quoted: msg });
            db.config_bot.url_foto_menu = url;
            salvarDB(db);
            await sock.sendMessage(from, { text: "🖼️ Foto do menu atualizada via URL." }, { quoted: msg });
            break;
        }

        case 'nomebot': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o novo nome do bot." }, { quoted: msg });
            db.config_bot.nome_bot = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: `🤖 Meu nome interno agora é *${args.join(" ")}*.` }, { quoted: msg });
            break;
        }

        case 'transmitir': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o texto da transmissão." }, { quoted: msg });
            const textoTransmissao = `📢 *TRANSMISSÃO OFICIAL DE OLDEN:*\n\n${args.join(" ")}`;
            const gruposConhecidos = Object.keys(db.grupos || {});
            let enviadosOk = 0;
            for (const grupoId of gruposConhecidos) {
                try {
                    await sock.sendMessage(grupoId, { text: textoTransmissao });
                    enviadosOk++;
                } catch (e) { /* ignora */ }
            }
            await sock.sendMessage(from, { text: `📢 Transmissão enviada para *${enviadosOk}* de *${gruposConhecidos.length}* grupo(s).` }, { quoted: msg });
            break;
        }

        case 'reiniciar': {
            await sock.sendMessage(from, { text: "🔄 Reiniciando o servidor... Volto em alguns segundos!" }, { quoted: msg });
            process.exit(0);
            break;
        }

        case 'desligar': {
            db.config_bot.pausado = true;
            salvarDB(db);
            await sock.sendMessage(from, { text: "💤 Bot pausado! Comandos normais serão ignorados até `!ligar`." }, { quoted: msg });
            break;
        }

        case 'ligar': {
            db.config_bot.pausado = false;
            salvarDB(db);
            await sock.sendMessage(from, { text: "🔌 Bot reativado! Todos os sistemas operando. 🌊" }, { quoted: msg });
            break;
        }

        default:
            break;
    }
};