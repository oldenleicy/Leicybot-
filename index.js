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

// ─── CONTORNO DO BUG CONHECIDO DO BAILEYS (issue #2679) ───
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
        console.log('[WHATSAPP] Usando fetchLatestBaileysVersion.');
        return version;
    } catch (e) {
        console.error('[WHATSAPP] fetchLatestBaileysVersion também falhou:', e.message);
    }
    console.log('[WHATSAPP] Usando versão fixa conhecida (julho/2026).');
    return [2, 3000, 1042466098];
}

// ─── REDE DE SEGURANÇA GLOBAL ───
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
    console.error('\n🚨 [ERRO CRÍTICO NO ARQUIVO COMANDOS.JS] 🚨');
    console.error(erroDeImportacao.stack);
    lidarComComando = async () => { console.log('[SISTEMA] Mensagem ignorada pois o comandos.js contém erros.'); };
}

const app = express();
const port = process.env.PORT || 3000;

// ─── INICIALIZAÇÃO DO BANCO DE DADOS ───
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
            // Garante que subobjetos essenciais existam
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

// ─── MIGRAÇÃO AUTOMÁTICA DO BANCO ANTIGO ───
// Converte titulo_especial (campo antigo) para titulo_slot2 (novo slot de título especial)
// e titulo_1 (título comprado antigo) para titulo_slot1, se ainda não existir.
let migrado = false;
Object.values(db.usuarios).forEach(u => {
    // Migra título especial -> slot2
    if (u.titulo_especial && !u.titulo_slot2) {
        u.titulo_slot2 = u.titulo_especial;
        delete u.titulo_especial;
        migrado = true;
    }
    // Migra título comprado antigo (titulo_1) -> slot1, se não houver já um slot1 preenchido
    if (u.titulo_1 && !u.titulo_slot1) {
        u.titulo_slot1 = u.titulo_1;
        delete u.titulo_1;
        migrado = true;
    }
    // Remove titulo_2 (o novo sistema só tem 2 slots fixos, então o terceiro título é descartado)
    if (u.titulo_2) {
        delete u.titulo_2;
        migrado = true;
    }
});
if (migrado) {
    salvarDB(db);
    console.log('[SISTEMA] Migração de títulos antigos concluída.');
}

const MEU_NUMERO_WHATSAPP = '258840504242';

let statusConexao = "Iniciando aplicação...";
let botSocket = null;

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
                try { botSocket.end(); } catch (e) {}
                botSocket = null;
            }
            fs.rmSync(pastaAuth, { recursive: true, force: true });
            console.log('[SISTEMA] Pasta auth_info antiga eliminada.');
        } catch (err) {
            console.error('[ERRO LIMPEZA]:', err.message);
        }
    }
}

