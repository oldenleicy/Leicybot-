// ─── GARANTE QUE O "crypto" GLOBAL EXISTA (independente da versão do Node) ───
// Precisa vir ANTES de qualquer outro require, incluindo o do Baileys.
if (typeof globalThis.crypto === 'undefined') {
    const nodeCrypto = require('crypto');
    if (nodeCrypto.webcrypto) {
        globalThis.crypto = nodeCrypto.webcrypto;
        console.log('[SISTEMA] Polyfill de crypto global aplicado.');
    }
}

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, fetchLatestWaWebVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

// youtube-dl-exec é usado aqui só pra auto-atualizar o binário do yt-dlp no
// boot (2.1) — os comandos de download em si continuam vivendo no
// modulos/midia.js. Carregamento defensivo: se faltar, só desativa essa
// checagem pontual, sem derrubar o bot inteiro.
let youtubedl = null;
try {
    youtubedl = require('youtube-dl-exec');
} catch (e) {
    console.error('[SISTEMA] youtube-dl-exec não carregou — pulando a auto-atualização do yt-dlp no boot.', e.message);
}

// Cookies opcionais pro yt-dlp (usados em modulos/midia.js) via variável de
// ambiente — no Railway não dá pra simplesmente comitar o cookies.txt no
// repositório (é uma sessão de login real, vazaria pra quem tiver acesso ao
// repo/histórico do git). Em vez disso: exporta o cookies.txt localmente,
// converte pra base64 e cola isso numa variável de ambiente no Railway
// (ex: COOKIES_TXT_B64). No boot, decodifica e escreve o arquivo exatamente
// onde midia.js já espera encontrá-lo (raiz do projeto).
if (process.env.COOKIES_TXT_B64) {
    try {
        const caminhoCookiesBoot = path.join(__dirname, 'cookies.txt');
        fs.writeFileSync(caminhoCookiesBoot, Buffer.from(process.env.COOKIES_TXT_B64, 'base64'));
        console.log('[SISTEMA] cookies.txt restaurado a partir da variável de ambiente COOKIES_TXT_B64.');
    } catch (e) {
        console.error('[SISTEMA] Falha ao restaurar cookies.txt da variável de ambiente:', e.message);
    }
}

// ─── CONTORNO DO BUG CONHECIDO DO BAILEYS (issue #2679) ───
// fetchLatestBaileysVersion() às vezes retorna uma versão desatualizada do
// WhatsApp Web dizendo "isLatest: true" — o WhatsApp aceita a conexão mas
// recusa completar o pareamento do aparelho. fetchLatestWaWebVersion() busca
// a versão real mais atual e evita esse problema.
async function obterVersaoProtocolo() {
    try {
        if (typeof fetchLatestWaWebVersion === 'function') {
            const { version } = await fetchLatestWaWebVersion();
            console.log('[WHATSAPP] Versão obtida via fetchLatestWaWebVersion.');
            return version;
        }
    } catch (e) {
        console.error('[WHATSAPP] fetchLatestWaWebVersion falhou:', e.message);
    }
    try {
        const { version } = await fetchLatestBaileysVersion();
        console.log('[WHATSAPP] Usando fetchLatestBaileysVersion (atenção: pode retornar versão desatualizada — ver issue #2679 do Baileys).');
        return version;
    } catch (e) {
        console.error('[WHATSAPP] fetchLatestBaileysVersion também falhou:', e.message);
    }
    console.log('[WHATSAPP] Usando versão fixa conhecida (julho/2026) como último recurso.');
    return [2, 3000, 1042466098];
}

// ─── REDE DE SEGURANÇA GLOBAL ───
// Por padrão, uma Promise rejeitada sem tratamento derruba o processo Node
// inteiro (incluindo a conexão do WhatsApp). Isso registra o erro no log
// em vez de matar o bot. Não interfere em nada da lógica de conexão abaixo.
process.on('unhandledRejection', (motivo) => {
    console.error('[ERRO GLOBAL] Promise rejeitada sem tratamento:', motivo);
});
process.on('uncaughtException', (erro) => {
    console.error('[ERRO GLOBAL] Exceção não capturada:', erro);
});

