async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '20.0.0']
    });

    // Modificação aqui: Usando um controle para evitar disparos múltiplos
    let codigoGerado = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        // Tenta gerar o código apenas se ainda não estiver registrado e a conexão inicial estabilizar
        if (!sock.authState.creds.registered && !codigoGerado) {
            codigoGerado = true; // Bloqueia para não gerar duplicado no loop
            const numeroBot = "258840504242"; // Certifique-se de que está correto!
            
            setTimeout(async () => {
                try {
                    const codigo = await sock.requestPairingCode(numeroBot);
                    console.log('\n======================================');
                    console.log(`👉 SEU CÓDIGO DE PAREAMENTO: ${codigo}`);
                    console.log('======================================\n');
                } catch (err) {
                    console.error('Erro ao gerar código (tentando redefinir):', err);
                    codigoGerado = false; // Permite tentar novamente se houver erro real
                }
            }, 5000); // 5 segundos de espera para estabilizar o WebSocket
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            // Se o WhatsApp desconectar por falha de pareamento ou log out, evite loop infinito imediato
            const deveReconectar = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`[AVISO] Conexão fechada (Status: ${statusCode}). Reconectando:`, deveReconectar);
            
            if (deveReconectar) {
                // Aguarda 5 segundos antes de tentar ligar o bot de novo (evita sobrecarregar o Render)
                setTimeout(() => iniciarBot(), 5000); 
            }
        } else if (connection === 'open') {
            console.log('🚀 [SUCESSO] Bot conectado com sucesso aos servidores do WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                await lidarComComando(sock, msg);
            }
        }
    });
}
