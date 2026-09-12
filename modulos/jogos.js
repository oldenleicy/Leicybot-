// modulos/jogos.js
// Jogos em grupo. Entrega 8 tirou do estado "em construção": Forca, Jogo da
// Velha, Pedra/Papel/Tesoura, Verdade ou Desafio, Emoji Charada, Quiz e
// Palavra Encadeada. Entrega 9 adiciona Sorteio, Enquete (nativa do
// WhatsApp) e a Roleta (aposta solo de sorte). Entrega 10 adiciona Simon,
// Adivinhe o Número, Anagrama e Corrida de Digitação — comandos novos, sem
// stub anterior. Entrega 11 implementa 30 Segundos (times + rodada
// cronometrada de verdade). Entrega 12 implementa Batalha Naval — o
// jogo 1v1 mais complexo do mapa: frota posicionada em segredo (aleatória,
// sem fase de posicionamento manual) e um "radar" de tiros por jogador que
// nunca revela navio não atingido, mesmo rodando tudo num grupo público.
// Com isso, todos os jogos do mapa de implementação estão implementados —
// a Entrega 13 não mexe neste arquivo (só economia.js, diversao.js,
// usuarioPadrao.js e comandos.js).
const { resolverIdentidade, participanteBruto, obterAlvo } = require('./jidUtils');
const criarUsuarioPadrao = require('./usuarioPadrao');
const { enviarComMidiaOpcional } = require('./midiaOpcional');

// ══════════════════════════════════════════════════════════════════
// ESTADO EM MEMÓRIA (v2, Entrega 8)
// Só em memória — NÃO é salvo no database.json, reinicia com o bot (igual
// ao rastreador de mensagens recentes do jidUtils.js). Isso é intencional:
// uma rodada de forca/velha/quiz abandonada não precisa sobreviver a um
// restart, só os Golds ganhos (esses sim vivem em db.usuarios).
//
// Só um jogo "de rodada" (forca / velha / quiz / charada / encadeada) fica
// ativo por vez, por grupo — !ppt e !verdadeoudesafio são instantâneos
// (resolvem numa mensagem só) e não disputam esse espaço.
// ══════════════════════════════════════════════════════════════════
const jogosAtivos = new Map(); // groupJid -> estado do jogo ativo
const TEMPO_EXPIRACAO_MS = 10 * 60 * 1000; // 10 min sem jogada = jogo abandonado

// ══════════════════════════════════════════════════════════════════
// DESAFIOS PENDENTES (Velha / Batalha Naval) — v3
// Antes, desafiar alguém já ocupava a vaga única de "jogo ativo" do
// grupo, mesmo sem ninguém ter aceitado ainda — isso travava QUALQUER
// outro jogo até esse desafio expirar, ser aceito ou recusado. Agora os
// desafios pendentes ficam numa lista à parte, que não disputa espaço
// com jogosAtivos: várias pessoas podem desafiar ao mesmo tempo. Só
// quando um desafio é ACEITO ele tenta ocupar a vaga de jogo do grupo —
// se já tiver outro jogo rolando, quem aceitou precisa tentar de novo
// depois que esse outro terminar (não entra em fila automática).
// ══════════════════════════════════════════════════════════════════
const desafiosPendentes = new Map(); // groupJid -> array de desafios pendentes
const TEMPO_EXPIRACAO_DESAFIO_MS = 10 * 60 * 1000; // 10 min sem aceitar = desafio expira

function obterDesafiosPendentes(groupJid) {
    const lista = desafiosPendentes.get(groupJid) || [];
    const validos = lista.filter(d => Date.now() - d.criadoEm <= TEMPO_EXPIRACAO_DESAFIO_MS);
    desafiosPendentes.set(groupJid, validos);
    return validos;
}

// Checagem de admin (mesmo padrão usado em adm.js, duplicado aqui de
// propósito — cada módulo resolve isso sozinho neste projeto). Usada
// pelo !cancelarjogo e pelos !desistirX, pra deixar um admin do grupo
// encerrar qualquer desafio/jogo sem precisar esperar ele expirar.
async function ehAdmin(sock, from, sender, senderBruto) {
    try {
        const groupMetadata = await sock.groupMetadata(from);
        const adms = [];
        groupMetadata.participants.forEach(p => {
            if (p.admin !== null) {
                adms.push(p.id);
                const alt = p.phoneNumber || p.pn || p.jid;
                if (alt && alt !== p.id) adms.push(alt);
            }
        });
        return adms.includes(sender) || adms.includes(senderBruto);
    } catch (e) {
        return false; // não deu pra confirmar — erra pro lado seguro (nega admin)
    }
}

function normalizar(texto) {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function obterJogoAtivo(groupJid) {
    const jogo = jogosAtivos.get(groupJid);
    if (!jogo) return null;
    if (Date.now() - jogo.ultimaAtividade > TEMPO_EXPIRACAO_MS) {
        jogosAtivos.delete(groupJid);
        return null;
    }
    return jogo;
}

function tocarAtividade(jogo) {
    jogo.ultimaAtividade = Date.now();
}

function garantirUsuario(db, jid) {
    if (!db.usuarios[jid]) db.usuarios[jid] = criarUsuarioPadrao();
    return db.usuarios[jid];
}

// Nome amigável do tipo de jogo, usado nas mensagens de "já tem um rolando".
const NOME_JOGO = {
    forca: 'Forca', velha: 'Jogo da Velha', quiz: 'Quiz',
    charada: 'Emoji Charada', encadeada: 'Palavra Encadeada', sorteio: 'Sorteio',
    simon: 'Simon', adivinhanumero: 'Adivinhe o Número', anagrama: 'Anagrama',
    digitacao: 'Corrida de Digitação', '30s': '30 Segundos',
    batalhanaval: 'Batalha Naval'
};

// ══════════════════════════════════════════════════════════════════
// FORCA
// ══════════════════════════════════════════════════════════════════
const PALAVRAS_FORCA = [
    'abacaxi', 'borboleta', 'cachorro', 'dinossauro', 'elefante', 'fantasma',
    'girafa', 'hospital', 'jacaré', 'lanterna', 'montanha', 'notebook',
    'orquestra', 'pinguim', 'quadrado', 'relógio', 'sanduíche', 'tubarão',
    'universo', 'vulcão', 'xadrez', 'zebra'
];
const TENTATIVAS_FORCA = 6;

function renderizarForca(jogo) {
    const exibicao = Array.from(jogo.palavra)
        .map(letra => (jogo.letrasCertas.has(normalizar(letra)) ? letra : '_'))
        .join(' ');
    const vidas = '💀'.repeat(jogo.erros) + '⬜'.repeat(TENTATIVAS_FORCA - jogo.erros);
    const erradas = jogo.letrasErradas.size
        ? `\n❌ Letras já tentadas e erradas: ${Array.from(jogo.letrasErradas).join(', ').toUpperCase()}`
        : '';
    return `🔤 ${exibicao}\n${vidas} (${jogo.erros}/${TENTATIVAS_FORCA} erros)${erradas}`;
}

function calcularRecompensaForca(palavra, erros) {
    return Math.max(15, palavra.length * 6 - erros * 4);
}

// ══════════════════════════════════════════════════════════════════
// JOGO DA VELHA
// ══════════════════════════════════════════════════════════════════
const NUMEROS_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const COMBINACOES_VITORIA = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // linhas
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // colunas
    [0, 4, 8], [2, 4, 6]             // diagonais
];
const RECOMPENSA_VELHA = 40;

function renderizarVelha(tabuleiro) {
    const celulas = tabuleiro.map((v, i) => v || NUMEROS_EMOJI[i]);
    return `${celulas[0]}${celulas[1]}${celulas[2]}\n${celulas[3]}${celulas[4]}${celulas[5]}\n${celulas[6]}${celulas[7]}${celulas[8]}`;
}

function verificarVencedorVelha(tabuleiro) {
    for (const [a, b, c] of COMBINACOES_VITORIA) {
        if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[b] === tabuleiro[c]) {
            return tabuleiro[a];
        }
    }
    return null;
}

// ══════════════════════════════════════════════════════════════════
// PEDRA, PAPEL E TESOURA (contra o bot)
// ══════════════════════════════════════════════════════════════════
const OPCOES_PPT = ['pedra', 'papel', 'tesoura'];
const EMOJI_PPT = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const RECOMPENSA_PPT = 15;

function pptVence(a, b) {
    return (a === 'pedra' && b === 'tesoura') ||
        (a === 'tesoura' && b === 'papel') ||
        (a === 'papel' && b === 'pedra');
}

// ══════════════════════════════════════════════════════════════════
// VERDADE OU DESAFIO
// ══════════════════════════════════════════════════════════════════
const RECOMPENSA_VOD = 10;
const LISTA_VERDADES = [
    'Qual foi a mentira mais convincente que você já contou?',
    'Qual é o seu maior medo bobo (sem ser algo sério)?',
    'Quantas vezes você já fingiu estar ocupado só pra não responder mensagem?',
    'Qual é a comida mais estranha que você já comeu?',
    'Você já stalkeou o perfil de alguém às 3 da manhã? Quantas vezes essa semana?',
    'Qual é a sua maior vergonha em público?',
    'Se pudesse trocar de vida com alguém do grupo por um dia, quem seria e por quê?',
    'Qual é o segredo mais bobo que você guarda até hoje?'
];
const LISTA_DESAFIOS = [
    'Manda um áudio cantando (mal, de propósito) por 10 segundos.',
    'Troca seu nome no grupo por algo engraçado pelos próximos 10 minutos.',
    'Manda um emoji representando seu humor agora, sem explicar nada.',
    'Escreve uma mensagem só com emojis contando como foi o seu dia.',
    'Elogia a última pessoa que falou no grupo, de um jeito bem exagerado.',
    'Fala 3 verdades e 1 mentira sobre você — o grupo tenta adivinhar qual é a mentira.',
    'Conta a piada mais sem graça que você conhece.',
    'Descreve seu dia usando só nomes de animais.'
];

