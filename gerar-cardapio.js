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
  const columnsByCategory = new Map([
    ['Corte', ['Corte']],
    ['Barba', ['Barba', 'Estética']],
    ['Química', ['Química']]
  ]);
  const html = await fs.readFile(htmlPath, 'utf8');
  const start = html.indexOf('    <!-- CARDAPIO:inicio -->');
  const end = html.indexOf('    <!-- CARDAPIO:fim -->');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Marcadores CARDAPIO não encontrados em index.html.');
  }

  const generated = [...columnsByCategory].map(([title, categories]) => {
    const items = services.filter((service) => categories.includes(service[columns.category]));
    return `<div>\n        <h3>${escapeHtml(title)}</h3>\n        <ul>\n${items.map(renderItem).join('')}        </ul>\n      </div>`;
  }).join('\n\n      ');

  const replacement = `    <!-- CARDAPIO:inicio -->\n    <div class="cardapio" style="margin-top:2.5rem">\n      ${generated}\n    </div>\n`;
  await fs.writeFile(htmlPath, html.slice(0, start) + replacement + html.slice(end), 'utf8');
  console.log(`Cardápio atualizado com ${services.length} serviços.`);
}

function renderItem(service) {
  const id = slugify(service[columns.id] || service[columns.name]);
  const price = `${service[columns.fromPrice] ? 'a partir de ' : ''}${formatPrice(service[columns.price] / priceDivisor)}`;
  return `          <li data-servico="${escapeHtml(id)}"><span class="nome">${escapeHtml(service[columns.name])}</span><span class="pontilhado"></span><span class="dur">${service[columns.duration]} min</span><span class="valor">${price}</span></li>\n`;
}

function formatPrice(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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