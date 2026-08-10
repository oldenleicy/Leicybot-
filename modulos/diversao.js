const criarUsuarioPadrao = require('./usuarioPadrao');
const interacaoTextos = require('../interacao_textos');
const { resolverIdentidade, obterAlvo } = require('./jidUtils');

module.exports = async (sock, msg, comando, args, db, salvarDB) => {
    const from = msg.key.remoteJid;
    // v2: usa o resolvedor de identidade central (antes usava `msg.key.participant
    // || msg.key.remoteJid` direto, sem tratar @lid — mesmo problema de fragmentação
    // de conta que corrigi no economia.js).
    const sender = resolverIdentidade(msg.key);

    if (!db.usuarios[sender]) {
        db.usuarios[sender] = criarUsuarioPadrao();
    }

    let u = db.usuarios[sender];
    if (u.beijados === undefined) u.beijados = 0;
    if (u.abracados === undefined) u.abracados = 0;
    if (u.conjugue === undefined) u.conjugue = null;

    // Banco de Curiosidades Segmentadas
    const bancoCuriosidades = {
        sports: [
            "O basquete foi inventado usando cestas de colheita de pêssegos em 1891! O esporte era tão lento que precisavam de uma escada para tirar a bola a cada ponto. 🏀",
            "A primeira bola de futebol da história era feita de bexiga de porco amarrada com couro. Imagina o cheiro desse jogo no sol do meio-dia! 🐷⚽"
        ],
        games: [
            "O criador do Pac-Man teve a ideia do design do personagem enquanto olhava para uma pizza inteira com apenas uma fatia faltando! 🍕🕹️",
            "O PlayStation 2 é o console mais vendido de todos os tempos, ultrapassando 155 milhões de unidades rodando GTA San Andreas no mundo todo! 🎮"
        ],
        ciencia: [
            "Um dia em Vênus é mais longo do que um ano inteiro em Vênus! O planeta gira tão devagar sobre o próprio eixo que o ano acaba antes do dia. 🌌✨",
            "Se você pudesse dobrar uma folha de papel ao meio exatamente 42 vezes, a espessura dela seria grande o suficiente para chegar até a Lua! 🤯🔬"
        ],
        arte: [
            "Leonardo da Vinci passava anos pintando apenas os lábios da Mona Lisa. Ele era tão perfeccionista que quase enlouqueceu os clientes! 🎨",
            "A famosa estátua de David, de Michelangelo, foi esculpida a partir de um bloco de mármore gigante que outros dois artistas jogaram fora por acharem 'defeituoso'. 🗿"
        ],
        filmes: [
            "O som dos dinossauros rugindo no filme Jurassic Park foi feito gravando tartarugas marinhas acasalando! O cinema nos enganou com sucesso. 🦖🎬",
            "Na cena clássica do filme Matrix, os códigos verdes que caem na tela são, na verdade, receitas de sushi escaneadas de um livro de culinária! 🍣"
        ],
        historia: [
            "Em 1325, duas cidades italianas entraram em guerra por causa de um balde de carvalho roubado de um poço público. A guerra durou meses! 🪣⚔️",
            "O rei francês Luís XIV tomou apenas três banhos na vida inteira por recomendação médica. O perfume dele devia ser uma arma biológica! 👑💨"
        ],
        animes: [
            "O autor de Naruto originalmente planejou que o Naruto usasse magia em vez de ninjutsu, e que o rabo dele fosse uma raposa literal o tempo todo! 🦊🍥",
            "Eiichiro Oda, criador de One Piece, dorme apenas 3 horas por noite há mais de 20 anos para conseguir entregar os capítulos do mangá em dia! 🏴‍☠️🍖"
        ],
        tecnologia: [
            "O primeiro mouse de computador da história foi construído em 1964 e era feito inteiramente de madeira com duas engrenagens de metal! 💻🪵",
            "O primeiro vírus de computador foi criado em 1971 e se chamava 'Creeper'. Ele não destruía nada, só exibia a mensagem: 'Pegue-me se for capaz!'. 👾"
        ],
        natureza: [
            "As vacas têm melhores amigas e ficam genuinamente estressadas e choram quando são separadas delas no pasto! 🐮💔",
            "O coração de uma baleia-azul é tão gigante que um ser humano adulto conseguiria nadar facilmente por dentro das suas artérias principais! 🐋🌊"
        ]
    };

    // Divide comandos que entram no formato !curiosidade/animes
    const comandoBase = comando.split('/')[0];
    const subCategoriaCmd = comando.split('/')[1]?.toLowerCase();

    switch (comandoBase) {
        case 'menujogos': {
            const menuJogosTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🎮  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗗𝗜𝗩𝗘𝗥𝗦𝗔𝗢  🎮      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 A zoeira e os mini-games oficiais do grupo!\n\n ➔ *!duelo [@user ou responda] [aposta]* - Combate valendo Golds.\n ➔ *!casar [@user ou responda]* - Faz o pedido oficial de matrimônio.\n ➔ *!aceitar* - Consuma a união sob a benção de Olden.\n ➔ *!divorciar* - Encerra o casamento virtual.\n ➔ *!beijar / !bater / !abracar [@user ou responda]* - Ações textuais cômicas.\n ➔ *!gado* - Mede o nível de paixão boba do membro.\n ➔ *!gostoso* - Avalia a latência da sua beleza.\n ➔ *!curiosidade* - Fato aleatório global do robô.\n ➔ *!curiosidade/[categoria]* - Alvo estrito:\n    _(sports, games, ciencia, arte, filmes, historia, animes, tecnologia, natureza)_\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuJogosTxt }, { quoted: msg });
            break;
        }

        case 'duelo': {
            const adversario = obterAlvo(msg);
            const aposta = parseInt(args[1] || args[0]);

            if (!adversario) return sock.sendMessage(from, { text: "❌ Quem você está desafiando? Marque ou responda o alvo! Ex: `!duelo @membro 100`" }, { quoted: msg });
            if (adversario === sender) return sock.sendMessage(from, { text: "🥴 Duelo contra si mesmo? Você bateu a cabeça em alguma pedra à beira-mar?" }, { quoted: msg });
            if (isNaN(aposta) || aposta <= 0) return sock.sendMessage(from, { text: "❌ Defina uma quantia válida de Golds para apostar no combate!" }, { quoted: msg });

            if (u.golds < aposta) return sock.sendMessage(from, { text: "❌ Você não tem todos esses Golds em mãos para sustentar esse desafio!" }, { quoted: msg });

            if (!db.usuarios[adversario]) {
                db.usuarios[adversario] = criarUsuarioPadrao();
            }

            if (db.usuarios[adversario].golds < aposta) {
                return sock.sendMessage(from, { text: "❌ O seu oponente está muito quebrado e não tem essa quantia para cobrir a aposta!" }, { quoted: msg });
            }

            if (Math.random() > 0.5) {
                u.golds += aposta;
                db.usuarios[adversario].golds -= aposta;
                salvarDB(db);
                await sock.sendMessage(from, { text: `⚔️ *💥 DUELO SUPREMO:* @${sender.split('@')[0]} aplicou uma rasteira aquática magistral, nocauteou @${adversario.split('@')[0]} e embolsou *${aposta} Golds*! 🌊`, mentions: [sender, adversario] }, { quoted: msg });
            } else {
                u.golds -= aposta;
                db.usuarios[adversario].golds += aposta;
                salvarDB(db);
                await sock.sendMessage(from, { text: `⚔️ *💥 DUELO SUPREMO:* @${sender.split('@')[0]} tentou dar um soco cinematográfico, mas escorregou feio numa casca de banana! @${adversario.split('@')[0]} venceu o combate e levou *${aposta} Golds*! 💧`, mentions: [sender, adversario] }, { quoted: msg });
            }
            break;
        }

        case 'casar': {
            const pretendente = obterAlvo(msg);
            if (!pretendente) return sock.sendMessage(from, { text: "❌ Marque ou responda a pessoa sortuda (ou azarada) para fazer o pedido de casamento!" }, { quoted: msg });
            if (pretendente === sender) return sock.sendMessage(from, { text: "🛑 Casar com você mesmo? O nível de carência superou as expectativas do bot." }, { quoted: msg });

            if (u.conjugue) return sock.sendMessage(from, { text: "❌ Você já é casado! Use *!divorciar* antes de pedir alguém em casamento." }, { quoted: msg });

            if (!db.usuarios[pretendente]) {
                db.usuarios[pretendente] = criarUsuarioPadrao();
            }
            if (db.usuarios[pretendente].conjugue) return sock.sendMessage(from, { text: "❌ Esse membro já está casado com outra pessoa!" }, { quoted: msg });

            db.usuarios[pretendente].pedido_casamento = sender;
            salvarDB(db);

            await sock.sendMessage(from, { text: `💍 *PEDIDO DE CASAMENTO:* 📢 Atenção chat! @${sender.split('@')[0]} está oficialmente de joelhos propondo casamento para @${pretendente.split('@')[0]}!\n\n👉 Alvo do pedido, digite *!aceitar* para confirmar ou mude de assunto imediatamente! 🌊`, mentions: [sender, pretendente] }, { quoted: msg });
            break;
        }

        case 'aceitar': {
            if (!u.pedido_casamento) return sock.sendMessage(from, { text: "❌ Ninguém te pediu em casamento recentemente... Que situação deprimente! 💧" }, { quoted: msg });
            const noivo = u.pedido_casamento;

            if (!db.usuarios[noivo]) {
                db.usuarios[noivo] = criarUsuarioPadrao();
            }

            u.conjugue = noivo;
            u.casamentos_total = (u.casamentos_total || 0) + 1;
            db.usuarios[noivo].conjugue = sender;
            db.usuarios[noivo].casamentos_total = (db.usuarios[noivo].casamentos_total || 0) + 1;
            u.pedido_casamento = null;
            salvarDB(db);

            const casorioTxt = `░▒▓█████████████████████████████████████▓▒░\n💍   𝗠𝗔𝗧𝗥𝗜𝗠𝗢𝗡𝗜𝗢 𝗩𝗜𝗥𝗧𝗨𝗔𝗟 𝗖𝗢𝗡𝗦𝗨𝗠𝗔𝗗𝗢   💍\n░▒▓████████▒▒▓██████████████████████████▓▒░\n🔔 Soltem os fogos! sob as ordens e benção do comandante supremo Olden, @${sender.split('@')[0]} e @${noivo.split('@')[0]} agora estão casados virtualmente!\n\n❤️ Que a união dure até o próximo reset de banco de dados! 😉🎉`;
            await sock.sendMessage(from, { text: casorioTxt, mentions: [sender, noivo] }, { quoted: msg });
            break;
        }

        case 'divorciar': {
            if (!u.conjugue) return sock.sendMessage(from, { text: "🤔 Divorciar de quem? Você está solteiro e livre como as ondas do mar!" }, { quoted: msg });
            const ex = u.conjugue;

            u.conjugue = null;
            if (db.usuarios[ex]) db.usuarios[ex].conjugue = null;
            salvarDB(db);

            await sock.sendMessage(from, { text: `💔 *FIM DA LINHA:* O amor acabou! @${sender.split('@')[0]} assinou os papéis de divórcio virtuais e chutou a conta de @${ex.split('@')[0]} para escanteio! O tribunal do Leicybot- decretou a solteirice!`, mentions: [sender, ex] }, { quoted: msg });
            break;
        }

        case 'beijar': {
            const beijado = obterAlvo(msg);
            if (!beijado) return sock.sendMessage(from, { text: "❌ Marque ou responda quem você deseja beijar!" }, { quoted: msg });

            if (!db.usuarios[beijado]) {
                db.usuarios[beijado] = criarUsuarioPadrao();
            }
            if (db.usuarios[beijado].beijados === undefined) db.usuarios[beijado].beijados = 0;

            db.usuarios[beijado].beijados += 1;
            salvarDB(db);
            await sock.sendMessage(from, { text: `💋 @${sender.split('@')[0]} deu um beijo cinematográfico de tirar o fôlego em @${beijado.split('@')[0]}! O amor está flutuando no chat! 💕`, mentions: [sender, beijado] }, { quoted: msg });
            break;
        }

        case 'bater': {
            const agredido = obterAlvo(msg);
            if (!agredido) return sock.sendMessage(from, { text: "❌ Marque ou responda quem você quer cobrir na paulada!" }, { quoted: msg });
            await sock.sendMessage(from, { text: `💥 *POW!* @${sender.split('@')[0]} pegou uma cadeira dobrável virtual e quebrou nas costas de @${agredido.split('@')[0]}! Alguém traga um curativo urgentemente! 🩹`, mentions: [sender, agredido] }, { quoted: msg });
            break;
        }

        case 'abracar': {
            const abracado = obterAlvo(msg);
            if (!abracado) return sock.sendMessage(from, { text: "❌ Marque ou responda quem vai receber esse abraço!" }, { quoted: msg });

            if (!db.usuarios[abracado]) {
                db.usuarios[abracado] = criarUsuarioPadrao();
            }
            if (db.usuarios[abracado].abracados === undefined) db.usuarios[abracado].abracados = 0;

            db.usuarios[abracado].abracados += 1;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🫂 @${sender.split('@')[0]} deu um abraço apertado e confortante em @${abracado.split('@')[0]}. Que momento lindo de amizade pura! 💧`, mentions: [sender, abracado] }, { quoted: msg });
            break;
        }

        case 'gado': {
            const gadoPorcentagem = Math.floor(Math.random() * 101);
            const gadoTxt = `╔═══════════════════════════════════════╗\n          🐂  𝗧𝗘𝗥𝗠𝗢𝗠𝗘𝗧𝗥𝗢 𝗗𝗘 𝗚𝗔𝗗𝗢  🐂\n╚═══════════════════════════════════════╝\n👤 𝗠𝗲𝗺𝗯𝗿𝗼: @${sender.split('@')[0]}\n📊 𝗡𝗶́𝘃𝗲𝗹: [${gadoPorcentagem}%]\n\n🔍 *Análise do Bot:* \n${interacaoTextos.respostasGado(gadoPorcentagem)}\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: gadoTxt, mentions: [sender] }, { quoted: msg });
            break;
        }

        case 'gostoso': {
            const gostosoPorcentagem = Math.floor(Math.random() * 101);
            const gostosoTxt = `╔═══════════════════════════════════════╗\n         🔥  𝗔𝗩𝗔𝗟𝗜𝗔𝗖𝗔𝗢 𝗗𝗘 𝗕𝗘𝗟𝗘𝗭𝗔  🔥\n╚═══════════════════════════════════════╝\n👤 𝗠𝗲𝗺𝗯𝗿𝗼: @${sender.split('@')[0]}\n📊 𝗡𝗶́𝘃𝗲𝗹: [${gostosoPorcentagem}%]\n\n🔍 *Veredito Técnico:* \n${interacaoTextos.respostasGostoso(gostosoPorcentagem)}\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: gostosoTxt, mentions: [sender] }, { quoted: msg });
            break;
        }

        case 'curiosidade': {
            let catAlvo = subCategoriaCmd || args[0]?.toLowerCase();

            if (catAlvo && bancoCuriosidades[catAlvo.trim()]) {
                const listaCurio = bancoCuriosidades[catAlvo.trim()];
                const fatoEscolhido = listaCurio[Math.floor(Math.random() * listaCurio.length)];
                return sock.sendMessage(from, { text: `░▒▓ 🧠 𝗖𝗨𝗥𝗜𝗢𝗦𝗜𝗗𝗔𝗗𝗘: ${catAlvo.toUpperCase()} ▓▒░\n\n💡 *Você sabia?*\n${fatoEscolhido}` }, { quoted: msg });
            }

            const chavesGlobais = Object.keys(bancoCuriosidades);
            const rChave = chavesGlobais[Math.floor(Math.random() * chavesGlobais.length)];
            const rFato = bancoCuriosidades[rChave][Math.floor(Math.random() * bancoCuriosidades[rChave].length)];
            await sock.sendMessage(from, { text: `░▒▓ 🧠 𝗖𝗨𝗥𝗜𝗢𝗦𝗜𝗗𝗔𝗗𝗘 𝗚𝗟𝗢𝗕𝗔𝗟 ▓▒░\n\n💡 *Fato interessante:* \n${rFato}\n\n👉 Dica: Você pode filtrar usando: *!curiosidade/animes*, *!curiosidade/games*, *!curiosidade/historia*, etc!` }, { quoted: msg });
            break;
        }

        // v2: ranking social — ainda em construção, chega numa próxima atualização
        case 'topbeijos':
        case 'topabracos':
        case 'casaldomes': {
            await sock.sendMessage(from, { text: `🚧 *!${comando}* ainda está em construção — chega numa próxima atualização! 🌊` }, { quoted: msg });
            break;
        }

        default:
            break;
    }
};