// ══════════════════════════════════════════════════════════════════
// EMOJI CHARADA
// ══════════════════════════════════════════════════════════════════
const RECOMPENSA_CHARADA = { facil: 20, medio: 35, dificil: 50 };
const BANCO_CHARADAS = [
    { emojis: '🦁👑', respostas: ['rei leao', 'o rei leao'], exibida: 'O Rei Leão', dificuldade: 'facil' },
    { emojis: '🕷️👨', respostas: ['homem aranha', 'homem-aranha'], exibida: 'Homem-Aranha', dificuldade: 'facil' },
    { emojis: '🧊🚢💔', respostas: ['titanic'], exibida: 'Titanic', dificuldade: 'medio' },
    { emojis: '🐠🔍', respostas: ['procurando nemo'], exibida: 'Procurando Nemo', dificuldade: 'facil' },
    { emojis: '❄️⛄👸', respostas: ['frozen'], exibida: 'Frozen', dificuldade: 'facil' },
    { emojis: '🦇🦸', respostas: ['batman'], exibida: 'Batman', dificuldade: 'facil' },
    { emojis: '🧙💍🌋', respostas: ['senhor dos aneis', 'o senhor dos aneis'], exibida: 'O Senhor dos Anéis', dificuldade: 'dificil' },
    { emojis: '🕰️🔙🚗', respostas: ['de volta para o futuro'], exibida: 'De Volta Para o Futuro', dificuldade: 'dificil' },
    { emojis: '👻🚫', respostas: ['cacafantasmas', 'caca fantasmas', 'caca-fantasmas'], exibida: 'Caça-Fantasmas', dificuldade: 'medio' },
    { emojis: '🦈🌊', respostas: ['tubarao'], exibida: 'Tubarão', dificuldade: 'facil' }
];

// ══════════════════════════════════════════════════════════════════
// QUIZ
// ══════════════════════════════════════════════════════════════════
const RECOMPENSA_QUIZ = { facil: 20, medio: 35, dificil: 50 };
const BANCO_QUIZ = [
    { pergunta: 'Qual é o maior planeta do Sistema Solar?', respostas: ['jupiter'], exibida: 'Júpiter', dificuldade: 'facil' },
    { pergunta: 'Quantos lados tem um hexágono?', respostas: ['6', 'seis'], exibida: '6', dificuldade: 'facil' },
    { pergunta: 'Qual é a capital de Moçambique?', respostas: ['maputo'], exibida: 'Maputo', dificuldade: 'facil' },
    { pergunta: 'Em que ano começou a Segunda Guerra Mundial?', respostas: ['1939'], exibida: '1939', dificuldade: 'medio' },
    { pergunta: 'Qual é o oceano mais profundo do mundo?', respostas: ['pacifico', 'oceano pacifico'], exibida: 'Oceano Pacífico', dificuldade: 'medio' },
    { pergunta: 'Quem pintou a Mona Lisa?', respostas: ['leonardo da vinci', 'da vinci'], exibida: 'Leonardo da Vinci', dificuldade: 'facil' },
    { pergunta: 'Qual é o único metal líquido à temperatura ambiente?', respostas: ['mercurio'], exibida: 'Mercúrio', dificuldade: 'medio' },
    { pergunta: 'Quantos ossos tem o corpo humano adulto?', respostas: ['206'], exibida: '206', dificuldade: 'dificil' },
    { pergunta: 'Qual é o rio mais longo do mundo?', respostas: ['nilo', 'amazonas'], exibida: 'Nilo (ou Amazonas, dependendo da fonte!)', dificuldade: 'medio' },
    { pergunta: 'Em que país fica a Torre Eiffel?', respostas: ['franca'], exibida: 'França', dificuldade: 'facil' }
];

// ══════════════════════════════════════════════════════════════════
// PALAVRA ENCADEADA
// ══════════════════════════════════════════════════════════════════
const RECOMPENSA_ENCADEADA = 5;
const PALAVRAS_INICIO_ENCADEADA = ['banana', 'sol', 'livro', 'porta', 'casa', 'nuvem', 'peixe', 'onda'];

// ══════════════════════════════════════════════════════════════════
// SIMON (sequência de cores) — Entrega 10
// ══════════════════════════════════════════════════════════════════
// Versão simplificada pra texto: cada rodada mostra uma sequência NOVA
// (não estende a anterior, senão exigiria digitar sequências enormes de
// cor) e ela cresce 1 cor a cada acerto. Erra uma vez e o jogo acaba, mas
// o Gold das rodadas já sobrevividas fica garantido.
const CORES_SIMON = [
    { nome: 'vermelho', emoji: '🔴' },
    { nome: 'amarelo', emoji: '🟡' },
    { nome: 'verde', emoji: '🟢' },
    { nome: 'azul', emoji: '🔵' },
    { nome: 'roxo', emoji: '🟣' },
    { nome: 'laranja', emoji: '🟠' }
];
const RECOMPENSA_SIMON_POR_RODADA = 12;

function gerarSequenciaSimon(tamanho) {
    const sequencia = [];
    for (let i = 0; i < tamanho; i++) {
        sequencia.push(CORES_SIMON[Math.floor(Math.random() * CORES_SIMON.length)]);
    }
    return sequencia;
}

function renderizarSequenciaSimon(sequencia) {
    return sequencia.map(cor => cor.emoji).join(' ');
}

// ══════════════════════════════════════════════════════════════════
// ADIVINHE O NÚMERO — Entrega 10
// ══════════════════════════════════════════════════════════════════
// Recompensa cai conforme o número de tentativas até acertar.
function calcularRecompensaAdivinhaNumero(tentativas) {
    return Math.max(10, 60 - (tentativas - 1) * 3);
}

// ══════════════════════════════════════════════════════════════════
// ANAGRAMA — Entrega 10
// ══════════════════════════════════════════════════════════════════
const BANCO_ANAGRAMA = [
    'computador', 'elefante', 'universo', 'bicicleta', 'chocolate',
    'aventura', 'fantasma', 'liberdade', 'orquestra', 'tempestade'
];

function embaralharPalavra(palavra) {
    const letras = palavra.split('');
    let embaralhada;
    do {
        for (let i = letras.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letras[i], letras[j]] = [letras[j], letras[i]];
        }
        embaralhada = letras.join('');
    } while (embaralhada === palavra);
    return embaralhada;
}

function calcularRecompensaAnagrama(palavra) {
    return Math.max(15, palavra.length * 5);
}

// ══════════════════════════════════════════════════════════════════
// CORRIDA DE DIGITAÇÃO — Entrega 10
// ══════════════════════════════════════════════════════════════════
// Recompensa escala com a velocidade: quanto menos tempo entre o início
// da rodada e a resposta certa, mais Gold (com piso e teto).
const FRASES_DIGITACAO = [
    'a raposa marrom pula sobre o cachorro preguicoso',
    'o rato roeu a roupa do rei de roma',
    'tres pratos de trigo para tres tigres tristes',
    'o sol nasce para todos igualmente',
    'quem nunca comeu melado quando come se lambuza',
    'o rato correu ligeiro pela toca escura',
    'paralelepipedo e uma palavra dificil de escrever'
];

function calcularRecompensaDigitacao(tempoMs) {
    const segundos = tempoMs / 1000;
    return Math.max(15, Math.min(80, Math.round(80 - segundos * 2)));
}

// ══════════════════════════════════════════════════════════════════
// 30 SEGUNDOS — Entrega 11
// ══════════════════════════════════════════════════════════════════
// O único jogo com times (🔴 vermelha / 🔵 azul) e rodada cronometrada de
// verdade: usa um setTimeout real de 30s em vez de só comparar timestamp
// na próxima mensagem, então a rodada acaba sozinha mesmo que ninguém
// escreva mais nada. Adaptação pro chat de texto: como o bot não tem como
// sussurrar a palavra só pro time da vez, ela aparece pra todo mundo no
// grupo — mas só conta ponto quem responde certo E está no time da vez.
// !pular troca a palavra atual sem pontuar. Cada time joga
// RODADAS_POR_TIME_30S rodadas, alternando; no fim, quem tiver mais
// pontos acumulados vence e cada membro do time vencedor leva um bônus.
const BANCO_PALAVRAS_30S = [
    'cachorro', 'elefante', 'guitarra', 'vulcao', 'chocolate', 'foguete',
    'dinossauro', 'tsunami', 'labirinto', 'coroa', 'espada', 'castelo',
    'girassol', 'tempestade', 'aranha', 'trombone', 'iceberg', 'pirata',
    'vampiro', 'cometa', 'sereia', 'fantasma', 'bussola', 'caverna',
    'tornado', 'unicornio', 'robo', 'zumbi', 'esqueleto', 'labareda'
];
const DURACAO_RODADA_30S_MS = 30 * 1000;
const RODADAS_POR_TIME_30S = 2;
const RECOMPENSA_POR_PALAVRA_30S = 8;
const RECOMPENSA_VITORIA_30S = 40; // bônus por cabeça, só pra quem está no time vencedor

function emojiTime30s(time) {
    return time === 'vermelha' ? '🔴' : '🔵';
}

function timeContrario30s(time) {
    return time === 'vermelha' ? 'azul' : 'vermelha';
}

function sortearPalavra30s(usadas) {
    let disponiveis = BANCO_PALAVRAS_30S.filter(p => !usadas.has(p));
    if (disponiveis.length === 0) {
        usadas.clear();
        disponiveis = BANCO_PALAVRAS_30S;
    }
    return disponiveis[Math.floor(Math.random() * disponiveis.length)];
}

function gerarOrdemRodadas30s() {
    const primeiroTime = Math.random() < 0.5 ? 'vermelha' : 'azul';
    const ordem = [];
    for (let i = 0; i < RODADAS_POR_TIME_30S; i++) {
        ordem.push(primeiroTime, timeContrario30s(primeiroTime));
    }
    return ordem;
}

