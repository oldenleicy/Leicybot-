const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Tenta carregar o módulo de comandos com segurança
let lidarComComando;
try {
    lidarComComando = require('./comandos').lidarComComando;
} catch (e) {
    console.log('[AVISO] Arquivo comandos.js não encontrado ou possui erros. Rodando sem comandos por enquanto.');
}

const app = express();
const port = process.env.PORT || 3000;

// Rota HTTP para o UptimeRobot monitorar e evitar o Spin-down do Render
app.get('/', (req, res) => {
    res.send('Bot ativo e operando 24/7!');
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento HTTP rodando na porta ${port}`);
});

// Função auxiliar para limpar a sessão em caso de erro crítico de precondição (Erro 428)
function limparSessaoCorrompida() {
    const pastaAuth = path.join(__dirname, 'auth_info');
    if (fs.existsSync(pastaAuth)) {
        try {
            // Remove apenas os arquivos de chaves que costumam travar, mantendo a pasta
            const arquivos = fs.readdirSync(pastaAuth);
            for (const arquivo of arquivos) {
                if (arquivo !== 'creds.json') { // Mantém o creds principal se existir, remove o resto
                    fs.unlinkSync(path.join(pastaAuth, arquivo));
                }
            }
            console.log('[FAXINA] Arquivos de sessão antigos/conflitantes foram limpos para evitar o Erro 428.');
        } catch (err) {
            console.error('Erro ao limpar pasta de autenticação:', err);
        }
    }
}

async function iniciarBot() {
    // Inicializa ou carrega a sessão
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Força o pareamento apenas por código de texto
        logger: pino({ level: 'silent' }), // Otimização máxima de memória RAM
        browser: ['Ubuntu', 'Chrome', '20.0.0'], // Essencial para o pareamento por texto funcionar
        
        // MELHORIAS DE CONEXÃO (Anti-Queda):
        keepAliveIntervalMs: 30000, // Envia pings ao WhatsApp a cada 30 segundos para manter o canal aberto
        connectTimeoutMs: 60000,     // Aguarda até 1 minuto para estabelecer a conexão estável
        emitOwnEvents: false
    });

    let codigoGerado = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        // Solicita o código de pareamento apenas se o bot não estiver autenticado e não tiver gerado nesta execução
        if (!sock.authState.creds.registered && !codigoGerado) {
            codigoGerado = true;
            
            // 🚨 ADICIONE SEU NÚMERO ABAIXO EXATAMENTE NESTE FORMATO (APENAS NÚMEROS COM DDI + DDD)
            const numeroBot = "258840504242"; 
            
            // Aguarda 6 segundos para o WebSocket assentar antes de pedir o código
            await delay(6000); 
            
            try {
                const codigo = await sock.requestPairingCode(numeroBot);
                console.log('\n======================================');
                console.log(`👉 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                console.log('======================================\n');
                console.log('Abra o WhatsApp -> Dispositivos Associados -> Conectar com número de telefone e digite o código acima.\n');
            } catch (err) {
                console.error('Erro ao gerar código de pareamento:', err);
                codigoGerado = false; // Permite tentar novamente na próxima reinicialização
            }
        }

        // Trata o fechamento da conexão
        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const deveReconectar = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`[AVISO] Conexão fechada (Status Code: ${statusCode}).`);
            
            if (deveReconectar) {
                // Se cair pelo erro 428 (Precondition Required) ou Bad Session, fazemos uma limpeza ativa
                if (statusCode === 428 || statusCode === DisconnectReason.badSession) {
                    console.log('[ALERTA] Erro de precondição detectado. Aplicando correção de chaves...');
                    limparSessaoCorrompida();
                }
                
                console.log('🔄 Reconectando em 15 segundos para segurança...');
                setTimeout(() => iniciarBot(), 15000);
            } else {
                console.log('❌ Conexão encerrada definitivamente. Desconectado pelo usuário.');
                limparSessaoCorrompida();
            }
        } else if (connection === 'open') {
            console.log('🚀 [SUCESSO] Bot conectado e sincronizado com o WhatsApp!');
        }
    });

    // Salva as credenciais automaticamente contra desconexões parciais
    sock.ev.on('creds.update', saveCreds);

    // Gerenciador de mensagens recebidas
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

// Executa o Bot tratando erros fatais na inicialização rápida
iniciarBot().catch(err => {
    console.error('[ERRO CRÍTICO NO START]:', err);
    setTimeout(() => iniciarBot(), 15000);
});
