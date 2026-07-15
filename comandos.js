// comandos.js
const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');
const criarUsuarioPadrao = require('./modulos/usuarioPadrao');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economiaModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');
const outrosModulo = require('./modulos/outros');

const DONO_OFICIAL = '258877080511@s.whatsapp.net';

// Regex simples para detectar links comuns e convites de grupo do WhatsApp
const REGEX_LINK = /https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\//i;

const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        let sender = msg.key.participant || msg.key.remoteJid;

        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        const corpoMensagem = msg.message.conversation ||
                             msg.message.extendedTextMessage?.text ||
                             msg.message.imageMessage?.caption ||
                             msg.message.videoMessage?.caption || "";

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

        // Conta TODA mensagem (não só comandos) e marca a última interação —
        // isso alimenta o !atividade e o !online do adm.js corretamente.
        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        db.usuarios[sender].ultima_interacao = Date.now();
        salvarDB(db);

        // Mensagens que NÃO são comando: checa antilink e anúncio de título, e para por aqui
        if (!corpoMensagem.startsWith('!')) {
            if (isGroup) {
                const gConfig = db.grupos[from];
                if (gConfig && (gConfig.antilink || gConfig.antilink2) && REGEX_LINK.test(corpoMensagem)) {
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
                                await sock.sendMessage(from, { text: `🚨 Link detectado! @${sender.split('@')[0]} foi banido (Anti-Link Modo Hard ativo).`, mentions: [sender] });
                            } else {
                                await sock.sendMessage(from, { text: `🛡️ Link apagado! @${sender.split('@')[0]}, links comuns não são permitidos aqui.`, mentions: [sender] });
                            }
                        }
                    } catch (e) {
                        console.error('[ANTILINK] Erro ao processar:', e.message);
                    }
                    return;
                }
            }

            const u = db.usuarios[sender];
            if (u.titulo_especial || u.titulo_1 || u.titulo_2) {
                if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) {
                    let txtAnuncio = "";
                    if (u.titulo_especial) {
                        txtAnuncio = `🌊 *PRESENÇA ILUSTRE:* O portador do título especial 🌟 *${u.titulo_especial}* acabou de interagir no chat!🪙`;
                    } else {
                        txtAnuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_1, u.titulo_2);
                    }
                    await sock.sendMessage(from, { text: txtAnuncio }, { quoted: msg }).catch(() => {});
                    u.ultimo_anuncio = Date.now();
                    salvarDB(db);
                }
            }
            return;
        }

        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');

        const possuiPermissaoComando = db.usuarios[sender]?.permissoes_especiais?.includes(comandoUnico);

        // Bot pausado manualmente pelo dono (!desligar / !ligar) — ignora tudo, silenciosamente
        if (db.config_bot.pausado && sender !== DONO_OFICIAL) {
            return;
        }

        if (db.config_bot.manutencao && sender !== DONO_OFICIAL) {
            return sock.sendMessage(from, { text: "⚠️ *MANUTENÇÃO:* Meus sistemas estão sendo calibrados pelo chefe *Olden*. Volto em breve! 🌊" }, { quoted: msg });
        }

        if (db.config_bot.comandos_desativados && db.config_bot.comandos_desativados.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Desculpe, o comando *!${comandoUnico}* foi desativado globalmente pela administração.` }, { quoted: msg });
        }

        // !menu / !help
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const fotoOficial = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot. Escolha uma das centrais de comando abaixo:\n\n🪙 *!menugold* ➔ Painel de Economia Reais, Cassino e Jogos.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa.\n🎮 *!menujogos* ➔ Jogos Sociais e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas e Letras.\n📊 *!menuoutros* ➔ Perfil Customizado e Status.\n👑 *!menudono* ➔ Títulos Especiais e Configurações de Elite.\n\n📖 *💡 DICA:* Ficou com dúvidas? Digite: *!ajuda [comando]*\n░▒▓█████████████████████████████████████▓▒░`;

            try {
                return await sock.sendMessage(from, { image: { url: fotoOficial }, caption: textoMenuGeral }, { quoted: msg });
            } catch (e) {
                return await sock.sendMessage(from, { text: textoMenuGeral }, { quoted: msg });
            }
        }

        if (comandoUnico === 'ajuda') {
            const buscaGuia = argumentos[0];
            if (!buscaGuia) {
                return sock.sendMessage(from, { text: "💡 *Dica:* Use o comando detalhando o que quer aprender!\n👉 Exemplo: `!ajuda perfil`." }, { quoted: msg });
            }
            const explicacaoPronta = ajudaTextos.obterExplicacao(buscaGuia);
            return sock.sendMessage(from, { text: explicacaoPronta }, { quoted: msg });
        }

        // ECONOMIA (removi roleta/pescar/apostar/roubar/revidar: estavam na lista mas não existem em economia.js — caiam em silêncio total)
        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao'];
        if (cmdsEconomia.includes(comandoUnico)) {
            const executarEconomia = economiaModulo.economiaModulo || economiaModulo.default || economiaModulo;
            return await executarEconomia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // ADM
        const cmdsAdm = ['menuadm', 'ban', 'kick', 'promover', 'rebaixar', 'antilink', 'antilink2', 'fakes', 'grupo', 'limpar', 'marcar', 'adms', 'setregras', 'regras', 'setwelcome1', 'setwelcome2', 'setwelcome3', 'bv1', 'bv2', 'bv3', 'atividade', 'online', 'boasvindas', 'adv'];
        if (cmdsAdm.includes(comandoUnico)) {
            const executarAdm = admModulo.admModulo || admModulo.default || admModulo;
            return await executarAdm(sock, msg, comandoUnico, argumentos, db, salvarDB, possuiPermissaoComando);
        }

        // DIVERSÃO ('divorciar' movido para cá — antes estava em OUTROS e nunca era executado de verdade)
        const cmdsDiversao = ['menujogos', 'duelo', 'casar', 'aceitar', 'divorciar', 'beijar', 'bater', 'abracar', 'gado', 'gostoso', 'curiosidade'];
        if (cmdsDiversao.includes(comandoUnico)) {
            const executarDiversao = diversaoModulo.diversaoModulo || diversaoModulo.default || diversaoModulo;
            return await executarDiversao(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // MÍDIA
        const cmdsMidia = ['menumidia', 'sticker', 's', 'copiarsticker', 'anime', 'clima', 'google', 'wikipedia', 'letra', 'qrcode', 'encurtar', 'definicao', 'frase', 'pinterest', 'wallpaper', 'play', 'video'];
        if (cmdsMidia.includes(comandoUnico)) {
            const executarMidia = midiaModulo.midiaModulo || midiaModulo.default || midiaModulo;
            return await executarMidia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // OUTROS ('marcarcasamento' e 'divorciar' removidos daqui — ver DIVERSÃO acima)
        const cmdsOutros = ['menuoutros', 'perfil', 'setbio', 'setidade'];
        if (cmdsOutros.includes(comandoUnico)) {
            const executarOutros = outrosModulo.outrosModulo || outrosModulo.default || outrosModulo;
            return await executarOutros(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // DONO ('ligar' adicionado como par do '!desligar')
        const cmdsDono = ['menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar', 'ligar', 'criartitulo', 'dartitulo', 'removoertitulo', 'concederpermissao'];
        if (cmdsDono.includes(comandoUnico)) {
            if (sender !== DONO_OFICIAL) {
                return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Restrito ao meu criador oficial *Olden*! 👑" }, { quoted: msg });
            }
            const executarDono = donoModulo.donoModulo || donoModulo.default || donoModulo;
            return await executarDono(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const respostaErrado = interacaoTextos.comandoInexistente();
        await sock.sendMessage(from, { text: respostaErrado }, { quoted: msg });

    } catch (error) {
        console.error("Erro interno detectado no comandos.js: ", error);
    }
};

module.exports = lidarComComando;
module.exports.lidarComComando = lidarComComando;