async function iniciarRodada30s(sock, from, jogo) {
    jogo.fase = 'rodada';
    jogo.palavraAtual = sortearPalavra30s(jogo.palavrasUsadas);
    jogo.acertosRodada = 0;
    jogo.inicioRodada = Date.now();
    tocarAtividade(jogo);

    const time = jogo.timeDaVez;
    await sock.sendMessage(from, {
        text: `⏱️ *RODADA DO TIME ${emojiTime30s(time)} ${time.toUpperCase()}!*\nVocês têm 30 segundos! Só vale resposta de quem está no time ${time} — mande a palavra certa direto no chat (sem !) pra pontuar, ou *!pular* pra trocar de palavra.\n\nPalavra:\n*${jogo.palavraAtual.toUpperCase()}*`
    });

    jogo.timeoutRodada = setTimeout(() => {
        finalizarRodada30s(sock, from).catch(err => console.error("Erro ao finalizar rodada de 30 Segundos:", err));
    }, DURACAO_RODADA_30S_MS);
}

async function finalizarRodada30s(sock, from) {
    const jogo = jogosAtivos.get(from);
    if (!jogo || jogo.tipo !== '30s' || jogo.fase !== 'rodada') return;

    if (jogo.timeoutRodada) clearTimeout(jogo.timeoutRodada);
    const timeQueJogou = jogo.timeDaVez;
    jogo.placar[timeQueJogou] += jogo.acertosRodada;
    jogo.indiceRodadaAtual += 1;
    jogo.fase = 'intervalo';
    tocarAtividade(jogo);

    await sock.sendMessage(from, {
        text: `⏰ Tempo esgotado pro time ${emojiTime30s(timeQueJogou)} ${timeQueJogou.toUpperCase()}! Acertaram *${jogo.acertosRodada}* palavra(s) nesta rodada.\n\n📊 Placar total: 🔴 ${jogo.placar.vermelha}  x  🔵 ${jogo.placar.azul}`
    });

    const proximoTime = jogo.ordemRodadas[jogo.indiceRodadaAtual];
    if (!proximoTime) {
        return finalizarPartida30s(sock, from, jogo);
    }

    jogo.timeDaVez = proximoTime;
    await sock.sendMessage(from, { text: `➡️ Próxima é a vez do time ${emojiTime30s(proximoTime)} ${proximoTime.toUpperCase()}! Digite *!iniciar30s* quando estiverem prontos.` });
}

async function finalizarPartida30s(sock, from, jogo) {
    const { vermelha, azul } = jogo.placar;
    let resultado;

    if (vermelha === azul) {
        resultado = `🤝 *EMPATE!* 🔴 ${vermelha} x ${azul} 🔵. Ninguém leva o bônus de vitória, mas valeu o jogo!`;
    } else {
        const vencedor = vermelha > azul ? 'vermelha' : 'azul';
        resultado = `🏆 *TIME ${emojiTime30s(vencedor)} ${vencedor.toUpperCase()} VENCEU!* 🔴 ${vermelha} x ${azul} 🔵`;

        const membrosVencedores = jogo.times[vencedor];
        if (membrosVencedores && membrosVencedores.size > 0 && jogo.db && jogo.salvarDB) {
            for (const jid of membrosVencedores) {
                const u = garantirUsuario(jogo.db, jid);
                u.golds = (u.golds || 0) + RECOMPENSA_VITORIA_30S;
            }
            jogo.salvarDB(jogo.db);
            resultado += `\nCada um do time vencedor ganhou +${RECOMPENSA_VITORIA_30S} 🪙 de bônus!`;
        }
    }

    jogosAtivos.delete(from);
    await sock.sendMessage(from, { text: `🏁 *FIM DE JOGO — 30 SEGUNDOS!*\n\n${resultado}` });
}

// ══════════════════════════════════════════════════════════════════
// BATALHA NAVAL
// Tabuleiro 6x6 (colunas A-F, linhas 1-6). Cada jogador recebe uma frota
// posicionada aleatoriamente (sem fase manual de posicionamento — foge do
// escopo de um jogo de chat). O "tabuleiro" que aparece nas mensagens não
// é a frota em si, e sim um RADAR: só marca onde já houve tiro (água,
// acerto ou afundado). Isso resolve sozinho o problema de rodar um jogo
// com informação escondida dentro de um grupo público — ninguém, nem os
// próprios jogadores, vê a posição de um navio que ainda não foi atingido.
// ══════════════════════════════════════════════════════════════════
const TAMANHO_TABULEIRO_BATALHA = 6;
const LETRAS_COLUNA_BATALHA = ['A', 'B', 'C', 'D', 'E', 'F'];
const NAVIOS_BATALHA = [
    { nome: 'Porta-Aviões', tamanho: 4 },
    { nome: 'Cruzador', tamanho: 3 },
    { nome: 'Submarino', tamanho: 2 }
];
const RECOMPENSA_BATALHA = 80;

// Sorteia posição (linha/coluna inicial + orientação) pra cada navio da
// lista acima, sem deixar sobrepor outro navio já posicionado. 200
// tentativas por navio é sobra de margem pra um tabuleiro 6x6 com só 9
// células ocupadas no total.
function posicionarFrota() {
    const ocupadas = new Set();
    const navios = [];

    for (const modelo of NAVIOS_BATALHA) {
        let posicionado = false;
        for (let tentativa = 0; tentativa < 200 && !posicionado; tentativa++) {
            const horizontal = Math.random() < 0.5;
            const colInicio = Math.floor(Math.random() * TAMANHO_TABULEIRO_BATALHA);
            const linhaInicio = Math.floor(Math.random() * TAMANHO_TABULEIRO_BATALHA);
            const celulas = [];
            let cabe = true;

            for (let i = 0; i < modelo.tamanho; i++) {
                const col = horizontal ? colInicio + i : colInicio;
                const linha = horizontal ? linhaInicio : linhaInicio + i;
                if (col >= TAMANHO_TABULEIRO_BATALHA || linha >= TAMANHO_TABULEIRO_BATALHA) { cabe = false; break; }
                const coord = `${LETRAS_COLUNA_BATALHA[col]}${linha + 1}`;
                if (ocupadas.has(coord)) { cabe = false; break; }
                celulas.push(coord);
            }

            if (cabe) {
                celulas.forEach(c => ocupadas.add(c));
                navios.push({ nome: modelo.nome, celulas, afundado: false });
                posicionado = true;
            }
        }
    }

    return { ocupadas, navios, tirosRecebidos: new Set() };
}

// Desenha o radar de tiros contra UMA frota: ⬜ célula ainda não atacada,
// 🌊 água (tiro que errou), 💥 acerto num navio ainda não afundado, ☠️
// célula de um navio já totalmente afundado. Nunca mostra navio intacto.
function renderizarRadarBatalha(frota) {
    const celulasAfundadas = new Set();
    frota.navios.forEach(n => { if (n.afundado) n.celulas.forEach(c => celulasAfundadas.add(c)); });

    let texto = `   ${LETRAS_COLUNA_BATALHA.join('  ')}\n`;
    for (let linha = 1; linha <= TAMANHO_TABULEIRO_BATALHA; linha++) {
        let celulasLinha = '';
        for (const coluna of LETRAS_COLUNA_BATALHA) {
            const coord = `${coluna}${linha}`;
            if (!frota.tirosRecebidos.has(coord)) celulasLinha += '⬜';
            else if (celulasAfundadas.has(coord)) celulasLinha += '☠️';
            else if (frota.ocupadas.has(coord)) celulasLinha += '💥';
            else celulasLinha += '🌊';
        }
        texto += `${linha}  ${celulasLinha}\n`;
    }
    return texto.trim();
}

