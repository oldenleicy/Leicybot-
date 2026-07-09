module.exports = {
    obterExplicacao: (cmd) => {
        const guias = {
            // 💳 CATEGORIA: ECONOMIA & JOGOS
            gold: `╔═══════════════════════════════════════╗
          💳  𝗚𝗨𝗜𝗔: !gold  💳
╚═══════════════════════════════════════╝
💧 *O que é?* O raio-X da sua riqueza (ou da sua miséria).
🌊 *Como funciona?* Mostra seus Golds em mãos, o dinheiro escondido no banco, seus títulos equipados e seu estoque diário de energia.
💡 *Dica de Ouro:* Não ande com muito dinheiro em mãos! Os assaltantes do grupo têm mãos leves. Use o comando \`!banco\` antes que seja tarde.`,

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
🌊 *Como funciona?* Digite \`!assaltar @membro\` para tentar roubar até 30% do dinheiro que o alvo tem vacilando na carteira (golds em mãos).
🔥 *Consequências:*
➔ *Sucesso:* Você sai rindo com os Golds do seu amigo.
➔ *Fracasso:* Você tropeça numa onda, deixa sua própria carteira cair e a vítima recupera os fundos.
❌ *A Maior Furada:* Se o alvo tiver um Escudo comprado na loja, o feitiço vira contra o feiticeiro! O escudo quebra, você é pego pelas patrulhas e toma uma multa pesada de *300 Golds* enviados direto para o banco central do bot.`,

            banco: `╔═══════════════════════════════════════╗
          🏦  𝗚𝗨𝗜𝗔: !banco  🏦
╚═══════════════════════════════════════╝
💧 *O que é?* O único lugar 100% seguro contra os criminosos do chat.
🌊 *Como usar:*
➔ \`!banco depositar [quantia]\` - Tira o dinheiro da mão e joga no cofre.
➔ \`!banco sacar [quantia]\` - Retira os fundos para você poder gastar na loja.
🧠 *Visão Estratégica:* Dinheiro no banco não pode ser roubado via \`!assaltar\`. Se você vai ficar offline, jogue tudo no cofre!`,

            loja: `╔═══════════════════════════════════════╗
          🏪  𝗚𝗨𝗜𝗔: !loja  🏪
╚═══════════════════════════════════════╝
💧 *O que é?* O shopping center do Leicybot-.
🌊 *Como funciona?* Digite \`!loja\` para ver a vitrine de itens e títulos temporários disponíveis. Para comprar, use \`!comprar [nome_do_item]\`.
💎 *Tipos de Mercadoria:* Títulos lendários (com limite de 1 dono por grupo para ostentação máxima), títulos dourados, pratas e o utilitário Escudo Antirroubo. Todos os títulos têm validade estrita de *1 semana* antes de voltarem para a vitrine!`,

            duelo: `╔═══════════════════════════════════════╗
          ⚔️  𝗚𝗨𝗜𝗔: !duelo  ⚔️
╚═══════════════════════════════════════╝
💧 *O que é?* Resolver as diferenças no soco virtual valendo dinheiro!
🌊 *Como usar:* \`!duelo @membro [valor_da_aposta]\`
🤖 *O Combate:* O bot cria uma cena cômica e decide quem venceu na base da sorte pura. O vencedor leva todos os Golds da aposta e o perdedor sai machucado e falido.
⚠️ *Requisito:* Ambos os brigões precisam ter a quantia da aposta em mãos para o duelo começar.`,

            casar: `╔═══════════════════════════════════════╗
          💍  𝗚𝗨𝗜𝗔: !casar  💍
╚═══════════════════════════════════════╝
💧 *O que é?* O início do matrimônio virtual no chat.
🌊 *Como usar:* \`!casar @membro\` para se ajoelhar e propor união oficial ao alvo.
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
🌊 *Como usar:* \`!ban @membro\` ou \`!kick @membro\` em resposta a uma infração.
🚨 *Requisito:* O executor precisa ser ADM e o bot também precisa possuir privilégios administrativos no grupo para remover o infrator.`,

            kick: `╔═══════════════════════════════════════╗
          🔨  𝗚𝗨𝗜𝗔: !kick  🔨
╚═══════════════════════════════════════╝
💧 *O que é?* Remoção imediata de membros (mesma função do comando \`!ban\`).`,

            promover: `╔═══════════════════════════════════════╗
          ✨  𝗚𝗨𝗜𝗔: !promover  ✨
╚═══════════════════════════════════════╝
💧 *O que é?* Concessão de cargos administrativos.
🌊 *Como usar:* \`!promover @membro\` para tornar o usuário selecionado um novo Administrador oficial do grupo.`,

            rebaixar: `╔═══════════════════════════════════════╗
          📉  𝗚𝗨𝗜𝗔: !rebaixar  📉
╚═══════════════════════════════════════╝
💧 *O que é?* Destituição de cargo administrativo.
🌊 *Como usar:* \`!rebaixar @membro\` para retirar as credenciais e privilégios de ADM de um integrante, voltando-o a membro comum.`,

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

            fakes: `╔═══════════════════════════════════════╗
          🌐  𝗚𝗨𝗜𝗔: !fakes  🌐
╚═══════════════════════════════════════╝
💧 *O que é?* O detector de números estrangeiros invasores.
🌊 *Como funciona?* Ativado pelos ADMs via \`!fakes on\`. O bot monitora a entrada do grupo. Se entrar qualquer número com código de país (DDI) diferente do configurado padrão nacional, o robô executa a expulsão imediata.`,

            grupo: `╔═══════════════════════════════════════╗
          🔒  𝗚𝗨𝗜𝗔: !grupo  🔒
╚═══════════════════════════════════════╝
💧 *O que é?* Gerenciador de permissões de escrita do chat.
🌊 *Como usar:*
➔ \`!grupo fechar\` - Apenas administradores podem enviar mensagens.
➔ \`!grupo abrir\` - Todos os integrantes voltam a interagir livremente.`,

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

            copiarsticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !copiarsticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* Extrator de imagens de figurinhas.
🌊 *Como usar:* Responda/marque uma figurinha estática digitando \`!copiarsticker\`. O bot fará o download do arquivo WebP e reverterá de volta para uma imagem JPG comum.`,

            beijar: `╔═══════════════════════════════════════╗
          💋  𝗚𝗨𝗜𝗔: !beijar  💋
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de carinho.
🌊 *Como usar:* \`!beijar @membro\`. Adiciona +1 beijo ao contador de estatísticas do alvo e exibe uma narrativa engraçada no chat.`,

            bater: `╔═══════════════════════════════════════╗
          💥  𝗚𝗨𝗜𝗔: !bater  💥
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de combate físico simulado.
🌊 *Como usar:* \`!bater @membro\` para aplicar um golpe fictício humorístico no integrante marcado.`,

            abracar: `╔═══════════════════════════════════════╗
          🫂  𝗚𝗨𝗜𝗔: !abracar  🫂
╚═══════════════════════════════════════╝
💧 *O que é?* Ação social cômica de afeto e amizade.
🌊 *Como usar:* \`!abracar @membro\`. Incrementa o ranking interno de abraços recebidos pelo usuário alvo.`,

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
➔ \`!curiosidade/historia\`
➔ \`!curiosidade/natureza\`
➔ \`!curiosidade/sports\``
        };

        return guias[cmd] || "🌊 Opa! Não encontrei esse comando na minha enciclopédia. Verifique se digitou o nome correto sem o ponto de exclamação! 💧";
    }
};
