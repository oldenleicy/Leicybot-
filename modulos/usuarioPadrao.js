// modulos/usuarioPadrao.js
// Fonte única de verdade para os campos de um usuário novo.
// Use isto sempre que precisar criar um registro em db.usuarios, em vez
// de montar o objeto na mão em cada módulo — isso evita usuários com
// campos faltando dependendo de qual comando eles usaram primeiro.

module.exports = function criarUsuarioPadrao() {
    return {
        golds: 100,
        banco: 0,
        mensagens_contadas: 0,
        ultimo_mensagem_data: "",
        ultima_interacao: Date.now(),
        bio: "Nenhuma descrição definida ainda. Use !setbio",
        idade: "Não informada",
        estado_civil: "Solteiro(a)",
        casamentos_total: 0,
        conjugue: null,
        pedido_casamento: null,
        beijados: 0,
        abracados: 0,
        advertencias: [],
        titulos_criados: [],
        titulo_especial: null,
        titulo_1: null,
        titulo_2: null,
        apresentacao: false,
        permissoes_especiais: [],
        trabalhos_hoje: 0,
        mineracoes_hoje: 0,
        escudo: false,
        data_expiracao: null
    };
};