const jogosModulo = async (sock, msg, comando, args, db, salvarDB) => {
    try {
        const from = msg.key.remoteJid;
        const sender = resolverIdentidade(msg.key);
        const senderBruto = participanteBruto(msg.key);
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) {
            return sock.sendMessage(from, { text: "❌ Os jogos em grupo só funcionam dentro de grupos! 🌊" }, { quoted: msg });
        }

        switch (comando) {
            // ── FORCA ──────────────────────────────────────────────
            case 'forca': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    if (jogoExistente.tipo === 'forca') {
                        return sock.sendMessage(from, { text: `🎪 Já tem uma forca rolando!\n\n${renderizarForca(jogoExistente)}\n\nUse *!chutar [letra]* para continuar.` }, { quoted: msg });
                    }
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const palavra = PALAVRAS_FORCA[Math.floor(Math.random() * PALAVRAS_FORCA.length)];
                const jogo = {
                    tipo: 'forca', palavra,
                    letrasCertas: new Set(), letrasErradas: new Set(), erros: 0,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, { text: `🎪 *FORCA INICIADA!*\n\n${renderizarForca(jogo)}\n\nUse *!chutar [letra]* (ou a palavra inteira) para jogar. *!desistirforca* encerra a rodada.` }, { quoted: msg });
            }

            case 'chutar': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'forca') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhuma forca ativa agora. Use *!forca* para começar uma!" }, { quoted: msg });
                }
                const palpiteBruto = (args[0] || '').trim();
                if (!palpiteBruto) {
                    return sock.sendMessage(from, { text: "❌ Digite uma letra ou a palavra inteira. Ex: `!chutar a` ou `!chutar elefante`" }, { quoted: msg });
                }
                const palpite = normalizar(palpiteBruto);

                // Chute da palavra inteira
                if (palpite.length > 1) {
                    if (palpite === normalizar(jogo.palavra)) {
                        const recompensa = calcularRecompensaForca(jogo.palavra, jogo.erros);
                        const u = garantirUsuario(db, sender);
                        u.golds = (u.golds || 0) + recompensa;
                        salvarDB(db);
                        jogosAtivos.delete(from);
                        return enviarComMidiaOpcional(sock, from, 'vitoria-forca',
                            `🎉 *FORCA VENCIDA!* @${sender.split('@')[0]} acertou a palavra *${jogo.palavra}* de primeira! +${recompensa} 🪙!`,
                            { quoted: msg, mentions: [sender] });
                    }
                    jogo.erros += 1;
                    tocarAtividade(jogo);
                    if (jogo.erros >= TENTATIVAS_FORCA) {
                        jogosAtivos.delete(from);
                        return sock.sendMessage(from, { text: `💀 *FIM DE JOGO!* Ninguém acertou a tempo. A palavra era *${jogo.palavra}*. 🌊` }, { quoted: msg });
                    }
                    return sock.sendMessage(from, { text: `❌ *${palpiteBruto}* não é a palavra certa!\n\n${renderizarForca(jogo)}` }, { quoted: msg });
                }

                // Chute de uma letra só
                if (jogo.letrasCertas.has(palpite) || jogo.letrasErradas.has(palpite)) {
                    return sock.sendMessage(from, { text: `❌ Você já tentou a letra *${palpiteBruto.toUpperCase()}*. Tenta outra!` }, { quoted: msg });
                }

                if (normalizar(jogo.palavra).includes(palpite)) {
                    jogo.letrasCertas.add(palpite);
                    tocarAtividade(jogo);

                    const completou = Array.from(jogo.palavra).every(l => l === ' ' || jogo.letrasCertas.has(normalizar(l)));
                    if (completou) {
                        const recompensa = calcularRecompensaForca(jogo.palavra, jogo.erros);
                        const u = garantirUsuario(db, sender);
                        u.golds = (u.golds || 0) + recompensa;
                        salvarDB(db);
                        jogosAtivos.delete(from);
                        return enviarComMidiaOpcional(sock, from, 'vitoria-forca',
                            `🎉 *FORCA VENCIDA!* @${sender.split('@')[0]} completou a palavra *${jogo.palavra}*! +${recompensa} 🪙!`,
                            { quoted: msg, mentions: [sender] });
                    }
                    return sock.sendMessage(from, { text: `✅ Boa! A letra *${palpiteBruto.toUpperCase()}* está na palavra!\n\n${renderizarForca(jogo)}` }, { quoted: msg });
                }

                jogo.letrasErradas.add(palpite);
                jogo.erros += 1;
                tocarAtividade(jogo);
                if (jogo.erros >= TENTATIVAS_FORCA) {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: `💀 *FIM DE JOGO!* Acabaram as tentativas. A palavra era *${jogo.palavra}*. 🌊` }, { quoted: msg });
                }
                return sock.sendMessage(from, { text: `❌ A letra *${palpiteBruto.toUpperCase()}* não está na palavra!\n\n${renderizarForca(jogo)}` }, { quoted: msg });
            }

            case 'desistirforca': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'forca') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhuma forca ativa para desistir." }, { quoted: msg });
                }
                jogosAtivos.delete(from);
                return sock.sendMessage(from, { text: `🏳️ Rodada de forca encerrada. A palavra era *${jogo.palavra}*. 🌊` }, { quoted: msg });
            }

            // ── JOGO DA VELHA ──────────────────────────────────────
            case 'jogodavelha': {
                const adversario = obterAlvo(msg);
                if (!adversario) return sock.sendMessage(from, { text: "❌ Marque ou responda quem você quer desafiar! Ex: `!jogodavelha @membro`" }, { quoted: msg });
                if (adversario === sender) return sock.sendMessage(from, { text: "🥴 Jogar sozinho contra si mesmo não tem muita graça!" }, { quoted: msg });

                const pendentesVelha = obterDesafiosPendentes(from);
                if (pendentesVelha.some(d => d.tipo === 'velha' && d.desafiante === sender && d.desafiado === adversario)) {
                    return sock.sendMessage(from, { text: "❌ Você já desafiou essa pessoa pro jogo da velha — espere a resposta ou cancele com *!desistirvelha*." }, { quoted: msg });
                }
                pendentesVelha.push({ tipo: 'velha', desafiante: sender, desafiado: adversario, criadoEm: Date.now() });

                return sock.sendMessage(from, {
                    text: `❌⭕ *DESAFIO DO JOGO DA VELHA!*\n@${adversario.split('@')[0]}, você foi desafiado por @${sender.split('@')[0]}!\n\nDigite *!aceitarvelha* para aceitar (ou ignore e o desafio expira sozinho). Se já tiver outro jogo rolando no grupo na hora de aceitar, é só tentar de novo depois que ele acabar.`,
                    mentions: [sender, adversario]
                }, { quoted: msg });
            }

            case 'aceitarvelha': {
                const pendentesVelha = obterDesafiosPendentes(from);
                const meusDesafiosVelha = pendentesVelha.filter(d => d.tipo === 'velha' && d.desafiado === sender);

                if (meusDesafiosVelha.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum desafio de jogo da velha pendente para você." }, { quoted: msg });
                }

                let desafioVelhaEscolhido = meusDesafiosVelha[0];
                if (meusDesafiosVelha.length > 1) {
                    const alvoEscolhido = obterAlvo(msg);
                    if (!alvoEscolhido) {
                        const nomes = meusDesafiosVelha.map(d => `@${d.desafiante.split('@')[0]}`).join(', ');
                        return sock.sendMessage(from, { text: `❌ Você tem mais de um desafio de jogo da velha pendente (${nomes}). Marque quem quer aceitar: \`!aceitarvelha @pessoa\`.`, mentions: meusDesafiosVelha.map(d => d.desafiante) }, { quoted: msg });
                    }
                    const encontrado = meusDesafiosVelha.find(d => d.desafiante === alvoEscolhido);
                    if (!encontrado) return sock.sendMessage(from, { text: "❌ Você não tem desafio de jogo da velha pendente com essa pessoa." }, { quoted: msg });
                    desafioVelhaEscolhido = encontrado;
                }

                const jogoExistenteVelha = obterJogoAtivo(from);
                if (jogoExistenteVelha) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistenteVelha.tipo] || jogoExistenteVelha.tipo}* rolando neste grupo. Seu desafio continua pendente — use *!aceitarvelha* de novo assim que esse jogo terminar!` }, { quoted: msg });
                }

                pendentesVelha.splice(pendentesVelha.indexOf(desafioVelhaEscolhido), 1);

                const jogo = {
                    tipo: 'velha', desafiante: desafioVelhaEscolhido.desafiante, desafiado: sender,
                    aceito: true, tabuleiro: Array(9).fill(null), vez: desafioVelhaEscolhido.desafiante,
                    ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `✅ Desafio aceito! @${jogo.desafiante.split('@')[0]} é ❌ e @${jogo.desafiado.split('@')[0]} é ⭕.\n\n${renderizarVelha(jogo.tabuleiro)}\n\nVez de @${jogo.vez.split('@')[0]} (❌). Use *!jogar [1-9]*.`,
                    mentions: [jogo.desafiante, jogo.desafiado]
                }, { quoted: msg });
            }

            case 'jogar': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'velha') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum jogo da velha ativo. Use *!jogodavelha @membro* para desafiar alguém!" }, { quoted: msg });
                }
                if (!jogo.aceito) {
                    return sock.sendMessage(from, { text: "❌ O desafio ainda não foi aceito. Use *!aceitarvelha* primeiro!" }, { quoted: msg });
                }
                if (sender !== jogo.desafiante && sender !== jogo.desafiado) {
                    return sock.sendMessage(from, { text: "❌ Esse jogo não é seu — espere sua vez de desafiar alguém!" }, { quoted: msg });
                }
                if (sender !== jogo.vez) {
                    return sock.sendMessage(from, { text: `❌ Calma! Agora é a vez de @${jogo.vez.split('@')[0]}.`, mentions: [jogo.vez] }, { quoted: msg });
                }

                const posicao = parseInt(args[0], 10);
                if (isNaN(posicao) || posicao < 1 || posicao > 9) {
                    return sock.sendMessage(from, { text: "❌ Escolha uma posição de 1 a 9. Ex: `!jogar 5`" }, { quoted: msg });
                }
                if (jogo.tabuleiro[posicao - 1]) {
                    return sock.sendMessage(from, { text: "❌ Essa posição já está ocupada! Escolha outra." }, { quoted: msg });
                }

                const simbolo = sender === jogo.desafiante ? '❌' : '⭕';
                jogo.tabuleiro[posicao - 1] = simbolo;
                tocarAtividade(jogo);

                const vencedor = verificarVencedorVelha(jogo.tabuleiro);
                if (vencedor) {
                    const u = garantirUsuario(db, sender);
                    u.golds = (u.golds || 0) + RECOMPENSA_VELHA;
                    salvarDB(db);
                    jogosAtivos.delete(from);
                    return enviarComMidiaOpcional(sock, from, 'vitoria-velha',
                        `🎉 *JOGO DA VELHA VENCIDO!*\n\n${renderizarVelha(jogo.tabuleiro)}\n\n@${sender.split('@')[0]} venceu! +${RECOMPENSA_VELHA} 🪙!`,
                        { quoted: msg, mentions: [sender] });
                }

                if (jogo.tabuleiro.every(c => c)) {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: `🤝 *EMPATE!*\n\n${renderizarVelha(jogo.tabuleiro)}\n\nNinguém venceu dessa vez. 🌊` }, { quoted: msg });
                }

                jogo.vez = sender === jogo.desafiante ? jogo.desafiado : jogo.desafiante;
                return sock.sendMessage(from, {
                    text: `${renderizarVelha(jogo.tabuleiro)}\n\nVez de @${jogo.vez.split('@')[0]} (${jogo.vez === jogo.desafiante ? '❌' : '⭕'}). Use *!jogar [1-9]*.`,
                    mentions: [jogo.vez]
                }, { quoted: msg });
            }

            case 'desistirvelha': {
                const jogo = obterJogoAtivo(from);
                const souParticipanteAtivoVelha = !!jogo && jogo.tipo === 'velha' && (sender === jogo.desafiante || sender === jogo.desafiado);
                const souAdminVelha = await ehAdmin(sock, from, sender, senderBruto);

                if (jogo && jogo.tipo === 'velha' && (souParticipanteAtivoVelha || souAdminVelha)) {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: `🏳️ Jogo da velha encerrado${souParticipanteAtivoVelha ? ' por desistência' : ' por um administrador'}. 🌊` }, { quoted: msg });
                }

                // Não sou participante do jogo ativo (se houver um) — talvez eu tenha um desafio pendente próprio
                const pendentesVelha = obterDesafiosPendentes(from);
                const idxMeuDesafio = pendentesVelha.findIndex(d => d.tipo === 'velha' && (d.desafiante === sender || d.desafiado === sender));
                if (idxMeuDesafio !== -1) {
                    pendentesVelha.splice(idxMeuDesafio, 1);
                    return sock.sendMessage(from, { text: "🚫 Desafio de jogo da velha cancelado." }, { quoted: msg });
                }

                // Nada meu pra cancelar — admin ainda pode limpar desafios pendentes de outras pessoas
                const desafiosVelhaRestantes = pendentesVelha.filter(d => d.tipo === 'velha');
                if (desafiosVelhaRestantes.length > 0 && souAdminVelha) {
                    desafiosPendentes.set(from, pendentesVelha.filter(d => d.tipo !== 'velha'));
                    return sock.sendMessage(from, { text: `🚫 ${desafiosVelhaRestantes.length} desafio(s) de jogo da velha pendente(s) cancelado(s) por um administrador.` }, { quoted: msg });
                }

                if (jogo && jogo.tipo === 'velha') {
                    return sock.sendMessage(from, { text: "❌ Esse jogo não é seu." }, { quoted: msg });
                }
                return sock.sendMessage(from, { text: "❌ Não há nenhum jogo ou desafio de jogo da velha ativo para cancelar." }, { quoted: msg });
            }

            // ── PEDRA, PAPEL E TESOURA (vs bot) ────────────────────
            case 'ppt': {
                const escolhaJogador = normalizar(args[0] || '');
                if (!OPCOES_PPT.includes(escolhaJogador)) {
                    return sock.sendMessage(from, { text: "❌ Escolha `pedra`, `papel` ou `tesoura`. Ex: `!ppt pedra`" }, { quoted: msg });
                }

                const escolhaBot = OPCOES_PPT[Math.floor(Math.random() * OPCOES_PPT.length)];
                const placar = `Você: ${EMOJI_PPT[escolhaJogador]} ${escolhaJogador} vs Bot: ${EMOJI_PPT[escolhaBot]} ${escolhaBot}`;

                if (escolhaJogador === escolhaBot) {
                    return sock.sendMessage(from, { text: `🤝 *EMPATE!*\n${placar}` }, { quoted: msg });
                }

                if (pptVence(escolhaJogador, escolhaBot)) {
                    const u = garantirUsuario(db, sender);
                    u.golds = (u.golds || 0) + RECOMPENSA_PPT;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🎉 *VOCÊ VENCEU!*\n${placar}\n+${RECOMPENSA_PPT} 🪙!` }, { quoted: msg });
                }

                return sock.sendMessage(from, { text: `💧 *O BOT VENCEU!*\n${placar}\nTenta de novo!` }, { quoted: msg });
            }

            // ── VERDADE OU DESAFIO ──────────────────────────────────
            case 'verdadeoudesafio': {
                const alvo = obterAlvo(msg) || sender;
                const ehVerdade = Math.random() < 0.5;
                const lista = ehVerdade ? LISTA_VERDADES : LISTA_DESAFIOS;
                const prompt = lista[Math.floor(Math.random() * lista.length)];

                const u = garantirUsuario(db, alvo);
                u.golds = (u.golds || 0) + RECOMPENSA_VOD;
                salvarDB(db);

                const rotulo = ehVerdade ? '🗣️ VERDADE' : '🔥 DESAFIO';
                return sock.sendMessage(from, {
                    text: `${rotulo}\n@${alvo.split('@')[0]}: ${prompt}\n\n+${RECOMPENSA_VOD} 🪙 só por participar! 🌊`,
                    mentions: [alvo]
                }, { quoted: msg });
            }

            // ── EMOJI CHARADA ────────────────────────────────────────
            case 'emojicharada': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const escolhida = BANCO_CHARADAS[Math.floor(Math.random() * BANCO_CHARADAS.length)];
                const jogo = {
                    tipo: 'charada',
                    respostas: escolhida.respostas.map(normalizar),
                    respostaExibida: escolhida.exibida,
                    recompensa: RECOMPENSA_CHARADA[escolhida.dificuldade] || 20,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, { text: `🎭 *EMOJI CHARADA!*\n\n${escolhida.emojis}\n\nAdivinhe o que é! Só digitar a resposta no chat (sem !). Vale +${jogo.recompensa} 🪙.` }, { quoted: msg });
            }

            // ── QUIZ ─────────────────────────────────────────────────
            case 'quiz': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const escolhida = BANCO_QUIZ[Math.floor(Math.random() * BANCO_QUIZ.length)];
                const jogo = {
                    tipo: 'quiz',
                    respostas: escolhida.respostas.map(normalizar),
                    respostaExibida: escolhida.exibida,
                    recompensa: RECOMPENSA_QUIZ[escolhida.dificuldade] || 20,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, { text: `🧠 *QUIZ!*\n\n${escolhida.pergunta}\n\nSó digitar a resposta no chat (sem !). Vale +${jogo.recompensa} 🪙.` }, { quoted: msg });
            }

            // ── PALAVRA ENCADEADA ────────────────────────────────────
            case 'palavraencadeada': {
                const jogoExistente = obterJogoAtivo(from);

                if (jogoExistente && jogoExistente.tipo === 'encadeada') {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: `⛓️ *PALAVRA ENCADEADA ENCERRADA!* A corrente teve ${jogoExistente.totalPalavras} palavra(s). Última: *${jogoExistente.ultimaPalavraExibida}*. 🌊` }, { quoted: msg });
                }
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const palavraInicial = PALAVRAS_INICIO_ENCADEADA[Math.floor(Math.random() * PALAVRAS_INICIO_ENCADEADA.length)];
                const jogo = {
                    tipo: 'encadeada',
                    ultimaPalavraExibida: palavraInicial,
                    palavrasUsadas: new Set([normalizar(palavraInicial)]),
                    totalPalavras: 1,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                const proximaLetra = normalizar(palavraInicial).slice(-1).toUpperCase();
                return sock.sendMessage(from, {
                    text: `⛓️ *PALAVRA ENCADEADA INICIADA!*\n\nPalavra inicial: *${palavraInicial}*\nA próxima precisa começar com *${proximaLetra}*.\n\nManda só a palavra no chat (sem !) pra continuar a corrente. +${RECOMPENSA_ENCADEADA} 🪙 por palavra válida. Digite *!palavraencadeada* de novo para encerrar.`
                }, { quoted: msg });
            }

            // ── SORTEIO ──────────────────────────────────────────────
            case 'sorteio': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const premioTexto = args.join(' ').trim() || 'Golds bônus';
                const jogo = {
                    tipo: 'sorteio', premio: premioTexto, participantes: new Set(),
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `🎁 *SORTEIO INICIADO!*\nPrêmio: *${premioTexto}*\n\nDigite *!participar* pra entrar na lista. Quando quiser encerrar e sortear, @${sender.split('@')[0]} usa *!sortear*.`,
                    mentions: [sender]
                }, { quoted: msg });
            }

            case 'participar': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'sorteio') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum sorteio ativo agora. Use *!sorteio* para começar um!" }, { quoted: msg });
                }
                if (jogo.participantes.has(sender)) {
                    return sock.sendMessage(from, { text: "❌ Você já está participando desse sorteio!" }, { quoted: msg });
                }
                jogo.participantes.add(sender);
                tocarAtividade(jogo);
                return sock.sendMessage(from, { text: `✅ @${sender.split('@')[0]} entrou no sorteio! (${jogo.participantes.size} participante(s) até agora)`, mentions: [sender] }, { quoted: msg });
            }

            case 'sortear': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'sorteio') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum sorteio ativo para sortear." }, { quoted: msg });
                }
                if (sender !== jogo.iniciadoPor) {
                    return sock.sendMessage(from, { text: `❌ Só quem iniciou o sorteio (@${jogo.iniciadoPor.split('@')[0]}) pode sortear o vencedor!`, mentions: [jogo.iniciadoPor] }, { quoted: msg });
                }
                if (jogo.participantes.size === 0) {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: "📉 Ninguém participou desse sorteio. Encerrado sem vencedor." }, { quoted: msg });
                }

                const listaParticipantes = Array.from(jogo.participantes);
                const vencedor = listaParticipantes[Math.floor(Math.random() * listaParticipantes.length)];
                const recompensaSorteio = 50;
                const uVencedor = garantirUsuario(db, vencedor);
                uVencedor.golds = (uVencedor.golds || 0) + recompensaSorteio;
                salvarDB(db);
                jogosAtivos.delete(from);

                return enviarComMidiaOpcional(sock, from, 'sorteio',
                    `🎉 *SORTEIO ENCERRADO!*\nPrêmio: *${jogo.premio}*\n🏆 Vencedor(a): @${vencedor.split('@')[0]}! +${recompensaSorteio} 🪙!`,
                    { quoted: msg, mentions: [vencedor] });
            }

            // ── ENQUETE ──────────────────────────────────────────────
            // Usa a enquete NATIVA do WhatsApp (suportada pelo Baileys via
            // `poll`), não uma simulação em texto — o próprio WhatsApp cuida
            // da contagem de votos, então não precisa de estado nenhum aqui.
            case 'enquete': {
                const partesEnquete = args.join(' ').split('|').map(p => p.trim()).filter(Boolean);
                if (partesEnquete.length < 3) {
                    return sock.sendMessage(from, { text: "❌ Use: `!enquete Pergunta | Opção 1 | Opção 2 | ...` (pelo menos 2 opções, separadas por |)." }, { quoted: msg });
                }

                const [perguntaEnquete, ...opcoesEnquete] = partesEnquete;
                if (opcoesEnquete.length > 12) {
                    return sock.sendMessage(from, { text: "❌ O WhatsApp só permite até 12 opções por enquete." }, { quoted: msg });
                }

                try {
                    await sock.sendMessage(from, { poll: { name: perguntaEnquete, values: opcoesEnquete, selectableCount: 1 } }, { quoted: msg });
                } catch (erro) {
                    console.error('[ENQUETE] Erro:', erro.message || erro);
                    await sock.sendMessage(from, { text: "❌ Não consegui criar a enquete. Confirme se a versão do Baileys em uso suporta enquetes nativas." }, { quoted: msg });
                }
                break;
            }

            // ── ROLETA (aposta de sorte solo) ─────────────────────────
            // Nota de design: implementado como um jogo de sorte puro (gira
            // uma roleta, 1 chance em 6 de perder a aposta) — sem qualquer
            // tema de arma ou violência, só a mecânica de risco 1-em-6 que dá
            // nome ao comando. Instantâneo, não usa o slot de jogo ativo.
            case 'roletarussa': {
                const apostaRoleta = parseInt(args[0], 10);
                if (isNaN(apostaRoleta) || apostaRoleta <= 0) {
                    return sock.sendMessage(from, { text: "❌ Defina uma aposta válida. Ex: `!roletarussa 50`" }, { quoted: msg });
                }

                const uRoleta = garantirUsuario(db, sender);
                if (uRoleta.golds < apostaRoleta) {
                    return sock.sendMessage(from, { text: "❌ Você não tem Golds suficientes para essa aposta!" }, { quoted: msg });
                }

                const perdeu = Math.floor(Math.random() * 6) === 0; // 1 chance em 6

                if (perdeu) {
                    uRoleta.golds -= apostaRoleta;
                    salvarDB(db);
                    return sock.sendMessage(from, { text: `🎡 *A ROLETA GIROU...* Dessa vez a sorte não ajudou, @${sender.split('@')[0]}! Você perdeu *${apostaRoleta}* 🪙. 💧`, mentions: [sender] }, { quoted: msg });
                }

                const ganhoRoleta = Math.round(apostaRoleta * 0.3);
                uRoleta.golds += ganhoRoleta;
                salvarDB(db);
                return enviarComMidiaOpcional(sock, from, 'roletarussa',
                    `🎡 *A ROLETA GIROU...* A sorte sorriu pra você, @${sender.split('@')[0]}! +${ganhoRoleta} 🪙!`,
                    { quoted: msg, mentions: [sender] });
            }

            // ── SIMON (sequência de cores) ────────────────────────────
            case 'simon': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const sequenciaSimon = gerarSequenciaSimon(3);
                const jogo = {
                    tipo: 'simon', sequencia: sequenciaSimon, rodada: 1,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `🎯 *SIMON — Rodada 1!*\nMemorize a sequência e responda com os nomes das cores, na ordem e separados por espaço:\n\n${renderizarSequenciaSimon(sequenciaSimon)}\n\n💡 Ex: vermelho verde azul`
                }, { quoted: msg });
            }

            // ── ADIVINHE O NÚMERO ──────────────────────────────────────
            case 'adivinhanumero': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const numeroSecreto = Math.floor(Math.random() * 100) + 1;
                const jogo = {
                    tipo: 'adivinhanumero', numeroSecreto, tentativas: 0,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `🔢 *ADIVINHE O NÚMERO!*\nPensei em um número entre *1* e *100*. Manda só o número no chat — quanto menos tentativas até acertar, mais 🪙!`
                }, { quoted: msg });
            }

            // ── ANAGRAMA ────────────────────────────────────────────────
            case 'anagrama': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const palavraAnagrama = BANCO_ANAGRAMA[Math.floor(Math.random() * BANCO_ANAGRAMA.length)];
                const jogo = {
                    tipo: 'anagrama', palavra: palavraAnagrama,
                    embaralhada: embaralharPalavra(palavraAnagrama),
                    recompensa: calcularRecompensaAnagrama(palavraAnagrama),
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `🔀 *ANAGRAMA!*\nDesembaralhe: *${jogo.embaralhada.toUpperCase()}*\n(${palavraAnagrama.length} letras) — só digitar a palavra no chat (sem !). Vale +${jogo.recompensa} 🪙.`
                }, { quoted: msg });
            }

            // ── CORRIDA DE DIGITAÇÃO ─────────────────────────────────────
            case 'digitacao': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const fraseDigitacao = FRASES_DIGITACAO[Math.floor(Math.random() * FRASES_DIGITACAO.length)];
                const jogo = {
                    tipo: 'digitacao', frase: fraseDigitacao, iniciadoEm: Date.now(),
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `⌨️ *CORRIDA DE DIGITAÇÃO!*\nDigite exatamente a frase abaixo — vale só quem acertar primeiro, quanto mais rápido mais 🪙:\n\n"${fraseDigitacao}"`
                }, { quoted: msg });
            }

            // ── 30 SEGUNDOS ────────────────────────────────────────────
            case '30s': {
                const jogoExistente = obterJogoAtivo(from);
                if (jogoExistente) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistente.tipo] || jogoExistente.tipo}* rolando neste grupo. Espere terminar!` }, { quoted: msg });
                }

                const jogo = {
                    tipo: '30s', fase: 'lobby',
                    times: { vermelha: new Set(), azul: new Set() },
                    placar: { vermelha: 0, azul: 0 },
                    ordemRodadas: gerarOrdemRodadas30s(), indiceRodadaAtual: 0,
                    timeDaVez: null, palavraAtual: null, palavrasUsadas: new Set(),
                    acertosRodada: 0, timeoutRodada: null,
                    db, salvarDB,
                    iniciadoPor: sender, ultimaAtividade: Date.now()
                };
                jogo.timeDaVez = jogo.ordemRodadas[0];
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `🎮 *30 SEGUNDOS!*\nEscolham seus times digitando *!vermelha* ou *!azul*. Quando os dois tiverem pelo menos 1 jogador, alguém digita *!iniciar30s* pra começar!`
                }, { quoted: msg });
            }

            // ── ENTRAR NO TIME ──────────────────────────────────────────
            case 'vermelha':
            case 'azul': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== '30s') {
                    return sock.sendMessage(from, { text: `❌ Não tem um *30 Segundos* esperando jogadores agora. Use *!30s* pra começar um!` }, { quoted: msg });
                }
                if (jogo.fase !== 'lobby') {
                    return sock.sendMessage(from, { text: `❌ Esse jogo já começou — não dá mais pra trocar de time.` }, { quoted: msg });
                }

                const timeEscolhido = comando; // 'vermelha' ou 'azul'
                jogo.times.vermelha.delete(sender);
                jogo.times.azul.delete(sender);
                jogo.times[timeEscolhido].add(sender);
                tocarAtividade(jogo);

                return sock.sendMessage(from, {
                    text: `${emojiTime30s(timeEscolhido)} @${sender.split('@')[0]} entrou no time *${timeEscolhido}*!\n\n🔴 Vermelha: ${jogo.times.vermelha.size} jogador(es)\n🔵 Azul: ${jogo.times.azul.size} jogador(es)`
                }, { quoted: msg, mentions: [sender] });
            }

            // ── INICIAR RODADA ───────────────────────────────────────────
            case 'iniciar30s': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== '30s') {
                    return sock.sendMessage(from, { text: `❌ Não tem um *30 Segundos* esperando pra começar. Use *!30s* primeiro!` }, { quoted: msg });
                }
                if (jogo.fase === 'rodada') {
                    return sock.sendMessage(from, { text: `❌ A rodada já está rolando!` }, { quoted: msg });
                }
                if (jogo.times.vermelha.size === 0 || jogo.times.azul.size === 0) {
                    return sock.sendMessage(from, { text: `❌ Os dois times precisam de pelo menos 1 jogador. Use *!vermelha* ou *!azul* pra entrar!` }, { quoted: msg });
                }

                await iniciarRodada30s(sock, from, jogo);
                return;
            }

            // ── PULAR PALAVRA ─────────────────────────────────────────────
            case 'pular': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== '30s' || jogo.fase !== 'rodada') {
                    return sock.sendMessage(from, { text: `❌ Não tem uma rodada de *30 Segundos* rolando agora.` }, { quoted: msg });
                }
                if (!jogo.times[jogo.timeDaVez].has(sender)) {
                    return sock.sendMessage(from, { text: `❌ Só quem está no time da vez (${jogo.timeDaVez}) pode pular a palavra!` }, { quoted: msg });
                }

                jogo.palavrasUsadas.add(jogo.palavraAtual);
                jogo.palavraAtual = sortearPalavra30s(jogo.palavrasUsadas);
                tocarAtividade(jogo);

                return sock.sendMessage(from, { text: `⏭️ Pulou! Nova palavra:\n\n*${jogo.palavraAtual.toUpperCase()}*` }, { quoted: msg });
            }

            // ── PLACAR ────────────────────────────────────────────────────
            case 'placar30s': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== '30s') {
                    return sock.sendMessage(from, { text: `❌ Não tem nenhum *30 Segundos* rolando neste grupo agora.` }, { quoted: msg });
                }

                const statusFase = jogo.fase === 'lobby' ? 'escolhendo times' : jogo.fase === 'rodada' ? `rodada do time ${jogo.timeDaVez} rolando` : 'entre rodadas';
                return sock.sendMessage(from, {
                    text: `📊 *PLACAR — 30 SEGUNDOS*\n🔴 Vermelha: ${jogo.placar.vermelha}\n🔵 Azul: ${jogo.placar.azul}\n\nFase atual: ${statusFase}`
                }, { quoted: msg });
            }

            // ── ENCERRAR ──────────────────────────────────────────────────
            case 'encerrar30s': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== '30s') {
                    return sock.sendMessage(from, { text: `❌ Não tem nenhum *30 Segundos* rolando neste grupo agora.` }, { quoted: msg });
                }

                if (jogo.timeoutRodada) clearTimeout(jogo.timeoutRodada);
                jogosAtivos.delete(from);

                return sock.sendMessage(from, { text: `🏳️ *30 Segundos* encerrado antes da hora. Placar final: 🔴 ${jogo.placar.vermelha} x ${jogo.placar.azul} 🔵. Não rolou bônus de vitória.` }, { quoted: msg });
            }

            // ── BATALHA NAVAL ─────────────────────────────────────────────
            case 'batalhanaval': {
                const adversarioBatalha = obterAlvo(msg);
                if (!adversarioBatalha) return sock.sendMessage(from, { text: "❌ Marque ou responda quem você quer desafiar! Ex: `!batalhanaval @membro`" }, { quoted: msg });
                if (adversarioBatalha === sender) return sock.sendMessage(from, { text: "🥴 Jogar sozinho contra si mesmo não tem muita graça!" }, { quoted: msg });

                const pendentesBatalha = obterDesafiosPendentes(from);
                if (pendentesBatalha.some(d => d.tipo === 'batalhanaval' && d.desafiante === sender && d.desafiado === adversarioBatalha)) {
                    return sock.sendMessage(from, { text: "❌ Você já desafiou essa pessoa pra Batalha Naval — espere a resposta ou cancele com *!desistirbatalha*." }, { quoted: msg });
                }
                pendentesBatalha.push({ tipo: 'batalhanaval', desafiante: sender, desafiado: adversarioBatalha, criadoEm: Date.now() });

                return sock.sendMessage(from, {
                    text: `🚢 *DESAFIO DE BATALHA NAVAL!*\n@${adversarioBatalha.split('@')[0]}, você foi desafiado por @${sender.split('@')[0]}!\n\nCada um recebe uma frota escondida (🛳️ Porta-Aviões, 🚤 Cruzador, 🤿 Submarino) num tabuleiro ${TAMANHO_TABULEIRO_BATALHA}x${TAMANHO_TABULEIRO_BATALHA}. Digite *!aceitarbatalha* para aceitar. Se já tiver outro jogo rolando no grupo na hora de aceitar, é só tentar de novo depois que ele acabar.`,
                    mentions: [sender, adversarioBatalha]
                }, { quoted: msg });
            }

            case 'aceitarbatalha': {
                const pendentesBatalha = obterDesafiosPendentes(from);
                const meusDesafiosBatalha = pendentesBatalha.filter(d => d.tipo === 'batalhanaval' && d.desafiado === sender);

                if (meusDesafiosBatalha.length === 0) {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum desafio de batalha naval pendente para você." }, { quoted: msg });
                }

                let desafioBatalhaEscolhido = meusDesafiosBatalha[0];
                if (meusDesafiosBatalha.length > 1) {
                    const alvoEscolhido = obterAlvo(msg);
                    if (!alvoEscolhido) {
                        const nomes = meusDesafiosBatalha.map(d => `@${d.desafiante.split('@')[0]}`).join(', ');
                        return sock.sendMessage(from, { text: `❌ Você tem mais de um desafio de batalha naval pendente (${nomes}). Marque quem quer aceitar: \`!aceitarbatalha @pessoa\`.`, mentions: meusDesafiosBatalha.map(d => d.desafiante) }, { quoted: msg });
                    }
                    const encontrado = meusDesafiosBatalha.find(d => d.desafiante === alvoEscolhido);
                    if (!encontrado) return sock.sendMessage(from, { text: "❌ Você não tem desafio de batalha naval pendente com essa pessoa." }, { quoted: msg });
                    desafioBatalhaEscolhido = encontrado;
                }

                const jogoExistenteBatalha = obterJogoAtivo(from);
                if (jogoExistenteBatalha) {
                    return sock.sendMessage(from, { text: `❌ Já tem um jogo de *${NOME_JOGO[jogoExistenteBatalha.tipo] || jogoExistenteBatalha.tipo}* rolando neste grupo. Seu desafio continua pendente — use *!aceitarbatalha* de novo assim que esse jogo terminar!` }, { quoted: msg });
                }

                pendentesBatalha.splice(pendentesBatalha.indexOf(desafioBatalhaEscolhido), 1);

                const jogo = {
                    tipo: 'batalhanaval', desafiante: desafioBatalhaEscolhido.desafiante, desafiado: sender,
                    aceito: true, vez: desafioBatalhaEscolhido.desafiante,
                    frotas: {
                        [desafioBatalhaEscolhido.desafiante]: posicionarFrota(),
                        [sender]: posicionarFrota()
                    },
                    ultimaAtividade: Date.now()
                };
                jogosAtivos.set(from, jogo);

                return sock.sendMessage(from, {
                    text: `✅ Desafio aceito! As duas frotas foram posicionadas em segredo.\n\nVez de @${jogo.vez.split('@')[0]}. Mire o tabuleiro de @${jogo.desafiado.split('@')[0]} com *!atirar [coordenada]*. Ex: \`!atirar C4\`\n\n${renderizarRadarBatalha(jogo.frotas[jogo.desafiado])}`,
                    mentions: [jogo.desafiante, jogo.desafiado]
                }, { quoted: msg });
            }

            case 'atirar': {
                const jogo = obterJogoAtivo(from);
                if (!jogo || jogo.tipo !== 'batalhanaval') {
                    return sock.sendMessage(from, { text: "❌ Não há nenhuma batalha naval ativa. Use *!batalhanaval @membro* para desafiar alguém!" }, { quoted: msg });
                }
                if (!jogo.aceito) {
                    return sock.sendMessage(from, { text: "❌ O desafio ainda não foi aceito. Use *!aceitarbatalha* primeiro!" }, { quoted: msg });
                }
                if (sender !== jogo.desafiante && sender !== jogo.desafiado) {
                    return sock.sendMessage(from, { text: "❌ Essa batalha não é sua — desafie alguém com *!batalhanaval @membro*!" }, { quoted: msg });
                }
                if (sender !== jogo.vez) {
                    return sock.sendMessage(from, { text: `❌ Calma! Agora é a vez de @${jogo.vez.split('@')[0]}.`, mentions: [jogo.vez] }, { quoted: msg });
                }

                const coordBatalha = (args[0] || '').trim().toUpperCase().replace(/\s+/g, '');
                if (!/^[A-F][1-6]$/.test(coordBatalha)) {
                    return sock.sendMessage(from, { text: "❌ Coordenada inválida. Use letra (A-F) + número (1-6). Ex: `!atirar C4`" }, { quoted: msg });
                }

                const alvoBatalha = sender === jogo.desafiante ? jogo.desafiado : jogo.desafiante;
                const frotaAlvo = jogo.frotas[alvoBatalha];

                if (frotaAlvo.tirosRecebidos.has(coordBatalha)) {
                    return sock.sendMessage(from, { text: `❌ Você já atirou em *${coordBatalha}*. Escolha outra coordenada!` }, { quoted: msg });
                }

                frotaAlvo.tirosRecebidos.add(coordBatalha);
                tocarAtividade(jogo);

                const acertouBatalha = frotaAlvo.ocupadas.has(coordBatalha);
                let navioAfundadoAgora = null;
                if (acertouBatalha) {
                    for (const navio of frotaAlvo.navios) {
                        if (!navio.afundado && navio.celulas.every(c => frotaAlvo.tirosRecebidos.has(c))) {
                            navio.afundado = true;
                            navioAfundadoAgora = navio;
                            break;
                        }
                    }
                }

                if (frotaAlvo.navios.every(n => n.afundado)) {
                    const u = garantirUsuario(db, sender);
                    u.golds = (u.golds || 0) + RECOMPENSA_BATALHA;
                    salvarDB(db);
                    jogosAtivos.delete(from);

                    return enviarComMidiaOpcional(sock, from, 'vitoria-batalhanaval',
                        `💥 *${coordBatalha}: ACERTOU E AFUNDOU O ÚLTIMO NAVIO!*\n\n${renderizarRadarBatalha(frotaAlvo)}\n\n🏆 @${sender.split('@')[0]} venceu a Batalha Naval — a frota de @${alvoBatalha.split('@')[0]} foi pro fundo! +${RECOMPENSA_BATALHA} 🪙!`,
                        { quoted: msg, mentions: [sender, alvoBatalha] });
                }

                jogo.vez = alvoBatalha;
                let textoResultadoBatalha;
                if (navioAfundadoAgora) {
                    textoResultadoBatalha = `💥 *${coordBatalha}: ACERTOU E AFUNDOU O ${navioAfundadoAgora.nome.toUpperCase()}!*`;
                } else if (acertouBatalha) {
                    textoResultadoBatalha = `💥 *${coordBatalha}: ACERTOU!*`;
                } else {
                    textoResultadoBatalha = `🌊 *${coordBatalha}: ÁGUA!*`;
                }

                return sock.sendMessage(from, {
                    text: `${textoResultadoBatalha}\n\n${renderizarRadarBatalha(frotaAlvo)}\n\nVez de @${jogo.vez.split('@')[0]}. Mire o tabuleiro de @${sender.split('@')[0]} agora! Use *!atirar [coordenada]*.`,
                    mentions: [jogo.vez, sender]
                }, { quoted: msg });
            }

            case 'desistirbatalha': {
                const jogo = obterJogoAtivo(from);
                const souParticipanteAtivoBatalha = !!jogo && jogo.tipo === 'batalhanaval' && (sender === jogo.desafiante || sender === jogo.desafiado);
                const souAdminBatalha = await ehAdmin(sock, from, sender, senderBruto);

                if (jogo && jogo.tipo === 'batalhanaval' && (souParticipanteAtivoBatalha || souAdminBatalha)) {
                    jogosAtivos.delete(from);
                    return sock.sendMessage(from, { text: `🏳️ Batalha naval encerrada${souParticipanteAtivoBatalha ? ' por desistência' : ' por um administrador'}. As frotas afundam nas sombras... 🌊` }, { quoted: msg });
                }

                const pendentesBatalha = obterDesafiosPendentes(from);
                const idxMeuDesafio = pendentesBatalha.findIndex(d => d.tipo === 'batalhanaval' && (d.desafiante === sender || d.desafiado === sender));
                if (idxMeuDesafio !== -1) {
                    pendentesBatalha.splice(idxMeuDesafio, 1);
                    return sock.sendMessage(from, { text: "🚫 Desafio de batalha naval cancelado." }, { quoted: msg });
                }

                const desafiosBatalhaRestantes = pendentesBatalha.filter(d => d.tipo === 'batalhanaval');
                if (desafiosBatalhaRestantes.length > 0 && souAdminBatalha) {
                    desafiosPendentes.set(from, pendentesBatalha.filter(d => d.tipo !== 'batalhanaval'));
                    return sock.sendMessage(from, { text: `🚫 ${desafiosBatalhaRestantes.length} desafio(s) de batalha naval pendente(s) cancelado(s) por um administrador.` }, { quoted: msg });
                }

                if (jogo && jogo.tipo === 'batalhanaval') {
                    return sock.sendMessage(from, { text: "❌ Essa batalha não é sua." }, { quoted: msg });
                }
                return sock.sendMessage(from, { text: "❌ Não há nenhuma batalha naval ativa ou pendente para cancelar." }, { quoted: msg });
            }

            // ── CANCELAR JOGO (universal, qualquer tipo) ────────────────
            // Quem iniciou o jogo (ou desafiante/desafiado, no caso de Velha
            // e Batalha Naval) pode cancelar a qualquer momento. Um admin do
            // grupo pode cancelar QUALQUER jogo em andamento, mesmo sem ter
            // participado — pra não depender de esperar expirar.
            case 'cancelarjogo': {
                const jogo = obterJogoAtivo(from);
                if (!jogo) {
                    return sock.sendMessage(from, { text: "❌ Não há nenhum jogo ativo neste grupo agora." }, { quoted: msg });
                }

                const ehDono = jogo.iniciadoPor === sender;
                const ehParticipanteDesafio = sender === jogo.desafiante || sender === jogo.desafiado;

                if (!ehDono && !ehParticipanteDesafio && !(await ehAdmin(sock, from, sender, senderBruto))) {
                    return sock.sendMessage(from, { text: "❌ Só quem iniciou esse jogo (ou um admin do grupo) pode cancelar." }, { quoted: msg });
                }

                if (jogo.timeoutRodada) clearTimeout(jogo.timeoutRodada); // limpa o timer do 30 Segundos, se houver
                const nomeJogoCancelado = NOME_JOGO[jogo.tipo] || jogo.tipo;
                jogosAtivos.delete(from);

                const porAdmin = !ehDono && !ehParticipanteDesafio;
                return sock.sendMessage(from, { text: `🛑 *${nomeJogoCancelado}* cancelado${porAdmin ? ' por um administrador' : ''}. 🌊` }, { quoted: msg });
            }

            default:
                break;
        }
    } catch (error) {
        console.error("Erro interno detectado no jogos.js: ", error);
    }
};

