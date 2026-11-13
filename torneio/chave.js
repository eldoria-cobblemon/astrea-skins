// Chave (mata-mata) do torneio: montar, marcar vencedor e desenhar.
// Formato: chave = { jogadores:[nick], rodadas:[[{a,b,v}]], terceiro:{a,b,v}|null, finalMd3, criadaEm }
// a/b = nick ou null (null na 1ª rodada = bye), v = quem venceu.
import { esc } from './comum.js';

function embaralhar(lista) {
  const l = [...lista];
  for (let i = l.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

// ordem clássica de chaveamento (1 x 8, 4 x 5, 2 x 7, 3 x 6...): os byes caem sempre contra alguém
function ordemSementes(p) {
  let o = [1];
  while (o.length < p) {
    const n = o.length * 2 + 1;
    o = o.flatMap((s) => [s, n - s]);
  }
  return o;
}

export function criarChave(nicks, { terceiro = true, finalMd3 = true } = {}) {
  const jog = embaralhar(nicks);
  let p = 2;
  while (p < jog.length) p *= 2;
  const ordem = ordemSementes(p).map((s) => jog[s - 1] ?? null);
  const primeira = [];
  for (let i = 0; i < p; i += 2) primeira.push({ a: ordem[i], b: ordem[i + 1], v: null });
  const rodadas = [primeira];
  for (let n = p / 4; n >= 1; n /= 2) rodadas.push(Array.from({ length: n }, () => ({ a: null, b: null, v: null })));
  const chave = { jogadores: jog, rodadas, terceiro: terceiro && rodadas.length >= 2 ? { a: null, b: null, v: null } : null, finalMd3, criadaEm: new Date().toISOString() };
  return recalcular(chave);
}

const bye = (m) => (m.a && !m.b) || (!m.a && m.b);

// refaz quem está em cada partida a partir dos vencedores anteriores; resultado que não vale mais some
export function recalcular(chave) {
  const R = chave.rodadas;
  for (const m of R[0]) {
    if (bye(m)) m.v = m.a || m.b;
    else if (m.v && m.v !== m.a && m.v !== m.b) m.v = null;
  }
  for (let r = 1; r < R.length; r++) {
    R[r].forEach((m, j) => {
      m.a = R[r - 1][2 * j].v || null;
      m.b = R[r - 1][2 * j + 1].v || null;
      if (m.v && m.v !== m.a && m.v !== m.b) m.v = null;
    });
  }
  if (chave.terceiro && R.length >= 2) {
    const semis = R[R.length - 2];
    const perdedor = (m) => (m.v && m.a && m.b ? (m.v === m.a ? m.b : m.a) : null);
    chave.terceiro.a = perdedor(semis[0]);
    chave.terceiro.b = perdedor(semis[1]);
    const t = chave.terceiro;
    if (t.v && t.v !== t.a && t.v !== t.b) t.v = null;
  }
  return chave;
}

// marca (ou desmarca, se clicar de novo) o vencedor de uma partida. r = índice da rodada ou 't' (3º lugar)
export function marcar(chave, r, i, nick) {
  const m = r === 't' ? chave.terceiro : chave.rodadas[r][i];
  if (!m || !nick || (nick !== m.a && nick !== m.b) || !m.a || !m.b) return null;
  const antes = m.v;
  m.v = m.v === nick ? null : nick;
  recalcular(chave);
  return { antes, depois: m.v, adversario: nick === m.a ? m.b : m.a };
}

export function nomeRodada(chave, r) {
  if (r === 't') return 'Disputa de 3º lugar';
  const faltam = chave.rodadas.length - r;
  return { 1: 'Final', 2: 'Semifinal', 3: 'Quartas de final', 4: 'Oitavas de final' }[faltam] || `${r + 1}ª rodada`;
}

export function podio(chave) {
  const fin = chave.rodadas[chave.rodadas.length - 1][0];
  const campeao = fin.v;
  return {
    campeao,
    vice: campeao ? (campeao === fin.a ? fin.b : fin.a) : null,
    terceiro: chave.terceiro?.v || null,
  };
}

export function teveResultado(chave) {
  return chave.rodadas.some((rod, r) => rod.some((m) => m.v && !(r === 0 && bye(m)))) || !!chave.terceiro?.v;
}

// HTML da chave. editavel = mostra que dá pra clicar.
export function desenharChave(chave, { editavel = false } = {}) {
  const linha = (m, r, i, lado) => {
    const nick = m[lado];
    const outro = m[lado === 'a' ? 'b' : 'a'];
    const ehBye = r === 0 && !nick && outro;
    const est = !nick ? 'vazio' : m.v === nick ? 'venceu' : m.v ? 'perdeu' : '';
    const clicavel = editavel && nick && outro;
    return `<div class="ch-jog ${est} ${clicavel ? 'clicavel' : ''}" ${nick ? `data-nick="${esc(nick)}"` : ''} data-r="${r}" data-i="${i}"
      ${clicavel ? `role="button" tabindex="0" title="Clique: ${esc(nick)} venceu"` : ''}>
      <span class="ch-nome">${nick ? esc(nick) : ehBye ? '<i>passa direto (bye)</i>' : '<i>a definir</i>'}</span>${m.v === nick && nick ? '<span class="ch-v">✓</span>' : ''}</div>`;
  };
  const partida = (m, r, i, extra = '') => `<div class="ch-partida ${m.v ? 'decidida' : ''} ${extra}">${linha(m, r, i, 'a')}${linha(m, r, i, 'b')}</div>`;
  const R = chave.rodadas;
  const colunas = R.map((rod, r) => {
    const final = r === R.length - 1;
    let corpo;
    if (final) corpo = `<div class="ch-par so">${partida(rod[0], r, 0, 'final')}</div>`;
    else {
      corpo = '';
      for (let j = 0; j < rod.length; j += 2) corpo += `<div class="ch-par">${partida(rod[j], r, j)}${partida(rod[j + 1], r, j + 1)}</div>`;
    }
    return `<div class="ch-col ${final ? 'ultima' : ''} ${r === 0 ? 'primeira' : ''}"><div class="ch-tit">${esc(nomeRodada(chave, r))}${final && chave.finalMd3 ? ' <small>melhor de 3</small>' : ''}</div><div class="ch-corpo">${corpo}</div></div>`;
  }).join('');
  const p = podio(chave);
  const pod = p.campeao ? `<div class="podio">
      <div class="lugar ouro"><span>Campeão</span><b>${esc(p.campeao)}</b></div>
      <div class="lugar prata"><span>2º lugar</span><b>${esc(p.vice)}</b></div>
      ${chave.terceiro ? `<div class="lugar bronze"><span>3º lugar</span><b>${p.terceiro ? esc(p.terceiro) : '<i>a definir</i>'}</b></div>` : ''}</div>` : '';
  const terc = chave.terceiro ? `<div class="ch-terceiro"><div class="ch-tit">Disputa de 3º lugar</div>${partida(chave.terceiro, 't', 0)}</div>` : '';
  return `${pod}<div class="ch-rolar"><div class="chave">${colunas}</div></div>${terc}`;
}
