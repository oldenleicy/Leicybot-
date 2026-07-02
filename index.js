const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

let ultimoQrCode = null;
let statusConexao = "Iniciando o sistema...";
let botSocket = null; // Armazena a conexão atual para podermos fechá-la se der erro

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
            // Força o encerramento do socket antigo para liberar os arquivos trancados
            if (botSocket) {
                botSocket.end();
                botSocket = null;
            }
            fs.rmSync(pastaAuth, { recursive: true, force: true });
            console.log('[FAXINA] Pasta auth_info completamente removida com sucesso!');
        } catch (err) {
            console.error('[ERRO] Falha ao deletar pasta auth_info:', err.message);
        }
    }
}

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // CONFIGURAÇÃO REFORÇADA: Simula perfeitamente um Mac executando o Chrome oficial
    botSocket = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Deixei como true para também gerar no log do Render se precisar
        logger: pino({ level: 'silent' }),
        browser: ['Mac OS', 'Chrome', '124.0.0.0'] 
    });

    botSocket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            ultimoQrCode = qr;
            statusConexao = "QR Code pronto para escaneamento";
            console.log("[SISTEMA] Novo QR Code disponível!");
        }

        if (connection === 'close') {
            ultimoQrCode = null;
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            statusConexao = `Desconectado (Erro: ${statusCode})`;
            console.log(`[AVISO] Conexão fechada. Status: ${statusCode}`);

            // Tratamento preventivo: 401, 403, 405 indicam credenciais corrompidas ou banidas
            if (statusCode === DisconnectReason.loggedOut || statusCode === 405 || statusCode === 401) {
                console.log('❌ Sessão inválida ou desconectada pelo usuário. Reiniciando do zero absoluto...');
                forcarLimpezaGeral();
                setTimeout(() => iniciarBot(), 5000); // Aguarda o Render liberar os arquivos e inicia limpo
            } else {
                // Erros comuns de rede ou queda de conexão do Render
                setTimeout(() => iniciarBot(), 8000);
            }
        } else if (connection === 'open') {
            ultimoQrCode = null;
            statusConexao = "conectado";
            console.log('🚀 [SUCESSO] Bot conectado com sucesso!');
        }
    });

    botSocket.ev.on('creds.update', saveCreds);
}

iniciarBot().catch(err => console.error('[ERRO CRÍTICO]:', err));
