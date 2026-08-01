// modulos/economia.js
const criarUsuarioPadrao = require('./usuarioPadrao');
const { obterAlvo } = require('./jidUtils');

const economiaModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        let sender = msg.key.participant || msg.key.remoteJid;

        // Normaliza JID multi-dispositivo
        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        if (!db.usuarios) db.usuarios = {};
        if (!db.usuarios[sender]) {
            db.usuarios[sender] = criarUsuarioPadrao();
        }

        let u = db.usuarios[sender];

        // Garantia de propriedades
        if (u.trabalhos_hoje === undefined) u.trabalhos_hoje = 0;
        if (u.mineracoes_hoje === undefined) u.mineracoes_hoje = 0;
        if (u.pescas_hoje === undefined) u.pescas_hoje = 0;
        if (u.raspadinhas_hoje === undefined) u.raspadinhas_hoje = 0;
        if (u.sorte_grande_jogadas === undefined) u.sorte_grande_jogadas = 0;
        if (!u.roubos_sofridos) u.roubos_sofridos = [];
        if (!u.dividas_emprestadas) u.dividas_emprestadas = [];
        if (!u.dividas_devidas) u.dividas_devidas = [];

        // Reset diário dos limites
        const hojeData = new Date().toLocaleDateString();
        if (u.ultimo_mensagem_data !== hojeData) {
            u.trabalhos_hoje = 0;
            u.mineracoes_hoje = 0;
            u.pescas_hoje = 0;
            u.raspadinhas_hoje = 0;
            u.ultimo_mensagem_data = hojeData;
            salvarDB(db);
        }

        // Catálogo de títulos (mantido igual)
        const catalogoTitulos = {
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
            const encontrado = Object.values(catalogoTitulos).find(t => t.nome === nomeItem);
            return encontrado ? encontrado.raridade : null;
        };

        const contarDonosRaridade = (raridade) => {
            let contagem = 0;
            Object.values(db.usuarios).forEach(user => {
                if (user.titulo_slot1 && obterRaridadePorNome(user.titulo_slot1) === raridade) contagem++;
                if (user.titulo_slot2 && obterRaridadePorNome(user.titulo_slot2) === raridade) contagem++;
            });
            return contagem;
        };

        // Helper para exibir títulos formatados
        const formatarTitulos = (usuario) => {
            let txt = '';
            if (usuario.titulo_slot1) {
                const raridade = obterRaridadePorNome(usuario.titulo_slot1);
                const emoji = raridade === 'Lendario' ? '🔴' : (raridade === 'Ouro' ? '🏅' : '⚪');
                txt += `💧 TÍTULO ${raridade ? raridade.toUpperCase() : 'DESCONHECIDO'} ${emoji}\n${usuario.titulo_slot1}\n\n`;
            }
            if (usuario.titulo_slot2) {
                txt += `💧 TÍTULO ESPECIAL 🪽\n${usuario.titulo_slot2}\n\n`;
            }
            if (!txt) txt = 'Nenhum título equipado.\n';
            return txt;
        };

        // ─── COMANDOS ───
        switch (comando) {
            case 'menugold': {
                const menuGoldTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  💳  𝗧𝗢𝗣 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 - 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔  💳  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Sob a gerência do comandante Olden.\n\n ➔ *!gold* - Consulta saldo, banco, títulos e energias.\n ➔ *!trabalhar* - Executa tarefas seguras (Lim. 5/dia).\n ➔ *!minerar* - Tenta escavar na mina de risco (Lim. 5/dia).\n ➔ *!assaltar [@user]* - Tenta saquear os Golds em mãos de um alvo.\n ➔ *!roubar [@user]* - Tenta roubar o banco de alguém (mais arriscado).\n ➔ *!revidar* - Contra-ataca o último ladrão que te roubou (24h).\n ➔ *!pagar [@user] [quantia]* - Transfere dinheiro para um amigo.\n ➔ *!emprestar [@user] [valor]* - Empresta golds e registra a dívida.\n ➔ *!banco depositar/sacar [quantia]* - Guarda fundos com segurança.\n ➔ *!rankgold* - Placar dos 10 bilionários do grupo.\n ➔ *!loja* - Abre a vitrine de itens e títulos.\n ➔ *!comprar [nome_do_item]* - Adquire um privilégio.\n ➔ *!vendertitulo* - Remove seus títulos atuais para abrir vagas.\n ➔ *!apresentacao [on/off]* - Liga/Desliga anúncio automático.\n ➔ *!roleta [aposta] [cor/número]* - Aposta em vermelho/preto (2x) ou número (14x).\n ➔ *!slots [aposta]* - Caça-níqueis com 3 símbolos.\n ➔ *!apostar [aposta]* - Dobro ou nada contra a casa.\n ➔ *!dados [aposta]* - Disputa de dados contra o bot.\n ➔ *!pescar* - Pesca diária com prêmios variados.\n ➔ *!raspadinha* - Raspadinha instantânea.\n ➔ *!investir [valor]* - Investe golds para render juros.\n ➔ *!resgatar* - Resgata investimento + rendimento.\n ➔ *!usar [item]* - Ativa um item comprado (recarga, etc.).\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: menuGoldTxt }, { quoted: msg });
                break;
            }

            case 'gold':
            case 'saldo':
            case 'carteira': {
                // Mecânica de resposta: se houver alvo (menção/resposta), mostra o perfil dele
                const alvo = obterAlvo(msg) || sender;
                if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();
                const uAlvo = db.usuarios[alvo];

                // Limpa histórico de roubos antigos (>24h)
                const agora = Date.now();
                uAlvo.roubos_sofridos = uAlvo.roubos_sofridos.filter(r => agora - r.timestamp < 86400000);

                // Exibe dívidas
                let dividasTxt = '';
                if (uAlvo.dividas_emprestadas.length > 0) {
                    dividasTxt += '📤 *Emprestado a:*\n';
                    uAlvo.dividas_emprestadas.forEach(d => {
                        dividasTxt += `  → @${d.para.split('@')[0]}: ${d.valor} 🪙\n`;
                    });
                }
                if (uAlvo.dividas_devidas.length > 0) {
                    dividasTxt += '📥 *Devendo a:*\n';
                    uAlvo.dividas_devidas.forEach(d => {
                        dividasTxt += `  → @${d.de.split('@')[0]}: ${d.valor} 🪙\n`;
                    });
                }
                if (!dividasTxt) dividasTxt = 'Nenhuma pendência financeira.\n';

                // Último ladrão
                let ultimoRouboTxt = '';
                const ultimoRoubo = uAlvo.roubos_sofridos[uAlvo.roubos_sofridos.length - 1];
                if (ultimoRoubo) {
                    ultimoRouboTxt = `⚠️ Último roubo: @${ultimoRoubo.de.split('@')[0]} levou ${ultimoRoubo.valor} 🪙 há ${Math.round((agora - ultimoRoubo.timestamp) / 3600000)}h\n`;
                }

                const goldTxt = `╔═══════════════════════════════════════╗\n         💳  𝗖𝗔𝗥𝗧𝗘𝗜𝗥𝗔 𝗩𝗜𝗥𝗧𝗨𝗔𝗟  💳\n╚═══════════════════════════════════════╝\n 👤 𝗨𝘀𝘂𝗮́𝗿𝗶𝗼: @${uAlvo.id || alvo.split('@')[0]}\n 💳 𝗦𝗮𝗹𝗱𝗼 𝗔𝘁𝘂𝗮𝗹: ${uAlvo.golds} 🪙\n 🏦 𝗡𝗼 𝗕𝗮𝗻𝗰ο: ${uAlvo.banco} 🪙\n 🛡️ 𝗘𝘀𝗰𝘂𝗱ο: [${uAlvo.escudo ? 'ATIVO' : 'INATIVO'}]\n 🛡️ 𝗦𝗲𝗴𝘂𝗿𝗼 𝗣𝗮𝗿𝗰𝗶𝗮𝗹: [${uAlvo.seguro_parcial ? 'ATIVO' : 'INATIVO'}]\n 🔒 𝗖𝗼𝗳𝗿𝗲 𝗕𝗹𝗶𝗻𝗱𝗮𝗱𝗼: [${uAlvo.cofre_blindado_ate > agora ? 'ATIVO' : 'INATIVO'}]\n 🎣 𝗜𝘀𝗰𝗮 𝗘𝘀𝗽𝗲𝗰𝗶𝗮𝗹: [${uAlvo.isca_especial_ate > agora ? 'ATIVO' : 'INATIVO'}]\n 🍀 𝗦𝗼𝗿𝘁𝗲 𝗚𝗿𝗮𝗻𝗱𝗲: ${uAlvo.sorte_grande_jogadas} jogadas restantes\n\n${formatarTitulos(uAlvo)}─────────────────────────────────────────\n 📊 [ 𝗘𝗡𝗘𝗥𝗚𝗜𝗔 𝗗𝗜𝗔𝗥𝗜𝗔 ] ────────────\n 🔨 Trabalhos hoje: (${uAlvo.trabalhos_hoje}/5)\n ⛏️ Minerações hoje: (${uAlvo.mineracoes_hoje}/5)\n 🎣 Pescas hoje: (${uAlvo.pescas_hoje}/5)\n 🎫 Raspadinhas hoje: (${uAlvo.raspadinhas_hoje}/3)\n─────────────────────────────────────────\n${dividasTxt}\n${ultimoRouboTxt}╚═══════════════════════════════════════╝`;
                await sock.sendMessage(from, { text: goldTxt, mentions: [alvo, ...(uAlvo.dividas_emprestadas.map(d => d.para)), ...(uAlvo.dividas_devidas.map(d => d.de)), ...(ultimoRoubo ? [ultimoRoubo.de] : [])] }, { quoted: msg });
                break;
            }

            case 'trabalhar': {
                if (u.trabalhos_hoje >= 5) return sock.sendMessage(from, { text: "🌊 Energia esgotada! Você já atingiu seu limite diário de 5 trabalhos. Volte amanhã! 💧" }, { quoted: msg });
                const ganhoTrab = Math.floor(Math.random() * 41) + 40;
                u.golds += ganhoTrab;
                u.trabalhos_hoje += 1;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🔨 Você trabalhou duro limpando a praia virtual e faturou *${ganhoTrab} 🪙* por ordem de Olden! 🌊` }, { quoted: msg });
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
                    await sock.sendMessage(from, { text: `⛏️ *💥 MINERAÇÃO DE SUCESSO:* Você encontrou cristais aquáticos na caverna e garantiu *${ganhoMin} 🪙*! 🌊` }, { quoted: msg });
                } else {
                    const perdaMin = Math.floor(Math.random() * 41) + 20;
                    u.golds = Math.max(0, u.golds - perdaMin);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `⛏️ *⚠️ DESABAMENTO:* A caverna estremeceu e você perdeu *${perdaMin} 🪙* em equipamentos quebrados! 💧` }, { quoted: msg });
                }
                break;
            }

            case 'assaltar': {
                let alvo = obterAlvo(msg);
                if (!alvo) return sock.sendMessage(from, { text: "❌ Mencione ou responda a quem você deseja assaltar! Ex: `!assaltar @membro`" }, { quoted: msg });
                if (alvo === sender) return sock.sendMessage(from, { text: "🤔 Você está tentando se assaltar? Deixe de macaquice!" }, { quoted: msg });

                if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();
                let vitima = db.usuarios[alvo];

                if ((vitima.golds || 0) < 50) return sock.sendMessage(from, { text: "💧 Esse membro está muito pobre, não vale a pena assaltá-lo. O crime não compensa tanto assim!" }, { quoted: msg });

                // Verifica Escudo primeiro
                if (vitima.escudo) {
                    vitima.escudo = false;
                    u.golds = Math.max(0, u.golds - 300);
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🛡️ *💥 ESCUDO ATIVADO:* O escudo antirroubo de @${alvo.split('@')[0]} quebrou o seu ataque! Você foi pego pelas patrulhas de Olden e multado em *300 🪙*.`, mentions: [alvo] }, { quoted: msg });
                }

                let valorRoubado = Math.floor((vitima.golds || 0) * 0.3);
                // Seguro Parcial reduz pela metade
                if (vitima.seguro_parcial) {
                    valorRoubado = Math.floor(valorRoubado / 2);
                    vitima.seguro_parcial = false; // quebra após uso
                }

                const chance = Math.random();
                if (chance > 0.5) {
                    vitima.golds -= valorRoubado;
                    u.golds += valorRoubado;
                    // Registra roubo no histórico da vítima
                    vitima.roubos_sofridos.push({ de: sender, valor: valorRoubado, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏴‍☠️ *ASSALTO BEM SUCEDIDO:* Você sorrateiramente surrupiou *${valorRoubado} 🪙* da carteira de @${alvo.split('@')[0]}! 🌊`, mentions: [alvo] }, { quoted: msg });
                } else {
                    const perdaAssalto = Math.floor(u.golds * 0.15);
                    u.golds = Math.max(0, u.golds - perdaAssalto);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚨 *ASSALTO FALHOU:* Você tropeçou em uma onda e deixou cair *${perdaAssalto} 🪙* enquanto tentava fugir! 💧` }, { quoted: msg });
                }
                break;
            }

            case 'roubar': {
                let alvo = obterAlvo(msg);
                if (!alvo) return sock.sendMessage(from, { text: "❌ Mencione ou responda a quem você deseja roubar o banco! Ex: `!roubar @membro`" }, { quoted: msg });
                if (alvo === sender) return sock.sendMessage(from, { text: "🤔 Roubar a si mesmo? Isso não faz sentido." }, { quoted: msg });

                if (!db.usuarios[alvo]) db.usuarios[alvo] = criarUsuarioPadrao();
                let vitima = db.usuarios[alvo];

                if ((vitima.banco || 0) < 100) return sock.sendMessage(from, { text: "💧 O banco desse membro está muito vazio para valer o risco." }, { quoted: msg });

                // Chance base reduzida por Cofre Blindado
                let chanceRoubo = 0.35;
                if (vitima.cofre_blindado_ate && vitima.cofre_blindado_ate > Date.now()) {
                    chanceRoubo = 0.15;
                }

                if (Math.random() > chanceRoubo) {
                    const roubado = Math.floor((vitima.banco || 0) * 0.25);
                    vitima.banco -= roubado;
                    u.golds += roubado;
                    vitima.roubos_sofridos.push({ de: sender, valor: roubado, timestamp: Date.now() });
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🔓 *BANCO ROUBADO:* Você invadiu o cofre de @${alvo.split('@')[0]} e levou *${roubado} 🪙*!`, mentions: [alvo] }, { quoted: msg });
                } else {
                    const multa = Math.floor(u.golds * 0.20) + 100;
                    u.golds = Math.max(0, u.golds - multa);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚔 *ROUBO FALHOU:* O alarme do banco disparou e você foi multado em *${multa} 🪙*!` }, { quoted: msg });
                }
                break;
            }

            case 'revidar': {
                const ultimo = u.roubos_sofridos[u.roubos_sofridos.length - 1];
                if (!ultimo || Date.now() - ultimo.timestamp > 86400000) {
                    return sock.sendMessage(from, { text: "❌ Ninguém te roubou nas últimas 24h para você revidar." }, { quoted: msg });
                }
                const ladrao = ultimo.de;
                if (!db.usuarios[ladrao]) db.usuarios[ladrao] = criarUsuarioPadrao();
                const chanceRevide = 0.45;
                if (Math.random() < chanceRevide) {
                    const recuperado = Math.floor(ultimo.valor * 0.8);
                    db.usuarios[ladrao].golds = Math.max(0, (db.usuarios[ladrao].golds || 0) - recuperado);
                    u.golds += recuperado;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `⚔️ *REVIDE BEM-SUCEDIDO:* Você recuperou *${recuperado} 🪙* do ladrão @${ladrao.split('@')[0]}!`, mentions: [ladrao] }, { quoted: msg });
                } else {
                    const perdaRevide = Math.floor(u.golds * 0.1);
                    u.golds = Math.max(0, u.golds - perdaRevide);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `💢 *REVIDE FALHOU:* Você tentou se vingar mas acabou perdendo *${perdaRevide} 🪙* na tentativa.` }, { quoted: msg });
                }
                break;
            }

            case 'emprestar': {
                const recebedor = obterAlvo(msg);
                const valor = parseInt(args[1] || args[0]);
                if (!recebedor || isNaN(valor) || valor <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!emprestar @membro [valor]*" }, { quoted: msg });
                if (recebedor === sender) return sock.sendMessage(from, { text: "❌ Você não pode emprestar para você mesmo." }, { quoted: msg });
                if (u.golds < valor) return sock.sendMessage(from, { text: "❌ Você não tem golds suficientes para emprestar." }, { quoted: msg });

                if (!db.usuarios[recebedor]) db.usuarios[recebedor] = criarUsuarioPadrao();
                u.golds -= valor;
                db.usuarios[recebedor].golds = (db.usuarios[recebedor].golds || 0) + valor;

                // Registra dívida
                u.dividas_emprestadas.push({ para: recebedor, valor, timestamp: Date.now() });
                db.usuarios[recebedor].dividas_devidas.push({ de: sender, valor, timestamp: Date.now() });

                salvarDB(db);
                await sock.sendMessage(from, { text: `🤝 *EMPRÉSTIMO:* Você emprestou *${valor} 🪙* para @${recebedor.split('@')[0]}. A dívida foi registrada.`, mentions: [recebedor] }, { quoted: msg });
                break;
            }

            case 'pagar': {
                let recebedor = obterAlvo(msg);
                const valorPg = parseInt(args[1] || args[0]);
                if (!recebedor || isNaN(valorPg) || valorPg <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!pagar @membro [quantia]*" }, { quoted: msg });
                if (recebedor === sender) return sock.sendMessage(from, { text: "❌ Você não pode transferir para você mesmo!" }, { quoted: msg });
                if (u.golds < valorPg) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });

                if (!db.usuarios[recebedor]) db.usuarios[recebedor] = criarUsuarioPadrao();
                u.golds -= valorPg;
                db.usuarios[recebedor].golds = (db.usuarios[recebedor].golds || 0) + valorPg;

                // Se houver dívida do pagador para o recebedor, abate
                const divida = u.dividas_devidas.find(d => d.de === recebedor);
                if (divida) {
                    const abatido = Math.min(valorPg, divida.valor);
                    divida.valor -= abatido;
                    if (divida.valor <= 0) {
                        u.dividas_devidas = u.dividas_devidas.filter(d => d !== divida);
                        // remove também da lista de quem emprestou
                        if (db.usuarios[recebedor].dividas_emprestadas) {
                            db.usuarios[recebedor].dividas_emprestadas = db.usuarios[recebedor].dividas_emprestadas.filter(d => !(d.para === sender && d.valor === divida.valor + abatido));
                        }
                    }
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `💸 *PAGAMENTO:* Você pagou ${valorPg} 🪙 para @${recebedor.split('@')[0]} e abateu ${abatido} 🪙 da sua dívida.`, mentions: [recebedor] }, { quoted: msg });
                } else {
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `💸 *TRANSFERÊNCIA:* Você enviou *${valorPg} 🪙* para @${recebedor.split('@')[0]}!`, mentions: [recebedor] }, { quoted: msg });
                }
                break;
            }

            case 'banco': {
                const acao = args[0];
                const valor = parseInt(args[1]);
                if (!acao || isNaN(valor) || valor <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!banco depositar [quantia]* ou *!banco sacar [quantia]*" }, { quoted: msg });

                if (acao === 'depositar') {
                    if (u.golds < valor) return sock.sendMessage(from, { text: "❌ Saldo insuficiente em mãos." }, { quoted: msg });
                    u.golds -= valor;
                    u.banco = (u.banco || 0) + valor;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏦 *DEPÓSITO:* Guardados *${valor} 🪙* no cofre forte do Leicybot.` }, { quoted: msg });
                } else if (acao === 'sacar') {
                    if ((u.banco || 0) < valor) return sock.sendMessage(from, { text: "❌ Saldo insuficiente no banco." }, { quoted: msg });
                    u.banco -= valor;
                    u.golds += valor;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏦 *SAQUE:* Retirados *${valor} 🪙* do banco.` }, { quoted: msg });
                }
                break;
            }

            case 'rankgold': {
                const exemploModelo = 'exemplo_modelo_usuario@s.whatsapp.net';
                let ordenados = Object.keys(db.usuarios)
                    .filter(id => id !== exemploModelo)
                    .map(id => ({
                        id,
                        total: (db.usuarios[id].golds || 0) + (db.usuarios[id].banco || 0)
                    }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                let rankTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  💳  𝗧𝗢𝗣 𝟭𝟬 - 𝗠𝗔𝗚𝗡𝗔𝗧𝗔𝗦 𝗗𝗢 𝗚𝗥𝗨𝗣𝗢  💳  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Maiores economias sob a supervisão de Olden:\n\n`;
                const medalhas = ["🥇", "🥈", "🥉", "💧", "💧", "💧", "💧", "💧", "💧", "💧"];
                ordenados.forEach((m, idx) => {
                    rankTxt += ` ${medalhas[idx]} *${idx + 1}º Lugar:* @${m.id.split('@')[0]} ➔ 💳 *${m.total} 🪙*\n`;
                });
                rankTxt += `\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: rankTxt, mentions: ordenados.map(m => m.id) }, { quoted: msg });
                break;
            }

            case 'loja': {
                const lojaTxt = `🏪 *LOJA LEICYBOT v2* 🏪\n\n🛡️ *escudo* — Proteção antirroubo (50 🪙)\n🛡️ *seguro* — Reduz perda em assaltos pela metade (100 🪙)\n🔁 *recarga* — Zera limites diários de trabalho/mineração (80 🪙)\n🔒 *cofreblindado* — Dificulta roubos ao banco por 3 dias (200 🪙)\n🎣 *isca* — Aumenta prêmios de pesca por 24h (120 🪙)\n🍀 *sortegrande* — Melhora chances em jogos por 5 rodadas (150 🪙)\n📢 *apresentacaobuy* — Ativa anúncios de título (100 🪙)\n\n🎖️ *TÍTULOS:*\n🔴 Lendários (3000 🪙) — 1 dono/grupo\n  luasuperior1 | pecadoganancia | reipiratas | vingadorhogwarts | donodabanca\n🟡 Ouro (1500 🪙) — 5 donos/grupo\n  luasuperior2 | luasuperior3 | supersaiyajin | chefedehawkins | hereditariajoseon\n⚪ Prata (500 🪙) — 15 donos/grupo\n  luainferior1..5 | hashiraagua | satorugojo | heartthrobseul | garidekonoha | membr...\n\n👉 Compre com: *!comprar [nome]*`;
                await sock.sendMessage(from, { text: lojaTxt }, { quoted: msg });
                break;
            }

            case 'comprar': {
                const item = args[0]?.toLowerCase();
                if (!item) return sock.sendMessage(from, { text: "❌ Use: `!comprar escudo`, `!comprar luasuperior1`, etc." }, { quoted: msg });

                // Itens da loja (não títulos)
                if (item === 'escudo') {
                    if (u.golds < 50) return sock.sendMessage(from, { text: "❌ Golds insuficientes (50 🪙)." }, { quoted: msg });
                    if (u.escudo) return sock.sendMessage(from, { text: "🛡️ Você já possui um escudo ativo." }, { quoted: msg });
                    u.golds -= 50;
                    u.escudo = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🛡️ *ESCUDO ADQUIRIDO:* Seu sistema de segurança está ativo contra o próximo assalto!" }, { quoted: msg });
                }
                if (item === 'seguro') {
                    if (u.golds < 100) return sock.sendMessage(from, { text: "❌ Golds insuficientes (100 🪙)." }, { quoted: msg });
                    if (u.seguro_parcial) return sock.sendMessage(from, { text: "🛡️ Você já possui o Seguro Parcial ativo." }, { quoted: msg });
                    u.golds -= 100;
                    u.seguro_parcial = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🛡️ *SEGURO PARCIAL ATIVADO:* Seu próximo assalto terá o valor reduzido pela metade." }, { quoted: msg });
                }
                if (item === 'recarga') {
                    if (u.golds < 80) return sock.sendMessage(from, { text: "❌ Golds insuficientes (80 🪙)." }, { quoted: msg });
                    u.golds -= 80;
                    if (!u.itens) u.itens = {};
                    u.itens.recarga = (u.itens.recarga || 0) + 1;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🔁 *RECARGA RÁPIDA COMPRADA:* Use `!usar recarga` para zerar seus limites diários!" }, { quoted: msg });
                }
                if (item === 'cofreblindado') {
                    if (u.golds < 200) return sock.sendMessage(from, { text: "❌ Golds insuficientes (200 🪙)." }, { quoted: msg });
                    if (u.cofre_blindado_ate && u.cofre_blindado_ate > Date.now()) return sock.sendMessage(from, { text: "🔒 Você já tem um Cofre Blindado ativo." }, { quoted: msg });
                    u.golds -= 200;
                    u.cofre_blindado_ate = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 dias
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🔒 *COFRE BLINDADO ATIVO:* Seu banco estará mais protegido contra roubos por 3 dias!" }, { quoted: msg });
                }
                if (item === 'isca') {
                    if (u.golds < 120) return sock.sendMessage(from, { text: "❌ Golds insuficientes (120 🪙)." }, { quoted: msg });
                    u.golds -= 120;
                    u.isca_especial_ate = Date.now() + 24 * 60 * 60 * 1000; // 24h
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🎣 *ISCA ESPECIAL ATIVADA:* Suas pescarias renderão mais por 24h!" }, { quoted: msg });
                }
                if (item === 'sortegrande') {
                    if (u.golds < 150) return sock.sendMessage(from, { text: "❌ Golds insuficientes (150 🪙)." }, { quoted: msg });
                    u.golds -= 150;
                    u.sorte_grande_jogadas += 5;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "🍀 *SORTE GRANDE:* Você ganhou 5 rodadas com melhores chances em jogos de azar!" }, { quoted: msg });
                }
                if (item === 'apresentacaobuy') {
                    if (u.golds < 100) return sock.sendMessage(from, { text: "❌ Golds insuficientes (100 🪙)." }, { quoted: msg });
                    u.golds -= 100;
                    u.apresentacao = true;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: "📢 *APRESENTAÇÃO ATIVADA:* Seus títulos serão anunciados ao interagir!" }, { quoted: msg });
                }

                // Títulos
                const titulo = catalogoTitulos[item];
                if (!titulo) return sock.sendMessage(from, { text: "❌ Item não encontrado. Use `!loja` para ver as opções." }, { quoted: msg });

                if (u.golds < titulo.preco) return sock.sendMessage(from, { text: `❌ Saldo insuficiente! O título *${titulo.nome}* custa ${titulo.preco} 🪙.` }, { quoted: msg });

                let limitesRaridade = { "Lendario": 1, "Ouro": 5, "Prata": 15 };
                if (contarDonosRaridade(titulo.raridade) >= limitesRaridade[titulo.raridade]) {
                    return sock.sendMessage(from, { text: `❌ Vagas esgotadas para títulos ${titulo.raridade} neste grupo.` }, { quoted: msg });
                }

                if (u.titulo_slot1 === titulo.nome || u.titulo_slot2 === titulo.nome) {
                    return sock.sendMessage(from, { text: "❌ Você já possui esse título equipado!" }, { quoted: msg });
                }

                if (!u.titulo_slot1) {
                    u.titulo_slot1 = titulo.nome;
                } else {
                    return sock.sendMessage(from, { text: "❌ Você já tem um título comprado no slot 1. Use `!vendertitulo` para liberar." }, { quoted: msg });
                }

                u.golds -= titulo.preco;
                u.data_expiracao = Date.now() + 604800000; // 1 semana
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎉 *COMPRA EFETUADA:* Você adquiriu o título *${titulo.nome}* por 1 semana!` }, { quoted: msg });
                break;
            }

            case 'vendertitulo': {
                u.titulo_slot1 = null;
                u.data_expiracao = null;
                salvarDB(db);
                await sock.sendMessage(from, { text: "🎭 Slots de títulos redefinidos. Vagas liberadas!" }, { quoted: msg });
                break;
            }

            case 'apresentacao': {
                if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                    return sock.sendMessage(from, { text: "🌊 Use: *!apresentacao on* ou *!apresentacao off*" }, { quoted: msg });
                }
                u.apresentacao = args[0] === 'on';
                salvarDB(db);
                await sock.sendMessage(from, { text: `📢 Anúncio automático de títulos: *${args[0].toUpperCase()}*.` }, { quoted: msg });
                break;
            }

            // Novos jogos de azar
            case 'roleta': {
                const aposta = parseInt(args[0]);
                const escolha = args[1]?.toLowerCase();
                if (isNaN(aposta) || aposta <= 0 || !escolha) return sock.sendMessage(from, { text: "❌ Uso: `!roleta [aposta] [vermelho/preto/numero]`" }, { quoted: msg });
                if (u.golds < aposta) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });

                const numeroSorteado = Math.floor(Math.random() * 37); // 0-36
                let corSorteada = numeroSorteado === 0 ? 'zero' : (numeroSorteado % 2 === 0 ? 'preto' : 'vermelho');
                let ganhou = false;
                let multiplicador = 0;

                if (escolha === 'vermelho' || escolha === 'preto') {
                    if (escolha === corSorteada) {
                        ganhou = true;
                        multiplicador = 2;
                    }
                } else if (!isNaN(escolha)) {
                    const numEscolhido = parseInt(escolha);
                    if (numEscolhido >= 0 && numEscolhido <= 36 && numEscolhido === numeroSorteado) {
                        ganhou = true;
                        multiplicador = 14;
                    }
                }

                if (ganhou) {
                    const premio = aposta * multiplicador;
                    u.golds += premio - aposta;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎡 *ROLETA:* Número ${numeroSorteado} (${corSorteada}). Você ganhou *${premio} 🪙*!` }, { quoted: msg });
                } else {
                    u.golds -= aposta;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎡 *ROLETA:* Número ${numeroSorteado} (${corSorteada}). Você perdeu ${aposta} 🪙.` }, { quoted: msg });
                }
                break;
            }

            case 'slots': {
                const aposta = parseInt(args[0]);
                if (isNaN(aposta) || aposta <= 0) return sock.sendMessage(from, { text: "❌ Uso: `!slots [aposta]`" }, { quoted: msg });
                if (u.golds < aposta) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });

                const simbolos = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
                const s1 = simbolos[Math.floor(Math.random() * simbolos.length)];
                const s2 = simbolos[Math.floor(Math.random() * simbolos.length)];
                const s3 = simbolos[Math.floor(Math.random() * simbolos.length)];
                let premio = 0;

                if (s1 === s2 && s2 === s3) {
                    premio = aposta * 10; // três iguais
                } else if (s1 === s2 || s2 === s3 || s1 === s3) {
                    premio = aposta * 2; // dois iguais
                }

                u.golds -= aposta;
                if (premio > 0) u.golds += premio;
                salvarDB(db);
                const resultado = `🎰 *SLOTS:* [${s1} ${s2} ${s3}]\n${premio > 0 ? `🎉 Você ganhou ${premio} 🪙!` : '💧 Nada feito, você perdeu.'}`;
                await sock.sendMessage(from, { text: resultado }, { quoted: msg });
                break;
            }

            case 'apostar': {
                const aposta = parseInt(args[0]);
                if (isNaN(aposta) || aposta <= 0) return sock.sendMessage(from, { text: "❌ Uso: `!apostar [aposta]`" }, { quoted: msg });
                if (u.golds < aposta) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });

                const chance = 0.45;
                if (Math.random() < chance) {
                    u.golds += aposta;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 *APOSTA:* Você dobrou! Ganhou ${aposta * 2} 🪙.` }, { quoted: msg });
                } else {
                    u.golds -= aposta;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🎲 *APOSTA:* Você perdeu ${aposta} 🪙.` }, { quoted: msg });
                }
                break;
            }

            case 'dados': {
                const aposta = parseInt(args[0]);
                if (isNaN(aposta) || aposta <= 0) return sock.sendMessage(from, { text: "❌ Uso: `!dados [aposta]`" }, { quoted: msg });
                if (u.golds < aposta) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });

                const dadoJogador = Math.floor(Math.random() * 6) + 1;
                const dadoBot = Math.floor(Math.random() * 6) + 1;
                let resultado;
                if (dadoJogador > dadoBot) {
                    u.golds += aposta;
                    resultado = `🎲 Você tirou ${dadoJogador}, bot tirou ${dadoBot}. Você ganhou ${aposta * 2} 🪙!`;
                } else if (dadoJogador < dadoBot) {
                    u.golds -= aposta;
                    resultado = `🎲 Você tirou ${dadoJogador}, bot tirou ${dadoBot}. Você perdeu ${aposta} 🪙.`;
                } else {
                    resultado = `🎲 Empate! Ambos tiraram ${dadoJogador}. Nada mudou.`;
                }
                salvarDB(db);
                await sock.sendMessage(from, { text: resultado }, { quoted: msg });
                break;
            }

            case 'pescar': {
                if (u.pescas_hoje >= 5) return sock.sendMessage(from, { text: "🎣 Você já pescou 5 vezes hoje. Volte amanhã!" }, { quoted: msg });
                u.pescas_hoje++;

                let premioBase = Math.floor(Math.random() * 60) + 20;
                if (u.isca_especial_ate && u.isca_especial_ate > Date.now()) {
                    premioBase = Math.floor(premioBase * 1.7);
                }
                u.golds += premioBase;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎣 *PESCARIA:* Você pescou e conseguiu *${premioBase} 🪙*!` }, { quoted: msg });
                break;
            }

            case 'raspadinha': {
                if (u.raspadinhas_hoje >= 3) return sock.sendMessage(from, { text: "🎫 Você já raspou 3 vezes hoje. Tente amanhã!" }, { quoted: msg });
                u.raspadinhas_hoje++;

                const chanceRaspa = Math.random();
                let premioRaspa = 0;
                if (chanceRaspa < 0.1) premioRaspa = 200;
                else if (chanceRaspa < 0.3) premioRaspa = 80;
                else if (chanceRaspa < 0.6) premioRaspa = 20;

                u.golds += premioRaspa;
                salvarDB(db);
                const msgRaspa = premioRaspa > 0
                    ? `🎫 *RASPADINHA:* Você raspou e ganhou *${premioRaspa} 🪙*!`
                    : `🎫 *RASPADINHA:* Não foi dessa vez... Tente novamente.`;
                await sock.sendMessage(from, { text: msgRaspa }, { quoted: msg });
                break;
            }

            case 'investir': {
                const valor = parseInt(args[0]);
                if (isNaN(valor) || valor <= 0) return sock.sendMessage(from, { text: "❌ Uso: `!investir [valor]`" }, { quoted: msg });
                if (u.golds < valor) return sock.sendMessage(from, { text: "❌ Saldo insuficiente." }, { quoted: msg });
                if (u.investimento_valor && u.investimento_valor > 0) return sock.sendMessage(from, { text: "❌ Você já tem um investimento ativo. Use `!resgatar` primeiro." }, { quoted: msg });

                u.golds -= valor;
                u.investimento_valor = valor;
                u.investimento_timestamp = Date.now();
                salvarDB(db);
                await sock.sendMessage(from, { text: `📈 *INVESTIMENTO:* Você investiu *${valor} 🪙*. Use `!resgatar` para retirar com juros.` }, { quoted: msg });
                break;
            }

            case 'resgatar': {
                if (!u.investimento_valor || u.investimento_valor <= 0) return sock.sendMessage(from, { text: "❌ Você não tem nenhum investimento ativo." }, { quoted: msg });

                const dias = Math.floor((Date.now() - u.investimento_timestamp) / (1000 * 60 * 60 * 24));
                const taxaJuros = 0.05; // 5% ao dia
                const juros = Math.floor(u.investimento_valor * taxaJuros * dias);
                const total = u.investimento_valor + juros;
                u.golds += total;
                u.investimento_valor = 0;
                u.investimento_timestamp = null;
                salvarDB(db);
                await sock.sendMessage(from, { text: `💰 *RESGATE:* Você resgatou *${total} 🪙* (${u.investimento_valor + juros} = investimento + ${juros} juros em ${dias} dias).` }, { quoted: msg });
                break;
            }

            case 'usar': {
                const itemUsar = args[0]?.toLowerCase();
                if (!itemUsar) return sock.sendMessage(from, { text: "❌ Use: `!usar recarga`" }, { quoted: msg });

                if (itemUsar === 'recarga') {
                    if (!u.itens || !u.itens.recarga || u.itens.recarga <= 0) return sock.sendMessage(from, { text: "❌ Você não possui Recarga Rápida." }, { quoted: msg });
                    u.itens.recarga--;
                    u.trabalhos_hoje = 0;
                    u.mineracoes_hoje = 0;
                    u.pescas_hoje = 0;
                    u.raspadinhas_hoje = 0;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: "🔁 *RECARGA RÁPIDA USADA:* Seus limites diários foram zerados!" }, { quoted: msg });
                } else {
                    return sock.sendMessage(from, { text: "❌ Item desconhecido." }, { quoted: msg });
                }
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
                