#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const siteRoot = __dirname;
const htmlPath = path.join(siteRoot, 'index.html');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const table = process.env.SUPABASE_TABLE || 'servicos';
const columns = {
  id: process.env.SUPABASE_COLUMN_ID || 'id',
  name: process.env.SUPABASE_COLUMN_NAME || 'nome',
  category: process.env.SUPABASE_COLUMN_CATEGORY || 'categoria',
  duration: process.env.SUPABASE_COLUMN_DURATION || 'duracao_min',
  price: process.env.SUPABASE_COLUMN_PRICE || 'preco_centavos',
  fromPrice: process.env.SUPABASE_COLUMN_FROM_PRICE || 'preco_a_partir_de',
  active: process.env.SUPABASE_COLUMN_ACTIVE || 'ativo',
  order: process.env.SUPABASE_COLUMN_ORDER || 'ordem'
};
const priceDivisor = Number(process.env.SUPABASE_PRICE_DIVISOR || 100);

// Colunas do cardápio: título da coluna + grupos (categoria do banco, case-insensitive).
const LAYOUT = [
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

if (!url || !key) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_ANON_KEY antes de gerar.');
}

async function generate() {
  const query = new URLSearchParams({
    select: Object.values(columns).join(','),
    order: `${columns.order}.asc`
  });
  query.set(columns.active, 'eq.true');

  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!response.ok) {
    throw new Error(`Supabase respondeu HTTP ${response.status}.`);
  }

  const services = await response.json();
  if (!Array.isArray(services) || services.length === 0) {
    throw new Error('Nenhum serviço ativo retornado pelo Supabase.');
  }

  const html = await fs.readFile(htmlPath, 'utf8');
  const start = html.indexOf('    <!-- CARDAPIO:inicio -->');
  const end = html.indexOf('    <!-- CARDAPIO:fim -->');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Marcadores CARDAPIO não encontrados em index.html.');
  }

  const generated = LAYOUT.map((column) => renderColumn(column, services)).join('\n\n      ');
  const replacement =
    `    <!-- CARDAPIO:inicio -->\n` +
    `    <div class="cardapio" style="margin-top:2.5rem">\n` +
    `      ${generated}\n` +
    `    </div>\n`;
  await fs.writeFile(htmlPath, html.slice(0, start) + replacement + html.slice(end), 'utf8');
  console.log(`Cardápio atualizado com ${services.length} serviços.`);
}

function renderColumn(column, services) {
  const parts = [];
  column.groups.forEach((group, index) => {
    const items = services.filter((service) =>
      group.categories.includes(normalizeCategory(service[columns.category])));
    if (items.length === 0) {
      return;
    }
    if (group.title) {
      const style = index > 0 ? ' style="margin-top:2rem"' : '';
      parts.push(`        <h3${style}>${escapeHtml(group.title)}</h3>`);
    } else if (index === 0) {
      parts.push(`        <h3>${escapeHtml(column.title)}</h3>`);
    }
    parts.push(`        <ul>\n${items.map(renderItem).join('')}        </ul>`);
  });
  return `<div>\n${parts.join('\n')}\n      </div>`;
}

function renderItem(service) {
  const id = slugify(service[columns.name] || service[columns.id]);
  const price = `${service[columns.fromPrice] ? 'a partir de ' : ''}${formatPrice(service[columns.price] / priceDivisor)}`;
  return `          <li data-servico="${escapeHtml(id)}"><span class="nome">${escapeHtml(service[columns.name])}</span><span class="pontilhado"></span><span class="dur">${escapeHtml(String(service[columns.duration]))} min</span><span class="valor">${escapeHtml(price)}</span></li>\n`;
}

function formatPrice(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
