const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const QRCode = require('qrcode'); // Certifique-se de ter essa dependência ou usaremos HTML simples

const app = express();
const port = process.env.PORT || 3000;

let ultimoQrCode = null;
let statusConexao = "Iniciando o sistema...";

// Página Web onde você verá o QR Code perfeitamente pelo celular
app.get('/', (req, res) => {
    if (statusConexao === "conectado") {
        res.send("<h1>🚀 Leicybot Conectado e Operando 24/7!</h1>");
    } else if (ultimoQrCode) {
        // Renderiza o QR Code em uma página limpa e fácil de escanear
        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h2>📱 Escaneie o QR Code para conectar o Leicybot-</h2>
                <p>Atualize a página se o código expirar.</p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ultimoQrCode)}" alt="QR Code" style="border: 10px solid white; box-shadow: 0px 0px 15px rgba(0,0,0,0.2);"/>
                <br/><br/>
                <p>Status atual: <strong>${statusConexao}</strong></p>
            </div>
        `);
    } else {
        res.send(`<div style="text-align: center; font-family: sans-serif; margin-top: 50px;"><h2>⏳ Aguardando o WhatsApp gerar o QR Code...</h2><p>Status: ${statusConexao}</p></div>`);
    }
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento HTTP rodando na porta ${port}`);
});

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Não vamos usar o terminal quebrado do Render
        logger: pino({ level: 'silent' }),
        browser: ['Leicybot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Captura o QR code gerado para exibir na página web
        if (qr) {
            ultimoQrCode = qr;
            statusConexao = "QR Code pronto para escaneamento";
            console.log("[SISTEMA] Novo QR Code disponível na página Web do bot!");
        }

        if (connection === 'close') {
            ultimoQrCode = null;
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const deveReconectar = statusCode !== DisconnectReason.loggedOut;
            statusConexao = `Desconectado (Erro: ${statusCode})`;

            console.log(`[AVISO] Conexão fechada. Reconectando: ${deveReconectar}`);
            if (deveReconectar) {
                setTimeout(() => iniciarBot(), 10000); // Tenta de novo em 10 segundos
            }
        } else if (connection === 'open') {
            ultimoQrCode = null;
            statusConexao = "conectado";
            console.log('🚀 [SUCESSO] Bot conectado com sucesso via QR Code!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarBot().catch(err => console.error('[ERRO CRÍTICO]:', err));
