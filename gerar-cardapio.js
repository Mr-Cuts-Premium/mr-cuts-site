#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const siteRoot = __dirname;
const htmlPath = path.join(siteRoot, 'index.html');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const priceDivisor = Number(process.env.SUPABASE_PRICE_DIVISOR || 100);
const columns = {
  id: process.env.SUPABASE_COLUMN_ID || 'id',
  name: process.env.SUPABASE_COLUMN_NAME || 'nome',
  category: process.env.SUPABASE_COLUMN_CATEGORY || 'categoria',
  duration: process.env.SUPABASE_COLUMN_DURATION || 'duracao_min',
  price: process.env.SUPABASE_COLUMN_PRICE || 'preco_centavos',
  fromPrice: process.env.SUPABASE_COLUMN_FROM_PRICE || 'preco_a_partir_de',
  active: process.env.SUPABASE_COLUMN_ACTIVE || 'ativo',
  order: process.env.SUPABASE_COLUMN_ORDER || 'ordem',
  combo: 'eh_combo',
  vip: 'vip'
};

const LAYOUT = [
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

if (!url || !key) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY antes de gerar.');
}

async function generate() {
  const [services, combos, packages, shopRows, products] = await Promise.all([
    rest('servicos', {
      select: Object.values(columns).join(','),
      [columns.active]: 'eq.true',
      order: `${columns.order}.asc`
    }),
    rest('servicos', {
      select: `${columns.id},${columns.name},${columns.price},${columns.duration},${columns.order},combo_itens!combo_itens_combo_id_fkey(ordem,servicos!combo_itens_servico_id_fkey(${columns.name},${columns.price}))`,
      ativo: 'eq.true',
      eh_combo: 'eq.true',
      order: `${columns.order}.asc`
    }),
    rest('regras_pacote', {
      select: 'id,nome,tipo,minimo,desconto_pct,ordem',
      ativo: 'eq.true',
      order: 'ordem.asc'
    }),
    rest('barbearia', {
      select: 'desconto_convidado_pct,credito_indicacao_centavos,credito_indicacao_validade_dias,desconto_aniversario_pct,aniversario_brinde_texto,cancelamento_limite_horas,intervalo_grade_min',
      id: 'eq.1'
    }),
    rest('produtos', {
      select: 'id,nome,preco_centavos,ordem',
      ativo: 'eq.true',
      para_venda: 'eq.true',
      order: 'ordem.asc'
    })
  ]);

  const regular = services.filter((service) => service[columns.vip] !== true);
  const vip = services.filter((service) => service[columns.vip] === true);
  const shop = shopRows[0] || {};
  let html = await fs.readFile(htmlPath, 'utf8');

  html = replaceBlock(html, 'CARDAPIO', renderCardapio(regular));
  html = replaceBlock(html, 'COMBOS', renderCombos(combos));
  html = replaceBlock(html, 'PACOTES', renderPackages(packages));
  html = replaceBlock(html, 'PRODUTOS', renderProducts(products));
  html = replaceBlock(html, 'VIP', renderVip(vip));

  html = html.replace(
    /(<span class="n" id="hero-n-servicos">)[^<]*/,
    `$1${regular.length}`
  );

  const hours = Number(shop.cancelamento_limite_horas);
  if (hours > 0) {
    html = html.replace(
      /(<[^>]*data-cancelamento-horas[^>]*>)[^<]*/g,
      `$1${hours}`
    );
  }
  const grade = Number(shop.intervalo_grade_min);
  if (grade > 0) {
    html = html.replace(
      /(<[^>]*data-intervalo-min[^>]*>)[^<]*/g,
      `$1${grade}`
    );
  }

  html = fillInvite(html, shop);
  html = fillBirthday(html, shop);

  await fs.writeFile(htmlPath, html, 'utf8');
  console.log(
    `Vitrine atualizada: ${regular.length} serviços, ${combos.length} combos, ` +
    `${packages.length} pacotes, ${vip.length} VIP, ${products.length} produtos.`
  );
}

