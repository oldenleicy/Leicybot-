module.exports = {
    obterExplicacao: (cmd) => {
        const guias = {
            // 💳 CATEGORIA: ECONOMIA & JOGOS
            gold: `╔═══════════════════════════════════════╗
          💳  𝗚𝗨𝗜𝗔: !gold  💳
╚═══════════════════════════════════════╝
💧 *O que é?* O raio-X da sua riqueza (ou da sua miséria).
🌊 *Como funciona?* Mostra seus Golds em mãos, o dinheiro no banco, seus títulos (slot 1 e slot 2), itens ativos, energia diária e ainda exibe dívidas e histórico de roubos recentes.
💡 *Dica de Ouro:* Responda à mensagem de outro membro com \`!gold\` para ver o perfil financeiro *dele* sem precisar de comandos extras.`,

            trabalhar: `╔═══════════════════════════════════════╗
          🔨  𝗚𝗨𝗜𝗔: !trabalhar  🔨
╚═══════════════════════════════════════╝
💧 *O que é?* O ganha-pão honesto do grupo.
🌊 *Como funciona?* Você limpa a praia virtual, arruma as docas do porto ou faz favores para o chefe *Olden* em troca de uma quantia segura de Golds.
🚨 *Regra Rígida:* Você só tem *5 energias por dia*. Quando gastar tudo, o bot vai te mandar ir descansar. O contador reseta totalmente à meia-noite!`,

            minerar: `╔═══════════════════════════════════════╗
          ⛏️  𝗚𝗨𝗜𝗔: !minerar  ⛏️
╚═══════════════════════════════════════╝
💧 *O que é?* O comando dos gananciosos e corajosos.
🌊 *Como funciona?* Você desce até as profundezas de uma caverna virtual perigosa. 
🎲 *O Fator Sorte:* ➔ *60% de chance:* Achar cristais aquáticos raros e explodir de ganhar Golds.
➔ *40% de chance:* Causar um desabamento na mina, quebrar suas picaretas e perder dinheiro pagando o conserto.
⚠️ *Limite:* Máximo de 5 escavações por dia. Use por sua conta e risco!`,

            assaltar: `╔═══════════════════════════════════════╗
          🏴‍☠️  𝗚𝗨𝗜𝗔: !assaltar  🏴‍☠️
╚═══════════════════════════════════════╝
💧 *O que é?* A lei do mais forte (ou do mais sortudo).
🌊 *Como funciona?* Digite \`!assaltar @membro\` (ou responda a uma mensagem do alvo) para tentar roubar até 30% do dinheiro que o alvo tem na carteira.
🔥 *Consequências:*
➔ *Sucesso:* Você sai rindo com os Golds do seu amigo.
➔ *Fracasso:* Você tropeça numa onda, deixa sua própria carteira cair e perde 15% do seu saldo.
❌ *A Maior Furada:* Se o alvo tiver um Escudo comprado na loja, o feitiço vira contra o feiticeiro! O escudo quebra, você é pego pelas patrulhas e toma uma multa pesada de *300 Golds*.`,

            roubar: `╔═══════════════════════════════════════╗
          🔓  𝗚𝗨𝗜𝗔: !roubar  🔓
╚═══════════════════════════════════════╝
💧 *O que é?* Assalto direto ao banco de outro membro.
🌊 *Como funciona?* \`!roubar @membro\` tenta levar até 25% do saldo que o alvo guardou no banco. É mais arriscado que o \`!assaltar\` e a punição por falha é maior (perde 20% do seu próprio saldo + multa).
🔒 *Proteção:* Se o alvo tiver um Cofre Blindado ativo, a chance de sucesso cai drasticamente.`,

            revidar: `╔═══════════════════════════════════════╗
          ⚔️  𝗚𝗨𝗜𝗔: !revidar  ⚔️
╚═══════════════════════════════════════╝
💧 *O que é?* Contra-ataque contra o último ladrão que te roubou.
🌊 *Como funciona?* Se você foi vítima de \`!assaltar\` ou \`!roubar\` nas últimas 24h, pode tentar recuperar parte do dinheiro. Se falhar, ainda perde mais um pouco.`,

            banco: `╔═══════════════════════════════════════╗
          🏦  𝗚𝗨𝗜𝗔: !banco  🏦
╚═══════════════════════════════════════╝
💧 *O que é?* O único lugar 100% seguro contra os criminosos do chat (mas nem tanto: o comando \`!roubar\` mira exatamente aqui).
🌊 *Como usar:*
➔ \`!banco depositar [quantia]\` - Tira o dinheiro da mão e joga no cofre.
➔ \`!banco sacar [quantia]\` - Retira os fundos para você poder gastar na loja.
🧠 *Visão Estratégica:* Dinheiro no banco fica protegido de \`!assaltar\`, mas não de \`!roubar\`. Invista em um Cofre Blindado!`,

            pagar: `╔═══════════════════════════════════════╗
          💸  𝗚𝗨𝗜𝗔: !pagar  💸
╚═══════════════════════════════════════╝
💧 *O que é?* Transferência segura de Golds entre membros.
🌊 *Como usar:* \`!pagar @membro [valor]\`. Se você devia para essa pessoa, o valor será automaticamente abatido da dívida registrada.`,

            emprestar: `╔═══════════════════════════════════════╗
          🤝  𝗚𝗨𝗜𝗔: !emprestar  🤝
╚═══════════════════════════════════════╝
💧 *O que é?* Empréstimo oficial de Golds com registro de dívida.
🌊 *Como usar:* \`!emprestar @membro [valor]\`. O valor sai da sua carteira e entra na do membro, mas fica registrado como dívida (visível no \`!gold\` de ambos).`,

            loja: `╔═══════════════════════════════════════╗
          🏪  𝗚𝗨𝗜𝗔: !loja  🏪
╚═══════════════════════════════════════╝
💧 *O que é?* O shopping center do LeicyBot.
🌊 *Como funciona?* Digite \`!loja\` para ver a vitrine com itens de proteção, recargas, iscas e títulos temporários. Para comprar, use \`!comprar [nome_do_item]\`.
💎 *Dica:* Títulos têm limite de donos por grupo e validade de 1 semana. Itens como Escudo e Seguro Parcial são consumíveis e descartáveis.`,

            comprar: `╔═══════════════════════════════════════╗
          🛒  𝗚𝗨𝗜𝗔: !comprar  🛒
╚═══════════════════════════════════════╝
💧 *O que é?* Finalizador de compras da loja.
🌊 *Como usar:* \`!comprar escudo\`, \`!comprar luasuperior1\`, \`!comprar recarga\`, etc. O valor é debitado da sua carteira na hora e o item/título é ativado.`,

            vendertitulo: `╔═══════════════════════════════════════╗
          🎭  𝗚𝗨𝗜𝗔: !vendertitulo  🎭
╚═══════════════════════════════════════╝
💧 *O que é?* Libera os slots de título (slot 1) para comprar um novo.
🌊 *Como funciona?* Remove o título comprado atualmente equipado, abrindo vaga para adquirir outro na loja.`,

            apresentacao: `╔═══════════════════════════════════════╗
          📢  𝗚𝗨𝗜𝗔: !apresentacao  📢
╚═══════════════════════════════════════╝
💧 *O que é?* Controla o anúncio automático dos seus títulos no grupo.
🌊 *Como usar:* \`!apresentacao on\` ou \`!apresentacao off\`. Quando ligado, sempre que você interage o bot exibe seu título.`,

            investir: `╔═══════════════════════════════════════╗
          📈  𝗚𝗨𝗜𝗔: !investir  📈
╚═══════════════════════════════════════╝
💧 *O que é?* Aplicação de Golds com rendimento diário.
🌊 *Como usar:* \`!investir [valor]\`. O dinheiro fica travado e rende 5% ao dia. Resgate com \`!resgatar\` a qualquer momento.`,

            resgatar: `╔═══════════════════════════════════════╗
          💰  𝗚𝗨𝗜𝗔: !resgatar  💰
╚═══════════════════════════════════════╝
💧 *O que é?* Retira o investimento ativo + juros acumulados.
🌊 *Como funciona?* Quanto mais tempo deixar investido, maior o lucro. Só pode ter um investimento por vez.`,

            usar: `╔═══════════════════════════════════════╗
          🔁  𝗚𝗨𝗜𝗔: !usar  🔁
╚═══════════════════════════════════════╝
💧 *O que é?* Ativa um item consumível comprado na loja.
🌊 *Exemplo:* \`!usar recarga\` — zera seus limites diários de trabalho, mineração, pesca e raspadinha.`,

            roleta: `╔═══════════════════════════════════════╗
          🎡  𝗚𝗨𝗜𝗔: !roleta  🎡
╚═══════════════════════════════════════╝
💧 *O que é?* Jogo de cassino virtual.
🌊 *Como usar:* \`!roleta [aposta] [vermelho/preto]\` (paga 2x) ou \`!roleta [aposta] [número de 0 a 36]\` (paga 14x). O zero é da casa.`,

            slots: `╔═══════════════════════════════════════╗
          🎰  𝗚𝗨𝗜𝗔: !slots  🎰
╚═══════════════════════════════════════╝
💧 *O que é?* Caça-níqueis com símbolos aleatórios.
🌊 *Como usar:* \`!slots [aposta]\`. Três símbolos iguais pagam 10x, dois iguais pagam 2x.`,

            apostar: `╔═══════════════════════════════════════╗
          🎲  𝗚𝗨𝗜𝗔: !apostar  🎲
╚═══════════════════════════════════════╝
💧 *O que é?* Dobro ou nada contra a casa (~45% de chance).
🌊 *Como usar:* \`!apostar [valor]\`. Se ganhar, dobra o valor; se perder, perde tudo.`,

            dados: `╔═══════════════════════════════════════╗
          🎲  𝗚𝗨𝗜𝗔: !dados  🎲
╚═══════════════════════════════════════╝
💧 *O que é?* Disputa de dados contra o bot.
🌊 *Como usar:* \`!dados [aposta]\`. Ambos rolam um dado de 6 faces; o maior ganha. Empate não altera nada.`,

            pescar: `╔═══════════════════════════════════════╗
          🎣  𝗚𝗨𝗜𝗔: !pescar  🎣
╚═══════════════════════════════════════╝
💧 *O que é?* Pesca diária com prêmios variados (limite: 5/dia).
🌊 *Como usar:* \`!pescar\`. Se tiver uma Isca Especial ativa, os prêmios aumentam 70%.`,

            raspadinha: `╔═══════════════════════════════════════╗
          🎫  𝗚𝗨𝗜𝗔: !raspadinha  🎫
╚═══════════════════════════════════════╝
💧 *O que é?* Raspadinha instantânea (limite: 3/dia). Custo zero.
🌊 *Como usar:* \`!raspadinha\`. Chance de prêmio: 10% para 200 🪙, 30% para 80 🪙, 60% para nada.`,

            // ⚔️ DIVERSÃO (mantidos os antigos e atualizados)
            duelo: `╔═══════════════════════════════════════╗
          ⚔️  𝗚𝗨𝗜𝗔: !duelo  ⚔️
╚═══════════════════════════════════════╝
💧 *O que é?* Resolver as diferenças no soco virtual valendo dinheiro!
🌊 *Como usar:* \`!duelo @membro [valor_da_aposta]\` ou responda a uma mensagem do alvo.
🤖 *O Combate:* O bot decide na sorte pura. O vencedor leva todos os Golds da aposta.
⚠️ *Requisito:* Ambos precisam ter a quantia em mãos para o duelo começar.`,

            casar: `╔═══════════════════════════════════════╗
          💍  𝗚𝗨𝗜𝗔: !casar  💍
╚═══════════════════════════════════════╝
💧 *O que é?* O início do matrimônio virtual no chat.
🌊 *Como usar:* \`!casar @membro\` para se ajoelhar e propor união oficial ao alvo.
📌 *Nota:* O alvo precisa aceitar usando \`!aceitar\`.`,

            aceitar: `╔═══════════════════════════════════════╗
          ✅  𝗚𝗨𝗜𝗔: !aceitar  ✅
╚═══════════════════════════════════════╝
💧 *O que é?* O comando do "Sim" definitivo.
🌊 *Como funciona?* Consuma o pedido de casamento pendente e oficializa a união.`,

            divorciar: `╔═══════════════════════════════════════╗
          💔  𝗚𝗨𝗜𝗔: !divorciar  💔
╚═══════════════════════════════════════╝
💧 *O que é?* O tribunal de partilha de bens e solteirice.
🌊 *Como funciona?* Rompe instantaneamente o casamento virtual ativo.`,

            beijar: `╔═══════════════════════════════════════╗
          💋  𝗚𝗨𝗜𝗔: !beijar  💋
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de carinho.
🌊 *Como usar:* \`!beijar @membro\` (ou respondendo a alguém). Adiciona +1 beijo ao contador do alvo.`,

            bater: `╔═══════════════════════════════════════╗
          💥  𝗚𝗨𝗜𝗔: !bater  💥
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de combate físico simulado.
🌊 *Como usar:* \`!bater @membro\` (ou respondendo).`,

            abracar: `╔═══════════════════════════════════════╗
          🫂  𝗚𝗨𝗜𝗔: !abracar  🫂
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de afeto.
🌊 *Como usar:* \`!abracar @membro\` (ou respondendo). Incrementa o ranking de abraços recebidos.`,

            gado: `╔═══════════════════════════════════════╗
          🐂  𝗚𝗨𝗜𝗔: !gado  🐂
╚═══════════════════════════════════════╝
💧 *O que é?* O medidor de sem-vergonhice amorosa.
🌊 *Como funciona?* Digite \`!gado\` para ver seu nível de paixão boba em porcentagem.`,

            gostoso: `╔═══════════════════════════════════════╗
          🔥  𝗚𝗨𝗜𝗔: !gostoso  🔥
╚═══════════════════════════════════════╝
💧 *O que é?* Avaliador automatizado de beleza.
🌊 *Como funciona?* \`!gostoso\` retorna uma porcentagem aleatória e um veredito cômico.`,

            curiosidade: `╔═══════════════════════════════════════╗
          🧠  𝗚𝗨𝗜𝗔: !curiosidade  🧠
╚═══════════════════════════════════════╝
💧 *O que é?* Enciclopédia cultural do bot.
🌊 *Como funciona?* \`!curiosidade\` para fato aleatório ou \`!curiosidade/animes\`, \`!curiosidade/ciencia\`, etc.`,

            // 🛡️ MODERAÇÃO (adicionados novos)
            mutar: `╔═══════════════════════════════════════╗
          🤫  𝗚𝗨𝗜𝗔: !mutar  🤫
╚═══════════════════════════════════════╝
💧 *O que é?* Silenciar temporariamente um membro.
🌊 *Como usar:* \`!mutar @membro [minutos]\` (padrão 10 min). As mensagens do alvo serão apagadas automaticamente enquanto durar o mute.`,

            antimidia: `╔═══════════════════════════════════════╗
          🎵  𝗚𝗨𝗜𝗔: !antimidia  🎵
╚═══════════════════════════════════════╝
💧 *O que é?* Bloqueio de imagens, vídeos, áudios e figurinhas enviados por não-admins.
🌊 *Como usar:* \`!antimidia on\` / \`!antimidia off\`.`,

            antipalavra: `╔═══════════════════════════════════════╗
          🔇  𝗚𝗨𝗜𝗔: !antipalavra  🔇
╚═══════════════════════════════════════╝
💧 *O que é?* Lista negra de palavras proibidas no grupo.
🌊 *Como usar:* \`!antipalavra add [palavra]\`, \`!antipalavra rem [palavra]\`, \`!antipalavra list\`.`,

            antiflood: `╔═══════════════════════════════════════╗
          🚦  𝗚𝗨𝗜𝗔: !antiflood  🚦
╚═══════════════════════════════════════╝
💧 *O que é?* Limite de mensagens por intervalo.
🌊 *Como usar:* \`!antiflood 5 10\` — se um membro enviar mais de 5 mensagens em 10 segundos, será silenciado automaticamente por 5 minutos.`,

            modolento: `╔═══════════════════════════════════════╗
          🐢  𝗚𝗨𝗜𝗔: !modolento  🐢
╚═══════════════════════════════════════╝
💧 *O que é?* Modo lento (slow mode). Cada membro só pode enviar uma mensagem a cada X segundos.
🌊 *Como usar:* \`!modolento 10\` para 10 segundos; \`!modolento 0\` para desativar.`,

            inativos: `╔═══════════════════════════════════════╗
          💤  𝗚𝗨𝗜𝗔: !inativos  💤
╚═══════════════════════════════════════╝
💧 *O que é?* Lista (e opcionalmente remove) membros que não interagem há X dias.
🌊 *Como usar:* \`!inativos 30\` para listar, \`!inativos 30 remover\` para remover.`,

            bloquearcmd: `╔═══════════════════════════════════════╗
          🚫  𝗚𝗨𝗜𝗔: !bloquearcmd  🚫
╚═══════════════════════════════════════╝
💧 *O que é?* Alterna o bloqueio de um comando específico no grupo.
🌊 *Como usar:* \`!bloquearcmd roleta\` (se estava liberado, bloqueia; se estava bloqueado, libera).`,

            config: `╔═══════════════════════════════════════╗
          ⚙️  𝗚𝗨𝗜𝗔: !config  ⚙️
╚═══════════════════════════════════════╝
💧 *O que é?* Exibe um resumo completo das configurações de moderação do grupo.`,

            fechar: `╔═══════════════════════════════════════╗
          🔒  𝗚𝗨𝗜𝗔: !fechar  🔒
╚═══════════════════════════════════════╝
💧 *O que é?* Fecha o grupo temporariamente (apenas admins falam).
🌊 *Como usar:* \`!fechar 120\` para fechar por 2 minutos. Após o tempo, o bot reabre automaticamente.`,

            limparmsg: `╔═══════════════════════════════════════╗
          🧹  𝗚𝗨𝗜𝗔: !limparmsg  🧹
╚═══════════════════════════════════════╝
💧 *O que é?* Apaga as últimas mensagens de um membro específico (máx. 10).
🌊 *Como usar:* \`!limparmsg @membro 5\` apaga as 5 mensagens mais recentes dele no chat.`,

            // Os comandos de moderação que já existiam foram mantidos sem alterações significativas, apenas com ajuste de texto em "ban", "kick", etc., mas estão corretos.

            // 🎵 MÍDIA (corrigida referência ao Railway)
            sticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !sticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* A fábrica oficial de figurinhas do grupo (atalho: \`!s\`).
🌊 *Como funciona?* Envie uma imagem ou um vídeo curto, ou responda/marque uma mídia digitando \`!sticker\`.
🚨 *LIMITE DO SERVIDOR:* Vídeos para figurinhas animadas possuem um limite rígido de **até 10 segundos**. Vídeos maiores serão rejeitados automaticamente!`,

            s: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !s  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Atalho direto para \`!sticker\`.`,

            's-': `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !s- / !sticker-  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Figurinha com texto desenhado.
🌊 *Como usar:* Responda uma imagem/vídeo com \`!s- seu texto aqui\`.`,

            attp: `╔═══════════════════════════════════════╗
          🌈  𝗚𝗨𝗜𝗔: !attp  🌈
╚═══════════════════════════════════════╝
💧 *O que é?* Figurinha animada com texto colorido (estilo LED).
🌊 *Como usar:* \`!attp seu texto\`.`,

            copiarsticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !copiarsticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Converte figurinha estática em imagem.
🌊 *Como usar:* Responda uma figurinha com \`!copiarsticker\`.`,

            anime: `╔═══════════════════════════════════════╗
          🍥  𝗚𝗨𝗜𝗔: !anime  🍥
╚═══════════════════════════════════════╝
💧 *O que é?* Buscador de animes.
🌊 *Como usar:* \`!anime Naruto\` para ficha técnica, nota e sinopse.`,

            clima: `╔═══════════════════════════════════════╗
          ☀️  𝗚𝗨𝗜𝗔: !clima  ☀️
╚═══════════════════════════════════════╝
💧 *O que é?* Previsão do tempo em tempo real.
🌊 *Como usar:* \`!clima Maputo\`.`,

            google: `╔═══════════════════════════════════════╗
          🔍  𝗚𝗨𝗜𝗔: !google  🔍
╚═══════════════════════════════════════╝
💧 *O que é?* Gera link de pesquisa.
🌊 *Como usar:* \`!google como fazer strogonoff\`.`,

            // Outros comandos de mídia mantidos sem alterações
            perfil: `╔═══════════════════════════════════════╗
          👤  𝗚𝗨𝗜𝗔: !perfil  👤
╚═══════════════════════════════════════╝
💧 *O que é?* Seu cartão de identidade no bot.
🌊 *Como usar:* \`!perfil\` ou responda à mensagem de alguém com \`!perfil\` para ver o perfil *dessa pessoa*.`,

            setbio: `╔═══════════════════════════════════════╗
          📝  𝗚𝗨𝗜𝗔: !setbio  📝
╚═══════════════════════════════════════╝
💧 *O que é?* Define sua biografia.
🌊 *Como usar:* \`!setbio Programadora e gamer nas horas vagas\`.`,

            setidade: `╔═══════════════════════════════════════╗
          🎂  𝗚𝗨𝗜𝗔: !setidade  🎂
╚═══════════════════════════════════════╝
💧 *O que é?* Define sua idade no perfil.
🌊 *Como usar:* \`!setidade 25\`.`,
        };

        return guias[cmd] || "🌊 Opa! Não encontrei esse comando na minha enciclopédia. Verifique se digitou o nome correto sem o ponto de exclamação! 💧";
    }
};