// ─── DIAGNÓSTICO DOS COMANDOS ───
let lidarComComando = null;
try {
    const comandosModulo = require('./comandos');
    lidarComComando = comandosModulo.lidarComComando || comandosModulo;
} catch (erroDeImportacao) {
    console.error('\n🚨 [ERRO CRÍTICO NO ARQUIVO COMANDOS.JS OU MÓDULOS] 🚨');
    console.error(erroDeImportacao.stack);
    console.error('──────────────────────────────────────────────────\n');
    // Função temporária de segurança para o bot não ficar caindo em loop
    lidarComComando = async () => { console.log('[SISTEMA] Mensagem ignorada pois o comandos.js contém erros.'); };
}

const app = express();
const port = process.env.PORT || 3000;

// ─── INICIALIZAÇÃO ATÔMICA E SEGURA DO BANCO DE DADOS ───
// database.json (golds, títulos, config) vivia só na pasta do projeto —
// como o Railway recria o container do zero a cada deploy, tudo que só
// existe ali (e não está commitado no Git) sumia a cada deploy novo.
// Mesmo problema e mesma solução já usada pra sessão do WhatsApp
// (auth_info, logo abaixo): se este serviço tiver um Volume do Railway
// anexado, o database.json passa a viver dentro dele — sobrevive a
// redeploys sozinho. Sem um Volume anexado, cai de volta pro
// comportamento de sempre (reseta a cada deploy) — criar o Volume em
// Settings → Volumes no Railway é o que falta pra isso parar de vez.
function resolverCaminhoDB() {
    const caminhoVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (caminhoVolume) {
        try {
            const arquivoTeste = path.join(caminhoVolume, '.escrita_teste_db');
            fs.writeFileSync(arquivoTeste, 'ok');
            fs.unlinkSync(arquivoTeste);
            const caminhoNoVolume = path.join(caminhoVolume, 'database.json');
            console.log(`[DATABASE] Volume do Railway detectado e gravável — database.json será persistido em ${caminhoNoVolume} (sobrevive a redeploys).`);
            return caminhoNoVolume;
        } catch (e) {
            console.error('[DATABASE] RAILWAY_VOLUME_MOUNT_PATH está definida mas não consegui gravar nela — caindo de volta pra pasta local (dados serão perdidos a cada deploy até isso ser corrigido).', e.message);
        }
    } else {
        console.error('[DATABASE] Nenhum Volume do Railway anexado a este serviço — database.json vive só na pasta do projeto e será REINICIADO a cada novo deploy. Crie um Volume em Settings → Volumes no Railway pra corrigir isso de vez.');
    }
    return path.join(__dirname, 'database.json');
}

const caminhoDB = resolverCaminhoDB();

const estruturaPadrao = {
    usuarios: {},
    grupos: {},
    config_bot: {
        nome_bot: "LeicyBot",
        url_foto_menu: "https://i.imgur.com/Kdf946S.png",
        manutencao: false,
        pausado: false,
        comandos_desativados: [],
        titulos_criados: ["Celestial", "4Espadas⚔️🌊", "Gavião da noite"],
        ddi_permitido: "258"
    }
};

let db = estruturaPadrao;

try {
    if (fs.existsSync(caminhoDB)) {
        const conteudo = fs.readFileSync(caminhoDB, 'utf-8').trim();
        if (conteudo && conteudo !== "") {
            db = JSON.parse(conteudo);
            if (!db.config_bot) db.config_bot = estruturaPadrao.config_bot;
            if (!db.usuarios) db.usuarios = estruturaPadrao.usuarios;
            if (!db.grupos) db.grupos = estruturaPadrao.grupos;
        } else {
            fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
        }
    } else {
        fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
    }
} catch (e) {
    console.error('[DATABASE] Arquivo corrompido ou vazio detectado! Aplicando estrutura de segurança.', e.message);
    db = estruturaPadrao;
    fs.writeFileSync(caminhoDB, JSON.stringify(estruturaPadrao, null, 4), 'utf-8');
}

