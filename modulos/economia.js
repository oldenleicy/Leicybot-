// modulos/economia.js

const economiaModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        let sender = msg.key.participant || msg.key.remoteJid;

        // 🛠️ Limpa o ID do remetente para consistência multi-device
        if (sender && sender.includes(':')) {
            sender = sender.split(':')[0] + '@s.whatsapp.net';
        }

        // Inicialização preventiva e abrangente do usuário no banco de dados
        if (!db.usuarios) db.usuarios = {};
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
                permissoes_especiais: [],
                trabalhos_hoje: 0,
                mineracoes_hoje: 0,
                escudo: false,
                data_expiracao: null
            };
        }

        // Define a variável de atalho apontando diretamente para o banco
        let u = db.usuarios[sender];

        // Garantia extra de propriedades de controle diário
        if (u.trabalhos_hoje === undefined) u.trabalhos_hoje = 0;
        if (u.mineracoes_hoje === undefined) u.mineracoes_hoje = 0;

        // Estrutura fixa de títulos com preços, raridades e limites
        const catálogoTítulos = {
            // Lendários (3000g)
            'luasuperior1': { nome: "🔴 Lua Superior 1", preco: 3000, raridade: "Lendario" },
            'pecadoganancia': { nome: "🔴 Pecado da Ganância", preco: 3000, raridade: "Lendario" },
            'reipiratas': { nome: "🔴 Rei dos Piratas", preco: 3000, raridade: "Lendario" },
            'vingadorhogwarts': { nome: "🔴 Vingador de Hogwarts", preco: 3000, raridade: "Lendario" },
            'donodabanca': { nome: "🔴 Dono da Banca", preco: 3000, raridade: "Lendario" },
            // Ouro (1500g)
            'luasuperior2': { nome: "🟡 Lua Superior 2", preco: 1500, raridade: "Ouro" },
            'luasuperior3': { nome: "🟡 Lua Superior 3", preco: 1500, raridade: "Ouro" },
            'supersaiyajin': { nome: "🟡 Super Saiyajin", preco: 1500, raridade: "Ouro" },
            'chefedehawkins': { nome: "🟡 Chefe de Hawkins", preco: 1500, raridade: "Ouro" },
            'hereditariajoseon': { nome: "🟡 Realeza de Joseon", preco: 1500, raridade: "Ouro" },
            // Prata / Bronze (500g)
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

        const contarDonosRaridade = (raridade) => {
            let contagem = 0;
            Object.values(db.usuarios).forEach(user => {
                if (user.titulo_1 && obterRaridadePorNome(user.titulo_1) === raridade) contagem++;
                if (user.titulo_2 && obterRaridadePorNome(user.titulo_2) === raridade) contagem++;
            });
            return contagem;
        };

        // Sincroniza e limpa as energias se mudar o dia
        const hojeData = new Date().toLocaleDateString();
        if (u.ultimo_mensagem_data !== hojeData) {
            u.trabalhos_hoje = 0;
            u.mineracoes_hoje = 0;
            u.ultimo_mensagem_data = hojeData;
            salvarDB(db);
        }

        switch (comando) {
            case 'menugold':
                const menuGoldTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  💳  𝗧𝗢𝗣 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 - 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔  💳  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Sob a gerência do comandante Olden.\n\n ➔ *!gold* - Consulta saldo, banco, títulos e energias.\n ➔ *!trabalhar* - Executa tarefas seguras (Lim. 5/dia).\n ➔ *!minerar* - Tenta escavar na mina de risco (Lim. 5/dia).\n ➔ *!assaltar [@user]* - Tenta saquear os Golds em mãos de um alvo.\n ➔ *!pagar [@user] [quantia]* - Transfere dinheiro para um amigo.\n ➔ *!banco depositar [quantia]* - Guarda fundos com segurança.\n ➔ *!banco sacar [quantia]* - Retira fundos do banco.\n ➔ *!rankgold* - Placar dos 10 bilionários do grupo.\n ➔ *!loja* - Abre a vitrine de itens e títulos temporários.\n ➔ *!comprar [nome_do_item]* - Adquire um privilégio.\n ➔ *!vendertitulo* - Remove seus títulos atuais para abrir vagas.\n ➔ *!apresentacao [on/off]* - Liga/Desliga anúncio automático.\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: menuGoldTxt }, { quoted: msg });
                break;

            case 'gold':
            case 'saldo':
            case 'carteira':
                const goldTxt = `╔═══════════════════════════════════════╗\n         💳  𝗖𝗔𝗥𝗧𝗘𝗜𝗥𝗔 𝗩𝗜𝗥𝗧𝗨𝗔𝗟  💳\n╚═══════════════════════════════════════╝\n 👤 𝗨𝘀𝘂𝗮́𝗿𝗶𝗼: @${sender.split('@')[0]}\n 💳 𝗦𝗮𝗹𝗱𝗼 𝗔𝘁𝘂𝗮𝗹: ${u.golds} Golds\n 🏦 𝗡𝗼 𝗕𝗮𝗻𝗰ο: ${u.banco} Golds\n 🛡️ 𝗘𝘀𝗰𝘂𝗱𝗼: [${u.escudo ? 'ATIVO' : 'INATIVO'}]\n 📢 𝗔𝗽𝗿𝗲𝘀𝗲𝗻𝘁𝗮𝗰̧𝗮̃𝗼: [${u.apresentacao ? 'LIGADA' : 'DESLIGADA'}]\n\n 🎭 𝗧𝗶́𝘁𝘂𝗹𝗼 𝟭: ${u.titulo_1 || 'Nenhum'}\n 🎭 𝗧𝗶́𝘁𝘂𝗹𝗼 𝟮: ${u.titulo_2 || 'Nenhum'}\n ⏳ 𝗘𝘅𝗽𝗶𝗿𝗮𝗰̧𝗮̃𝗼: ${u.data_expiracao ? 'Ativa por 1 semana' : 'Sem prazo'}\n─────────────────────────────────────────\n 📊 [ 𝗘𝗡𝗘𝗥𝗚𝗜𝗔 𝗗𝗜𝗔𝗥𝗜𝗔 ] ────────────\n 🔨 Trabalhos hoje: (${u.trabalhos_hoje}/5)\n ⛏️ Minerações hoje: (${u.mineracoes_hoje}/5)\n╚═══════════════════════════════════════╝`;
                await sock.sendMessage(from, { text: goldTxt, mentions: [sender] }, { quoted: msg });
                break;

            case 'trabalhar':
                if (u.trabalhos_hoje >= 5) return sock.sendMessage(from, { text: "🌊 Energia esgotada! Você já atingiu seu limite diário de 5 trabalhos. Volte amanhã! 💧" }, { quoted: msg });
                const ganhoTrab = Math.floor(Math.random() * 41) + 40; 
                u.golds += ganhoTrab;
                u.trabalhos_hoje += 1;
                salvarDB(db);
                await sock.sendMessage(from, { text: `🔨 Você trabalhou duro limpando a praia virtual e faturou *${ganhoTrab} Golds* por ordem de Olden! 🌊` }, { quoted: msg });
                break;

            case 'minerar':
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

            case 'assaltar':
                let alvoAssalto = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                if (!alvoAssalto) return sock.sendMessage(from, { text: "❌ Mencione quem você deseja assaltar! Ex: `!assaltar @membro`" }, { quoted: msg });
                
                if (alvoAssalto && alvoAssalto.includes(':')) {
                    alvoAssalto = alvoAssalto.split(':')[0] + '@s.whatsapp.net';
                }
                
                if (alvoAssalto === sender) return sock.sendMessage(from, { text: "🤔 Você está tentando se assaltar? Deixe de macaquice!" }, { quoted: msg });
                
                if (!db.usuarios[alvoAssalto]) {
                    db.usuarios[alvoAssalto] = { golds: 100, banco: 0, escudo: false };
                }
                let vitima = db.usuarios[alvoAssalto];

                if ((vitima.golds || 0) < 50) return sock.sendMessage(from, { text: "💧 Esse membro está muito pobre, não vale a pena assaltá-lo. O crime não compensa tanto assim!" }, { quoted: msg });

                if (vitima.escudo) {
                    vitima.escudo = false;
                    u.golds = Math.max(0, u.golds - 300); 
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🛡️ *💥 ESCUDO ATIVADO:* O escudo antirroubo de @${alvoAssalto.split('@')[0]} quebrou o seu ataque! Você foi pego pelas patrulhas de Olden e multado em *300 Golds*.`, mentions: [alvoAssalto] }, { quoted: msg });
                }

                if (Math.random() > 0.5) {
                    const roubado = Math.floor((vitima.golds || 0) * 0.3); 
                    vitima.golds -= roubado;
                    u.golds += roubado;
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🏴‍☠️ *ASSALTO BEM SUCEDIDO:* Você sorrateiramente surrupiou *${roubado} Golds* da carteira de @${alvoAssalto.split('@')[0]}! 🌊`, mentions: [alvoAssalto] }, { quoted: msg });
                } else {
                    const perdaAssalto = Math.floor(u.golds * 0.15);
                    u.golds = Math.max(0, u.golds - perdaAssalto);
                    salvarDB(db);
                    await sock.sendMessage(from, { text: `🚨 *ASSALTO FALHOU:* Você tropeçou em uma onda e deixou cair *${perdaAssalto} Golds* enquanto tentava fugir! 💧` }, { quoted: msg });
                }
                break;

            case 'banco':
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

            case 'pagar':
                let recebedor = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                const valorPg = parseInt(args[1] || args[0]);
                if (!recebedor || isNaN(valorPg) || valorPg <= 0) return sock.sendMessage(from, { text: "❌ Uso correto: *!pagar [@membro] [quantia]*" }, { quoted: msg });
                
                if (recebedor && recebedor.includes(':')) {
                    recebedor = recebedor.split(':')[0] + '@s.whatsapp.net';
                }
                
                if (recebedor === sender) return sock.sendMessage(from, { text: "❌ Você não pode transferir dinheiro para você mesmo!" }, { quoted: msg });
                if (u.golds < valorPg) return sock.sendMessage(from, { text: "❌ Você não tem Golds em mãos suficientes para transferir!" }, { quoted: msg });

                if (!db.usuarios[recebedor]) db.usuarios[recebedor] = { golds: 100, banco: 0 };
                u.golds -= valorPg;
                db.usuarios[recebedor].golds = (db.usuarios[recebedor].golds || 0) + valorPg;
                salvarDB(db);
                await sock.sendMessage(from, { text: `💸 *TRANSFERÊNCIA:* Você enviou *${valorPg} Golds* diretamente para @${recebedor.split('@')[0]} de forma segura!`, mentions: [recebedor] }, { quoted: msg });
                break;

            case 'rankgold':
                let ordenados = Object.keys(db.usuarios).map(id => {
                    return { id, total: (db.usuarios[id].golds || 0) + (db.usuarios[id].banco || 0) };
                }).sort((a, b) => b.total - a.total).slice(0, 10);

                let rankTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██  💳  𝗧𝗢package 𝟭𝟬 - 𝗠𝗔𝗚𝗡𝗔𝗧𝗔𝗦 𝗗𝗢 𝗚𝗥𝗨𝗣𝗢  💳  ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Maiores economias sob a supervisão de Olden:\n\n`;
                const medalhas = ["🥇", "🥈", "🥉", "💧", "💧", "💧", "💧", "💧", "💧", "💧"];
                ordenados.forEach((m, idx) => {
                    rankTxt += ` ${medalhas[idx]} *${idx + 1}º Lugar:* @${m.id.split('@')[0]} ➔ 💳 *${m.total} Golds*\n`;
                });
                rankTxt += `\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: rankTxt, mentions: ordenados.map(m => m.id) }, { quoted: msg });
                break;

            case 'loja':
                const lojaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██         🏪  𝗟𝗢𝗝𝗔 𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧  🏪         ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🛡️ *escudo* ➔ Protect antirroubo (50 Golds)\n 📢 *apresentacaobuy* ➔ Ativa anúncios a cada 3h (100 Golds)\n\n 🔴 *TITULOS LENDARIOS* (3.000g | Limite: 1 dono por grupo)\n ➔ luasuperior1 | pecadoganancia | reipiratas | vingadorhogwarts | donodabanca\n\n 🟡 *TITULOS DE OURO* (1.500g | Limite: 5 donos por grupo)\n ➔ luasuperior2 | luasuperior3 | supersaiyajin | chefedehawkins | hereditariajoseon\n\n ⚪ *TITULOS DE PRATA* (500g | Limite: 15 donos por grupo)\n ➔ luainferior1 | luainferior2 | luainferior3 | luainferior5 | hashiraagua | satorugojo | heartthrobseul\n\n 👉 Para adquirir use: *!comprar [nome_do_item]*\n░▒▓█████████████████████████████████████▓▒░`;
                await sock.sendMessage(from, { text: lojaTxt }, { quoted: msg });
                break;

            case 'comprar':
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
                    return sock.sendMessage(from, { text: "📢 *APRESENTAÇÃO ATIVADA:* Seus títulos cadastrados serão anunciados de forma imponente a cada 3 horas sempre que você enviar uma mensagem comum! Validado por 1 semana." }, { quoted: msg });
                }

                const itemTitulo = catálogoTítulos[itemAlvo];
                if (!itemTitulo) return sock.sendMessage(from, { text: "❌ Item ou título não encontrado em nossa vitrine. Digite *!loja* para ver as opções!" }, { quoted: msg });

                if (u.golds < itemTitulo.preco) return sock.sendMessage(from, { text: `❌ Saldo insuficiente! O título *${itemTitulo.nome}* exige *${itemTitulo.preco} Golds* em mãos.` }, { quoted: msg });

                let limitesRaridade = { "Lendario": 1, "Ouro": 5, "Prata": 15 };
                if (contarDonosRaridade(itemTitulo.raridade) >= limitesRaridade[itemTitulo.raridade]) {
                    return sock.sendMessage(from, { text: `❌ Vagas esgotadas no grupo para títulos de nível *${itemTitulo.raridade}*! Aguarde alguém vender ou expirar.` }, { quoted: msg });
                }

                if (u.titulo_1 === itemTitulo.nome || u.titulo_2 === itemTitulo.nome) {
                    return sock.sendMessage(from, { text: "❌ Você já possui esse título equipado em sua carteira!" }, { quoted: msg });
                }

                if (!u.titulo_1) {
                    u.titulo_1 = itemTitulo.nome;
                } else if (!u.titulo_2) {
                    u.titulo_2 = itemTitulo.nome;
                } else {
                    return sock.sendMessage(from, { text: "❌ Inventário cheio! Você já acumula o limite máximo de 2 títulos simultâneos. Use *!vendertitulo* para esvaziar um slot." }, { quoted: msg });
                }

                u.golds -= itemTitulo.preco;
                u.data_expiracao = Date.now() + 604800000; 
                salvarDB(db);
                await sock.sendMessage(from, { text: `🎉 *COMPRA EFETUADA:* Você adquiriu com orgulho o título *${itemTitulo.nome}* por 1 semana! Use com sabedoria. 🌊` }, { quoted: msg });
                break;

            case 'vendertitulo':
                u.titulo_1 = null;
                u.titulo_2 = null;
                u.data_expiracao = null;
                salvarDB(db);
                await sock.sendMessage(from, { text: "🎭 Slots de títulos redefinidos com sucesso. Vagas liberadas no mercado do grupo! 💧" }, { quoted: msg });
                break;

            case 'apresentacao':
                // 🛡️ REFORÇO CRÍTICO DE SEGURANÇA: reconecta instantaneamente ao db se a variável estiver inconsistente
                if (!u) {
                    if (!db.usuarios[sender]) {
                        db.usuarios[sender] = { golds: 100, banco: 0, apresentacao: false };
                    }
                    u = db.usuarios[sender];
                }

                if (!args[0] || (arg