const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

let ultimoQrCode = null;
let statusConexao = "Iniciando o sistema...";

app.get('/', (req, res) => {
    if (statusConexao === "conectado") {
        res.send("<div style='text-align: center; font-family: sans-serif; margin-top: 50px;'><h1>🚀 Leicybot Conectado e Operando 24/7!</h1></div>");
    } else if (ultimoQrCode) {
        res.send(`
            <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
                <h2>📱 Escaneie o QR Code para conectar o Leicybot-</h2>
                <p>Atualize a página se o código expirar.</p>
                <div style="margin: 20px auto; display: inline-block;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ultimoQrCode)}" alt="QR Code" style="border: 10px solid white; box-shadow: 0px 0px 15px rgba(0,0,0,0.2);"/>
                </div>
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

function forcarLimpezaGeral() {
    const pastaAuth = path.join(__dirname, 'auth_info');
    if (fs.existsSync(pastaAuth)) {
        try {
            fs.rmSync(pastaAuth, { recursive: true, force: true });
            console.log('[FAXINA] Pasta auth_info completamente removida para resetar o Erro 405.');
        } catch (err) {
            console.error('Erro ao deletar pasta auth_info:', err);
        }
    }
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Leicybot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            ultimoQrCode = qr;
            statusConexao = "QR Code pronto para escaneamento";
            console.log("[SISTEMA] Novo QR Code disponível na página Web!");
        }

        if (connection === 'close') {
            ultimoQrCode = null;
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            statusConexao = `Desconectado (Erro: ${statusCode})`;
            console.log(`[AVISO] Conexão fechada. Status: ${statusCode}`);

            // Se o erro for 405 (Logged Out) ou sessão inválida, limpamos tudo e reiniciamos do zero absoluto
            if (statusCode === DisconnectReason.loggedOut || statusCode === 405) {
                console.log('❌ Sessão considerada inválida pelo WhatsApp. Forçando reset...');
                forcarLimpezaGeral();
                setTimeout(() => iniciarBot(), 5000);
            } else {
                // Para outros erros comuns de rede, apenas aguarda e tenta reconectar
                setTimeout(() => iniciarBot(), 10000);
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
