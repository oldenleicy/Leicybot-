module.exports = {
    // Banco expandido de reações para comandos que não existem (Evita repetição excessiva)
    comandoInexistente: () => {
        const falas = [
            "░▒▓ 𝗘𝗥𝗥𝗢 𝟰𝟬𝟰 🌊 ▓▒░\n\n🤔 Procurei até no fundo do oceano e não achei esse comando!\n💧 Acho que você inventou isso... Digite *!menu* para ver o que eu realmente faço!",
            "🌊 Alerta de delírio! Esse comando não existe no meu sistema.\n💧 Faça algo útil e digite *!menu* antes que o chefe *Olden* veja isso!",
            "❌ Comando inválido! Meu banco de dados rejeitou essa informação.\n🌊 Deixe de macaquice e digite *!menu* para usar os comandos reais!",
            "🧠 *SISTEMA:* Comando não codificado ou removido por forças ocultas. Digite *!menu* e não tente adivinhar as funções!",
            "💧 Opa, errou o alvo feio! Esse comando não consta nos arquivos do Leicybot-. Consulte o catálogo digitando *!menu*.",
            "🌊 Navegou, navegou e bateu nas rochas! Esse comando é totalmente fictício. Digite *!menu* para ver a lista real."
        ];
        return falas[Math.floor(Math.random() * falas.length)];
    },

    // Banco de mensagens de erro para quando faltam argumentos
    faltaArgumento: (cmd, exemplo) => {
        return `░▒▓ 🌊 𝗨𝗦𝗢 𝗜𝗡𝗖𝗢𝗥𝗥𝗘𝗧𝗢 💧 ▓▒░\n\n❌ Ops! Você esqueceu de passar os dados para o comando *!${cmd}*.\n👉 Tente desta forma: *${exemplo}*`;
    },

    // Respostas altamente estratificadas para o termômetro de gado (!gado)
    respostasGado: (porcentagem) => {
        if (porcentagem === 0) {
            return "👑 *0% GADO:* Um verdadeiro Alfa! Não se curva por ninguém e mantém a postura intocável. Dignificado por Olden!";
        }
        if (porcentagem < 15) {
            return `🛡️ *${porcentagem}% GADO:* Postura firme! Tem sentimentos bem guardados, mas o orgulho fala muito mais alto.`;
        }
        if (porcentagem < 40) {
            return `💧 *${porcentagem}% GADO:* Desliza um pouco nas conversas e se derrete com pouca coisa, mas sabe a hora exata de recuar. Está seguro... por enquanto.`;
        }
        if (porcentagem < 65) {
            return `🌊 *${porcentagem}% GADO:* Alerta vermelho! Você já está mandando bom dia com emoji de coração, curtindo todos os status e respondendo em menos de 2 segundos. Cuidado!`;
        }
        if (porcentagem < 90) {
            return `🌾 *${porcentagem}% GADO AVANÇADO:* Já aceita qualquer migalha de atenção e vive com o capim na boca. Seus amigos já estão preocupados com o seu estado de submissão!`;
        }
        return `🚨 *${porcentagem}% GADO MASTER:* Você perdeu completamente o controle da sua vida! Se a pessoa mandar você latir, você late na hora. Alguém traz um balde de água fria urgente para esse membro!`;
    },

    // Respostas refinadas para o termômetro de gostosura (!gostoso)
    respostasGostoso: (porcentagem) => {
        if (porcentagem < 15) {
            return `🥴 *${porcentagem}% GOSTOSO:* Olha... a beleza é 100% interior, né? O lado muito bom é que você tem bastante saúde, simpatia e Golds no banco!`;
        }
        if (porcentagem < 45) {
            return `🩹 *${porcentagem}% GOSTOSO:* Mediano! Não causa espanto, mas também não para o trânsito. Na média padrão do chat.`;
        }
        if (porcentagem < 75) {
            return `✨ *${porcentagem}% GOSTOSO:* Olha só, temos alguém arrumadinho aqui! Se passar um perfume caro, arrumar o cabelo e tirar a foto com o ângulo certo no espelho, engana muito bem.`;
        }
        if (porcentagem < 95) {
            return `🔥 *${porcentagem}% GOSTOSURA EXTREMA:* Escondam seus celulares e preparem os corações! A beleza dessa pessoa travou os servidores de processamento e chamou a atenção do grupo inteiro!`;
        }
        return `👑 *${porcentagem}% DEUS DA ESTÉTICA:* Perfeição inexplicável! Você transcendeu os limites do termômetro e agora é considerado um patrimônio visual oficial sob decreto de Olden!`;
    },

    // Mensagens exclusivas de anúncio expandidas para os títulos do banco de dados
    obterAnuncioTitulo: (t1, t2) => {
        // Filtro para garantir a limpeza das strings de título
        const titulo1 = t1 && typeof t1 === 'string' ? t1.trim() : null;
        const pool2 = t2 && typeof t2 === 'string' ? t2.trim() : null;

        if (titulo1 && pool2) {
            return `░▒▓█████████████████████████████████████▓▒░\n  🌊  𝗣𝗥𝗘𝗦𝗘𝗡𝗖𝗔 𝗦𝗨𝗣𝗥𝗘𝗠𝗔 𝗗𝗨𝗣𝗟𝗔  💧\n░▒▓█████████████████████████████████████▓▒░\n🌊 Abram espaço no chat! O mar se fende para a entrada combinada de:\n👑 *${titulo1}* & *${pool2}*!\n\n💧 Curvem-se diante dessa dupla implacável e lendária!`;
        }
        
        const tAtivo = titulo1 || pool2;
        if (!tAtivo) {
            return `░▒▓ 🌊 𝗔𝗡𝗨𝗡𝗖𝗜𝗢 𝗗𝗘 𝗣𝗥𝗘𝗦𝗘𝗡𝗖𝗔 ▓▒░\n\n👤 Um membro comum acaba de registrar atividade nas linhas do chat!`;
        }

        // Lógica de segmentação por palavras-chave contidas nos títulos comprados na loja
        if (tAtivo.includes("Muzan") || tAtivo.includes("Superior") || tAtivo.includes("Oni")) {
            return `░▒▓ 🩸 𝗔𝗟𝗘𝗥𝗧𝗔 𝗗𝗘 𝗢𝗡𝗜 ▓▒░\n\n🚨 As sombras tomaram a superfície! Sintam a pressão esmagadora do *${tAtivo}* marcando presença e espalhando o terror no chat! 🌊`;
        }
        if (tAtivo.includes("Hashira") || tAtivo.includes("Água") || tAtivo.includes("Xamã")) {
            return `░▒▓ 🌊 𝗥𝗘𝗦𝗣𝗜𝗥𝗔𝗖𝗔𝗢 𝗗𝗔 𝗔𝗚𝗨𝗔 ▓▒░\n\n💧 A calmaria precede a grande tempestade. O imponente *${tAtivo}* purificou o fluxo do chat com sua gloriosa chegada!`;
        }
        if (tAtivo.includes("Piratas") || tAtivo.includes("Capitão") || tAtivo.includes("Corsário")) {
            return `🏴‍☠️ *O REIS DOS PIRATAS CHEGOU!* Levantem as âncoras, preparem os canhões e guardem seus Golds, a lenda marinha *${tAtivo}* atracou no porto! 🌊`;
        }
        if (tAtivo.includes("Deus") || tAtivo.includes("Divino") || tAtivo.includes("Imortal")) {
            return `⚡ *PRESENÇA DIVINA:* Os céus clamam e os mortais se calam! O ser supremo portador do título *${tAtivo}* manifestou-se no grupo!`;
        }
        if (tAtivo.includes("Bilionário") || tAtivo.includes("Magnata") || tAtivo.includes("Ostentação")) {
            return `💰 *ALERTA DE LUXO:* O chat começou a cheirar a dinheiro grosso! O magnata financeiro *${tAtivo}* acabou de entrar ostentando seus Golds virtuais! 🤑`;
        }
        if (tAtivo.includes("Mago") || tAtivo.includes("Alquimista") || tAtivo.includes("Ancião")) {
            return `🔮 *CONCURSO MÍSTICO:* Runas antigas se acenderam nas paredes do chat. O sábio *${tAtivo}* trouxe suas magias e feitiços para a nossa mesa!`;
        }
        
        // Fallback genérico elegante caso o título seja customizado ou não listado acima
        return `░▒▓ 🌊 𝗔𝗡𝗨𝗡𝗖𝗜𝗢 𝗗𝗘 𝗣𝗥𝗘𝗦𝗘𝗡𝗖𝗔 ▓▒░\n\n👤 Olhem e admirem a imponência de *${tAtivo}* espalhando sua merecida graça e prestígio no grupo! 💧`;
    }
};
