const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const youtubedl = require('youtube-dl-exec');

// Tenta importar o ffmpeg-static de forma opcional para evitar quebras se não estiver instalado
let ffmpegPath = null;
try {
    ffmpegPath = require('ffmpeg-static');
} catch (e) {
    ffmpegPath = 'ffmpeg'; // Fallback para ffmpeg global do sistema
}

// ─── CONFIGURAÇÃO DAS FIGURINHAS ───
const STICKER_PACK = "LeicyBot 💧🌊";
const STICKER_AUTOR = "O.X & LiL GTA";

// Fonte usada para desenhar texto (!s-legenda e !attp). Baixe qualquer fonte
// .ttf gratuita (ex: Google Fonts, "Bebas Neue" ou "Roboto-Bold") e salve
// EXATAMENTE neste caminho dentro do seu projeto: modulos/assets/font.ttf
// Sem esse arquivo, !s-legenda e !attp não vão funcionar (o resto do bot
// continua normal).
const FONT_PATH = path.join(__dirname, 'assets', 'font.ttf');

// Escapa caracteres especiais da sintaxe de FILTRO do ffmpeg (drawtext).
// Isso não é escaping de shell — usamos execFile (sem shell) justamente
// para não correr risco de injeção de comando vinda de texto do usuário.
function escaparParaDrawtext(texto) {
    return String(texto)
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, '')
        .replace(/%/g, '')
        .slice(0, 60);
}

function rodarFfmpeg(argumentos) {
    return new Promise((resolve, reject) => {
        execFile(ffmpegPath, argumentos, (erro, stdout, stderr) => {
            if (erro) return reject(new Error(stderr || erro.message));
            resolve();
        });
    });
}

async function baixarMidiaDaMensagem(msg) {
    const tipoMsg = msg.message?.imageMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ? 'imagem' :
                    msg.message?.videoMessage || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ? 'video' : null;

    if (!tipoMsg) return { tipoMsg: null };

    const midiaObjeto = msg.message?.imageMessage || msg.message?.videoMessage ||
                        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
                        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (tipoMsg === 'video' && midiaObjeto.seconds > 10) {
        return { tipoMsg, erroLimite: true };
    }

    const streamMidia = await downloadContentFromMessage(midiaObjeto, tipoMsg === 'imagem' ? 'image' : 'video');
    let bufferCompleto = Buffer.from([]);
    for await (const pedaco of streamMidia) {
        bufferCompleto = Buffer.concat([bufferCompleto, pedaco]);
    }
    return { tipoMsg, buffer: bufferCompleto };
}

async function criarFigurinha(sock, msg, from, legenda) {
    const { tipoMsg, buffer, erroLimite } = await baixarMidiaDaMensagem(msg);

    if (!tipoMsg) {
        return sock.sendMessage(from, { text: "❌ Você precisa responder a uma imagem ou vídeo curto com o comando *!sticker*!" }, { quoted: msg });
    }
    if (erroLimite) {
        return sock.sendMessage(from, { text: "⚠️ O vídeo pode ter no máximo 10 segundos para virar figurinha animada." }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: "⏳ Processando sua figurinha..." }, { quoted: msg });

    let midiaFinal = buffer;
    let arquivoComLegenda = null;

    try {
        if (legenda) {
            const extEntrada = tipoMsg === 'imagem' ? 'jpg' : 'mp4';
            const sufixo = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const entradaTmp = path.join(__dirname, `sticker_in_${sufixo}.${extEntrada}`);
            const saidaTmp = path.join(__dirname, `sticker_out_${sufixo}.${extEntrada}`);
            fs.writeFileSync(entradaTmp, buffer);

            const textoSeguro = escaparParaDrawtext(legenda);
            const filtro = `drawtext=fontfile='${FONT_PATH}':text='${textoSeguro}':fontsize=42:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-text_h-20`;

            await rodarFfmpeg(['-y', '-i', entradaTmp, '-vf', filtro, saidaTmp]);

            arquivoComLegenda = saidaTmp;
            midiaFinal = fs.readFileSync(saidaTmp);
            if (fs.existsSync(entradaTmp)) fs.unlinkSync(entradaTmp);
        }

        const sticker = new Sticker(midiaFinal, {
            pack: STICKER_PACK,
            author: STICKER_AUTOR,
            type: StickerTypes.CROPPED, // preenche o quadrado (corta o excesso) em vez de deixar bordas vazias
            quality: 70
        });
        const bufferFigurinha = await sticker.toBuffer();
        await sock.sendMessage(from, { sticker: bufferFigurinha }, { quoted: msg });
    } catch (erro) {
        console.error('[STICKER] Erro:', erro.message || erro);
        const dica = legenda ? " Se a legenda for o problema, confirme que existe o arquivo modulos/assets/font.ttf no projeto." : "";
        await sock.sendMessage(from, { text: `❌ Falha ao criar a figurinha.${dica}` }, { quoted: msg });
    } finally {
        if (arquivoComLegenda && fs.existsSync(arquivoComLegenda)) fs.unlinkSync(arquivoComLegenda);
    }
}

