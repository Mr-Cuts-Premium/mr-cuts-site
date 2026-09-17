(function () {
  'use strict';

  var config = window.MR_CUTS_CARDAPIO_CONFIG || {};
  var columns = config.columns || {};
  var tables = config.tables || {};
  var divisor = config.priceDivisor || 100;
  var servicesRoot = document.querySelector('#servicos .cardapio');
  var statusEl = document.getElementById('cardapio-status');

  var LAYOUT = [
    {
      title: 'Corte',
      category: 'corte',
      groups: [{ title: null, categories: ['corte'] }]
    },
    {
      title: 'Barba',
      category: 'barba',
      groups: [{ title: null, categories: ['barba'] }]
    },
    {
      title: 'Estética',
      category: 'estetica',
      groups: [{ title: null, categories: ['estetica'] }]
    },
    {
      title: 'Química',
      category: 'quimica',
      tag: 'A partir de',
      groups: [{ title: null, categories: ['quimica'] }]
    }
  ];

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  var serviceTable = tables.services || config.table || 'servicos';
  var packageTable = tables.packages || 'regras_pacote';
  var productTable = tables.products || 'produtos';
  var shopTable = tables.shop || 'barbearia';

  if (servicesRoot) {
    setStatus('Atualizando preços…', 'carregando');
    servicesRoot.setAttribute('aria-busy', 'true');
    servicesRoot.classList.add('cardapio-carregando');
  }

  var comboSelect = [
    columns.id, columns.name, columns.category, columns.duration,
    columns.price, columns.order,
    'combo_itens!combo_itens_combo_id_fkey(ordem,servicos!combo_itens_servico_id_fkey(' +
      columns.name + ',' + columns.price + '))'
  ].join(',');

  Promise.allSettled([
    rest(serviceTable, serviceParams()),
    rest(serviceTable, {
      select: comboSelect,
      ativo: 'eq.true',
      eh_combo: 'eq.true',
      order: (columns.order || columns.name) + '.asc'
    }),
    rest(packageTable, {
      select: 'id,nome,tipo,minimo,desconto_pct,ativo,ordem',
      ativo: 'eq.true',
      order: 'ordem.asc'
    }),
    rest(shopTable, {
      select: [
        'desconto_convidado_pct',
        'credito_indicacao_centavos',
        'credito_indicacao_validade_dias',
        'desconto_aniversario_pct',
        'aniversario_brinde_texto',
        'cancelamento_limite_horas',
        'intervalo_grade_min',
        'desconto_primeiro_corte_pct'
      ].join(','),
      id: 'eq.1',
      limit: '1'
    }),
    rest(productTable, {
      select: 'id,nome,preco_centavos,ordem',
      ativo: 'eq.true',
      para_venda: 'eq.true',
      order: 'ordem.asc'
    })
  ]).then(function (results) {
    var services = valueOf(results[0], []);
    var combos = valueOf(results[1], []);
    var packages = valueOf(results[2], []);
    var shopRows = valueOf(results[3], []);
    var products = valueOf(results[4], []);
    var shop = shopRows[0] || null;

    if (results[0].status === 'fulfilled') {
      renderServices(services);
    } else if (servicesRoot) {
      console.warn('[vitrine] serviços estáticos:', results[0].reason);
      setStatus('Exibindo preços salvos na página — não foi possível sincronizar agora.', 'aviso');
    }

    if (results[1].status === 'fulfilled') {
      renderCombos(combos);
    } else {
      console.warn('[vitrine] combos estáticos:', results[1].reason);
    }

    if (results[2].status === 'fulfilled') {
      renderPackages(packages);
    } else {
      console.warn('[vitrine] pacotes estáticos:', results[2].reason);
    }

    if (results[3].status === 'fulfilled') {
      renderShop(shop);
    } else {
      console.warn('[vitrine] regras estáticas:', results[3].reason);
    }

    if (results[4].status === 'fulfilled') {
      renderProducts(products);
    } else {
      console.warn('[vitrine] produtos estáticos:', results[4].reason);
    }

    renderVip(services, results[0].status === 'fulfilled');
  }).finally(function () {
    if (!servicesRoot) {
      return;
    }
    servicesRoot.removeAttribute('aria-busy');
    servicesRoot.classList.remove('cardapio-carregando');
  });

  function serviceParams() {
    var params = {
      select: [
        columns.id, columns.name, columns.category, columns.duration,
        columns.price, columns.fromPrice, columns.active, columns.order,
        columns.combo, columns.vip, columns.description
      ].filter(Boolean).join(','),
      order: (columns.order || columns.name) + '.asc'
    };
    if (columns.active) {
      params[columns.active] = 'eq.true';
    }
    return params;
  }

  function rest(table, search) {
    var params = new URLSearchParams();
    Object.keys(search).forEach(function (key) {
      if (search[key] != null && search[key] !== '') {
        params.set(key, search[key]);
      }
    });
    return fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' +
      encodeURIComponent(table) + '?' + params.toString(), {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: 'Bearer ' + config.supabaseAnonKey
        }
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status + ' em ' + table);
        }
        return response.json();
      });
  }

  function valueOf(result, fallback) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) {
      return fallback;
    }
    return result.value;
  }

  function renderServices(services) {
    if (!servicesRoot) {
      return;
    }
    var regular = services.filter(function (service) {
      return service[columns.vip] !== true;
    });
    if (regular.length === 0) {
      servicesRoot.replaceChildren();
      servicesRoot.appendChild(buildEmptyMessage(
        'O cardápio está sendo atualizado. Volte em breve ou fale com a recepção.'));
      setStatus('Nenhum serviço ativo no momento.', 'vazio');
      return;
    }
    var fragment = document.createDocumentFragment();
    var rendered = 0;
    var known = {};

    LAYOUT.forEach(function (column) {
      var items = regular.filter(function (service) {
        return column.groups.some(function (group) {
          return group.categories.indexOf(
            normalizeCategory(service[columns.category])) !== -1;
        });
      });
      column.groups.forEach(function (group) {
        group.categories.forEach(function (category) {
          known[category] = true;
        });
      });
      if (items.length === 0) {
        return;
      }
      fragment.appendChild(buildCategory(column, items));
      rendered += items.length;
    });

    var extras = regular.filter(function (service) {
      return !known[normalizeCategory(service[columns.category])];
    });
    if (extras.length > 0) {
      fragment.appendChild(buildCategory({ title: 'Outros', category: 'outros' }, extras));
      rendered += extras.length;
    }

    if (rendered === 0) {
      servicesRoot.replaceChildren();
      servicesRoot.appendChild(buildEmptyMessage(
        'O cardápio está sendo atualizado. Volte em breve ou fale com a recepção.'));
      setStatus('Nenhum serviço ativo no momento.', 'vazio');
      return;
    }

    servicesRoot.replaceChildren(fragment);
    setStatus('', '');
    setText('hero-n-servicos', String(regular.length));
  }

  function buildCategory(column, items) {
    var columnEl = document.createElement('div');
    columnEl.className = 'cardapio-cat';
    if (column.category) {
      columnEl.dataset.categoria = column.category;
    }
    columnEl.appendChild(buildCategoryHead(column.title, column.tag));
    var list = document.createElement('ul');
    items.forEach(function (service) {
      list.appendChild(buildServiceItem(service));
    });
    columnEl.appendChild(list);
    return columnEl;
  }

  function buildServiceItem(service) {
    var li = buildPricedItem(
      service[columns.name],
      service[columns.duration],
      service[columns.price],
      service[columns.fromPrice],
      slugify(service[columns.name] || service[columns.id] || '')
    );
    if (service[columns.combo]) {
      li.dataset.combo = 'true';
      var tag = document.createElement('span');
      tag.className = 'tag-combo';
      tag.textContent = 'Combo';
      li.querySelector('.nome').appendChild(document.createTextNode(' '));
      li.querySelector('.nome').appendChild(tag);
    }
    return li;
  }

  function renderCombos(combos) {
    var root = document.getElementById('combos-lista');
    var section = document.getElementById('combos');
    if (!root || !section) {
      return;
    }
    if (!combos.length) {
      setSectionVisible(section, false);
      return;
    }
    var fragment = document.createDocumentFragment();
    combos.forEach(function (combo) {
      fragment.appendChild(buildComboCard(combo));
    });
    root.replaceChildren(fragment);
    setSectionVisible(section, true);
  }

  function buildComboCard(combo) {
    var parts = (combo.combo_itens || []).slice().sort(function (a, b) {
      return (a.ordem || 0) - (b.ordem || 0);
    });
    var partNames = [];
    var fullPrice = 0;
    parts.forEach(function (part) {
      var inner = part.servicos || {};
      var name = inner[columns.name] || inner.nome;
      if (name) {
        partNames.push(name);
      }
      fullPrice += Number(inner[columns.price] || inner.preco_centavos || 0);
    });
    var price = Number(combo[columns.price] || 0);
    var saved = fullPrice > price ? fullPrice - price : 0;

    var card = document.createElement('div');
    card.className = 'cartao oferta' + (saved > 0 ? ' destaque' : '');
    card.dataset.combo = slugify(combo[columns.name] || combo[columns.id] || '');

    var rotulo = document.createElement('span');
    rotulo.className = 'oferta-rotulo';
    rotulo.textContent = 'Combo';

    var title = document.createElement('h3');
    title.textContent = combo[columns.name] || '';

    var preco = document.createElement('div');
    preco.className = 'preco';
    preco.textContent = formatPrice(price / divisor);

    var list = document.createElement('ul');
    if (partNames.length) {
      list.appendChild(listItem(partNames.join(' + ')));
    }
    if (combo[columns.duration] != null) {
      list.appendChild(listItem(combo[columns.duration] + ' min'));
    }
    if (saved > 0) {
      list.appendChild(listItem('Economize ' + formatPrice(saved / divisor) +
        ' em relação às partes'));
    }

    card.appendChild(rotulo);
    card.appendChild(title);
    card.appendChild(preco);
    card.appendChild(list);
    return card;
  }

  function renderPackages(packages) {
    var root = document.getElementById('pacotes-lista');
    var section = document.getElementById('pacotes');
    if (!root || !section) {
      return;
    }
    if (!packages.length) {
      setSectionVisible(section, false);
      return;
    }
    var cat = document.createElement('div');
    cat.className = 'cardapio-cat';
    cat.dataset.categoria = 'pacotes';
    cat.appendChild(buildCategoryHead('Faixas de desconto'));
    var list = document.createElement('ul');
    packages.forEach(function (rule) {
      list.appendChild(buildPackageItem(rule));
    });
    cat.appendChild(list);
    var wrap = document.createElement('div');
    wrap.className = 'cardapio cardapio-produtos';
    wrap.style.marginTop = '2rem';
    wrap.appendChild(cat);
    root.replaceChildren(wrap);
    setSectionVisible(section, true);
  }

  function buildPackageItem(rule) {
    var li = document.createElement('li');
    li.dataset.pacote = slugify(rule.nome || rule.id || '');

    var nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = rule.nome || packageLabel(rule);

    var pontilhado = document.createElement('span');
    pontilhado.className = 'pontilhado';

    var dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = packageThreshold(rule);

    var valor = document.createElement('span');
    valor.className = 'valor';
    valor.textContent = formatPercent(rule.desconto_pct) + ' de desconto';

    li.appendChild(nome);
    li.appendChild(pontilhado);
    li.appendChild(dur);
    li.appendChild(valor);
    return li;
  }

  function packageLabel(rule) {
    if (rule.tipo === 'valor') {
      return 'A partir de ' + formatPrice(Number(rule.minimo || 0) / divisor);
    }
    return 'A partir de ' + Number(rule.minimo || 0) + ' serviços';
  }

  function packageThreshold(rule) {
    if (rule.tipo === 'valor') {
      return 'pedido mínimo ' + formatPrice(Number(rule.minimo || 0) / divisor);
    }
    var n = Number(rule.minimo || 0);
    return n + (n === 1 ? ' serviço' : ' serviços');
  }

  function renderProducts(products) {
    var list = document.querySelector('#produtos .lista-produtos');
    var aviso = document.getElementById('produtos-aviso');
    if (!list) {
      return;
    }
    if (!products.length) {
      return;
    }
    list.replaceChildren();
    products.forEach(function (product) {
      var li = document.createElement('li');
      var nome = document.createElement('span');
      nome.className = 'nome';
      nome.textContent = product.nome || '';
      var pontilhado = document.createElement('span');
      pontilhado.className = 'pontilhado';
      var valor = document.createElement('span');
      valor.className = 'valor';
      valor.textContent = formatPrice(Number(product.preco_centavos || 0) / divisor);
      li.appendChild(nome);
      li.appendChild(pontilhado);
      li.appendChild(valor);
      list.appendChild(li);
    });
    if (aviso) {
      aviso.hidden = true;
    }
  }

  function renderShop(shop) {
    if (!shop) {
      return;
    }
    renderInvite(shop);
    renderBirthday(shop);

    var hours = Number(shop.cancelamento_limite_horas);
    if (hours > 0) {
      document.querySelectorAll('[data-cancelamento-horas]').forEach(function (el) {
        el.textContent = String(hours);
      });
    }
    var grade = Number(shop.intervalo_grade_min);
    if (grade > 0) {
      document.querySelectorAll('[data-intervalo-min]').forEach(function (el) {
        el.textContent = String(grade);
      });
    }
  }

  function renderInvite(shop) {
    var section = document.getElementById('convite');
    if (!section) {
      return;
    }
    var discount = Number(shop.desconto_convidado_pct || 0);
    var credit = Number(shop.credito_indicacao_centavos || 0);
    if (discount <= 0 && credit <= 0) {
      setSectionVisible(section, false);
      return;
    }
    setText('convite-desconto', discount > 0 ? formatPercent(discount) : '');
    setText('convite-moeda', credit > 0 ? formatPrice(credit / divisor) : '');
    var validade = Number(shop.credito_indicacao_validade_dias || 0);
    var validadeEl = document.getElementById('convite-validade');
    if (validadeEl) {
      validadeEl.textContent = validade > 0
        ? 'As moedas valem por ' + validade + ' dias.'
        : 'As moedas não expiram.';
    }
    toggleHidden('convite-desconto-bloco', discount <= 0);
    toggleHidden('convite-moeda-bloco', credit <= 0);
    setSectionVisible(section, true);
  }

  function renderBirthday(shop) {
    var section = document.getElementById('aniversario');
    if (!section) {
      return;
    }
    var discount = Number(shop.desconto_aniversario_pct || 0);
    var gift = (shop.aniversario_brinde_texto || '').trim();
    if (discount <= 0 && !gift) {
      setSectionVisible(section, false);
      return;
    }
    setText('aniversario-desconto', discount > 0 ? formatPercent(discount) : '');
    setText('aniversario-brinde', gift);
    toggleHidden('aniversario-desconto-bloco', discount <= 0);
    toggleHidden('aniversario-brinde-bloco', !gift);
    setSectionVisible(section, true);
  }

  function renderVip(services, fromApi) {
    var section = document.getElementById('vip');
    var root = document.getElementById('vip-lista');
    if (!section || !root) {
      return;
    }
    if (!fromApi) {
      return;
    }
    var vip = services.filter(function (service) {
      return service[columns.vip] === true;
    });
    if (!vip.length) {
      setSectionVisible(section, false);
      return;
    }
    var cat = document.createElement('div');
    cat.className = 'cardapio-cat';
    cat.dataset.categoria = 'vip';
    cat.appendChild(buildCategoryHead('Sala VIP'));
    var list = document.createElement('ul');
    vip.forEach(function (service) {
      list.appendChild(buildServiceItem(service));
    });
    cat.appendChild(list);
    var wrap = document.createElement('div');
    wrap.className = 'cardapio cardapio-produtos';
    wrap.style.marginTop = '2rem';
    wrap.appendChild(cat);
    root.replaceChildren(wrap);
    setSectionVisible(section, true);
  }

  function buildCategoryHead(title, tag) {
    var head = document.createElement('div');
    head.className = 'cardapio-cat-cabeca';

    var heading = document.createElement('h3');
    var icon = document.createElement('span');
    icon.className = 'cardapio-ico';
    icon.setAttribute('aria-hidden', 'true');
    heading.appendChild(icon);
    heading.appendChild(document.createTextNode(' ' + title));
    head.appendChild(heading);

    if (tag) {
      var tagEl = document.createElement('span');
      tagEl.className = 'cardapio-cat-tag';
      tagEl.textContent = tag;
      head.appendChild(tagEl);
    }
    return head;
  }

  function buildPricedItem(name, duration, price, fromPrice, slug) {
    var li = document.createElement('li');
    if (slug) {
      li.dataset.servico = slug;
    }

    var nome = document.createElement('span');
    nome.className = 'nome';
    nome.appendChild(document.createTextNode(name || ''));

    var pontilhado = document.createElement('span');
    pontilhado.className = 'pontilhado';

    var dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = duration == null ? '—' : duration + ' min';

    var valor = document.createElement('span');
    valor.className = 'valor';
    if (price === null || price === undefined) {
      valor.textContent = '—';
    } else {
      valor.textContent = (fromPrice ? 'a partir de ' : '') +
        formatPrice(price / divisor);
    }

    li.appendChild(nome);
    li.appendChild(pontilhado);
    li.appendChild(dur);
    li.appendChild(valor);
    return li;
  }

  function buildEmptyMessage(text) {
    var p = document.createElement('p');
    p.className = 'cardapio-vazio';
    p.textContent = text;
    return p;
  }

  function listItem(text) {
    var li = document.createElement('li');
    li.textContent = text;
    return li;
  }

  function setSectionVisible(section, visible) {
    section.hidden = !visible;
  }

  function toggleHidden(id, hidden) {
    var el = document.getElementById(id);
    if (el) {
      el.hidden = hidden;
    }
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el && value) {
      el.textContent = value;
    }
  }

  function setStatus(message, kind) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message || '';
    statusEl.hidden = !message;
    statusEl.className = 'cardapio-status' + (kind ? ' cardapio-status-' + kind : '');
  }

  function normalizeCategory(value) {
    return slugify(value || '');
  }

  function slugify(value) {
    return value.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function formatPrice(value) {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function formatPercent(value) {
    return Number(value).toLocaleString('pt-BR', {
      maximumFractionDigits: 2
    }) + '%';
  }
}());
