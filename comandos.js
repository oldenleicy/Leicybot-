// comandos.js
const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economiaModulo = require('./modulos/economia'); // 👈 Alinhado com "i"
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');
const outrosModulo = require('./modulos/outros'); 

const DONO_OFICIAL = '258877080511@s.whatsapp.net';

const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
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
        if (!db.config_bot) db.config_bot = { url_foto_menu: "https://i.imgur.com/Kdf946S.png", manutencao: false, comandos_desativados: [] };

        // Sistema Ativo de Anúncio de Títulos
        if (!corpoMensagem.startsWith('!')) {
            if (db.usuarios[sender]) {
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
            }
            return; 
        }

        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');
        
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = { 
                golds: 100, 
                banco: 0, 
                mensagens_contadas: 0, 
                ultimo_mensagem_data: "",
                bio: "Nenhuma descrição definida ainda. Use !setbio",
                idade: "Não informada",
                estado_civil: "Solteiro(a)",
                casamentos_total: 0,
                advertencias: [],
                titulos_criados: [],
                titulo_especial: null,
                titulo_1: null,
                titulo_2: null,
                apresentacao: false,
                permissoes_especiais: []
            };
        }
        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        salvarDB(db);

        const possuiPermissaoComando = db.usuarios[sender]?.permissoes_especiais?.includes(comandoUnico);

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

        // ECONOMIA
        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao', 'roleta', 'pescar', 'apostar', 'roubar', 'revidar'];
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

        // DIVERSÃO
        const cmdsDiversao = ['menujogos', 'duelo', 'casar', 'aceitar', 'beijar', 'bater', 'abracar', 'gado', 'gostoso', 'curiosidade'];
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

        // OUTROS
        const cmdsOutros = ['menuoutros', 'perfil', 'setbio', 'setidade', 'marcarcasamento', 'divorciar'];
        if (cmdsOutros.includes(comandoUnico)) {
            const executarOutros = outrosModulo.outrosModulo || outrosModulo.default || outrosModulo;
            return await executarOutros(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // DONO
        const cmdsDono = ['menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar', 'criartitulo', 'dartitulo', 'removoertitulo', 'concederpermissao'];
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
