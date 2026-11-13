// Página pública do torneio: regulamento + ficha que confere as regras enquanto o jogador preenche.
import { tid, validar, motivoPokemon, motivoItem, motivoHabilidade, motivoGolpe, aprende, nomeGrupo, timeEmTexto } from './validar.js';
import { desenharChave } from './chave.js';
import { API, carregar, esc, negrito, spriteHtml, tipoCor, tipoNome, CATEGORIA, inscricoesAbertas, miniTime, toast, copiar } from './comum.js';

const $ = (s, el = document) => el.querySelector(s);
let ctx;
let estado;
let chaveRascunho;
const slots = [];

const vazioSlot = () => ({ pk: '', item: '', hab: '', nat: '', golpes: ['', '', '', ''] });

// ---------------------------------------------------------------- caixa de busca
function caixaBusca({ rotulo, dica = '', placeholder = 'Digite pra buscar…', opcoes, textoDe, aoEscolher, corDe }) {
  const id = 'cb' + Math.random().toString(36).slice(2, 9);
  const campo = document.createElement('div');
  campo.className = 'campo';
  campo.innerHTML = `<label class="rot" for="${id}">${esc(rotulo)}${dica ? `<em>${esc(dica)}</em>` : ''}</label>
    <div class="cb"><span class="borda-tipo"></span><input id="${id}" class="entrada" autocomplete="off" spellcheck="false" placeholder="${esc(placeholder)}"
      role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="${id}-l"><span class="seta">▼</span>
    <ul class="lista" id="${id}-l" role="listbox" hidden></ul></div><small class="msg" aria-live="polite"></small>`;
  const input = $('input', campo);
  const lista = $('ul', campo);
  const cb = $('.cb', campo);
  let valor = '';
  let itens = [];
  let ativo = -1;

  const mostrarValor = () => {
    input.value = valor ? textoDe(valor) : '';
    const cor = corDe && valor ? corDe(valor) : '';
    cb.classList.toggle('com-tipo', !!cor);
    cb.style.setProperty('--t', cor || 'transparent');
  };
  const fechar = () => { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); ativo = -1; };
  const desenhar = () => {
    const q = tid(input.value === (valor ? textoDe(valor) : '') ? '' : input.value);
    const todas = opcoes();
    let achadas = todas;
    if (q) {
      achadas = todas.map((o) => {
        const a = tid(o.nome), b = tid(o.pt || '');
        const r = a.startsWith(q) ? 0 : b.startsWith(q) ? 1 : a.includes(q) ? 2 : b.includes(q) ? 3 : o.num && String(o.num) === q ? 0 : 9;
        return [r, o];
      }).filter(([r]) => r < 9).sort((x, y) => x[0] - y[0] || (x[1].ordem ?? 0) - (y[1].ordem ?? 0)).map(([, o]) => o);
    }
    itens = achadas.slice(0, 120);
    let html = '';
    let grupo = null;
    itens.forEach((o, i) => {
      if (o.grupo !== undefined && o.grupo !== grupo) { grupo = o.grupo; if (grupo) html += `<li class="cab-lista" role="presentation">${esc(grupo)}</li>`; }
      html += `<li role="option" id="${id}-o${i}" data-i="${i}" class="${o.motivo ? 'proib' : ''}" aria-disabled="${!!o.motivo}" aria-selected="false" style="--t:${o.cor || '#8d80aa'}">
        ${o.img || '<span class="ponto"></span>'}
        <span><span class="nome">${esc(o.nome)}</span>${o.pt && o.pt !== o.nome ? `<span class="pt">${esc(o.pt)}</span>` : ''}</span>
        <span class="direita">${o.motivo ? `<span class="motivo">${esc(o.motivo)}</span>` : o.direita || ''}</span></li>`;
    });
    if (!itens.length) html = `<li class="vazio-l">Nada encontrado</li>`;
    lista.innerHTML = html;
    lista.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    ativo = itens.findIndex((o) => !o.motivo);
    marcar();
  };
  const marcar = () => {
    lista.querySelectorAll('[role=option]').forEach((li) => li.setAttribute('aria-selected', String(+li.dataset.i === ativo)));
    const li = lista.querySelector(`[data-i="${ativo}"]`);
    if (li) { li.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', li.id); }
  };
  const escolher = (i) => {
    const o = itens[i];
    if (!o) return;
    if (o.motivo) { toast(`${o.nome}: ${o.motivo}`); return; }
    valor = o.id;
    mostrarValor();
    fechar();
    aoEscolher(o.id);
  };

  input.addEventListener('focus', () => { input.select(); desenhar(); });
  input.addEventListener('input', desenhar);
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!input.value.trim() && valor) { valor = ''; aoEscolher(''); }
      mostrarValor();
      fechar();
    }, 120);
  });
  input.addEventListener('keydown', (ev) => {
    if (lista.hidden && (ev.key === 'ArrowDown' || ev.key === 'Enter')) { desenhar(); ev.preventDefault(); return; }
    const passo = (d) => { let n = ativo; do { n += d; } while (itens[n] && itens[n].motivo); if (itens[n]) { ativo = n; marcar(); } };
    if (ev.key === 'ArrowDown') { passo(1); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { passo(-1); ev.preventDefault(); }
    else if (ev.key === 'Enter') { escolher(ativo); ev.preventDefault(); }
    else if (ev.key === 'Escape') { mostrarValor(); fechar(); }
  });
  lista.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    const li = ev.target.closest('[role=option]');
    if (li) escolher(+li.dataset.i);
  });

  return {
    el: campo,
    set(v) { valor = v || ''; mostrarValor(); },
    msg(texto, tipo) {
      campo.classList.remove('erro', 'aviso', 'ok');
      if (tipo) campo.classList.add(tipo);
      $('.msg', campo).textContent = texto || '';
    },
  };
}

