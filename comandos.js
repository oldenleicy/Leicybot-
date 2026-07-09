const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economyModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');

// Definição da função de tratamento de comandos
const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // Captura o texto de forma ampla e segura
        const corpoMensagem = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text || 
                             msg.message.imageMessage?.caption || 
                             msg.message.videoMessage?.caption || "";

        // Inicialização preventiva do banco de dados para evitar travar o escopo
        if (!db) db = { usuarios: {}, grupos: {}, config_bot: {} };
        if (!db.usuarios) db.usuarios = {};
        if (!db.config_bot) db.config_bot = { url_foto_menu: "https://i.imgur.com/Kdf946S.png", manutencao: false, comandos_desativados: [] };

        // Sistema de Anúncio Passivo de Títulos
        if (!corpoMensagem.startsWith('!')) {
            if (db.usuarios[sender] && db.usuarios[sender].apresentacao) {
                const u = db.usuarios[sender];
                if (u.titulo_1 || u.titulo_2) {
                    if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) {
                        const textoAnuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_1, u.titulo_2);
                        await sock.sendMessage(from, { text: textoAnuncio }, { quoted: msg }).catch(() => {});
                        u.ultimo_anuncio = Date.now();
                        salvarDB(db);
                    }
                }
            }
            return; 
        }

        // Separação de comandos e argumentos
        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');
        
        // Registro seguro de estatísticas
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = { golds: 100, banco: 0, mensagens_contadas: 0, ultimo_mensagem_data: "" };
        }
        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        salvarDB(db);

        // Verificação: Modo Manutenção Global
        if (db.config_bot.manutencao && sender !== '258877080511@s.whatsapp.net') {
            return sock.sendMessage(from, { text: "⚠️ *MANUTENÇÃO:* Meus sistemas estão sendo calibrados pelo chefe *Olden*. Volto em breve! 🌊" }, { quoted: msg });
        }

        // Verificação: Comandos desativados
        if (db.config_bot.comandos_desativados && db.config_bot.comandos_desativados.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Desculpe, o comando *!${comandoUnico}* foi desativado globalmente pela administração.` }, { quoted: msg });
        }

        // 🌊 COMANDO PRINCIPAL EXPANSO: !menu / !help
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const fotoOficial = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot-. Escolha uma das centrais de comando abaixo digitando o comando correspondente:\n\n💳 *!menugold* ➔ Painel de Economia, Banco e Lojas Virtuais.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa de Grupo.\n🎮 *!menujogos* ➔ Jogos Sociais, Duelos e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas, Buscas e Downloads.\n👑 *!menudono* ➔ Painel Administrativo de Desenvolvedor.\n\n📖 *💡 DICA SUPREMA:* Ficou com dúvidas sobre algum comando específico? Digite: *!ajuda [nome_do_comando]*\n\n📋 𝗟𝗜𝗦𝗧𝗔 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗔 𝗗𝗘 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦:\n\n🔹 *ECONOMIA:* gold, saldo, carteira, trabalhar, minerar, assaltar, banco, pagar, rankgold, loja, comprar, vendertitulo, apresentacao.\n\n🔹 *MODERAÇÃO:* ban, kick, promover, rebaixar, antilink, antilink2, fakes, grupo, limpar, marcar, adms, setregras, regras, atividade, online, setwelcome1, setwelcome2, setwelcome3, bv1, bv2, bv3.\n\n🔹 *DIVERSÃO:* duelo, casar, aceitar, divorciar, beijar, bater, abracar, gado, gostoso, curiosidade.\n\n🔹 *MÍDIA & BUSCAS:* sticker, s, copiarsticker, anime, clima, google.\n\n🔹 *DONO/DEV:* manutencao, burlar, desativarcmd, ativarcmd, addgold, remgold, addcelestial, setfoto, nomebot, limpardb, transmitir, reiniciar, desligar.\n░▒▓█████████████████████████████████████▓▒░`;
            
            return await sock.sendMessage(from, { 
                image: { url: fotoOficial }, 
                caption: textoMenuGeral 
            }, { quoted: msg });
        }

        // 🛑 COMANDO UNIVERSAL: !ajuda [comando]
        if (comandoUnico === 'ajuda') {
            const buscaGuia = argumentos[0];
            if (!buscaGuia) {
                return sock.sendMessage(from, { text: "💡 *Dica:* Use o comando detalhando o que quer aprender!\n👉 Exemplo: `!ajuda assaltar`." }, { quoted: msg });
            }
            const explicacaoPronta = ajudaTextos.obterExplicacao(buscaGuia);
            return sock.sendMessage(from, { text: explicacaoPronta }, { quoted: msg });
        }

        // 🗺️ DIRECIONAMENTO DE MÓDULOS

        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao'];
        if (cmdsEconomia.includes(comandoUnico)) {
            const executarEconomia = economyModulo.economiaModulo || economyModulo.default || economyModulo;
            return await executarEconomia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const cmdsAdm = ['menuadm', 'ban', 'kick', 'promover', 'rebaixar', 'antilink', 'antilink2', 'fakes', 'grupo', 'limpar', 'marcar', 'adms', 'setregras', 'regras', 'setwelcome1', 'setwelcome2', 'setwelcome3', 'bv1', 'bv2', 'bv3', 'atividade', 'online'];
        if (cmdsAdm.includes(comandoUnico)) {
            const executarAdm = admModulo.admModulo || admModulo.default || admModulo;
            return await executarAdm(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const cmdsDiversao = ['menujogos', 'duelo', 'casar', 'aceitar', 'divorciar', 'beijar', 'bater', 'abracar', 'gado', 'gostoso', 'curiosidade'];
        if (cmdsDiversao.includes(comandoUnico)) {
            const executarDiversao = diversaoModulo.diversaoModulo || diversaoModulo.default || diversaoModulo;
            return await executarDiversao(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const cmdsMidia = ['menumidia', 'sticker', 's', 'copiarsticker', 'anime', 'clima', 'google'];
        if (cmdsMidia.includes(comandoUnico)) {
            const executarMidia = midiaModulo.midiaModulo || midiaModulo.default || midiaModulo;
            return await executarMidia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const cmdsDono = ['menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar'];
        if (cmdsDono.includes(comandoUnico)) {
            const executarDono = donoModulo.donoModulo || donoModulo.default || donoModulo;
            return await executarDono(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // Se começar com "!" mas não pertencer a nenhuma array acima
        const respostaErrado = interacaoTextos.comandoInexistente();
        await sock.sendMessage(from, { text: respostaErrado }, { quoted: msg });

    } catch (error) {
        console.error("Erro interno detectado no comandos.js: ", error);
    }
};

module.exports = lidarComComando;
module.exports.lidarComComando = lidarComComando;
