(function () {
  'use strict';

  var config = window.MR_CUTS_CARDAPIO_CONFIG || {};
  var columns = config.columns || {};
  var root = document.querySelector('.cardapio');
  var statusEl = document.getElementById('cardapio-status');

  // Mesma grade do gerar-cardapio.js (categorias normalizadas, sem acento).
  var LAYOUT = [
    {
      title: 'Corte',
      groups: [{ title: null, categories: ['corte'] }]
    },
    {
      title: 'Barba',
      groups: [
        { title: null, categories: ['barba'] },
        { title: 'Estética', categories: ['estetica'] }
      ]
    },
    {
      title: 'Química',
      groups: [{ title: null, categories: ['quimica'] }]
    }
  ];

  if (!root || !config.supabaseUrl || !config.supabaseAnonKey || !config.table) {
    return;
  }

  setStatus('Atualizando preços…', 'carregando');
  root.setAttribute('aria-busy', 'true');
  root.classList.add('cardapio-carregando');

  var params = new URLSearchParams();
  params.set('select', [columns.id, columns.name, columns.category,
    columns.duration, columns.price, columns.fromPrice, columns.active,
    columns.order].join(','));
  if (columns.active) {
    params.set(columns.active, 'eq.true');
  }
  params.set('order', (columns.order || columns.name) + '.asc');

  fetch(config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/' +
    encodeURIComponent(config.table) + '?' + params.toString(), {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: 'Bearer ' + config.supabaseAnonKey
      }
    })
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Não foi possível atualizar o cardápio.');
      }
      return response.json();
    })
    .then(function (services) {
      if (!Array.isArray(services)) {
        throw new Error('Resposta inválida do cardápio.');
      }
      if (services.length === 0) {
        root.replaceChildren();
        root.appendChild(buildEmptyMessage());
        setStatus('Nenhum serviço ativo no momento.', 'vazio');
        return;
      }
      renderMenu(services);
      setStatus('', '');
    })
    .catch(function (error) {
      // O HTML estático continua sendo o fallback quando a API falha.
      console.warn('[cardapio] mantendo preços estáticos:', error.message);
      setStatus('Exibindo preços salvos na página — não foi possível sincronizar agora.', 'aviso');
    })
    .finally(function () {
      root.removeAttribute('aria-busy');
      root.classList.remove('cardapio-carregando');
    });

  function renderMenu(services) {
    var fragment = document.createDocumentFragment();
    var rendered = 0;

    LAYOUT.forEach(function (column) {
      var columnEl = document.createElement('div');
      var hasContent = false;

      column.groups.forEach(function (group, index) {
        var items = services.filter(function (service) {
          return group.categories.indexOf(
            normalizeCategory(service[columns.category])) !== -1;
        });
        if (items.length === 0) {
          return;
        }

        var heading = document.createElement('h3');
        heading.textContent = group.title || column.title;
        if (group.title && index > 0) {
          heading.style.marginTop = '2rem';
        }
        columnEl.appendChild(heading);

        var list = document.createElement('ul');
        items.forEach(function (service) {
          list.appendChild(buildItem(service));
          rendered += 1;
        });
        columnEl.appendChild(list);
        hasContent = true;
      });

      if (hasContent) {
        fragment.appendChild(columnEl);
      }
    });

    // Serviços com categoria fora do mapa conhecido ficam numa coluna extra.
    var known = {};
    LAYOUT.forEach(function (column) {
      column.groups.forEach(function (group) {
        group.categories.forEach(function (category) {
          known[category] = true;
        });
      });
    });
    var extras = services.filter(function (service) {
      return !known[normalizeCategory(service[columns.category])];
    });
    if (extras.length > 0) {
      var extraCol = document.createElement('div');
      var extraHeading = document.createElement('h3');
      extraHeading.textContent = 'Outros';
      extraCol.appendChild(extraHeading);
      var extraList = document.createElement('ul');
      extras.forEach(function (service) {
        extraList.appendChild(buildItem(service));
        rendered += 1;
      });
      extraCol.appendChild(extraList);
      fragment.appendChild(extraCol);
    }

    if (rendered === 0) {
      root.replaceChildren();
      root.appendChild(buildEmptyMessage());
      setStatus('Nenhum serviço ativo no momento.', 'vazio');
      return;
    }

    root.replaceChildren(fragment);
  }

  function buildItem(service) {
    var price = service[columns.price];
    var fromPrice = service[columns.fromPrice];
    var li = document.createElement('li');
    li.dataset.servico = slugify(service[columns.name] || service[columns.id] || '');

    var nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = service[columns.name] || '';

    var pontilhado = document.createElement('span');
    pontilhado.className = 'pontilhado';

    var dur = document.createElement('span');
    dur.className = 'dur';
    dur.textContent = (service[columns.duration] == null ? '—' :
      service[columns.duration] + ' min');

    var valor = document.createElement('span');
    valor.className = 'valor';
    if (price === null || price === undefined) {
      valor.textContent = '—';
    } else {
      valor.textContent = (fromPrice ? 'a partir de ' : '') +
        formatPrice(price / (config.priceDivisor || 1));
    }

    li.appendChild(nome);
    li.appendChild(pontilhado);
    li.appendChild(dur);
    li.appendChild(valor);
    return li;
  }

  function buildEmptyMessage() {
    var p = document.createElement('p');
    p.className = 'cardapio-vazio';
    p.textContent = 'O cardápio está sendo atualizado. Volte em breve ou fale com a recepção.';
    return p;
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
}());
