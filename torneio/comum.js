// Pedaços usados pela ficha e pelo painel da staff.
import { preparar, motivoPokemon, motivoItem, motivoHabilidade, motivoGolpe, aprende } from './validar.js';

// Endereço do servidor de inscrições (meta "astrea-api" no HTML). Testando no PC, usa o wrangler dev local.
export const API = (location.hostname === 'localhost' ? 'http://localhost:8791' : document.querySelector('meta[name="astrea-api"]')?.content || '').replace(/\/$/, '');

export const TIPOS = {
  normal: ['Normal', '#9a9a78'], fire: ['Fogo', '#ee8130'], water: ['Água', '#6390f0'], electric: ['Elétrico', '#e8bf15'],
  grass: ['Planta', '#5fb53a'], ice: ['Gelo', '#5cc3c0'], fighting: ['Lutador', '#c22e28'], poison: ['Venenoso', '#a33ea1'],
  ground: ['Terrestre', '#d2a94a'], flying: ['Voador', '#8f78e8'], psychic: ['Psíquico', '#f95587'], bug: ['Inseto', '#93a817'],
  rock: ['Pedra', '#ad982f'], ghost: ['Fantasma', '#735797'], dragon: ['Dragão', '#6f35fc'], dark: ['Sombrio', '#6b5242'],
  steel: ['Aço', '#9a9ab8'], fairy: ['Fada', '#d685ad'],
};
export const tipoCor = (t) => (TIPOS[String(t || '').toLowerCase()] || [t, '#8d80aa'])[1];
export const tipoNome = (t) => (TIPOS[String(t || '').toLowerCase()] || [t])[0];
export const CATEGORIA = { Physical: 'Físico', Special: 'Especial', Status: 'Status' };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const negrito = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

// Sprites do Pokémon Showdown (arte de todas as gerações). Se não achar a forma, cai pra espécie.
const SPR = 'https://play.pokemonshowdown.com/sprites';
export function spriteHtml(o, classe = '') {
  if (!o) return `<svg class="vazio-pk" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#fff" stroke-width="3"/><path d="M2 16h28" stroke="#fff" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="#120d1f" stroke="#fff" stroke-width="3"/></svg>`;
  const alt = [`${SPR}/gen5/${o.spr}.png`, `${SPR}/gen5/${o.sp}.png`, `${SPR}/dex/${o.sp}.png`];
  return `<img class="${classe}" src="${SPR}/home-centered/${esc(o.spr)}.png" data-alt="${esc(alt.join('|'))}" alt="${esc(o.n)}" loading="lazy" onerror="window.__sprAlt(this)">`;
}
window.__sprAlt = (img) => {
  const resto = (img.dataset.alt || '').split('|').filter(Boolean);
  if (!resto.length) { img.onerror = null; img.style.visibility = 'hidden'; return; }
  img.dataset.alt = resto.slice(1).join('|');
  img.src = resto[0];
};

export async function carregar() {
  const pegar = (u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); });
  const [regras, dados] = await Promise.all([pegar('regras.json'), pegar('dados.json')]);
  const ctx = preparar(regras, dados);
  if (ctx.desconhecidos.length) console.warn('[torneio] nomes do regras.json que não existem no servidor:', ctx.desconhecidos);
  return ctx;
}

export function inscricoesAbertas(regras) {
  const I = regras.inscricoes || {};
  if (I.abertas === false) return false;
  if (I.fechaEm && Date.now() > new Date(I.fechaEm).getTime()) return false;
  return true;
}

// Time em cartões pequenos. problemas = {indice: {erros:[], avisos:[]}} (opcional)
export function miniTime(ctx, time, problemas = {}) {
  return `<div class="mini-time">${(time || []).map((s, i) => {
    const o = ctx.pk.get(s?.pk);
    if (!o) return '';
    const p = problemas[i] || { erros: [], avisos: [] };
    const it = ctx.item.get(s.item);
    const hab = ctx.hab.get(s.hab);
    const nat = ctx.nat.get(s.nat);
    const ruimItem = s.item && motivoItem(ctx, s.item);
    const ruimHab = s.hab && motivoHabilidade(ctx, s.hab);
    const ruimPk = motivoPokemon(ctx, o);
    const golpes = (s.golpes || []).filter(Boolean).map((g) => {
      const gg = ctx.golpe.get(g);
      const ruim = motivoGolpe(ctx, g);
      const fora = !ruim && !aprende(ctx, o, g);
      return `<li title="${esc(gg ? `${gg.n} · ${gg.pt}` : g)}${ruim ? ` · ${esc(ruim)}` : ''}${fora ? ' · fora da lista do Cobblemon' : ''}" style="--t:${tipoCor(gg?.t)}"><i></i><span class="${ruim ? 'x' : ''}">${esc(gg?.n || g)}${fora ? ' ⚠' : ''}</span></li>`;
    }).join('');
    const cls = p.erros.length || ruimItem || ruimHab || ruimPk ? 'ruim' : p.avisos.length ? 'atencao' : '';
    return `<div class="mini-pk ${cls}" style="--c:${tipoCor(o.tp[0])}">
      <div>${spriteHtml(o)}</div>
      <div style="min-width:0">
        <div class="nm ${ruimPk ? 'x' : ''}">${i + 1}. ${esc(o.n)}</div>
        <div class="det">${it ? `<span class="${ruimItem ? 'x' : ''}">@ <b>${esc(it.n)}</b></span><br>` : '<span>sem item</span><br>'}
          <span class="${ruimHab ? 'x' : ''}">${esc(hab?.n || '?')}</span> · ${esc(nat ? `${nat.n}` : '?')}</div>
        <ul>${golpes}</ul>
      </div></div>`;
  }).join('')}</div>`;
}

export function toast(txt, ms = 2400) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = txt;
  t.setAttribute('role', 'status');
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

export async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado!'); }
  catch { prompt('Copie:', txt); }
}
