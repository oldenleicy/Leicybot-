const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Essas duas dependências são "pesadas" (binários nativos/baixados). Se
// falharem ao carregar, isso NÃO deve derrubar o bot inteiro — só os
// comandos que dependem delas (!sticker, !attp, !play, !video) ficam
// indisponíveis, com uma mensagem clara em vez de crash.
let Sticker = null, StickerTypes = null;
try {
    ({ Sticker, StickerTypes } = require('wa-sticker-formatter'));
} catch (e) {
    console.error('[MIDIA] wa-sticker-formatter não carregou:', e.message);
}

let youtubedl = null;
try {
    youtubedl = require('youtube-dl-exec');
} catch (e) {
    console.error('[MIDIA] youtube-dl-exec não carregou:', e.message);
}

// Mesma lógica de import opcional: se o tesseract.js não carregar, só o
// !ocr fica indisponível — o resto do bot segue normal.
let TesseractJS = null;
try {
    TesseractJS = require('tesseract.js');
} catch (e) {
    console.error('[MIDIA] tesseract.js não carregou:', e.message);
}

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

// ─── BUSCA TOLERANTE (item 3 do plano) ───
// Normaliza uma string pra comparação "aproximada": remove acentos, baixa
// pra minúsculas e tira pontuação. Não é fuzzy matching sofisticado de
// propósito — só o suficiente pra pegar o caso comum de acento/maiúscula/
// pontuação diferente entre o que o usuário digitou e o que a API achou.
function normalizarParaComparacao(texto) {
    return String(texto)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Decide se o resultado encontrado é "longe demais" do termo buscado.
// Considera próximo o suficiente se um contém o outro, ou se pelo menos
// metade das palavras do termo buscado aparece no resultado.
function resultadoDivergeDoTermo(termoBuscado, resultadoEncontrado) {
    const a = normalizarParaComparacao(termoBuscado);
    const b = normalizarParaComparacao(resultadoEncontrado);
    if (!a || !b) return false;
    if (b.includes(a) || a.includes(b)) return false;
    const palavrasA = a.split(' ').filter(Boolean);
    if (palavrasA.length === 0) return false;
    const emComum = palavrasA.filter(p => b.includes(p)).length;
    return (emComum / palavrasA.length) < 0.5;
}

const AVISO_RESULTADO_APROXIMADO = "⚠️ Não achei exato, mostrando o mais próximo:\n\n";

// Retry simples pra APIs instáveis (item 2.2 do plano): tenta de novo 1x em
// erro de rede ou status 5xx. Em 429 (rate limit) ou na última tentativa,
// devolve a resposta como está — repetir um 429 na hora só pioraria o limite.
async function fetchComRetry(url, maxTentativas = 2) {
    let ultimoErro = null;
    for (let i = 0; i < maxTentativas; i++) {
        try {
            const resposta = await fetch(url);
            if (resposta.ok || resposta.status === 429 || i === maxTentativas - 1) {
                return resposta;
            }
        } catch (erroRede) {
            ultimoErro = erroRede;
            if (i === maxTentativas - 1) throw erroRede;
        }
    }
    if (ultimoErro) throw ultimoErro;
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

async function baixarFigurinhaRespondida(msg) {
    const stickerMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    if (!stickerMsg) return null;

    const streamSticker = await downloadContentFromMessage(stickerMsg, 'sticker');
    let bufferCompleto = Buffer.from([]);
    for await (const pedaco of streamSticker) {
        bufferCompleto = Buffer.concat([bufferCompleto, pedaco]);
    }
    return bufferCompleto;
}

// Usada só pelo !tomp3/!toaudio (7): aceita vídeo, áudio/nota de voz ou
// figurinha respondida — mais abrangente que baixarMidiaDaMensagem, que só
// lida com imagem/vídeo.
async function baixarMidiaParaAudio(msg) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const videoMsg = msg.message?.videoMessage || ctx?.videoMessage;
    const audioMsg = msg.message?.audioMessage || ctx?.audioMessage;
    const stickerMsg = msg.message?.stickerMessage || ctx?.stickerMessage;

    let tipo = null, midiaObjeto = null;
    if (videoMsg) { tipo = 'video'; midiaObjeto = videoMsg; }
    else if (audioMsg) { tipo = 'audio'; midiaObjeto = audioMsg; }
    else if (stickerMsg) { tipo = 'sticker'; midiaObjeto = stickerMsg; }

    if (!tipo) return { tipo: null };

    const streamMidia = await downloadContentFromMessage(midiaObjeto, tipo === 'sticker' ? 'sticker' : tipo);
    let bufferCompleto = Buffer.from([]);
    for await (const pedaco of streamMidia) {
        bufferCompleto = Buffer.concat([bufferCompleto, pedaco]);
    }
    return { tipo, buffer: bufferCompleto };
}

async function criarFigurinha(sock, msg, from, legenda) {
    if (!Sticker) {
        return sock.sendMessage(from, { text: "❌ O recurso de figurinhas está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
    }

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
            const menuMidiaTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🎵  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗜𝗗𝗜𝗔𝗦 𝗘 𝗕𝗨𝗦𝗖𝗔𝗦  🎵      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de conversão, downloads e motores de busca reais.\n\n ➔ *!sticker* ou *!s* - Converte imagem ou vídeo curto em figurinha.\n ➔ *!s- [legenda]* - Cria a figurinha já com um texto desenhado nela.\n ➔ *!attp [texto]* - Figurinha animada com o texto oscilando em cores.\n ➔ *!copiarsticker* - Converte figurinha estática em imagem.\n ➔ *!anime [nome]* - Busca a ficha técnica real de um anime.\n ➔ *!clima [cidade]* - Temperatura e meteorologia em tempo real.\n ➔ *!wikipedia [termo]* - Resumo enciclopédico oficial da Wikipedia.\n ➔ *!letra [artista - música]* - Procura a letra da música indicada.\n ➔ *!qrcode [texto]* - Gera uma imagem QR Code a partir de um texto.\n ➔ *!encurtar [url]* - Reduz links longos usando encurtador público.\n ➔ *!google [termo]* - Gera link direto de pesquisa.\n ➔ *!frase* - Envia uma frase motivacional aleatória.\n ➔ *!definicao [palavra]* - Busca o significado no dicionário.\n ➔ *!pinterest [termo]* - Atalho para busca de imagens.\n ➔ *!wallpaper [termo]* - Link para papéis de parede baseados no termo.\n ➔ *!play [nome/link]* - Baixa áudio do YouTube.\n ➔ *!video [nome/link]* - Baixa vídeo do YouTube.\n ➔ *!tomp3* ou *!toaudio* - Extrai o áudio de um vídeo/nota de voz/figurinha respondida.\n ➔ *!brat [texto]* - Figurinha estilo capa do álbum Brat (fundo verde-limão).\n ➔ *!meme [cima] | [baixo]* - Escreve texto em cima/embaixo da imagem respondida.\n ➔ *!emojimix [emoji1]+[emoji2]* - Mistura dois emojis num só (Emoji Kitchen).\n ➔ *!traduzir [idioma] [texto]* - Traduz um texto para o idioma indicado.\n ➔ *!tiktok [link]* - Baixa vídeo do TikTok.\n ➔ *!instagram [link]* - Baixa vídeo/reel do Instagram.\n ➔ *!ocr* - Extrai o texto de uma imagem respondida.\n░▒▓█████████████████████████████████████▓▒░`;
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
            if (!Sticker) {
                return sock.sendMessage(from, { text: "❌ O recurso de figurinhas está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
            }
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

        case 'copiarsticker': {
            const bufferWebp = await baixarFigurinhaRespondida(msg);
            if (!bufferWebp) {
                return sock.sendMessage(from, { text: "❌ Responda a uma figurinha estática com *!copiarsticker* para convertê-la em imagem." }, { quoted: msg });
            }

            const sufixoCopia = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const entradaWebp = path.join(__dirname, `copiarsticker_in_${sufixoCopia}.webp`);
            const saidaPng = path.join(__dirname, `copiarsticker_out_${sufixoCopia}.png`);

            try {
                fs.writeFileSync(entradaWebp, bufferWebp);
                await rodarFfmpeg(['-y', '-i', entradaWebp, saidaPng]);
                const bufferPng = fs.readFileSync(saidaPng);
                await sock.sendMessage(from, { image: bufferPng, caption: "✅ Figurinha convertida em imagem!" }, { quoted: msg });
            } catch (erro) {
                console.error('[COPIARSTICKER] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Falha ao converter a figurinha em imagem." }, { quoted: msg });
            } finally {
                if (fs.existsSync(entradaWebp)) fs.unlinkSync(entradaWebp);
                if (fs.existsSync(saidaPng)) fs.unlinkSync(saidaPng);
            }
            break;
        }

        case 'anime':
            if (!busca) return sock.sendMessage(from, { text: "❌ Insira o nome de um anime. Ex: `!anime Naruto`" }, { quoted: msg });
            try {
                // Retry automático (2.2): a Jikan cai/expira com frequência, então
                // tenta mais uma vez antes de desistir.
                const resposta = await fetchComRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(busca)}&limit=1`);

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

                // Busca tolerante (3): avisa quando o 1º resultado da Jikan diverge
                // bastante do termo digitado (título alternativo, romanização
                // diferente, etc.), em vez de devolver sem contexto.
                const avisoAnime = resultadoDivergeDoTermo(busca, info.title) ? AVISO_RESULTADO_APROXIMADO : '';
                const fichaAnime = `${avisoAnime}🌸 *INFORMAÇÕES DE ANIME* 🌸\n\n🎬 *Título:* ${info.title}\n📺 *Tipo:* ${info.type || 'N/A'}\n🔄 *Episódios:* ${info.episodes || 'Em exibição'}\n⭐ *Nota:* ${info.score || 'Sem nota'}/10\n🏢 *Estúdio:* ${info.studios?.map(s => s.name).join(', ') || 'Desconhecido'}\n\n💬 *Sinopse (EN):* ${info.synopsis ? info.synopsis.slice(0, 400) + '...' : 'Sem sinopse disponível.'}`;

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

                // Busca tolerante (3): consulta a iTunes Search API pra achar o
                // título/artista canônico antes de perguntar pro lyrics.ovh — que é
                // bem sensível a nome exato, então isso aumenta a taxa de acerto
                // quando o usuário digita errado, incompleto ou fora de ordem.
                let avisoLetra = '';
                try {
                    const resItunes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(busca)}&entity=song&limit=1`);
                    const dadosItunes = await resItunes.json();
                    const achado = dadosItunes.results?.[0];
                    if (achado?.artistName && achado?.trackName) {
                        if (resultadoDivergeDoTermo(busca, `${achado.artistName} ${achado.trackName}`)) {
                            avisoLetra = AVISO_RESULTADO_APROXIMADO;
                        }
                        artista = achado.artistName;
                        musica = achado.trackName;
                    }
                } catch (eItunes) {
                    // iTunes fora do ar não deve travar o comando — segue com o que
                    // o próprio usuário digitou.
                }

                const resLetra = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artista)}/${encodeURIComponent(musica)}`);
                const dadosLetra = await resLetra.json();
                if (!dadosLetra.lyrics) {
                    return sock.sendMessage(from, { text: "❌ Letra não encontrada. Certifique-se de separar por hífen (ex: `!letra Linkin Park - In the End`)." }, { quoted: msg });
                }
                await sock.sendMessage(from, { text: `${avisoLetra}🎵 *LETRA DA MÚSICA* 🎵\n\n${dadosLetra.lyrics}` }, { quoted: msg });
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
            if (!youtubedl) {
                return sock.sendMessage(from, { text: "❌ O recurso de download está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
            }
            if (!busca) return sock.sendMessage(from, { text: `❌ Diga o nome ou cole o link. Ex: \`!${comando} Imagine Dragons Believer\`` }, { quoted: msg });

            await sock.sendMessage(from, { text: "⏳ Buscando e baixando, isso pode levar um tempinho..." }, { quoted: msg });

            const ehLink = /^https?:\/\//i.test(busca);
            const alvo = ehLink ? busca : `ytsearch1:${busca}`;
            const sufixo = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            // %(title)s no template de saída (além de nomear o arquivo direito)
            // também é o que permite comparar o título real baixado com o termo
            // pedido mais abaixo (busca tolerante, item 3).
            const modeloSaida = path.join(__dirname, `yt_${sufixo}_%(title)s.%(ext)s`);
            let caminhoCompleto = null;

            // Cookies opcionais (2.1): se existir um cookies.txt exportado de uma
            // conta real na raiz do projeto, usa ele; senão segue sem cookies,
            // exatamente como já funcionava.
            const caminhoCookies = path.join(__dirname, '..', 'cookies.txt');
            const temCookies = fs.existsSync(caminhoCookies);

            try {
                // Cadeia de fallback de player_client (2.1): tenta Android primeiro
                // (evita o bloqueio "Sign in to confirm you're not a bot" na maioria
                // dos casos); se falhar, tenta iOS e por último TV embarcada — cada
                // um finge ser um cliente diferente do YouTube e contorna bloqueios
                // distintos.
                const clientesFallback = ['android', 'ios', 'tv_embedded'];
                let baixouComSucesso = false;
                let ultimoErroDownload = null;

                for (const cliente of clientesFallback) {
                    try {
                        const opcoesBase = {
                            output: modeloSaida,
                            noCheckCertificates: true,
                            noWarnings: true,
                            preferFreeFormats: true,
                            ffmpegLocation: ffmpegPath,
                            noPlaylist: true,
                            matchFilter: 'duration < 600', // protege o Railway grátis: bloqueia vídeos > 10min
                            extractorArgs: `youtube:player_client=${cliente}`,
                            ...(temCookies ? { cookies: caminhoCookies } : {})
                        };

                        if (comando === 'play') {
                            await youtubedl(alvo, { ...opcoesBase, extractAudio: true, audioFormat: 'mp3', audioQuality: 5 });
                        } else {
                            await youtubedl(alvo, { ...opcoesBase, format: 'mp4[filesize<50M]/mp4' });
                        }
                        baixouComSucesso = true;
                        break;
                    } catch (erroTentativa) {
                        ultimoErroDownload = erroTentativa;
                        console.error(`[PLAY/VIDEO] Tentativa com player_client=${cliente} falhou:`, erroTentativa.message || erroTentativa);
                    }
                }

                if (!baixouComSucesso) {
                    throw ultimoErroDownload || new Error('Todas as tentativas de download falharam.');
                }

                const pastaBase = __dirname;
                const prefixo = `yt_${sufixo}`;
                const arquivoGerado = fs.readdirSync(pastaBase).find(f => f.startsWith(prefixo));

                if (!arquivoGerado) {
                    return sock.sendMessage(from, { text: "❌ Não consegui baixar. Tente outro termo ou link." }, { quoted: msg });
                }

                caminhoCompleto = path.join(pastaBase, arquivoGerado);
                const bufferMidia = fs.readFileSync(caminhoCompleto);

                // Busca tolerante (3): compara o título real gravado no nome do
                // arquivo (via %(title)s) com o termo pedido — só faz sentido em
                // busca por nome, não quando o usuário já colou um link direto.
                let avisoPlay = '';
                if (!ehLink) {
                    const tituloReal = path.basename(arquivoGerado, path.extname(arquivoGerado)).replace(`${prefixo}_`, '');
                    if (tituloReal && resultadoDivergeDoTermo(busca, tituloReal)) {
                        avisoPlay = `${AVISO_RESULTADO_APROXIMADO}Encontrei: *${tituloReal}*`;
                    }
                }
                if (avisoPlay) {
                    await sock.sendMessage(from, { text: avisoPlay }, { quoted: msg });
                }

                if (comando === 'play') {
                    await sock.sendMessage(from, { audio: bufferMidia, mimetype: 'audio/mp4', fileName: `${busca}.mp3` }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { video: bufferMidia, caption: `🎬 ${busca}` }, { quoted: msg });
                }
            } catch (e) {
                console.error('[PLAY/VIDEO] Erro:', e.message || e);
                const mensagemErro = (e.message || '').toLowerCase();
                if (mensagemErro.includes('sign in') || mensagemErro.includes('bot')) {
                    await sock.sendMessage(from, { text: "❌ O YouTube bloqueou esse download por suspeitar de automação. Tenta de novo daqui a pouco — se continuar acontecendo sempre, me avisa." }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { text: "❌ Falha ao baixar. Pode ser vídeo muito longo, restrito, ou o serviço está indisponível." }, { quoted: msg });
                }
            } finally {
                // Roda mesmo se o sock.sendMessage falhar (ex: arquivo grande demais,
                // conexão caiu no meio do envio) — antes o unlinkSync só rodava no
                // caminho feliz, deixando lixo em disco a cada falha de envio.
                if (caminhoCompleto && fs.existsSync(caminhoCompleto)) fs.unlinkSync(caminhoCompleto);
            }
            break;
        }

        // ─── ENTREGA 7 — NOVOS COMANDOS DE MÍDIA ───

        case 'tomp3':
        case 'toaudio': {
            const { tipo, buffer: bufferOrigemAudio } = await baixarMidiaParaAudio(msg);
            if (!tipo) {
                return sock.sendMessage(from, { text: "❌ Responda a um vídeo, áudio/nota de voz ou figurinha com *!tomp3* para extrair o áudio." }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: "⏳ Extraindo o áudio..." }, { quoted: msg });

            const extEntradaAudio = tipo === 'video' ? 'mp4' : tipo === 'audio' ? 'ogg' : 'webp';
            const sufixoAudio = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const entradaAudio = path.join(__dirname, `tomp3_in_${sufixoAudio}.${extEntradaAudio}`);
            const saidaAudio = path.join(__dirname, `tomp3_out_${sufixoAudio}.mp3`);

            try {
                fs.writeFileSync(entradaAudio, bufferOrigemAudio);
                await rodarFfmpeg(['-y', '-i', entradaAudio, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', saidaAudio]);
                const bufferAudioFinal = fs.readFileSync(saidaAudio);
                await sock.sendMessage(from, { audio: bufferAudioFinal, mimetype: 'audio/mp4', fileName: 'audio.mp3' }, { quoted: msg });
            } catch (erro) {
                console.error('[TOMP3] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Não consegui extrair áudio dessa mídia. Confirme que ela tem trilha sonora." }, { quoted: msg });
            } finally {
                if (fs.existsSync(entradaAudio)) fs.unlinkSync(entradaAudio);
                if (fs.existsSync(saidaAudio)) fs.unlinkSync(saidaAudio);
            }
            break;
        }

        case 'brat': {
            if (!Sticker) {
                return sock.sendMessage(from, { text: "❌ O recurso de figurinhas está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
            }
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o texto. Ex: `!brat sharingam`" }, { quoted: msg });

            const bratTmp = path.join(__dirname, `brat_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
            try {
                const textoSeguroBrat = escaparParaDrawtext(busca);
                // Verde-limão aproximado da capa do álbum Brat — sem animação de
                // cor (diferente do !attp), é só o fundo sólido + texto preto.
                const filtroBrat = `drawtext=fontfile='${FONT_PATH}':text='${textoSeguroBrat}':fontsize=46:fontcolor=black:x=(w-text_w)/2:y=(h-text_h)/2`;

                await rodarFfmpeg(['-y', '-f', 'lavfi', '-i', 'color=c=0x8ace00:s=512x512:d=1', '-vf', filtroBrat, '-frames:v', '1', bratTmp]);

                const stickerBrat = new Sticker(bratTmp, {
                    pack: STICKER_PACK,
                    author: STICKER_AUTOR,
                    type: StickerTypes.FULL,
                    quality: 70
                });
                const bufferBrat = await stickerBrat.toBuffer();
                await sock.sendMessage(from, { sticker: bufferBrat }, { quoted: msg });
            } catch (erro) {
                console.error('[BRAT] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Falha ao gerar a figurinha. Confirme que existe o arquivo modulos/assets/font.ttf no projeto." }, { quoted: msg });
            } finally {
                if (fs.existsSync(bratTmp)) fs.unlinkSync(bratTmp);
            }
            break;
        }

        case 'meme': {
            const { tipoMsg: tipoMsgMeme, buffer: bufferMemeOrigem } = await baixarMidiaDaMensagem(msg);
            if (tipoMsgMeme !== 'imagem') {
                return sock.sendMessage(from, { text: "❌ Responda a uma imagem com *!meme [texto de cima] | [texto de baixo]*." }, { quoted: msg });
            }
            if (!busca) return sock.sendMessage(from, { text: "❌ Digite o texto. Ex: `!meme quando o chefe manda | trabalhar no fim de semana`" }, { quoted: msg });

            const [textoCimaBruto, textoBaixoBruto] = busca.includes('|') ? busca.split('|') : [null, busca];
            const textoCimaMeme = textoCimaBruto ? escaparParaDrawtext(textoCimaBruto.trim()) : '';
            const textoBaixoMeme = textoBaixoBruto ? escaparParaDrawtext(textoBaixoBruto.trim()) : '';

            const sufixoMeme = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const entradaMeme = path.join(__dirname, `meme_in_${sufixoMeme}.jpg`);
            const saidaMeme = path.join(__dirname, `meme_out_${sufixoMeme}.jpg`);

            try {
                fs.writeFileSync(entradaMeme, bufferMemeOrigem);
                const filtrosMeme = [];
                if (textoCimaMeme) filtrosMeme.push(`drawtext=fontfile='${FONT_PATH}':text='${textoCimaMeme}':fontsize=46:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=20`);
                if (textoBaixoMeme) filtrosMeme.push(`drawtext=fontfile='${FONT_PATH}':text='${textoBaixoMeme}':fontsize=46:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-text_h-20`);

                await rodarFfmpeg(['-y', '-i', entradaMeme, '-vf', filtrosMeme.join(','), saidaMeme]);
                const bufferMemeFinal = fs.readFileSync(saidaMeme);
                await sock.sendMessage(from, { image: bufferMemeFinal, caption: "✅ Meme gerado!" }, { quoted: msg });
            } catch (erro) {
                console.error('[MEME] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Falha ao gerar o meme. Confirme que existe o arquivo modulos/assets/font.ttf no projeto." }, { quoted: msg });
            } finally {
                if (fs.existsSync(entradaMeme)) fs.unlinkSync(entradaMeme);
                if (fs.existsSync(saidaMeme)) fs.unlinkSync(saidaMeme);
            }
            break;
        }

        case 'emojimix': {
            if (!busca) return sock.sendMessage(from, { text: "❌ Use: `!emojimix 😂+😭` (dois emojis separados por +)." }, { quoted: msg });

            const partesEmojiMix = busca.split('+').map(p => p.trim()).filter(Boolean);
            if (partesEmojiMix.length !== 2) {
                return sock.sendMessage(from, { text: "❌ Preciso de exatamente 2 emojis separados por +. Ex: `!emojimix 😂+😭`" }, { quoted: msg });
            }

            const [emojiUm, emojiDois] = partesEmojiMix;
            const codepointUm = Array.from(emojiUm)[0]?.codePointAt(0)?.toString(16);
            const codepointDois = Array.from(emojiDois)[0]?.codePointAt(0)?.toString(16);

            if (!codepointUm || !codepointDois) {
                return sock.sendMessage(from, { text: "❌ Não consegui reconhecer os emojis enviados." }, { quoted: msg });
            }

            try {
                // Endpoint público não-oficial que serve os mashups do Google
                // Emoji Kitchen a partir dos codepoints dos dois emojis.
                const urlMix = `https://emojik.vercel.app/s/${codepointUm}_${codepointDois}?size=256`;
                const resMix = await fetch(urlMix);
                if (!resMix.ok) {
                    return sock.sendMessage(from, { text: "❌ Essa combinação de emojis ainda não existe no Emoji Kitchen. Tente outra dupla." }, { quoted: msg });
                }
                const bufferMix = Buffer.from(await resMix.arrayBuffer());
                await sock.sendMessage(from, { image: bufferMix, caption: `${emojiUm} + ${emojiDois}` }, { quoted: msg });
            } catch (e) {
                console.error('[EMOJIMIX] Erro:', e.message || e);
                await sock.sendMessage(from, { text: "❌ Falha ao gerar a mistura de emojis." }, { quoted: msg });
            }
            break;
        }

        case 'traduzir': {
            if (!busca) return sock.sendMessage(from, { text: "❌ Use: `!traduzir [idioma] [texto]`. Ex: `!traduzir en Bom dia, tudo bem?`" }, { quoted: msg });

            const partesTraducao = busca.split(' ');
            const idiomaDestino = partesTraducao[0].toLowerCase();
            const textoTraduzir = partesTraducao.slice(1).join(' ');

            if (!textoTraduzir) {
                return sock.sendMessage(from, { text: "❌ Faltou o texto. Ex: `!traduzir en Bom dia, tudo bem?`" }, { quoted: msg });
            }

            // Sem idioma de origem explícito no comando: assume português como
            // padrão, a menos que o próprio destino seja português — nesse
            // caso assume inglês como origem (o par inverso mais comum).
            const idiomaOrigem = idiomaDestino === 'pt' ? 'en' : 'pt';

            try {
                const resTraducao = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textoTraduzir)}&langpair=${idiomaOrigem}|${idiomaDestino}`);
                const dadosTraducao = await resTraducao.json();
                const textoFinalTraduzido = dadosTraducao.responseData?.translatedText;

                if (!textoFinalTraduzido || dadosTraducao.responseStatus !== 200) {
                    return sock.sendMessage(from, { text: "❌ Não consegui traduzir. Confirme o código do idioma (ex: en, es, fr)." }, { quoted: msg });
                }
                await sock.sendMessage(from, { text: `🌐 *TRADUÇÃO (${idiomaOrigem} → ${idiomaDestino})*\n\n${textoFinalTraduzido}` }, { quoted: msg });
            } catch (e) {
                await sock.sendMessage(from, { text: "❌ Erro ao conectar com o serviço de tradução." }, { quoted: msg });
            }
            break;
        }

        case 'tiktok':
        case 'instagram': {
            if (!youtubedl) {
                return sock.sendMessage(from, { text: "❌ O recurso de download está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
            }
            if (!busca || !/^https?:\/\//i.test(busca)) {
                return sock.sendMessage(from, { text: `❌ Cole o link do ${comando === 'tiktok' ? 'TikTok' : 'Instagram'}. Ex: \`!${comando} https://...\`` }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: "⏳ Baixando, aguarde um instante..." }, { quoted: msg });

            const sufixoSocial = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const modeloSaidaSocial = path.join(__dirname, `social_${sufixoSocial}.%(ext)s`);
            let caminhoSocial = null;

            try {
                await youtubedl(busca, {
                    output: modeloSaidaSocial,
                    noCheckCertificates: true,
                    noWarnings: true,
                    preferFreeFormats: true,
                    ffmpegLocation: ffmpegPath,
                    noPlaylist: true,
                    matchFilter: 'duration < 600',
                    format: 'mp4[filesize<50M]/mp4'
                });

                const arquivoSocial = fs.readdirSync(__dirname).find(f => f.startsWith(`social_${sufixoSocial}`));
                if (!arquivoSocial) {
                    return sock.sendMessage(from, { text: "❌ Não consegui baixar esse link. Confirme que é público e válido." }, { quoted: msg });
                }
                caminhoSocial = path.join(__dirname, arquivoSocial);
                const bufferSocial = fs.readFileSync(caminhoSocial);
                await sock.sendMessage(from, { video: bufferSocial, caption: `📲 ${comando === 'tiktok' ? 'TikTok' : 'Instagram'} baixado!` }, { quoted: msg });
            } catch (e) {
                console.error(`[${comando.toUpperCase()}] Erro:`, e.message || e);
                await sock.sendMessage(from, { text: "❌ Falha ao baixar. O conteúdo pode ser privado, ter sido removido, ou o serviço está indisponível." }, { quoted: msg });
            } finally {
                if (caminhoSocial && fs.existsSync(caminhoSocial)) fs.unlinkSync(caminhoSocial);
            }
            break;
        }

        case 'ocr': {
            if (!TesseractJS) {
                return sock.sendMessage(from, { text: "❌ O recurso de OCR está temporariamente indisponível (biblioteca não carregou no servidor)." }, { quoted: msg });
            }
            const { tipoMsg: tipoMsgOcr, buffer: bufferOcr } = await baixarMidiaDaMensagem(msg);
            if (tipoMsgOcr !== 'imagem') {
                return sock.sendMessage(from, { text: "❌ Responda a uma imagem com *!ocr* para extrair o texto dela." }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: "⏳ Lendo o texto da imagem..." }, { quoted: msg });

            let workerOcr = null;
            try {
                workerOcr = await TesseractJS.createWorker('por');
                const { data: dadosOcr } = await workerOcr.recognize(bufferOcr);
                const textoLido = (dadosOcr.text || '').trim();

                if (!textoLido) {
                    return sock.sendMessage(from, { text: "❌ Não encontrei nenhum texto legível nessa imagem." }, { quoted: msg });
                }
                await sock.sendMessage(from, { text: `📄 *TEXTO EXTRAÍDO (OCR):*\n\n${textoLido.slice(0, 1500)}` }, { quoted: msg });
            } catch (erro) {
                console.error('[OCR] Erro:', erro.message || erro);
                await sock.sendMessage(from, { text: "❌ Falha ao processar o OCR dessa imagem." }, { quoted: msg });
            } finally {
                if (workerOcr) await workerOcr.terminate();
            }
            break;
        }

        default:
            break;
    }
};