function renderCardapio(services) {
  const generated = LAYOUT.map((column) => renderColumn(column, services))
    .filter(Boolean)
    .join('\n\n      ');
  return `    <div class="cardapio" style="margin-top:2rem">\n      ${generated}\n    </div>\n`;
}

function renderColumn(column, services) {
  const items = [];
  column.groups.forEach((group) => {
    services.filter((service) =>
      group.categories.includes(normalizeCategory(service[columns.category])))
      .forEach((service) => items.push(service));
  });
  if (items.length === 0) {
    return '';
  }

  const tag = column.tag
    ? `\n          <span class="cardapio-cat-tag">${escapeHtml(column.tag)}</span>`
    : '';
  const category = column.category ? ` data-categoria="${escapeHtml(column.category)}"` : '';

  return `<div class="cardapio-cat"${category}>
        <div class="cardapio-cat-cabeca">
          <h3><span class="cardapio-ico" aria-hidden="true"></span> ${escapeHtml(column.title)}</h3>${tag}
        </div>
        <ul>
${items.map(renderServiceItem).join('')}        </ul>
      </div>`;
}

function renderServiceItem(service) {
  const id = slugify(service[columns.name] || service[columns.id]);
  const price = `${service[columns.fromPrice] ? 'a partir de ' : ''}${formatPrice(service[columns.price] / priceDivisor)}`;
  const combo = service[columns.combo]
    ? ` data-combo="true"`
    : '';
  const comboTag = service[columns.combo]
    ? ' <span class="tag-combo">Combo</span>'
    : '';
  return `          <li data-servico="${escapeHtml(id)}"${combo}><span class="nome">${escapeHtml(service[columns.name])}${comboTag}</span><span class="pontilhado"></span><span class="dur">${escapeHtml(String(service[columns.duration]))} min</span><span class="valor">${escapeHtml(price)}</span></li>\n`;
}

function renderCombos(combos) {
  if (combos.length === 0) {
    return '    <div class="grade-ofertas" id="combos-lista"></div>\n';
  }
  const cards = combos.map((combo) => {
    const parts = (combo.combo_itens || [])
      .slice()
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    const names = parts.map((part) => (part.servicos || {}).nome).filter(Boolean);
    const full = parts.reduce((sum, part) =>
      sum + Number((part.servicos || {}).preco_centavos || 0), 0);
    const price = Number(combo[columns.price] || 0);
    const saved = full > price ? full - price : 0;
    const destaque = saved > 0 ? ' destaque' : '';
    const extras = [];
    if (names.length) {
      extras.push(`          <li>${escapeHtml(names.join(' + '))}</li>`);
    }
    if (combo[columns.duration] != null) {
      extras.push(`          <li>${escapeHtml(String(combo[columns.duration]))} min</li>`);
    }
    if (saved > 0) {
      extras.push(`          <li>Economize ${escapeHtml(formatPrice(saved / priceDivisor))} em relação às partes</li>`);
    }
    return `      <div class="cartao oferta${destaque}" data-combo="${escapeHtml(slugify(combo[columns.name] || combo[columns.id]))}">
        <span class="oferta-rotulo">Combo</span>
        <h3>${escapeHtml(combo[columns.name])}</h3>
        <div class="preco">${escapeHtml(formatPrice(price / priceDivisor))}</div>
        <ul>
${extras.join('\n')}
        </ul>
      </div>`;
  }).join('\n');
  return `    <div class="grade-ofertas" id="combos-lista">\n${cards}\n    </div>\n`;
}

