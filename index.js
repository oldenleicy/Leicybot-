const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { lidarComComando } = require('./comandos');

const app = express();
const port = process.env.PORT || 3000;

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
        mobile: false, // Força a API a se comportar como Desktop Web (Evita rejeição de payload)
        browser: ['Mac OS', 'Chrome', '124.0.0.0'] 
    });

    // Monitora e salva as atualizações de chaves
    botSocket.ev.on('creds.update', saveCreds);

    // Se o bot não estiver registrado localmente, faz o disparo limpo do código de 8 dígitos
    if (!botSocket.authState.creds.registered) {
        statusConexao = "Aguardando geração do código de pareamento...";
        
        // Timeout estratégico para esperar o handshake inicial do WebSocket concluir antes de pedir o código
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
                console.error(err.message);
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            }
        }, 10000); // 10 segundos garantem estabilidade de rede no Render
    }

    botSocket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            statusConexao = `Desconectado (Status: ${statusCode})`;
            console.log(`[CONEXÃO] Fechada com código: ${statusCode}`);

            // Prevenção de loop para erros estruturais de credenciais (401, 403, 405, 428)
            if ([401, 403, 405, 428, DisconnectReason.loggedOut].includes(statusCode)) {
                console.log('[ALERTA] Credencial corrompida detectada. Limpando dados...');
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            } else {
                // Erros comuns de oscilação do Render (Reconexão simples)
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
                await lidarComComando(botSocket, msg).catch(e => console.error('[ERRO COMANDO]:', e));
            }
        }
    });
}

// Início do sistema com atraso de proteção contra loops agressivos no deploy do Render
setTimeout(() => {
    iniciarBot().catch(err => console.error('[ERRO INICIALIZAÇÃO]:', err));
}, 2000);
