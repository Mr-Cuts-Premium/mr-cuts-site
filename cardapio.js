(function () {
  'use strict';

  var config = window.MR_CUTS_CARDAPIO_CONFIG || {};
  var columns = config.columns || {};

  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.table) {
    return;
  }

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

      services.forEach(function (service) {
        var ids = [service[columns.id], service[columns.name]]
          .filter(Boolean).map(slugify);
        var item = Array.prototype.find.call(
          document.querySelectorAll('.cardapio [data-servico]'),
          function (candidate) {
            return ids.indexOf(candidate.dataset.servico) !== -1;
          });
        if (!item) {
          return;
        }

        var price = service[columns.price];
        var fromPrice = service[columns.fromPrice];
        if (price === null || price === undefined) {
          return;
        }

        item.querySelector('.dur').textContent =
          service[columns.duration] + ' min';
        item.querySelector('.valor').textContent = (fromPrice ?
          'a partir de ' : '') + formatPrice(price / (config.priceDivisor || 1));
      });
    })
    .catch(function (error) {
      // O HTML estático continua sendo o fallback quando a API falha.
      console.warn('[cardapio] mantendo preços estáticos:', error.message);
    });

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