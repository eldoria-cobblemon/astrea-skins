// Postador de Astrea — a página. Monta a mensagem em blocos, mostra igual ao Discord e manda pro Worker.
import { render as md, horario } from './md.js';

const API = new URLSearchParams(location.search).get('api') || (location.hostname === 'localhost' ? 'http://localhost:8793' : 'https://astrea-postador.yurebomfim.workers.dev');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const copia = (o) => JSON.parse(JSON.stringify(o));
const tamanho = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const CORES = [
  ['#cc7131', 'Laranja Astrea'], ['#e3b35b', 'Dourado'], ['#aa3b3b', 'Vermelho'], ['#ad1457', 'Rosa'], ['#8e5bd6', 'Roxo'],
  ['#457b9d', 'Azul'], ['#1abc9c', 'Turquesa'], ['#70a288', 'Verde'], ['#c0392b', 'Natal'], ['#ecf0f1', 'Branco'],
];
const UNICODE = [
  ['brilho', '✨'], ['fogo', '🔥'], ['festa', '🎉'], ['presente', '🎁'], ['coroa', '👑'], ['trofeu', '🏆'], ['medalha', '🏅'], ['espada', '⚔️'],
  ['escudo', '🛡️'], ['arco', '🏹'], ['gema', '💎'], ['moeda', '🪙'], ['dinheiro', '💰'], ['loja', '🛒'], ['sacola', '🛍️'], ['etiqueta', '🏷️'],
  ['megafone', '📢'], ['sino', '🔔'], ['alerta', '⚠️'], ['proibido', '⛔'], ['certo', '✅'], ['errado', '❌'], ['novo', '🆕'], ['seta', '➡️'],
  ['pin', '📌'], ['calendario', '📅'], ['relogio', '⏰'], ['ampulheta', '⏳'], ['mapa', '🗺️'], ['bussola', '🧭'], ['castelo', '🏰'], ['portal', '🌀'],
  ['lua', '🌙'], ['sol', '☀️'], ['estrela', '⭐'], ['cometa', '☄️'], ['raio', '⚡'], ['gelo', '❄️'], ['agua', '💧'], ['folha', '🌿'],
  ['flor', '🌸'], ['arvore', '🌳'], ['natal', '🎄'], ['papai', '🎅'], ['abobora', '🎃'], ['fantasma', '👻'], ['caveira', '💀'], ['dragao', '🐉'],
  ['coracao', '❤️'], ['roxo', '💜'], ['azul', '💙'], ['verde', '💚'], ['amarelo', '💛'], ['branco', '🤍'], ['olhos', '👀'], ['chorando', '🥹'],
  ['risada', '😂'], ['legal', '😎'], ['pensando', '🤔'], ['palmas', '👏'], ['joinha', '👍'], ['maos', '🙌'], ['musica', '🎵'], ['video', '🎬'],
  ['camera', '📸'], ['livro', '📖'], ['pergaminho', '📜'], ['chave', '🗝️'], ['bau', '🧰'], ['pocao', '🧪'], ['dado', '🎲'], ['controle', '🎮'],
  ['pesca', '🎣'], ['peixe', '🐟'], ['ovo', '🥚'], ['pata', '🐾'], ['alvo', '🎯'], ['foguete', '🚀'], ['ferramenta', '🛠️'], ['engrenagem', '⚙️'],
];

const PRONTOS = [
  {
    nome: 'Nova skin na loja', desc: 'Igual às da loja: nome, história curta, preços em Éter e o vídeo.', canalNome: 'cosméticos',
    estado: { blocos: [{ t: 'caixa', cor: '#cc7131', filhos: [
      { t: 'texto', texto: '**NOVA SKIN NA LOJA: NOME DO POKÉMON — NOME DA SKIN ✨**\n\nUma frase curta contando a história da skin.\n\n**Disponibilidades:**\n• **Normal** · {eter} **12.000 Éter**\n• **Shiny (nome)** · {eter} **13.000 Éter**\n• **Prismática** · {eter} **14.000 Éter**\n\n{cargo:Cosméticos}' },
      { t: 'midia', itens: [] },
    ] }] },
  },
  {
    nome: 'Atualização', desc: 'Notas da atualização com novidades e consertos.', canalNome: 'atualizações',
    estado: { blocos: [{ t: 'caixa', cor: '#e3b35b', filhos: [
      { t: 'texto', texto: '# Atualização de DD/MM\n-# o que mudou hoje em Astrea\n\n## Novidades\n- Primeira novidade\n- Segunda novidade\n\n## Consertos\n- O que foi consertado' },
      { t: 'separador', linha: true, grande: false },
      { t: 'texto', texto: '{cargo:Atualizações}' },
    ] }] },
  },
  {
    nome: 'Evento', desc: 'Nome, quando (no fuso de cada um), onde, prêmios e imagem.', canalNome: 'eventos',
    estado: { blocos: [{ t: 'caixa', cor: '#8e5bd6', filhos: [
      { t: 'midia', itens: [] },
      { t: 'texto', texto: '# NOME DO EVENTO\nConte em duas linhas o que vai acontecer.\n\n**Quando:** use o botão 🕒 pra pôr o horário\n**Onde:** /warp …\n**Prêmios:** …' },
    ] }] },
  },
  {
    nome: 'Vídeo novo', desc: 'Vídeo com chamada curta e o cargo de vídeos.', canalNome: 'vídeos',
    estado: { blocos: [{ t: 'caixa', cor: '#aa3b3b', filhos: [
      { t: 'texto', texto: '## 🎬 TÍTULO DO VÍDEO\nUma linha sobre o que aparece.' },
      { t: 'midia', itens: [] },
      { t: 'texto', texto: '{cargo:videos}' },
    ] }] },
  },
  {
    nome: 'Sorteio', desc: 'Prêmio, como participar e até quando.', canalNome: 'sorteios',
    estado: { blocos: [{ t: 'caixa', cor: '#ad1457', filhos: [
      { t: 'secao', texto: '# 🎁 SORTEIO\n**Prêmio:** …\n**Como participar:** reaja com 🎉\n**Resultado:** use o botão 🕒', mini: null },
    ] }] },
  },
  {
    nome: 'Aviso rápido', desc: 'Só texto, sem caixa. Pra recados curtos.', canalNome: 'anuncios',
    estado: { blocos: [{ t: 'texto', texto: '📢 **Aviso:** escreva aqui.' }] },
  },
];

// ---------- estado ----------
const S = {
  senha: localStorage.getItem('postador.senha') || sessionStorage.getItem('postador.senha') || '',
  quem: '',
  meta: null,
  modelos: [],
  arquivos: new Map(), // id -> {blob, nome, tipo, tamanho, url}
  ultimoTexto: null,
};
let E = novoEstado();
const historico = { pilha: [], pos: -1, travado: false };

function novoEstado() {
  return { v: 1, canal: localStorage.getItem('postador.canal') || '', nome: '', avatar: '', anunciar: true, titulo: '', tags: [], editar: null, editarRotulo: '', deEnviado: null, blocos: [{ id: uid(), t: 'caixa', cor: '#cc7131', filhos: [{ id: uid(), t: 'texto', texto: '' }, { id: uid(), t: 'midia', itens: [] }] }] };
}
function comIds(lista) {
  return (lista || []).map((b) => {
    const n = { ...copia(b), id: uid() };
    if (n.filhos) n.filhos = comIds(n.filhos);
    if (n.itens) n.itens = n.itens.map((i) => ({ ...i, id: i.id || uid() }));
    return n;
  });
}

// ---------- arquivos guardados no navegador (o rascunho não perde o vídeo) ----------
const IDB = {
  db: null,
  abrir() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((ok, erro) => {
      const r = indexedDB.open('postador-astrea', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('arquivos');
      r.onsuccess = () => ok((this.db = r.result));
      r.onerror = () => erro(r.error);
    });
  },
  async por(id, v) {
    const db = await this.abrir();
    return new Promise((ok) => { const t = db.transaction('arquivos', 'readwrite'); t.objectStore('arquivos').put(v, id); t.oncomplete = ok; t.onerror = ok; });
  },
  async pegar(id) {
    const db = await this.abrir();
    return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').get(id); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); });
  },
  async chaves() {
    const db = await this.abrir();
    return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAllKeys(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); });
  },
  async tirar(id) {
    const db = await this.abrir();
    return new Promise((ok) => { const t = db.transaction('arquivos', 'readwrite'); t.objectStore('arquivos').delete(id); t.oncomplete = ok; t.onerror = ok; });
  },
};
async function guardaArquivo(file) {
  const id = uid();
  const a = { blob: file, nome: file.name || 'imagem.png', tipo: file.type || '', tamanho: file.size, url: URL.createObjectURL(file) };
  S.arquivos.set(id, a);
  IDB.por(id, { blob: file, nome: a.nome, tipo: a.tipo }).catch(() => {});
  return id;
}
async function carregaArquivos() {
  for (const id of idsUsados()) {
    if (S.arquivos.has(id)) continue;
    const r = await IDB.pegar(id).catch(() => null);
    if (r?.blob) S.arquivos.set(id, { blob: r.blob, nome: r.nome, tipo: r.tipo, tamanho: r.blob.size, url: URL.createObjectURL(r.blob) });
  }
}
function idsUsados(estado = E) {
  const ids = new Set();
  const anda = (lista) => {
    for (const b of lista) {
      if (b.filhos) anda(b.filhos);
      for (const i of b.itens || []) if (i.fonte === 'arquivo') ids.add(i.arquivo);
      if (b.mini?.fonte === 'arquivo') ids.add(b.mini.arquivo);
      if (b.t === 'arquivo' && b.arq?.fonte === 'arquivo') ids.add(b.arq.arquivo);
    }
  };
  anda(estado.blocos);
  return ids;
}
async function limpaArquivosOrfaos() {
  const usados = idsUsados();
  for (const k of await IDB.chaves().catch(() => [])) if (!usados.has(k)) IDB.tirar(k);
}

