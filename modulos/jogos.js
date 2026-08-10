// modulos/jogos.js
// Jogos em grupo: forca, jogo da velha, 30 segundos, roleta russa social, enquete.
//
// ⚠️ ESTADO ATUAL: esqueleto. As rotas já estão registradas no comandos.js
// e funcionam sem quebrar o bot, mas os jogos em si ainda serão preenchidos
// nas próximas entregas (forca + jogo da velha primeiro, 30 segundos por
// último por ser o mais complexo).
const { resolverIdentidade, obterAlvo } = require('./jidUtils');

const emConstrucao = (nomeJogo) =>
    `🚧 *${nomeJogo}* ainda está em construção — chega numa próxima atualização! 🌊`;

const jogosModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        const sender = resolverIdentidade(msg.key);
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) {
            return sock.sendMessage(from, { text: "❌ Os jogos em grupo só funcionam dentro de grupos! 🌊" }, { quoted: msg });
        }

        switch (comando) {
            case 'forca':
            case 'chutar':
            case 'desistirforca':
                return sock.sendMessage(from, { text: emConstrucao('Forca') }, { quoted: msg });

            case 'jogodavelha':
            case 'aceitarvelha':
            case 'jogar':
            case 'desistirvelha':
                return sock.sendMessage(from, { text: emConstrucao('Jogo da Velha') }, { quoted: msg });

            case '30s':
            case 'vermelha':
            case 'azul':
            case 'iniciar30s':
            case 'pular':
            case 'placar30s':
            case 'encerrar30s':
                return sock.sendMessage(from, { text: emConstrucao('30 Segundos') }, { quoted: msg });

            case 'roletarussa':
                return sock.sendMessage(from, { text: emConstrucao('Roleta Russa Social') }, { quoted: msg });

            case 'enquete':
                return sock.sendMessage(from, { text: emConstrucao('Enquete') }, { quoted: msg });

            case 'ppt':
                return sock.sendMessage(from, { text: emConstrucao('Pedra, Papel e Tesoura') }, { quoted: msg });

            case 'verdadeoudesafio':
                return sock.sendMessage(from, { text: emConstrucao('Verdade ou Desafio') }, { quoted: msg });

            case 'emojicharada':
                return sock.sendMessage(from, { text: emConstrucao('Emoji Charada') }, { quoted: msg });

            case 'quiz':
                return sock.sendMessage(from, { text: emConstrucao('Quiz') }, { quoted: msg });

            case 'sorteio':
            case 'participar':
            case 'sortear':
                return sock.sendMessage(from, { text: emConstrucao('Sorteio') }, { quoted: msg });

            case 'palavraencadeada':
                return sock.sendMessage(from, { text: emConstrucao('Palavra Encadeada') }, { quoted: msg });

            default:
                break;
        }
    } catch (error) {
        console.error("Erro interno detectado no jogos.js: ", error);
    }
};

// Chamado pelo comandos.js em toda mensagem de grupo que NÃO é comando —
// verifica se é um palpite válido de uma rodada ativa do !30s. Por enquanto
// não há nenhuma rodada possível (jogo ainda não implementado), então
// sempre retorna false sem efeito nenhum.
const verificarPalpite30s = async (sock, msg, db, salvarDB, from, sender, texto) => {
    return false;
};

module.exports = jogosModulo;
module.exports.jogosModulo = jogosModulo;
module.exports.default = jogosModulo;
module.exports.verificarPalpite30s = verificarPalpite30s;
