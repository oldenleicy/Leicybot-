// modulos/usuarioPadrao.js
// Fonte única de verdade para os campos de um usuário novo.
// Use isto sempre que precisar criar um registro em db.usuarios, em vez
// de montar o objeto na mão em cada módulo — isso evita usuários com
// campos faltando dependendo de qual comando eles usaram primeiro.

module.exports = function criarUsuarioPadrao() {
    return {
        // ── Economia ──────────────────────────────────────────────
        golds: 0,
        banco: 0,
        trabalhos_hoje: 0,
        mineracoes_hoje: 0,
        pescas_hoje: 0,
        raspadinhas_hoje: 0,
        ultimo_mensagem_data: "",   // data (string) usada pra resetar os contadores diários acima
        ultimo_bonus_diario: "",    // idem, pro bônus diário automático de +20 golds

        // Itens da loja (v2)
        escudo: false,              // bloqueia 100% de 1 !assaltar, quebra depois do uso
        seguro_parcial: false,      // reduz pela metade o valor roubado, não quebra com o uso
        cofre_blindado: false,      // reduz a chance de sucesso de !roubar (mira o banco) contra você
        isca_especial_ate: null,    // timestamp de expiração do bônus de !pescar
        sorte_grande_jogadas: 0,    // fichas restantes do bônus de chance em roleta/slots/dados

        investimento: null,         // { valor, criado_em, resgatavel_em, bonus_pct } — !investir / !resgatar

        historico_roubos: [],       // [{ atacante, tipo: 'carteira'|'banco', sucesso, timestamp }]
        emprestimos_feitos: [],     // [{ devedor, valor, timestamp }]   — golds que emprestou (quem te deve)
        emprestimos_recebidos: [],  // [{ credor, valor, timestamp }]   — golds que pegou emprestado (a quem deve)

        // ── Títulos ───────────────────────────────────────────────
        titulos_criados: [],
        titulo_especial: null,      // slot 2 — só o dono concede (!dartitulo / !addcelestial), nunca comprável
        titulo_comprado: null,      // slot 1 — só pela loja (!comprar), 1 título por vez
        data_expiracao: null,       // expiração do titulo_comprado (1 semana)
        apresentacao: false,
        ultimo_anuncio: null,       // throttle do anúncio automático de título (3h) — já existia em uso, faltava aqui

        // ── Perfil / interação social ────────────────────────────
        mensagens_contadas: 0,
        ultima_interacao: Date.now(),
        bio: "Nenhuma descrição definida ainda. Use !setbio",
        idade: "Não informada",
        estado_civil: "Solteiro(a)",
        casamentos_total: 0,
        conjugue: null,
        pedido_casamento: null,
        beijados: 0,
        abracados: 0,

        // ── Moderação ─────────────────────────────────────────────
        advertencias: [],
        permissoes_especiais: [],
        mutado_ate: null,           // timestamp — !mutar
        historico_mensagens: [],    // timestamps recentes, usado pelo !antiflood
        ultima_mensagem_slow: null  // timestamp, usado pelo !modolento
    };
};
