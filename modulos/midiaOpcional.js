// modulos/midiaOpcional.js
// Função central usada por outros módulos (economia, adm, diversão, jogos)
// para enriquecer eventos do bot (jackpot, ban, casamento, etc.) com uma
// imagem/figurinha configurável pelo dono, sem precisar mexer em código.
//
// Como configurar um evento: coloque um arquivo chamado exatamente como o
// "nome-evento" (ex: jackpot.png) dentro da pasta assets/eventos/ na RAIZ
// do projeto — não é a mesma pasta que modulos/assets/ (essa é só do
// font.ttf). A pasta assets/eventos/ não precisa existir de antemão: se
// não existir, ou se não houver arquivo pro evento, a função simplesmente
// manda o texto normal — isso é comportamento esperado, não é erro.
//
// Extensões aceitas, nessa ordem de prioridade: .jpg, .png, .webp, .gif

const fs = require('fs');
const path = require('path');

const PASTA_EVENTOS = path.join(__dirname, '..', 'assets', 'eventos');
const EXTENSOES_SUPORTADAS = ['.jpg', '.png', '.webp', '.gif'];

// Procura o primeiro arquivo existente pra esse evento, respeitando a
// ordem de prioridade das extensões acima.
function localizarArquivoDoEvento(nomeEvento) {
    for (const ext of EXTENSOES_SUPORTADAS) {
        const caminho = path.join(PASTA_EVENTOS, `${nomeEvento}${ext}`);
        if (fs.existsSync(caminho)) {
            return { caminho, ext };
        }
    }
    return null;
}

// Envia `textoNormal` para `from`, anexando a mídia opcional do evento
// `nomeEvento` quando o dono tiver configurado uma em assets/eventos/.
//
// .jpg / .png -> enviados como imagem, com textoNormal na legenda.
// .gif        -> enviado como vídeo com gifPlayback, com textoNormal na legenda.
// .webp       -> enviado como figurinha. O protocolo do WhatsApp NÃO permite
//                legenda em figurinha, então nesse caso a figurinha e o
//                texto vão em duas mensagens separadas (figurinha primeiro,
//                texto logo em seguida), pra legenda não se perder.
//
// Se o arquivo não existir, ou se algo falhar ao enviá-lo, cai pra mandar
// só o texto — nunca deixa o gatilho que chamou (jackpot, ban, etc.)
// quebrar por causa disso.
//
// `opcoes` é opcional (a assinatura de 4 argumentos do plano continua
// funcionando normalmente). Foi adicionado porque gatilhos reais como o
// !assaltar precisam marcar (@mencionar) a vítima na mensagem de resultado
// — coisa que só a mensagem de texto simples não cobria:
//   - opcoes.quoted   -> mesmo objeto `msg` usado no resto do bot pra
//                        responder "em cima" do comando que originou o evento.
//   - opcoes.mentions -> array de JIDs a mencionar (repassado tanto pra
//                        mensagem de mídia quanto pra de texto).
async function enviarComMidiaOpcional(sock, from, nomeEvento, textoNormal, opcoes = {}) {
    const { quoted = null, mentions = [] } = opcoes;
    const comQuoted = quoted ? { quoted } : {};
    const comMencoes = mentions.length ? { mentions } : {};

    const arquivo = localizarArquivoDoEvento(nomeEvento);

    if (!arquivo) {
        await sock.sendMessage(from, { text: textoNormal, ...comMencoes }, comQuoted);
        return;
    }

    try {
        const buffer = fs.readFileSync(arquivo.caminho);

        switch (arquivo.ext) {
            case '.webp':
                await sock.sendMessage(from, { sticker: buffer }, comQuoted);
                await sock.sendMessage(from, { text: textoNormal, ...comMencoes }, comQuoted);
                break;

            case '.gif':
                await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption: textoNormal, ...comMencoes }, comQuoted);
                break;

            default: // .jpg / .png
                await sock.sendMessage(from, { image: buffer, caption: textoNormal, ...comMencoes }, comQuoted);
                break;
        }
    } catch (erro) {
        console.error(`[MIDIA OPCIONAL] Falha ao enviar mídia do evento "${nomeEvento}", caindo pro texto puro:`, erro.message || erro);
        await sock.sendMessage(from, { text: textoNormal, ...comMencoes }, comQuoted);
    }
}

module.exports = { enviarComMidiaOpcional };
