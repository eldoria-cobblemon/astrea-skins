// Painel da staff: ver, aprovar e recusar inscrições; conferir times na hora da partida.
import { validar, timeEmTexto, tid } from './validar.js';
import { API, carregar, esc, miniTime, toast, copiar, spriteHtml, tipoCor } from './comum.js';

const $ = (s, el = document) => el.querySelector(s);
const CHAVE = 'astrea-torneio:painel';
let ctx;
let senha = '';
let nome = '';
let dados = { inscricoes: [], torneios: [], historico: [], torneio: '' };
let filtro = 'todas';
let busca = '';
let aba = 'inscricoes';

const STATUS = { pendente: ['Pendente', 'var(--aviso)'], aprovada: ['Aprovada', 'var(--ok)'], recusada: ['Recusada', 'var(--erro)'] };
const quando = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function api(caminho, opts = {}) {
  const r = await fetch(`${API}${caminho}`, { ...opts, headers: { 'content-type': 'application/json', authorization: `Bearer ${senha}`, ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({ ok: false, msg: `Erro ${r.status}` }));
  if (r.status === 401) { sair(); throw new Error(j.msg); }
  if (!j.ok) throw new Error(j.msg || 'Erro');
  return j;
}

// ---------------------------------------------------------------- login
function telaEntrar(erro = '') {
  $('#app').innerHTML = `<section class="bloco" style="--c:var(--visao);max-width:440px;margin:40px auto;width:100%">
    <h2>Painel da staff</h2><p class="nota">Só pra Yure e Angela.</p>
    <form id="f-entrar" style="display:grid;gap:12px">
      <div class="campo"><label class="rot" for="senha">Senha</label><input class="entrada" id="senha" type="password" autocomplete="current-password" required></div>
      ${erro ? `<p class="problemas" style="padding-left:14px">${esc(erro)}</p>` : ''}
      <button class="btn principal">Entrar</button></form></section>`;
  $('#senha').focus();
  $('#f-entrar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    senha = $('#senha').value;
    try {
      const j = await api('/api/admin/entrar', { method: 'POST' });
      nome = j.nome;
      try { sessionStorage.setItem(CHAVE, senha); } catch {}
      await recarregar();
    } catch (e) { telaEntrar(e.message); }
  });
}
function sair() { try { sessionStorage.removeItem(CHAVE); } catch {} senha = ''; telaEntrar(); }

// ---------------------------------------------------------------- dados
async function recarregar(torneio = dados.torneio) {
  const q = torneio ? `?torneio=${encodeURIComponent(torneio)}` : '';
  dados = await api(`/api/admin/inscricoes${q}`);
  desenhar();
}

// confere de novo com as regras ATUAIS (pega time que ficou ilegal se a regra mudou depois)
function conferir(ins) {
  const aceites = (ctx.regras.aceites || []).map(() => true);
  const r = validar(ctx, { campos: ins.campos, time: ins.time, aceites });
  const porSlot = {};
  for (const e of r.erros) if (e.onde !== 'ficha') (porSlot[e.onde] ||= { erros: [], avisos: [] }).erros.push(e);
  for (const a of r.avisos) if (a.onde !== 'ficha') (porSlot[a.onde] ||= { erros: [], avisos: [] }).avisos.push(a);
  const erros = r.erros.filter((e) => !(e.onde === 'ficha' && e.campo.startsWith('aceite')));
  return { erros, avisos: r.avisos, porSlot };
}

// ---------------------------------------------------------------- desenho
function desenhar() {
  const lista = dados.inscricoes;
  const conta = (s) => lista.filter((i) => i.status === s).length;
  const outroTorneio = dados.torneio !== ctx.regras.id;
  $('#app').innerHTML = `
    <header class="topo" style="padding:20px 24px">
      <div><div class="eyebrow">Painel da staff · olá, ${esc(nome)}</div><h1 style="font-size:clamp(28px,4vw,44px)">${esc(outroTorneio ? dados.torneio : ctx.regras.nome)}</h1>
        <div class="chips"><span class="chip">${lista.length} inscrições</span><span class="chip" style="color:var(--aviso)">${conta('pendente')} pendentes</span>
        <span class="chip" style="color:var(--ok)">${conta('aprovada')} aprovadas</span><span class="chip" style="color:var(--erro)">${conta('recusada')} recusadas</span></div></div>
      <div class="estado" style="gap:8px">
        <select id="sel-torneio" class="entrada" aria-label="Torneio">${(dados.torneios.some((t) => t.torneio === ctx.regras.id) ? [] : [{ torneio: ctx.regras.id, total: 0 }]).concat(dados.torneios)
          .map((t) => `<option value="${esc(t.torneio)}" ${t.torneio === dados.torneio ? 'selected' : ''}>${esc(t.torneio)} (${t.total})</option>`).join('')}</select>
        <div class="linha-botoes"><button class="btn peq" id="b-recarregar">Atualizar</button><button class="btn peq" id="b-sair">Sair</button></div>
      </div>
    </header>
    ${ctx.desconhecidos.length ? `<div class="problemas avisos" style="padding-left:14px"><b>Nomes do regras.json que não existem no servidor</b> (ou o item não existe no Cobblemon, ou o nome está escrito errado): ${esc(ctx.desconhecidos.join(', '))}</div>` : ''}
    ${outroTorneio ? `<div class="problemas avisos" style="padding-left:14px">Você está vendo um torneio antigo. A conferência usa as regras <b>atuais</b> (${esc(ctx.regras.id)}), então os avisos de regra podem não valer pra ele.</div>` : ''}
    <nav class="abas" role="tablist">
      <button class="aba" data-aba="inscricoes" aria-selected="${aba === 'inscricoes'}" style="--c:var(--eter)">Inscrições</button>
      <button class="aba" data-aba="partida" aria-selected="${aba === 'partida'}" style="--c:var(--visao)">Conferir partida</button>
      <button class="aba" data-aba="historico" aria-selected="${aba === 'historico'}" style="--c:var(--pressagio)">Histórico</button>
    </nav>
    <div id="conteudo"></div>`;
  $('#sel-torneio').addEventListener('change', (ev) => recarregar(ev.target.value).catch((e) => toast(e.message)));
  $('#b-recarregar').addEventListener('click', () => recarregar().then(() => toast('Atualizado')).catch((e) => toast(e.message)));
  $('#b-sair').addEventListener('click', sair);
  document.querySelectorAll('nav .aba').forEach((b) => b.addEventListener('click', () => { aba = b.dataset.aba; desenhar(); }));
  ({ inscricoes: desenharLista, partida: desenharPartida, historico: desenharHistorico })[aba]();
}

function desenharLista() {
  const c = $('#conteudo');
  c.innerHTML = `<section class="bloco">
    <div class="linha-botoes" style="justify-content:space-between">
      <div class="linha-botoes" id="filtros">${[['todas', 'Todas'], ['pendente', 'Pendentes'], ['aprovada', 'Aprovadas'], ['recusada', 'Recusadas'], ['problema', 'Com problema']]
        .map(([k, t]) => `<button class="btn peq" data-f="${k}" style="${filtro === k ? 'border-color:var(--eter);background:#7fe7f22a' : ''}">${t}</button>`).join('')}</div>
      <div class="linha-botoes"><button class="btn peq" id="exp-csv">Baixar planilha (CSV)</button><button class="btn peq" id="exp-txt">Copiar times aprovados</button></div>
    </div>
    <input class="entrada" id="busca" placeholder="Buscar por nick, Discord ou Pokémon…" value="${esc(busca)}">
    <div id="lista" style="display:grid;gap:14px"></div></section>`;
  $('#filtros').addEventListener('click', (ev) => { const b = ev.target.closest('[data-f]'); if (b) { filtro = b.dataset.f; desenharLista(); } });
  $('#busca').addEventListener('input', (ev) => { busca = ev.target.value; desenharCartoes(); });
  $('#exp-csv').addEventListener('click', exportarCsv);
  $('#exp-txt').addEventListener('click', () => {
    const aprov = dados.inscricoes.filter((i) => i.status === 'aprovada');
    if (!aprov.length) { toast('Nenhuma aprovada ainda'); return; }
    copiar(aprov.map((i) => `=== ${i.nick} ===\n${timeEmTexto(ctx, i.time)}`).join('\n\n\n'));
  });
  desenharCartoes();
}

function desenharCartoes() {
  const q = tid(busca);
  const itens = dados.inscricoes.map((i) => ({ i, c: conferir(i) })).filter(({ i, c }) => {
    if (filtro === 'problema' && !c.erros.length && !c.avisos.length && !i.mesmo_ip.length) return false;
    if (!['todas', 'problema'].includes(filtro) && i.status !== filtro) return false;
    if (!q) return true;
    const alvo = tid([i.nick, ...Object.values(i.campos), ...i.time.map((t) => ctx.pk.get(t.pk)?.n || t.pk)].join(' '));
    return alvo.includes(q);
  });
  const l = $('#lista');
  if (!itens.length) { l.innerHTML = '<p class="nota" style="text-align:center;padding:30px 0">Nenhuma inscrição aqui.</p>'; return; }
  l.innerHTML = itens.map(({ i, c }) => {
    const [st, cor] = STATUS[i.status] || [i.status, 'var(--apagado)'];
    const extras = Object.entries(i.campos).filter(([k]) => k !== 'nick').map(([k, v]) => {
      const rot = (ctx.regras.campos || []).find((x) => x.id === k)?.rotulo || k;
      return `<span><span class="rot" style="display:inline">${esc(rot)}:</span> ${esc(v)}</span>`;
    }).join(' · ');
    return `<article class="regra" data-id="${i.id}" style="border-color:color-mix(in srgb, ${cor} 45%, #000);gap:12px">
      <div style="display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between">
        <div style="display:grid;gap:2px;min-width:0">
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font:700 22px var(--f-pixel)">${esc(i.nick)}</b>
            <span class="chip" style="color:${cor};border-color:${cor}">${esc(st)}</span>
            ${c.erros.length ? `<span class="chip" style="color:var(--erro)">${c.erros.length} fora das regras atuais</span>` : ''}
            ${c.avisos.length ? `<span class="chip" style="color:var(--aviso)">${c.avisos.length} aviso${c.avisos.length > 1 ? 's' : ''}</span>` : ''}
            ${i.mesmo_ip.length ? `<span class="chip" style="color:var(--aviso)" title="Mesma rede de: ${esc(i.mesmo_ip.join(', '))}">mesmo IP: ${esc(i.mesmo_ip.join(', '))}</span>` : ''}</div>
          <small style="color:var(--apagado)">${extras} · inscrito ${esc(quando(i.criado_em))} · código ${esc(i.codigo)}${i.revisado_por ? ` · ${esc(st.toLowerCase())} por ${esc(i.revisado_por)} ${esc(quando(i.revisado_em))}` : ''}</small>
        </div>
        <div class="linha-botoes">
          ${i.status !== 'aprovada' ? `<button class="btn peq bom" data-acao="aprovar">Aprovar</button>` : ''}
          ${i.status !== 'recusada' ? `<button class="btn peq perigo" data-acao="recusar">Recusar</button>` : ''}
          ${i.status !== 'pendente' ? `<button class="btn peq" data-acao="pendente">Voltar pra pendente</button>` : ''}
          <button class="btn peq" data-acao="copiar">Copiar time</button>
          <button class="btn peq" data-acao="nota">Nota</button>
          <button class="btn peq perigo" data-acao="apagar" title="Apaga a inscrição (o jogador pode se inscrever de novo)">Apagar</button>
        </div>
      </div>
      ${c.erros.length ? `<ul class="problemas">${c.erros.map((e) => `<li>${e.onde === 'ficha' ? '' : `Pokémon ${e.onde + 1}: `}${esc(e.msg)}</li>`).join('')}</ul>` : ''}
      ${c.avisos.length ? `<ul class="problemas avisos">${c.avisos.map((e) => `<li>${e.onde === 'ficha' ? '' : `Pokémon ${e.onde + 1}: `}${esc(e.msg)}</li>`).join('')}</ul>` : ''}
      ${i.status === 'recusada' && i.motivo ? `<p style="margin:0"><b>Motivo (o jogador vê):</b> ${esc(i.motivo)}</p>` : ''}
      ${i.nota ? `<p style="margin:0;color:var(--apagado)"><b>Nota da staff:</b> ${esc(i.nota)}</p>` : ''}
      ${miniTime(ctx, i.time, c.porSlot)}
    </article>`;
  }).join('');
  l.querySelectorAll('[data-acao]').forEach((b) => b.addEventListener('click', () => agir(+b.closest('[data-id]').dataset.id, b.dataset.acao)));
}

async function agir(id, acao) {
  const ins = dados.inscricoes.find((x) => x.id === id);
  if (!ins) return;
  try {
    if (acao === 'copiar') return copiar(timeEmTexto(ctx, ins.time));
    if (acao === 'aprovar') await api(`/api/admin/inscricao/${id}`, { method: 'POST', body: JSON.stringify({ status: 'aprovada' }) });
    if (acao === 'pendente') await api(`/api/admin/inscricao/${id}`, { method: 'POST', body: JSON.stringify({ status: 'pendente' }) });
    if (acao === 'recusar') {
      const sugestao = conferir(ins).erros.map((e) => e.msg).join('; ');
      const motivo = prompt(`Motivo da recusa de ${ins.nick} (o jogador vê quando consultar):`, ins.motivo || sugestao);
      if (motivo === null) return;
      await api(`/api/admin/inscricao/${id}`, { method: 'POST', body: JSON.stringify({ status: 'recusada', motivo }) });
    }
    if (acao === 'nota') {
      const nota = prompt(`Nota interna sobre ${ins.nick} (só a staff vê):`, ins.nota || '');
      if (nota === null) return;
      await api(`/api/admin/inscricao/${id}`, { method: 'POST', body: JSON.stringify({ nota }) });
    }
    if (acao === 'apagar') {
      if (!confirm(`Apagar a inscrição de ${ins.nick}? Isso não tem volta, e ele poderá se inscrever de novo.`)) return;
      await api(`/api/admin/inscricao/${id}`, { method: 'DELETE' });
    }
    await recarregar();
    toast('Feito');
  } catch (e) { toast(e.message, 4000); }
}

function desenharPartida() {
  const nomes = dados.inscricoes.filter((i) => i.status !== 'recusada').map((i) => i.nick).sort((a, b) => a.localeCompare(b));
  const opcoes = (sel) => `<option value="">Escolha…</option>${nomes.map((n) => `<option ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')}`;
  const a = sessionStorage.getItem('partida:a') || '', b = sessionStorage.getItem('partida:b') || '';
  $('#conteudo').innerHTML = `<section class="bloco" style="--c:var(--visao)">
    <h2>Conferir partida</h2><p class="nota">Escolha os dois jogadores e confira o time de cada um no jogo antes de começar. O time tem que ser igual ao da ficha (só a ordem pode mudar).</p>
    <div class="campos"><div class="campo"><label class="rot" for="pa">Jogador 1</label><select class="entrada" id="pa">${opcoes(a)}</select></div>
      <div class="campo"><label class="rot" for="pb">Jogador 2</label><select class="entrada" id="pb">${opcoes(b)}</select></div></div>
    <div class="time" id="lados"></div></section>`;
  const lado = (nick) => {
    const i = dados.inscricoes.find((x) => x.nick === nick);
    if (!i) return '<div class="regra"><p class="nota">Escolha um jogador.</p></div>';
    const c = conferir(i);
    const [st, cor] = STATUS[i.status];
    return `<div class="regra" style="gap:12px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b style="font:700 24px var(--f-pixel)">${esc(i.nick)}</b><span class="chip" style="color:${cor};border-color:${cor}">${st}</span></div>
      ${c.erros.length ? `<ul class="problemas">${c.erros.map((e) => `<li>${esc(e.msg)}</li>`).join('')}</ul>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap">${i.time.map((t) => { const o = ctx.pk.get(t.pk); return `<div title="${esc(o?.n)}" style="width:72px;height:72px;display:grid;place-items:center;background:#0005;border:2px solid color-mix(in srgb, ${tipoCor(o?.tp[0])} 50%, #000)">${spriteHtml(o).replace('<img ', '<img style="width:66px;height:66px;object-fit:contain" ')}</div>`; }).join('')}</div>
      ${miniTime(ctx, i.time, c.porSlot)}</div>`;
  };
  const pintar = () => {
    sessionStorage.setItem('partida:a', $('#pa').value);
    sessionStorage.setItem('partida:b', $('#pb').value);
    $('#lados').innerHTML = lado($('#pa').value) + lado($('#pb').value);
  };
  $('#pa').addEventListener('change', pintar);
  $('#pb').addEventListener('change', pintar);
  pintar();
}

function desenharHistorico() {
  const h = dados.historico;
  $('#conteudo').innerHTML = `<section class="bloco" style="--c:var(--pressagio)"><h2>Histórico</h2>
    ${h.length ? `<div class="tabela">${h.map((x) => `<div class="linha-t" style="grid-template-columns:150px 1fr"><span style="font:500 14px var(--f-texto);color:var(--apagado)">${esc(quando(x.em))}</span><span><b>${esc(x.quem)}</b> · ${esc(x.nick)} · ${esc(x.acao)}</span></div>`).join('')}</div>` : '<p class="nota">Nada ainda.</p>'}</section>`;
}

function exportarCsv() {
  const campos = (ctx.regras.campos || []).map((c) => c.id);
  const cab = ['status', ...campos, 'codigo', 'inscrito_em'];
  for (let i = 1; i <= ctx.ficha.tamanho; i++) cab.push(`pokemon${i}`, `item${i}`, `habilidade${i}`, `natureza${i}`, `golpes${i}`);
  const cel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = dados.inscricoes.map((i) => {
    const l = [i.status, ...campos.map((c) => i.campos[c]), i.codigo, quando(i.criado_em)];
    for (let k = 0; k < ctx.ficha.tamanho; k++) {
      const t = i.time[k] || {};
      l.push(ctx.pk.get(t.pk)?.n || '', ctx.item.get(t.item)?.n || '', ctx.hab.get(t.hab)?.n || '', ctx.nat.get(t.nat)?.n || '', (t.golpes || []).filter(Boolean).map((g) => ctx.golpe.get(g)?.n || g).join(' / '));
    }
    return l.map(cel).join(';');
  });
  const blob = new Blob(['﻿' + [cab.map(cel).join(';'), ...linhas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inscricoes_${dados.torneio}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function iniciar() {
  try { ctx = await carregar(); } catch (e) { $('#app').innerHTML = `<p class="problemas">Não consegui carregar as regras: ${esc(e.message)}</p>`; return; }
  try { senha = sessionStorage.getItem(CHAVE) || ''; } catch {}
  if (!senha) { telaEntrar(); return; }
  try { nome = (await api('/api/admin/entrar', { method: 'POST' })).nome; await recarregar(); }
  catch (e) { telaEntrar(e.message === 'Senha errada.' ? '' : e.message); }
}
iniciar();