function salvarDB(dadosNovos) {
    try {
        // O temporário TEM que ficar na mesma pasta do destino final — se
        // database.json estiver no Volume mas o temporário na pasta local do
        // projeto, o rename atômico falha (são "dispositivos" diferentes).
        const caminhoTmp = path.join(path.dirname(caminhoDB), 'database.tmp');
        fs.writeFileSync(caminhoTmp, JSON.stringify(dadosNovos, null, 4), 'utf-8');
        fs.renameSync(caminhoTmp, caminhoDB);
    } catch (error) {
        console.error("[DATABASE] Erro crítico ao salvar o banco de dados: ", error.message);
    }
}
// ─────────────────────────────────────────────────────────────

const MEU_NUMERO_WHATSAPP = '258840504242';
const DONO_OFICIAL = '258877080511@s.whatsapp.net'; // pra onde o backup automático da sessão é enviado

// ─── BACKUP AUTOMÁTICO DE SESSÃO (v2) ───
// Em vez de depender só do WA_SESSION_DATA colado manualmente (que fica
// desatualizado rápido, já que as credenciais mudam com frequência), o bot
// manda uma cópia fresca pro privado do dono periodicamente — assim sempre
// tem um backup recente à mão sem precisar ficar de olho no log.
let ultimoBackupEnviado = 0;
const INTERVALO_BACKUP_MS = 20 * 60 * 1000; // 20 minutos
let ultimoConteudoBackup = null; // v2: evita reenviar o mesmo backup quando nada mudou

// ─── LIMITE DE TENTATIVAS DE PAREAMENTO (v2) ───
// Evita martelar o WhatsApp com pedidos de código repetidos (o que pode
// causar bloqueio temporário) — para de tentar sozinho depois de N falhas
// seguidas e exige reinício manual.
let tentativasPareamentoSeguidas = 0;
const MAX_TENTATIVAS_PAREAMENTO = 3;

// Contador DIFERENTE do de cima: aquele conta falhas na CHAMADA de
// requestPairingCode (erro de API). Este aqui conta quantos códigos foram
// GERADOS COM SUCESSO e mostrados, mas ninguém completou o pareamento no
// aparelho — ex: a conexão cai de novo antes de alguém digitar o código.
// Sem isso, o bot ficaria gerando código atrás de código pra sempre (e
// mandando vários pro dono) se ninguém estiver por perto pra parear.
let codigosPareamentoSemUso = 0;
const MAX_CODIGOS_PAREAMENTO_SEM_USO = 5;

// Mesma ideia, mas pro caminho de reconexão "normal" (queda recuperável, sem
// perder a sessão) — antes tentava de novo a cada 8s pra sempre, sem nunca
// avisar se o motivo real persistisse por muito tempo.
let tentativasReconexaoSeguidas = 0;
const MAX_TENTATIVAS_RECONEXAO = 8;

let statusConexao = "Iniciando aplicação...";
let botSocket = null;

