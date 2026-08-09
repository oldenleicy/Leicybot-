const criarUsuarioPadrao = require('./usuarioPadrao');
const { resolverIdentidade, participanteBruto, obterAlvo, temMencaoExplicita, obterMensagensRecentes, limparMensagensRecentes } = require('./jidUtils');

module.exports = async (sock, msg, comando, args, db, salvarDB, possuiPermissaoComando = false) => {
    const from = msg.key.remoteJid;
    let sender = resolverIdentidade(msg.key);
    const senderBruto = participanteBruto(msg.key);
    const isGroup = from.endsWith('@g.us');

    if (!isGroup) {
        return sock.sendMessage(from, { text: "❌ Este comando só pode ser executado dentro de grupos! 🌊" }, { quoted: msg });
    }

    // Obter metadados do grupo para validar administradores
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    // Alguns grupos representam o próprio bot via @lid; sock.user.lid (quando existe)
    // é o identificador alternativo pra esse mesmo caso.
    const botIdLid = sock.user.lid ? (sock.user.lid.includes('@') ? sock.user.lid.split(':')[0] : sock.user.lid.split(':')[0] + '@lid') : null;

    // Lista de admins, incluindo qualquer identificador alternativo (telefone) que o
    // Baileys exponha por participante — protege contra o grupo listar admins via @lid.
    const adms = [];
    participants.forEach(p => {
        if (p.admin !== null) {
            adms.push(p.id);
            const alt = p.phoneNumber || p.pn || p.jid;
            if (alt && alt !== p.id) adms.push(alt);
        }
    });

    const isAdmin = adms.includes(sender) || adms.includes(senderBruto);
    const botIsAdmin = adms.includes(botId) || (botIdLid && adms.includes(botIdLid));

    // Validação estrita de administrador OU permissão especial concedida pelo dono
    if (!isAdmin && !possuiPermissaoComando) {
        return sock.sendMessage(from, { text: "❌ *ACESSO NEGADO:* Este comando é exclusivo para os Administradores do grupo ou membros autorizados! 🛡️" }, { quoted: msg });
    }

    // Inicializar configurações do grupo no DB caso não existam.
    // Normalmente o comandos.js já faz isso primeiro (roda em toda mensagem,
    // não só quando cai aqui), então isto é só uma rede de segurança.
    if (!db.grupos) db.grupos = {};
    if (!db.grupos[from]) {
        db.grupos[from] = {
            boasvindas: false,
            antilink: false,
            antilink2: false,
            fakes: false,
            antimidia: false,
            palavras_proibidas: [],
            antiflood: null,
            modolento: null,
            fechado_ate: null,
            comandos_bloqueados: [],
            regras: "Nenhuma regra definida ainda pelo comando !setregras.",
            bv_ativo: "bv1",
            bv1: "Seja muito bem-vindo(a) ao grupo! 🌊",
            bv2: "Opa! Um novo integrante entrou no recinto! Respeite as regras e divirta-se. 💧",
            bv3: "Saudações! Nova presença detectada sob o comando de Olden! 🔥"
        };
    }
    let gConfig = db.grupos[from];
    if (gConfig.antimidia === undefined) gConfig.antimidia = false;
    if (!gConfig.palavras_proibidas) gConfig.palavras_proibidas = [];
    if (gConfig.antiflood === undefined) gConfig.antiflood = null;
    if (gConfig.modolento === undefined) gConfig.modolento = null;
    if (gConfig.fechado_ate === undefined) gConfig.fechado_ate = null;
    if (!gConfig.comandos_bloqueados) gConfig.comandos_bloqueados = [];

    switch (comando) {
        case 'menuadm': {
            const menuAdmTxt = `░▒▓█████████████████████████████████████▓▒░\n▓██      🛡️  𝗟𝗘𝗜𝗖𝗬𝗕𝗢𝗧 - 𝗠𝗢𝗗𝗘𝗥𝗔𝗖𝗔𝗢  🛡️      ██▓\n░▒▓█████████████████████████████████████▓▒░\n 🌊 Ferramentas de contenção e segurança activa.\n\n ➔ *!menuadm* ➔ Exibe este menu.\n ➔ *!adv [@user ou responda]* ➔ Adiciona 1 advertência (3 em 2 semanas = Ban Automático).\n ➔ *!ban / !kick [@user ou responda]* - Remove um infrator.\n ➔ *!promover / !rebaixar [@user ou responda]* - ADM on/off.\n ➔ *!antilink / !antilink2 [on/off]* - Apaga ou bane por link.\n ➔ *!antimidia [on/off]* - Bloqueia imagem/vídeo/áudio/figurinha.\n ➔ *!antipalavra add/rem/list [palavra]* - Lista negra de palavras.\n ➔ *!antiflood [msgs] [seg]* - Limita mensagens por intervalo (ou "off").\n ➔ *!modolento [seg]* - 1 mensagem a cada X segundos (ou "off").\n ➔ *!mutar [@user ou responda] [min]* - Silencia temporariamente.\n ➔ *!fechar [seg]* - Fecha o chat por um tempo (reabre sozinho).\n ➔ *!grupo [abrir/fechar]* - Fecha/abre sem prazo definido.\n ➔ *!bloquearcmd [comando]* - Bloqueia um comando só neste grupo.\n ➔ *!inativos [dias]* - Lista (ou remove, com confirmação) quem sumiu.\n ➔ *!limparmsg [@user ou responda]* - Apaga mensagens recentes de alguém.\n ➔ *!config* - Mostra as configurações atuais do grupo.\n ➔ *!fakes [on/off]* - Expulsa números gringos (+ de 1 DDI).\n ➔ *!limpar* - Limpa o histórico de exibição do chat.\n ➔ *!marcar [texto]* - Menciona todos os integrantes de uma vez.\n ➔ *!adms [motivo]* - Chama a equipe técnica de ADMs.\n ➔ *!setregras [texto]* / *!regras* - Define/exibe o estatuto interno.\n ➔ *!boasvindas [on/off]* - Liga/Desliga o sistema de saudações.\n ➔ *!setwelcome1 / 2 / 3 [texto]* - Modifica os slots de BV.\n ➔ *!bv1 / !bv2 / !bv3* - Escolhe qual modelo fica ativo.\n ➔ *!atividade* - Ranking de mensagens enviadas.\n ➔ *!online* - Membros que interagiram nas últimas 24h.\n░▒▓█████████████████████████████████████▓▒░`;
            await sock.sendMessage(from, { text: menuAdmTxt }, { quoted: msg });
            break;
        }

        case 'adv': {
            const alvoAdv = obterAlvo(msg);
            if (!alvoAdv) return sock.sendMessage(from, { text: "❌ Marque ou responda o membro que deseja aplicar a advertência!" }, { quoted: msg });
            if (alvoAdv === botId) return sock.sendMessage(from, { text: "❌ Você não pode dar advertências para o próprio bot." }, { quoted: msg });

            if (!db.usuarios[alvoAdv]) db.usuarios[alvoAdv] = criarUsuarioPadrao();
            if (!db.usuarios[alvoAdv].advertencias) db.usuarios[alvoAdv].advertencias = [];

            const timestampAgora = Date.now();
            db.usuarios[alvoAdv].advertencias.push(timestampAgora);

            const duasSemanasEmMs = 14 * 24 * 60 * 60 * 1000;
            const advsRecentes = db.usuarios[alvoAdv].advertencias.filter(t => (timestampAgora - t) <= duasSemanasEmMs);

            db.usuarios[alvoAdv].advertencias = advsRecentes;
            salvarDB(db);

            const totalAdvs = advsRecentes.length;

            if (totalAdvs >= 3) {
                if (!botIsAdmin) {
                    return sock.sendMessage(from, { text: `🚨 *LIMITE ALCANÇADO:* O membro @${alvoAdv.split('@')[0]} atingiu ${totalAdvs} advertências em menos de 2 semanas! Porém, não posso bani-lo porque não sou Administrador do grupo! 💧`, mentions: [alvoAdv] }, { quoted: msg });
                }
                await sock.groupParticipantsUpdate(from, [alvoAdv], "remove");
                db.usuarios[alvoAdv].advertencias = [];
                salvarDB(db);
                await sock.sendMessage(from, { text: `🔨 *BAN AUTOMÁTICO:* O usuário @${alvoAdv.split('@')[0]} acumulou ${totalAdvs} advertências dentro do prazo de 2 semanas e foi banido do grupo!`, mentions: [alvoAdv] });
            } else {
                await sock.sendMessage(from, { text: `⚠️ *ADVERTÊNCIA APLICADA:* O usuário @${alvoAdv.split('@')[0]} recebeu uma advertência da moderação.\n\n📊 *Status:* [${totalAdvs}/3] advertências ativas nas últimas 2 semanas. Evite o acúmulo para não ser banido!`, mentions: [alvoAdv] }, { quoted: msg });
            }
            break;
        }

        case 'boasvindas': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) {
                return sock.sendMessage(from, { text: "🌊 Use: *!boasvindas on* ou *!boasvindas off*" }, { quoted: msg });
            }
            gConfig.boasvindas = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `👋 Sistema de *Boas-Vindas* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'ban':
        case 'kick': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para remover membros! 💧" }, { quoted: msg });
            const alvoBan = obterAlvo(msg);
            if (!alvoBan) return sock.sendMessage(from, { text: "❌ Marque ou responda o membro que deseja banir!" }, { quoted: msg });
            if (alvoBan === botId) return sock.sendMessage(from, { text: "🤔 Tentar me banir usando meus próprios comandos? Genial." }, { quoted: msg });

            await sock.groupParticipantsUpdate(from, [alvoBan], "remove");
            await sock.sendMessage(from, { text: `🔨 *JUSTIÇA APLICADA:* @${alvoBan.split('@')[0]} foi devidamente removido do grupo por má conduta!`, mentions: [alvoBan] }, { quoted: msg });
            break;
        }

        case 'promover': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para alterar cargos!" }, { quoted: msg });
            const alvoPromover = obterAlvo(msg);
            if (!alvoPromover) return sock.sendMessage(from, { text: "❌ Marque ou responda o membro para torná-lo ADM!" }, { quoted: msg });

            await sock.groupParticipantsUpdate(from, [alvoPromover], "promote");
            await sock.sendMessage(from, { text: `✨ Novo Administrador alocado: @${alvoPromover.split('@')[0]}!`, mentions: [alvoPromover] }, { quoted: msg });
            break;
        }

        case 'rebaixar': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para alterar cargos!" }, { quoted: msg });
            const alvoRebaixar = obterAlvo(msg);
            if (!alvoRebaixar) return sock.sendMessage(from, { text: "❌ Marque ou responda o administrador que deseja rebaixar!" }, { quoted: msg });

            await sock.groupParticipantsUpdate(from, [alvoRebaixar], "demote");
            await sock.sendMessage(from, { text: `📉 O membro @${alvoRebaixar.split('@')[0]} perdeu suas credenciais administrativas!`, mentions: [alvoRebaixar] }, { quoted: msg });
            break;
        }

        case 'antilink': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink on* ou *!antilink off*" }, { quoted: msg });
            gConfig.antilink = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🛡️ Sistema *Anti-Links Comuns* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'antilink2': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antilink2 on* ou *!antilink2 off* (Modo Hard-Ban)" }, { quoted: msg });
            gConfig.antilink2 = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚨 Sistema *Anti-Links Modo Hard (Ban)* definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'antimidia': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!antimidia on* ou *!antimidia off*" }, { quoted: msg });
            gConfig.antimidia = args[0] === 'on';
            salvarDB(db);
            let avisoBotAdmMidia = botIsAdmin ? "" : "\n⚠️ Atenção: não sou administrador aqui, então não vou conseguir apagar as mídias enviadas.";
            await sock.sendMessage(from, { text: `📵 Bloqueio de mídia (imagem/vídeo/áudio/figurinha/documento) definido como: *${args[0].toUpperCase()}*.${avisoBotAdmMidia}` }, { quoted: msg });
            break;
        }

        case 'antipalavra': {
            const acaoPalavra = args[0]?.toLowerCase();
            const palavraAlvo = args.slice(1).join(" ").trim().toLowerCase();
            gConfig.palavras_proibidas = gConfig.palavras_proibidas || [];

            if (acaoPalavra === 'add' && palavraAlvo) {
                if (!gConfig.palavras_proibidas.includes(palavraAlvo)) gConfig.palavras_proibidas.push(palavraAlvo);
                salvarDB(db);
                return sock.sendMessage(from, { text: `🚫 Palavra *"${palavraAlvo}"* adicionada à lista negra do grupo.` }, { quoted: msg });
            }
            if (acaoPalavra === 'rem' && palavraAlvo) {
                gConfig.palavras_proibidas = gConfig.palavras_proibidas.filter(p => p !== palavraAlvo);
                salvarDB(db);
                return sock.sendMessage(from, { text: `✅ Palavra *"${palavraAlvo}"* removida da lista negra.` }, { quoted: msg });
            }
            if (acaoPalavra === 'list') {
                const listaTxt = gConfig.palavras_proibidas.length > 0 ? gConfig.palavras_proibidas.map(p => `• ${p}`).join("\n") : "(lista vazia)";
                return sock.sendMessage(from, { text: `🚫 *LISTA NEGRA DO GRUPO:*\n\n${listaTxt}` }, { quoted: msg });
            }
            return sock.sendMessage(from, { text: "❌ Uso: *!antipalavra add [palavra]* / *!antipalavra rem [palavra]* / *!antipalavra list*" }, { quoted: msg });
        }

        case 'antiflood': {
            if (args[0] === 'off') {
                gConfig.antiflood = null;
                salvarDB(db);
                return sock.sendMessage(from, { text: "✅ Anti-flood desativado neste grupo." }, { quoted: msg });
            }
            const maxMsgs = parseInt(args[0]);
            const intervaloSeg = parseInt(args[1]);
            if (!maxMsgs || !intervaloSeg || maxMsgs <= 0 || intervaloSeg <= 0) {
                return sock.sendMessage(from, { text: "❌ Uso: *!antiflood [mensagens] [segundos]* Ex: `!antiflood 5 10` — ou *!antiflood off* pra desativar." }, { quoted: msg });
            }
            gConfig.antiflood = { max: maxMsgs, intervalo: intervaloSeg, acao: 'mute' };
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚨 Anti-flood ativado: mais de *${maxMsgs} mensagens* em *${intervaloSeg}s* aplica silenciamento automático de 5 minutos.` }, { quoted: msg });
            break;
        }

        case 'modolento': {
            if (args[0] === 'off') {
                gConfig.modolento = null;
                salvarDB(db);
                return sock.sendMessage(from, { text: "✅ Modo lento desativado neste grupo." }, { quoted: msg });
            }
            const segundosLento = parseInt(args[0]);
            if (!segundosLento || segundosLento <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!modolento [segundos]* — ou *!modolento off* pra desativar." }, { quoted: msg });
            gConfig.modolento = segundosLento;
            salvarDB(db);
            await sock.sendMessage(from, { text: `🐌 Modo lento ativado: 1 mensagem a cada *${segundosLento}s* por pessoa.` }, { quoted: msg });
            break;
        }

        case 'mutar': {
            const teveMencaoMutar = temMencaoExplicita(msg);
            const alvoMutar = obterAlvo(msg);
            const minutosMutar = parseInt(teveMencaoMutar ? args[1] : args[0]);
            if (!alvoMutar || !minutosMutar || minutosMutar <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!mutar [@membro ou responda] [minutos]*" }, { quoted: msg });
            if (alvoMutar === botId) return sock.sendMessage(from, { text: "🤔 Não posso me mutar." }, { quoted: msg });

            if (!db.usuarios[alvoMutar]) db.usuarios[alvoMutar] = criarUsuarioPadrao();
            db.usuarios[alvoMutar].mutado_ate = Date.now() + minutosMutar * 60000;
            salvarDB(db);
            let avisoBotAdmMutar = botIsAdmin ? "" : "\n⚠️ Atenção: não sou administrador aqui, então não vou conseguir apagar as mensagens dele(a) enquanto estiver mutado.";
            await sock.sendMessage(from, { text: `🔇 @${alvoMutar.split('@')[0]} foi silenciado por *${minutosMutar} minutos*.${avisoBotAdmMutar}`, mentions: [alvoMutar] }, { quoted: msg });
            break;
        }

        case 'fechar': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para fechar o grupo!" }, { quoted: msg });
            const segundosFechar = parseInt(args[0]);
            if (!segundosFechar || segundosFechar <= 0) return sock.sendMessage(from, { text: "❌ Uso: *!fechar [segundos]* Ex: `!fechar 300` (fecha por 5 minutos)" }, { quoted: msg });

            gConfig.fechado_ate = Date.now() + segundosFechar * 1000;
            salvarDB(db);
            await sock.groupSettingUpdate(from, 'announcement');
            await sock.sendMessage(from, { text: `🔒 *CHAT FECHADO TEMPORARIAMENTE:* Só administradores podem falar pelos próximos *${segundosFechar} segundos*. Reabre sozinho depois disso.` }, { quoted: msg });
            break;
        }

        case 'grupo': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso de privilégios de ADM para alterar o status do grupo!" }, { quoted: msg });
            if (args[0] === 'fechar') {
                gConfig.fechado_ate = null; // !grupo fechar é sem prazo — cancela qualquer !fechar temporizado pendente
                salvarDB(db);
                await sock.groupSettingUpdate(from, 'announcement');
                await sock.sendMessage(from, { text: "🔒 *CHAT FECHADO:* Apenas administradores podem enviar mensagens a partir de agora!" }, { quoted: msg });
            } else if (args[0] === 'abrir') {
                gConfig.fechado_ate = null;
                salvarDB(db);
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sock.sendMessage(from, { text: "🔓 *CHAT ABERTO:* Todos os integrantes já podem interagir livremente! 🌊" }, { quoted: msg });
            } else {
                return sock.sendMessage(from, { text: "❌ Use: *!grupo abrir* ou *!grupo fechar*" }, { quoted: msg });
            }
            break;
        }

        case 'bloquearcmd': {
            const cmdBloquear = args[0]?.toLowerCase().replace('!', '');
            if (!cmdBloquear) return sock.sendMessage(from, { text: "❌ Uso: *!bloquearcmd [nome_do_comando]* (manda de novo pra desbloquear)" }, { quoted: msg });

            gConfig.comandos_bloqueados = gConfig.comandos_bloqueados || [];
            if (gConfig.comandos_bloqueados.includes(cmdBloquear)) {
                gConfig.comandos_bloqueados = gConfig.comandos_bloqueados.filter(c => c !== cmdBloquear);
                salvarDB(db);
                return sock.sendMessage(from, { text: `✅ O comando *!${cmdBloquear}* foi desbloqueado neste grupo.` }, { quoted: msg });
            }
            gConfig.comandos_bloqueados.push(cmdBloquear);
            salvarDB(db);
            await sock.sendMessage(from, { text: `🚫 O comando *!${cmdBloquear}* foi bloqueado neste grupo. Manda *!bloquearcmd ${cmdBloquear}* de novo pra desbloquear.` }, { quoted: msg });
            break;
        }

        case 'config': {
            const statusOnOff = (v) => v ? "🟢 ON" : "🔴 OFF";
            let txtConfig = `⚙️ *CONFIGURAÇÕES DESTE GRUPO*\n\n`;
            txtConfig += ` • Boas-vindas: ${statusOnOff(gConfig.boasvindas)} (modelo ativo: ${gConfig.bv_ativo})\n`;
            txtConfig += ` • Antilink: ${statusOnOff(gConfig.antilink)}\n`;
            txtConfig += ` • Antilink Hard (ban): ${statusOnOff(gConfig.antilink2)}\n`;
            txtConfig += ` • Antifakes (DDI estrangeiro): ${statusOnOff(gConfig.fakes)}\n`;
            txtConfig += ` • Antimídia: ${statusOnOff(gConfig.antimidia)}\n`;
            txtConfig += ` • Palavras bloqueadas: ${(gConfig.palavras_proibidas || []).length}\n`;
            txtConfig += ` • Anti-flood: ${gConfig.antiflood ? `${gConfig.antiflood.max} msgs / ${gConfig.antiflood.intervalo}s` : "🔴 OFF"}\n`;
            txtConfig += ` • Modo lento: ${gConfig.modolento ? `${gConfig.modolento}s entre mensagens` : "🔴 OFF"}\n`;
            txtConfig += ` • Chat fechado (temporizado) até: ${gConfig.fechado_ate && gConfig.fechado_ate > Date.now() ? new Date(gConfig.fechado_ate).toLocaleTimeString() : "não está fechado"}\n`;
            txtConfig += ` • Comandos bloqueados aqui: ${(gConfig.comandos_bloqueados || []).length > 0 ? gConfig.comandos_bloqueados.join(', ') : "nenhum"}\n`;
            await sock.sendMessage(from, { text: txtConfig }, { quoted: msg });
            break;
        }

        case 'inativos': {
            const diasInativo = parseInt(args[0]) || 7;
            const limiteMs = diasInativo * 24 * 60 * 60 * 1000;
            const agoraInativos = Date.now();

            const listaInativos = participants
                .map(p => p.id)
                .filter(id => id !== botId)
                .filter(id => !db.usuarios[id]?.ultima_interacao || (agoraInativos - db.usuarios[id].ultima_interacao) > limiteMs);

            if (listaInativos.length === 0) {
                return sock.sendMessage(from, { text: `✅ Ninguém parece estar inativo há mais de ${diasInativo} dias.` }, { quoted: msg });
            }

            const querRemover = args[1] === 'remover';
            if (!querRemover) {
                let txtInativos = `😴 *MEMBROS INATIVOS (${diasInativo}+ dias, ${listaInativos.length}):*\n\n`;
                listaInativos.forEach(id => { txtInativos += ` • @${id.split('@')[0]}\n`; });
                txtInativos += `\n👉 Pra remover todo mundo dessa lista, use: *!inativos ${diasInativo} remover confirmar*`;
                return sock.sendMessage(from, { text: txtInativos, mentions: listaInativos }, { quoted: msg });
            }

            if (args[2] !== 'confirmar') {
                return sock.sendMessage(from, { text: `⚠️ Isso vai remover *${listaInativos.length} pessoa(s)* do grupo! Pra confirmar, use: *!inativos ${diasInativo} remover confirmar*` }, { quoted: msg });
            }

            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para remover membros!" }, { quoted: msg });

            let removidosOk = 0;
            for (const idInativo of listaInativos) {
                try {
                    await sock.groupParticipantsUpdate(from, [idInativo], "remove");
                    removidosOk++;
                } catch (e) { /* segue pro próximo */ }
            }
            await sock.sendMessage(from, { text: `🧹 *LIMPEZA CONCLUÍDA:* ${removidosOk} de ${listaInativos.length} membro(s) inativo(s) removido(s).` }, { quoted: msg });
            break;
        }

        case 'limparmsg': {
            if (!botIsAdmin) return sock.sendMessage(from, { text: "❌ Preciso ser Administrador para apagar mensagens de outras pessoas!" }, { quoted: msg });
            const alvoLimpar = obterAlvo(msg);
            if (!alvoLimpar) return sock.sendMessage(from, { text: "❌ Marque ou responda a mensagem de quem você quer limpar! Ex: `!limparmsg @membro`" }, { quoted: msg });

            const chavesRecentes = obterMensagensRecentes(from, alvoLimpar);
            if (chavesRecentes.length === 0) {
                return sock.sendMessage(from, { text: "❌ Não tenho nenhuma mensagem recente registrada dessa pessoa (só apago mensagens enviadas depois que o bot ligou pela última vez)." }, { quoted: msg });
            }

            let apagadasOk = 0;
            for (const chaveMsg of chavesRecentes) {
                try {
                    await sock.sendMessage(from, { delete: chaveMsg });
                    apagadasOk++;
                } catch (e) { /* segue pra próxima */ }
            }
            limparMensagensRecentes(from, alvoLimpar);
            await sock.sendMessage(from, { text: `🧹 *${apagadasOk}* mensagem(ns) recente(s) de @${alvoLimpar.split('@')[0]} apagada(s)!`, mentions: [alvoLimpar] }, { quoted: msg });
            break;
        }

        case 'fakes': {
            if (!args[0] || (args[0] !== 'on' && args[0] !== 'off')) return sock.sendMessage(from, { text: "🌊 Use: *!fakes on* ou *!fakes off*" }, { quoted: msg });
            gConfig.fakes = args[0] === 'on';
            salvarDB(db);
            await sock.sendMessage(from, { text: `🌐 Bloqueio automático de DDI estrangeiro definido como: *${args[0].toUpperCase()}*.` }, { quoted: msg });
            break;
        }

        case 'limpar': {
            let blocosVazios = " \n".repeat(250) + "🧹 *Histórico do chat limpo pela moderação!* 🌊";
            await sock.sendMessage(from, { text: blocosVazios });
            break;
        }

        case 'marcar': {
            let todosMembros = participants.map(p => p.id);
            let mencTxt = `📣 *𝗠𝗔𝗥𝗖𝗔𝗖𝗔𝗢 𝗚𝗘𝗥𝗔𝗟 𝗠𝗢𝗗𝗘𝗥𝗔𝗖𝗔𝗢* 📣\n\n💬 *Aviso:* ${args.join(" ") || "Olhem o chat!"}\n\n`;
            todosMembros.forEach(m => { mencTxt += `➔ @${m.split('@')[0]}\n`; });
            await sock.sendMessage(from, { text: mencTxt, mentions: todosMembros });
            break;
        }

        case 'adms': {
            let apenasAdms = participants.filter(p => p.admin !== null).map(p => p.id);
            let admTxt = `🛡️ *𝗖𝗛𝗔𝗠𝗔𝗡𝗗𝗢 𝗔𝗗𝗠𝗜𝗡𝗜𝗦𝗧𝗥𝗔𝗗𝗢𝗥𝗘𝗦* 🛡️\n\n📌 *Chamado por:* @${sender.split('@')[0]}\n⚠️ *Motivo:* ${args.join(" ") || "Revisar infração no grupo."}\n\n`;
            apenasAdms.forEach(a => { admTxt += `⚡ @${a.split('@')[0]}\n`; });
            await sock.sendMessage(from, { text: admTxt, mentions: [...apenasAdms, sender] }, { quoted: msg });
            break;
        }

        case 'setregras': {
            if (!args[0]) return sock.sendMessage(from, { text: "❌ Forneça o texto com as novas regras! Ex: `!setregras 1. Sem Spam`" }, { quoted: msg });
            gConfig.regras = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: "📝 *ESTATUTO CONFIGURADO:* As regras oficiais do grupo foram salvas com sucesso! Use *!regras* para ler." }, { quoted: msg });
            break;
        }

        case 'regras': {
            const regrasTxt = `╔═══════════════════════════════════════╗\n          📜  𝗡𝗢𝗥𝗠𝗔𝗦 𝗗𝗢 𝗚𝗥𝗨𝗣𝗢  📜\n╚═══════════════════════════════════════╗\n\n ${gConfig.regras || "Nenhuma regra cadastrada ainda."}\n\n─────────────────────────────────────────\n 🌊 Evite punições, colabore com o grupo! 💧\n╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: regrasTxt }, { quoted: msg });
            break;
        }

        case 'setwelcome1':
        case 'setwelcome2':
        case 'setwelcome3': {
            const slotNum = comando.replace('setwelcome', '');
            if (!args[0]) return sock.sendMessage(from, { text: `❌ Digite o texto para salvar no slot de Boas-Vindas ${slotNum}!` }, { quoted: msg });
            gConfig[`bv${slotNum}`] = args.join(" ");
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ *SLOT DE BOAS-VINDAS ${slotNum} CONFIGURADO!*` }, { quoted: msg });
            break;
        }

        case 'bv1':
        case 'bv2':
        case 'bv3': {
            gConfig.bv_ativo = comando;
            salvarDB(db);
            await sock.sendMessage(from, { text: `✅ Modelo de Boas-Vindas *${comando.toUpperCase()}* selecionado como ativo!\n\n📋 *Prévia:*\n${gConfig[comando] || ("(slot vazio, configure com !setwelcome" + comando.replace('bv', '') + ")")}` }, { quoted: msg });
            break;
        }

        case 'atividade': {
            const idsGrupoAtiv = participants.map(p => p.id);
            const rankAtividade = idsGrupoAtiv
                .filter(id => db.usuarios[id])
                .map(id => ({ id, msgs: db.usuarios[id].mensagens_contadas || 0 }))
                .sort((a, b) => b.msgs - a.msgs)
                .slice(0, 15);

            let atividadeTxt = `╔═══════════════════════════════════════╗\n          📊  𝗥𝗔𝗡𝗞𝗜𝗡𝗚 𝗗𝗘 𝗔𝗧𝗜𝗩𝗜𝗗𝗔𝗗𝗘  📊\n╚═══════════════════════════════════════╗\n\n`;
            if (rankAtividade.length === 0) {
                atividadeTxt += "Nenhum dado de atividade registrado ainda.\n";
            } else {
                rankAtividade.forEach((m, idx) => { atividadeTxt += ` ${idx + 1}º ➔ @${m.id.split('@')[0]} — ${m.msgs} mensagens\n`; });
            }
            atividadeTxt += `╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: atividadeTxt, mentions: rankAtividade.map(m => m.id) }, { quoted: msg });
            break;
        }

        case 'online': {
            const agora = Date.now();
            const idsGrupoOnline = participants.map(p => p.id);
            const recentes = idsGrupoOnline
                .filter(id => db.usuarios[id]?.ultima_interacao && (agora - db.usuarios[id].ultima_interacao) < 86400000)
                .sort((a, b) => db.usuarios[b].ultima_interacao - db.usuarios[a].ultima_interacao);

            let onlineTxt = `╔═══════════════════════════════════════╗\n          🟢  𝗠𝗘𝗠𝗕𝗥𝗢𝗦 𝗔𝗧𝗜𝗩𝗢𝗦 (𝟮𝟰𝗵)  🟢\n╚═══════════════════════════════════════╗\n\n`;
            if (recentes.length === 0) {
                onlineTxt += "Nenhuma atividade registrada nas últimas 24 horas.\n";
            } else {
                recentes.forEach(id => { onlineTxt += ` 🟢 @${id.split('@')[0]}\n`; });
            }
            onlineTxt += `╚═══════════════════════════════════════╝`;
            await sock.sendMessage(from, { text: onlineTxt, mentions: recentes }, { quoted: msg });
            break;
        }

        default:
            break;
    }
};
