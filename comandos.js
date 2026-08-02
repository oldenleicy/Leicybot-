// comandos.js
const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');
const criarUsuarioPadrao = require('./modulos/usuarioPadrao');
const { resolverIdentidade } = require('./modulos/jidUtils');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economiaModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');
const outrosModulo = require('./modulos/outros');

const DONO_OFICIAL = '258877080511@s.whatsapp.net';
const REGEX_LINK = /https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\//i;

// Trava anti-duplo-clique
const locks = new Map();

const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        let sender = resolverIdentidade(msg.key);

        if (!db) db = { usuarios: {}, grupos: {}, config_bot: {} };
        if (!db.usuarios) db.usuarios = {};
        if (!db.grupos) db.grupos = {};
        if (!db.config_bot) {
            db.config_bot = {
                nome_bot: "LeicyBot",
                url_foto_menu: "https://i.imgur.com/Kdf946S.png",
                manutencao: false,
                pausado: false,
                comandos_desativados: [],
                titulos_criados: ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"],
                ddi_permitido: "258"
            };
        }

        if (!db.usuarios[sender]) {
            db.usuarios[sender] = criarUsuarioPadrao();
        }

        const corpoMensagem = msg.message.conversation ||
                             msg.message.extendedTextMessage?.text ||
                             msg.message.imageMessage?.caption ||
                             msg.message.videoMessage?.caption || "";

        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        db.usuarios[sender].ultima_interacao = Date.now();

        // Antilink (mantido aqui)
        if (isGroup) {
            const gConfig = db.grupos[from] || {};
            if ((gConfig.antilink || gConfig.antilink2) && REGEX_LINK.test(corpoMensagem)) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                    const admsGrupo = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                    const botIsAdmin = admsGrupo.includes(botId);
                    const senderIsAdmin = admsGrupo.includes(sender);

                    if (!senderIsAdmin && botIsAdmin) {
                        await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                        if (gConfig.antilink2) {
                            await sock.groupParticipantsUpdate(from, [sender], "remove").catch(() => {});
                            await sock.sendMessage(from, { text: `🚨 Link detectado! @${sender.split('@')[0]} foi banido (Anti-Link Modo Hard).`, mentions: [sender] });
                        } else {
                            await sock.sendMessage(from, { text: `🛡️ Link apagado! @${sender.split('@')[0]}, links não são permitidos.`, mentions: [sender] });
                        }
                    }
                } catch (e) {
                    console.error('[ANTILINK] Erro:', e.message);
                }
                return;
            }
        }

        // Bônus diário e anúncio de título (mensagens que NÃO são comandos)
        if (!corpoMensagem.startsWith('!')) {
            const hoje = new Date().toLocaleDateString();
            const u = db.usuarios[sender];
            if (u.ultimo_bonus_data !== hoje) {
                u.ultimo_bonus_data = hoje;
                u.golds = (u.golds || 0) + 20;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🌅 *BÔNUS DIÁRIO:* +20 🪙 por estar ativo hoje!` }, { quoted: msg }).catch(() => {});
            }

            // Anúncio de título (usa titulo_1 e titulo_2)
            if ((u.titulo_1 || u.titulo_2) && (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000)) {
                const anuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_1, u.titulo_2);
                if (anuncio) {
                    await sock.sendMessage(from, { text: anuncio }, { quoted: msg }).catch(() => {});
                    u.ultimo_anuncio = Date.now();
                    salvarDB(db);
                }
            }
            salvarDB(db);
            return;
        }

        // ═══════ COMANDOS ═══════
        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');

        const possuiPermissaoComando = db.usuarios[sender]?.permissoes_especiais?.includes(comandoUnico);

        const gConfig = db.grupos[from] || {};
        if (isGroup && gConfig.comandos_bloqueados?.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Comando *!${comandoUnico}* desativado neste grupo.` }, { quoted: msg });
        }

        if (db.config_bot.pausado && sender !== DONO_OFICIAL) return;
        if (db.config_bot.manutencao && sender !== DONO_OFICIAL) {
            return sock.sendMessage(from, { text: "⚠️ *MANUTENÇÃO:* Meus sistemas estão sendo calibrados pelo chefe *Olden*. Volto em breve! 🌊" }, { quoted: msg });
        }
        if (db.config_bot.comandos_desativados?.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Comando *!${comandoUnico}* desativado globalmente.` }, { quoted: msg });
        }

        const executarComTrava = async (fn) => {
            while (locks.get(sender)) await locks.get(sender);
            const promise = fn().finally(() => locks.delete(sender));
            locks.set(sender, promise);
            return promise;
        };

        // ═══ ROTEAMENTO ═══
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const foto = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const menu = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot. Escolha uma das centrais de comando abaixo:\n\n🪙 *!menugold* ➔ Painel de Economia Reais, Cassino e Jogos.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa.\n🎮 *!menujogos* ➔ Jogos Sociais e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas e Letras.\n📊 *!menuoutros* ➔ Perfil Customizado e Status.\n👑 *!menudono* ➔ Títulos Especiais e Configurações de Elite.\n\n📖 *💡 DICA:* Ficou com dúvidas? Digite: *!ajuda [comando]*\n░▒▓█████████████████████████████████████▓▒░`;
            try {
                return await sock.sendMessage(from, { image: { url: foto }, caption: menu }, { quoted: msg });
            } catch (e) {
                return await sock.sendMessage(from, { text: menu }, { quoted: msg });
            }
        }

        if (comandoUnico === 'meujid') {
            const diag = `🔎 *DIAGNÓSTICO*\nparticipant: ${msg.key.participant || '(vazio)'}\nremoteJid: ${msg.key.remoteJid}\nResolvido: ${sender}`;
            return sock.sendMessage(from, { text: diag }, { quoted: msg });
        }

        if (comandoUnico === 'ajuda') {
            const guia = argumentos[0];
            if (!guia) return sock.sendMessage(from, { text: "💡 Use: `!ajuda [comando]`" }, { quoted: msg });
            return sock.sendMessage(from, { text: ajudaTextos.obterExplicacao(guia) }, { quoted: msg });
        }

        // Economia
        const cmdsEcon = ['menugold','gold','saldo','carteira','trabalhar','minerar','assaltar','banco','pagar','rankgold','loja','comprar','vendertitulo','apresentacao','roleta','slots','apostar','dados','pescar','raspadinha','roubar','revidar','emprestar','investir','resgatar','usar'];
        if (cmdsEcon.includes(comandoUnico)) {
            return executarComTrava(() => economiaModulo(sock, msg, comandoUnico, argumentos, db, salvarDB));
        }

        // ADM
        const cmdsAdm = ['menuadm','ban','kick','promover','rebaixar','antilink','antilink2','fakes','grupo','limpar','marcar','adms','setregras','regras','setwelcome1','setwelcome2','setwelcome3','bv1','bv2','bv3','atividade','online','boasvindas','adv','antimidia','mutar','antipalavra','antiflood','modolento','inativos','bloquearcmd','config','limparmsg','fechar'];
        if (cmdsAdm.includes(comandoUnico)) {
            return executarComTrava(() => admModulo(sock, msg, comandoUnico, argumentos, db, salvarDB, possuiPermissaoComando));
        }

        // Diversão
        const cmdsDiv = ['menujogos','duelo','casar','aceitar','divorciar','beijar','bater','abracar','gado','gostoso','curiosidade'];
        if (cmdsDiv.includes(comandoUnico)) {
            return executarComTrava(() => diversaoModulo(sock, msg, comandoUnico, argumentos, db, salvarDB));
        }

        // Mídia
        const cmdsMid = ['menumidia','sticker','s','sticker-','s-','attp','copiarsticker','anime','clima','google','wikipedia','letra','qrcode','encurtar','definicao','frase','pinterest','wallpaper','play','video'];
        if (cmdsMid.includes(comandoUnico)) {
            return executarComTrava(() => midiaModulo(sock, msg, comandoUnico, argumentos, db, salvarDB));
        }

        // Outros
        const cmdsOut = ['menuoutros','perfil','setbio','setidade'];
        if (cmdsOut.includes(comandoUnico)) {
            return executarComTrava(() => outrosModulo(sock, msg, comandoUnico, argumentos, db, salvarDB));
        }

        // Dono
        const cmdsDono = ['menudono','manutencao','burlar','desativarcmd','ativarcmd','addgold','remgold','addcelestial','setfoto','nomebot','limpardb','transmitir','reiniciar','desligar','ligar','criartitulo','dartitulo','removoertitulo','concederpermissao','ping','backup','listagrupos','estatisticas'];
        if (cmdsDono.includes(comandoUnico)) {
            if (sender !== DONO_OFICIAL) return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Restrito ao meu criador oficial *Olden*! 👑" }, { quoted: msg });
            return executarComTrava(() => donoModulo(sock, msg, comandoUnico, argumentos, db, salvarDB));
        }

        await sock.sendMessage(from, { text: interacaoTextos.comandoInexistente() }, { quoted: msg });

    } catch (error) {
        console.error("Erro interno no comandos.js: ", error);
    }
};

module.exports = lidarComComando;
module.exports.lidarComComando = lidarComComando;