const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const { lidarComComando } = require('./comandos');

const app = express();
const port = process.env.PORT || 3000;

// Configuração importante: COLOQUE SEU NÚMERO COM CÓDIGO DO PAÍS E DDD AQUI (Sem + ou -)
// Exemplo para o Brasil (55) + DDD (11) + Número (999999999) = '5511999999999'
const MEU_NUMERO_WHATSAPP = '258840504242'; 

app.get('/', (req, res) => {
    res.send('🤖 Bot de Código de Emparelhamento Ativo!');
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento HTTP ativo na porta ${port}`);
});

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Desativa o QR Code para podermos usar o código de texto
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.0'] // Necessário simular um navegador válido para o código funcionar
    });

    sock.ev.on('creds.update', saveCreds);

    // Solicita o código de pareamento caso o bot ainda não esteja conectado
    if (!sock.authState.creds.registered) {
        // Um pequeno delay garante que o socket está pronto para pedir o código
        setTimeout(async () => {
            try {
                let codigo = await sock.requestPairingCode(MEU_NUMERO_WHATSAPP);
                console.log('\n==================================================');
                console.log(`🔑 SEU CÓDIGO DE EMPARELHAMENTO DO WHATSAPP: ${codigo}`);
                console.log('==================================================\n');
                console.log('Abra o WhatsApp do seu celular -> Configurações -> Aparelhos Conectados -> Conectar com número de telefone e digite o código acima.');
            } catch (err) {
                console.error('Falha ao gerar o código de pareamento:', err);
            }
        }, 3000);
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const deveReconectar = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('[AVISO] Conexão fechada. Reconectando:', deveReconectar);
            if (deveReconectar) {
                iniciarBot();
            }
        } else if (connection === 'open') {
            console.log('🚀 [CONECTADO] O Bot foi pareado via código com sucesso!');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                await lidarComComando(sock, msg);
            }
        }
    });
}

iniciarBot().catch(err => console.error('[ERRO CRÍTICO]:', err));
