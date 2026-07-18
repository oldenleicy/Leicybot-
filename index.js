const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

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
const caminhoDB = path.join(__dirname, 'database.json');

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
        const caminhoTmp = path.join(__dirname, 'database.tmp');
        fs.writeFileSync(caminhoTmp, JSON.stringify(dadosNovos, null, 4), 'utf-8');
        fs.renameSync(caminhoTmp, caminhoDB);
    } catch (error) {
        console.error("[DATABASE] Erro crítico ao salvar o banco de dados: ", error.message);
    }
}
// ─────────────────────────────────────────────────────────────

const MEU_NUMERO_WHATSAPP = '258840504242';

let statusConexao = "Iniciando aplicação...";
let botSocket = null;

// ─── CONTROLE DE RECONEXÃO (evita corrida entre tentativas sobrepostas) ───
let reiniciando = false;          // trava: impede duas iniciarBot() rodando ao mesmo tempo
let timeoutPareamento = null;     // referência do timeout que pede o código de pareamento
let timeoutReconexao = null;      // referência do próximo agendamento de reconexão
let quedasSeguidas = 0;           // contador de quedas com código "undefined" em sequência
const LIMITE_QUEDAS_PARA_LIMPAR = 5;

app.get('/', (req, res) => {
    res.send(`<div style='text-align: center; font-family: sans-serif; margin-top: 50px;'><h1>🤖 Servidor Online</h1><p>Status: <strong>${statusConexao}</strong></p></div>`);
});

app.listen(port, () => {
    console.log(`[SERVER] Monitoramento ativo na porta ${port}`);
});

function limparSessaoInvalida() {
    const pastaAuth = path.join(__dirname, 'auth_info');
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
    quedasSeguidas = 0;
}

function agendarReconexao(atrasoMs) {
    if (timeoutReconexao) clearTimeout(timeoutReconexao);
    timeoutReconexao = setTimeout(() => {
        timeoutReconexao = null;
        iniciarBot();
    }, atrasoMs);
}

async function iniciarBot() {
    if (reiniciando) {
        console.log('[SISTEMA] Já existe uma tentativa de conexão em andamento — ignorando chamada duplicada.');
        return;
    }
    reiniciando = true;

    // Cancela qualquer timeout de pareamento de uma tentativa anterior que ainda
    // não tenha disparado — era isso que causava o erro "WebSocket was closed
    // before the connection was established".
    if (timeoutPareamento) {
        clearTimeout(timeoutPareamento);
        timeoutPareamento = null;
    }

    try {
        const pastaAuth = path.join(__dirname, 'auth_info');

        if (process.env.WA_SESSION_DATA && !fs.existsSync(pastaAuth)) {
            try {
                fs.mkdirSync(pastaAuth, { recursive: true });
                const sessionData = JSON.parse(Buffer.from(process.env.WA_SESSION_DATA, 'base64').toString('utf-8'));

                Object.keys(sessionData).forEach(file => {
                    fs.writeFileSync(path.join(pastaAuth, file), JSON.stringify(sessionData[file]));
                });
                console.log('[SISTEMA] Sessão restaurada com sucesso a partir das Variáveis de Ambiente!');
            } catch (e) {
                console.error('[ERRO VARIÁVEL SESSÃO]: Dados inválidos ou corrompidos na variável.', e.message);
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: true }));
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
                        if (fs.statSync(path.join(pastaAuth, file)).isFile()) {
                            sessionObj[file] = JSON.parse(fs.readFileSync(path.join(pastaAuth, file), 'utf-8'));
                        }
                    });
                    const base64String = Buffer.from(JSON.stringify(sessionObj)).toString('base64');
                    console.log('\n==================================================');
                    console.log('📋 WA_SESSION_DATA ATUALIZADA NO CONSOLE');
                    console.log('==================================================\n');
                }
            } catch (e) {
                console.error('[SISTEMA] Falha ao salvar/ler credenciais (provavelmente a sessão já foi limpa por outra tentativa):', e.message);
            }
        });

        if (!botSocket.authState.creds.registered) {
            statusConexao = "Aguardando geração do código de pareamento...";
            timeoutPareamento = setTimeout(async () => {
                timeoutPareamento = null;
                if (!botSocket || botSocket.authState?.creds?.registered) return;
                try {
                    console.log(`[SISTEMA] Solicitando código de pareamento seguro para: ${MEU_NUMERO_WHATSAPP}`);
                    let codigo = await botSocket.requestPairingCode(MEU_NUMERO_WHATSAPP);
                    statusConexao = `Código gerado: ${codigo}`;
                    console.log('\n==================================================');
                    console.log(`🔑 SEU CÓDIGO DE EMPARELHAMENTO DO WHATSAPP: ${codigo}`);
                    console.log('==================================================\n');
                } catch (err) {
                    console.error('[ERRO AO PEDIR CÓDIGO]:', err.message);
                    try { botSocket?.end?.(); } catch (e) { /* ignora */ }
                    reiniciando = false;
                    agendarReconexao(8000);
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

                if ([401, 403, 405, 428, DisconnectReason.loggedOut].includes(statusCode)) {
                    limparSessaoInvalida();
                    reiniciando = false;
                    agendarReconexao(5000);
                } else if (statusCode === undefined) {
                    // Fechou sem motivo claro — pode ser instabilidade momentânea ou sessão
                    // corrompida. Só limpa a sessão depois de várias quedas seguidas assim,
                    // pra não forçar reparelhamento por causa de um soluço de rede bobo.
                    quedasSeguidas++;
                    console.log(`[SISTEMA] Queda sem código de motivo (${quedasSeguidas}/${LIMITE_QUEDAS_PARA_LIMPAR}).`);
                    if (quedasSeguidas >= LIMITE_QUEDAS_PARA_LIMPAR) {
                        console.log('[SISTEMA] Muitas quedas seguidas sem motivo — limpando sessão e esperando mais tempo antes de tentar de novo (proteção contra limite temporário do WhatsApp).');
                        limparSessaoInvalida();
                        reiniciando = false;
                        agendarReconexao(60000);
                    } else {
                        reiniciando = false;
                        agendarReconexao(8000);
                    }
                } else {
                    reiniciando = false;
                    agendarReconexao(8000);
                }
            } else if (connection === 'open') {
                statusConexao = "conectado";
                quedasSeguidas = 0;
                reiniciando = false;
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
    } catch (erroInicial) {
        console.error('[ERRO INICIALIZAÇÃO]:', erroInicial.message || erroInicial);
        reiniciando = false;
        agendarReconexao(8000);
    }
}

setTimeout(() => {
    iniciarBot().catch(err => console.error('[ERRO INICIALIZAÇÃO]:', err));
}, 2000);
