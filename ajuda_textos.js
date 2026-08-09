module.exports = {
    obterExplicacao: (cmd) => {
        const guias = {
            // 🪙 CATEGORIA: ECONOMIA & JOGOS
            menugold: `╔═══════════════════════════════════════╗
          🪙  𝗚𝗨𝗜𝗔: !menugold  🪙
╚═══════════════════════════════════════╝
💧 *O que é?* O painel com todos os comandos de economia do bot.
🌊 *Como usar?* Só digitar \`!menugold\` pra ver a lista completa de jogos, comandos de banco e loja.`,

            gold: `╔═══════════════════════════════════════╗
          🪙  𝗚𝗨𝗜𝗔: !gold  🪙
╚═══════════════════════════════════════╝
💧 *O que é?* O raio-X completo da sua vida financeira (e social).
🌊 *Como funciona?* Mostra Golds em mãos, banco, títulos equipados (comprado + especial), energia diária, quem te roubou nas últimas 24h e suas dívidas/empréstimos ativos.
👉 *Dica:* Responda a mensagem de alguém e digite \`!gold\` pra ver o perfil financeiro *dessa pessoa* em vez do seu.
💡 *Dica de Ouro:* Não ande com muito dinheiro em mãos! Use \`!banco\` — mas cuidado, o \`!roubar\` agora também consegue mirar o banco.`,

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

            pescar: `╔═══════════════════════════════════════╗
          🎣  𝗚𝗨𝗜𝗔: !pescar  🎣
╚═══════════════════════════════════════╝
💧 *O que é?* Uma forma tranquila e sem risco de ganhar Golds.
🌊 *Como funciona?* Diferente do \`!minerar\`, pescar nunca faz você perder dinheiro — só ganha, entre 20 e 70 Golds.
🎲 *Bônus raro:* 10% de chance de puxar um Tesouro Raro (200 a 400 Golds)!
⚠️ *Limite:* 5 pescas por dia. O item *Isca Especial* da \`!loja\` turbina os prêmios por 24h.`,

            raspadinha: `╔═══════════════════════════════════════╗
          🎫  𝗚𝗨𝗜𝗔: !raspadinha  🎫
╚═══════════════════════════════════════╝
💧 *O que é?* Um bilhete de raspar rápido, na sorte.
🌊 *Como funciona?* Custa 20 Golds na hora. 40% de chance de não ganhar nada, 40% de prêmio pequeno, 15% de prêmio médio e 5% de prêmio grande (até 600 Golds)!
⚠️ *Limite:* 5 raspadinhas por dia.`,

            roleta: `╔═══════════════════════════════════════╗
          🎡  𝗚𝗨𝗜𝗔: !roleta  🎡
╚═══════════════════════════════════════╝
💧 *O que é?* A roleta clássica de cassino, adaptada pro grupo.
🌊 *Como usar:* \`!roleta [aposta] [vermelho/preto/número]\`
🎲 *Pagamentos:* Acertar a cor (vermelho/preto) paga o dobro. Acertar o número exato (0 a 36) paga 14x o valor apostado!
🍀 *Dica:* O item *Sorte Grande* da \`!loja\` dá uma segunda chance em caso de derrota.`,

            slots: `╔═══════════════════════════════════════╗
          🎰  𝗚𝗨𝗜𝗔: !slots  🎰
╚═══════════════════════════════════════╝
💧 *O que é?* O caça-níqueis do Leicybot-.
🌊 *Como usar:* \`!slots [aposta]\`
🎲 *Pagamentos:* 3 símbolos 7️⃣ paga 20x, 3 símbolos iguais (qualquer outro) paga 8x, 2 iguais paga 2x.`,

            apostar: `╔═══════════════════════════════════════╗
          🎲  𝗚𝗨𝗜𝗔: !apostar  🎲
╚═══════════════════════════════════════╝
💧 *O que é?* Dobro ou nada, direto contra a casa.
🌊 *Como usar:* \`!apostar [quantia]\` — 45% de chance de dobrar o valor apostado.`,

            dados: `╔═══════════════════════════════════════╗
          🎲  𝗚𝗨𝗜𝗔: !dados  🎲
╚═══════════════════════════════════════╝
💧 *O que é?* Dado contra dado, você contra o bot.
🌊 *Como usar:* \`!dados [aposta]\` — quem tirar o número mais alto (1 a 6) leva o dobro da aposta. Empate devolve o valor apostado.`,

            assaltar: `╔═══════════════════════════════════════╗
          🏴‍☠️  𝗚𝗨𝗜𝗔: !assaltar  🏴‍☠️
╚═══════════════════════════════════════╝
💧 *O que é?* A lei do mais forte (ou do mais sortudo).
🌊 *Como funciona?* Digite \`!assaltar @membro\` (ou responda a mensagem dele) pra tentar roubar até 30% do que o alvo tem na carteira (golds em mãos).
🔥 *Consequências:*
➔ *Sucesso:* Você sai rindo com os Golds do seu amigo.
➔ *Fracasso:* Você tropeça numa onda e perde 15% da sua própria carteira.
❌ *A Maior Furada:* Se o alvo tiver Escudo, o roubo é 100% bloqueado e você toma multa de *300 Golds*. Se o alvo tiver Seguro Parcial, o roubo funciona mas rende só metade.
🎯 *Se você for roubado:* Use \`!revidar\` nas próximas 24h pra tentar se vingar automaticamente do atacante.`,

            roubar: `╔═══════════════════════════════════════╗
          🏦🏴‍☠️  𝗚𝗨𝗜𝗔: !roubar  🏦🏴‍☠️
╚═══════════════════════════════════════╝
💧 *O que é?* A versão de alto risco do \`!assaltar\` — mira o BANCO do alvo, não a carteira.
🌊 *Como usar:* \`!roubar @membro\` (ou responda a mensagem dele).
🔥 *Consequências:* Chance de sucesso de 35% (ou só 20% se o alvo tiver *Cofre Blindado*). Se falhar, você perde 25% da sua própria carteira em fiança.
⚠️ *Requisito:* O alvo precisa ter pelo menos 100 Golds guardados no banco.`,

            revidar: `╔═══════════════════════════════════════╗
          ⚔️  𝗚𝗨𝗜𝗔: !revidar  ⚔️
╚═══════════════════════════════════════╝
💧 *O que é?* O contra-ataque de quem foi roubado.
🌊 *Como funciona?* Só funciona se você foi roubado (via \`!assaltar\` ou \`!roubar\`) nas últimas 24h — ataca automaticamente quem te roubou por último, sem precisar marcar ninguém.
🎲 *Vantagem:* 60% de chance de sucesso (mais alto que o normal, é a vingança!). Cada uso consome 1 registro do seu histórico de roubos.`,

            banco: `╔═══════════════════════════════════════╗
          🏦  𝗚𝗨𝗜𝗔: !banco  🏦
╚═══════════════════════════════════════╝
💧 *O que é?* O cofre mais seguro contra assaltos comuns.
🌊 *Como usar:*
➔ \`!banco depositar [quantia]\` - Tira o dinheiro da mão e joga no cofre.
➔ \`!banco sacar [quantia]\` - Retira os fundos para você poder gastar na loja.
🧠 *Visão Estratégica:* O \`!assaltar\` NUNCA pega o que está no banco. Mas atenção: o \`!roubar\` (mais arriscado e raro) consegue mirar o banco diretamente — o item *Cofre Blindado* da loja reduz essa chance.`,

            pagar: `╔═══════════════════════════════════════╗
          💸  𝗚𝗨𝗜𝗔: !pagar  💸
╚═══════════════════════════════════════╝
💧 *O que é?* Transferência direta e sem burocracia.
🌊 *Como usar:* \`!pagar @membro [valor]\` (ou responda a mensagem dele) — move Golds da sua carteira pra dele na hora, sem chance de recusa.`,

            emprestar: `╔═══════════════════════════════════════╗
          🤝  𝗚𝗨𝗜𝗔: !emprestar  🤝
╚═══════════════════════════════════════╝
💧 *O que é?* Empréstimo entre membros, sem juros.
🌊 *Como usar:* \`!emprestar @membro [valor]\` (ou responda a mensagem dele).
📋 *Nota:* A dívida fica registrada e aparece pros dois lados no \`!gold\` — mas o bot não cobra automaticamente, o acerto é por confiança entre vocês.`,

            investir: `╔═══════════════════════════════════════╗
          📈  𝗚𝗨𝗜𝗔: !investir  📈
╚═══════════════════════════════════════╝
💧 *O que é?* Renda passiva controlada.
🌊 *Como usar:* \`!investir [quantia]\` trava o valor por 6 horas com 20% de bônus garantido ao resgatar com \`!resgatar\`.
⚠️ *Nota:* Só é possível ter 1 investimento ativo por vez.`,

            resgatar: `╔═══════════════════════════════════════╗
          💰  𝗚𝗨𝗜𝗔: !resgatar  💰
╚═══════════════════════════════════════╝
💧 *O que é?* A colheita do \`!investir\`.
🌊 *Como funciona?* Resgata seu investimento ativo assim que o prazo de 6 horas terminar, creditando o valor original + 20% de bônus.`,

            rankgold: `╔═══════════════════════════════════════╗
          🏆  𝗚𝗨𝗜𝗔: !rankgold  🏆
╚═══════════════════════════════════════╝
💧 *O que é?* O top 10 dos mais ricos do grupo.
🌊 *Como funciona?* Soma Golds em mãos + banco de cada usuário e mostra o ranking dos 10 primeiros colocados.`,

            loja: `╔═══════════════════════════════════════╗
          🏪  𝗚𝗨𝗜𝗔: !loja  🏪
╚═══════════════════════════════════════╝
💧 *O que é?* O shopping center do Leicybot-.
🌊 *Como funciona?* Digite \`!loja\` para ver a vitrine completa. Para comprar, use \`!comprar [nome_do_item]\`.
💎 *Tipos de Mercadoria:* Títulos (Lendário/Ouro/Prata, limite de donos por grupo, 1 semana de validade, *só 1 comprado por vez*) e itens utilitários: Escudo, Seguro Parcial, Recarga Rápida, Cofre Blindado, Isca Especial e Sorte Grande.
👉 *Nota:* O título especial (concedido pelo dono) é um slot separado e não conta nesse limite de 1.`,

            comprar: `╔═══════════════════════════════════════╗
          🛒  𝗚𝗨𝗜𝗔: !comprar  🛒
╚═══════════════════════════════════════╝
💧 *O que é?* O caixa da \`!loja\`.
🌊 *Como usar:* \`!comprar [nome_do_item]\` — funciona tanto para itens utilitários (escudo, seguroparcial, etc) quanto para títulos.
⚠️ *Nota:* Só é possível ter 1 título comprado por vez — venda o atual com \`!vendertitulo\` antes de trocar.`,

            vendertitulo: `╔═══════════════════════════════════════╗
          🎭  𝗚𝗨𝗜𝗔: !vendertitulo  🎭
╚═══════════════════════════════════════╝
💧 *O que é?* Libera sua vaga de título comprado.
🌊 *Como funciona?* Remove o título que você tem equipado (comprado na loja), liberando espaço pra comprar outro. Não afeta títulos especiais concedidos pelo dono.`,

            apresentacao: `╔═══════════════════════════════════════╗
          📢  𝗚𝗨𝗜𝗔: !apresentacao  📢
╚═══════════════════════════════════════╝
💧 *O que é?* Liga/desliga o anúncio automático de título no chat.
🌊 *Como usar:* \`!apresentacao on\` ou \`!apresentacao off\`. Precisa comprar o item na \`!loja\` primeiro.`,

            duelo: `╔═══════════════════════════════════════╗
          ⚔️  𝗚𝗨𝗜𝗔: !duelo  ⚔️
╚═══════════════════════════════════════╝
💧 *O que é?* Resolver as diferenças no soco virtual valendo dinheiro!
🌊 *Como usar:* \`!duelo @membro [valor_da_aposta]\` (ou responda a mensagem dele).
🤖 *O Combate:* O bot cria uma cena cômica e decide quem venceu na base da sorte pura. O vencedor leva todos os Golds da aposta e o perdedor sai machucado e falido.
⚠️ *Requisito:* Ambos os brigões precisam ter a quantia da aposta em mãos para o duelo começar.`,

            casar: `╔═══════════════════════════════════════╗
          💍  𝗚𝗨𝗜𝗔: !casar  💍
╚═══════════════════════════════════════╝
💧 *O que é?* O início do matrimônio virtual no chat.
🌊 *Como usar:* \`!casar @membro\` (ou responda a mensagem dele) para se ajoelhar e propor união oficial ao alvo.
📌 *Nota:* O alvo precisa aceitar usando o comando \`!aceitar\` para que o casamento seja formalizado sob as bençãos de Olden.`,

            aceitar: `╔═══════════════════════════════════════╗
          ✅  𝗚𝗨𝗜𝗔: !aceitar  ✅
╚═══════════════════════════════════════╝
💧 *O que é?* O comando do "Sim" definitivo.
🌊 *Como funciona?* Consuma o pedido de casamento pendente enviado por algum membro apaixonado. O banco de dados salva o vínculo e anuncia a união de vocês no grupo.`,

            divorciar: `╔═══════════════════════════════════════╗
          💔  𝗚𝗨𝗜𝗔: !divorciar  💔
╚═══════════════════════════════════════╝
💧 *O que é?* O tribunal de partilha de bens e solteirice.
🌊 *Como funciona?* Rompe instantaneamente o casamento virtual ativo, deixando ambos os perfis livres e solteiros novamente no banco de dados.`,

            // 🛡️ CATEGORIA: MODERAÇÃO & SEGURANÇA (ADMINISTRADORES)
            ban: `╔═══════════════════════════════════════╗
          🔨  𝗚𝗨𝗜𝗔: !ban / !kick  🔨
╚═══════════════════════════════════════╝
💧 *O que é?* O martelo da justiça da moderação.
🌊 *Como usar:* \`!ban @membro\` ou \`!kick @membro\` (ou responda a mensagem dele) em resposta a uma infração.
🚨 *Requisito:* O executor precisa ser ADM e o bot também precisa possuir privilégios administrativos no grupo para remover o infrator.`,

            kick: `╔═══════════════════════════════════════╗
          🔨  𝗚𝗨𝗜𝗔: !kick  🔨
╚═══════════════════════════════════════╝
💧 *O que é?* Remoção imediata de membros (mesma função do comando \`!ban\`).`,

            promover: `╔═══════════════════════════════════════╗
          ✨  𝗚𝗨𝗜𝗔: !promover  ✨
╚═══════════════════════════════════════╝
💧 *O que é?* Concessão de cargos administrativos.
🌊 *Como usar:* \`!promover @membro\` (ou responda a mensagem dele) para tornar o usuário selecionado um novo Administrador oficial do grupo.`,

            rebaixar: `╔═══════════════════════════════════════╗
          📉  𝗚𝗨𝗜𝗔: !rebaixar  📉
╚═══════════════════════════════════════╝
💧 *O que é?* Destituição de cargo administrativo.
🌊 *Como usar:* \`!rebaixar @membro\` (ou responda a mensagem dele) para retirar as credenciais e privilégios de ADM de um integrante, voltando-o a membro comum.`,

            antilink: `╔═══════════════════════════════════════╗
          🛡️  𝗚𝗨𝗜𝗔: !antilink  🛡️
╚═══════════════════════════════════════╝
💧 *O que é?* Filtro de links comuns de sites ou redes externas.
🌊 *Como usar:* \`!antilink on\` ou \`!antilink off\`. Quando ligado, mensagens contendo links comuns de internet enviados por não-adms serão apagadas de forma automática pelo robô.`,

            antilink2: `╔═══════════════════════════════════════╗
          🛡️  𝗚𝗨𝗜𝗔: !antilink2  🛡️
╚═══════════════════════════════════════╝
💧 *O que é?* A barreira definitiva de segurança (Modo Hard-Ban).
🌊 *Como funciona?* Exclusivo para Administradores. Quando ativado via \`!antilink2 on\`, qualquer link de convite enviado por membros comuns resultará no apagamento imediato da mensagem e no **BANIMENTO AUTOMÁTICO** do infrator, sem choro e sem segunda chance.`,

            antimidia: `╔═══════════════════════════════════════╗
          📵  𝗚𝗨𝗜𝗔: !antimidia  📵
╚═══════════════════════════════════════╝
💧 *O que é?* Bloqueio de imagem/vídeo/áudio/figurinha/documento enviados por não-adms.
🌊 *Como usar:* \`!antimidia on\` ou \`!antimidia off\`. Mensagens de texto continuam liberadas normalmente.`,

            antipalavra: `╔═══════════════════════════════════════╗
          🚫  𝗚𝗨𝗜𝗔: !antipalavra  🚫
╚═══════════════════════════════════════╝
💧 *O que é?* Lista negra de palavras do grupo.
🌊 *Como usar:*
➔ \`!antipalavra add [palavra]\` - adiciona à lista negra
➔ \`!antipalavra rem [palavra]\` - remove da lista
➔ \`!antipalavra list\` - mostra a lista atual
🌊 Mensagens de não-adms contendo qualquer palavra da lista são apagadas automaticamente.`,

            antiflood: `╔═══════════════════════════════════════╗
          🚨  𝗚𝗨𝗜𝗔: !antiflood  🚨
╚═══════════════════════════════════════╝
💧 *O que é?* Limitador de mensagens em sequência.
🌊 *Como usar:* \`!antiflood [mensagens] [segundos]\` Ex: \`!antiflood 5 10\` — quem mandar mais de 5 mensagens em 10 segundos é silenciado automaticamente por 5 minutos. Use \`!antiflood off\` pra desativar.`,

            modolento: `╔═══════════════════════════════════════╗
          🐌  𝗚𝗨𝗜𝗔: !modolento  🐌
╚═══════════════════════════════════════╝
💧 *O que é?* Modo lento — 1 mensagem a cada X segundos por pessoa.
🌊 *Como usar:* \`!modolento [segundos]\`. Use \`!modolento off\` pra desativar.`,

            mutar: `╔═══════════════════════════════════════╗
          🔇  𝗚𝗨𝗜𝗔: !mutar  🔇
╚═══════════════════════════════════════╝
💧 *O que é?* Silenciamento temporário de um membro.
🌊 *Como usar:* \`!mutar @membro [minutos]\` (ou responda a mensagem dele).
⚠️ *Nota:* O membro consegue digitar normalmente, mas as mensagens dele são apagadas automaticamente enquanto o mute estiver ativo. Precisa do bot ser ADM pra funcionar de verdade.`,

            fechar: `╔═══════════════════════════════════════╗
          🔒  𝗚𝗨𝗜𝗔: !fechar  🔒
╚═══════════════════════════════════════╝
💧 *O que é?* Fechamento TEMPORIZADO do grupo — diferente do \`!grupo fechar\`, que não tem prazo definido.
🌊 *Como usar:* \`!fechar [segundos]\`. O chat reabre sozinho quando o tempo passar, na primeira mensagem depois do prazo.
⚠️ *Requisito:* O bot precisa ser administrador do grupo.`,

            grupo: `╔═══════════════════════════════════════╗
          🔒  𝗚𝗨𝗜𝗔: !grupo  🔒
╚═══════════════════════════════════════╝
💧 *O que é?* Gerenciador de permissões de escrita do chat, sem prazo definido.
🌊 *Como usar:*
➔ \`!grupo fechar\` - Apenas administradores podem enviar mensagens.
➔ \`!grupo abrir\` - Todos os integrantes voltam a interagir livremente.
👉 *Nota:* Pra fechar só por um tempo determinado (que reabre sozinho), use \`!fechar [segundos]\`.`,

            bloquearcmd: `╔═══════════════════════════════════════╗
          🚫  𝗚𝗨𝗜𝗔: !bloquearcmd  🚫
╚═══════════════════════════════════════╝
💧 *O que é?* Bloqueio de comando específico, só nesse grupo.
🌊 *Como usar:* \`!bloquearcmd [comando]\`. Manda de novo o mesmo comando pra desbloquear (funciona como um interruptor).`,

            inativos: `╔═══════════════════════════════════════╗
          😴  𝗚𝗨𝗜𝗔: !inativos  😴
╚═══════════════════════════════════════╝
💧 *O que é?* Detector de membros sumidos.
🌊 *Como usar:*
➔ \`!inativos [dias]\` - lista quem não interage há X dias (padrão: 7)
➔ \`!inativos [dias] remover confirmar\` - remove todo mundo da lista (exige a palavra "confirmar", é irreversível!)`,

            config: `╔═══════════════════════════════════════╗
          ⚙️  𝗚𝗨𝗜𝗔: !config  ⚙️
╚═══════════════════════════════════════╝
💧 *O que é?* Raio-X das configurações do grupo.
🌊 *Como funciona?* Mostra de uma vez só o status de todos os sistemas de moderação ativos (antilink, antiflood, modo lento, palavras bloqueadas, etc).`,

            limparmsg: `╔═══════════════════════════════════════╗
          🧹  𝗚𝗨𝗜𝗔: !limparmsg  🧹
╚═══════════════════════════════════════╝
💧 *O que é?* Apagador de mensagens recentes de alguém.
🌊 *Como usar:* \`!limparmsg @membro\` (ou responda a mensagem dele).
⚠️ *Limitação:* Só apaga mensagens enviadas depois que o bot ligou pela última vez (até 15 por pessoa) — não recupera histórico antigo de antes disso.`,

            fakes: `╔═══════════════════════════════════════╗
          🌐  𝗚𝗨𝗜𝗔: !fakes  🌐
╚═══════════════════════════════════════╝
💧 *O que é?* O detector de números estrangeiros invasores.
🌊 *Como funciona?* Ativado pelos ADMs via \`!fakes on\`. O bot monitora a entrada do grupo. Se entrar qualquer número com código de país (DDI) diferente do configurado padrão nacional, o robô executa a expulsão imediata.`,

            limpar: `╔═══════════════════════════════════════╗
          🧹  𝗚𝗨𝗜𝗔: !limpar  🧹
╚═══════════════════════════════════════╝
💧 *O que é?* Ocultação rápida do fluxo de mensagens anterior.
🌊 *Como funciona?* Envia uma sequência maciça de blocos em branco invisíveis para empurrar o histórico de chat para cima, limpando o campo de visão visual das telas dos celulares.`,

            marcar: `╔═══════════════════════════════════════╗
          📣  𝗚𝗨𝗜𝗔: !marcar  📣
╚═══════════════════════════════════════╝
💧 *O que é?* Menção em massa (Marcar Todos).
🌊 *Como usar:* \`!marcar [texto do aviso]\` para notificar e citar de uma vez só todos os participantes do grupo para avisos urgentes.`,

            adms: `╔═══════════════════════════════════════╗
          ⚡  𝗚𝗨𝗜𝗔: !adms  ⚡
╚═══════════════════════════════════════╝
💧 *O que é?* Botão de emergência de chamado técnico.
🌊 *Como funciona?* Menciona em formato de alerta toda a equipe de administradores ativa do grupo. Use para relatar invasões ou brigas.`,

            setregras: `╔═══════════════════════════════════════╗
          📝  𝗚𝗨𝗜𝗔: !setregras  📝
╚═══════════════════════════════════════╝
💧 *O que é?* Configurador do estatuto interno do grupo.
🌊 *Como usar:* \`!setregras [texto das regras aqui]\`. Salva as normas diretamente no banco de dados específico daquele chat.`,

            regras: `╔═══════════════════════════════════════╗
          📜  𝗚𝗨𝗜𝗔: !regras  📜
╚═══════════════════════════════════════╝
💧 *O que é?* Exibição das normas da casa.
🌊 *Como funciona?* Puxa e formata em uma moldura estilizada o texto configurado previamente pelo comando \`!setregras\`.`,

            atividade: `╔═══════════════════════════════════════╗
          📊  𝗚𝗨𝗜𝗔: !atividade  📊
╚═══════════════════════════════════════╝
💧 *O que é?* Painel estatístico de mensagens enviadas.
🌊 *Como funciona?* Exibe em tempo real o ranking top 15 dos usuários locais mais falantes e ativos no contador do bot.`,

            online: `╔═══════════════════════════════════════╗
          🟢  𝗚𝗨𝗜𝗔: !online  🟢
╚═══════════════════════════════════════╝
💧 *O que é?* Painel de presença verificada.
🌊 *Como funciona?* Lista os membros que interagiram recentemente e possuem logs de mensagens recentes ativos no escopo do bot.`,

            // 👑 CATEGORIA: PAINEL DO DONO
            ping: `╔═══════════════════════════════════════╗
          🏓  𝗚𝗨𝗜𝗔: !ping  🏓
╚═══════════════════════════════════════╝
💧 *O que é?* Diagnóstico rápido do servidor.
🌊 *Como funciona?* Mostra uptime, uso de RAM e carga de CPU de onde o bot está rodando.`,

            backup: `╔═══════════════════════════════════════╗
          📦  𝗚𝗨𝗜𝗔: !backup  📦
╚═══════════════════════════════════════╝
💧 *O que é?* Cópia de segurança manual.
🌊 *Como funciona?* Envia o database.json atual no privado do dono, como documento.`,

            listagrupos: `╔═══════════════════════════════════════╗
          📋  𝗚𝗨𝗜𝗔: !listagrupos  📋
╚═══════════════════════════════════════╝
💧 *O que é?* Inventário de grupos.
🌊 *Como funciona?* Lista todos os grupos onde o bot está presente, com nome e quantidade de membros.`,

            estatisticas: `╔═══════════════════════════════════════╗
          📊  𝗚𝗨𝗜𝗔: !estatisticas  📊
╚═══════════════════════════════════════╝
💧 *O que é?* Números gerais do bot.
🌊 *Como funciona?* Mostra total de usuários, grupos, Golds em circulação e uptime, tudo de uma vez.`,

            migrarv2: `╔═══════════════════════════════════════╗
          🔧  𝗚𝗨𝗜𝗔: !migrarv2  🔧
╚═══════════════════════════════════════╝
💧 *O que é?* O comando de virada de chave da atualização v2.
🌊 *Como funciona?* Zera os Golds em mãos de todo mundo e migra os títulos antigos pro novo formato de slot único.
🚨 *ATENÇÃO:* Rode isso *só uma vez*, logo depois de colocar os arquivos novos no ar. Rodar de novo zera os Golds outra vez!`,

            // 🎵 CATEGORIA: MÍDIAS, BUSCAS & BRINCADEIRAS
            sticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨Ｉ𝗔: !sticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* A fábrica oficial de figurinhas do grupo (atalho: \`!s\`).
🌊 *Como funciona?* Envie uma imagem ou um vídeo curto, ou responda/marque uma mídia digitando \`!sticker\`.
🚨 *TRAVA DE SEGURANÇA DO RAILWAY:* Para evitar lentidão e não derrubar o processador do bot, os vídeos enviados para figurinhas animadas possuem um limite rígido de **até 10 segundos**. Vídeos maiores que isso serão rejeitados automaticamente!`,

            s: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !s  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Atalho direto e rápido para o comando \`!sticker\`.`,

            's-': `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !s- / !sticker-  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* A mesma fábrica de figurinhas, mas com legenda.
🌊 *Como usar:* Responda uma imagem ou vídeo digitando \`!s- texto aqui\`. O texto é desenhado na própria figurinha. Sem o traço e sem texto, use só \`!s\` para a figurinha normal.`,

            attp: `╔═══════════════════════════════════════╗
          🌈  𝗚𝗨𝗜𝗔: !attp  🌈
╚═══════════════════════════════════════╝
💧 *O que é?* Figurinha animada com texto oscilando em cores (estilo LED).
🌊 *Como usar:* \`!attp texto aqui\`. Não precisa responder nada, o bot gera a figurinha do zero.`,

            copiarsticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !copiarsticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Extrator de imagens de figurinhas.
🌊 *Como usar:* Responda/marque uma figurinha estática digitando \`!copiarsticker\`. O bot fará o download do arquivo WebP e reverterá de volta para uma imagem JPG comum.`,

            beijar: `╔═══════════════════════════════════════╗
          💋  𝗚𝗨𝗜𝗔: !beijar  💋
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de carinho.
🌊 *Como usar:* \`!beijar @membro\` (ou responda a mensagem dele). Adiciona +1 beijo ao contador de estatísticas do alvo e exibe uma narrativa engraçada no chat.`,

            bater: `╔═══════════════════════════════════════╗
          💥  𝗚𝗨𝗜𝗔: !bater  💥
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de combate físico simulado.
🌊 *Como usar:* \`!bater @membro\` (ou responda a mensagem dele) para aplicar um golpe fictício humorístico no integrante marcado.`,

            abracar: `╔═══════════════════════════════════════╗
          🫂  𝗚𝗨𝗜𝗔: !abracar  🫂
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de afeto e amizade.
🌊 *Como usar:* \`!abracar @membro\` (ou responda a mensagem dele). Incrementa o ranking interno de abraços recebidos pelo usuário alvo.`,

            gado: `╔═══════════════════════════════════════╗
          🐂  𝗚𝗨𝗜𝗔: !gado  🐂
╚═══════════════════════════════════════╝
💧 *O que é?* O medidor de sem-vergonhice amorosa.
🌊 *Como funciona?* Digite \`!gado\` e o algoritmo super avançado (e altamente irônico) vai ler o nível de paixão boba do seu perfil, dando uma nota de 0% a 100% acompanhada de um veredito engraçado. Perfeito para zoar os amigos apaixonados do grupo.`,

            gostoso: `╔═══════════════════════════════════════╗
          🔥  𝗚𝗨𝗜𝗔: !gostoso  🔥
╚═══════════════════════════════════════╝
💧 *O que é?* Avaliador automatizado de latência estética.
🌊 *Como funciona?* Mede em porcentagem de 0% a 100% o nível de beleza do usuário emissor, gerando vereditos humorísticos ideais para descontração.`,

            anime: `╔═══════════════════════════════════════╗
          🍥  𝗚𝗨𝗜𝗔: !anime  🍥
╚═══════════════════════════════════════╝
💧 *O que é?* Buscador de fichas de animações japonesas.
🌊 *Como usar:* \`!anime [nome do anime]\` para extrair informações fundamentais, notas de avaliação global e a sinopse técnica da obra informada.`,

            clima: `╔═══════════════════════════════════════╗
          ☀️  𝗚𝗨𝗜𝗔: !clima  ☀️
╚═══════════════════════════════════════╝
💧 *O que é?* Consulta meteorológica rápida.
🌊 *Como usar:* \`!clima [nome da cidade]\` para verificar as condições climáticas locais atuais, sensações térmicas e vento costeiro estimado.`,

            google: `╔═══════════════════════════════════════╗
          🔍  𝗚𝗨𝗜𝗔: !google  🔍
╚═══════════════════════════════════════╝
💧 *O que é?* Motor de indexação rápida.
🌊 *Como usar:* \`!google [termo de busca]\` para receber os links diretos oficiais de indexação correspondentes à palavra informada.`,

            curiosidade: `╔═══════════════════════════════════════╗
          🧠  𝗚𝗨𝗜𝗔: !curiosidade  🧠
╚═══════════════════════════════════════╝
💧 *O que é?* O sistema de enciclopédia cultural do bot.
🌊 *Como funciona?* Digite \`!curiosidade\` para um fato aleatório ou filtre usando as barras de subcategorias estritas!
👉 *Filtros Disponíveis:* ➔ \`!curiosidade/animes\`
➔ \`!curiosidade/games\`
➔ \`!curiosidade/ciencia\`
➔ \`!curiosidade/arte\`
➔ \`!curiosidade/filmes\`
➔ \`!curiosidade/historia\`
➔ \`!curiosidade/tecnologia\`
➔ \`!curiosidade/natureza\`
➔ \`!curiosidade/sports\``
        };

        return guias[cmd] || "🌊 Opa! Não encontrei esse comando na minha enciclopédia. Verifique se digitou o nome correto sem o ponto de exclamação! 💧";
    }
};