// ---------- API ----------
async function api(caminho, opcoes = {}) {
  const r = await fetch(API + caminho, {
    ...opcoes,
    headers: { ...(opcoes.corpo ? { 'content-type': 'application/json' } : {}), authorization: `Bearer ${S.senha}`, ...(opcoes.headers || {}) },
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : opcoes.body,
  });
  const c = await r.json().catch(() => ({}));
  if (r.status === 401 && caminho !== '/api/entrar') { sair(); throw new Error('Sua sessão acabou, entre de novo.'); }
  if (!r.ok) throw new Error(c.erro || `Erro ${r.status}`);
  return c;
}
function enviarComProgresso(form, aoProgresso) {
  return new Promise((ok, erro) => {
    const x = new XMLHttpRequest();
    x.open('POST', `${API}/api/enviar`);
    x.setRequestHeader('authorization', `Bearer ${S.senha}`);
    x.upload.onprogress = (e) => e.lengthComputable && aoProgresso(e.loaded / e.total);
    x.onload = () => {
      let c = {};
      try { c = JSON.parse(x.responseText); } catch {}
      if (x.status === 401) { sair(); return erro(new Error('Sua sessão acabou, entre de novo.')); }
      x.status >= 200 && x.status < 300 ? ok(c) : erro(new Error(c.erro || `Erro ${x.status}`));
    };
    x.onerror = () => erro(new Error('Não consegui falar com o Postador. A internet caiu ou a rede bloqueou o endereço.'));
    x.send(form);
  });
}
const px = (u) => (u && /^https:\/\/(cdn\.discordapp\.com|media\.discordapp\.net)\//.test(u) ? `${API}/api/img?u=${encodeURIComponent(u)}` : u);
const urlEmoji = (id, animado) => px(`https://cdn.discordapp.com/emojis/${id}.${animado ? 'gif' : 'webp'}?size=48&quality=lossless`);

// ---------- entrar / sair ----------
async function entrar(senha, lembrar) {
  S.senha = senha;
  const r = await api('/api/entrar', { method: 'POST' });
  S.quem = r.nome;
  (lembrar ? localStorage : sessionStorage).setItem('postador.senha', senha);
}
function sair() {
  localStorage.removeItem('postador.senha');
  sessionStorage.removeItem('postador.senha');
  S.senha = '';
  $('#app').hidden = true;
  $('#entrar').hidden = false;
  $('#senha').value = '';
  setTimeout(() => $('#senha').focus(), 50);
}
async function iniciar() {
  fetch(`${API}/api/publico`).then((r) => r.json()).then((p) => {
    if (p.icone) { const i = $('#entrar-icone'); i.src = px(p.icone); i.hidden = false; }
  }).catch(() => {});
  if (!S.senha) return sair();
  try {
    const r = await api('/api/entrar', { method: 'POST' });
    S.quem = r.nome;
    await abrirApp();
  } catch {
    sair();
  }
}
$('#form-entrar').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const b = $('#btn-entrar');
  b.disabled = true;
  b.textContent = 'Entrando…';
  $('#erro-entrar').textContent = '';
  try {
    await entrar($('#senha').value, $('#lembrar').checked);
    await abrirApp();
  } catch (e) {
    $('#erro-entrar').textContent = e.message;
    S.senha = '';
  } finally {
    b.disabled = false;
    b.textContent = 'Entrar';
  }
});
$('#btn-sair').addEventListener('click', sair);

async function abrirApp() {
  $('#entrar').hidden = true;
  $('#app').hidden = false;
  $('#quem-nome').textContent = S.quem;
  S.meta = await api('/api/meta');
  $('#topo-icone').src = px(S.meta.servidor.icone) || '';
  $('#topo-servidor').textContent = S.meta.servidor.nome;
  const rasc = localStorage.getItem('postador.rascunho');
  if (rasc) {
    try { E = { ...novoEstado(), ...JSON.parse(rasc) }; } catch {}
  }
  await carregaArquivos();
  desenharTudo();
  marcarHistorico(true);
  carregarModelos();
}

// ---------- utilidades de estado ----------
function acharBloco(id, lista = E.blocos, pai = null) {
  for (let i = 0; i < lista.length; i++) {
    if (lista[i].id === id) return { bloco: lista[i], lista, i, pai };
    if (lista[i].filhos) {
      const r = acharBloco(id, lista[i].filhos, lista[i]);
      if (r) return r;
    }
  }
  return null;
}
let tSalvar;
function mudou({ estrutura = false } = {}) {
  if (estrutura) desenharBlocos();
  desenharPrevia();
  clearTimeout(tSalvar);
  tSalvar = setTimeout(() => {
    localStorage.setItem('postador.rascunho', JSON.stringify(E));
    const s = $('#salvo');
    s.classList.add('vis');
    setTimeout(() => s.classList.remove('vis'), 1200);
    marcarHistorico();
    limpaArquivosOrfaos();
  }, 450);
}
function marcarHistorico(zerar = false) {
  if (historico.travado) return;
  const foto = JSON.stringify(E);
  if (zerar) { historico.pilha = [foto]; historico.pos = 0; }
  else if (historico.pilha[historico.pos] !== foto) {
    historico.pilha = historico.pilha.slice(0, historico.pos + 1);
    historico.pilha.push(foto);
    if (historico.pilha.length > 80) historico.pilha.shift();
    historico.pos = historico.pilha.length - 1;
  }
  $('#btn-desfazer').disabled = historico.pos <= 0;
  $('#btn-refazer').disabled = historico.pos >= historico.pilha.length - 1;
}
function irHistorico(d) {
  const p = historico.pos + d;
  if (p < 0 || p >= historico.pilha.length) return;
  historico.pos = p;
  historico.travado = true;
  E = JSON.parse(historico.pilha[p]);
  desenharTudo();
  localStorage.setItem('postador.rascunho', JSON.stringify(E));
  historico.travado = false;
  $('#btn-desfazer').disabled = historico.pos <= 0;
  $('#btn-refazer').disabled = historico.pos >= historico.pilha.length - 1;
}
$('#btn-desfazer').addEventListener('click', () => irHistorico(-1));
$('#btn-refazer').addEventListener('click', () => irHistorico(1));

// ---------- desenhar ----------
function desenharTudo() {
  desenharCanal();
  desenharPersona();
  desenharBlocos();
  desenharPrevia();
  desenharEdicao();
}
function canalAtual() {
  return S.meta?.canais.find((c) => c.id === E.canal) || null;
}
const ehStaff = (c) => /staff|moderator|logs|ticket/i.test(`${c.categoria} ${c.nome}`);
function desenharCanal() {
  const c = canalAtual();
  const b = $('#btn-canal');
  b.classList.toggle('vazio', !c);
  b.disabled = !!E.editar;
  $('#canal-nome').textContent = c ? c.nome : 'Escolha o canal';
  $('#canal-cat').textContent = c ? `em ${c.categoria || 'sem categoria'}${c.tipo === 'forum' ? ' · fórum' : c.tipo === 'anuncios' ? ' · anúncios' : ''}` : '';
  $('.sc-hash').textContent = c?.tipo === 'forum' ? '💬' : c?.tipo === 'anuncios' ? '📣' : '#';
  const forum = c?.tipo === 'forum' && !E.editar;
  $('#opcoes-forum').hidden = !forum;
  if (forum) {
    $('#titulo-forum').value = E.titulo || '';
    $('#cont-titulo').textContent = `${(E.titulo || '').length}/100`;
    $('#tag-aviso').textContent = c.exigeTag ? 'escolha pelo menos uma' : c.tags.length ? 'opcional' : 'esse fórum não tem etiquetas';
    $('#tags-forum').innerHTML = c.tags.map((t) => `<button type="button" class="chip ${E.tags.includes(t.id) ? 'on' : ''}" data-tag="${t.id}">${esc((t.emoji ? `${t.emoji} ` : '') + t.nome)}</button>`).join('');
  }
  $('#opcao-anunciar').hidden = !(c?.tipo === 'anuncios') || !!E.editar;
  $('#anunciar').checked = E.anunciar !== false;
}
$('#titulo-forum').addEventListener('input', (e) => { E.titulo = e.target.value; $('#cont-titulo').textContent = `${E.titulo.length}/100`; mudou(); });
$('#tags-forum').addEventListener('click', (e) => {
  const t = e.target.closest('[data-tag]');
  if (!t) return;
  const id = t.dataset.tag;
  E.tags = E.tags.includes(id) ? E.tags.filter((x) => x !== id) : [...E.tags, id].slice(0, 5);
  desenharCanal();
  mudou();
});
$('#anunciar').addEventListener('change', (e) => { E.anunciar = e.target.checked; mudou(); });

// escolher canal
let focoCanal = 0;
function abrirCanais() {
  if (E.editar) return;
  $('#modal-canal').hidden = false;
  $('#busca-canal').value = '';
  listarCanais('');
  setTimeout(() => $('#busca-canal').focus(), 30);
}
function listarCanais(q) {
  const n = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const lista = S.meta.canais.filter((c) => !/^ticket-/.test(c.nome) && (!n || norm(`${c.nome} ${c.categoria}`).includes(n)));
  let html = '';
  let cat = null;
  lista.forEach((c, i) => {
    if (c.categoria !== cat) { cat = c.categoria; html += `<div class="lc-cat">${esc(cat || 'Sem categoria')}</div>`; }
    const tp = c.tipo === 'forum' ? 'fórum' : c.tipo === 'anuncios' ? 'anúncios' : ehStaff(c) ? 'staff' : '';
    html += `<button class="lc-canal ${c.id === E.canal ? 'on' : ''} ${i === focoCanal ? 'foco' : ''} ${ehStaff(c) ? 'staff' : ''}" data-canal="${c.id}"><span class="h">${c.tipo === 'forum' ? '💬' : c.tipo === 'anuncios' ? '📣' : '#'}</span>${esc(c.nome)}${tp ? `<span class="tp">${tp}</span>` : ''}</button>`;
  });
  $('#lista-canais').innerHTML = html || '<div class="nada">Nenhum canal com esse nome.</div>';
}
$('#btn-canal').addEventListener('click', abrirCanais);
$('#busca-canal').addEventListener('input', (e) => { focoCanal = 0; listarCanais(e.target.value); });
$('#busca-canal').addEventListener('keydown', (e) => {
  const itens = $$('.lc-canal');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    focoCanal = (focoCanal + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length;
    itens.forEach((x, i) => x.classList.toggle('foco', i === focoCanal));
    itens[focoCanal]?.scrollIntoView({ block: 'nearest' });
  }
  if (e.key === 'Enter') { e.preventDefault(); itens[focoCanal]?.click(); }
});
$('#lista-canais').addEventListener('click', (e) => {
  const b = e.target.closest('[data-canal]');
  if (!b) return;
  if (E.canal !== b.dataset.canal) E.tags = [];
  E.canal = b.dataset.canal;
  localStorage.setItem('postador.canal', E.canal);
  $('#modal-canal').hidden = true;
  desenharCanal();
  mudou();
});

// persona
function desenharPersona() {
  const m = S.meta;
  const nome = E.nome?.trim() || m.bot.nome;
  const foto = E.avatar?.trim() || m.bot.avatar;
  $('#persona-nome').textContent = nome;
  $('#persona-foto').src = px(foto) || '';
  $('#nome').value = E.nome || '';
  $('#nome').placeholder = m.bot.nome;
  $('#avatar').value = E.avatar && ![m.bot.avatar, m.servidor.icone].includes(E.avatar) ? E.avatar : '';
  const fotos = [[m.bot.avatar, 'Foto do bot'], [m.servidor.icone, 'Ícone do servidor']].filter((f) => f[0]);
  $('#fotos').innerHTML = fotos.map(([u, t]) => `<button type="button" title="${t}" data-foto="${esc(u)}" class="${(E.avatar || m.bot.avatar) === u ? 'on' : ''}"><img src="${esc(px(u))}" alt=""></button>`).join('');
  $('#persona').classList.toggle('travado', !!E.editar);
  $('#persona').style.display = E.editar ? 'none' : '';
}
$('#nome').addEventListener('input', (e) => { E.nome = e.target.value; $('#persona-nome').textContent = E.nome.trim() || S.meta.bot.nome; mudou(); });
$('#avatar').addEventListener('input', (e) => { E.avatar = e.target.value.trim(); desenharPersona(); mudou(); });
$('#fotos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-foto]');
  if (!b) return;
  E.avatar = b.dataset.foto === S.meta.bot.avatar ? '' : b.dataset.foto;
  desenharPersona();
  mudou();
});

