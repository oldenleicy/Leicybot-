const path = require('path');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economyModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');
const outrosModulo = require('./modulos/outros'); // 👈 Nova central importada com sucesso

const DONO_OFICIAL = '258877080511@s.whatsapp.net';

const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        let sender = msg.key.participant || msg.key.remoteJid;
        
        // 🛠️ CORREÇÃO CRÍTICA: Limpa o ID do remetente na raiz de execução
        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        // Captura o texto de forma ampla e segura
        const corpoMensagem = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text || 
                             msg.message.imageMessage?.caption || 
                             msg.message.videoMessage?.caption || "";

        // Inicialização preventiva do banco de dados abrangente
        if (!db) db = { usuarios: {}, grupos: {}, config_bot: {} };
        if (!db.usuarios) db.usuarios = {};
        if (!db.config_bot) db.config_bot = { url_foto_menu: "https://i.imgur.com/Kdf946S.png", manutencao: false, comandos_desativados: [] };

        // 👑 Sistema Ativo Avançado de Anúncio Passivo de Títulos Especiais e Globais
        if (!corpoMensagem.startsWith('!')) {
            if (db.usuarios[sender]) {
                const u = db.usuarios[sender];
                // Verifica se possui títulos especiais ou normais configurados para saudação ativa
                if (u.titulo_especial || u.titulo_1 || u.titulo_2) {
                    if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) { // Cooldown de 3 horas
                        let txtAnuncio = "";
                        if (u.titulo_especial) {
                            txtAnuncio = `🌊 *PRESENÇA ILUSTRE:* O portador do título especial 🌟 *${u.titulo_especial}* acabou de interagir no chat! Respeitem a sua história. 🪙`;
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

        // Separação de comandos e argumentos
        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');
        
        // Registro seguro de estatísticas com o novo padrão monetário 🪙
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
                permissoes_especiais: []
            };
        }
        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        salvarDB(db);

        // Verificação de bypass: Membros com permissão concedida pelo Dono burlam travas comuns de comandos
        const possuiPermissaoComando = db.usuarios[sender]?.permissoes_especiais?.includes(comandoUnico);

        // Verificação: Modo Manutenção Global (Apenas o Dono passa)
        if (db.config_bot.manutencao && sender !== DONO_OFICIAL) {
            return sock.sendMessage(from, { text: "⚠️ *MANUTENÇÃO:* Meus sistemas estão sendo calibrados pelo chefe *Olden*. Volto em breve! 🌊" }, { quoted: msg });
        }

        // Verificação: Comandos desativados
        if (db.config_bot.comandos_desativados && db.config_bot.comandos_desativados.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 Desculpe, o comando *!${comandoUnico}* foi desativado globalmente pela administração.` }, { quoted: msg });
        }

        // 🌊 COMANDO PRINCIPAL EXPANSO: !menu / !help
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const fotoOficial = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot. Escolha uma das centrais de comando abaixo digitando o comando correspondente:\n\n🪙 *!menugold* ➔ Painel de Economia Reais, Cassino e Jogos.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação, Defesa e Advertências.\n🎮 *!menujogos* ➔ Jogos Sociais, Duelos e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas, Letras e Consultas Reais.\n📊 *!menuoutros* ➔ Perfil Customizado, Bios, Casamentos e Status.\n👑 *!menudono* ➔ Títulos Especiais, Permissões e Configurações de Elite.\n\n📖 *💡 DICA SUPREMA:* Ficou com dúvidas sobre algum comando específico? Digite: *!ajuda [nome_do_comando]*\n░▒▓█████████████████████████████████████▓▒░`;
            
            try {
                return await sock.sendMessage(from, { image: { url: fotoOficial }, caption: textoMenuGeral }, { quoted: msg });
            } catch (e) {
                return await sock.sendMessage(from, { text: textoMenuGeral }, { quoted: msg });
            }
        }

        // 🛑 COMANDO UNIVERSAL: !ajuda [comando]
        if (comandoUnico === 'ajuda') {
            const buscaGuia = argumentos[0];
            if (!buscaGuia) {
                return sock.sendMessage(from, { text: "💡 *Dica:* Use o comando detalhando o que quer aprender!\n👉 Exemplo: `!ajuda perfil`." }, { quoted: msg });
            }
            const explicacaoPronta = ajudaTextos.obterExplicacao(buscaGuia);
            return sock.sendMessage(from, { text: explicacaoPronta }, { quoted: msg });
        }

        // 🗺️ DIRECIONAMENTO E FILTRAGEM DINÂMICA DE MÓDULOS

        // 🪙 CENTRAL DE ECONOMIA & APOSTAS REAIS
        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao', 'roleta', 'pescar', 'apostar', 'roubar', 'revidar'];
        if (cmdsEconomia.includes(comandoUnico)) {
            const executarEconomia = economyModulo.economiaModulo || economyModulo.default || economyModulo;
            return await executarEconomia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // 🛡️ CENTRAL DE ADMINISTRAÇÃO & INFRAÇÕES
        const cmdsAdm = ['menuadm', 'ban', 'kick', 'promover', 'rebaixar', 'antilink', 'antilink2', 'fakes', 'grupo', 'limpar', 'marcar', 'adms', 'setregras', 'regras', 'setwelcome1', 'setwelcome2', 'setwelcome3', 'bv1', 'bv2', 'bv3', 'atividade', 'online', 'boasvindas', 'adv'];
        if (cmdsAdm.includes(comandoUnico)) {
            // Permite execução se for ADM nativo OU se possuir a credencial concedida pelo dono
            const executarAdm = admModulo.admModulo || admModulo.default || admModulo;
            return await executarAdm(sock, msg, comandoUnico, argumentos, db, salvarDB, possuiPermissaoComando);
        }

        // 🎮 CENTRAL DE DIVERSÃO
        const cmdsDiversao = ['menujogos', 'duelo', 'casar', 'aceitar', 'beijar', 'bater', 'abracar', 'gado', 'gostoso', 'curiosidade'];
        if (cmdsDiversao.includes(comandoUnico)) {
            const executarDiversao = diversaoModulo.diversaoModulo || diversaoModulo.default || diversaoModulo;
            return await executarDiversao(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // 🎵 CENTRAL DE MÍDIA & CONSULTAS EXTERNAS REAIS
        const cmdsMidia = ['menumidia', 'sticker', 's', 'copiarsticker', 'anime', 'clima', 'google', 'wikipedia', 'letra', 'qrcode', 'encurtar', 'definicao', 'frase', 'pinterest', 'wallpaper', 'play', 'video'];
        if (cmdsMidia.includes(comandoUnico)) {
            const executarMidia = midiaModulo.midiaModulo || midiaModulo.default || midiaModulo;
            return await executarMidia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // 📊 NOVA CENTRAL: OUTROS (PERFIL & PERSONALIZAÇÃO)
        const cmdsOutros = ['menuoutros', 'perfil', 'setbio', 'setidade', 'marcarcasamento', 'divorciar'];
        if (cmdsOutros.includes(comandoUnico)) {
            const executarOutros = outrosModulo.outrosModulo || outrosModulo.default || outrosModulo;
            return await executarOutros(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // 👑 CENTRAL EXCLUSIVA DE SUPREMACIA DO DONO
        const cmdsDono = ['menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar', 'criartitulo', 'dartitulo', 'removoertitulo', 'concederpermissao'];
        if (cmdsDono.includes(comandoUnico)) {
            if (sender !== DONO_OFICIAL) {
                return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Este painel é restrito apenas ao meu criador oficial *Olden*! 👑" }, { quoted: msg });
            }
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
