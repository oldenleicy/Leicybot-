async function lidarComComando(sock, msg) {
    const doGrupo = msg.key.remoteJid.endsWith('@g.us');
    const doUsuario = msg.key.remoteJid; // Captura de quem enviou (grupo ou chat privado)
    
    // Tratamento de texto para mensagens normais, respondidas ou com imagens anexadas
    const textoMensagem = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || "";
                          
    if (!textoMensagem.startsWith('!')) return; // Filtra apenas comandos iniciados com "!"

    const partes = textoMensagem.trim().split(/ +/);
    const comando = partes[0].toLowerCase();
    const args = partes.slice(1);

    try {
        switch (comando) {
            case '!ajuda':
                let menu = `🤖 *MENU DO BOT INTERATIVO (BAILEYS)*\n\n`;
                menu += `⚙️ *Administração de Grupo:*\n`;
                menu += `• \`!kick\` - Remove o membro marcado ou respondido.\n\n`;
                menu += `🎮 *Jogos & Interatividade:*\n`;
                menu += `• \`!dado\` - Rola um dado virtual de 6 lados.\n`;
                menu += `• \`!sorte\` - Mostra sua sorte astrológica para hoje.`;
                
                // Envia a mensagem respondendo à mensagem original (quoted)
                await sock.sendMessage(doUsuario, { text: menu }, { quoted: msg });
                break;

            case '!dado':
                const dado = Math.floor(Math.random() * 6) + 1;
                await sock.sendMessage(doUsuario, { text: `🎲 Você girou o dado e caiu o número: *${dado}*` }, { quoted: msg });
                break;

            case '!sorte':
                const respostas = [
                    'Sua sorte hoje está incrível! Aproveite para arriscar! 🌟',
                    'O dia será comum. Nem muita sorte, nem azar. ⚖️',
                    'Cuidado por onde anda, a energia hoje está oscilando... 📉'
                ];
                const sorte = respostas[Math.floor(Math.random() * respostas.length)];
                await sock.sendMessage(doUsuario, { text: `🔮 *Previsão do Bot:* ${sorte}` }, { quoted: msg });
                break;

            case '!kick':
                if (!doGrupo) {
                    return await sock.sendMessage(doUsuario, { text: '❌ Este comando só pode ser executado em grupos.' }, { quoted: msg });
                }

                // Pega o ID de quem foi mencionado ou da mensagem que foi respondida
                const alvo = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                             msg.message.extendedTextMessage?.contextInfo?.participant;

                if (!alvo) {
                    return await sock.sendMessage(doUsuario, { text: '⚠️ Você precisa marcar (@) ou responder à mensagem de quem deseja remover.' }, { quoted: msg });
                }

                // Executa a remoção do ID alvo dentro do grupo correspondente
                await sock.groupParticipantsUpdate(doUsuario, [alvo], "remove");
                await sock.sendMessage(doUsuario, { text: '🚫 Participante removido.' });
                break;
        }
    } catch (error) {
        console.error('Erro ao processar o comando:', error);
    }
}

module.exports = { lidarComComando };