// ---------------------------------------------------------------- opções das buscas
let cacheOpPk;
function opcoesPokemon() {
  if (!cacheOpPk) {
    cacheOpPk = ctx.dados.pokemon.map((o, i) => ({
      id: o.k, nome: o.n, num: o.num, ordem: i, motivo: motivoPokemon(ctx, o),
      img: `<img class="mini" src="https://play.pokemonshowdown.com/sprites/gen5/${esc(o.spr)}.png" loading="lazy" onerror="this.onerror=null;this.src='https://play.pokemonshowdown.com/sprites/gen5/${esc(o.sp)}.png'" alt="">`,
      direita: `#${o.num} · ${o.tp.map(tipoNome).join('/')}`, cor: tipoCor(o.tp[0]),
    }));
  }
  return cacheOpPk;
}
let cacheOpItem;
function opcoesItem() {
  if (!cacheOpItem) {
    const cat = { mega: 'Pedra Mega', z: 'Cristal Z', berry: 'Berry', item: '' };
    cacheOpItem = [{ id: '', nome: '(sem item)', ordem: -1 }, ...ctx.dados.itens.map((it, i) => ({
      id: it.id, nome: it.n, pt: it.pt, ordem: i, motivo: motivoItem(ctx, it.id), direita: cat[it.cat] || '',
    }))];
  }
  return cacheOpItem;
}
function opcoesNatureza() {
  return ctx.dados.naturezas.map((n, i) => ({ id: n.id, nome: n.n, pt: n.pt, ordem: i, direita: n.mais ? `+${n.mais} −${n.menos}` : 'neutra' }));
}
function opcoesGolpe(slotI) {
  const o = ctx.pk.get(estado.time[slotI].pk);
  const fora = ctx.ficha.golpeForaDaLista !== 'erro';
  const fazer = (g, grupo, ordem) => ({
    id: g.id, nome: g.n, pt: g.pt, grupo, ordem, cor: tipoCor(g.t), motivo: motivoGolpe(ctx, g.id),
    direita: `${tipoNome(g.t)} · ${CATEGORIA[g.c] || g.c}${g.p ? ` · ${g.p}` : ''}`,
  });
  if (!o) return ctx.dados.golpes.map((g, i) => fazer(g, undefined, i));
  const sabe = [], resto = [];
  ctx.dados.golpes.forEach((g) => (aprende(ctx, o, g.id) ? sabe : resto).push(g));
  const lista = sabe.map((g, i) => fazer(g, `Golpes do ${o.n}`, i));
  if (fora) lista.push(...resto.map((g, i) => fazer(g, 'Fora da lista do Cobblemon (a staff confere)', 10000 + i)));
  return lista;
}

