// Markdown do Discord -> HTML da prévia (o mesmo jeito que o Discord desenha).
// ctx: { cargo(id) -> {nome, cor}, canal(id) -> {nome}, emoji(id, animado) -> url }

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const FMT_HORA = {
  t: { hour: '2-digit', minute: '2-digit' },
  T: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  d: { day: '2-digit', month: '2-digit', year: 'numeric' },
  D: { day: 'numeric', month: 'long', year: 'numeric' },
  f: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  F: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};
export function relativo(seg) {
  const d = seg * 1000 - Date.now();
  const abs = Math.abs(d);
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const passos = [
    [60e3, 1e3, 'second'],
    [3600e3, 60e3, 'minute'],
    [86400e3, 3600e3, 'hour'],
    [2592e6, 86400e3, 'day'],
    [31536e6, 2592e6, 'month'],
    [Infinity, 31536e6, 'year'],
  ];
  for (const [ate, div, un] of passos) if (abs < ate) return rtf.format(Math.round(d / div), un);
  return '';
}
export function horario(seg, f = 'f') {
  const dt = new Date(seg * 1000);
  if (f === 'R') return relativo(seg);
  return dt.toLocaleString('pt-BR', FMT_HORA[f] || FMT_HORA.f);
}

function hexA(cor, a) {
  const n = parseInt(cor.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- inline ---
function inline(txt, ctx) {
  const guardados = [];
  const guarda = (html) => `\u0000${guardados.push(html) - 1}\u0000`;

  // código inline primeiro (nada dentro é formatado)
  txt = txt.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_, __, c) => guarda(`<code class="md-code">${esc(c.trim() ? c : c)}</code>`));

  // menções, emojis e horários
  txt = txt.replace(/<@&(\d+)>/g, (_, id) => {
    const r = ctx.cargo?.(id);
    const cor = r?.cor || '#c9cdfb';
    const bg = r?.cor ? hexA(r.cor, 0.15) : 'rgba(88,101,242,.3)';
    return guarda(`<span class="md-men" style="color:${cor};background:${bg}">@${esc(r?.nome || 'cargo-desconhecido')}</span>`);
  });
  txt = txt.replace(/<@!?(\d+)>/g, () => guarda(`<span class="md-men">@usuário</span>`));
  txt = txt.replace(/@(everyone|here)\b/g, (_, w) => guarda(`<span class="md-men">@${w}</span>`));
  txt = txt.replace(/<#(\d+)>/g, (_, id) => guarda(`<span class="md-men md-canal"># ${esc(ctx.canal?.(id)?.nome || 'canal-desconhecido')}</span>`));
  txt = txt.replace(/<(a?):(\w{2,32}):(\d+)>/g, (_, a, nome, id) => guarda(`<img class="md-emoji" alt=":${esc(nome)}:" title=":${esc(nome)}:" src="${esc(ctx.emoji?.(id, !!a) || '')}">`));
  txt = txt.replace(/<t:(-?\d+)(?::([tTdDfFR]))?>/g, (_, s, f) => guarda(`<span class="md-hora" title="${esc(horario(+s, 'F'))}">${esc(horario(+s, f || 'f'))}</span>`));

  // links [texto](url) e soltos
  txt = txt.replace(/\[([^\]\n]+)\]\(<?(https?:\/\/[^\s)>]+)>?\)/g, (_, t, u) => guarda(`<a class="md-link" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">${inline(t, ctx)}</a>`));
  txt = txt.replace(/<(https?:\/\/[^\s>]+)>/g, (_, u) => guarda(`<a class="md-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`));
  txt = txt.replace(/https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g, (u) => guarda(`<a class="md-link" href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`));

  // escape do resto
  txt = txt.replace(/\\([*_~`|\\<>#\-])/g, (_, c) => guarda(esc(c)));
  txt = esc(txt);

  // formatação (ordem igual à do Discord)
  txt = txt.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="md-spoiler" onclick="this.classList.add(\'aberto\')">$1</span>');
  txt = txt.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  txt = txt.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  txt = txt.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
  txt = txt.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  txt = txt.replace(/(^|[^\w_])_(?!\s)([^_\n]+?)_(?![\w_])/g, '$1<em>$2</em>');
  txt = txt.replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');

  return txt.replace(/\u0000(\d+)\u0000/g, (_, i) => guardados[+i]);
}

// --- blocos ---
export function render(texto, ctx = {}) {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  let lista = null; // {tipo:'ul'|'ol', itens:[{nivel, html}]}

  const fechaLista = () => {
    if (!lista) return;
    let html = '';
    const pilha = [];
    for (const it of lista.itens) {
      while (pilha.length < it.nivel + 1) {
        html += `<${lista.tipo} class="md-lista"${lista.tipo === 'ol' && pilha.length === 0 && lista.inicio > 1 ? ` start="${lista.inicio}"` : ''}>`;
        pilha.push(lista.tipo);
      }
      while (pilha.length > it.nivel + 1) html += `</${pilha.pop()}>`;
      html += `<li>${it.html}</li>`;
    }
    while (pilha.length) html += `</${pilha.pop()}>`;
    out.push(html);
    lista = null;
  };

  while (i < linhas.length) {
    const l = linhas[i];

    // bloco de código
    const cod = l.match(/^```(\w*)\s*$/) || l.match(/^```(\w*)?(.*)$/);
    if (l.startsWith('```')) {
      fechaLista();
      const resto = l.slice(3);
      const fechaNaMesma = resto.indexOf('```');
      if (fechaNaMesma >= 0) {
        out.push(`<pre class="md-pre"><code>${esc(resto.slice(0, fechaNaMesma))}</code></pre>`);
        i++;
        continue;
      }
      const corpo = [];
      const primeira = /^\w*$/.test(resto.trim()) ? '' : resto;
      if (primeira) corpo.push(primeira);
      i++;
      while (i < linhas.length && !linhas[i].includes('```')) corpo.push(linhas[i++]);
      if (i < linhas.length) {
        const antes = linhas[i].split('```')[0];
        if (antes) corpo.push(antes);
        i++;
      }
      out.push(`<pre class="md-pre"><code>${esc(corpo.join('\n'))}</code></pre>`);
      void cod;
      continue;
    }

    // citação de várias linhas (>>> até o fim)
    if (/^>>> ?/.test(l)) {
      fechaLista();
      const resto = [l.replace(/^>>> ?/, ''), ...linhas.slice(i + 1)];
      out.push(`<blockquote class="md-quote">${render(resto.join('\n'), ctx)}</blockquote>`);
      break;
    }
    // citação linha a linha
    if (/^> /.test(l) || l === '>') {
      fechaLista();
      const q = [];
      while (i < linhas.length && (/^> /.test(linhas[i]) || linhas[i] === '>')) q.push(linhas[i++].replace(/^> ?/, ''));
      out.push(`<blockquote class="md-quote">${render(q.join('\n'), ctx)}</blockquote>`);
      continue;
    }

    // títulos e subtexto
    const t = l.match(/^(#{1,3}) (.+)$/);
    if (t) {
      fechaLista();
      out.push(`<div class="md-h${t[1].length}">${inline(t[2], ctx)}</div>`);
      i++;
      continue;
    }
    const sub = l.match(/^-# (.+)$/);
    if (sub) {
      fechaLista();
      out.push(`<div class="md-sub">${inline(sub[1], ctx)}</div>`);
      i++;
      continue;
    }

    // listas
    const li = l.match(/^(\s*)([-*]|\d{1,3}\.) (.+)$/);
    if (li) {
      const tipo = /\d/.test(li[2]) ? 'ol' : 'ul';
      const nivel = Math.min(5, Math.floor(li[1].replace(/\t/g, '  ').length / 2));
      if (!lista || (nivel === 0 && lista.tipo !== tipo)) {
        fechaLista();
        lista = { tipo, itens: [], inicio: tipo === 'ol' ? parseInt(li[2], 10) : 1 };
      }
      lista.itens.push({ nivel, html: inline(li[3], ctx) });
      i++;
      continue;
    }

    fechaLista();
    out.push(l.trim() === '' ? '<div class="md-vazio"></div>' : `<div class="md-linha">${inline(l, ctx)}</div>`);
    i++;
  }
  fechaLista();
  return out.join('');
}
