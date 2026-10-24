// Gera figurinha animada (vídeo → WebP) respeitando o limite do WhatsApp.
//
// Por quê: o WhatsApp só abre figurinha animada de até 500 KB (512x512). A
// biblioteca wa-sticker-formatter NÃO comprime sozinha — só tem o parâmetro
// "quality" — então um vídeo de 10s com quality 70 saía com ~3 MB e a
// figurinha chegava, mas não abria.
//
// Como: reduz o vídeo ANTES (512x512, menos quadros por segundo, menos
// segundos), gera a figurinha, mede o tamanho e, se passou do limite, tenta de
// novo com um "degrau" mais leve. Para no primeiro que couber.
const fs = require('fs');
const path = require('path');

// Limite real: 500 KB. Deixamos uma margem pra não ficar no fio da navalha.
const LIMITE_BYTES = 490 * 1024;

// Do mais bonito pro mais leve. Cada degrau reduz os quadros por segundo, a
// duração máxima e a qualidade da figurinha.
const DEGRAUS = [
    { fps: 15, segundos: 8, qualidade: 50 },
    { fps: 12, segundos: 6, qualidade: 40 },
    { fps: 10, segundos: 5, qualidade: 30 },
    { fps: 8, segundos: 4, qualidade: 20 }
];

/**
 * @param {object} p
 * @param {Function} p.Sticker        classe Sticker do wa-sticker-formatter
 * @param {object}   p.StickerTypes   enum StickerTypes do wa-sticker-formatter
 * @param {Buffer}   p.bufferVideo    vídeo original (ou já com legenda)
 * @param {Function} p.rodarFfmpeg    (argumentos) => Promise — roda o ffmpeg
 * @param {string}   p.pasta          pasta pros arquivos temporários
 * @param {string}   p.pack           nome do pacote da figurinha
 * @param {string}   p.autor          autor da figurinha
 * @returns {Promise<{coube: boolean, buffer: Buffer|null, tentativas: Array}>}
 *   `tentativas` lista { fps, segundos, qualidade, bytes } de cada degrau tentado.
 */
async function gerarFigurinhaDeVideo({
    Sticker, StickerTypes, bufferVideo, rodarFfmpeg, pasta, pack, autor,
    degraus = DEGRAUS, limiteBytes = LIMITE_BYTES
}) {
    const sufixo = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const entrada = path.join(pasta, `stickervid_in_${sufixo}.mp4`);
    const temporarios = [entrada];
    const tentativas = [];

    try {
        fs.writeFileSync(entrada, bufferVideo);

        for (const degrau of degraus) {
            const saida = path.join(pasta, `stickervid_out_${sufixo}_${degrau.fps}fps.mp4`);
            temporarios.push(saida);

            // Quadrado 512x512 (preenche e corta o excesso, como o
            // StickerTypes.CROPPED), sem áudio, com menos quadros e menos segundos.
            await rodarFfmpeg([
                '-y', '-i', entrada,
                '-t', String(degrau.segundos),
                '-an',
                '-vf', `scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=${degrau.fps}`,
                saida
            ]);

            const sticker = new Sticker(fs.readFileSync(saida), {
                pack,
                author: autor,
                type: StickerTypes.CROPPED,
                quality: degrau.qualidade
            });
            const bufferFigurinha = await sticker.toBuffer();
            tentativas.push({ ...degrau, bytes: bufferFigurinha.length });

            if (bufferFigurinha.length <= limiteBytes) {
                return { coube: true, buffer: bufferFigurinha, tentativas };
            }
        }

        return { coube: false, buffer: null, tentativas };
    } finally {
        for (const arquivo of temporarios) {
            try { if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo); } catch (_) { /* segue */ }
        }
    }
}

module.exports = { gerarFigurinhaDeVideo, LIMITE_BYTES, DEGRAUS };