// Chamado pelo comandos.js em toda mensagem de grupo que NÃO é comando. Já
// cobre todo jogo de rodada que precisa de palpite em texto livre: Quiz,
// Emoji Charada, Palavra Encadeada, Simon, Adivinhe o Número, Anagrama,
// Corrida de Digitação e, desde a Entrega 11, 30 Segundos (só conta ponto
// se for a palavra certa E quem respondeu estiver no time da vez).
const verificarPalpite30s = async (sock, msg, db, salvarDB, from, sender, texto) => {
    const jogo = obterJogoAtivo(from);
    if (!jogo) return false;

    if (jogo.tipo === 'quiz' || jogo.tipo === 'charada') {
        const normalizado = normalizar(texto);
        if (!jogo.respostas.includes(normalizado)) return false;

        const u = garantirUsuario(db, sender);
        u.golds = (u.golds || 0) + jogo.recompensa;
        salvarDB(db);
        jogosAtivos.delete(from);

        const rotulo = jogo.tipo === 'quiz' ? 'QUIZ' : 'EMOJI CHARADA';
        const evento = jogo.tipo === 'quiz' ? 'vitoria-quiz' : 'vitoria-charada';
        await enviarComMidiaOpcional(sock, from, evento,
            `🎉 *${rotulo}:* @${sender.split('@')[0]} acertou! A resposta era *${jogo.respostaExibida}*. +${jogo.recompensa} 🪙!`,
            { quoted: msg, mentions: [sender] });
        return true;
    }

    if (jogo.tipo === 'encadeada') {
        const palavraBruta = (texto || '').trim();
        if (!/^\S+$/.test(palavraBruta)) return false; // só aceita uma palavra, sem espaços
        const normalizado = normalizar(palavraBruta);
        if (normalizado.length < 2) return false;

        const letraNecessaria = normalizar(jogo.ultimaPalavraExibida).slice(-1);
        if (normalizado[0] !== letraNecessaria) return false;
        if (jogo.palavrasUsadas.has(normalizado)) return false;

        jogo.palavrasUsadas.add(normalizado);
        jogo.ultimaPalavraExibida = palavraBruta;
        jogo.totalPalavras += 1;
        tocarAtividade(jogo);

        const u = garantirUsuario(db, sender);
        u.golds = (u.golds || 0) + RECOMPENSA_ENCADEADA;
        salvarDB(db);

        const novaLetra = normalizado.slice(-1).toUpperCase();
        await sock.sendMessage(from, { text: `⛓️ *${palavraBruta}* aceita! (+${RECOMPENSA_ENCADEADA} 🪙) Próxima precisa começar com *${novaLetra}*.` }, { quoted: msg });
        return true;
    }

    if (jogo.tipo === 'simon') {
        const tentativa = normalizar(texto).split(/\s+/).filter(Boolean);
        const esperado = jogo.sequencia.map(cor => cor.nome);
        if (tentativa.length !== esperado.length) return false; // não parece uma tentativa completa, ignora

        const acertou = tentativa.every((cor, i) => cor === esperado[i]);
        if (!acertou) {
            const rodadasSobrevividas = jogo.rodada - 1;
            const recompensaFinal = rodadasSobrevividas > 0 ? rodadasSobrevividas * RECOMPENSA_SIMON_POR_RODADA : 0;
            jogosAtivos.delete(from);
            if (recompensaFinal > 0) {
                const u = garantirUsuario(db, sender);
                u.golds = (u.golds || 0) + recompensaFinal;
                salvarDB(db);
            }
            await sock.sendMessage(from, {
                text: `💥 Sequência errada! O Simon parou na rodada ${jogo.rodada}.${recompensaFinal > 0 ? ` Você guarda +${recompensaFinal} 🪙 pelas rodadas anteriores!` : ''}`
            }, { quoted: msg });
            return true;
        }

        jogo.rodada += 1;
        jogo.sequencia = gerarSequenciaSimon(jogo.rodada + 2);
        tocarAtividade(jogo);
        await sock.sendMessage(from, { text: `✅ Certo! Rodada ${jogo.rodada}:\n\n${renderizarSequenciaSimon(jogo.sequencia)}` }, { quoted: msg });
        return true;
    }

    if (jogo.tipo === 'adivinhanumero') {
        const textoLimpo = (texto || '').trim();
        const palpite = parseInt(textoLimpo, 10);
        if (isNaN(palpite) || String(palpite) !== textoLimpo) return false; // não é um palpite numérico puro, ignora

        jogo.tentativas += 1;
        tocarAtividade(jogo);

        if (palpite === jogo.numeroSecreto) {
            const recompensaNumero = calcularRecompensaAdivinhaNumero(jogo.tentativas);
            const u = garantirUsuario(db, sender);
            u.golds = (u.golds || 0) + recompensaNumero;
            salvarDB(db);
            jogosAtivos.delete(from);
            await enviarComMidiaOpcional(sock, from, 'vitoria-adivinhanumero',
                `🎉 *ACERTOU!* @${sender.split('@')[0]} descobriu o número *${jogo.numeroSecreto}* em ${jogo.tentativas} tentativa(s)! +${recompensaNumero} 🪙!`,
                { quoted: msg, mentions: [sender] });
            return true;
        }

        const dica = palpite < jogo.numeroSecreto ? '📈 Maior que isso!' : '📉 Menor que isso!';
        await sock.sendMessage(from, { text: dica }, { quoted: msg });
        return true;
    }

    if (jogo.tipo === 'anagrama') {
        const normalizado = normalizar(texto);
        if (!normalizado || normalizado !== normalizar(jogo.palavra)) return false;

        const u = garantirUsuario(db, sender);
        u.golds = (u.golds || 0) + jogo.recompensa;
        salvarDB(db);
        jogosAtivos.delete(from);

        await enviarComMidiaOpcional(sock, from, 'vitoria-anagrama',
            `🎉 *ANAGRAMA:* @${sender.split('@')[0]} acertou! A palavra era *${jogo.palavra}*. +${jogo.recompensa} 🪙!`,
            { quoted: msg, mentions: [sender] });
        return true;
    }

    if (jogo.tipo === 'digitacao') {
        const normalizado = normalizar(texto).replace(/\s+/g, ' ').trim();
        const alvo = normalizar(jogo.frase).replace(/\s+/g, ' ').trim();
        if (!normalizado || normalizado !== alvo) return false;

        const tempoGastoMs = Date.now() - jogo.iniciadoEm;
        const recompensaDigitacao = calcularRecompensaDigitacao(tempoGastoMs);
        const u = garantirUsuario(db, sender);
        u.golds = (u.golds || 0) + recompensaDigitacao;
        salvarDB(db);
        jogosAtivos.delete(from);

        const segundosGastos = (tempoGastoMs / 1000).toFixed(1);
        await enviarComMidiaOpcional(sock, from, 'vitoria-digitacao',
            `🎉 *DIGITAÇÃO:* @${sender.split('@')[0]} foi o(a) mais rápido(a)! (${segundosGastos}s) +${recompensaDigitacao} 🪙!`,
            { quoted: msg, mentions: [sender] });
        return true;
    }

    if (jogo.tipo === '30s') {
        if (jogo.fase !== 'rodada') return false; // só aceita palpite com a rodada rolando
        if (!jogo.times[jogo.timeDaVez].has(sender)) return false; // só conta quem está no time da vez

        const normalizado = normalizar(texto);
        if (!normalizado || normalizado !== normalizar(jogo.palavraAtual)) return false;

        const palavraAcertada = jogo.palavraAtual;
        jogo.palavrasUsadas.add(palavraAcertada);
        jogo.acertosRodada += 1;
        tocarAtividade(jogo);

        const u = garantirUsuario(db, sender);
        u.golds = (u.golds || 0) + RECOMPENSA_POR_PALAVRA_30S;
        salvarDB(db);

        jogo.palavraAtual = sortearPalavra30s(jogo.palavrasUsadas);
        await sock.sendMessage(from, {
            text: `✅ *${palavraAcertada}* certo! (+${RECOMPENSA_POR_PALAVRA_30S} 🪙) Próxima:\n\n*${jogo.palavraAtual.toUpperCase()}*`
        }, { quoted: msg });
        return true;
    }

    return false; // forca/velha usam comandos explícitos, não texto livre
};

module.exports = jogosModulo;
module.exports.jogosModulo = jogosModulo;
module.exports.default = jogosModulo;
module.exports.verificarPalpite30s = verificarPalpite30s;
// Alias mais claro do mesmo hook, pronto pra quando o comandos.js for
// atualizado numa entrega futura e puder chamar esse nome em vez do antigo.
module.exports.verificarPalpiteAtivo = verificarPalpite30s;