// ---------- editor de blocos ----------
const TIPOS = {
  caixa: { ic: '▣', nome: 'Caixa colorida', dica: 'A caixa com a barrinha de cor' },
  texto: { ic: '¶', nome: 'Texto', dica: 'Texto com negrito, títulos, emojis…' },
  midia: { ic: '🖼', nome: 'Imagens e vídeos', dica: 'Até 10, em galeria' },
  secao: { ic: '◧', nome: 'Texto com miniatura', dica: 'Texto com uma imagem pequena do lado' },
  separador: { ic: '―', nome: 'Separador', dica: 'Uma linha ou um espaço' },
  botoes: { ic: '🔗', nome: 'Botões de link', dica: 'Até 5 botões que abrem um site' },
  arquivo: { ic: '📎', nome: 'Arquivo', dica: 'Qualquer arquivo pra baixar' },
};
function novoBloco(t) {
  const b = { id: uid(), t };
  if (t === 'caixa') { b.cor = '#cc7131'; b.filhos = [{ id: uid(), t: 'texto', texto: '' }]; }
  if (t === 'texto') b.texto = '';
  if (t === 'midia') b.itens = [];
  if (t === 'secao') { b.texto = ''; b.mini = null; }
  if (t === 'separador') { b.linha = true; b.grande = false; }
  if (t === 'botoes') b.botoes = [{ rotulo: '', url: '' }];
  if (t === 'arquivo') b.arq = null;
  return b;
}
function botoesAdicionar(dentro) {
  return Object.entries(TIPOS)
    .filter(([t]) => !(dentro && t === 'caixa'))
    .map(([t, v]) => `<button type="button" class="add" data-add="${t}" title="${v.dica}"><span class="ic">${v.ic}</span>${v.nome}</button>`)
    .join('');
}
function desenharBlocos() {
  const raiz = $('#blocos');
  raiz.innerHTML = E.blocos.length ? E.blocos.map((b) => htmlBloco(b, false)).join('') : '<div class="vazio-msg">Mensagem vazia. Comece adicionando uma caixa ou um texto aqui embaixo.</div>';
  $('#adicionar-raiz').innerHTML = botoesAdicionar(false);
  $$('textarea.texto-area').forEach(autoAltura);
}
function htmlBloco(b, dentro) {
  const T = TIPOS[b.t];
  const acoes = `<div class="acoes">
    <button class="btn-icone" data-acao="subir" title="Subir">↑</button>
    <button class="btn-icone" data-acao="descer" title="Descer">↓</button>
    <button class="btn-icone" data-acao="duplicar" title="Duplicar">⧉</button>
    <button class="btn-icone" data-acao="tirar" title="Tirar">✕</button></div>`;
  let corpo = '';
  if (b.t === 'caixa') {
    const sem = !b.cor;
    corpo = `<div class="cores">${CORES.map(([c, n]) => `<button type="button" class="cor ${b.cor === c ? 'on' : ''}" style="background:${c}" title="${n}" data-cor="${c}"></button>`).join('')}
      <button type="button" class="cor sem ${sem ? 'on' : ''}" title="Sem cor" data-cor=""></button>
      <label class="cor-livre" title="Outra cor"><input type="color" data-cor-livre value="${b.cor || '#cc7131'}"></label>
      <input class="cor-hex" data-cor-hex value="${esc(b.cor || '')}" placeholder="#cc7131" maxlength="7">
      <label class="check" style="margin:0 0 0 auto"><input type="checkbox" data-campo="spoiler" ${b.spoiler ? 'checked' : ''}><span>Spoiler</span></label></div>
      <div class="blocos">${b.filhos.length ? b.filhos.map((f) => htmlBloco(f, true)).join('') : '<div class="vazio-msg">Caixa vazia.</div>'}</div>
      <div class="adicionar">${botoesAdicionar(true)}</div>`;
  }
  if (b.t === 'texto') corpo = htmlTexto(b.texto, 'Escreva aqui… (dica: digite : pra emoji, @ pra cargo, # pra canal)');
  if (b.t === 'midia') corpo = htmlMidias(b);
  if (b.t === 'secao') {
    corpo = `<div class="secao-grade"><div>${htmlTexto(b.texto, 'Texto ao lado da miniatura (até 3 parágrafos)')}</div>
      ${b.mini ? htmlUmaMidia(b.mini, 'mini') : `<div class="soltar" data-soltar="mini"><b>+</b>Miniatura<span class="link" data-url="mini">ou link</span></div>`}</div>`;
  }
  if (b.t === 'separador') {
    corpo = `<div class="sep-op"><label class="check"><input type="checkbox" data-campo="linha" ${b.linha ? 'checked' : ''}><span>Mostrar a linha</span></label>
      <label class="check"><input type="checkbox" data-campo="grande" ${b.grande ? 'checked' : ''}><span>Espaço grande</span></label></div>`;
  }
  if (b.t === 'botoes') {
    corpo = `<div class="botoes-edit">${b.botoes.map((x, i) => `<div class="botao-linha"><input data-botao="${i}" data-k="rotulo" maxlength="80" placeholder="Texto do botão" value="${esc(x.rotulo)}"><input data-botao="${i}" data-k="url" placeholder="https://…" value="${esc(x.url)}"><button class="btn-icone" data-tira-botao="${i}" title="Tirar">✕</button></div>`).join('')}</div>
      ${b.botoes.length < 5 ? '<button type="button" class="add" data-mais-botao style="margin-top:8px">+ botão</button>' : ''}`;
  }
  if (b.t === 'arquivo') corpo = b.arq ? `<div class="arquivo-linha"><span class="ic">📎</span><div><div>${esc(nomeMidia(b.arq))}</div><small class="dica">${esc(tamanhoMidia(b.arq))}</small></div><button class="btn-icone" data-tira-arq style="margin-left:auto">✕</button></div>` : `<div class="soltar" data-soltar="arq" style="aspect-ratio:auto;padding:18px"><b>+</b>Escolher arquivo</div>`;
  return `<div class="bloco ${b.t}" data-bloco="${b.id}" ${b.t === 'caixa' ? `style="--cor-caixa:${b.cor || '#555'}"` : ''}>
    <div class="bloco-cabeca"><span class="alca" draggable="true" title="Arrastar">⋮⋮</span><span class="ico">${T.ic}</span>${T.nome}${acoes}</div>
    <div class="bloco-corpo">${corpo}</div></div>`;
}
function htmlTexto(valor, ph) {
  return `<div class="ferramentas">
    <button type="button" data-fmt="b" title="Negrito (Ctrl+B)"><b>N</b></button>
    <button type="button" data-fmt="i" title="Itálico (Ctrl+I)"><i>I</i></button>
    <button type="button" data-fmt="u" title="Sublinhado (Ctrl+U)"><u>S</u></button>
    <button type="button" data-fmt="s" title="Riscado"><s>R</s></button>
    <span class="sep"></span>
    <button type="button" data-fmt="h1" title="Título grande">H1</button>
    <button type="button" data-fmt="h2" title="Título médio">H2</button>
    <button type="button" data-fmt="h3" title="Título pequeno">H3</button>
    <button type="button" data-fmt="sub" title="Letra pequena e clarinha">-#</button>
    <span class="sep"></span>
    <button type="button" data-fmt="lista" title="Lista">•</button>
    <button type="button" data-fmt="quote" title="Citação">❝</button>
    <button type="button" data-fmt="spoiler" title="Spoiler (esconde até clicar)">▒</button>
    <button type="button" data-fmt="code" title="Código">&lt;/&gt;</button>
    <button type="button" data-fmt="link" title="Link com texto">🔗</button>
    <span class="sep"></span>
    <button type="button" data-fmt="emoji" title="Emoji">😀</button>
    <button type="button" data-fmt="cargo" title="Marcar cargo">@</button>
    <button type="button" data-fmt="canal" title="Citar canal">#</button>
    <button type="button" data-fmt="hora" title="Horário que se ajusta ao fuso de cada um">🕒</button>
  </div><textarea class="texto-area" data-campo="texto" placeholder="${esc(ph)}" spellcheck="true">${esc(valor || '')}</textarea>`;
}
function nomeMidia(m) {
  if (m.fonte === 'arquivo') return S.arquivos.get(m.arquivo)?.nome || '(arquivo perdido)';
  if (m.fonte === 'existente') return m.nome;
  return m.url.split('/').pop().split('?')[0] || m.url;
}
function tamanhoMidia(m) {
  if (m.fonte === 'arquivo') { const a = S.arquivos.get(m.arquivo); return a ? tamanho(a.tamanho) : 'escolha de novo'; }
  if (m.fonte === 'existente') return 'já está no Discord';
  return 'link';
}
function urlMidia(m) {
  if (m.fonte === 'arquivo') return S.arquivos.get(m.arquivo)?.url || '';
  if (m.fonte === 'existente') return px(m.url);
  return m.url;
}
function ehVideo(m) {
  const tipo = m.fonte === 'arquivo' ? S.arquivos.get(m.arquivo)?.tipo : m.tipo;
  return /^video\//.test(tipo || '') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(m.url || m.nome || nomeMidia(m));
}
function htmlUmaMidia(m, onde, i = 0) {
  const u = urlMidia(m);
  const perdido = m.fonte === 'arquivo' && !S.arquivos.has(m.arquivo);
  const vis = perdido ? '<div style="display:grid;place-items:center;height:100%;color:#f1a5a5;font-size:12px;padding:8px;text-align:center">arquivo não está mais aqui, escolha de novo</div>'
    : ehVideo(m) ? `<video src="${esc(u)}" muted loop playsinline autoplay></video>` : `<img src="${esc(u)}" alt="" loading="lazy">`;
  return `<div class="midia" data-midia="${onde}" data-i="${i}">${vis}
    <span class="tipo">${ehVideo(m) ? 'vídeo' : m.fonte === 'url' ? 'link' : 'imagem'}</span>
    ${onde === 'galeria' ? `<span class="tam">${esc(tamanhoMidia(m))}</span>` : ''}
    <button class="tira" data-tira-midia="${onde}" data-i="${i}" title="Tirar">✕</button>
    ${onde === 'galeria' ? `<button class="desc ${m.desc ? 'tem' : ''}" data-desc="${i}" title="${m.desc ? esc(`Descrição: ${m.desc}`) : 'Descrição (texto alternativo)'}">Aa</button>
      <button class="mover esq" data-mover="${i}" data-d="-1" title="Pra esquerda">‹</button><button class="mover dir" data-mover="${i}" data-d="1" title="Pra direita">›</button>` : ''}
  </div>`;
}
function htmlMidias(b) {
  const itens = b.itens.map((m, i) => htmlUmaMidia(m, 'galeria', i)).join('');
  const mais = b.itens.length < 10 ? `<div class="soltar" data-soltar="galeria"><b>+</b>Arraste ou clique<br><small>imagem, gif ou vídeo</small><span class="link" data-url="galeria">ou cole um link</span></div>` : '';
  return `<div class="midias">${itens}${mais}</div>${b.itens.length ? `<label class="check" style="margin:10px 0 0"><input type="checkbox" data-spoiler-galeria ${b.itens.every((m) => m.spoiler) ? 'checked' : ''}><span>Esconder como spoiler</span></label>` : ''}`;
}
function autoAltura(t) {
  t.style.height = 'auto';
  t.style.height = `${Math.max(92, t.scrollHeight + 2)}px`;
}