// ---------------------------------------------------------------- cabeçalho + regulamento
function desenharTopo(total) {
  const R = ctx.regras;
  const aberta = inscricoesAbertas(R);
  document.title = `${R.nome} · Torneios de Astrea`;
  $('#topo').innerHTML = `<div>
      <div class="eyebrow">Servidor Astrea · Cobblemon</div>
      <h1>${esc(R.nome)}</h1>
      <p class="sub">${esc(R.subtitulo || '')}</p>
      <div class="chips">${(R.resumo || []).map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
    </div>
    <div class="estado">
      <span class="selo ${aberta ? 'aberta' : 'fechada'}">${aberta ? 'Inscrições abertas' : 'Inscrições fechadas'}</span>
      ${total != null ? `<div><b>${total}</b><br><small>${total === 1 ? 'treinador inscrito' : 'treinadores inscritos'}</small></div>` : ''}
      ${aberta && R.inscricoes?.fechaEm ? `<small>até ${esc(new Date(R.inscricoes.fechaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</small>` : ''}
    </div>`;
}

function desenharRegulamento() {
  const R = ctx.regras;
  const nomeTag = (n) => {
    const id = tid(n);
    const pt = ctx.golpe.get(id)?.pt || ctx.hab.get(id)?.pt || ctx.item.get(id)?.pt;
    return `<span class="tag" ${pt && pt !== n ? `title="${esc(pt)}"` : ''}>${esc(n)}</span>`;
  };
  const tags = (lista) => `<div class="tags">${lista.map(nomeTag).join('')}</div>`;
  const auto = {
    mega(sec) {
      const M = R.mega || {};
      const itens = [...(sec.itens || [])];
      if (M.liberada === false) itens.unshift('**Mega desligada neste torneio.**');
      else {
        if (M.apenasClassicas) itens.push('**Só as Megas clássicas.** As Megas novas (Legends Z-A, inclusive as "Z") estão proibidas.');
        if (M.habilidadeProibidaBloqueia !== false) itens.push('Mega com habilidade proibida também é proibida.');
      }
      return `<ul>${itens.map((t) => `<li>${negrito(t)}</li>`).join('')}</ul>
        ${M.liberada !== false && (M.proibidas || []).length ? `<div class="tabela"><div class="linha-t"><span>Megas proibidas</span>${tags(M.proibidas)}</div></div>` : ''}`;
    },
    pokemon() {
      const P = R.pokemon || {};
      const linhas = (P.gruposProibidos || []).map((g) => `<div class="linha-t"><span>${esc(nomeGrupo(g))}</span><span>${esc(P.notaGrupos?.[g] || 'Todos.')}</span></div>`);
      if ((P.proibidos || []).length) {
        linhas.push(`<div class="linha-t"><span>Outros</span>${tags(P.proibidos.map((e) => (typeof e === 'string' ? e : e.texto || `${e.nome}${e.forma ? ` (${e.forma})` : ''}`)))}</div>`);
      }
      if ((P.liberados || []).length) {
        linhas.push(`<div class="linha-t"><span>Liberados</span><div class="tags">${P.liberados.map((e) => `<span class="tag livre">${esc(typeof e === 'string' ? e : e.texto || e.nome)}</span>`).join('')}</div></div>`);
      }
      return `${P.notaLinha ? `<p class="nota">${esc(P.notaLinha)}</p>` : ''}${linhas.length ? `<div class="tabela">${linhas.join('')}</div>` : '<p class="nota">Nenhum.</p>'}`;
    },
    habilidades() { const l = R.habilidades?.proibidas || []; return l.length ? tags(l) : '<p class="nota">Nenhuma.</p>'; },
    golpes() {
      const G = Object.entries(R.golpes?.proibidos || {});
      return G.length ? `<div class="tabela">${G.map(([c, l]) => `<div class="linha-t"><span>${esc(c)}</span>${tags(l)}</div>`).join('')}</div>` : '<p class="nota">Nenhum.</p>';
    },
    itens() {
      const I = R.itens || {};
      return `${(I.proibidos || []).length ? tags(I.proibidos) : '<p class="nota">Nenhum.</p>'}${I.nota ? `<p class="nota">${esc(I.nota)}</p>` : ''}`;
    },
  };
  const secoes = (R.regulamento || []).map((s, i) => `<article class="regra"><h3><span class="num">${i + 1}.</span> ${esc(s.titulo)}</h3>
      ${s.auto && auto[s.auto] ? auto[s.auto](s) : `<ul>${(s.itens || []).map((t) => `<li>${negrito(t)}</li>`).join('')}</ul>`}</article>`).join('');
  $('#regulamento').innerHTML = `
    ${(R.premios || []).length ? `<section class="bloco" style="--c:var(--lenda)"><h2>Prêmios</h2>
      <div class="premios">${R.premios.map((p) => `<div class="premio ${esc(p.cor || 'eter')}"><span>${esc(p.lugar)}</span><b>${esc(p.valor)}</b></div>`).join('')}</div>
      ${R.premiosNota ? `<p class="nota">${esc(R.premiosNota)}</p>` : ''}</section>` : ''}
    <section class="bloco" style="--c:var(--visao)"><h2>Regulamento</h2><div class="regras">${secoes}</div>
      ${R.despedida ? `<div class="despedida">${esc(R.despedida)}</div>` : ''}
      <div class="linha-botoes"><button class="btn principal" data-ir="ficha">Fazer minha inscrição</button></div></section>`;
}

// ---------------------------------------------------------------- ficha
function salvarRascunho() { try { localStorage.setItem(chaveRascunho, JSON.stringify(estado)); } catch {} }

function montarFicha() {
  const R = ctx.regras;
  chaveRascunho = `astrea-torneio:${R.id}:rascunho`;
  try { estado = JSON.parse(localStorage.getItem(chaveRascunho)); } catch {}
  if (!estado || !Array.isArray(estado.time)) estado = { campos: {}, time: [], aceites: [] };
  while (estado.time.length < ctx.ficha.tamanho) estado.time.push(vazioSlot());
  estado.time.length = ctx.ficha.tamanho;
  estado.time.forEach((s) => { s.golpes = [...(s.golpes || []), '', '', '', ''].slice(0, ctx.ficha.golpesMax); });

  const ficha = $('#ficha');
  if (!inscricoesAbertas(R)) {
    ficha.innerHTML = `<section class="bloco" style="--c:var(--erro)"><h2>Inscrições fechadas</h2><p class="nota">${esc(R.inscricoes?.avisoFechada || 'As inscrições estão fechadas.')}</p></section>`;
    $('#barra').hidden = true;
    return;
  }
  ficha.innerHTML = `
    <section class="bloco"><h2>Treinador</h2><div class="campos" id="campos"></div></section>
    <section class="bloco" style="--c:var(--visao)">
      <h2>Seu time <span class="n">${ctx.ficha.tamanho} Pokémon · nível ${esc(R.nivel || 50)}</span></h2>
      <p class="nota">Escolha da lista: o que é proibido já aparece riscado com o motivo. Golpes do Pokémon vêm primeiro. O rascunho fica salvo neste navegador.</p>
      <div class="linha-botoes"><button class="btn peq" id="importar">Colar time do Showdown</button><button class="btn peq perigo" id="zerar">Limpar tudo</button></div>
      <div class="time" id="time"></div>
    </section>
    <section class="bloco"><h2>Confirmação</h2><div class="aceites" id="aceites"></div>
      <p class="nota">O time não muda depois de inscrito. Só a ordem pode mudar antes de cada partida.</p></section>`;

  // campos do treinador
  const campos = $('#campos');
  for (const c of R.campos || []) {
    const d = document.createElement('div');
    d.className = 'campo';
    d.dataset.campo = c.id;
    d.innerHTML = `<label class="rot" for="f-${esc(c.id)}">${esc(c.rotulo)}${c.dica ? `<em>${esc(c.dica)}</em>` : ''}</label>
      <input class="entrada" id="f-${esc(c.id)}" maxlength="${c.max || 80}" autocomplete="off" value="${esc(estado.campos[c.id] || '')}"><small class="msg"></small>`;
    $('input', d).addEventListener('input', (ev) => { estado.campos[c.id] = ev.target.value; atualizar(); });
    campos.append(d);
  }
  // aceites
  $('#aceites').innerHTML = (R.aceites || []).map((t, i) => `<label class="check" data-campo="aceite${i}"><input type="checkbox" data-i="${i}" ${estado.aceites[i] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('');
  $('#aceites').addEventListener('change', (ev) => { estado.aceites[+ev.target.dataset.i] = ev.target.checked; atualizar(); });

  const time = $('#time');
  estado.time.forEach((_, i) => time.append(montarSlot(i)));
  $('#importar').addEventListener('click', abrirImportar);
  $('#zerar').addEventListener('click', () => {
    if (!confirm('Apagar o time inteiro do rascunho?')) return;
    estado.time = estado.time.map(vazioSlot);
    slots.forEach((s, i) => s.preencher(estado.time[i]));
    atualizar();
  });
  atualizar();
}

function montarSlot(i) {
  const el = document.createElement('article');
  el.className = 'slot';
  el.innerHTML = `<button class="limpar" type="button" title="Limpar este Pokémon">limpar</button>
    <div class="slot-cab"><div class="retrato"><span class="numero">${i + 1}</span><span class="img"></span><span class="marca"></span></div><div class="cab-dir"></div></div>
    <div class="grade2 g1"></div>
    <div class="campo" data-c="hab"><span class="rot">Habilidade</span><div class="habs"></div><small class="msg"></small></div>
    <div class="golpes"></div>`;
  const s = estado.time[i];
  const pk = caixaBusca({
    rotulo: `Pokémon ${i + 1}`, placeholder: 'Nome ou número da Dex…', opcoes: opcoesPokemon,
    textoDe: (k) => ctx.pk.get(k)?.n || k, corDe: (k) => tipoCor(ctx.pk.get(k)?.tp[0]),
    aoEscolher: (k) => {
      const t = estado.time[i];
      if (t.pk === k) return;
      t.pk = k;
      const o = ctx.pk.get(k);
      if (o && t.hab && ![...o.h, ...o.ho].includes(t.hab)) t.hab = '';
      if (o && !t.hab) t.hab = [...o.h, ...o.ho].find((h) => !motivoHabilidade(ctx, h)) || '';
      api.preencher(t);
      atualizar();
    },
  });
  const tiposEl = document.createElement('div');
  tiposEl.className = 'tipos';
  $('.cab-dir', el).append(pk.el, tiposEl);
  const item = caixaBusca({ rotulo: 'Item', placeholder: 'Item segurado…', opcoes: opcoesItem, textoDe: (id) => ctx.item.get(id)?.n || id,
    aoEscolher: (id) => { estado.time[i].item = id; atualizar(); } });
  const nat = caixaBusca({ rotulo: 'Natureza', placeholder: 'Natureza…', opcoes: opcoesNatureza, textoDe: (id) => ctx.nat.get(id)?.n || id,
    aoEscolher: (id) => { estado.time[i].nat = id; atualizar(); } });
  $('.g1', el).append(item.el, nat.el);
  const golpes = s.golpes.map((_, j) => {
    const g = caixaBusca({ rotulo: `Golpe ${j + 1}`, placeholder: 'Golpe…', opcoes: () => opcoesGolpe(i), textoDe: (id) => ctx.golpe.get(id)?.n || id,
      corDe: (id) => tipoCor(ctx.golpe.get(id)?.t), aoEscolher: (id) => { estado.time[i].golpes[j] = id; atualizar(); } });
    $('.golpes', el).append(g.el);
    return g;
  });
  const habs = $('.habs', el);
  habs.addEventListener('click', (ev) => {
    const b = ev.target.closest('.hab');
    if (!b) return;
    if (b.classList.contains('proib')) { toast(`${b.dataset.nome}: habilidade proibida`); return; }
    estado.time[i].hab = b.dataset.id;
    desenharHabs();
    atualizar();
  });
  const desenharHabs = () => {
    const t = estado.time[i];
    const o = ctx.pk.get(t.pk);
    if (!o) { habs.innerHTML = '<span class="dica">Escolha o Pokémon primeiro</span>'; return; }
    habs.innerHTML = [...o.h.map((h) => [h, false]), ...o.ho.map((h) => [h, true])].map(([h, oculta]) => {
      const info = ctx.hab.get(h) || { n: h, pt: h };
      const ruim = motivoHabilidade(ctx, h);
      return `<button type="button" class="hab ${ruim ? 'proib' : ''}" data-id="${esc(h)}" data-nome="${esc(info.n)}" aria-pressed="${t.hab === h}" title="${esc(info.pt)}${ruim ? ' · proibida' : ''}">${esc(info.n)}${oculta ? '<small>oculta</small>' : ''}</button>`;
    }).join('');
  };
  $('.limpar', el).addEventListener('click', () => { estado.time[i] = vazioSlot(); api.preencher(estado.time[i]); atualizar(); });

  const api = {
    el, pk, item, nat, golpes,
    preencher(t) {
      const o = ctx.pk.get(t.pk);
      pk.set(t.pk); item.set(t.item); nat.set(t.nat);
      golpes.forEach((g, j) => g.set(t.golpes[j]));
      $('.img', el).innerHTML = spriteHtml(o);
      el.style.setProperty('--c', o ? tipoCor(o.tp[0]) : '#8d80aa');
      tiposEl.innerHTML = o ? o.tp.map((x) => `<span class="tipo" style="--t:${tipoCor(x)}">${esc(tipoNome(x))}</span>`).join('') : '';
      desenharHabs();
    },
    habMsg(texto, tipo) {
      const c = $('[data-c="hab"]', el);
      c.classList.remove('erro', 'aviso');
      if (tipo) c.classList.add(tipo);
      $('.msg', c).textContent = texto || '';
    },
  };
  api.preencher(s);
  slots[i] = api;
  return el;
}

let ultimo = { erros: [], avisos: [] };
function atualizar() {
  salvarRascunho();
  const r = validar(ctx, estado);
  ultimo = r;
  // quais slots o jogador já mexeu (não grita "escolha o Pokémon" em slot vazio que ele nem tocou)
  const mexido = (s) => s.pk || s.item || s.nat || s.golpes.some(Boolean);
  slots.forEach((sl, i) => {
    const t = estado.time[i];
    const daqui = (campo) => r.erros.filter((e) => e.onde === i && e.campo === campo);
    const aviso = (campo) => r.avisos.filter((e) => e.onde === i && e.campo === campo);
    const por = (comp, campo) => {
      const e = daqui(campo), a = aviso(campo);
      if (e.length && (mexido(t) || campo === 'pk' && t.pk)) comp.msg(e.map((x) => x.msg).join(' · '), 'erro');
      else if (a.length) comp.msg(a.map((x) => x.msg).join(' · '), 'aviso');
      else comp.msg('', (campo === 'pk' ? t.pk : campo === 'item' ? t.item : t.nat) ? 'ok' : '');
    };
    if (t.pk || mexido(t)) { por(sl.pk, 'pk'); por(sl.item, 'item'); por(sl.nat, 'nat'); }
    else { sl.pk.msg(''); sl.item.msg(''); sl.nat.msg(''); }
    sl.golpes.forEach((g, j) => {
      const e = daqui(`golpe${j}`), a = aviso(`golpe${j}`);
      if (e.length) g.msg(e[0].msg, 'erro'); else if (a.length) g.msg(a[0].msg, 'aviso'); else g.msg('', t.golpes[j] ? 'ok' : '');
    });
    const eh = daqui('hab'), eg = daqui('golpes');
    if (t.pk && eh.length) sl.habMsg(eh[0].msg, 'erro');
    else if (t.pk && eg.length && mexido(t)) sl.habMsg(eg[0].msg, 'erro');
    else sl.habMsg('');
    const nErros = r.erros.filter((e) => e.onde === i).length;
    sl.el.classList.toggle('tem-erro', !!t.pk && nErros > 0);
    sl.el.classList.toggle('pronto', !!t.pk && nErros === 0);
    $('.marca', sl.el).textContent = !t.pk ? '' : nErros ? '!' : '✓';
  });
  // campos do treinador
  document.querySelectorAll('#campos .campo').forEach((d) => {
    const e = r.erros.find((x) => x.onde === 'ficha' && x.campo === d.dataset.campo);
    const v = (estado.campos[d.dataset.campo] || '').trim();
    d.classList.remove('erro', 'ok');
    if (e && v) { d.classList.add('erro'); $('.msg', d).textContent = e.msg; }
    else { $('.msg', d).textContent = ''; if (v && !e) d.classList.add('ok'); }
  });
  // barra de baixo
  const prontos = estado.time.map((t, i) => t.pk && !r.erros.some((e) => e.onde === i));
  $('#progresso').innerHTML = estado.time.map((t, i) => `<i class="${prontos[i] ? 'ok' : t.pk ? 'ruim' : ''}" title="Pokémon ${i + 1}"></i>`).join('');
  const n = r.erros.length;
  $('#resumo-envio').innerHTML = n
    ? `<b class="ruim">${n} ${n === 1 ? 'coisa' : 'coisas'} pra resolver</b> · <a href="#" id="ver-prob">ver a primeira</a>`
    : `<b class="bom">Tudo certo!</b> ${r.avisos.length ? `· ${r.avisos.length} aviso${r.avisos.length > 1 ? 's' : ''} pra staff conferir` : 'Pode enviar.'}`;
  $('#enviar').disabled = n > 0;
  const ver = $('#ver-prob');
  if (ver) ver.addEventListener('click', (ev) => { ev.preventDefault(); irParaProblema(r.erros[0]); });
}

function irParaProblema(e) {
  if (!e) return;
  let alvo;
  if (e.onde === 'ficha') alvo = document.querySelector(`[data-campo="${e.campo}"]`) || $('#campos');
  else alvo = slots[e.onde]?.el;
  alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast(e.msg, 3200);
}

// ---------------------------------------------------------------- importar texto do Showdown
function abrirImportar() {
  const m = modal(`<h2>Colar time do Showdown</h2>
    <p class="nota">Cole o time exportado (Pokémon Showdown ou parecido). O que não for reconhecido fica em branco pra você escolher.</p>
    <textarea class="entrada" id="txt-import" placeholder="Charizard @ Charizardite Y&#10;Ability: Blaze&#10;Timid Nature&#10;- Flamethrower&#10;- Solar Beam"></textarea>
    <div class="linha-botoes"><button class="btn principal" id="ok-import">Importar</button><button class="btn" data-fechar>Cancelar</button></div>`);
  $('#ok-import', m).addEventListener('click', () => {
    const txt = $('#txt-import', m).value;
    const achar = (mapa, nome) => {
      const q = tid(nome);
      for (const [id, v] of mapa) if (id === q || tid(v.n) === q || tid(v.pt) === q) return id;
      return '';
    };
    const pkPorNome = (nome) => {
      const q = tid(nome.replace(/\(.*?\)/g, (x) => (/(m|f)\)$/i.test(x) ? '' : x)));
      const o = ctx.dados.pokemon.find((o) => tid(o.n) === q || tid(o.k) === q || tid(o.spr) === q) || ctx.dados.pokemon.find((o) => !o.fo && tid(o.n) === tid(nome.split(/[(@]/)[0]));
      return o?.k || '';
    };
    const blocos = txt.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean).slice(0, ctx.ficha.tamanho);
    if (!blocos.length) { toast('Nada pra importar'); return; }
    blocos.forEach((b, i) => {
      const linhas = b.split(/\r?\n/).map((l) => l.trim());
      const [cab, itemTxt] = linhas[0].split('@').map((x) => x.trim());
      const t = vazioSlot();
      let nomePk = cab;
      const apelido = cab.match(/^(.*)\((.+?)\)\s*(\((M|F)\))?$/);
      if (apelido && !/^(M|F)$/.test(apelido[2])) nomePk = apelido[2];
      t.pk = pkPorNome(nomePk);
      if (itemTxt) t.item = achar(ctx.item, itemTxt);
      let gi = 0;
      for (const l of linhas.slice(1)) {
        if (/^ability:/i.test(l)) t.hab = achar(ctx.hab, l.split(':')[1]);
        else if (/nature$/i.test(l)) t.nat = achar(ctx.nat, l.replace(/nature$/i, ''));
        else if (/^-/.test(l) && gi < ctx.ficha.golpesMax) t.golpes[gi++] = achar(ctx.golpe, l.replace(/^-\s*/, '').split('/')[0]);
      }
      estado.time[i] = t;
      slots[i].preencher(t);
    });
    atualizar();
    m.remove();
    toast(`${blocos.length} Pokémon importado${blocos.length > 1 ? 's' : ''}. Confira os avisos.`);
  });
}

function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="caixa" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener('click', (ev) => { if (ev.target === m || ev.target.closest('[data-fechar]')) m.remove(); });
  document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { m.remove(); document.removeEventListener('keydown', esc); } });
  document.body.append(m);
  m.querySelector('button, input, textarea')?.focus();
  return m;
}

// ---------------------------------------------------------------- envio
async function enviar() {
  if (ultimo.erros.length) { irParaProblema(ultimo.erros[0]); return; }
  const b = $('#enviar');
  b.disabled = true;
  b.textContent = 'Enviando…';
  try {
    const r = await fetch(`${API}/api/inscricao`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ torneio: ctx.regras.id, ...estado }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      if (j.erros?.length) { irParaProblema(j.erros[0]); }
      modal(`<h2>Não deu pra enviar</h2><p>${esc(j.msg || `Erro ${r.status}. Tente de novo em instantes.`)}</p>
        ${j.erros?.length ? `<ul class="problemas">${j.erros.map((e) => `<li>${esc(e.onde === 'ficha' ? '' : `Pokémon ${e.onde + 1}: `)}${esc(e.msg)}</li>`).join('')}</ul>` : ''}
        <div class="linha-botoes"><button class="btn" data-fechar>Fechar</button></div>`);
      return;
    }
    try { localStorage.setItem(`astrea-torneio:${ctx.regras.id}:feita`, JSON.stringify({ nick: estado.campos.nick, codigo: j.codigo })); } catch {}
    const m = modal(`<h2>Inscrição enviada!</h2>
      <p>Pronto, <b>${esc(estado.campos.nick)}</b>! A staff vai conferir e aprovar. Guarde o seu código pra consultar a inscrição:</p>
      <div class="codigo">${esc(j.codigo)}</div>
      ${miniTime(ctx, estado.time)}
      <div class="linha-botoes"><button class="btn" id="cp-cod">Copiar código</button><button class="btn" id="cp-time">Copiar time (texto)</button><button class="btn principal" data-fechar>Fechar</button></div>`);
    $('#cp-cod', m).addEventListener('click', () => copiar(j.codigo));
    $('#cp-time', m).addEventListener('click', () => copiar(timeEmTexto(ctx, estado.time)));
    contarInscritos();
  } catch (e) {
    modal(`<h2>Sem conexão</h2><p>Não consegui falar com o servidor de inscrições. Seu rascunho está salvo: tente de novo daqui a pouco.</p><div class="linha-botoes"><button class="btn" data-fechar>Fechar</button></div>`);
  } finally {
    b.textContent = 'Enviar inscrição';
    b.disabled = ultimo.erros.length > 0;
  }
}

// ---------------------------------------------------------------- consulta
function montarConsulta() {
  let feita = null;
  try { feita = JSON.parse(localStorage.getItem(`astrea-torneio:${ctx.regras.id}:feita`)); } catch {}
  $('#consulta').innerHTML = `<section class="bloco" style="--c:var(--pressagio)"><h2>Minha inscrição</h2>
    <p class="nota">Coloque seu nick e o código que apareceu quando você se inscreveu.</p>
    <form class="campos" id="f-consulta">
      <div class="campo"><label class="rot" for="c-nick">Nick no Minecraft</label><input class="entrada" id="c-nick" value="${esc(feita?.nick || '')}" autocomplete="off"></div>
      <div class="campo"><label class="rot" for="c-cod">Código</label><input class="entrada" id="c-cod" value="${esc(feita?.codigo || '')}" autocomplete="off" style="text-transform:uppercase"></div>
      <div class="campo" style="align-content:end"><button class="btn principal">Consultar</button></div>
    </form><div id="res-consulta"></div></section>`;
  $('#f-consulta').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const out = $('#res-consulta');
    out.innerHTML = '<p class="nota">Buscando…</p>';
    try {
      const q = new URLSearchParams({ torneio: ctx.regras.id, nick: $('#c-nick').value.trim(), codigo: $('#c-cod').value.trim().toUpperCase() });
      const r = await fetch(`${API}/api/consulta?${q}`);
      const j = await r.json();
      if (!j.ok) { out.innerHTML = `<p class="problemas" style="list-style:none;padding-left:14px">${esc(j.msg || 'Não encontrada.')}</p>`; return; }
      const st = { pendente: ['Esperando a staff conferir', 'var(--aviso)'], aprovada: ['Aprovada! Você está no torneio', 'var(--ok)'], recusada: ['Recusada', 'var(--erro)'] }[j.inscricao.status] || [j.inscricao.status, 'var(--apagado)'];
      out.innerHTML = `<div style="display:grid;gap:12px"><div class="selo" style="justify-self:start;color:${st[1]};border-color:${st[1]};font:700 15px var(--f-pixel);padding:6px 12px;border:2px solid">${esc(st[0])}</div>
        ${j.inscricao.motivo ? `<p><b>Motivo:</b> ${esc(j.inscricao.motivo)}</p>` : ''}${miniTime(ctx, j.inscricao.time)}</div>`;
    } catch { out.innerHTML = '<p class="nota">Sem conexão com o servidor de inscrições.</p>'; }
  });
}

// ---------------------------------------------------------------- abas
function irPara(aba) {
  document.querySelectorAll('.aba').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
  for (const id of ['regulamento', 'ficha', 'chave', 'consulta']) $('#' + id).hidden = id !== aba;
  $('#barra').hidden = aba !== 'ficha' || !inscricoesAbertas(ctx.regras);
  if (location.hash !== '#' + aba) history.replaceState(null, '', '#' + aba);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function contarInscritos() {
  if (!API) { desenharTopo(null); return; }
  try {
    const j = await fetch(`${API}/api/status?torneio=${encodeURIComponent(ctx.regras.id)}`).then((r) => r.json());
    desenharTopo(j.total ?? null);
  } catch { desenharTopo(null); }
}

// chave pública: só aparece quando a staff cria (só nomes, sem os times)
async function carregarChave() {
  if (!API) return;
  try {
    const j = await fetch(`${API}/api/chave?torneio=${encodeURIComponent(ctx.regras.id)}`).then((r) => r.json());
    if (!j.chave) return;
    document.querySelector('.aba[data-aba="chave"]').hidden = false;
    $('#chave').innerHTML = `<section class="bloco" style="--c:var(--lenda)"><h2>Chave <span class="n">${j.chave.jogadores.length} treinadores</span></h2>
      <p class="nota">Atualizada pela staff conforme as partidas acontecem.${j.atualizado_em ? ` Última mudança: ${esc(new Date(j.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}.` : ''}</p>
      ${desenharChave(j.chave)}</section>`;
  } catch {}
}

async function iniciar() {
  try { ctx = await carregar(); }
  catch (e) { $('#topo').innerHTML = `<div><h1>Ops</h1><p class="sub">Não consegui carregar o regulamento (${esc(e.message)}). Atualize a página.</p></div>`; return; }
  desenharTopo(null);
  desenharRegulamento();
  montarFicha();
  montarConsulta();
  contarInscritos();
  carregarChave();
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ir], .aba'); if (b) irPara(b.dataset.ir || b.dataset.aba); });
  $('#enviar').addEventListener('click', enviar);
  const pelaUrl = () => {
    const h = location.hash.slice(1);
    irPara(['regulamento', 'ficha', 'chave', 'consulta'].includes(h) ? h : 'regulamento');
  };
  window.addEventListener('hashchange', pelaUrl);
  pelaUrl();
}
iniciar();
