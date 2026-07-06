const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
const DONO_NUMERO = '258840504242@s.whatsapp.net';

// Funções de leitura e escrita no Banco de Dados
function lerDB() {
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}
function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// Inicializa os dados do usuário se não existirem
function registrarUsuario(db, jid) {
    if (!db.usuarios[jid]) {
        db.usuarios[jid] = {
            golds: 100,
            banco: 0,
            escudo: false,
            titulo: null,
            titulo_expiracao: null,
            apresentacao: false,
            ultima_apresentacao: 0,
            ultimo_trabalho: 0,
            trabalhos_hoje: 0,
            ultima_mineracao: 0,
            mineracoes_hoje: 0,
            ultima_mensagem_data: "",
            dividas: 0,
            historico_roubo: "",
            nivel_gado: Math.floor(Math.random() * 101)
        };
    }
}

async function lidarComComando(sock, msg) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    
    const textoMensagem = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (!textoMensagem.startsWith('!')) {
        // Lógica de primeira mensagem do dia (Bônus de 20 Golds)
        if (isGroup) {
            let db = lerDB();
            registrarUsuario(db, sender);
            const hoje = new Date().toLocaleDateString();
            if (db.usuarios[sender].ultimo_mensagem_data !== hoje) {
                db.usuarios[sender].golds += 20;
                db.usuarios[sender].ultimo_mensagem_data = hoje;
                salvarDB(db);
            }
            
            // Lógica de Anúncio de Presença (A cada 3 horas)
            const agora = Date.now();
            const usuario = db.usuarios[sender];
            if (usuario.titulo && usuario.apresentacao && (agora - usuario.ultima_apresentacao > 10800000)) {
                let msgAviso = `🚨 𝗔𝗧𝗘𝗡𝗖𝗔𝗢 𝗚𝗥𝗨𝗣𝗢 🌊\n\n Olhem e admirem a presença do *${usuario.titulo}*! 💧`;
                if (usuario.titulo.includes("Rui")) msgAviso = `🕸️ Os fios do destino se fecham... Olhem e tremam perante o *${usuario.titulo}*! 🌊`;
                if (usuario.titulo.includes("Enmu")) msgAviso = `💤 Hora de dormir... O *${usuario.titulo}* abençoou este chat com sua presença! 💧`;
                
                await sock.sendMessage(from, { text: msgAviso });
                usuario.ultima_apresentacao = agora;
                salvarDB(db);
            }
        }
        return;
    }

    const args = textoMensagem.slice(1).trim().split(/ +/);
    const comando = args.shift().toLowerCase();

    let db = lerDB();
    registrarUsuario(db, sender);

    // Validações Globais (Manutenção e Bloqueio)
    if (db.config_bot.manutencao && sender !== DONO_NUMERO) return;
    if (db.config_bot.comandos_desativados.includes(comando)) {
        return await sock.sendMessage(from, { text: "🌊 Esse comando foi desativated pelo dono Olden por motivos de força maior. 💧" });
    }

    // LISTA DE COMANDOS E SEUS DIRECIONAMENTOS
    switch (comando) {
        case 'menu':
            const menuTxt = `╔═══════════════════════════════════════╗\n  🌊  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧- 𝗩𝗘𝗥𝗦𝗔𝗢 𝟮.𝟱  🌊\n╚═══════════════════════════════════════╝\n 💧 Criador Oficial: Olden 💧\n─────────────────────────────────────────\n 👑 *MENU GERAL DO BOT*\n ➔ !menugold - Economia, Lojas e Títulos 💳\n ➔ !menuadm - Gerenciamento de Grupo 🛡️\n ➔ !menujogos - Brincadeiras e Desafios 🎮\n ➔ !menumidia - Downloads e Pesquisas 🎵\n ➔ !menudono - Controle Supremo 👑\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: menuTxt });
            break;

        case 'menugold':
            const menuGoldTxt = `╔═══════════════════════════════════════╗\n  💳  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧- 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔  🌊\n╚═══════════════════════════════════════╝\n ➔ !gold - Ver sua carteira e energias\n ➔ !trabalhar - Ganhar Golds de forma segura\n ➔ !minerar - Tentar extrair minérios valiosos\n ➔ !loja - Ver itens, escudos e títulos à venda\n ➔ !comprar [nome] - Adquirir itens da loja\n ➔ !apresentacao - Ativar anúncio automático\n ➔ !assaltar [@user] - Tentar roubar alguém\n ➔ !banco [depositar/sacar] [quant]\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: menuGoldTxt });
            break;

        case 'gold':
            const user = db.usuarios[sender];
            const hojeData = new Date().toLocaleDateString();
            if (user.ultimo_mensagem_data !== hojeData) {
                user.trabalhos_hoje = 0;
                user.mineracoes_hoje = 0;
                salvarDB(db);
            }
            const goldTxt = `╔═══════════════════════════════════════╗\n         💳  𝗖𝗔𝗥𝗧𝗘𝗜𝗥𝗔 𝗩𝗜𝗥𝗧𝗨𝗔𝗟  💳\n╚═══════════════════════════════════════╝\n 👤 Usuário: @${sender.split('@')[0]}\n 💳 Saldo Atual: ${user.golds} Golds\n 🏦 No Banco: ${user.banco} Golds\n 🛡️ Escudo Antirroubo: [${user.escudo ? 'ATIVO' : 'INATIVO'}]\n 🎭 Título Ativo: ${user.titulo || 'Nenhum'}\n 💸 Dívidas: ${user.dividas} Golds\n─────────────────────────────────────────\n 📊 [ 𝗘𝗡𝗘𝗥𝗚𝗜𝗔 𝗗𝗜𝗔𝗥𝗜𝗔 ] ────────────\n 🔨 Trabalhos hoje: (${user.trabalhos_hoje}/5)\n ⛏️ Minerações hoje: (${user.mineracoes_hoje}/5)\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: goldTxt });
            break;

        case 'trabalhar':
            let uTrab = db.usuarios[sender];
            if (uTrab.trabalhos_hoje >= 5) return sock.sendMessage(from, { text: "🌊 Energia esgotada! Você já atingiu as 5 tentativas diárias." });
            uTrab.golds += 50;
            uTrab.trabalhos_hoje += 1;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🔨 Você trabalhou duro e ganhou *50 Golds* por ordem do Olden!` });
            break;

        case 'loja':
            const lojaTxt = `╔═══════════════════════════════════════╗\n         🏪  𝗟𝗢𝗝𝗔 𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧  🏪\n╚═══════════════════════════════════════╝\n 🛡️ *Escudo Antirroubo* - 50 Golds\n 📢 *Anúncio de Presença* - 100 Golds\n\n 🔴 *TITULOS LENDARIOS* (3000 Golds - Max 1)\n ➔ Lua Superior 1 | Pecado da Ganancia\n\n 🟡 *TITULOS DE OURO* (1500 Golds - Max 5)\n ➔ Lua Superior 2 | Lua Superior 3\n\n ⚪ *TITULOS DE PRATA* (500 Golds - Max 15)\n ➔ Lua Inferior 1 | Lua Inferior 5\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: lojaTxt });
            break;

        case 'manutencao':
            if (sender !== DONO_NUMERO) return;
            db.config_bot.manutencao = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `⚙️ Modo manutenção definido para: *${args[0]}*` });
            break;

        case 'desativarcmd':
            if (sender !== DONO_NUMERO) return;
            const cmdAlvo = args[0];
            if (!db.config_bot.comandos_desativados.includes(cmdAlvo)) {
                db.config_bot.comandos_desativados.push(cmdAlvo);
                salvarDB(db);
            }
            await sock.sendMessage(from, { text: `🚫 Comando *!${cmdAlvo}* desativado temporariamente.` });
            break;

        case 'burlar':
            if (sender !== DONO_NUMERO) return;
            db.usuarios[sender].trabalhos_hoje = 0;
            db.usuarios[sender].mineracoes_hoje = 0;
            salvarDB(db);
            await sock.sendMessage(from, { text: "⚡ Restrições e limites diários burlados com sucesso, Chefe Olden!" });
            break;

        default:
            // Caso queira capturar comandos extras de forma dinâmica
            break;
    }
}

module.exports = { lidarComComando };
