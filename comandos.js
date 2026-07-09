const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economiaModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');

// Definição da função de tratamento de comandos
const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // Captura o texto de forma ampla
        const corpoMensagem = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text || 
                             msg.message.imageMessage?.caption || 
                             msg.message.videoMessage?.caption || "";

        // Sistema de Anúncio Passivo de Títulos (Interatividade a cada mensagem comum)
        if (!corpoMensagem.startsWith('!')) {
            if (db.usuarios[sender] && db.usuarios[sender].apresentacao) {
                const u = db.usuarios[sender];
                if (u.titulo_1 || u.titulo_2) {
                    if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) { // Limite de 3h
                        const textoAnuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_1, u.titulo_2);
                        await sock.sendMessage(from, { text: textoAnuncio }, { quoted: msg });
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
        
        // Inicialização de segurança do usuário no banco
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = { golds: 100, banco: 0, mensagens_contadas: 0, ultimo_mensagem_data: "" };
        }
        db.usuarios[sender].mensagens_contadas += 1;
        salvarDB(db);

        // Verificação: Modo Manutenção Global (Bloqueia todos exceto Olden)
        if (db.config_bot.manutencao && sender !== '258877080511@s.whatsapp.net') {
            return sock.sendMessage(from, { text: "⚠️ *MANUTENÇÃO:* Meus sistemas estão sendo calibrados pelo chefe *Olden*. Volto em breve! 🌊" }, { quoted: msg });
        }

        // Verificação: Comandos banidos/desativados pelo painel
        if (db.config_bot.comandos_desativados.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Desculpe, o comando *!${comandoUnico}* foi desativado globalmente pela administração.` }, { quoted: msg });
        }

        // 🌊 COMANDO PRINCIPAL: !menu
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const fotoOficial = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot-. Escolha uma das centrais de comando abaixo digitando o comando correspondente:\n\n💳 *!menugold* ➔ Painel de Economia, Banco e Lojas Virtuais.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa de Grupo.\n🎮 *!menujogos* ➔ Jogos Sociais, Duelos e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas, Buscas e Downloads.\n\n📖 *💡 DICA SUPREMA:* Ficou com dúvidas sobre algum comando específico? Digite: *!ajuda [nome_do_comando]*\n👉 _Exemplo: !ajuda assaltar_\n░▒▓█████████████████████████████████████▓▒░`;
            
            return await sock.sendMessage(from, { 
                image: { url: fotoOficial }, 
                caption: textoMenuGeral 
            }, { quoted: msg });
        }

        // 🛑 COMANDO UNIVERSAL: !ajuda [comando]
        if (comandoUnico === 'ajuda') {
            const buscaGuia = argumentos[0];
            if (!buscaGuia) {
                return sock.sendMessage(from, { text: "💡 *Dica:* Use o comando detalhando o que quer aprender!\n👉 Exemplo: `!ajuda assaltar` ou `!ajuda sticker`." }, { quoted: msg });
            }
            const explicacaoPronta = ajudaTextos.obterExplicacao(buscaGuia);
            return sock.sendMessage(from, { text: explicacaoPronta }, { quoted: msg });
        }

        // 🗺️ DIRECIONAMENTO DE MÓDULOS SEGURO

        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao'];
        if (cmdsEconomia.includes(comandoUnico)) {
            const executarEconomia = economiaModulo.economiaModulo || economiaModulo.default || economiaModulo;
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
            // Correção: Adicionados os parâmetros db e salvarDB pendentes
            return await executarMidia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        const cmdsDono = ['manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar'];
        if (cmdsDono.includes(comandoUnico)) {
            const executarDono = donoModulo.donoModulo || donoModulo.default || donoModulo;
            return await executarDono(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // Se começar com "!" mas não for um comando existente
        const respostaErrado = interacaoTextos.comandoInexistente();
        await sock.sendMessage(from, { text: respostaErrado }, { quoted: msg });

    } catch (error) {
        console.error("Erro interno no comandos.js: ", error);
    }
};

// Exportação tripla para anular de vez qualquer conflito de importação no index.js
module.exports = lidarComComando;
module.exports.lidarComComando = lidarComComando;
