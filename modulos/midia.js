const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Tenta importar o ffmpeg-static de forma opcional para evitar quebras se não estiver instalado
let ffmpegPath = null;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    ffmpegPath = 'ffmpeg'; // Fallback para ffmpeg global do sistema
}

module.exports = async (sock, msg, comando, args) => {
    const from = msg.key.remoteJid;
    const busca = args.join(" ").trim();

    switch (comando) {
        case 'menumidia':
            const menuMidiaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🎵  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗜𝗗𝗜𝗔𝗦 𝗘 𝗕𝗨𝗦𝗖𝗔𝗦  🎵      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de conversão, downloads e motores de busca reais.\n\n ➔ *!sticker* ou *!s* - Converte imagem ou vídeo curto em figurinha.\n ➔ *!copiarsticker* - Converte figurinha estática em imagem.\n ➔ *!anime [nome]* - Busca a ficha técnica real de um anime.\n ➔ *!clima [cidade]* - Temperatura e meteorologia em tempo real.\n ➔ *!wikipedia [termo]* - Resumo enciclopédico oficial da Wikipedia.\n ➔ *!letra [artista - música]* - Procura a letra da música indicada.\n ➔ *!qrcode [texto]* - Gera uma imagem QR Code a partir de um texto.\n ➔ *!encurtar [url]* - Reduz links longos usando encurtador público.\n ➔ *!google [termo]* - Gera link direto de pesquisa.\n ➔ *!frase* - Envia uma frase motivacional aleatória.\n ➔ *!definicao [palavra]* - Busca o significado no dicionário.\n ➔ *!pinterest [termo]* - Atalho para busca de imagens.\n ➔ *!wallpaper [termo]* - Link para papéis de parede baseados no termo.\n ➔ *!play [nome]* / *!video [nome]* - (Requer servidores externos/APIs de scraping ativas)\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuMidiaTxt }, { quoted: msg });
            break;

        case 'sticker':
        case 's':
            const tipoMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ? 'imagem' : 
                            msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ? 'video' : null;

            if (!tipoMsg) {
                return sock.sendMessage(from, { text: "❌ Você precisa responder a uma imagem ou vídeo curto com o comando *!sticker*!" }, { quoted: msg });
            }

            const midiaObjeto = msg.message?.imageMessage || msg.message?.videoMessage || 
                                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || 
                                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

            if (tipoMsg === 'video' && midiaObjeto.seconds > 10) {
                return sock.sendMessage(from, { text: "⚠️ O vídeo pode ter no máximo 10 segundos para virar figurinha animada." }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: "⏳ Processando sua figurinha..." }, { quoted: msg });

            const nomeArquivoTemporario = path.join(__dirname, `temp_${Date.now()}.${tipoMsg === 'imagem' ? 'jpg' : 'mp4'}`);
            const nomeArquivoWebp = path.join(__dirname, `temp_${Date.now()}.webp`);

            try {
                const streamMidia = await downloadContentFromMessage(midiaObjeto, tipoMsg === 'imagem' ? 'image' : 'video');
                let bufferCompleto = Buffer.from([]);
                for await (const pedaco of streamMidia) {
                    bufferCompleto = Buffer.concat([bufferCompleto, pedaco]);
                }
                
                fs.writeFileSync(nomeArquivoTemporario, bufferCompleto);

                const comandoFfmpeg = tipoMsg === 'imagem' 
                    ? `"${ffmpegPath}" -i "${nomeArquivoTemporario}" -vcodec libwebp -vf "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:(320-iw)/2:(320-ih)/2:color=0x00000000" "${nomeArquivoWebp}"`
                    : `"${ffmpegPath}" -i "${nomeArquivoTemporario}" -vcodec libwebp -fs 900k -vf "scale='min(240,iw)':'min(240,ih)':force_original_aspect_ratio=decrease,fps=12,pad=240:240:(240-iw)/2:(240-ih)/2:color=0x00000000" -loop 0 -an -vsync 0 "${nomeArquivoWebp}"`;

                exec(comandoFfmpeg, async (erroConversion) => {
                    if (erroConversion) {
                        if (fs.existsSync(nomeArquivoTemporario)) fs.unlinkSync(nomeArquivoTemporario);
                        if (fs.existsSync(nomeArquivoWebp)) fs.unlinkSync(nomeArquivoWebp);
                        return sock.sendMessage(from, { text: "❌ Erro ao processar mídia via FFMPEG. Verifique a instalação do pacote ffmpeg-static." }, { quoted: msg });
                    }

                    if (fs.existsSync(nomeArquivoWebp)) {
                        const figurinhaPronta = fs.readFileSync(nomeArquivoWebp);
                        await sock.sendMessage(from, { sticker: figurinhaPronta }, { quoted: msg });
                    }

                    if (fs.existsSync(nomeArquivoTemporario)) fs.unlinkSync(nomeArquivoTemporario);
                    if (fs.existsSync(nomeArquivoWebp)) fs.unlinkSync(nomeArquivoWebp);
                });
            } catch (error) {
                if (fs.existsSync(nomeArquivoTemporario)) fs.unlinkSync(nomeArquivoTemporario);
                if (fs.existsSync(nomeArquivoWebp)) fs.unlinkSync(nomeArquivoWebp);
                await sock.sendMessage(from, { text: "❌ Falha no download ou processamento do arquivo." }, { quoted: msg });
            }
            break;

        case 'anime':
            if (!busca) return sock.sendMessage(from, { text: "❌ Insira o nome de um anime. Ex: `!anime Naruto`" }, { quoted: msg });
            try {
                const resposta = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(busca)}&limit=1`);
                const dados = await resposta.json();
                if (!dados.data || dados.data.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Nenhum anime encontrado com esse nome." }, { quoted: msg });
                }
                const info = dados.data[0];
                const fichaAnime = `🌸 *INFORMAÇÕES DE ANIME* 🌸\n\n🎬 *Título:* ${info.title}\n📺 *Tipo:* ${info.type || 'N/A'}\n🔄 *Episódios:* ${info.episodes || 'Em exibição'}\n⭐ *Nota:* ${info.score || 'Sem nota'}/10\n🏢 *Estúdio:* ${info.studios?.map(s => s.name).join(', ') || 'Desconhecido'}\n\n💬 *Sinopse (EN):* ${info.synopsis ? info.synopsis.slice(0, 400) + '...' : 'Sem sinopse disponível.'}`;
                
                if (info.images?.jpg?.image_url) {
                    await sock.sendMessage(from, { image: { url: info.images.jpg.image_url }, caption: fichaAnime }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: fichaAnime }, { quoted: msg });
                }
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Erro ao conectar com o banco de dados de animes." }, { quoted: msg });
            }
            break;

        case 'clima':
            if (!busca) return sock.sendMessage(from, { text: "❌ Insira a cidade. Ex: `!clima Maputo`" }, { quoted: msg });
            try {
                const resGeo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(busca)}&count=1&language=pt`);
                const dadosGeo = await resGeo.json();
                if (!dadosGeo.results || dadosGeo.results.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Cidade não localizada geograficamente." }, { quoted: msg });
                }
                const loc = dadosGeo.results[0];
                const resClima = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true`);
                const dadosClima = await resClima.json();
                const cw = dadosClima.current_weather;

                const climaTxt = `☀️ *MÉTEO REAL-TIME* ☀️\n\n📍 *Local:* ${loc.name}, ${loc.country}\n🌡️ *Temperatura:* ${cw.temperature}°C\n💨 *Velocidade do Vento:* ${cw.windspeed} km/h`;
                await sock.sendMessage(from, { text: climaTxt }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Falha ao obter dados meteorológicos atuais." }, { quoted: msg });
            }
            break;

        case 'wikipedia':
            if (!busca) return sock.sendMessage(from, { text: "❌ O que deseja buscar na Wikipedia?" }, { quoted: msg });
            try {
                const resWiki = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(busca.replace(/ /g, '_'))}`);
                if (!resWiki.ok) throw new Error();
                const dadosWiki = await resWiki.json();
                const wikiTxt = `📚 *WIKIPEDIA SUMMARY* 📚\n\n🔍 *Item:* ${dadosWiki.title}\n\n📝 ${dadosWiki.extract}`;
                await sock.sendMessage(from, { text: wikiTxt }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Não encontrei nenhum resumo sobre esse tema na Wikipedia." }, { quoted: msg });
            }
            break;

        case 'letra':
            if (!busca) return sock.sendMessage(from, { text: "❌ Use: `!letra Artista - Nome da Musica`" }, { quoted: msg });
            try {
                let partes = busca.split('-');
                let artista = partes[0].trim();
                let musica = partes[1] ? partes[1].trim() : busca;
                const resLetra = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artista)}/${encodeURIComponent(musica)}`);
                const dadosLetra = await resLetra.json();
                if (!dadosLetra.lyrics) {
                    return sock.sendMessage(from, { text: "❌ Letra não encontrada. Certifique-se de separar por hífen (ex: `!letra Linkin Park - In the End`)." }, { quoted: msg });
                }
                await sock.sendMessage(from, { text: `🎵 *LETRA DA MÚSICA* 🎵\n\n${dadosLetra.lyrics}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Erro ao procurar a letra da música." }, { quoted: msg });
            }
            break;

        case 'qrcode':
            if (!busca) return sock.sendMessage(from, { text: "❌ Forneça o texto ou link para o QR Code." }, { quoted: msg });
            const urlQr = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(busca)}`;
            await sock.sendMessage(from, { image: { url: urlQr }, caption: "✅ Seu QR Code foi gerado com sucesso!" }, { quoted: msg });
            break;

        case 'encurtar':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o link completo que deseja encurtar." }, { quoted: msg });
            try {
                const resLink = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(busca)}`);
                const linkCurto = await resLink.text();
                await sock.sendMessage(from, { text: `🔗 *LINK ENCURTADO:*\n\n👉 ${linkCurto}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Falha ao tentar encurtar a URL fornecida." }, { quoted: msg });
            }
            break;

        case 'definicao':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite uma palavra para procurar no dicionário." }, { quoted: msg });
            try {
                const resDic = await fetch(`https://dicio-api-ca规模.vercel.app/api/v2/${encodeURIComponent(busca.toLowerCase())}`).catch(() => 
                    fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(busca.toLowerCase())}`)
                );
                const dadosDic = await resDic.json();
                let def = Array.isArray(dadosDic) ? dadosDic[0]?.meanings?.join("\n") || dadosDic[0]?.xml : dadosDic.xml || "Significado indisponível.";
                def = def.replace(/<[^>]*>/g, ''); // Limpa tags XML/HTML se houver
                await sock.sendMessage(from, { text: `📖 *DICIONÁRIO:* *${busca}*\n\n${def.slice(0, 800)}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ Não consegui achar a definição para "${busca}".` }, { quoted: msg });
            }
            break;

        case 'frase':
            try {
                const frases = [
                    "A água inteira do oceano não pode afundar um navio, a menos que entre nele.",
                    "Não espere por circunstâncias ideais, crie-as.",
                    "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
                    "Que a nossa coragem seja maior do que o nosso medo e que a nossa força seja tão grande quanto a nossa fé."
                ];
                const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
                await sock.sendMessage(from, { text: `🌊 *MENSAGEM DO DIA:* \n\n_"${fraseAleatoria}"_` }, { quoted: msg });
            } catch (e) {}
            break;

        case 'google':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o que pesquisar." }, { quoted: msg });
            await sock.sendMessage(from, { text: `🔍 *LINK DE PESQUISA GOOGLE:*\n👉 https://www.google.com/search?q=${encodeURIComponent(busca)}` }, { quoted: msg });
            break;

        case 'pinterest':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o termo de busca." }, { quoted: msg });
            await sock.sendMessage(from, { text: `📌 *BUSCA NO PINTEREST:*\n👉 https://www.pinterest.com/search/pins/?q=${encodeURIComponent(busca)}` }, { quoted: msg });
            break;

        case 'wallpaper':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o tema do papel de parede." }, { quoted: msg });
            await sock.sendMessage(from, { text: `🖼️ *WALLPAPERS ENCONTRADOS (PEXELS):*\n👉 https://www.pexels.com/pt-br/procurar/${encodeURIComponent(busca)}` }, { quoted: msg });
            break;

        case 'play':
        case 'video':
            // Alerta transparente sobre as limitações locais de downloads de vídeos grandes no Railway básico
            await sock.sendMessage(from, { text: "ℹ️ Para baixar faixas completas de áudio/vídeo, o bot exige a biblioteca nativa `yt-dlp` ou servidores dedicados configurados na hospedagem devido ao consumo de memória." }, { quoted: msg });
            break;

        default:
            break;
    }
};
