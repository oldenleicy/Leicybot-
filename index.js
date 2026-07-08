const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

// CORREÇÃO CIRÚRGICA: Importação estruturada com chaves para receber a função corretamente
const { lidarComComando } = require('./comandos');

const app = express();
const port = process.env.PORT || 3000;

// ─── INICIALIZAÇÃO ATÔMICA E SEGURA DO BANCO DE DADOS (BLINDADO) ───
const caminhoDB = path.join(__dirname, 'database.json');

// Estrutura padrão indestrutível para evitar panes de leitura
const estruturaPadrao = { 
    usuarios: {}, 
    grupos: {}, 
    config_bot: { 
        url_foto_menu: "https://i.imgur.com/Kdf946S.png", 
        manutencao: false, 
        comandos_desativados: [] 
    } 
};

let db = estruturaPadrao;

try {
    if (fs.existsSync(caminhoDB)) {
        const conteudo = fs.readFileSync(caminhoDB, 'utf-8').trim();
        // Se o arquivo existir mas estiver vazio ou inválido, força a estrutura padrão
        if (conteudo && conteudo !== "") {
            db = JSON.parse(conteudo);
            // Garante que as propriedades cruciais existem dentro do arquivo carregado
            if (!db.config_bot) db.config_bot = estruturaPadrao.config_bot;
            if (!db.usuarios) db.usuarios = estruturaPadrao.usuarios;
            if (!db.grupos) db.grupos = estruturaPadrao.grupos;
        } else {
            fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
        }
    } else {
        fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
    }
} catch (e) {
    console.error('[DATABASE] Arquivo corrompido ou vazio detectado! Aplicando estrutura de segurança.', e.message);
    db = estruturaPadrao;
    fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
}

function salvarDB(dadosNovos) {
    try {
        const caminhoTmp = path.join(__dirname, 'database.tmp');
        fs.writeFileSync(caminhoTmp, JSON.stringify(dadosNovos, null, 4), 'utf-8');
        fs.renameSync(caminhoTmp, caminhoDB);
    } catch (error) {
        console.error("[DATABASE] Erro crítico ao salvar o banco de dados: ", error.message);
    }
}
// ─────────────────────────────────────────────────────────────

// ⚠️ PREENCHA AQUI: 55 + DDD + Seu Número (Apenas números, como string)
const MEU_NUMERO_WHATSAPP = '258840504242'; 

let statusConexao = "Iniciando aplicação...";
let botSocket = null;

app.get('/', (req, res) => {
    res.send(`<div style='text-align: center; font-family: sans-serif; margin-top: 50px;'><h1>🤖 Servidor Online</h1><p>Status: <strong>${statusConexao}</strong></p></div>`);
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento ativo na porta ${port}`);
});

function limparSessaoInvalida() {
    const pastaAuth = path.join(__dirname, 'auth_info');
    if (fs.existsSync(pastaAuth)) {
        try {
            if (botSocket) {
                botSocket.end();
                botSocket = null;
            }
            fs.rmSync(pastaAuth, { recursive: true, force: true });
            console.log('[SISTEMA] Pasta auth_info antiga eliminada para evitar o Erro 428.');
        } catch (err) {
            console.error('[ERRO LIMPEZA]:', err.message);
        }
    }
}

async function iniciarBot() {
    const pastaAuth = path.join(__dirname, 'auth_info');

    // ─── RECONSTRÓI A SESSÃO A PARTIR DA VARIÁVEL CASO ELA EXISTA ───
    if (process.env.WA_SESSION_DATA && !fs.existsSync(pastaAuth)) {
        try {
            fs.mkdirSync(pastaAuth, { recursive: true });
            const sessionData = JSON.parse(Buffer.from(process.env.WA_SESSION_DATA, 'base64').toString('utf-8'));
            
            Object.keys(sessionData).forEach(file => {
                fs.writeFileSync(path.join(pastaAuth, file), JSON.stringify(sessionData[file]));
            });
            console.log('[SISTEMA] Sessão restaurada com sucesso a partir das Variáveis de Ambiente!');
        } catch (e) {
            console.error('[ERRO VARIÁVEL SESSÃO]: Dados inválidos ou corrompidos na variável.', e.message);
        }
    }
    // ───────────────────────────────────────────────────────────────────────────────

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // Busca dinamicamente a última versão suportada pelo ecossistema web do WhatsApp
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));
    console.log(`[WHATSAPP] Utilizando a versão de protocolo: ${version.join('.')}`);

    // SOLUÇÃO DO ERRO 428: Mapeamento cirúrgico de propriedades do navegador
    botSocket = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        mobile: false, 
        browser: ['Mac OS', 'Chrome', '124.0.0.0'] 
    });

    botSocket.ev.on('creds.update', async () => {
        await saveCreds();

        try {
            if (fs.existsSync(pastaAuth)) {
                const files = fs.readdirSync(pastaAuth);
                const sessionObj = {};
                files.forEach(file => {
                    if (fs.statSync(path.join(pastaAuth, file)).isFile()) {
                        sessionObj[file] = JSON.parse(fs.readFileSync(path.join(pastaAuth, file), 'utf-8'));
                    }
                });
                const base64String = Buffer.from(JSON.stringify(sessionObj)).toString('base64');
                
                console.log('\n==================================================');
                console.log('📋 COPIE A LINHA GIGANTE ABAIXO E SALVE SE NECESSÁRIO COMO WA_SESSION_DATA:');
                console.log(base64String);
                console.log('==================================================\n');
            }
        } catch (e) {
            // Ignora erros de arquivos parciais
        }
    });

    if (!botSocket.authState.creds.registered) {
        statusConexao = "Aguardando geração do código de pareamento...";
        
        setTimeout(async () => {
            try {
                console.log(`[SISTEMA] Solicitando código de pareamento seguro para: ${MEU_NUMERO_WHATSAPP}`);
                let codigo = await botSocket.requestPairingCode(MEU_NUMERO_WHATSAPP);
                
                statusConexao = `Código gerado: ${codigo}`;
                console.log('\n==================================================');
                console.log(`🔑 SEU CÓDIGO DE EMPARELHAMENTO DO WHATSAPP: ${codigo}`);
                console.log('==================================================\n');
            } catch (err) {
                console.error('[ERRO CRÍTICO 428 CONVERTIDO]: Falha ao requisitar código. Forçando reinicialização limpa...');
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            }
        }, 10000);
    }

    botSocket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            statusConexao = `Desconectado (Status: ${statusCode})`;
            console.log(`[CONEXÃO] Fechada com código: ${statusCode}`);

            if ([401, 403, 405, 428, DisconnectReason.loggedOut].includes(statusCode)) {
                console.log('[ALERTA] Credencial corrompida detectada. Limpando dados...');
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            } else {
                setTimeout(() => iniciarBot(), 8000);
            }
        } else if (connection === 'open') {
            statusConexao = "conectado";
            console.log('🚀 [SUCESSO] Bot conectado 100% e operando sem falhas!');
        }
    });

    botSocket.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                // Executa a função passando os parâmetros corretos esperados pelo comandos.js
                await lidarComComando(botSocket, msg, db, salvarDB).catch(e => console.error('[ERRO COMANDO]:', e));
            }
        }
    });
}

setTimeout(() => {
    iniciarBot().catch(err => console.error('[ERRO INICIALIZAÇÃO]:', err));
}, 2000);
