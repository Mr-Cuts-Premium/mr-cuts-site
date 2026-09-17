window.MR_CUTS_CARDAPIO_CONFIG = {
  supabaseUrl: 'https://ihzlodoaerpqygwtmclf.supabase.co',
  supabaseAnonKey: 'sb_publishable_xeAFGI3QSelWxVMLoYjk_g_Vv06Q2Uq',
  tables: {
    services: 'servicos',
    packages: 'regras_pacote',
    products: 'produtos',
    shop: 'barbearia'
  },
  columns: {
    id: 'id',
    name: 'nome',
    category: 'categoria',
    duration: 'duracao_min',
    price: 'preco_centavos',
    fromPrice: 'preco_a_partir_de',
    active: 'ativo',
    order: 'ordem',
    combo: 'eh_combo',
    vip: 'vip',
    description: 'descricao'
  },
  priceDivisor: 100
};