module.exports = async (sock, msg, comando, args) => {
    const from = msg.key.remoteJid;
    const busca = args.join(" ").trim();

    switch (comando) {
        case 'menumidia':
            const menuMidiaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🎵  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗜𝗗𝗜𝗔𝗦 𝗘 𝗕𝗨𝗦𝗖𝗔𝗦  🎵      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de conversão, downloads e motores de busca reais.\n\n ➔ *!sticker* ou *!s* - Converte imagem ou vídeo curto em figurinha.\n ➔ *!s- [legenda]* - Cria a figurinha já com um texto desenhado nela.\n ➔ *!attp [texto]* - Figurinha animada com o texto oscilando em cores.\n ➔ *!copiarsticker* - Converte figurinha estática em imagem.\n ➔ *!anime [nome]* - Busca a ficha técnica real de um anime.\n ➔ *!clima [cidade]* - Temperatura e meteorologia em tempo real.\n ➔ *!wikipedia [termo]* - Resumo enciclopédico oficial da Wikipedia.\n ➔ *!letra [artista - música]* - Procura a letra da música indicada.\n ➔ *!qrcode [texto]* - Gera uma imagem QR Code a partir de um texto.\n ➔ *!encurtar [url]* - Reduz links longos usando encurtador público.\n ➔ *!google [termo]* - Gera link direto de pesquisa.\n ➔ *!frase* - Envia uma frase motivacional aleatória.\n ➔ *!definicao [palavra]* - Busca o significado no dicionário.\n ➔ *!pinterest [termo]* - Atalho para busca de imagens.\n ➔ *!wallpaper [termo]* - Link para papéis de parede baseados no termo.\n ➔ *!play [nome/link]* - Baixa áudio do YouTube.\n ➔ *!video [nome/link]* - Baixa vídeo do YouTube.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuMidiaTxt }, { quoted: msg });
            break;

        case 'sticker':
        case 's':
            await criarFigurinha(sock, msg, from, null);
            break;

        case 'sticker-':
        case 's-':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite a legenda depois do traço. Ex: `!s- sharingam`" }, { quoted: msg });
            await criarFigurinha(sock, msg, from, busca);
            break;

        case 'attp':
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o texto. Ex: `!attp sharingam`" }, { quoted: msg });

            await sock.sendMessage(from, { text: "⏳ Gerando escrita animada..." }, { quoted: msg });

            const attpTmp = path.join(__dirname, `attp_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
            try {
                const textoSeguroAttp = escaparParaDrawtext(busca);
                const filtroAttp = `drawtext=fontfile='${FONT_PATH}':text='${textoSeguroAttp}':fontsize=64:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2,hue=h=360*t/2.5:s=2`;

                await rodarFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=black@0.0:s=512x512:d=2.5:r=20', '-vf', filtroAttp, '-pix_fmt', 'yuva420p', attpTmp]);

                const stickerAttp = new Sticker(attpTmp, {
                    pack: STICKER_PACK,
                    author: STICKER_AUTOR,
                    type: StickerTypes.FULL
                });
                const bufferAttp = await stickerAttp.toBuffer();
                await sock.sendMessage(from, { sticker: bufferAttp }, { quoted: msg });
            } catch (erro) {
                console.error('[ATTP] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Falha ao gerar a figurinha animada. Confirme que existe o arquivo modulos/assets/font.ttf no projeto." }, { quoted: msg });
            } finally {
                if (fs.existsSync(attpTmp)) fs.unlinkSync(attpTmp);
            }
            break;

        case 'anime':
            if (!busca) return sock.sendMessage(from, { text: "❌ Insira o nome de um anime. Ex: `!anime Naruto`" }, { quoted: msg });
            try {
                const resposta = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(busca)}&limit=1`);

                if (resposta.status === 429) {
                    return sock.sendMessage(from, { text: "⏳ Muitas buscas seguidas! O serviço de animes está me limitando por instantes. Tente de novo daqui a pouco." }, { quoted: msg });
                }
                if (!resposta.ok) {
                    console.error(`[ANIME] API retornou status ${resposta.status} para a busca "${busca}"`);
                    return sock.sendMessage(from, { text: "❌ O serviço de animes está instável no momento. Tente novamente daqui a pouco." }, { quoted: msg });
                }

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
                console.error('[ANIME] Erro de conexão:', e.message);
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
                const resDic = await fetch(`https://api.dicionario-aberto.net/word/${encodeURIComponent(busca.toLowerCase())}`);
                const dadosDic = await resDic.json();
                let def = Array.isArray(dadosDic) ? (dadosDic[0]?.meanings?.join("\n") || dadosDic[0]?.xml) : (dadosDic.xml || "Significado indisponível.");
                def = (def || "Significado indisponível.").replace(/<[^>]*>/g, ''); // Limpa tags XML/HTML se houver
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
        case 'video': {
            if (!busca) return sock.sendMessage(from, { text: `❌ Diga o nome ou cole o link. Ex: \`!${comando} Imagine Dragons Believer\`` }, { quoted: msg });

            await sock.sendMessage(from, { text: "⏳ Buscando e baixando, isso pode levar um tempinho..." }, { quoted: msg });

            const ehLink = /^https?:\/\//i.test(busca);
            const alvo = ehLink ? busca : `ytsearch1:${busca}`;
            const sufixo = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const modeloSaida = path.join(__dirname, `yt_${sufixo}.%(ext)s`);

            try {
                const opcoesBase = {
                    output: modeloSaida,
                    noCheckCertificates: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    ffmpegLocation: ffmpegPath,
                    noPlaylist: true,
                    matchFilter: 'duration < 600' // protege o Railway grátis: bloqueia vídeos > 10min
                };

                if (comando === 'play') {
                    await youtubedl(alvo, { ...opcoesBase, extractAudio: true, audioFormat: 'mp3', audioQuality: 5 });
                } else {
                    await youtubedl(alvo, { ...opcoesBase, format: 'mp4[filesize<50M]/mp4' });
                }

                const pastaBase = __dirname;
                const prefixo = `yt_${sufixo}`;
                const arquivoGerado = fs.readdirSync(pastaBase).find(f => f.startsWith(prefixo));

                if (!arquivoGerado) {
                    return sock.sendMessage(from, { text: "❌ Não consegui baixar. Tente outro termo ou link." }, { quoted: msg });
                }

                const caminhoCompleto = path.join(pastaBase, arquivoGerado);
                const bufferMidia = fs.readFileSync(caminhoCompleto);

                if (comando === 'play') {
                    await sock.sendMessage(from, { audio: bufferMidia, mimetype: 'audio/mp4', fileName: `${busca}.mp3` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { video: bufferMidia, caption: `🎬 ${busca}` }, { quoted: msg });
                }

                fs.unlinkSync(caminhoCompleto);
            } catch (e) {
                console.error('[PLAY/VIDEO] Erro:', e.message || e);
                await sock.sendMessage(from, { text: "❌ Falha ao baixar. Pode ser vídeo muito longo, restrito, ou o serviço está indisponível." }, { quoted: msg });
            }
            break;
        }

        default:
            break;
    }
};