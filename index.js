const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

// Tenta carregar os comandos com segurança para evitar o crash instantâneo
let lidarComComando;
try {
    lidarComComando = require('./comandos').lidarComComando;
} catch (e) {
    console.log('[AVISO] Arquivo comandos.js não foi encontrado ou possui erros. O bot vai rodar sem comandos por enquanto.');
}

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot ativo e operando 24/7!');
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento HTTP rodando na porta ${port}`);
});

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.0']
    });

    let codigoGerado = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (!sock.authState.creds.registered && !codigoGerado) {
            codigoGerado = true;
            const numeroBot = "258840504242"; // Certifique-se de mudar para o seu número com DDD!
            
            setTimeout(async () => {
                try {
                    const codigo = await sock.requestPairingCode(numeroBot);
                    console.log('\n======================================');
                    console.log(`👉 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                    console.log('======================================\n');
                } catch (err) {
                    console.error('Erro ao gerar código:', err);
                    codigoGerado = false;
                }
            }, 5000);
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const deveReconectar = statusCode !== DisconnectReason.loggedOut;
            console.log(`[AVISO] Conexão fechada. Reconectando:`, deveReconectar);
            if (deveReconectar) {
                setTimeout(() => iniciarBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('🚀 [SUCESSO] Bot conectado com sucesso!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message && lidarComComando) {
                try {
                    await lidarComComando(sock, msg);
                } catch (err) {
                    console.error('Erro ao processar comando:', err);
                }
            }
        }
    });
}

iniciarBot().catch(err => console.error('[ERRO CRÍTICO]:', err));