function renderPackages(packages) {
  if (packages.length === 0) {
    return '    <div id="pacotes-lista"></div>\n';
  }
  const items = packages.map((rule) => {
    const threshold = rule.tipo === 'valor'
      ? `pedido mínimo ${formatPrice(Number(rule.minimo || 0) / priceDivisor)}`
      : `${rule.minimo} ${Number(rule.minimo) === 1 ? 'serviço' : 'serviços'}`;
    return `          <li data-pacote="${escapeHtml(slugify(rule.nome || rule.id))}"><span class="nome">${escapeHtml(rule.nome)}</span><span class="pontilhado"></span><span class="dur">${escapeHtml(threshold)}</span><span class="valor">${escapeHtml(formatPercent(rule.desconto_pct))} de desconto</span></li>\n`;
  }).join('');
  return `    <div id="pacotes-lista">
      <div class="cardapio cardapio-produtos" style="margin-top:2rem">
        <div class="cardapio-cat" data-categoria="pacotes">
          <div class="cardapio-cat-cabeca">
            <h3><span class="cardapio-ico" aria-hidden="true"></span> Faixas de desconto</h3>
          </div>
          <ul>
${items}          </ul>
        </div>
      </div>
    </div>\n`;
}

function renderProducts(products) {
  if (products.length === 0) {
    return `        <ul class="lista-produtos">
          <li><span class="nome">Consulte o aplicativo</span><span class="pontilhado"></span><span class="valor">—</span></li>
        </ul>\n`;
  }
  const items = products.map((product) =>
    `          <li><span class="nome">${escapeHtml(product.nome)}</span><span class="pontilhado"></span><span class="valor">${escapeHtml(formatPrice(product.preco_centavos / priceDivisor))}</span></li>\n`
  ).join('');
  return `        <ul class="lista-produtos">\n${items}        </ul>\n`;
}

function renderVip(vip) {
  if (vip.length === 0) {
    return '    <div id="vip-lista"></div>\n';
  }
  const items = vip.map(renderServiceItem).join('');
  return `    <div id="vip-lista">
      <div class="cardapio cardapio-produtos" style="margin-top:2rem">
        <div class="cardapio-cat" data-categoria="vip">
          <div class="cardapio-cat-cabeca">
            <h3><span class="cardapio-ico" aria-hidden="true"></span> Sala VIP</h3>
          </div>
          <ul>
${items}          </ul>
        </div>
      </div>
    </div>\n`;
}

function fillInvite(html, shop) {
  const discount = Number(shop.desconto_convidado_pct || 0);
  const credit = Number(shop.credito_indicacao_centavos || 0);
  const validade = Number(shop.credito_indicacao_validade_dias || 0);
  if (discount > 0) {
    html = html.replace(
      /(<span id="convite-desconto">)[^<]*/,
      `$1${formatPercent(discount)}`
    );
  }
  if (credit > 0) {
    html = html.replace(
      /(<span id="convite-moeda">)[^<]*/,
      `$1${formatPrice(credit / priceDivisor)}`
    );
  }
  html = html.replace(
    /(<span id="convite-validade">)[^<]*/,
    `$1${validade > 0 ? `As moedas valem por ${validade} dias.` : 'As moedas não expiram.'}`
  );
  return html;
}

function fillBirthday(html, shop) {
  const discount = Number(shop.desconto_aniversario_pct || 0);
  const gift = String(shop.aniversario_brinde_texto || '').trim();
  if (discount > 0) {
    html = html.replace(
      /(<span id="aniversario-desconto">)[^<]*/,
      `$1${formatPercent(discount)}`
    );
  }
  html = html.replace(
    /(<span id="aniversario-brinde">)[^<]*/,
    `$1${escapeHtml(gift)}`
  );
  return html;
}

async function rest(table, search) {
  const params = new URLSearchParams(search);
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) {
    throw new Error(`Supabase respondeu HTTP ${response.status} em ${table}.`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error(`Resposta inválida em ${table}.`);
  }
  return rows;
}

function replaceBlock(html, name, inner) {
  const startToken = `    <!-- ${name}:inicio -->`;
  const endToken = `    <!-- ${name}:fim -->`;
  const start = html.indexOf(startToken);
  const end = html.indexOf(endToken);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Marcadores ${name} não encontrados em index.html.`);
  }
  return html.slice(0, start) + startToken + '\n' + inner + html.slice(end);
}

function formatPrice(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(value) {
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
}

function normalizeCategory(value) {
  return slugify(value || '');
}

function slugify(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

generate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