app.get('/', (req, res) => {
    res.send(`<div style='text-align: center; font-family: sans-serif; margin-top: 50px;'><h1>🤖 Servidor Online</h1><p>Status: <strong>${statusConexao}</strong></p></div>`);
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento ativo na porta ${port}`);
});

// ─── CAMINHO DE PERSISTÊNCIA DA SESSÃO (auth_info) — Volume do Railway ───
// Se este serviço tiver um Volume do Railway anexado, a plataforma expõe
// automaticamente a variável RAILWAY_VOLUME_MOUNT_PATH com o caminho do
// disco persistente (ex: "/data"). Quando ela existe, a pasta auth_info
// passa a viver dentro do volume — que sobrevive a redeploys sozinho, sem
// precisar mais colar o base64 na WA_SESSION_DATA toda vez que a sessão
// muda.
//
// Testamos a gravação de verdade antes de confiar no volume: se a variável
// não existir, ou existir mas o caminho não estiver de fato gravável nesse
// boot (ex: volume mal configurado), cai automaticamente pro comportamento
// de sempre — pasta local dentro do projeto + restauração via
// WA_SESSION_DATA em base64. Ou seja, pra quem não configurar um volume no
// Railway, nada muda.
function resolverPastaAuth() {
    const caminhoVolume = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if (caminhoVolume) {
        try {
            const arquivoTeste = path.join(caminhoVolume, '.escrita_teste');
            fs.writeFileSync(arquivoTeste, 'ok');
            fs.unlinkSync(arquivoTeste);
            const pastaNoVolume = path.join(caminhoVolume, 'auth_info');
            console.log(`[SISTEMA] Volume do Railway detectado e gravável — sessão será persistida em ${pastaNoVolume} (não depende mais só da WA_SESSION_DATA).`);
            return { pasta: pastaNoVolume, usandoVolume: true };
        } catch (e) {
            console.error('[SISTEMA] RAILWAY_VOLUME_MOUNT_PATH está definida mas não consegui gravar nela — caindo de volta pra pasta local + WA_SESSION_DATA.', e.message);
        }
    }
    return { pasta: path.join(__dirname, 'auth_info'), usandoVolume: false };
}

const { pasta: PASTA_AUTH, usandoVolume: USANDO_VOLUME_RAILWAY } = resolverPastaAuth();

function limparSessaoInvalida() {
    const pastaAuth = PASTA_AUTH;
    if (fs.existsSync(pastaAuth)) {
        try {
            if (botSocket) {
                try {
                    botSocket.end();
                } catch (e) {
                    // O socket já pode estar fechado/instável nesse ponto — não é um erro real.
                }
                botSocket = null;
            }
            fs.rmSync(pastaAuth, { recursive: true, force: true });
            console.log('[SISTEMA] Pasta auth_info antiga eliminada para evitar o Erro 428.');
        } catch (err) {
            console.error('[ERRO LIMPEZA]:', err.message);
        }
    }
}

async function iniciarBot() {
    const pastaAuth = PASTA_AUTH;

    if (process.env.WA_SESSION_DATA && !fs.existsSync(pastaAuth)) {
        try {
            fs.mkdirSync(pastaAuth, { recursive: true });
            const sessionData = JSON.parse(Buffer.from(process.env.WA_SESSION_DATA, 'base64').toString('utf-8'));

            Object.keys(sessionData).forEach(file => {
                fs.writeFileSync(path.join(pastaAuth, file), JSON.stringify(sessionData[file]));
            });
            console.log('[SISTEMA] Sessão restaurada com sucesso a partir das Variáveis de Ambiente' + (USANDO_VOLUME_RAILWAY ? ' — e já gravada no volume, então os próximos boots nem vão precisar mais dela.' : '!'));
        } catch (e) {
            console.error('[ERRO VARIÁVEL SESSÃO]: Dados inválidos ou corrompidos na variável.', e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(pastaAuth);
    const version = await obterVersaoProtocolo();
    console.log(`[WHATSAPP] Utilizando a versão de protocolo: ${version.join('.')}`);

    botSocket = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        mobile: false,
        browser: ['Mac OS', 'Chrome', '124.0.0.0']
    });

    botSocket.ev.on('creds.update', async () => {
        try {
            await saveCreds();
            if (fs.existsSync(pastaAuth)) {
                const files = fs.readdirSync(pastaAuth);
                const sessionObj = {};
                files.forEach(file => {
                    try {
                        if (fs.statSync(path.join(pastaAuth, file)).isFile()) {
                            sessionObj[file] = JSON.parse(fs.readFileSync(path.join(pastaAuth, file), 'utf-8'));
                        }
                    } catch (erroArquivo) {
                        // Um arquivo específico pode estar sendo escrito nesse instante — pula
                        // só esse arquivo em vez de derrubar a leitura de todos os outros.
                        console.error(`[SISTEMA] Não consegui ler ${file} agora (provavelmente sendo escrito), ignorando nessa rodada.`);
                    }
                });
                const base64String = Buffer.from(JSON.stringify(sessionObj)).toString('base64');
                console.log('\n==================================================');
                console.log('📋 WA_SESSION_DATA ATUALIZADA NO CONSOLE');
                console.log('==================================================');
                console.log(base64String);
                console.log('==================================================\n');

                // v2: backup automático throttled pro privado do dono (no máx. 1x a
                // cada INTERVALO_BACKUP_MS), só quando a conexão está de fato aberta.
                if (statusConexao === "conectado" && (Date.now() - ultimoBackupEnviado) > INTERVALO_BACKUP_MS) {
                    ultimoBackupEnviado = Date.now();
                    if (base64String === ultimoConteudoBackup) {
                        console.log('[SISTEMA] Sessão sem mudança, backup pulado.');
                    } else {
                        try {
                            await botSocket.sendMessage(DONO_OFICIAL, {
                                document: Buffer.from(base64String, 'utf-8'),
                                fileName: `wa_session_data_${new Date().toISOString().slice(0, 16).replace(':', 'h')}.txt`,
                                mimetype: 'text/plain',
                                caption: USANDO_VOLUME_RAILWAY
                                    ? '🔐 Backup automático da sessão do WhatsApp (redundante — a sessão principal já vive no volume do Railway). Só use este arquivo se o volume for perdido: cole o conteúdo na variável WA_SESSION_DATA.'
                                    : '🔐 Backup automático da sessão do WhatsApp. Se o bot cair e não reconectar sozinho, cole o conteúdo desse arquivo na variável WA_SESSION_DATA do Railway.'
                            });
                            ultimoConteudoBackup = base64String;
                            console.log('[SISTEMA] Backup de sessão enviado automaticamente pro privado do dono.');
                        } catch (e) {
                            console.error('[SISTEMA] Falha ao enviar backup automático de sessão:', e.message);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[SISTEMA] Falha ao salvar/ler credenciais:', e.message);
        }
    });

    // Timer local a esta chamada de iniciarBot() — se a conexão cair antes dele
    // disparar, o handler de 'close' abaixo cancela ele, evitando que um timer
    // órfão tente usar um socket que já não existe mais.
    let timeoutPareamento = null;

    if (!botSocket.authState.creds.registered) {
        statusConexao = "Aguardando geração do código de pareamento...";
        timeoutPareamento = setTimeout(async () => {
            try {
                console.log(`[SISTEMA] Solicitando código de pareamento seguro para: ${MEU_NUMERO_WHATSAPP}`);
                let codigo = await botSocket.requestPairingCode(MEU_NUMERO_WHATSAPP);
                tentativasPareamentoSeguidas = 0; // sucesso na CHAMADA — reseta o contador de falhas de API
                codigosPareamentoSemUso++; // mas ainda ninguém completou o pareamento com este código
                statusConexao = `Código gerado (${codigosPareamentoSemUso}/${MAX_CODIGOS_PAREAMENTO_SEM_USO}): ${codigo}`;
                console.log('\n==================================================');
                console.log(`🔑 SEU CÓDIGO DE EMPARELHAMENTO DO WHATSAPP: ${codigo}`);
                console.log('==================================================\n');
            } catch (err) {
                tentativasPareamentoSeguidas++;
                console.error(`[ERRO PAREAMENTO] Tentativa ${tentativasPareamentoSeguidas}/${MAX_TENTATIVAS_PAREAMENTO} falhou:`, err.message);

                if (tentativasPareamentoSeguidas >= MAX_TENTATIVAS_PAREAMENTO) {
                    statusConexao = `🚨 Pareamento falhou ${tentativasPareamentoSeguidas}x seguidas. Parei de tentar automaticamente pra não arriscar bloqueio do WhatsApp — reinicie manualmente pra tentar de novo.`;
                    console.error('[SISTEMA] ' + statusConexao);
                    limparSessaoInvalida();
                    return; // não agenda mais nenhuma tentativa sozinho
                }

                const esperaBackoff = 10000 * tentativasPareamentoSeguidas; // 10s, 20s, 30s...
                console.error(`[SISTEMA] Tentando de novo em ${esperaBackoff / 1000}s...`);
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), esperaBackoff);
            }
        }, 10000);
    }

    botSocket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            if (timeoutPareamento) {
                clearTimeout(timeoutPareamento);
                timeoutPareamento = null;
            }

            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            statusConexao = `Desconectado (Status: ${statusCode})`;
            console.log(`[CONEXÃO] Fechada com código: ${statusCode}`);
            console.log(`[CONEXÃO] Detalhe do erro real:`, lastDisconnect?.error?.message || lastDisconnect?.error || '(nenhum detalhe disponível)');

            // Limite de segurança: se já geramos vários códigos de pareamento
            // seguidos e ninguém completou nenhum (a conexão nunca chegou a
            // abrir), para de pedir — tanto por segurança (evitar bloqueio
            // temporário do WhatsApp por excesso de tentativas) quanto porque,
            // se ninguém está por perto pra digitar o código, insistir sozinho
            // não resolve nada.
            if (codigosPareamentoSemUso >= MAX_CODIGOS_PAREAMENTO_SEM_USO) {
                statusConexao = `🚨 Já gerei ${codigosPareamentoSemUso} códigos de pareamento seguidos e nenhum foi usado. Parei de pedir por segurança — reinicie o bot manualmente quando estiver pronto pra parear de novo.`;
                console.error('[SISTEMA] ' + statusConexao);
                return; // não agenda mais nenhuma tentativa sozinho
            }

            // Só um logout DE VERDADE (401 / DisconnectReason.loggedOut) exige
            // apagar a sessão e parear do zero — isso acontece quando a pessoa
            // desconecta o aparelho pelo próprio WhatsApp. Os outros códigos
            // (403, 405, 428...) são quedas de conexão comuns e RECUPERÁVEIS —
            // tratá-los como logout (como era antes) fazia o bot destruir uma
            // sessão perfeitamente boa à toa, e por isso ficava pedindo
            // pareamento novo toda vez que a conexão soltava por qualquer
            // instabilidade passageira.
            if (statusCode === 401 || statusCode === DisconnectReason.loggedOut) {
                console.log('[CONEXÃO] Logout confirmado — limpando sessão local e pareando do zero.');
                tentativasReconexaoSeguidas = 0;
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            } else {
                tentativasReconexaoSeguidas++;
                if (tentativasReconexaoSeguidas > MAX_TENTATIVAS_RECONEXAO) {
                    statusConexao = `🚨 ${tentativasReconexaoSeguidas} tentativas de reconexão seguidas falharam. Parei de tentar sozinho — dá uma olhada nos logs e reinicie manualmente.`;
                    console.error('[SISTEMA] ' + statusConexao);
                    return;
                }
                const esperaReconexao = Math.min(8000 * tentativasReconexaoSeguidas, 120000);
                console.log(`[CONEXÃO] Motivo parece recuperável (tentativa ${tentativasReconexaoSeguidas}/${MAX_TENTATIVAS_RECONEXAO}) — reconectando em ${esperaReconexao / 1000}s...`);
                setTimeout(() => iniciarBot(), esperaReconexao);
            }
        } else if (connection === 'open') {
            statusConexao = "conectado";
            tentativasPareamentoSeguidas = 0;
            tentativasReconexaoSeguidas = 0;
            codigosPareamentoSemUso = 0;
            console.log('🚀 [SUCESSO] Bot conectado 100% e operando sem falhas!');
        }
    });

    botSocket.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                // Captura erros internos de comando de maneira segura para não crashar o index.js
                await lidarComComando(botSocket, msg, db, salvarDB).catch(e => console.error('[ERRO INTERNO CAPTURADO]:', e));
            }
        }
    });

    // ─── ENTRADA/SAÍDA DE MEMBROS — boas-vindas e bloqueio de DDI estrangeiro ───
    botSocket.ev.on('group-participants.update', async (update) => {
        try {
            const { id: groupId, participants, action } = update;
            if (action !== 'add') return;

            if (!db.grupos) db.grupos = {};
            const gConfig = db.grupos[groupId];
            if (!gConfig) return; // grupo ainda não tem configuração (nenhum comando !adm rodado nele ainda)

            for (const participantJid of participants) {
                const numero = participantJid.split('@')[0];

                // FAKES: expulsa DDI fora do padrão configurado
                if (gConfig.fakes) {
                    const ddiPermitido = (db.config_bot && db.config_bot.ddi_permitido) || '258';
                    if (!numero.startsWith(ddiPermitido)) {
                        try {
                            await botSocket.groupParticipantsUpdate(groupId, [participantJid], 'remove');
                            await botSocket.sendMessage(groupId, { text: `🌐 Número estrangeiro @${numero} removido automaticamente (DDI fora do padrão +${ddiPermitido}).`, mentions: [participantJid] });
                        } catch (e) {
                            console.error('[FAKES] Falha ao remover:', e.message);
                        }
                        continue; // não manda boas-vindas pra quem já foi expulso
                    }
                }

                // BOAS-VINDAS
                if (gConfig.boasvindas) {
                    const slotAtivo = gConfig.bv_ativo || 'bv1';
                    const textoBV = gConfig[slotAtivo] || gConfig.bv1 || 'Seja bem-vindo(a) ao grupo! 🌊';
                    try {
                        await botSocket.sendMessage(groupId, { text: `@${numero} ${textoBV}`, mentions: [participantJid] });
                    } catch (e) {
                        console.error('[BOAS-VINDAS] Falha ao enviar:', e.message);
                    }
                }
            }
        } catch (e) {
            console.error('[GROUP-UPDATE] Erro:', e.message);
        }
    });
}

if (process.env.PAUSAR_WHATSAPP === 'true') {
    statusConexao = "PAUSADO manualmente (PAUSAR_WHATSAPP=true) — nenhuma tentativa de conexão será feita.";
    console.log('[SISTEMA] PAUSAR_WHATSAPP está ativo — o bot NÃO vai tentar se conectar ao WhatsApp.');
    console.log('[SISTEMA] Pra tentar de novo, apague essa variável (ou mude pra false) no Railway e faça redeploy.');
} else {
    // ─── AUTO-ATUALIZAÇÃO DO YT-DLP (2.1) ───
    // O YouTube muda com frequência, e binário desatualizado do yt-dlp é a
    // causa mais comum de falha no !play/!video. Atualiza 1x no boot, antes
    // de conectar ao WhatsApp — se falhar (ex: sem internet nesse instante),
    // não bloqueia o boot, só loga e segue com a versão que já tinha.
    const atualizarYtDlp = async () => {
        if (!youtubedl) return;
        try {
            await youtubedl.update();
            console.log('[SISTEMA] Binário do yt-dlp verificado/atualizado com sucesso.');
        } catch (e) {
            console.error('[SISTEMA] Falha ao atualizar o yt-dlp (seguindo com a versão atual):', e.message);
        }
    };

    atualizarYtDlp().finally(() => {
        setTimeout(() => {
            iniciarBot().catch(err => console.error('[ERRO INICIALIZAÇÃO]:', err));
        }, 2000);
    });
}
