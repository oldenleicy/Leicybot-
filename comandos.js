// comandos.js
const path = require('path');
const fs = require('fs');
const ajudaTextos = require('./ajuda_textos');
const interacaoTextos = require('./interacao_textos');
const criarUsuarioPadrao = require('./modulos/usuarioPadrao');
const { resolverIdentidade, registrarMensagemRecente } = require('./modulos/jidUtils');

// Importação dos módulos especializados
const donoModulo = require('./modulos/dono');
const economiaModulo = require('./modulos/economia');
const admModulo = require('./modulos/adm');
const diversaoModulo = require('./modulos/diversao');
const midiaModulo = require('./modulos/midia');
const outrosModulo = require('./modulos/outros');
const jogosModulo = require('./modulos/jogos');

const DONO_OFICIAL = '258877080511@s.whatsapp.net';

// Regex simples para detectar links comuns e convites de grupo do WhatsApp
const REGEX_LINK = /https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me\//i;

// ══════════════════════════════════════════════════════════════════
// TRAVA ANTI-DUPLO-CLIQUE (v2)
// Serializa a execução por usuário: se o sender já tem uma mensagem
// em processamento, a próxima espera a anterior terminar antes de
// rodar. Fecha a brecha de mandar o mesmo comando 2x rápido pra
// dobrar ganhos (!trabalhar, !minerar, !roleta, etc). Usuários
// diferentes continuam processando em paralelo normalmente.
// ══════════════════════════════════════════════════════════════════
const filaPorUsuario = new Map();
function executarNaFila(sender, tarefa) {
    const anterior = filaPorUsuario.get(sender) || Promise.resolve();
    const atual = anterior.then(tarefa);
    filaPorUsuario.set(sender, atual.catch(() => {})); // erro não trava a fila do usuário
    return atual;
}

const lidarComComando = async (sock, msg, db, salvarDB) => {
    if (!msg.message) return;
    const sender = resolverIdentidade(msg.key);
    return executarNaFila(sender, () => processarMensagem(sock, msg, db, salvarDB, sender));
};

