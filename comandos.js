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

// Regex simples para detectar links comuns e convites de grupo do WhatsApp
const REGEX_LINK = /https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\//i;

// Trava anti-duplo-clique por usuário (evita processar dois comandos simultâneos do mesmo sender)
const locks = new Map();

const lidarComComando = async (sock, msg, db, salvarDB) => {
    try {
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        let sender = resolverIdentidade(msg.key);

        // Inicializações preventivas do banco
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

        // Atualiza contagem de mensagens e última interação (antes de qualquer filtro)
        db.usuarios[sender].mensagens_contadas = (db.usuarios[sender].mensagens_contadas || 0) + 1;
        db.usuarios[sender].ultima_interacao = Date.now();

        // Verificações de moderação que se aplicam a TODAS as mensagens (comandos ou não)
        if (isGroup) {
            const gConfig = db.grupos[from] || {};

            // 1. Mute temporário (silencia membro, apaga mensagens)
            if (db.usuarios[sender].mutado_ate && db.usuarios[sender].mutado_ate > Date.now()) {
                await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                return; // silenciosamente ignora a mensagem
            }

            // 2. Slow mode (uma mensagem a cada X segundos)
            if (gConfig.slowmode_segundos && !db.usuarios[sender].ultima_mensagem_slow) {
                // primeira mensagem, permite e registra timestamp
                db.usuarios[sender].ultima_mensagem_slow = Date.now();
            } else if (gConfig.slowmode_segundos) {
                const agora = Date.now();
                const ultima = db.usuarios[sender].ultima_mensagem_slow;
                const intervalo = gConfig.slowmode_segundos * 1000;
                if (agora - ultima < intervalo) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    // opcional: avisar o usuário no privado? Melhor não floodar.
                    return;
                }
                db.usuarios[sender].ultima_mensagem_slow = agora;
            }

            // 3. Antiflood (limite de mensagens em X segundos)
            if (gConfig.antiflood && gConfig.antiflood.max > 0) {
                const agora = Date.now();
                if (!db.usuarios[sender].historico_mensagens) db.usuarios[sender].historico_mensagens = [];
                // limpa timestamps antigos
                db.usuarios[sender].historico_mensagens = db.usuarios[sender].historico_mensagens.filter(ts => agora - ts < gConfig.antiflood.intervalo * 1000);
                db.usuarios[sender].historico_mensagens.push(agora);
                if (db.usuarios[sender].historico_mensagens.length > gConfig.antiflood.max) {
                    // punição: mutar por 5 minutos (padrão)
                    const muteTempo = gConfig.antiflood.acao === 'mute' ? 5 * 60 * 1000 : 0;
                    if (muteTempo > 0) {
                        db.usuarios[sender].mutado_ate = agora + muteTempo;
                        await sock.sendMessage(from, { text: `🤫 @${sender.split('@')[0]} foi silenciado por 5 minutos por flood.`, mentions: [sender] }).catch(() => {});
                    }
                    // apaga as mensagens excedentes? A mensagem atual será apagada abaixo.
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    salvarDB(db);
                    return;
                }
            }

            // 4. Antimidia: bloqueia mídias de não-admins
            if (gConfig.antimidia && (msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.stickerMessage || msg.message.documentMessage)) {
                const groupMetadata = await sock.groupMetadata(from);
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const admsGrupo = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                const senderIsAdmin = admsGrupo.includes(sender);
                if (!senderIsAdmin && sender !== DONO_OFICIAL) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    // não notifica para evitar flood
                    return;
                }
            }

            // 5. Antipalavra: filtra palavras proibidas
            if (gConfig.palavras_proibidas && gConfig.palavras_proibidas.length > 0) {
                const textoMinusculo = corpoMensagem.toLowerCase();
                const proibida = gConfig.palavras_proibidas.some(palavra => textoMinusculo.includes(palavra.toLowerCase()));
                if (proibida) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    // opcional: advertir
                    return;
                }
            }
        }

        // Bônus diário automático (primeira mensagem não-comando do dia)
        if (!corpoMensagem.startsWith('!')) {
            const hoje = new Date().toLocaleDateString();
            if (db.usuarios[sender].ultimo_bonus_data !== hoje) {
                db.usuarios[sender].ultimo_bonus_data = hoje;
                db.usuarios[sender].golds = (db.usuarios[sender].golds || 0) + 20;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🌅 *BÔNUS DIÁRIO:* Você recebeu +20 🪙 por estar ativo hoje!` }, { quoted: msg }).catch(() => {});
            }

            // Anúncio de títulos (já existente, mantido)
            const u = db.usuarios[sender];
            if (u.titulo_especial || u.titulo_slot1 || u.titulo_slot2) {
                if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) {
                    let txtAnuncio = "";
                    if (u.titulo_especial) {
                        txtAnuncio = `🌊 *PRESENÇA ILUSTRE:* O portador do título especial 🌟 *${u.titulo_especial}* acabou de interagir no chat!🪙`;
                    } else if (u.titulo_slot1 || u.titulo_slot2) {
                        txtAnuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_slot1, u.titulo_slot2);
                    }
                    if (txtAnuncio) {
                        await sock.sendMessage(from, { text: txtAnuncio }, { quoted: msg }).catch(() => {});
                        u.ultimo_anuncio = Date.now();
                        salvarDB(db);
                    }
                }
            }

            // Checagem de antilink (existente)
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
            // Se não for comando, para por aqui
            salvarDB(db);
            return;
        }

        // A partir daqui, apenas mensagens começando com '!'
        const argumentos = corpoMensagem.trim().split(/ +/);
        const comandoUnico = argumentos.shift().toLowerCase().replace('!', '');

        // Verificação de permissão especial do usuário (existente)
        const possuiPermissaoComando = db.usuarios[sender]?.permissoes_especiais?.includes(comandoUnico);

        // Bloqueio de comandos por grupo
        const gConfig = db.grupos[from] || {};
        if (isGroup && gConfig.comandos_bloqueados && gConfig.comandos_bloqueados.includes(comandoUnico)) {
            return sock.sendMessage(from, { text: `🚫 O comando *!${comandoUnico}* foi desativado neste grupo pela administração.` }, { quoted: msg });
        }

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

        // Função para executar com trava anti-duplo-clique
        const executarComTrava = async (fn) => {
            // Aguarda se já houver um comando em execução para este sender
            while (locks.get(sender)) {
                await locks.get(sender);
            }
            // Cria a promise que representa a execução atual
            const promessa = fn().finally(() => {
                locks.delete(sender);
            });
            locks.set(sender, promessa);
            return promessa;
        };

        // ─── COMANDOS GERAIS (menu, ajuda, meujid) ───
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            const fotoOficial = db.config_bot.url_foto_menu || "https://i.imgur.com/Kdf946S.png";
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot. Escolha uma das centrais de comando abaixo:\n\n🪙 *!menugold* ➔ Painel de Economia Reais, Cassino e Jogos.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa.\n🎮 *!menujogos* ➔ Jogos Sociais e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas e Letras.\n📊 *!menuoutros* ➔ Perfil Customizado e Status.\n👑 *!menudono* ➔ Títulos Especiais e Configurações de Elite.\n\n📖 *💡 DICA:* Ficou com dúvidas? Digite: *!ajuda [comando]*\n░▒▓█████████████████████████████████████▓▒░`;

            try {
                return await sock.sendMessage(from, { image: { url: fotoOficial }, caption: textoMenuGeral }, { quoted: msg });
            } catch (e) {
                return await sock.sendMessage(from, { text: textoMenuGeral }, { quoted: msg });
            }
        }

        if (comandoUnico === 'meujid') {
            const diagTxt = `🔎 *DIAGNÓSTICO DE IDENTIDADE*\n\n➔ *participant (bruto):* ${msg.key.participant || '(vazio)'}\n➔ *participantAlt:* ${msg.key.participantAlt || '(não existe nessa versão do Baileys)'}\n➔ *participantPn:* ${msg.key.participantPn || '(não existe nessa versão do Baileys)'}\n➔ *remoteJid:* ${msg.key.remoteJid}\n➔ *Identidade resolvida (usada internamente):* ${sender}\n\n📋 Copie isso e mande de volta se algum comando de dono/adm não estiver te reconhecendo.`;
            return sock.sendMessage(from, { text: diagTxt }, { quoted: msg });
        }

        if (comandoUnico === 'ajuda') {
            const buscaGuia = argumentos[0];
            if (!buscaGuia) {
                return sock.sendMessage(from, { text: "💡 *Dica:* Use o comando detalhando o que quer aprender!\n👉 Exemplo: `!ajuda perfil`." }, { quoted: msg });
            }
            const explicacaoPronta = ajudaTextos.obterExplicacao(buscaGuia);
            return sock.sendMessage(from, { text: explicacaoPronta }, { quoted: msg });
        }

        // ─── ECONOMIA ───
        const cmdsEconomia = [
            'menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar',
            'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo',
            'apresentacao',
            // Novos comandos de economia
            'roleta', 'slots', 'apostar', 'dados', 'pescar', 'raspadinha',
            'roubar', 'revidar', 'emprestar', 'investir', 'resgatar'
        ];
        if (cmdsEconomia.includes(comandoUnico)) {
            return executarComTrava(async () => {
                const executarEconomia = economiaModulo.economiaModulo || economiaModulo.default || economiaModulo;
                return await executarEconomia(sock, msg, comandoUnico, argumentos, db, salvarDB);
            });
        }

        // ─── ADM ───
        const cmdsAdm = [
            'menuadm', 'ban', 'kick', 'promover', 'rebaixar', 'antilink', 'antilink2',
            'fakes', 'grupo', 'limpar', 'marcar', 'adms', 'setregras', 'regras',
            'setwelcome1', 'setwelcome2', 'setwelcome3', 'bv1', 'bv2', 'bv3',
            'atividade', 'online', 'boasvindas', 'adv',
            // Novos comandos de moderação
            'antimidia', 'mutar', 'antipalavra', 'antiflood', 'modolento',
            'inativos', 'bloquearcmd', 'config', 'limparmsg'
        ];
        if (cmdsAdm.includes(comandoUnico)) {
            return executarComTrava(async () => {
                const executarAdm = admModulo.admModulo || admModulo.default || admModulo;
                return await executarAdm(sock, msg, comandoUnico, argumentos, db, salvarDB, possuiPermissaoComando);
            });
        }

        // ─── DIVERSÃO ───
        const cmdsDiversao = [
            'menujogos', 'duelo', 'casar', 'aceitar', 'divorciar', 'beijar', 'bater',
            'abracar', 'gado', 'gostoso', 'curiosidade'
        ];
        if (cmdsDiversao.includes(comandoUnico)) {
            return executarComTrava(async () => {
                const executarDiversao = diversaoModulo.diversaoModulo || diversaoModulo.default || diversaoModulo;
                return await executarDiversao(sock, msg, comandoUnico, argumentos, db, salvarDB);
            });
        }

        // ─── MÍDIA ───
        const cmdsMidia = [
            'menumidia', 'sticker', 's', 'sticker-', 's-', 'attp', 'copiarsticker',
            'anime', 'clima', 'google', 'wikipedia', 'letra', 'qrcode', 'encurtar',
            'definicao', 'frase', 'pinterest', 'wallpaper', 'play', 'video'
        ];
        if (cmdsMidia.includes(comandoUnico)) {
            return executarComTrava(async () => {
                const executarMidia = midiaModulo.midiaModulo || midiaModulo.default || midiaModulo;
                return await executarMidia(sock, msg, comandoUnico, argumentos, db, salvarDB);
            });
        }

        // ─── OUTROS ───
        const cmdsOutros = ['menuoutros', 'perfil', 'setbio', 'setidade'];
        if (cmdsOutros.includes(comandoUnico)) {
            return executarComTrava(async () => {
                const executarOutros = outrosModulo.outrosModulo || outrosModulo.default || outrosModulo;
                return await executarOutros(sock, msg, comandoUnico, argumentos, db, salvarDB);
            });
        }

        // ─── DONO ───
        const cmdsDono = [
            'menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd',
            'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb',
            'transmitir', 'reiniciar', 'desligar', 'ligar', 'criartitulo', 'dartitulo',
            'removoertitulo', 'concederpermissao',
            // Novos comandos do dono
            'ping', 'backup', 'listagrupos', 'estatisticas'
        ];
        if (cmdsDono.includes(comandoUnico)) {
            if (sender !== DONO_OFICIAL) {
                return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Restrito ao meu criador oficial *Olden*! 👑" }, { quoted: msg });
            }
            return executarComTrava(async () => {
                const executarDono = donoModulo.donoModulo || donoModulo.default || donoModulo;
                return await executarDono(sock, msg, comandoUnico, argumentos, db, salvarDB);
            });
        }

        // Comando não reconhecido
        const respostaErrado = interacaoTextos.comandoInexistente();
        await sock.sendMessage(from, { text: respostaErrado }, { quoted: msg });

    } catch (error) {
        console.error("Erro interno detectado no comandos.js: ", error);
    }
};

module.exports = lidarComComando;
module.exports.lidarComComando = lidarComComando;