// eventos do editor (delegados)
const raizBlocos = $('#tela-escrever .editor');
function blocoDe(el) {
  const b = el.closest('[data-bloco]');
  return b ? acharBloco(b.dataset.bloco) : null;
}
raizBlocos.addEventListener('input', (e) => {
  const t = e.target;
  const ref = blocoDe(t);
  if (!ref) return;
  const b = ref.bloco;
  if (t.dataset.campo === 'texto') { b.texto = t.value; autoAltura(t); sugerir(t); }
  else if (t.dataset.botao !== undefined) b.botoes[+t.dataset.botao][t.dataset.k] = t.value;
  else if (t.dataset.corLivre !== undefined) { b.cor = t.value; return atualizaCor(t, b); }
  else if (t.dataset.corHex !== undefined) {
    const v = t.value.trim().replace(/^#?/, '#');
    if (/^#[0-9a-f]{6}$/i.test(v)) { b.cor = v.toLowerCase(); return atualizaCor(t, b, true); }
    return;
  } else return;
  mudou();
});
function atualizaCor(el, b, doHex) {
  const caixa = el.closest('.bloco.caixa');
  caixa.style.setProperty('--cor-caixa', b.cor || '#555');
  $$('.cores .cor', caixa).forEach((c) => c.classList.toggle('on', c.dataset.cor === b.cor));
  if (!doHex) $('[data-cor-hex]', caixa).value = b.cor;
  mudou();
}
raizBlocos.addEventListener('change', (e) => {
  const t = e.target;
  const ref = blocoDe(t);
  if (!ref) return;
  const b = ref.bloco;
  if (t.dataset.campo && t.type === 'checkbox') { b[t.dataset.campo] = t.checked; mudou(); }
  if (t.dataset.spoilerGaleria !== undefined) { b.itens.forEach((m) => (m.spoiler = t.checked)); mudou(); }
  if (t.dataset.corLivre !== undefined) mudou({ estrutura: true });
});
raizBlocos.addEventListener('focusin', (e) => {
  if (e.target.matches('textarea.texto-area')) S.ultimoTexto = { el: e.target, id: blocoDe(e.target)?.bloco.id };
});
raizBlocos.addEventListener('keydown', (e) => {
  const t = e.target;
  if (!t.matches('textarea.texto-area')) return;
  if (sugestoesAbertas() && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) return navegaSugestao(e);
  if (e.ctrlKey && !e.shiftKey && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 'b' || k === 'i' || k === 'u') { e.preventDefault(); formatar(t, k); }
  }
});
raizBlocos.addEventListener('click', async (e) => {
  const el = e.target;
  // adicionar
  const add = el.closest('[data-add]');
  if (add) {
    const dentroDe = add.closest('.bloco.caixa');
    const nb = novoBloco(add.dataset.add);
    if (dentroDe) acharBloco(dentroDe.dataset.bloco).bloco.filhos.push(nb);
    else E.blocos.push(nb);
    mudou({ estrutura: true });
    const novo = $(`[data-bloco="${nb.id}"]`);
    novo?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('textarea', novo)?.focus();
    if (nb.t === 'midia' || nb.t === 'arquivo') escolherArquivos(nb.id, nb.t === 'arquivo' ? 'arq' : 'galeria');
    return;
  }
  const ref = blocoDe(el);
  if (!ref) return;
  const b = ref.bloco;
  const acao = el.closest('[data-acao]')?.dataset.acao;
  if (acao) {
    const { lista, i } = ref;
    if (acao === 'subir' && i > 0) [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]];
    else if (acao === 'descer' && i < lista.length - 1) [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]];
    else if (acao === 'duplicar') lista.splice(i + 1, 0, comIds([b])[0]);
    else if (acao === 'tirar') {
      const temCoisa = (b.texto || '').trim() || b.itens?.length || b.filhos?.some((f) => (f.texto || '').trim() || f.itens?.length);
      if (temCoisa && !(await perguntar('Tirar este bloco?', 'Dá pra desfazer depois com ↶.'))) return;
      lista.splice(i, 1);
    } else if (acao === 'subir' && ref.pai) {
      // primeiro da caixa sobe: sai da caixa
      const pai = acharBloco(ref.pai.id);
      lista.splice(i, 1);
      pai.lista.splice(pai.i, 0, b);
    } else if (acao === 'descer' && ref.pai) {
      const pai = acharBloco(ref.pai.id);
      lista.splice(i, 1);
      pai.lista.splice(pai.i + 1, 0, b);
    }
    return mudou({ estrutura: true });
  }
  const cor = el.closest('[data-cor]');
  if (cor) { b.cor = cor.dataset.cor; return mudou({ estrutura: true }); }
  const fmt = el.closest('[data-fmt]');
  if (fmt) {
    const ta = $('textarea', fmt.closest('.bloco-corpo'));
    return formatar(ta, fmt.dataset.fmt, fmt);
  }
  const linkUrl = el.closest('[data-url]');
  if (linkUrl) {
    e.stopPropagation();
    const u = await perguntar('Link da imagem ou vídeo', 'Cole um endereço que comece com https://', { campo: 'https://' });
    if (!u || !/^https:\/\/\S+$/i.test(u.trim())) { if (u) toast('Esse link não parece válido.', true); return; }
    const m = { id: uid(), fonte: 'url', url: u.trim(), spoiler: false };
    if (linkUrl.dataset.url === 'mini') b.mini = m;
    else b.itens.push(m);
    return mudou({ estrutura: true });
  }
  const soltar = el.closest('[data-soltar]');
  if (soltar) return escolherArquivos(b.id, soltar.dataset.soltar);
  const tira = el.closest('[data-tira-midia]');
  if (tira) {
    if (tira.dataset.tiraMidia === 'mini') b.mini = null;
    else b.itens.splice(+tira.dataset.i, 1);
    return mudou({ estrutura: true });
  }
  const mover = el.closest('[data-mover]');
  if (mover) {
    const i = +mover.dataset.mover;
    const j = i + +mover.dataset.d;
    if (j >= 0 && j < b.itens.length) [b.itens[i], b.itens[j]] = [b.itens[j], b.itens[i]];
    return mudou({ estrutura: true });
  }
  const desc = el.closest('[data-desc]');
  if (desc) {
    const m = b.itens[+desc.dataset.desc];
    const d = await perguntar('Descrição da imagem', 'Texto que aparece pra quem não enxerga a imagem (opcional).', { campo: m.desc || '', vazioOk: true });
    if (d !== null) { m.desc = d.slice(0, 1000); mudou({ estrutura: true }); }
    return;
  }
  if (el.closest('[data-mais-botao]')) { b.botoes.push({ rotulo: '', url: '' }); return mudou({ estrutura: true }); }
  const tb = el.closest('[data-tira-botao]');
  if (tb) { b.botoes.splice(+tb.dataset.tiraBotao, 1); if (!b.botoes.length) b.botoes.push({ rotulo: '', url: '' }); return mudou({ estrutura: true }); }
  if (el.closest('[data-tira-arq]')) { b.arq = null; return mudou({ estrutura: true }); }
});

// arrastar blocos pela alça
let arrastando = null;
raizBlocos.addEventListener('dragstart', (e) => {
  const alca = e.target.closest?.('.alca');
  if (!alca) return;
  const bl = alca.closest('[data-bloco]');
  arrastando = bl.dataset.bloco;
  bl.classList.add('arrastando');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', 'bloco');
  e.dataTransfer.setDragImage(bl, 20, 20);
});
raizBlocos.addEventListener('dragend', () => {
  arrastando = null;
  $$('.bloco').forEach((b) => b.classList.remove('arrastando', 'alvo-cima', 'alvo-baixo'));
});
raizBlocos.addEventListener('dragover', (e) => {
  if (!arrastando) return;
  const alvo = e.target.closest('[data-bloco]');
  $$('.bloco').forEach((b) => b.classList.remove('alvo-cima', 'alvo-baixo'));
  if (!alvo || alvo.dataset.bloco === arrastando || alvo.closest(`[data-bloco="${arrastando}"]`)) return;
  e.preventDefault();
  const r = alvo.getBoundingClientRect();
  alvo.classList.add(e.clientY < r.top + r.height / 2 ? 'alvo-cima' : 'alvo-baixo');
});
raizBlocos.addEventListener('drop', (e) => {
  if (!arrastando) return;
  e.preventDefault();
  const alvoEl = e.target.closest('[data-bloco]');
  if (!alvoEl || alvoEl.dataset.bloco === arrastando) return;
  const antes = alvoEl.classList.contains('alvo-cima');
  const origem = acharBloco(arrastando);
  if (origem.bloco.t === 'caixa' && alvoEl.closest('.bloco.caixa') && alvoEl.closest('.bloco.caixa') !== alvoEl) return toast('Uma caixa não entra dentro de outra.', true);
  origem.lista.splice(origem.i, 1);
  const alvo = acharBloco(alvoEl.dataset.bloco);
  alvo.lista.splice(alvo.i + (antes ? 0 : 1), 0, origem.bloco);
  arrastando = null;
  mudou({ estrutura: true });
});

// arquivos
let destinoArquivo = null;
function escolherArquivos(blocoId, onde) {
  destinoArquivo = { blocoId, onde };
  const inp = $('#arquivo');
  inp.accept = onde === 'arq' ? '' : onde === 'mini' ? 'image/*' : 'image/*,video/*';
  inp.multiple = onde === 'galeria';
  inp.value = '';
  inp.click();
}
$('#arquivo').addEventListener('change', async (e) => {
  if (destinoArquivo) await receberArquivos([...e.target.files], destinoArquivo.blocoId, destinoArquivo.onde);
});
async function receberArquivos(files, blocoId, onde) {
  const ref = acharBloco(blocoId);
  if (!ref || !files.length) return;
  const b = ref.bloco;
  const lim = (S.meta?.servidor.limiteMB || 10) * 1048576;
  for (const f of files) {
    if (f.size > lim) { toast(`${f.name} tem ${tamanho(f.size)}; o limite é ${S.meta.servidor.limiteMB} MB.`, true); continue; }
    if (onde !== 'arq' && !/^(image|video)\//.test(f.type)) { toast(`${f.name} não é imagem nem vídeo. Use o bloco "Arquivo".`, true); continue; }
    const id = await guardaArquivo(f);
    const m = { id: uid(), fonte: 'arquivo', arquivo: id, spoiler: false };
    if (onde === 'mini') { b.mini = m; break; }
    if (onde === 'arq') { b.arq = m; break; }
    if (b.itens.length >= 10) { toast('A galeria aceita até 10.', true); break; }
    b.itens.push(m);
  }
  mudou({ estrutura: true });
}
// soltar arquivo em cima de uma galeria (ou em qualquer lugar = última galeria)
function ultimaGaleria() {
  let achado = null;
  const anda = (l) => l.forEach((b) => { if (b.t === 'midia') achado = b; if (b.filhos) anda(b.filhos); });
  anda(E.blocos);
  if (!achado) {
    achado = novoBloco('midia');
    const caixa = E.blocos.find((b) => b.t === 'caixa');
    (caixa ? caixa.filhos : E.blocos).push(achado);
  }
  return achado;
}
document.addEventListener('dragover', (e) => {
  if (arrastando || !e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  $$('.soltar').forEach((s) => s.classList.toggle('sobre', s.contains(e.target)));
});
document.addEventListener('drop', async (e) => {
  if (arrastando || !e.dataTransfer?.files.length || $('#tela-escrever').hidden) return;
  e.preventDefault();
  $$('.soltar').forEach((s) => s.classList.remove('sobre'));
  const zona = e.target.closest('[data-soltar]');
  const ref = zona && blocoDe(zona);
  if (ref) return receberArquivos([...e.dataTransfer.files], ref.bloco.id, zona.dataset.soltar);
  const g = ultimaGaleria();
  await receberArquivos([...e.dataTransfer.files], g.id, 'galeria');
});
document.addEventListener('paste', async (e) => {
  if ($('#tela-escrever').hidden || !$('#modal-pergunta').hidden) return;
  const files = [...(e.clipboardData?.files || [])].filter((f) => /^(image|video)\//.test(f.type));
  if (!files.length) return;
  e.preventDefault();
  const ref = blocoDe(document.activeElement || document.body);
  const alvo = ref?.bloco.t === 'midia' ? ref.bloco : ultimaGaleria();
  await receberArquivos(files.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `imagem-colada-${Date.now()}-${i}.png`, { type: f.type }))), alvo.id, 'galeria');
  toast('Imagem colada na galeria.');
});

