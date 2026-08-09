// modulos/economia.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, obterAlvo } = require('./jidUtils');

// Números vermelhos da roleta europeia padrão (0 é verde/casa, o resto é preto)
const NUMEROS_VERMELHOS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const economiaModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        // v2: usa o mesmo resolvedor de identidade do resto do bot (jidUtils).
        // Antes esse arquivo tinha sua própria lógica de sender duplicada e
        // SEM o tratamento de @lid — o que podia fragmentar o saldo de um
        // mesmo usuário em 2 registros diferentes dependendo de qual módulo
        // processasse a mensagem primeiro. Corrigido aqui.
        const sender = resolverIdentidade(msg.key);

        if (!db.usuarios) db.usuarios = {};
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = criarUsuarioPadrao();
        }

        let u = db.usuarios[sender];

        // Garantia de propriedades de controle diário
        if (u.trabalhos_hoje === undefined) u.trabalhos_hoje = 0;
        if (u.mineracoes_hoje === undefined) u.mineracoes_hoje = 0;
        if (u.pescas_hoje === undefined) u.pescas_hoje = 0;
        if (u.raspadinhas_hoje === undefined) u.raspadinhas_hoje = 0;

        // Expiração real do título comprado (v2 — antes era só um texto
        // cosmético no !gold, nunca chegava a ser verificado em lugar nenhum).
        if (u.data_expiracao && Date.now() >= u.data_expiracao) {
            u.titulo_comprado = null;
            u.data_expiracao = null;
            salvarDB(db);
        }

        // Estrutura fixa de títulos com preços e raridades
        const catálogoTítulos = {
            'luasuperior1': { nome: "🔴 Lua Superior 1", preco: 3000, raridade: "Lendario" },
            'pecadoganancia': { nome: "🔴 Pecado da Ganância", preco: 3000, raridade: "Lendario" },
            'reipiratas': { nome: "🔴 Rei dos Piratas", preco: 3000, raridade: "Lendario" },
            'vingadorhogwarts': { nome: "🔴 Vingador de Hogwarts", preco: 3000, raridade: "Lendario" },
            'donodabanca': { nome: "🔴 Dono da Banca", preco: 3000, raridade: "Lendario" },
            'luasuperior2': { nome: "🟡 Lua Superior 2", preco: 1500, raridade: "Ouro" },
            'luasuperior3': { nome: "🟡 Lua Superior 3", preco: 1500, raridade: "Ouro" },
            'supersaiyajin': { nome: "🟡 Super Saiyajin", preco: 1500, raridade: "Ouro" },
            'chefedehawkins': { nome: "🟡 Chefe de Hawkins", preco: 1500, raridade: "Ouro" },
            'hereditariajoseon': { nome: "🟡 Realeza de Joseon", preco: 1500, raridade: "Ouro" },
            'luainferior1': { nome: "⚪ Lua Inferior 1", preco: 500, raridade: "Prata" },
            'luainferior2': { nome: "⚪ Lua Inferior 2", preco: 500, raridade: "Prata" },
            'luainferior3': { nome: "⚪ Lua Inferior 3", preco: 500, raridade: "Prata" },
            'luainferior5': { nome: "⚪ Lua Inferior 5", preco: 500, raridade: "Prata" },
            'hashiraagua': { nome: "⚪ Hashira da Água", preco: 500, raridade: "Prata" },
            'satorugojo': { nome: "⚪ Satoru Gojo", preco: 500, raridade: "Prata" },
            'heartthrobseul': { nome: "⚪ Heartthrob de Seul", preco: 500, raridade: "Prata" },
            'garidekonoha': { nome: "⚪ Gari de Konoha", preco: 500, raridade: "Prata" },
            'membroround6': { nome: "⚪ Membro da Round 6", preco: 500, raridade: "Prata" },
            'ceodeseul': { nome: "⚪ CEO de Seul", preco: 500, raridade: "Prata" },
            'cacadordemogorgon': { nome: "⚪ Caçador de Demogorgon", preco: 500, raridade: "Prata" },
            'estudanteshisui': { nome: "⚪ Estudante da Shisui", preco: 500, raridade: "Prata" }
        };

        const obterRaridadePorNome = (nomeItem) => {
            const encontrado = Object.values(catálogoTítulos).find(t => t.nome === nomeItem);
            return encontrado ? encontrado.raridade : null;
        };

        // v2: só existe 1 slot comprado agora (titulo_comprado), não mais titulo_1/titulo_2
        const contarDonosRaridade = (raridade) => {
            let contagem = 0;
            Object.values(db.usuarios).forEach(user => {
                if (user.titulo_comprado && obterRaridadePorNome(user.titulo_comprado) === raridade) contagem++;
            });
            return contagem;
        };

        const hojeData = new Date().toLocaleDateString();
        if (u.ultimo_mensagem_data !== hojeData) {
            u.trabalhos_hoje = 0;
            u.mineracoes_hoje = 0;
            u.pescas_hoje = 0;
            u.raspadinhas_hoje = 0;
            u.ultimo_mensagem_data = hojeData;
            salvarDB(db);
        }

        // Sorte Grande (item da loja v2): em caso de derrota em roleta/slots/dados,
        // se tiver ficha sobrando, dá 50% de chance de reverter pra vitória —
        // consumindo 1 ficha no processo (só se ela chegar a ser usada).
        const tentarSorteGrande = (jaGanhou) => {
            if (jaGanhou) return { vitoria: true, usouFicha: false };
            if ((u.sorte_grande_jogadas || 0) > 0) {
                u.sorte_grande_jogadas -= 1;
                return { vitoria: Math.random() < 0.5, usouFicha: true };
            }
            return { vitoria: false, usouFicha: false };
        };

        switch (comando) {
            case 'menugold': {
                const menuGoldTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  🪙  𝗧𝗢𝗣 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 - 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔  🪙  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Sob a gerência do comandante Olden.\n\n ➔ *!gold* - Saldo, banco, títulos, dívidas e energias (responda alguém pra ver a dela).\n ➔ *!trabalhar* / *!minerar* / *!pescar* - Ganhos seguros (Lim. 5/dia cada).\n ➔ *!raspadinha* - Raspadinha rápida, prêmio na hora (Lim. 5/dia).\n ➔ *!roleta [aposta] [cor/nº]* - Aposte no vermelho/preto ou num número (0-36).\n ➔ *!slots [aposta]* - Caça-níqueis.\n ➔ *!apostar [aposta]* - Dobro ou nada contra a casa.\n ➔ *!dados [aposta]* - Role contra o bot.\n ➔ *!assaltar [@user]* - Saqueia os Golds em mãos de um alvo.\n ➔ *!roubar [@user]* - Mira o banco do alvo (mais arriscado).\n ➔ *!revidar* - Ataca de volta quem te roubou nas últimas 24h.\n ➔ *!pagar [@user] [valor]* - Transfere dinheiro.\n ➔ *!emprestar [@user] [valor]* - Empresta e registra a dívida.\n ➔ *!banco depositar/sacar [valor]* - Guarda ou retira do cofre.\n ➔ *!investir [valor]* - Trava um valor por 6h com bônus.\n ➔ *!resgatar* - Resgata um investimento pronto.\n ➔ *!rankgold* - Placar dos 10 bilionários do grupo.\n ➔ *!loja* / *!comprar [item]* - Itens e títulos.\n ➔ *!vendertitulo* - Libera sua vaga de título comprado.\n ➔ *!apresentacao [on/off]* - Liga/Desliga anúncio automático.\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: menuGoldTxt }, { quoted: msg });
                break;
            }

            case 'gold':
            case 'saldo':
            case 'carteira': {
                // v2: responder à mensagem de alguém mostra o !gold dessa pessoa
                const alvoMarcado = obterAlvo(msg);
                let alvoUser = sender;
                if (alvoMarcado && alvoMarcado !== sender) {
                    if (!db.usuarios[alvoMarcado]) db.usuarios[alvoMarcado] = criarUsuarioPadrao();
                    alvoUser = alvoMarcado;
                }
                const uAlvo = db.usuarios[alvoUser];
                if (uAlvo.trabalhos_hoje === undefined) uAlvo.trabalhos_hoje = 0;
                if (uAlvo.mineracoes_hoje === undefined) uAlvo.mineracoes_hoje = 0;
                if (uAlvo.pescas_hoje === undefined) uAlvo.pescas_hoje = 0;
                if (uAlvo.raspadinhas_hoje === undefined) uAlvo.raspadinhas_hoje = 0;

                let blocoTitulos = "";
                if (uAlvo.titulo_comprado) {
                    const raridadeAtual = obterRaridadePorNome(uAlvo.titulo_comprado);
                    const emojiRaridade = { "Lendario": "🔴", "Ouro": "🏅", "Prata": "⚪" }[raridadeAtual] || "🎭";
                    const nomeRaridade = { "Lendario": "LENDÁRIO", "Ouro": "DE OURO", "Prata": "DE PRATA" }[raridadeAtual] || "";
                    blocoTitulos += ` 💧 TÍTULO ${nomeRaridade} ${emojiRaridade}\n ${uAlvo.titulo_comprado}\n\n`;
                }
                if (uAlvo.titulo_especial) {
                    blocoTitulos += ` 💧 TÍTULO ESPECIAL 🪽\n ${uAlvo.titulo_especial}\n\n`;
                }
                if (!blocoTitulos) blocoTitulos = " 🎭 Nenhum título equipado.\n\n";

                const roubosRecentes = (uAlvo.historico_roubos || []).filter(r => Date.now() - r.timestamp < 86400000);
                let blocoRoubos = "";
                if (roubosRecentes.length > 0) {
                    blocoRoubos = ` 🚨 Roubado nas últimas 24h por:\n`;
                    roubosRecentes.forEach(r => {
                        const horasAtras = Math.floor((Date.now() - r.timestamp) / 3600000);
                        blocoRoubos += `   • @${r.atacante.split('@')[0]} (${r.tipo === 'banco' ? 'banco' : 'carteira'}, ${r.sucesso ? 'sucesso' : 'falhou'}, há ${horasAtras}h)\n`;
                    });
                    blocoRoubos += `\n`;
                }

                let blocoEmprestimos = "";
                if ((uAlvo.emprestimos_feitos || []).length > 0) {
                    blocoEmprestimos += ` 💰 Devem pra ${alvoUser === sender ? 'você' : 'ela(e)'}:\n`;
                    uAlvo.emprestimos_feitos.forEach(e => { blocoEmprestimos += `   • @${e.devedor.split('@')[0]} — ${e.valor} 🪙\n`; });
                }
                if ((uAlvo.emprestimos_recebidos || []).length > 0) {
                    blocoEmprestimos += ` 📤 ${alvoUser === sender ? 'Você deve' : 'Ela(e) deve'}:\n`;
                    uAlvo.emprestimos_recebidos.forEach(e => { blocoEmprestimos += `   • @${e.credor.split('@')[0]} — ${e.valor} 🪙\n`; });
                }

                const mentionsGold = [alvoUser,
                    ...roubosRecentes.map(r => r.atacante),
                    ...(uAlvo.emprestimos_feitos || []).map(e => e.devedor),
                    ...(uAlvo.emprestimos_recebidos || []).map(e => e.credor)];

                const goldTxt = `╔═══════════════════════════════════════╗\n         🪙  𝗖𝗔𝗥𝗧𝗘𝗜𝗥𝗔 𝗩𝗜𝗥𝗧𝗨𝗔𝗟  🪙\n╚═══════════════════════════════════════╝\n 👤 𝗨𝘀𝘂𝗮́𝗿𝗶𝗼: @${alvoUser.split('@')[0]}\n 🪙 𝗦𝗮𝗹𝗱𝗼 𝗔𝘁𝘂𝗮𝗹: ${uAlvo.golds} Golds\n 🏦 𝗡𝗼 𝗕𝗮𝗻𝗰ο: ${uAlvo.banco} Golds\n 🛡️ 𝗘𝘀𝗰𝘂𝗱ο: [${uAlvo.escudo ? 'ATIVO' : 'INATIVO'}]\n 🩹 𝗦𝗲𝗴𝘂𝗿𝗼 𝗣𝗮𝗿𝗰𝗶𝗮𝗹: [${uAlvo.seguro_parcial ? 'ATIVO' : 'INATIVO'}]\n 🔒 𝗖𝗼𝗳𝗿𝗲 𝗕𝗹𝗶𝗻𝗱𝗮𝗱𝗼: [${uAlvo.cofre_blindado ? 'ATIVO' : 'INATIVO'}]\n 📢 𝗔𝗽𝗿𝗲𝘀𝗲𝗻𝘁𝗮𝗰̧𝗮̃𝗼: [${uAlvo.apresentacao ? 'LIGADA' : 'DESLIGADA'}]\n\n${blocoTitulos}─────────────────────────────────────────\n 📊 [ 𝗘𝗡𝗘𝗥𝗚𝗜𝗔 𝗗𝗜𝗔𝗥𝗜𝗔 ] ────────────\n 🔨 Trabalhos hoje: (${uAlvo.trabalhos_hoje}/5)\n ⛏️ Minerações hoje: (${uAlvo.mineracoes_hoje}/5)\n 🎣 Pescas hoje: (${uAlvo.pescas_hoje}/5)\n 🎫 Raspadinhas hoje: (${uAlvo.raspadinhas_hoje}/5)\n─────────────────────────────────────────\n${blocoRoubos}${blocoEmprestimos}╚═══════════════════════════════════════╝`;
                await sock.sendMessage(from, { text: goldTxt, mentions: [...new Set(mentionsGold)] }, { quoted: msg });
                break;
            }

            case 'trabalhar': {
                if (u.trabalhos_hoje >= 5) return sock.sendMessage(from, { text: "🌊 Energia esgotada! Você já atingiu seu limite diário de 5 trabalhos. Volte amanhã! 💧" }, { quoted: msg });
                const ganhoTrab = Math.floor(Math.random() * 41) + 40;
                u.golds += ganhoTrab;
                u.trabalhos_hoje += 1;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🔨 Você trabalhou duro limpando a praia virtual e faturou *${ganhoTrab} Golds* por ordem de Olden! 🌊` }, { quoted: msg });
                break;
            }

            case 'minerar': {
                if (u.mineracoes_hoje >= 5) return sock.sendMessage(from, { text: "🌊 Energia esgotada! Você já atingiu seu limite de 5 minerações diárias. 💧" }, { quoted: msg });
                u.mineracoes_hoje += 1;

                const sorte = Math.random();
                if (sorte > 0.4) {
                    const ganhoMin = Math.floor(Math.random() * 101) + 50;
                    u.golds += ganhoMin;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `⛏️ *💥 MINERAÇÃO DE SUCESSO:* Você encontrou cristais aquáticos na caverna e garantiu *${ganhoMin} Golds*! 🌊` }, { quoted: msg });
                } else {
                    const perdaMin = Math.floor(Math.random() * 41) + 20;
                    u.golds = Math.max(0, u.golds - perdaMin);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `⛏️ *⚠️ DESABAMENTO:* A caverna estremeceu e você perdeu *${perdaMin} Golds* em equipamentos quebrados! 💧` }, { quoted: msg });
                }
                break;
            }

            case 'pescar': {
                if (u.pescas_hoje >= 5) return sock.sendMessage(from, { text: "🎣 Você já pescou o limite de 5 vezes hoje. As águas precisam descansar! 🌊" }, { quoted: msg });
                u.pescas_hoje += 1;

                let ganhoPesca = Math.floor(Math.random() * 51) + 20; // 20-70
                let msgExtraPesca = "";
                if (Math.random() < 0.1) {
                    ganhoPesca = Math.floor(Math.random() * 201) + 200; // 200-400
                    msgExtraPesca = "\n\n🏆 *TESOURO RARO ENCONTRADO!* Sorte rara nas profundezas!";
                }
                if (u.isca_especial_ate && Date.now() < u.isca_especial_ate) {
                    ganhoPesca = Math.floor(ganhoPesca * 1.5);
                    msgExtraPesca += "\n🎣 (Bônus de Isca Especial aplicado!)";
                }

                u.golds += ganhoPesca;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎣 Você pescou e faturou *${ganhoPesca} Golds*!${msgExtraPesca} 🌊` }, { quoted: msg });
                break;
            }

            case 'raspadinha': {
                if (u.raspadinhas_hoje >= 5) return sock.sendMessage(from, { text: "🎫 Limite de 5 raspadinhas hoje atingido. Volte amanhã! 💧" }, { quoted: msg });
                if (u.golds < 20) return sock.sendMessage(from, { text: "❌ A raspadinha custa 20 Golds e você não tem saldo em mãos suficiente." }, { quoted: msg });

                u.golds -= 20;
                u.raspadinhas_hoje += 1;

                const sorteRasp = Math.random();
                let premioRasp = 0;
                let textoRasp = "";
                if (sorteRasp < 0.40) {
                    textoRasp = "💨 Não foi dessa vez, a raspadinha veio em branco!";
                } else if (sorteRasp < 0.80) {
                    premioRasp = Math.floor(Math.random() * 31) + 10; // 10-40
                    textoRasp = `🎉 Prêmio pequeno: *${premioRasp} Golds*!`;
                } else if (sorteRasp < 0.95) {
                    premioRasp = Math.floor(Math.random() * 101) + 50; // 50-150
                    textoRasp = `🎊 Prêmio médio: *${premioRasp} Golds*!`;
                } else {
                    premioRasp = Math.floor(Math.random() * 301) + 300; // 300-600
                    textoRasp = `🏆 *PRÊMIO GRANDE:* ${premioRasp} Golds!!`;
                }
                u.golds += premioRasp;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎫 *RASPADINHA:* ${textoRasp}` }, { quoted: msg });
                break;
            }

            case 'roleta': {
                const apostaRoleta = parseInt(args[0]);
                const escolha = (args[1] || "").toLowerCase();
                if (!apostaRoleta || apostaRoleta <= 0 || !escolha) {
                    return sock.sendMessage(from, { text: "❌ Uso: *!roleta [aposta] [vermelho/preto/número]* Ex: `!roleta 50 vermelho` ou `!roleta 50 17`" }, { quoted: msg });
                }
                if (u.golds < apostaRoleta) return sock.sendMessage(from, { text: "❌ Golds em mãos insuficientes para essa aposta!" }, { quoted: msg });

                const numeroApostado = parseInt(escolha);
                if (isNaN(numeroApostado) && escolha !== 'vermelho' && escolha !== 'preto') {
                    return sock.sendMessage(from, { text: "❌ Escolha inválida! Use *vermelho*, *preto* ou um número de 0 a 36." }, { quoted: msg });
                }

                u.golds -= apostaRoleta;
                const numeroSorteado = Math.floor(Math.random() * 37); // 0-36
                const corSorteada = numeroSorteado === 0 ? null : (NUMEROS_VERMELHOS.includes(numeroSorteado) ? 'vermelho' : 'preto');

                let ganhou = false;
                let multiplicador = 0;
                if (!isNaN(numeroApostado)) {
                    ganhou = numeroApostado === numeroSorteado;
                    multiplicador = 14;
                } else {
                    ganhou = escolha === corSorteada;
                    multiplicador = 2;
                }

                const { vitoria: ganhouFinal, usouFicha } = tentarSorteGrande(ganhou);
                const textoSorte = usouFicha ? (ganhouFinal ? "\n🍀 *Sorte Grande* virou a mesa a seu favor!" : "\n🍀 Sorte Grande tentou, mas não foi dessa vez.") : "";

                if (ganhouFinal) {
                    const premioRoleta = apostaRoleta * multiplicador;
                    u.golds += premioRoleta;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎡 *ROLETA:* Caiu no *${numeroSorteado}* (${corSorteada || 'verde/casa'})! Você ganhou *${premioRoleta} Golds*!${textoSorte}` }, { quoted: msg });
                } else {
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎡 *ROLETA:* Caiu no *${numeroSorteado}* (${corSorteada || 'verde/casa'})! Você perdeu a aposta de *${apostaRoleta} Golds*.${textoSorte}` }, { quoted: msg });
                }
                break;
            }

            case 'slots': {
                const apostaSlots = parseInt(args[0]);
                if (!apostaSlots || apostaSlots <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!slots [aposta]*" }, { quoted: msg });
                if (u.golds < apostaSlots) return sock.sendMessage(from, { text: "❌ Golds em mãos insuficientes para essa aposta!" }, { quoted: msg });

                u.golds -= apostaSlots;
                const simbolosSlots = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
                const resultadoSlots = [0, 0, 0].map(() => simbolosSlots[Math.floor(Math.random() * simbolosSlots.length)]);
                const linhaSlots = resultadoSlots.join(' | ');

                let ganhouSlots = false;
                let multiplicadorSlots = 0;
                if (resultadoSlots[0] === resultadoSlots[1] && resultadoSlots[1] === resultadoSlots[2]) {
                    ganhouSlots = true;
                    multiplicadorSlots = resultadoSlots[0] === '7️⃣' ? 20 : 8;
                } else if (resultadoSlots[0] === resultadoSlots[1] || resultadoSlots[1] === resultadoSlots[2] || resultadoSlots[0] === resultadoSlots[2]) {
                    ganhouSlots = true;
                    multiplicadorSlots = 2;
                }

                const { vitoria: ganhouFinalSlots, usouFicha: usouFichaSlots } = tentarSorteGrande(ganhouSlots);
                if (!ganhouSlots && ganhouFinalSlots) multiplicadorSlots = 2; // prêmio de consolação quando a Sorte Grande reverte
                const textoSorteSlots = usouFichaSlots ? (ganhouFinalSlots ? "\n🍀 *Sorte Grande* salvou sua rodada!" : "\n🍀 Sorte Grande tentou, mas não foi dessa vez.") : "";

                if (ganhouFinalSlots) {
                    const premioSlots = apostaSlots * multiplicadorSlots;
                    u.golds += premioSlots;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎰 [ ${linhaSlots} ]\n🎉 Você ganhou *${premioSlots} Golds*!${textoSorteSlots}` }, { quoted: msg });
                } else {
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎰 [ ${linhaSlots} ]\n💨 Não foi dessa vez, perdeu *${apostaSlots} Golds*.${textoSorteSlots}` }, { quoted: msg });
                }
                break;
            }

            case 'apostar': {
                const apostaDobro = parseInt(args[0]);
                if (!apostaDobro || apostaDobro <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!apostar [quantia]* — Dobro ou nada contra a casa!" }, { quoted: msg });
                if (u.golds < apostaDobro) return sock.sendMessage(from, { text: "❌ Golds em mãos insuficientes para essa aposta!" }, { quoted: msg });

                u.golds -= apostaDobro;
                const ganhouAposta = Math.random() < 0.45;
                if (ganhouAposta) {
                    u.golds += apostaDobro * 2;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 *DOBRO OU NADA:* Sorte grande! Você dobrou e faturou *${apostaDobro * 2} Golds*! 🌊` }, { quoted: msg });
                } else {
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 *DOBRO OU NADA:* A casa levou dessa vez. Você perdeu *${apostaDobro} Golds*. 💧` }, { quoted: msg });
                }
                break;
            }

            case 'dados': {
                const apostaDados = parseInt(args[0]);
                if (!apostaDados || apostaDados <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!dados [aposta]* — Role contra o bot, quem tirar mais alto leva!" }, { quoted: msg });
                if (u.golds < apostaDados) return sock.sendMessage(from, { text: "❌ Golds em mãos insuficientes para essa aposta!" }, { quoted: msg });

                u.golds -= apostaDados;
                const dadoJogador = Math.floor(Math.random() * 6) + 1;
                const dadoBot = Math.floor(Math.random() * 6) + 1;

                if (dadoJogador === dadoBot) {
                    u.golds += apostaDados; // empate devolve a aposta
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🎲 Empate! Você e o bot tiraram *${dadoJogador}*. Sua aposta foi devolvida.` }, { quoted: msg });
                }

                const ganhouDados = dadoJogador > dadoBot;
                const { vitoria: ganhouFinalDados, usouFicha: usouFichaDados } = tentarSorteGrande(ganhouDados);
                const textoSorteDados = usouFichaDados ? (ganhouFinalDados ? "\n🍀 *Sorte Grande* reverteu o resultado a seu favor!" : "\n🍀 Sorte Grande tentou, mas não foi dessa vez.") : "";

                if (ganhouFinalDados) {
                    u.golds += apostaDados * 2;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 Você tirou *${dadoJogador}* e o bot tirou *${dadoBot}*. Vitória! Ganhou *${apostaDados * 2} Golds*!${textoSorteDados}` }, { quoted: msg });
                } else {
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 Você tirou *${dadoJogador}* e o bot tirou *${dadoBot}*. Você perdeu *${apostaDados} Golds*.${textoSorteDados}` }, { quoted: msg });
                }
                break;
            }

            case 'assaltar': {
                const alvoAssalto = obterAlvo(msg);
                if (!alvoAssalto) return sock.sendMessage(from, { text: "❌ Marque ou responda a mensagem de quem você deseja assaltar! Ex: `!assaltar @membro`" }, { quoted: msg });
                if (alvoAssalto === sender) return sock.sendMessage(from, { text: "🤔 Você está tentando se assaltar? Deixe de macaquice!" }, { quoted: msg });

                if (!db.usuarios[alvoAssalto]) db.usuarios[alvoAssalto] = criarUsuarioPadrao();
                let vitima = db.usuarios[alvoAssalto];
                vitima.historico_roubos = vitima.historico_roubos || [];

                if ((vitima.golds || 0) < 50) return sock.sendMessage(from, { text: "💧 Esse membro está muito pobre, não vale a pena assaltá-lo. O crime não compensa tanto assim!" }, { quoted: msg });

                if (vitima.escudo) {
                    vitima.escudo = false;
                    u.golds = Math.max(0, u.golds - 300);
                    vitima.historico_roubos.push({ atacante: sender, tipo: 'carteira', sucesso: false, timestamp: Date.now() });
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🛡️ *💥 ESCUDO ATIVADO:* O escudo antirroubo de @${alvoAssalto.split('@')[0]} quebrou o seu ataque! Você foi pego pelas patrulhas de Olden e multado em *300 Golds*.`, mentions: [alvoAssalto] }, { quoted: msg });
                }

                if (Math.random() > 0.5) {
                    let roubado = Math.floor((vitima.golds || 0) * 0.3);
                    const reduziuSeguro = !!vitima.seguro_parcial;
                    if (reduziuSeguro) roubado = Math.floor(roubado / 2);
                    vitima.golds -= roubado;
                    u.golds += roubado;
                    vitima.historico_roubos.push({ atacante: sender, tipo: 'carteira', sucesso: true, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏴‍☠️ *ASSALTO BEM SUCEDIDO:* Você sorrateiramente surrupiou *${roubado} Golds* da carteira de @${alvoAssalto.split('@')[0]}!${reduziuSeguro ? ' (Seguro Parcial dela reduziu o valor pela metade)' : ''} 🌊`, mentions: [alvoAssalto] }, { quoted: msg });
                } else {
                    const perdaAssalto = Math.floor(u.golds * 0.15);
                    u.golds = Math.max(0, u.golds - perdaAssalto);
                    vitima.historico_roubos.push({ atacante: sender, tipo: 'carteira', sucesso: false, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚨 *ASSALTO FALHOU:* Você tropeçou em uma onda e deixou cair *${perdaAssalto} Golds* enquanto tentava fugir! 💧` }, { quoted: msg });
                }
                break;
            }

            case 'roubar': {
                const alvoRoubar = obterAlvo(msg);
                if (!alvoRoubar) return sock.sendMessage(from, { text: "❌ Marque ou responda a mensagem de quem você deseja roubar o banco! Ex: `!roubar @membro`" }, { quoted: msg });
                if (alvoRoubar === sender) return sock.sendMessage(from, { text: "🤔 Você não pode roubar o próprio banco!" }, { quoted: msg });

                if (!db.usuarios[alvoRoubar]) db.usuarios[alvoRoubar] = criarUsuarioPadrao();
                let vitimaBanco = db.usuarios[alvoRoubar];
                vitimaBanco.historico_roubos = vitimaBanco.historico_roubos || [];

                if ((vitimaBanco.banco || 0) < 100) return sock.sendMessage(from, { text: "💧 Esse membro não tem golds suficientes guardados no banco pra valer o risco!" }, { quoted: msg });

                let chanceSucesso = 0.35;
                if (vitimaBanco.cofre_blindado) chanceSucesso -= 0.15;

                if (Math.random() < chanceSucesso) {
                    const roubadoBanco = Math.floor(vitimaBanco.banco * 0.15);
                    vitimaBanco.banco -= roubadoBanco;
                    u.golds += roubadoBanco;
                    vitimaBanco.historico_roubos.push({ atacante: sender, tipo: 'banco', sucesso: true, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏦🏴‍☠️ *ASSALTO AO BANCO:* Você driblou a segurança e sacou *${roubadoBanco} Golds* do banco de @${alvoRoubar.split('@')[0]}! Operação de alto risco compensou! 🌊`, mentions: [alvoRoubar] }, { quoted: msg });
                } else {
                    const perdaRoubar = Math.floor(u.golds * 0.25);
                    u.golds = Math.max(0, u.golds - perdaRoubar);
                    vitimaBanco.historico_roubos.push({ atacante: sender, tipo: 'banco', sucesso: false, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚨 *ALARME DISPARADO:* A segurança do banco te pegou! Você pagou uma fiança de *${perdaRoubar} Golds* e fugiu de mãos vazias.${vitimaBanco.cofre_blindado ? ' (Cofre Blindado dela dificultou ainda mais)' : ''} 💧` }, { quoted: msg });
                }
                break;
            }

            case 'revidar': {
                u.historico_roubos = u.historico_roubos || [];
                const roubosValidos = u.historico_roubos.filter(r => Date.now() - r.timestamp < 86400000);
                if (roubosValidos.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Você não foi roubado nas últimas 24h, não tem contra quem revidar!" }, { quoted: msg });
                }
                roubosValidos.sort((a, b) => b.timestamp - a.timestamp);
                const ultimoAtaque = roubosValidos[0];
                const alvoRevidar = ultimoAtaque.atacante;

                const indiceOriginal = u.historico_roubos.indexOf(ultimoAtaque);
                if (indiceOriginal !== -1) u.historico_roubos.splice(indiceOriginal, 1);

                if (!db.usuarios[alvoRevidar]) db.usuarios[alvoRevidar] = criarUsuarioPadrao();
                let vitimaRevidar = db.usuarios[alvoRevidar];

                if ((vitimaRevidar.golds || 0) < 30) {
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `💧 @${alvoRevidar.split('@')[0]} está sem golds suficientes em mãos pra valer a pena revidar agora.`, mentions: [alvoRevidar] }, { quoted: msg });
                }

                if (Math.random() < 0.6) {
                    let roubadoRevidar = Math.floor(vitimaRevidar.golds * 0.3);
                    if (vitimaRevidar.seguro_parcial) roubadoRevidar = Math.floor(roubadoRevidar / 2);
                    vitimaRevidar.golds -= roubadoRevidar;
                    u.golds += roubadoRevidar;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `⚔️ *REVIDE CERTEIRO:* Você se vingou de @${alvoRevidar.split('@')[0]} e recuperou *${roubadoRevidar} Golds*! 🌊`, mentions: [alvoRevidar] }, { quoted: msg });
                } else {
                    const perdaRevidar = Math.floor(u.golds * 0.15);
                    u.golds = Math.max(0, u.golds - perdaRevidar);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚨 *REVIDE FALHOU:* Você tentou se vingar de @${alvoRevidar.split('@')[0]} mas se estrepou, perdendo *${perdaRevidar} Golds*. 💧`, mentions: [alvoRevidar] }, { quoted: msg });
                }
                break;
            }

            case 'banco': {
                const acao = args[0];
                const valor = parseInt(args[1]);
                if (!acao || isNaN(valor) || valor <= 0) return sock.sendMessage(from, { text: "❌ Uso correto: *!banco depositar [quantia]* ou *!banco sacar [quantia]*" }, { quoted: msg });

                if (acao === 'depositar') {
                    if (u.golds < valor) return sock.sendMessage(from, { text: "❌ Saldo insuficiente em mãos para efetuar o depósito!" }, { quoted: msg });
                    u.golds -= valor;
                    u.banco = (u.banco || 0) + valor;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏦 *DEPÓSITO:* Guardados *${valor} Golds* no cofre forte do Leicybot-. Protegido de assaltos! 🌊` }, { quoted: msg });
                } else if (acao === 'sacar') {
                    if ((u.banco || 0) < valor) return sock.sendMessage(from, { text: "❌ Você não tem toda essa quantia guardada no banco!" }, { quoted: msg });
                    u.banco -= valor;
                    u.golds += valor;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏦 *SAQUE:* Retirados *${valor} Golds* para a sua carteira em mãos. 💧` }, { quoted: msg });
                }
                break;
            }

            case 'pagar': {
                const recebedor = obterAlvo(msg);
                const valorPg = parseInt(args[1] || args[0]);
                if (!recebedor || isNaN(valorPg) || valorPg <= 0) return sock.sendMessage(from, { text: "❌ Uso correto: *!pagar [@membro ou responda] [quantia]*" }, { quoted: msg });
                if (recebedor === sender) return sock.sendMessage(from, { text: "❌ Você não pode transferir dinheiro para você mesmo!" }, { quoted: msg });
                if (u.golds < valorPg) return sock.sendMessage(from, { text: "❌ Você não tem Golds em mãos suficientes para transferir!" }, { quoted: msg });

                if (!db.usuarios[recebedor]) db.usuarios[recebedor] = criarUsuarioPadrao();
                u.golds -= valorPg;
                db.usuarios[recebedor].golds = (db.usuarios[recebedor].golds || 0) + valorPg;
                salvarDB(db);
                await sock.sendMessage(from, { text: `💸 *TRANSFERÊNCIA:* Você enviou *${valorPg} Golds* diretamente para @${recebedor.split('@')[0]} de forma segura!`, mentions: [recebedor] }, { quoted: msg });
                break;
            }

            case 'emprestar': {
                const devedorAlvo = obterAlvo(msg);
                const valorEmp = parseInt(args[1] || args[0]);
                if (!devedorAlvo || isNaN(valorEmp) || valorEmp <= 0) return sock.sendMessage(from, { text: "❌ Uso correto: *!emprestar [@membro ou responda] [quantia]*" }, { quoted: msg });
                if (devedorAlvo === sender) return sock.sendMessage(from, { text: "❌ Você não pode emprestar dinheiro pra você mesmo!" }, { quoted: msg });
                if (u.golds < valorEmp) return sock.sendMessage(from, { text: "❌ Você não tem Golds em mãos suficientes pra emprestar essa quantia!" }, { quoted: msg });

                if (!db.usuarios[devedorAlvo]) db.usuarios[devedorAlvo] = criarUsuarioPadrao();
                const devedorObj = db.usuarios[devedorAlvo];

                u.golds -= valorEmp;
                devedorObj.golds = (devedorObj.golds || 0) + valorEmp;

                u.emprestimos_feitos = u.emprestimos_feitos || [];
                u.emprestimos_feitos.push({ devedor: devedorAlvo, valor: valorEmp, timestamp: Date.now() });

                devedorObj.emprestimos_recebidos = devedorObj.emprestimos_recebidos || [];
                devedorObj.emprestimos_recebidos.push({ credor: sender, valor: valorEmp, timestamp: Date.now() });

                salvarDB(db);
                await sock.sendMessage(from, { text: `🤝 *EMPRÉSTIMO:* Você emprestou *${valorEmp} Golds* para @${devedorAlvo.split('@')[0]}. A dívida aparece pros dois no !gold.`, mentions: [devedorAlvo] }, { quoted: msg });
                break;
            }

            case 'investir': {
                const valorInv = parseInt(args[0]);
                if (!valorInv || valorInv <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!investir [quantia]*" }, { quoted: msg });
                if (u.investimento) return sock.sendMessage(from, { text: `❌ Você já tem *${u.investimento.valor} Golds* investidos. Use *!resgatar* quando o prazo terminar antes de investir de novo.` }, { quoted: msg });
                if (u.golds < valorInv) return sock.sendMessage(from, { text: "❌ Golds em mãos insuficientes pra esse investimento!" }, { quoted: msg });

                u.golds -= valorInv;
                const duracaoInvestimento = 6 * 60 * 60 * 1000; // 6 horas
                u.investimento = {
                    valor: valorInv,
                    criado_em: Date.now(),
                    resgatavel_em: Date.now() + duracaoInvestimento,
                    bonus_pct: 20
                };
                salvarDB(db);
                await sock.sendMessage(from, { text: `📈 *INVESTIMENTO REALIZADO:* *${valorInv} Golds* travados por 6 horas, com bônus de 20% ao resgatar. Use *!resgatar* quando o prazo passar! 🌊` }, { quoted: msg });
                break;
            }

            case 'resgatar': {
                if (!u.investimento) return sock.sendMessage(from, { text: "❌ Você não tem nenhum investimento ativo. Use *!investir [quantia]* primeiro." }, { quoted: msg });
                if (Date.now() < u.investimento.resgatavel_em) {
                    const restanteMs = u.investimento.resgatavel_em - Date.now();
                    const restanteMin = Math.ceil(restanteMs / 60000);
                    return sock.sendMessage(from, { text: `⏳ Seu investimento ainda não pode ser resgatado. Faltam aproximadamente *${restanteMin} minutos*.` }, { quoted: msg });
                }

                const retorno = Math.floor(u.investimento.valor * (1 + u.investimento.bonus_pct / 100));
                const valorOriginal = u.investimento.valor;
                u.golds += retorno;
                u.investimento = null;
                salvarDB(db);
                await sock.sendMessage(from, { text: `💰 *RESGATE:* Seu investimento de *${valorOriginal} Golds* rendeu e voltou como *${retorno} Golds*! 🌊` }, { quoted: msg });
                break;
            }

            case 'rankgold': {
                const ID_EXEMPLO = 'exemplo_modelo_usuario@s.whatsapp.net';
                let ordenados = Object.keys(db.usuarios)
                    .filter(id => id !== ID_EXEMPLO)
                    .map(id => ({ id, total: (db.usuarios[id].golds || 0) + (db.usuarios[id].banco || 0) }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                let rankTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  🪙  𝗧𝗢𝗣 𝟭𝟬 - 𝗠𝗔𝗚𝗡𝗔𝗧𝗔𝗦 𝗗𝗢 𝗚𝗥𝗨𝗣𝗢  🪙  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Maiores economias sob a supervisão de Olden:\n\n`;
                const medalhas = ["🥇", "🥈", "🥉", "💧", "💧", "💧", "💧", "💧", "💧", "💧"];
                ordenados.forEach((m, idx) => {
                    rankTxt += ` ${medalhas[idx]} *${idx + 1}º Lugar:* @${m.id.split('@')[0]} ➔ 🪙 *${m.total} Golds*\n`;
                });
                rankTxt += `\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: rankTxt, mentions: ordenados.map(m => m.id) }, { quoted: msg });
                break;
            }

            case 'loja': {
                const lojaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██         🏪  𝗟𝗢𝗝𝗔 𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧  🏪         ██▓\n░▒▓█████████████████████████████████████▓▒░\n🛡️ *escudo* — 50 🪙\n   Bloqueia 100% de 1 assalto (!assaltar), quebra com o uso.\n\n📢 *apresentacaobuy* — 100 🪙\n   Ativa o anúncio automático do seu título no chat.\n\n🩹 *seguroparcial* — 80 🪙\n   Reduz pela metade o valor roubado num !assaltar. Não quebra com o uso.\n\n🔋 *recargarapida* — 60 🪙\n   Uso único: zera na hora o limite diário de !trabalhar e !minerar.\n\n🔒 *cofreblindado* — 150 🪙\n   Reduz a chance de sucesso de um !roubar (mira o banco) contra você.\n\n🎣 *iscaespecial* — 70 🪙\n   Aumenta os prêmios do !pescar por 24 horas.\n\n🍀 *sortegrande* — 100 🪙\n   +10 fichas de segunda chance em !roleta / !slots / !dados.\n\n🔴 *TÍTULOS LENDÁRIOS* (3.000🪙 | limite 1 dono/grupo)\n➔ luasuperior1 | pecadoganancia | reipiratas | vingadorhogwarts | donodabanca\n\n🟡 *TÍTULOS DE OURO* (1.500🪙 | limite 5 donos/grupo)\n➔ luasuperior2 | luasuperior3 | supersaiyajin | chefedehawkins | hereditariajoseon\n\n⚪ *TÍTULOS DE PRATA* (500🪙 | limite 15 donos/grupo)\n➔ luainferior1 | luainferior2 | luainferior3 | luainferior5 | hashiraagua | satorugojo | heartthrobseul | garidekonoha | membroround6 | ceodeseul | cacadordemogorgon | estudanteshisui\n\n👉 Use: *!comprar [nome_do_item]*\n⚠️ Só é possível ter 1 título comprado por vez — use *!vendertitulo* antes de trocar.\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: lojaTxt }, { quoted: msg });
                break;
            }

            case 'comprar': {
                const itemAlvo = args[0]?.toLowerCase();
                if (!itemAlvo) return sock.sendMessage(from, { text: "❌ Indique o que deseja comprar! Ex: `!comprar escudo` ou `!comprar luasuperior3`" }, { quoted: msg });

                if (itemAlvo === 'escudo') {
                    if (u.golds < 50) return sock.sendMessage(from, { text: "❌ Golds insuficientes! O Escudo custa 50 Golds." }, { quoted: msg });
                    if (u.escudo) return sock.sendMessage(from, { text: "🛡️ Você já possui um escudo ativo em sua conta!" }, { quoted: msg });
                    u.golds -= 50;
                    u.escudo = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🛡️ *ESCUDO ADQUIRIDO:* Seu sistema de segurança está ativo contra o próximo assalto! 🌊" }, { quoted: msg });
                }

                if (itemAlvo === 'apresentacaobuy') {
                    if (u.golds < 100) return sock.sendMessage(from, { text: "❌ Golds insuficientes! Custa 100 Golds." }, { quoted: msg });
                    u.golds -= 100;
                    u.apresentacao = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "📢 *APRESENTAÇÃO ATIVADA:* Seus títulos cadastrados serão anunciados sempre que interagir!" }, { quoted: msg });
                }

                if (itemAlvo === 'seguroparcial') {
                    if (u.golds < 80) return sock.sendMessage(from, { text: "❌ Golds insuficientes! O Seguro Parcial custa 80 Golds." }, { quoted: msg });
                    if (u.seguro_parcial) return sock.sendMessage(from, { text: "🩹 Você já possui o Seguro Parcial ativo!" }, { quoted: msg });
                    u.golds -= 80;
                    u.seguro_parcial = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🩹 *SEGURO PARCIAL ATIVADO:* Roubos contra você agora rendem metade do valor pro atacante, indefinidamente! 🌊" }, { quoted: msg });
                }

                if (itemAlvo === 'recargarapida') {
                    if (u.golds < 60) return sock.sendMessage(from, { text: "❌ Golds insuficientes! A Recarga Rápida custa 60 Golds." }, { quoted: msg });
                    u.golds -= 60;
                    u.trabalhos_hoje = 0;
                    u.mineracoes_hoje = 0;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🔋 *RECARGA RÁPIDA USADA:* Seus limites diários de !trabalhar e !minerar foram zerados na hora! 🌊" }, { quoted: msg });
                }

                if (itemAlvo === 'cofreblindado') {
                    if (u.golds < 150) return sock.sendMessage(from, { text: "❌ Golds insuficientes! O Cofre Blindado custa 150 Golds." }, { quoted: msg });
                    if (u.cofre_blindado) return sock.sendMessage(from, { text: "🔒 Você já possui o Cofre Blindado ativo!" }, { quoted: msg });
                    u.golds -= 150;
                    u.cofre_blindado = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🔒 *COFRE BLINDADO ATIVADO:* Seu banco agora está mais protegido contra !roubar! 🌊" }, { quoted: msg });
                }

                if (itemAlvo === 'iscaespecial') {
                    if (u.golds < 70) return sock.sendMessage(from, { text: "❌ Golds insuficientes! A Isca Especial custa 70 Golds." }, { quoted: msg });
                    u.golds -= 70;
                    u.isca_especial_ate = Date.now() + 86400000;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🎣 *ISCA ESPECIAL ATIVADA:* Seus prêmios de !pescar ficam turbinados pelas próximas 24 horas! 🌊" }, { quoted: msg });
                }

                if (itemAlvo === 'sortegrande') {
                    if (u.golds < 100) return sock.sendMessage(from, { text: "❌ Golds insuficientes! Sorte Grande custa 100 Golds." }, { quoted: msg });
                    u.golds -= 100;
                    u.sorte_grande_jogadas = (u.sorte_grande_jogadas || 0) + 10;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🍀 *SORTE GRANDE ATIVADA:* +10 fichas de segunda chance pra !roleta / !slots / !dados! Total agora: ${u.sorte_grande_jogadas}.` }, { quoted: msg });
                }

                const itemTitulo = catálogoTítulos[itemAlvo];
                if (!itemTitulo) return sock.sendMessage(from, { text: "❌ Item ou título não encontrado em nossa vitrine. Digite *!loja* para ver as opções!" }, { quoted: msg });

                if (u.golds < itemTitulo.preco) return sock.sendMessage(from, { text: `❌ Saldo insuficiente! O título *${itemTitulo.nome}* exige *${itemTitulo.preco} Golds* em mãos.` }, { quoted: msg });

                let limitesRaridade = { "Lendario": 1, "Ouro": 5, "Prata": 15 };
                if (contarDonosRaridade(itemTitulo.raridade) >= limitesRaridade[itemTitulo.raridade]) {
                    return sock.sendMessage(from, { text: `❌ Vagas esgotadas no grupo para títulos de nível *${itemTitulo.raridade}*! Aguarde alguém vender.` }, { quoted: msg });
                }

                if (u.titulo_comprado === itemTitulo.nome) {
                    return sock.sendMessage(from, { text: "❌ Você já possui esse título equipado!" }, { quoted: msg });
                }
                if (u.titulo_comprado) {
                    return sock.sendMessage(from, { text: `❌ Você já tem o título *${u.titulo_comprado}* equipado. Use *!vendertitulo* antes de comprar outro — só cabe 1 por vez.` }, { quoted: msg });
                }

                u.titulo_comprado = itemTitulo.nome;
                u.golds -= itemTitulo.preco;
                u.data_expiracao = Date.now() + 604800000;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎉 *COMPRA EFETUADA:* Você adquiriu o título *${itemTitulo.nome}* por 1 semana! 🌊` }, { quoted: msg });
                break;
            }

            case 'vendertitulo': {
                if (!u.titulo_comprado) return sock.sendMessage(from, { text: "🎭 Você não tem nenhum título comprado equipado no momento." }, { quoted: msg });
                u.titulo_comprado = null;
                u.data_expiracao = null;
                salvarDB(db);
                await sock.sendMessage(from, { text: "🎭 Título comprado removido com sucesso. Vaga liberada pra comprar outro! 💧" }, { quoted: msg });
                break;
            }

            case 'apresentacao': {
                if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                    return sock.sendMessage(from, { text: "🌊 Use: *!apresentacao on* ou *!apresentacao off* para alternar os anúncios!" }, { quoted: msg });
                }
                u.apresentacao = args[0] === 'on';
                salvarDB(db);
                await sock.sendMessage(from, { text: `📢 Anúncio automático de títulos definido para: *${args[0].toUpperCase()}*.` }, { quoted: msg });
                break;
            }

            default:
                break;
        }
    } catch (erro) {
        console.error("Erro interno detectado no economia.js: ", erro);
    }
};

module.exports = economiaModulo;
module.exports.economiaModulo = economiaModulo;
module.exports.default = economiaModulo;
