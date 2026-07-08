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

            // 🛡️ CATEGORIA: MODERAÇÃO & SEGURANÇA
            antilink2: `╔═══════════════════════════════════════╗
          🛡️  𝗚𝗨𝗜𝗔: !antilink2  🛡️
╚═══════════════════════════════════════╝
💧 *O que é?* A barreira definitiva de segurança (Modo Hard).
🌊 *Como funciona?* Exclusivo para Administradores. Quando ativado via \`!antilink2 on\`, qualquer link de convite enviado por membros comuns resultará no apagamento imediato da mensagem e no **BANIMENTO AUTOMÁTICO** do infrator, sem choro e sem segunda chance.`,

            fakes: `╔═══════════════════════════════════════╗
          🌐  𝗚𝗨𝗜𝗔: !fakes  🌐
╚═══════════════════════════════════════╝
💧 *O que é?* O detector de números estrangeiros invasores.
🌊 *Como funciona?* Ativado pelos ADMs via \`!fakes on\`. O bot monitora a entrada do grupo. Se entrar qualquer número com código de país (DDI) que não seja o configurado como oficial, o robô remove o número instantaneamente para evitar invasões e travas no chat.`,

            // 🎵 CATEGORIA: MÍDIAS & ENTRETENIMENTO
            sticker: `╔═══════════════════════════════════════╗
          🖼️  𝗚𝗨𝗜𝗔: !sticker  🖼️
╚═══════════════════════════════════════╝
💧 *O que é?* A fábrica oficial de figurinhas do grupo (atalho: \`!s\`).
🌊 *Como funciona?* Envie uma imagem ou um vídeo curto, ou responda/marque uma mídia digitando \`!sticker\`.
🚨 *TRAVA DE SEGURANÇA DO RAILWAY:* Para evitar lentidão e não derrubar o processador do bot, os vídeos enviados para figurinhas animadas possuem um limite rígido de **até 10 segundos**. Vídeos maiores que isso serão rejeitados automaticamente!`,

            gado: `╔═══════════════════════════════════════╗
          🐂  𝗚𝗨𝗜𝗔: !gado  🐂
╚═══════════════════════════════════════╝
💧 *O que é?* O medidor de sem-vergonhice amorosa.
🌊 *Como funciona?* Digite \`!gado\` e o algoritmo super avançado (e altamente irônico) vai ler o nível de paixão boba do seu perfil, dando uma nota de 0% a 100% acompanhada de um veredito engraçado. Perfeito para zoar os amigos apaixonados do grupo.`,

            curiosidade: `╔═══════════════════════════════════════╗
          🧠  𝗚𝗨𝗜𝗔: !curiosidade  🧠
╚═══════════════════════════════════════╝
💧 *O que é?* O sistema de enciclopédia cultural do bot.
🌊 *Como funciona?* Digite \`!curiosidade\` para um fato aleatório ou filtre usando as barras de subcategorias stritas!
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