// ---------- formatação do texto ----------
function inserir(ta, texto, selecionarDe = null, selecionarAte = null) {
  ta.focus();
  const ok = document.execCommand && document.execCommand('insertText', false, texto);
  if (!ok) ta.setRangeText(texto, ta.selectionStart, ta.selectionEnd, 'end');
  if (selecionarDe !== null) ta.setSelectionRange(selecionarDe, selecionarAte);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function envolver(ta, a, z = a, ph = 'texto') {
  const s = ta.selectionStart;
  const f = ta.selectionEnd;
  const sel = ta.value.slice(s, f);
  if (sel.startsWith(a) && sel.endsWith(z) && sel.length >= a.length + z.length) return inserir(ta, sel.slice(a.length, sel.length - z.length));
  const antes = ta.value.slice(s - a.length, s);
  const depois = ta.value.slice(f, f + z.length);
  if (antes === a && depois === z) {
    ta.setSelectionRange(s - a.length, f + z.length);
    return inserir(ta, sel, s - a.length, f - a.length);
  }
  const meio = sel || ph;
  inserir(ta, a + meio + z, s + a.length, s + a.length + meio.length);
}
function prefixoLinhas(ta, prefixo) {
  const v = ta.value;
  const ini = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
  let fim = v.indexOf('\n', ta.selectionEnd);
  if (fim < 0) fim = v.length;
  const linhas = v.slice(ini, fim).split('\n');
  const limpa = (l) => l.replace(/^(#{1,3} |-# |> |- )/, '');
  const todasTem = linhas.every((l) => l.startsWith(prefixo));
  const nova = linhas.map((l) => (todasTem ? l.slice(prefixo.length) : prefixo + limpa(l))).join('\n');
  ta.setSelectionRange(ini, fim);
  inserir(ta, nova, ini, ini + nova.length);
}
async function formatar(ta, tipo, botao) {
  if (!ta) return;
  S.ultimoTexto = { el: ta, id: blocoDe(ta)?.bloco.id };
  const mapa = { b: ['**'], i: ['*'], u: ['__'], s: ['~~'], spoiler: ['||'], code: ['`'] };
  if (mapa[tipo]) return envolver(ta, mapa[tipo][0]);
  if (tipo === 'h1') return prefixoLinhas(ta, '# ');
  if (tipo === 'h2') return prefixoLinhas(ta, '## ');
  if (tipo === 'h3') return prefixoLinhas(ta, '### ');
  if (tipo === 'sub') return prefixoLinhas(ta, '-# ');
  if (tipo === 'quote') return prefixoLinhas(ta, '> ');
  if (tipo === 'lista') return prefixoLinhas(ta, '- ');
  if (tipo === 'link') {
    const s = ta.selectionStart;
    const sel = ta.value.slice(s, ta.selectionEnd);
    const u = await perguntar('Link', `Endereço pra onde "${sel || 'o texto'}" vai levar:`, { campo: 'https://' });
    if (!u || !/^https?:\/\/\S+$/.test(u.trim())) return;
    ta.focus();
    ta.setSelectionRange(s, s + sel.length);
    return inserir(ta, `[${sel || 'clique aqui'}](${u.trim()})`);
  }
  if (tipo === 'hora') return abrirHora(ta);
  if (tipo === 'emoji' || tipo === 'cargo' || tipo === 'canal') return abrirPainel(ta, tipo, botao);
}

// ---------- sugestões (: @ #) e painéis ----------
const sug = { aberto: false, itens: [], foco: 0, ta: null, ini: 0, fim: 0 };
const sugEl = $('#sugestoes');
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function listaEmojis(q) {
  const n = norm(q);
  const srv = S.meta.emojis.filter((e) => norm(e.nome).includes(n)).map((e) => ({ tipo: 'emoji', html: `<img src="${esc(urlEmoji(e.id, e.animado))}" alt="">:${esc(e.nome)}:`, valor: `<${e.animado ? 'a' : ''}:${e.nome}:${e.id}>` }));
  const uni = UNICODE.filter(([k]) => k.includes(n)).map(([k, u]) => ({ tipo: 'emoji', html: `<span class="u">${u}</span>${k}`, valor: u }));
  return [...srv, ...uni];
}
function listaCargos(q) {
  const n = norm(q);
  const r = S.meta.cargos.filter((c) => norm(c.nome).includes(n)).map((c) => ({ html: `<span class="bolinha" style="background:${c.cor || '#99aab5'}"></span>${esc(c.nome)}`, valor: `<@&${c.id}>` }));
  if ('everyone'.includes(n)) r.push({ html: '<span class="bolinha" style="background:#5865f2"></span>@everyone (todo mundo)', valor: '@everyone' });
  if ('here'.includes(n)) r.push({ html: '<span class="bolinha" style="background:#5865f2"></span>@here (quem está online)', valor: '@here' });
  return r;
}
function listaCanaisSug(q) {
  const n = norm(q);
  return S.meta.canais.filter((c) => !/^ticket-/.test(c.nome) && norm(c.nome).includes(n)).map((c) => ({ html: `<span class="u">#</span>${esc(c.nome)}`, valor: `<#${c.id}>` }));
}
function sugerir(ta) {
  const ate = ta.value.slice(0, ta.selectionStart);
  const m = ate.match(/(^|[\s(])([:@#])([^\s:@#<>]{0,32})$/);
  if (!m || (m[2] === ':' && m[3].length < 2)) return fecharSugestoes();
  const q = m[3];
  const itens = m[2] === ':' ? listaEmojis(q) : m[2] === '@' ? listaCargos(q) : listaCanaisSug(q);
  if (!itens.length) return fecharSugestoes();
  Object.assign(sug, { aberto: true, itens: itens.slice(0, 40), foco: 0, ta, ini: ate.length - q.length - 1, fim: ate.length, modo: 'sug' });
  const tit = m[2] === ':' ? 'Emojis' : m[2] === '@' ? 'Cargos' : 'Canais';
  mostrarSugestoes(tit, caretXY(ta));
}
function mostrarSugestoes(titulo, pos) {
  sugEl.classList.remove('painel-emojis');
  sugEl.innerHTML = `<div class="tit">${titulo}</div>${sug.itens.map((it, i) => `<button type="button" class="sug ${i === sug.foco ? 'foco' : ''}" data-i="${i}">${it.html}</button>`).join('')}`;
  posicionar(pos);
}
function posicionar(pos) {
  sugEl.hidden = false;
  const w = sugEl.offsetWidth;
  const h = sugEl.offsetHeight;
  let x = Math.min(pos.x, innerWidth - w - 10);
  let y = pos.y + 22;
  if (y + h > innerHeight - 10) y = pos.y - h - 6;
  sugEl.style.left = `${Math.max(10, x)}px`;
  sugEl.style.top = `${Math.max(10, y)}px`;
}
const sugestoesAbertas = () => sug.aberto && !sugEl.hidden;
function fecharSugestoes() {
  sug.aberto = false;
  sugEl.hidden = true;
}
function navegaSugestao(e) {
  if (e.key === 'Escape') { e.preventDefault(); return fecharSugestoes(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sug.foco = (sug.foco + (e.key === 'ArrowDown' ? 1 : -1) + sug.itens.length) % sug.itens.length;
    $$('.sug', sugEl).forEach((b, i) => b.classList.toggle('foco', i === sug.foco));
    $$('.sug', sugEl)[sug.foco]?.scrollIntoView({ block: 'nearest' });
    return;
  }
  e.preventDefault();
  escolherSugestao(sug.foco);
}
function escolherSugestao(i) {
  const it = sug.itens[i];
  if (!it) return;
  const ta = sug.ta;
  if (sug.modo === 'sug') ta.setSelectionRange(sug.ini, sug.fim);
  else ta.setSelectionRange(sug.ini, sug.ini);
  fecharSugestoes();
  inserir(ta, `${it.valor} `);
}
sugEl.addEventListener('mousedown', (e) => e.preventDefault());
sugEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-i]');
  if (b) escolherSugestao(+b.dataset.i);
});
document.addEventListener('mousedown', (e) => { if (!sugEl.contains(e.target) && !e.target.closest('[data-fmt]')) fecharSugestoes(); });
function abrirPainel(ta, tipo, botao) {
  const r = botao.getBoundingClientRect();
  sug.ta = ta;
  sug.ini = ta.selectionStart;
  sug.modo = 'painel';
  if (tipo === 'emoji') {
    sug.itens = listaEmojis('');
    sug.aberto = true;
    const srv = S.meta.emojis.length;
    sugEl.innerHTML = `<div class="tit">Do servidor</div><div class="grade-emojis">${sug.itens.slice(0, srv).map((it, i) => `<button type="button" data-i="${i}" title="${esc(it.valor)}">${it.html.replace(/:[^:]+:$/, '')}</button>`).join('')}</div>
      <div class="tit" style="margin-top:6px">Comuns</div><div class="grade-emojis">${sug.itens.slice(srv).map((it, i) => `<button type="button" data-i="${i + srv}" title="${esc(it.html.replace(/<[^>]+>[^<]*<\/span>/, ''))}">${it.valor}</button>`).join('')}</div>`;
    sugEl.classList.add('painel-emojis');
    posicionar({ x: r.left, y: r.bottom - 18 });
    return;
  }
  sug.itens = tipo === 'cargo' ? listaCargos('') : listaCanaisSug('');
  sug.foco = -1;
  sug.aberto = true;
  mostrarSugestoes(tipo === 'cargo' ? 'Marcar cargo' : 'Citar canal', { x: r.left, y: r.bottom - 18 });
}
// posição do cursor dentro do textarea (espelho)
function caretXY(ta) {
  const div = document.createElement('div');
  const cs = getComputedStyle(ta);
  for (const p of ['font', 'letterSpacing', 'lineHeight', 'padding', 'border', 'boxSizing', 'whiteSpace', 'wordWrap', 'width']) div.style[p] = cs[p];
  Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', wordWrap: 'break-word', top: '0', left: '-9999px' });
  div.textContent = ta.value.slice(0, ta.selectionStart);
  const sp = document.createElement('span');
  sp.textContent = '\u200b';
  div.appendChild(sp);
  document.body.appendChild(div);
  const r = ta.getBoundingClientRect();
  const x = r.left + sp.offsetLeft - ta.scrollLeft;
  const y = r.top + sp.offsetTop - ta.scrollTop;
  div.remove();
  return { x, y };
}

// horário
function abrirHora(ta) {
  S.ultimoTexto = { el: ta };
  const d = new Date(Date.now() + 3600e3);
  d.setMinutes(0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
  $('#hora-quando').value = local;
  desenharFormatos();
  $('#modal-hora').hidden = false;
}
function desenharFormatos() {
  const seg = Math.floor(new Date($('#hora-quando').value).getTime() / 1000);
  if (!Number.isFinite(seg)) return;
  const f = [['F', 'Completo'], ['f', 'Data e hora'], ['R', 'Contagem ("daqui a…")'], ['D', 'Só a data'], ['t', 'Só a hora']];
  $('#hora-formatos').innerHTML = f.map(([k, n]) => `<button type="button" data-hora="<t:${seg}:${k}>"><span>${esc(horario(seg, k))}</span><small>${n}</small></button>`).join('')
    + `<button type="button" data-hora="<t:${seg}:F> (<t:${seg}:R>)"><span>${esc(horario(seg, 'F'))} (${esc(horario(seg, 'R'))})</span><small>Completo + contagem</small></button>`;
}
$('#hora-quando').addEventListener('input', desenharFormatos);
$('#hora-formatos').addEventListener('click', (e) => {
  const b = e.target.closest('[data-hora]');
  if (!b || !S.ultimoTexto?.el) return;
  $('#modal-hora').hidden = true;
  inserir(S.ultimoTexto.el, b.dataset.hora);
});

// {eter} e {cargo:Nome} dos modelos prontos viram o emoji/cargo de verdade
function trocarAtalhos(txt) {
  return String(txt || '')
    .replace(/\{eter\}/g, () => { const e = S.meta?.emojis.find((x) => x.id === '1561861904610230313'); return e ? `<:${e.nome}:${e.id}>` : '🪙'; })
    .replace(/\{cargo:([^}]+)\}/g, (all, nome) => { const c = S.meta?.cargos.find((x) => norm(x.nome).includes(norm(nome))); return c ? `<@&${c.id}>` : all; });
}

// ---------- montar a mensagem (o que vai pro Discord) ----------
function nomeSeguro(nome) {
  const ponto = nome.lastIndexOf('.');
  const ext = ponto > 0 ? nome.slice(ponto + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
  const base = (ponto > 0 ? nome.slice(0, ponto) : nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || 'arquivo';
  return ext ? `${base}.${ext}` : base;
}
function montar(estado = E) {
  const files = [];
  const antigos = [];
  const porArquivo = new Map();
  const usados = new Set();
  const resolver = new Map(); // attachment://nome -> {url, video}
  const pedido = (estado.blocos || []).flatMap((b) => [b, ...(b.filhos || [])]);
  for (const b of pedido) for (const m of [...(b.itens || []), b.mini, b.arq]) if (m?.fonte === 'existente') usados.add(m.nome);
  const ref = (m) => {
    if (!m) return null;
    if (m.fonte === 'url') return m.url;
    if (m.fonte === 'existente') {
      if (!antigos.some((a) => a.id === m.anexoId)) antigos.push({ id: m.anexoId, nome: m.nome });
      resolver.set(`attachment://${m.nome}`, { url: px(m.url), video: ehVideo(m) });
      return `attachment://${m.nome}`;
    }
    const a = S.arquivos.get(m.arquivo);
    if (!a) return null;
    if (!porArquivo.has(m.arquivo)) {
      let n = nomeSeguro(a.nome);
      let k = 2;
      while (usados.has(n)) n = nomeSeguro(a.nome).replace(/(\.[^.]+)?$/, `_${k++}$1`);
      usados.add(n);
      porArquivo.set(m.arquivo, n);
      files.push({ blob: a.blob, nome: n });
      resolver.set(`attachment://${n}`, { url: a.url, video: /^video\//.test(a.tipo), tamanho: a.tamanho, nome: n });
    }
    m.nomeEnviado = porArquivo.get(m.arquivo);
    return `attachment://${porArquivo.get(m.arquivo)}`;
  };
  const subs = trocarAtalhos;
  const um = (b) => {
    switch (b.t) {
      case 'texto': return b.texto?.trim() ? { type: 10, content: subs(b.texto) } : null;
      case 'separador': return { type: 14, divider: !!b.linha, spacing: b.grande ? 2 : 1 };
      case 'midia': {
        const items = b.itens.map((m) => ({ media: { url: ref(m) }, description: m.desc || undefined, spoiler: !!m.spoiler })).filter((i) => i.media.url);
        return items.length ? { type: 12, items } : null;
      }
      case 'secao': {
        if (!b.texto?.trim()) return null;
        const u = ref(b.mini);
        const partes = subs(b.texto).split(/\n{3,}/).slice(0, 3).map((t) => ({ type: 10, content: t }));
        return u ? { type: 9, components: partes, accessory: { type: 11, media: { url: u } } } : partes.length === 1 ? partes[0] : { type: 10, content: subs(b.texto) };
      }
      case 'botoes': {
        const bs = b.botoes.filter((x) => /^https?:\/\/\S+$/.test(x.url.trim())).map((x) => ({ type: 2, style: 5, label: (x.rotulo || 'Abrir').slice(0, 80), url: x.url.trim() }));
        return bs.length ? { type: 1, components: bs } : null;
      }
      case 'arquivo': { const u = ref(b.arq); return u ? { type: 13, file: { url: u } } : null; }
      case 'caixa': {
        const dentro = b.filhos.map(um).filter(Boolean);
        if (!dentro.length) return null;
        const c = { type: 17, components: dentro, spoiler: !!b.spoiler };
        if (b.cor) c.accent_color = parseInt(b.cor.slice(1), 16);
        return c;
      }
    }
    return null;
  };
  const componentes = (estado.blocos || []).map(um).filter(Boolean);
  return { componentes, files, antigos, resolver };
}
function textoTotal(comps) {
  let n = 0;
  for (const c of comps) { if (c.type === 10) n += c.content.length; if (c.components) n += textoTotal(c.components); }
  return n;
}
function primeiraLinha(comps) {
  for (const c of comps) {
    if (c.type === 10) {
      const l = c.content.split('\n').map((x) => x.replace(/^(#{1,3}|-#|>)\s*/, '').replace(/<a?:(\w+):\d+>/g, '').replace(/<@&\d+>|<#\d+>|<t:\d+(:\w)?>/g, '').replace(/[*_~|`]/g, '').trim()).find(Boolean);
      if (l) return l;
    }
    if (c.components) { const r = primeiraLinha(c.components); if (r) return r; }
  }
  return '';
}

// ---------- prévia ----------
function ctxMd() {
  return {
    cargo: (id) => S.meta?.cargos.find((c) => c.id === id),
    canal: (id) => S.meta?.canais.find((c) => c.id === id),
    emoji: (id, a) => urlEmoji(id, a),
  };
}
function htmlComponentes(comps, resolver) {
  const ctx = ctxMd();
  const url = (u) => resolver.get(u)?.url || u;
  const video = (u) => resolver.get(u)?.video ?? /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u);
  const um = (c) => {
    switch (c.type) {
      case 10: return `<div class="d-texto">${md(c.content, ctx)}</div>`;
      case 14: return `<div class="d-sep ${c.spacing === 2 ? 'grande' : ''} ${c.divider ? '' : 'sem-linha'}"></div>`;
      case 12: return `<div class="d-gal n${c.items.length}">${c.items.map((i) => `<div class="d-gal-item ${i.spoiler ? 'spoiler-c' : ''}">${video(i.media.url) ? `<video src="${esc(url(i.media.url))}" muted loop playsinline autoplay></video>` : `<img src="${esc(url(i.media.url))}" alt="${esc(i.description || '')}">`}</div>`).join('')}</div>`;
      case 9: return `<div class="d-secao"><div class="d-corpo">${c.components.map(um).join('')}</div>${c.accessory.type === 11 ? `<img class="d-thumb" src="${esc(url(c.accessory.media.url))}" alt="">` : ''}</div>`;
      case 1: return `<div class="d-botoes">${c.components.map((b) => `<a class="d-botao" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)} <span class="ext">↗</span></a>`).join('')}</div>`;
      case 13: { const r = resolver.get(c.file.url); return `<div class="d-arquivo"><span class="ic">📄</span><div><div class="n">${esc(r?.nome || c.file.url.replace('attachment://', ''))}</div><div class="s">${r?.tamanho ? tamanho(r.tamanho) : ''}</div></div></div>`; }
      case 17: return `<div class="d-container ${c.accent_color !== undefined ? 'com-cor' : ''} ${c.spoiler ? 'spoiler-c' : ''}" style="--cor:#${(c.accent_color ?? 0).toString(16).padStart(6, '0')}">${c.components.map(um).join('')}</div>`;
    }
    return '';
  };
  return comps.map(um).join('');
}
function htmlMensagem(estado, { compacto = false } = {}) {
  const { componentes, resolver } = montar(copia(estado));
  const m = S.meta;
  const nome = (estado.nome || '').trim() || m?.bot.nome || 'Astrea Cobblemon';
  const foto = (estado.avatar || '').trim() || m?.bot.avatar || '';
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const canal = m?.canais.find((c) => c.id === estado.canal);
  const forum = !compacto && canal?.tipo === 'forum' && !estado.editar ? `<div class="d-forum"><div class="t">${esc(estado.titulo || 'Título do post')}</div>${estado.tags?.length ? `<div class="tags">${estado.tags.map((t) => { const x = canal.tags.find((y) => y.id === t); return x ? `<span>${esc((x.emoji || '') + ' ' + x.nome)}</span>` : ''; }).join('')}</div>` : ''}</div>` : '';
  const corpo = componentes.length ? htmlComponentes(componentes, resolver) : '<div class="d-vazio">A mensagem aparece aqui enquanto você escreve.</div>';
  return `${forum}<div class="d-msg"><img class="d-av" src="${esc(px(foto))}" alt=""><div><div class="d-cab"><span class="d-nome">${esc(nome)}</span><span class="d-app">App</span><span class="d-hora">Hoje às ${hora}</span></div><div class="d-corpo">${corpo}</div></div></div>`;
}
let tPrevia;
function desenharPrevia() {
  clearTimeout(tPrevia);
  tPrevia = setTimeout(() => {
    const prev = $('#previa');
    const rolagem = prev.scrollTop;
    // preserva vídeos tocando (não recarregar a cada letra)
    prev.innerHTML = htmlMensagem(E);
    prev.scrollTop = rolagem;
    const { componentes, files } = montar(copia(E));
    const n = textoTotal(componentes);
    const cont = $('#contador');
    cont.textContent = `${n.toLocaleString('pt-BR')} / 4.000 letras`;
    cont.className = `contador ${n > 4000 ? 'passou' : n > 3600 ? 'alto' : ''}`;
    desenharAvisos(componentes, files);
  }, 60);
}
function problemas(componentes, files) {
  const av = [];
  const c = canalAtual();
  if (!c) av.push({ t: 'erro', m: 'Falta escolher o canal.' });
  else if (c.tipo === 'forum' && !E.editar) {
    if (!E.titulo?.trim()) av.push({ t: 'erro', m: 'Post de fórum precisa de título.' });
    if (c.exigeTag && !E.tags.length) av.push({ t: 'erro', m: 'Esse fórum exige uma etiqueta.' });
  }
  if (!componentes.length) av.push({ t: 'erro', m: 'A mensagem está vazia.' });
  if (textoTotal(componentes) > 4000) av.push({ t: 'erro', m: 'Passou de 4.000 letras somando todos os textos (limite do Discord).' });
  const total = files.reduce((s, f) => s + f.blob.size, 0);
  const lim = S.meta?.servidor.limiteMB || 10;
  if (total > lim * 1048576) av.push({ t: 'erro', m: `Os arquivos somam ${tamanho(total)}; o limite é ${lim} MB por mensagem.` });
  const perdidos = [...idsUsados()].filter((id) => !S.arquivos.has(id)).length;
  if (perdidos) av.push({ t: 'erro', m: `${perdidos} arquivo(s) sumiram deste navegador. Tire e escolha de novo.` });
  const todos = JSON.stringify(componentes);
  if (/@(everyone|here)/.test(todos)) av.push({ t: 'aviso', m: 'Tem @everyone/@here: vai notificar todo mundo. Na hora de publicar eu pergunto de novo.' });
  const semBotao = E.blocos.some((b) => [b, ...(b.filhos || [])].some((x) => x.t === 'botoes' && x.botoes.some((y) => y.url && !/^https?:\/\/\S+$/.test(y.url.trim()))));
  if (semBotao) av.push({ t: 'aviso', m: 'Um botão tem um link que não começa com https://, então ele não vai aparecer.' });
  const vazias = E.blocos.some((b) => [b, ...(b.filhos || [])].some((x) => x.t === 'midia' && !x.itens.length));
  if (vazias) av.push({ t: 'info', m: 'Tem uma galeria vazia (ela não vai aparecer). Arraste a imagem ou o vídeo pra ela.' });
  if (E.editar) av.push({ t: 'info', m: 'Editando: canal, nome e foto ficam como estavam.' });
  return av;
}
function desenharAvisos(componentes, files) {
  $('#avisos').innerHTML = problemas(componentes, files).map((a) => `<div class="aviso ${a.t === 'erro' ? 'erro-av' : a.t === 'info' ? 'info' : ''}">${esc(a.m)}</div>`).join('');
}

// ---------- publicar ----------
async function confirmarEnvio() {
  if (!$('#modal-enviar').hidden) return;
  const { componentes, files } = montar(copia(E));
  const erros = problemas(componentes, files).filter((a) => a.t === 'erro');
  if (erros.length) {
    if (!canalAtual()) { $('#btn-canal').classList.remove('pisca'); void $('#btn-canal').offsetWidth; $('#btn-canal').classList.add('pisca'); }
    return toast(erros[0].m, true);
  }
  const c = canalAtual();
  const todos = JSON.stringify(componentes);
  const cargos = [...new Set([...todos.matchAll(/<@&(\d+)>/g)].map((m) => m[1]))].map((id) => S.meta.cargos.find((x) => x.id === id)).filter(Boolean);
  const geral = /@(everyone|here)/.test(todos);
  const total = files.reduce((s, f) => s + f.blob.size, 0);
  let html = `<div class="conf-linha"><span class="ic">${c.tipo === 'forum' ? '💬' : c.tipo === 'anuncios' ? '📣' : '#'}</span><div>${E.editar ? 'Vai mudar a mensagem que já está em' : 'Vai publicar em'} <b>#${esc(c.nome)}</b>${c.tipo === 'forum' && !E.editar ? ` com o título <b>${esc(E.titulo)}</b>` : ''}.</div></div>`;
  if (ehStaff(c)) html += `<div class="conf-linha"><span class="ic">🔒</span><div>Esse canal é da staff (só a equipe vê).</div></div>`;
  if (cargos.length) html += `<div class="conf-linha"><span class="ic">🔔</span><div>${E.editar ? 'Edição não notifica de novo.' : `Vai notificar: ${cargos.map((r) => `<b style="color:${r.cor || 'inherit'}">@${esc(r.nome)}</b>`).join(', ')}`}</div></div>`;
  if (geral && !E.editar) html += `<div class="conf-linha alerta"><span class="ic">⚠️</span><div>Tem <b>@everyone/@here</b>.<label class="check" style="margin:6px 0 0"><input type="checkbox" id="conf-todos"><span>Pode notificar todo mundo</span></label></div></div>`;
  if (files.length) html += `<div class="conf-linha"><span class="ic">📦</span><div>${files.length} arquivo(s) novos, ${tamanho(total)}${total > 8 * 1048576 ? ' (pode levar um tempinho)' : ''}.</div></div>`;
  if (c.tipo === 'anuncios' && !E.editar) html += `<div class="conf-linha"><span class="ic">📡</span><div>${E.anunciar !== false ? 'Também vai pros servidores que seguem o canal.' : 'Só neste servidor (sem repassar pros que seguem).'}</div></div>`;
  $('#conf-titulo').textContent = E.editar ? 'Salvar a edição?' : 'Publicar agora?';
  $('#btn-confirmar').textContent = E.editar ? 'Salvar no Discord' : 'Publicar';
  $('#conf-corpo').innerHTML = html;
  $('#erro-enviar').textContent = '';
  $('#progresso').hidden = true;
  $('#btn-confirmar').disabled = false;
  $('#modal-enviar').hidden = false;
  $('#btn-confirmar').focus();
}
async function enviar() {
  const estado = copia(E);
  const { componentes, files, antigos } = montar(estado);
  const geral = /@(everyone|here)/.test(JSON.stringify(componentes));
  if (geral && !E.editar && !$('#conf-todos')?.checked) {
    $('#erro-enviar').textContent = 'Marque "Pode notificar todo mundo" ou tire o @everyone/@here.';
    return;
  }
  const form = new FormData();
  const dados = {
    canal: E.canal, nome: E.nome, avatar: E.avatar, componentes, pingTodos: geral,
    anunciar: E.anunciar !== false, titulo: E.titulo, tags: E.tags, editar: E.editar,
    manter: antigos.map((a) => a.id), reusar: E.editar ? [] : antigos, reusarDe: E.deEnviado || E.editar,
    resumo: primeiraLinha(componentes), estado: { ...estado, editar: null, editarRotulo: '' },
  };
  form.append('dados', JSON.stringify(dados));
  files.forEach((f, i) => form.append(`files[${i}]`, f.blob, f.nome));
  const b = $('#btn-confirmar');
  b.disabled = true;
  $('#erro-enviar').textContent = '';
  $('#progresso').hidden = false;
  const barra = $('#progresso-barra');
  const txt = $('#progresso-txt');
  barra.style.width = '3%';
  txt.textContent = files.length ? 'Enviando os arquivos…' : 'Publicando…';
  try {
    const r = await enviarComProgresso(form, (p) => {
      barra.style.width = `${Math.max(3, p * 92)}%`;
      txt.textContent = p < 1 ? `Enviando… ${Math.round(p * 100)}%` : 'O Discord está processando…';
    });
    barra.style.width = '100%';
    $('#modal-enviar').hidden = true;
    S.ultimoEnviado = r;
    $('#ok-titulo').textContent = r.editado ? 'Edição salva!' : 'Publicado!';
    $('#ok-texto').innerHTML = `${r.editado ? 'A mensagem mudou' : 'A mensagem está'} em <b>#${esc(r.canal)}</b>${r.anunciado ? ' e foi repassada pros servidores que seguem' : ''}.`;
    $('#ok-link').href = r.link;
    $('#modal-ok').hidden = false;
    if (E.editar) sairEdicao(false);
    carregarEnviadas(true);
  } catch (e) {
    $('#erro-enviar').textContent = e.message;
    $('#progresso').hidden = true;
    b.disabled = false;
  }
}
$('#btn-enviar').addEventListener('click', confirmarEnvio);
$('#btn-confirmar').addEventListener('click', enviar);
$('#ok-novo').addEventListener('click', () => { $('#modal-ok').hidden = true; limparTudo(true); });
$('#ok-continuar').addEventListener('click', () => { $('#modal-ok').hidden = true; });
$('#btn-limpar').addEventListener('click', async () => {
  if (await perguntar('Começar do zero?', 'A mensagem atual sai daqui (dá pra voltar com ↶).')) limparTudo(false);
});
function limparTudo(semPergunta) {
  const canal = E.canal;
  const nome = E.nome;
  const avatar = E.avatar;
  E = novoEstado();
  if (semPergunta) Object.assign(E, { canal, nome, avatar });
  desenharTudo();
  mudou();
}

// ---------- edição de enviada ----------
function desenharEdicao() {
  $('#faixa-edicao').hidden = !E.editar;
  $('#edicao-qual').textContent = E.editarRotulo || '';
  $('#btn-enviar').firstChild.textContent = E.editar ? 'Salvar edição ' : 'Publicar no Discord ';
}
function sairEdicao(limpar = true) {
  E.editar = null;
  E.editarRotulo = '';
  if (limpar) E = novoEstado();
  desenharTudo();
  mudou();
}
$('#btn-cancelar-edicao').addEventListener('click', async () => {
  if (await perguntar('Cancelar a edição?', 'A mensagem no Discord fica como está.')) sairEdicao(true);
});
async function abrirEnviada(id, modo) {
  const e = await api(`/api/enviados/${id}`);
  if (!e.dados) return toast('Essa mensagem foi feita antes do Postador guardar o conteúdo.', true);
  const est = { ...novoEstado(), ...e.dados };
  // arquivos que já estão no Discord
  const porNome = new Map(e.anexos.map((a) => [a.filename, a]));
  const converte = (m) => {
    if (m?.fonte === 'arquivo' && m.nomeEnviado && porNome.has(m.nomeEnviado)) {
      const a = porNome.get(m.nomeEnviado);
      return { id: uid(), fonte: 'existente', anexoId: a.id, nome: a.filename, url: a.url, tipo: a.tipo, spoiler: m.spoiler, desc: m.desc };
    }
    return m;
  };
  const anda = (l) => l.forEach((b) => { if (b.itens) b.itens = b.itens.map(converte); if (b.mini) b.mini = converte(b.mini); if (b.arq) b.arq = converte(b.arq); if (b.filhos) anda(b.filhos); });
  anda(est.blocos);
  est.canal = e.canal;
  if (modo === 'editar') {
    est.editar = e.id;
    est.editarRotulo = `de ${new Date(e.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    est.deEnviado = e.id;
  } else {
    est.editar = null;
    est.deEnviado = e.id;
  }
  E = est;
  await carregaArquivos();
  trocarAba('escrever');
  desenharTudo();
  mudou();
  toast(modo === 'editar' ? 'Editando. Mude o que quiser e clique em Salvar edição.' : 'Cópia pronta. Escolha o canal e publique.');
}

// ---------- modelos ----------
async function carregarModelos() {
  try {
    S.modelos = (await api('/api/modelos')).itens;
  } catch (e) {
    S.modelos = [];
  }
  desenharModelos();
}
function estadoDeModelo(dados) {
  const est = { ...novoEstado(), ...copia(dados), editar: null, editarRotulo: '', deEnviado: null };
  est.blocos = comIds(est.blocos);
  const anda = (l) => l.forEach((b) => { if (typeof b.texto === 'string') b.texto = trocarAtalhos(b.texto); if (b.filhos) anda(b.filhos); });
  anda(est.blocos);
  return est;
}
function desenharModelos() {
  const salvos = S.modelos;
  $('#modelos-salvos').innerHTML = salvos.length
    ? salvos.map((m) => cartaoModelo(m.nome, `por ${m.autor || '?'} · ${new Date(m.atualizado).toLocaleDateString('pt-BR')}`, estadoDeModelo(m.dados), `<button class="btn btn-ouro btn-p" data-usar-salvo="${m.id}">Usar</button><button class="btn btn-fantasma btn-p" data-trocar-salvo="${m.id}">Trocar pelo atual</button><button class="btn btn-perigo btn-p" data-apagar-salvo="${m.id}">Apagar</button>`)).join('')
    : '<div class="nada">Nenhum modelo salvo ainda. Monte uma mensagem e clique em "Salvar como modelo".</div>';
  $('#modelos-prontos').innerHTML = PRONTOS.map((p, i) => {
    const est = estadoDeModelo(p.estado);
    const c = S.meta?.canais.find((x) => norm(x.nome).includes(norm(p.canalNome)));
    if (c) est.canal = c.id;
    return cartaoModelo(p.nome, p.desc, est, `<button class="btn btn-ouro btn-p" data-usar-pronto="${i}">Usar</button>`);
  }).join('');
}
function cartaoModelo(nome, sub, est, botoes) {
  return `<div class="cartao"><div class="cartao-mini"><div class="discord">${htmlMensagem(est, { compacto: true })}</div></div>
    <div class="cartao-info"><b>${esc(nome)}</b><small>${esc(sub)}</small></div><div class="cartao-acoes">${botoes}</div></div>`;
}
async function usarModelo(est) {
  const temAlgo = JSON.stringify(montar(copia(E)).componentes).length > 2;
  if (temAlgo && !(await perguntar('Trocar a mensagem atual?', 'A mensagem que está no editor vai ser trocada pelo modelo (dá pra voltar com ↶).'))) return;
  E = { ...est, nome: est.nome || E.nome, avatar: est.avatar || E.avatar, canal: est.canal || E.canal };
  trocarAba('escrever');
  desenharTudo();
  mudou();
}
function estadoParaModelo() {
  const est = copia(E);
  est.editar = null;
  est.editarRotulo = '';
  est.deEnviado = null;
  let perdeu = 0;
  const anda = (l) => l.forEach((b) => {
    if (b.itens) { const n = b.itens.length; b.itens = b.itens.filter((m) => m.fonte === 'url'); perdeu += n - b.itens.length; }
    if (b.mini && b.mini.fonte !== 'url') { b.mini = null; perdeu++; }
    if (b.arq && b.arq.fonte !== 'url') { b.arq = null; perdeu++; }
    if (b.filhos) anda(b.filhos);
  });
  anda(est.blocos);
  return { est, perdeu };
}
$('#btn-salvar-modelo').addEventListener('click', async () => {
  const nome = await perguntar('Salvar como modelo', 'Nome do modelo (se já existir um com esse nome, ele é atualizado):', { campo: '' });
  if (!nome?.trim()) return;
  const { est, perdeu } = estadoParaModelo();
  const igual = S.modelos.find((m) => norm(m.nome) === norm(nome.trim()));
  try {
    await api('/api/modelos', { method: 'POST', corpo: { id: igual?.id, nome: nome.trim(), dados: est } });
    toast(`Modelo "${nome.trim()}" salvo${perdeu ? ' (imagens do computador não vão junto, só os textos e links)' : ''}.`);
    carregarModelos();
  } catch (e) { toast(e.message, true); }
});
$('#tela-modelos').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.usarPronto !== undefined) {
    const p = PRONTOS[+b.dataset.usarPronto];
    const est = estadoDeModelo(p.estado);
    const c = S.meta.canais.find((x) => norm(x.nome).includes(norm(p.canalNome)));
    if (c) est.canal = c.id;
    return usarModelo(est);
  }
  if (b.dataset.usarSalvo) return usarModelo(estadoDeModelo(S.modelos.find((m) => m.id === +b.dataset.usarSalvo).dados));
  if (b.dataset.trocarSalvo) {
    const m = S.modelos.find((x) => x.id === +b.dataset.trocarSalvo);
    if (!(await perguntar(`Trocar "${m.nome}"?`, 'O modelo passa a ser a mensagem que está no editor agora.'))) return;
    await api('/api/modelos', { method: 'POST', corpo: { id: m.id, nome: m.nome, dados: estadoParaModelo().est } }).catch((er) => toast(er.message, true));
    toast('Modelo atualizado.');
    return carregarModelos();
  }
  if (b.dataset.apagarSalvo) {
    const m = S.modelos.find((x) => x.id === +b.dataset.apagarSalvo);
    if (!(await perguntar(`Apagar o modelo "${m.nome}"?`, 'Isso não apaga nada no Discord.'))) return;
    await api(`/api/modelos/${m.id}`, { method: 'DELETE' }).catch((er) => toast(er.message, true));
    carregarModelos();
  }
});

// ---------- enviadas ----------
let enviadasCarregadas = false;
async function carregarEnviadas(forcar = false) {
  if (enviadasCarregadas && !forcar) return;
  const el = $('#enviadas');
  if (!enviadasCarregadas) el.innerHTML = '<div class="nada">Carregando…</div>';
  try {
    const { itens } = await api('/api/enviados');
    enviadasCarregadas = true;
    el.innerHTML = itens.length ? itens.map((x) => {
      const c = S.meta.canais.find((y) => y.id === x.canal);
      const a = x.anexos.find((y) => /^(image|video)\//.test(y.tipo));
      const mini = a ? (/^video/.test(a.tipo) ? `<video src="${esc(px(a.url))}" muted preload="metadata"></video>` : `<img src="${esc(px(a.url))}" alt="" loading="lazy">`) : '¶';
      const quando = new Date(x.quando);
      return `<div class="enviada"><div class="mini">${mini}</div><div style="min-width:0"><div class="t">${esc(x.titulo || '(sem texto)')}</div>
        <div class="m">#${esc(c?.nome || 'canal apagado')} · por <b>${esc(x.autor)}</b> · ${quando.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}${x.editado ? ` · editada por ${esc(x.editado.split(' · ')[0])}` : ''}</div></div>
        <div class="acoes"><button class="btn btn-ouro btn-p" data-editar="${x.id}">Editar</button><button class="btn btn-fantasma btn-p" data-repetir="${x.id}">Usar de novo</button><a class="btn btn-fantasma btn-p" href="${esc(x.link)}" target="_blank" rel="noopener">Abrir</a><button class="btn btn-perigo btn-p" data-apagar="${x.id}">Apagar</button></div></div>`;
    }).join('') : '<div class="nada">Nada publicado pelo Postador ainda.</div>';
  } catch (e) {
    el.innerHTML = `<div class="nada">${esc(e.message)}</div>`;
  }
}
$('#enviadas').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.editar) return await abrirEnviada(+b.dataset.editar, 'editar');
    if (b.dataset.repetir) return await abrirEnviada(+b.dataset.repetir, 'repetir');
    if (b.dataset.apagar) {
      if (!(await perguntar('Apagar do Discord?', 'A mensagem some do canal pra todo mundo. Não dá pra desfazer.', { perigo: true }))) return;
      await api(`/api/enviados/${b.dataset.apagar}`, { method: 'DELETE' });
      toast('Apagada do Discord.');
      carregarEnviadas(true);
    }
  } catch (er) { toast(er.message, true); }
});

// ---------- abas, modais, atalhos ----------
function trocarAba(aba) {
  $$('.aba').forEach((a) => a.classList.toggle('ativa', a.dataset.aba === aba));
  ['escrever', 'modelos', 'enviadas'].forEach((t) => ($(`#tela-${t}`).hidden = t !== aba));
  if (aba === 'modelos') desenharModelos();
  if (aba === 'enviadas') carregarEnviadas(true);
  fecharSugestoes();
  scrollTo({ top: 0 });
}
$$('.aba').forEach((a) => a.addEventListener('click', () => trocarAba(a.dataset.aba)));
$$('.modal').forEach((m) => m.addEventListener('mousedown', (e) => { if (e.target === m && m.id !== 'modal-pergunta') m.hidden = true; }));
$$('[data-fechar]').forEach((b) => b.addEventListener('click', () => (b.closest('.modal').hidden = true)));

let respostaPergunta = null;
function perguntar(titulo, texto, { campo = null, vazioOk = false, perigo = false } = {}) {
  return new Promise((ok) => {
    respostaPergunta?.(campo === null ? false : null);
    respostaPergunta = ok;
    $('#perg-titulo').textContent = titulo;
    $('#perg-texto').textContent = texto;
    const inp = $('#perg-campo');
    inp.hidden = campo === null;
    inp.value = campo ?? '';
    inp.dataset.vazioOk = vazioOk ? '1' : '';
    inp.dataset.tem = campo === null ? '' : '1';
    const sim = $('#perg-sim');
    sim.className = `btn ${perigo ? 'btn-perigo' : 'btn-ouro'}`;
    sim.textContent = perigo ? 'Apagar' : campo === null ? 'Sim' : 'OK';
    $('#modal-pergunta').hidden = false;
    setTimeout(() => (campo === null ? sim : inp).focus(), 30);
    if (campo !== null) inp.select();
  });
}
function responder(sim) {
  const inp = $('#perg-campo');
  const temCampo = inp.dataset.tem === '1';
  let v = sim;
  if (temCampo) v = sim ? inp.value : null;
  if (temCampo && sim && !inp.value.trim() && !inp.dataset.vazioOk) return inp.focus();
  $('#modal-pergunta').hidden = true;
  const r = respostaPergunta;
  respostaPergunta = null;
  r?.(v);
}
$('#perg-sim').addEventListener('click', () => responder(true));
$('#perg-nao').addEventListener('click', () => responder(false));
$('#perg-campo').addEventListener('keydown', (e) => { if (e.key === 'Enter') responder(true); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#modal-pergunta').hidden) return responder(false);
    const aberto = $$('.modal').find((m) => !m.hidden);
    if (aberto) { aberto.hidden = true; return; }
  }
  if ($('#app').hidden) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !$('#tela-escrever').hidden) {
    e.preventDefault();
    if (!$('#modal-enviar').hidden) return $('#btn-confirmar').disabled || enviar();
    return confirmarEnvio();
  }
  const noTexto = e.target.matches?.('input, textarea');
  if ((e.ctrlKey || e.metaKey) && !noTexto && !$('#tela-escrever').hidden) {
    if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); irHistorico(-1); }
    if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) { e.preventDefault(); irHistorico(1); }
  }
});
let tToast;
function toast(msg, erro = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${erro ? 'erro-t' : ''}`;
  t.hidden = false;
  clearTimeout(tToast);
  tToast = setTimeout(() => (t.hidden = true), erro ? 5000 : 3200);
}
// hora relativa da prévia anda sozinha
setInterval(() => { if (!$('#app').hidden && !$('#tela-escrever').hidden && /<t:/.test(JSON.stringify(E.blocos))) desenharPrevia(); }, 30000);

iniciar();