const processarMensagem = async (sock, msg, db, salvarDB, sender) => {
    try {
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

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
                url_foto_menu: null, // v2: sem URL fixa por padrão — deixa o arquivo local em assets/ ser o padrão de fábrica
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
        const u = db.usuarios[sender];

        // Config do grupo — inicializada aqui (não só no adm.js), porque agora
        // vários checks passivos (mute, antiflood, modo lento, fechamento
        // temporizado, bloqueio de comando por grupo) precisam dela em
        // QUALQUER mensagem, não só quando um comando de adm é chamado.
        let gConfig = null;
        if (isGroup) {
            if (!db.grupos[from]) {
                db.grupos[from] = {
                    boasvindas: false,
                    antilink: false,
                    antilink2: false,
                    fakes: false,
                    antimidia: false,
                    palavras_proibidas: [],
                    antiflood: null,      // { max, intervalo, acao: 'mute' }
                    modolento: null,      // segundos entre mensagens, ou null = desligado
                    fechado_ate: null,    // timestamp de expiração do !fechar temporizado
                    comandos_bloqueados: [],
                    regras: "Nenhuma regra definida ainda pelo comando !setregras.",
                    bv_ativo: "bv1",
                    bv1: "Seja muito bem-vindo(a) ao grupo! 🌊",
                    bv2: "Opa! Um novo integrante entrou no recinto! Respeite as regras e divirta-se. 💧",
                    bv3: "Saudações! Nova presença detectada sob o comando de Olden! 🔥"
                };
            }
            gConfig = db.grupos[from];
            // Compatibilidade: grupos criados antes da v2 podem não ter os campos novos
            if (gConfig.antimidia === undefined) gConfig.antimidia = false;
            if (!gConfig.palavras_proibidas) gConfig.palavras_proibidas = [];
            if (gConfig.antiflood === undefined) gConfig.antiflood = null;
            if (gConfig.modolento === undefined) gConfig.modolento = null;
            if (gConfig.fechado_ate === undefined) gConfig.fechado_ate = null;
            if (!gConfig.comandos_bloqueados) gConfig.comandos_bloqueados = [];

            // Reabertura automática do !fechar temporizado — checa em toda mensagem.
            // Zera a flag ANTES de chamar a API pra não repetir a reabertura se
            // várias mensagens chegarem quase juntas antes do save.
            if (gConfig.fechado_ate && Date.now() >= gConfig.fechado_ate) {
                gConfig.fechado_ate = null;
                salvarDB(db);
                try {
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    await sock.sendMessage(from, { text: "🔓 *CHAT REABERTO:* O tempo de fechamento temporizado (!fechar) expirou automaticamente! 🌊" });
                } catch (e) { /* bot pode não ser mais admin do grupo — ignora */ }
            }
        }

        // Conta TODA mensagem (não só comandos) e marca a última interação —
        // isso alimenta o !atividade, o !online e o !inativos do adm.js.
        u.mensagens_contadas = (u.mensagens_contadas || 0) + 1;
        u.ultima_interacao = Date.now();
        registrarMensagemRecente(from, sender, msg.key); // alimenta o !limparmsg (adm.js)

        // ══════════════════════════════════════════════════════════
        // MODERAÇÃO PASSIVA (v2): mutado / modo lento / anti-flood
        // Roda ANTES do split comando x não-comando, de propósito —
        // um usuário mutado não pode "furar" o mute mandando comando
        // em vez de conversa normal.
        // ══════════════════════════════════════════════════════════
        if (isGroup && sender !== DONO_OFICIAL) {
            if (u.mutado_ate) {
                if (Date.now() < u.mutado_ate) {
                    salvarDB(db);
                    return sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                }
                u.mutado_ate = null;
            }

            if (gConfig.modolento) {
                if (u.ultima_mensagem_slow && (Date.now() - u.ultima_mensagem_slow) < gConfig.modolento * 1000) {
                    salvarDB(db);
                    return sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                }
                u.ultima_mensagem_slow = Date.now();
            }

            if (gConfig.antiflood) {
                const agoraFlood = Date.now();
                const janelaMs = gConfig.antiflood.intervalo * 1000;
                u.historico_mensagens = (u.historico_mensagens || []).filter(t => (agoraFlood - t) < janelaMs);
                u.historico_mensagens.push(agoraFlood);

                if (u.historico_mensagens.length > gConfig.antiflood.max) {
                    await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                    if (gConfig.antiflood.acao === 'mute') {
                        u.mutado_ate = Date.now() + 5 * 60000;
                        salvarDB(db);
                        return sock.sendMessage(from, { text: `🚨 *ANTI-FLOOD:* @${sender.split('@')[0]} mandou mensagens rápido demais e foi silenciado por 5 minutos!`, mentions: [sender] });
                    }
                    salvarDB(db);
                    return;
                }
            }
        }

        salvarDB(db);

        // Mensagens que NÃO são comando: checa antilink/antimídia/antipalavra,
        // aplica o bônus diário automático e o anúncio de título — e para por aqui.
        if (!corpoMensagem.startsWith('!')) {
            if (isGroup && gConfig) {
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

                if (gConfig.antimidia) {
                    const temMidia = msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.stickerMessage || msg.message.documentMessage;
                    if (temMidia) {
                        try {
                            const groupMetadata = await sock.groupMetadata(from);
                            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                            const admsGrupo = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                            const botIsAdmin = admsGrupo.includes(botId);
                            const senderIsAdmin = admsGrupo.includes(sender);
                            if (!senderIsAdmin && botIsAdmin) {
                                await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(from, { text: `🚫 Mídia bloqueada! @${sender.split('@')[0]}, o envio de imagens/vídeos/áudios/figurinhas está desativado neste grupo (!antimidia).`, mentions: [sender] });
                            }
                        } catch (e) {
                            console.error('[ANTIMIDIA] Erro ao processar:', e.message);
                        }
                        return;
                    }
                }

                if (gConfig.palavras_proibidas && gConfig.palavras_proibidas.length > 0) {
                    const textoBaixo = corpoMensagem.toLowerCase();
                    if (gConfig.palavras_proibidas.some(p => textoBaixo.includes(p))) {
                        try {
                            const groupMetadata = await sock.groupMetadata(from);
                            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                            const admsGrupo = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                            const botIsAdmin = admsGrupo.includes(botId);
                            const senderIsAdmin = admsGrupo.includes(sender);
                            if (!senderIsAdmin && botIsAdmin) {
                                await sock.sendMessage(from, { delete: msg.key }).catch(() => {});
                                await sock.sendMessage(from, { text: `🚫 Mensagem removida! @${sender.split('@')[0]}, essa palavra está na lista negra do grupo (!antipalavra).`, mentions: [sender] });
                            }
                        } catch (e) {
                            console.error('[ANTIPALAVRA] Erro ao processar:', e.message);
                        }
                        return;
                    }
                }
            }

            // v2: !30s — durante uma rodada ativa, qualquer mensagem de texto no
            // grupo pode ser um palpite da equipe que está adivinhando. Preciso
            // checar isso ANTES do resto do fluxo (bônus/anúncio), mas sem
            // atrapalhar mensagens normais — só intercepta de verdade quando o
            // palpite bate com a palavra secreta da rodada.
            if (isGroup) {
                const acertou30s = await jogosModulo.verificarPalpite30s(sock, msg, db, salvarDB, from, sender, corpoMensagem);
                if (acertou30s) return;
            }

            // Bônus diário automático — primeira mensagem do dia que NÃO é comando
            const hojeDataBonus = new Date().toLocaleDateString();
            if (u.ultimo_bonus_diario !== hojeDataBonus) {
                u.ultimo_bonus_diario = hojeDataBonus;
                u.golds = (u.golds || 0) + 20;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎁 *BÔNUS DIÁRIO:* +20 🪙 só por aparecer hoje! Saldo em mãos: *${u.golds}* 🪙` }, { quoted: msg }).catch(() => {});
            }

            // Anúncio automático de título (v2: slot comprado + slot especial do dono)
            if (u.titulo_especial || u.titulo_comprado) {
                if (!u.ultimo_anuncio || Date.now() - u.ultimo_anuncio > 10800000) {
                    let txtAnuncio = "";
                    if (u.titulo_especial) {
                        txtAnuncio = `🌊 *PRESENÇA ILUSTRE:* O portador do título especial 🌟 *${u.titulo_especial}* acabou de interagir no chat!🪙`;
                    } else {
                        txtAnuncio = interacaoTextos.obterAnuncioTitulo(u.titulo_comprado, null);
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

        const possuiPermissaoComando = u.permissoes_especiais?.includes(comandoUnico);

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

        // Bloqueio de comando por GRUPO (v2 — diferente do !desativarcmd global do dono)
        if (isGroup && gConfig && gConfig.comandos_bloqueados.includes(comandoUnico) && sender !== DONO_OFICIAL) {
            return sock.sendMessage(from, { text: `🚫 O comando *!${comandoUnico}* está bloqueado neste grupo pelos administradores (!bloquearcmd).` }, { quoted: msg });
        }

        // !menu / !help
        if (comandoUnico === 'menu' || comandoUnico === 'help') {
            // v2: ordem de prioridade da foto do !menu —
            // 1) foto_menu_base64 (setfoto por resposta a imagem, override explícito)
            // 2) url_foto_menu (setfoto com link, override explícito)
            // 3) arquivo local em assets/ (o padrão "de fábrica" do seu repositório)
            // 4) URL de segurança, caso nada acima exista/funcione
            let fonteFoto;
            if (db.config_bot.foto_menu_base64) {
                fonteFoto = Buffer.from(db.config_bot.foto_menu_base64, 'base64');
            } else if (db.config_bot.url_foto_menu) {
                fonteFoto = { url: db.config_bot.url_foto_menu };
            } else {
                fonteFoto = null;
                for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
                    const caminhoAsset = path.join(__dirname, 'assets', `foto-menu.${ext}`);
                    if (fs.existsSync(caminhoAsset)) {
                        try {
                            fonteFoto = fs.readFileSync(caminhoAsset);
                            break;
                        } catch (e) { /* tenta a próxima extensão */ }
                    }
                }
                if (!fonteFoto) fonteFoto = { url: "https://i.imgur.com/Kdf946S.png" };
            }
            const textoMenuGeral = `░▒▓█████████████████████████████████████▓▒░\n▓██          🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗘𝗡𝗨  💧         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🤖 Olá! Eu sou o Leicybot. Escolha uma das centrais de comando abaixo:\n\n🪙 *!menugold* ➔ Painel de Economia Reais, Cassino e Jogos.\n🛡️ *!menuadm* ➔ Ferramentas de Moderação e Defesa.\n🎮 *!menujogos* ➔ Jogos Sociais e Entretenimento.\n🎵 *!menumidia* ➔ Criação de Figurinhas e Letras.\n📊 *!menuoutros* ➔ Perfil Customizado e Status.\n👑 *!menudono* ➔ Títulos Especiais e Configurações de Elite.\n\n📖 *💡 DICA:* Ficou com dúvidas? Digite: *!ajuda [comando]*\n░▒▓█████████████████████████████████████▓▒░`;

            try {
                return await sock.sendMessage(from, { image: fonteFoto, caption: textoMenuGeral }, { quoted: msg });
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

        // ECONOMIA (v2: + roleta, slots, apostar, dados, pescar, raspadinha, roubar, revidar, emprestar, investir, resgatar)
        const cmdsEconomia = ['menugold', 'gold', 'saldo', 'carteira', 'trabalhar', 'minerar', 'assaltar', 'banco', 'pagar', 'rankgold', 'loja', 'comprar', 'vendertitulo', 'apresentacao', 'roleta', 'slots', 'apostar', 'dados', 'pescar', 'raspadinha', 'roubar', 'revidar', 'emprestar', 'investir', 'resgatar'];
        if (cmdsEconomia.includes(comandoUnico)) {
            const executarEconomia = economiaModulo.economiaModulo || economiaModulo.default || economiaModulo;
            return await executarEconomia(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // ADM (v2: + fechar, mutar, antimidia, antipalavra, antiflood, modolento, inativos, bloquearcmd, config, limparmsg)
        const cmdsAdm = ['menuadm', 'ban', 'kick', 'promover', 'rebaixar', 'antilink', 'antilink2', 'fakes', 'grupo', 'limpar', 'marcar', 'adms', 'setregras', 'regras', 'setwelcome1', 'setwelcome2', 'setwelcome3', 'bv1', 'bv2', 'bv3', 'atividade', 'online', 'boasvindas', 'adv', 'fechar', 'mutar', 'antimidia', 'antipalavra', 'antiflood', 'modolento', 'inativos', 'bloquearcmd', 'config', 'limparmsg'];
        if (cmdsAdm.includes(comandoUnico)) {
            const executarAdm = admModulo.admModulo || admModulo.default || admModulo;
            return await executarAdm(sock, msg, comandoUnico, argumentos, db, salvarDB, possuiPermissaoComando);
        }

        // DIVERSÃO ('divorciar' movido para cá — antes estava em OUTROS e nunca era executado de verdade;
        // v2: + topbeijos, topabracos, casaldomes)
        const cmdsDiversao = ['menujogos', 'duelo', 'casar', 'aceitar', 'divorciar', 'beijar', 'bater', 'abracar', 'gado', 'gostoso', 'curiosidade', 'topbeijos', 'topabracos', 'casaldomes'];
        if (cmdsDiversao.includes(comandoUnico)) {
            const executarDiversao = diversaoModulo.diversaoModulo || diversaoModulo.default || diversaoModulo;
            return await executarDiversao(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // JOGOS EM GRUPO (v2: forca, jogo da velha, 30 segundos, roleta russa social, enquete,
        // + ppt, verdadeoudesafio, emojicharada, quiz, sorteio, palavraencadeada)
        const cmdsJogos = ['forca', 'chutar', 'desistirforca', 'jogodavelha', 'aceitarvelha', 'jogar', 'desistirvelha', '30s', 'vermelha', 'azul', 'iniciar30s', 'pular', 'placar30s', 'encerrar30s', 'enquete', 'roletarussa', 'ppt', 'verdadeoudesafio', 'emojicharada', 'quiz', 'sorteio', 'participar', 'sortear', 'palavraencadeada'];
        if (cmdsJogos.includes(comandoUnico)) {
            const executarJogos = jogosModulo.jogosModulo || jogosModulo.default || jogosModulo;
            return await executarJogos(sock, msg, comandoUnico, argumentos, db, salvarDB);
        }

        // MÍDIA
        const cmdsMidia = ['menumidia', 'sticker', 's', 'sticker-', 's-', 'attp', 'copiarsticker', 'anime', 'clima', 'google', 'wikipedia', 'letra', 'qrcode', 'encurtar', 'definicao', 'frase', 'pinterest', 'wallpaper', 'play', 'video'];
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

        // DONO ('ligar' adicionado como par do '!desligar'; v2: + ping, backup, listagrupos, estatisticas)
        const cmdsDono = ['menudono', 'manutencao', 'burlar', 'desativarcmd', 'ativarcmd', 'addgold', 'remgold', 'addcelestial', 'setfoto', 'nomebot', 'limpardb', 'transmitir', 'reiniciar', 'desligar', 'ligar', 'criartitulo', 'dartitulo', 'removoertitulo', 'concederpermissao', 'ping', 'backup', 'listagrupos', 'estatisticas', 'migrarv2', 'mesclarusuario'];
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