async function iniciarBot() {
    const pastaAuth = path.join(__dirname, 'auth_info');

    // Restaura sessão a partir da variável de ambiente, se disponível
    if (process.env.WA_SESSION_DATA && !fs.existsSync(pastaAuth)) {
        try {
            fs.mkdirSync(pastaAuth, { recursive: true });
            const sessionData = JSON.parse(Buffer.from(process.env.WA_SESSION_DATA, 'base64').toString('utf-8'));
            Object.keys(sessionData).forEach(file => {
                fs.writeFileSync(path.join(pastaAuth, file), JSON.stringify(sessionData[file]));
            });
            console.log('[SISTEMA] Sessão restaurada a partir das Variáveis de Ambiente!');
        } catch (e) {
            console.error('[ERRO VARIÁVEL SESSÃO]:', e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
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

    // Salva as credenciais sempre que atualizadas e imprime a string para variável de ambiente
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
                        console.error(`[SISTEMA] Não consegui ler ${file} agora.`);
                    }
                });
                const base64String = Buffer.from(JSON.stringify(sessionObj)).toString('base64');
                console.log('\n==================================================');
                console.log('📋 WA_SESSION_DATA ATUALIZADA NO CONSOLE');
                console.log('==================================================');
                console.log(base64String);
                console.log('==================================================\n');
            }
        } catch (e) {
            console.error('[SISTEMA] Falha ao salvar/ler credenciais:', e.message);
        }
    });

    let timeoutPareamento = null;

    // Gera código de pareamento se o bot não estiver registrado
    if (!botSocket.authState.creds.registered) {
        statusConexao = "Aguardando geração do código de pareamento...";
        timeoutPareamento = setTimeout(async () => {
            try {
                console.log(`[SISTEMA] Solicitando código de pareamento para: ${MEU_NUMERO_WHATSAPP}`);
                let codigo = await botSocket.requestPairingCode(MEU_NUMERO_WHATSAPP);
                statusConexao = `Código gerado: ${codigo}`;
                console.log('\n==================================================');
                console.log(`🔑 SEU CÓDIGO DE EMPARELHAMENTO DO WHATSAPP: ${codigo}`);
                console.log('==================================================\n');
            } catch (err) {
                console.error('[ERRO CRÍTICO 428]: Forçando reinicialização limpa...');
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            }
        }, 10000);
    }

    // Monitora o estado da conexão
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

            if ([401, 403, 405, 428, DisconnectReason.loggedOut].includes(statusCode)) {
                limparSessaoInvalida();
                setTimeout(() => iniciarBot(), 5000);
            } else {
                setTimeout(() => iniciarBot(), 8000);
            }
        } else if (connection === 'open') {
            statusConexao = "conectado";
            console.log('🚀 [SUCESSO] Bot conectado 100% e operando sem falhas!');
        }
    });

    // Processamento de todas as mensagens recebidas
    botSocket.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            // Ignora mensagens enviadas pelo próprio bot
            if (msg.key.fromMe) continue;

            const from = msg.key.remoteJid;

            // ═══════════════════════════════════════════════════
            // 🔓 REABERTURA AUTOMÁTICA DE GRUPO (fechamento temporário)
            // ═══════════════════════════════════════════════════
            if (from.endsWith('@g.us') && db.grupos[from]) {
                const gConfig = db.grupos[from];
                if (gConfig.fechado_ate && Date.now() > gConfig.fechado_ate) {
                    try {
                        await botSocket.groupSettingUpdate(from, 'not_announcement');
                        delete gConfig.fechado_ate;
                        salvarDB(db);
                        console.log(`[GRUPO] Grupo ${from} reaberto automaticamente.`);
                    } catch (e) {
                        console.error('[GRUPO] Erro ao reabrir:', e.message);
                    }
                }
            }

            // ═══════════════════════════════════════════════════
            // 🛡️ FILTROS DE MODERAÇÃO (aplicados antes de processar comandos)
            // ═══════════════════════════════════════════════════
            // Só aplica se for grupo e se a configuração existir
            if (from.endsWith('@g.us') && db.grupos[from]) {
                const gConfig = db.grupos[from];
                const sender = msg.key.participant || msg.key.remoteJid;
                const agora = Date.now();

                // Inicializa usuário se não existir
                if (!db.usuarios[sender]) {
                    const criarUsuarioPadrao = require('./modulos/usuarioPadrao');
                    db.usuarios[sender] = criarUsuarioPadrao();
                }

                // 1. MUTE TEMPORÁRIO
                if (db.usuarios[sender].mutado_ate && db.usuarios[sender].mutado_ate > agora) {
                    await botSocket.sendMessage(from, { delete: msg.key }).catch(() => {});
                    return;
                }

                // 2. SLOW MODE (modo lento)
                if (gConfig.slowmode_segundos && gConfig.slowmode_segundos > 0) {
                    const ultima = db.usuarios[sender].ultima_mensagem_slow;
                    if (ultima && (agora - ultima) < gConfig.slowmode_segundos * 1000) {
                        await botSocket.sendMessage(from, { delete: msg.key }).catch(() => {});
                        return;
                    }
                    db.usuarios[sender].ultima_mensagem_slow = agora;
                }

                // 3. ANTIFLOOD
                if (gConfig.antiflood && gConfig.antiflood.max > 0) {
                    if (!db.usuarios[sender].historico_mensagens) db.usuarios[sender].historico_mensagens = [];
                    db.usuarios[sender].historico_mensagens = db.usuarios[sender].historico_mensagens.filter(ts => agora - ts < gConfig.antiflood.intervalo * 1000);
                    db.usuarios[sender].historico_mensagens.push(agora);
                    if (db.usuarios[sender].historico_mensagens.length > gConfig.antiflood.max) {
                        // Punição: mute de 5 minutos
                        db.usuarios[sender].mutado_ate = agora + 5 * 60 * 1000;
                        salvarDB(db);
                        await botSocket.sendMessage(from, {
                            text: `🤫 @${sender.split('@')[0]} foi silenciado por 5 minutos (flood).`,
                            mentions: [sender]
                        }).catch(() => {});
                        await botSocket.sendMessage(from, { delete: msg.key }).catch(() => {});
                        return;
                    }
                }

                // 4. ANTIMIDIA (bloqueia mídias de não-admins)
                if (gConfig.antimidia && (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.audioMessage || msg.message?.stickerMessage || msg.message?.documentMessage)) {
                    try {
                        const groupMetadata = await botSocket.groupMetadata(from);
                        const botId = botSocket.user.id.split(':')[0] + '@s.whatsapp.net';
                        const admsGrupo = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
                        if (!admsGrupo.includes(sender) && sender !== '258877080511@s.whatsapp.net') {
                            await botSocket.sendMessage(from, { delete: msg.key }).catch(() => {});
                            return;
                        }
                    } catch (e) { /* se falhar metadata, permite */ }
                }

                // 5. ANTIPALAVRA (filtra palavras proibidas)
                if (gConfig.palavras_proibidas && gConfig.palavras_proibidas.length > 0) {
                    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                    if (texto && gConfig.palavras_proibidas.some(p => texto.toLowerCase().includes(p.toLowerCase()))) {
                        await botSocket.sendMessage(from, { delete: msg.key }).catch(() => {});
                        return;
                    }
                }
            }

            // ═══════════════════════════════════════════════════
            // 📨 PROCESSAMENTO DA MENSAGEM PELO ROTEADOR DE COMANDOS
            // ═══════════════════════════════════════════════════
            if (msg.message) {
                await lidarComComando(botSocket, msg, db, salvarDB).catch(e =>
                    console.error('[ERRO INTERNO CAPTURADO]:', e)
                );
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
            if (!gConfig) return;

            for (const participantJid of participants) {
                const numero = participantJid.split('@')[0];

                // FAKES: expulsa DDI fora do padrão configurado
                if (gConfig.fakes) {
                    const ddiPermitido = (db.config_bot && db.config_bot.ddi_permitido) || '258';
                    if (!numero.startsWith(ddiPermitido)) {
                        try {
                            await botSocket.groupParticipantsUpdate(groupId, [participantJid], 'remove');
                            await botSocket.sendMessage(groupId, {
                                text: `🌐 Número estrangeiro @${numero} removido automaticamente (DDI fora do padrão +${ddiPermitido}).`,
                                mentions: [participantJid]
                            });
                        } catch (e) {
                            console.error('[FAKES] Falha ao remover:', e.message);
                        }
                        continue;
                    }
                }

                // BOAS-VINDAS
                if (gConfig.boasvindas) {
                    const slotAtivo = gConfig.bv_ativo || 'bv1';
                    const textoBV = gConfig[slotAtivo] || gConfig.bv1 || 'Seja bem-vindo(a) ao grupo! 🌊';
                    try {
                        await botSocket.sendMessage(groupId, {
                            text: `@${numero} ${textoBV}`,
                            mentions: [participantJid]
                        });
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

// ═══════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO DO BOT
// ═══════════════════════════════════════════════════
if (process.env.PAUSAR_WHATSAPP === 'true') {
    statusConexao = "PAUSADO manualmente (PAUSAR_WHATSAPP=true)";
    console.log('[SISTEMA] PAUSAR_WHATSAPP está ativo — o bot NÃO vai tentar se conectar ao WhatsApp.');
} else {
    setTimeout(() => {
        iniciarBot().catch(err => console.error('[ERRO INICIALIZAÇÃO]:', err));
    }, 2000);
}