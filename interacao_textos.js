module.exports = {
    // Banco de reações para comandos que não existem
    comandoInexistente: () => {
        const falas = [
            "░▒▓ 𝗘𝗥𝗥𝗢 𝟰𝟬𝟰 🌊 ▓▒░\n\n🤔 Procurei até no fundo do oceano e não achei esse comando!\n💧 Acho que você inventou isso... Digite *!menu* para ver o que eu realmente faço!",
            "🌊 Alerta de delírio! Esse comando não existe no meu sistema.\n💧 Faça algo útil e digite *!menu* antes que o chefe *Olden* veja isso!",
            "❌ Comando inválido! Meu banco de dados rejeitou essa informação.\n🌊 Deixe de macaquice e digite *!menu* para usar os comandos reais!"
        ];
        return falas[Math.floor(Math.random() * falas.length)];
    },

    // Banco de mensagens de erro para quando faltam argumentos
    faltaArgumento: (cmd, exemplo) => {
        return `░▒▓ 🌊 𝗨𝗦𝗢 𝗜𝗡𝗖𝗢𝗥𝗥𝗘𝗧𝗢 💧 ▓▒░\n\n❌ Ops! Você esqueceu de passar os dados para o comando *!${cmd}*.\n👉 Tente desta forma: *${exemplo}*`;
    },

    // Respostas para o termômetro de gado (!gado) - Mais de 10 variações para interatividade
    respostasGado: (porcentagem) => {
        if (porcentagem === 0) return "👑 *0% GADO:* Um verdadeiro Alfa! Não se curva por ninguém e mantém a postura intacta. Dignificado por Olden!";
        if (porcentagem < 30) return `💧 *${porcentagem}% GADO:* Tem sentimentos, mas sabe a hora de recuar. Está seguro... por enquanto.`;
        if (porcentagem < 70) return `🌊 *${porcentagem}% GADO:* Alerta vermelho! Você já está mandando bom dia com emoji de coração e curtindo todos os status. Cuidado!`;
        return `🚨 *${porcentagem}% GADO MASTER:* Você perdeu o controle da sua vida! Se a pessoa mandar você latir, você late. Alguém traz um balde de água fria para esse membro!`;
    },

    // Respostas para o termômetro de gostosura (!gostoso)
    respostasGostoso: (porcentagem) => {
        if (porcentagem < 30) return `🥴 *${porcentagem}% GOSTOSO:* A beleza é interior, né? O bom é que você tem saúde e simpatia!`;
        if (porcentagem < 70) return `✨ *${porcentagem}% GOSTOSO:* Olha só, temos alguém arrumadinho aqui! Se arrumar o cabelo e tirar a foto no espelho, passa de ano.`;
        return `🔥 *${porcentagem}% GOSTOSO SUPREMO:* Escondam seus celulares! A beleza dessa pessoa quebrou o termômetro do Leicybot-. Que espetáculo!`;
    },

    // Mensagens exclusivas de anúncio para os 30 títulos combinados
    obterAnuncioTitulo: (t1, t2) => {
        if (t1 && t2) {
            return `░▒▓█████████████████████████████████████▓▒░\n  🌊  𝗣𝗥𝗘𝗦𝗘𝗡𝗖𝗔 𝗦𝗨𝗣𝗥𝗘𝗠𝗔 𝗗𝗨𝗣𝗟𝗔  💧\n░▒▓█████████████████████████████████████▓▒░\n🌊 Abram espaço no chat! O mar se fende para a entrada combinada de:\n👑 *${t1}* & *${t2}*!\n\n💧 curvem-se diante dessa dupla implacável!`;
        }
        
        const tAtivo = t1 || t2;
        // Personalização máxima por nome de título
        if (tAtivo.includes("Muzan") || tAtivo.includes("Superior")) {
            return `░▒▓ 🩸 𝗔𝗟𝗘𝗥𝗧𝗔 𝗗𝗘 𝗢𝗡𝗜 ▓▒░\n\n🚨 As sombras tomaram o grupo! Sintam a pressão esmagadora do *${tAtivo}* marcando presença no chat! 🌊`;
        }
        if (tAtivo.includes("Hashira") || tAtivo.includes("Água")) {
            return `░▒▓ 🌊 𝗥𝗘𝗦𝗣𝗜𝗥𝗔𝗖𝗔𝗢 𝗗𝗔 𝗔𝗚𝗨𝗔 ▓▒░\n\n💧 A calmaria precede a tempestade. O imponente *${tAtivo}* purificou o chat com sua presença!`;
        }
        if (tAtivo.includes("Piratas")) {
            return `🏴‍☠️ *O REIS DOS PIRATAS CHEGOU!* Levantem as âncoras e guardem seus Golds, a lenda está no chat! 🌊`;
        }
        
        return `░▒▓ 🌊 𝗔𝗡𝗨𝗡𝗖𝗜𝗢 𝗗𝗘 𝗣𝗥𝗘𝗦𝗘𝗡𝗖𝗔 ▓▒░\n\n👤 Olhem e admirem a imponência de *${tAtivo}* espalhando sua graça no grupo! 💧`;
    }
};
