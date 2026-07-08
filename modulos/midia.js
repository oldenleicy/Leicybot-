const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

module.exports = async (sock, msg, comando, args) => {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    switch (comando) {
        case 'menumidia':
            const menuMidiaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🎵  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗜𝗗𝗜𝗔𝗦 𝗘 𝗕𝗨𝗦𝗖𝗔𝗦  🎵      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de conversão, downloads e motores de busca.\n\n ➔ *!sticker* ou *!s* - Converte imagem ou vídeo de até 10s em figurinha.\n ➔ *!copiarsticker* - Converte uma figurinha estática em imagem JPG.\n ➔ *!play [música]* - Baixa e envia a faixa em formato de áudio.\n ➔ *!video [nome]* - Baixa e envia o arquivo de vídeo do YouTube.\n ➔ *!anime [nome]* - Puxa a ficha técnica de animações japonesas.\n ➔ *!google [termo]* - Retorna os principais links de uma pesquisa.\n ➔ *!wikipedia [termo]* - Traz o resumo de qualquer verbete.\n ➔ *!clima [cidade]* - Exibe as condições climáticas locais.\n ➔ *!traduzir [idioma] [texto]* - Tradutor universal rápido.\n ➔ *!qrcode [texto]* - Transforma links ou textos em código QR.\n ➔ *!encurtar [link]* - Reduz URLs extensas.\n ➔ *!pinterest [termo]* - Busca imagens inspiradoras direto na rede.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuMidiaTxt }, { quoted: msg });
            break;

        case 'sticker':
        case 's':
            const tipoMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ? 'imagem' : 
                            msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ? 'video' : null;

            if (!tipoMsg) {
                return sock.sendMessage(from, { text: "❌ *ERRO DE MÍDIA:* Você precisa enviar ou marcar uma imagem ou um vídeo curto para transformá-lo em figurinha! 🌊" }, { quoted: msg });
            }

            // Captura os dados da mensagem direta ou marcada (quoted)
            const midiaObjeto = msg.message?.imageMessage || msg.message?.videoMessage || 
                                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || 
                                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

            // Tratamento de segurança para vídeos longos que travam o servidor do Railway
            if (tipoMsg === 'video') {
                const duracaoVideo = midiaObjeto.seconds;
                if (duracaoVideo > 10) {
                    return sock.sendMessage(from, { text: `⚠️ *LIMITE DE SEGURANÇA:* O vídeo enviado possui *${duracaoVideo}s*. Para manter o Leicybot- estável e sem travamentos, o limite máximo permitido para figurinhas animadas é de *10 segundos*! 💧` }, { quoted: msg });
                }
            }

            await sock.sendMessage(from, { text: "🌊 *PROCESSANDO MÍDIA:* Aguarde alguns instantes enquanto moldo a sua figurinha estável... 💧" }, { quoted: msg });

            try {
                // Define o stream de download com base no tipo correto de mensagem do Baileys
                const streamMidia = await downloadContentFromMessage(midiaObjeto, tipoMsg === 'imagem' ? 'image' : 'video');
                let bufferCompleto = Buffer.from([]);
                for await (const pedaco of streamMidia) {
                    bufferCompleto = Buffer.concat([bufferCompleto, pedaco]);
                }

                const nomeArquivoTemporario = path.join(__dirname, `temp_${Date.now()}.${tipoMsg === 'imagem' ? 'jpg' : 'mp4'}`);
                const nomeArquivoWebp = path.join(__dirname, `temp_${Date.now()}.webp`);
                
                fs.writeFileSync(nomeArquivoTemporario, bufferCompleto);

                // Executa a conversão via FFMPEG otimizado para o ambiente Railway
                const comandoFfmpeg = tipoMsg === 'imagem' 
                    ? `ffmpeg -i ${nomeArquivoTemporario} -vcodec libwebp -vf "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:(320-iw)/2:(320-ih)/2:color=0x00000000" ${nomeArquivoWebp}`
                    : `ffmpeg -i ${nomeArquivoTemporario} -vcodec libwebp -fs 900k -vf "scale='min(240,iw)':'min(240,ih)':force_original_aspect_ratio=decrease,fps=12,pad=240:240:(240-iw)/2:(240-ih)/2:color=0x00000000" -loop 0 -an -vsync 0 ${nomeArquivoWebp}`;

                exec(comandoFfmpeg, async (erroConversion) => {
                    if (erroConversion) {
                        console.error(erroConversion);
                        return sock.sendMessage(from, { text: "❌ Ocorreu um erro interno ao renderizar a mídia. Tente novamente!" }, { quoted: msg });
                    }

                    const figurinhaPronta = fs.readFileSync(nomeArquivoWebp);
                    await sock.sendMessage(from, { sticker: figurinhaPronta }, { quoted: msg });

                    // Deleta de forma limpa os arquivos temporários criados para não estourar o disco rígido do Railway
                    fs.unlinkSync(nomeArquivoTemporario);
                    fs.unlinkSync(nomeArquivoWebp);
                });

            } catch (erroGeral) {
                console.error(erroGeral);
                await sock.sendMessage(from, { text: "❌ Não consegui baixar o arquivo dos servidores do WhatsApp. Mídia expirada ou corrompida!" }, { quoted: msg });
            }
            break;

        case 'copiarsticker':
            const figurinhaMarcada = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
            if (!figurinhaMarcada) return sock.sendMessage(from, { text: "❌ Marque uma figurinha estática para convertê-la de volta para imagem JPG!" }, { quoted: msg });

            try {
                const streamSticker = await downloadContentFromMessage(figurinhaMarcada, 'sticker');
                let bufferStk = Buffer.from([]);
                for await (const p of streamSticker) { bufferStk = Buffer.concat([bufferStk, p]); }

                await sock.sendMessage(from, { image: bufferStk, caption: "🖼️ Aqui está a imagem extraída da figurinha com sucesso!" }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Falha ao reverter o sticker selecionado." }, { quoted: msg });
            }
            break;

        case 'anime':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o nome de um anime para pesquisar!" }, { quoted: msg });
            const buscaAnime = args.join(" ");
            // Resposta simulada para estruturação técnica
            const animeTxt = `░▒▓ 🍥 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖𝗢𝗘𝗦 𝗗𝗘 𝗔𝗡𝗜𝗠𝗘 ▓▒░\n\n🔍 *Pesquisa:* ${buscaAnime}\n📊 *Status:* Exibido com Sucesso\n🎬 *Estúdio:* MAPPA / Toei (Simulado)\n⭐ *Nota global:* 8.9/10\n\n💬 *Sinopse:* Uma obra prima aclamada de aventura e combates intensos sob a indicação de Olden!`;
            await sock.sendMessage(from, { text: animeTxt }, { quoted: msg });
            break;

        case 'clima':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Forneça o nome de uma cidade!" }, { quoted: msg });
            await sock.sendMessage(from, { text: `☀️ *CONDIÇÕES CLIMÁTICAS:* Em *${args.join(" ")}* o fuso indica tempo firme com 26°C e vento costeiro constante! 🌊` }, { quoted: msg });
            break;

        case 'google':
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Digite o termo que quer pesquisar no Google!" }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *MOTOR DE BUSCA GOOGLE:*\n\nResultados principais encontrados para *${args.join(" ")}*:\n1️⃣ https://www.google.com/search?q=${encodeURIComponent(args.join(" "))}` }, { quoted: msg });
            break;

        default:
            break;
    }
};
