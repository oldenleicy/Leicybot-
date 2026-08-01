// modulos/usuarioPadrao.js
// Fonte única de verdade para os campos de um usuário novo.
// Use isto sempre que precisar criar um registro em db.usuarios, em vez
// de montar o objeto na mão em cada módulo — isso evita usuários com
// campos faltando dependendo de qual comando eles usaram primeiro.

module.exports = function criarUsuarioPadrao() {
    return {
        golds: 0,                       // saldo em mãos
        banco: 0,                       // saldo no banco
        mensagens_contadas: 0,          // total de mensagens enviadas
        ultimo_mensagem_data: "",       // data da última mensagem para reset diário
        ultima_interacao: Date.now(),   // timestamp da última interação
        bio: "Nenhuma descrição definida ainda. Use !setbio",
        idade: "Não informada",
        estado_civil: "Solteiro(a)",
        casamentos_total: 0,
        conjugue: null,                 // JID do cônjuge
        pedido_casamento: null,         // JID de quem pediu em casamento
        beijados: 0,
        abracados: 0,
        advertencias: [],               // timestamps de advertências
        titulo_slot1: null,             // slot 1: título comprado na loja
        titulo_slot2: null,             // slot 2: título especial concedido pelo dono
        apresentacao: false,            // se o anúncio de título está ativo
        permissoes_especiais: [],       // comandos que o usuário pode executar sem ser admin
        trabalhos_hoje: 0,
        mineracoes_hoje: 0,
        pescas_hoje: 0,                 // limite diário do comando !pescar
        raspadinhas_hoje: 0,            // limite diário do comando !raspadinha
        escudo: false,                  // item de proteção contra assalto
        seguro_parcial: false,          // reduz perda em assalto pela metade (consumível)
        cofre_blindado_ate: null,       // timestamp até quando o cofre blindado está ativo
        isca_especial_ate: null,        // timestamp até quando a isca especial está ativa
        sorte_grande_jogadas: 0,        // número de rodadas com melhores chances em jogos
        roubos_sofridos: [],            // histórico de roubos sofridos [{de, valor, timestamp}]
        dividas_emprestadas: [],        // dinheiro emprestado a outros [{para, valor, timestamp}]
        dividas_devidas: [],            // dinheiro que deve a outros [{de, valor, timestamp}]
        investimento_valor: 0,          // valor investido
        investimento_timestamp: null,   // timestamp do investimento
        itens: {},                      // itens consumíveis comprados (ex: { recarga: 2 })
        mutado_ate: null,               // timestamp até quando o usuário está silenciado
        ultima_mensagem_slow: null,     // timestamp da última mensagem (para slow mode)
        historico_mensagens: [],        // timestamps recentes para controle de flood
        ultimo_bonus_data: "",          // data do último bônus diário coletado
        ultimo_anuncio: null,           // timestamp do último anúncio de título
        data_expiracao: null            // timestamp de expiração do título comprado (1 semana)
    };
};