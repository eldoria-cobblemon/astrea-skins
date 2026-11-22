// Conferidor das regras do torneio de Astrea.
// O MESMO arquivo roda na página (aviso na hora) e no servidor (Cloudflare Worker), então
// ninguém consegue mandar um time proibido pulando a página.
// As regras vêm de regras.json; a base de Pokémon vem de dados.json (gerada dos mods do servidor).

export const tid = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const GRUPOS = {
  lendario: 'Lendário',
  mitico: 'Mítico',
  ultra_besta: 'Ultra Besta',
  paradoxo: 'Paradoxo',
};
export const nomeGrupo = (g) => GRUPOS[g] || g;

// Tipos Tera (id -> nome em inglês, como o Showdown escreve "Tera Type: ...").
export const TIPOS_TERA = {
  normal: 'Normal', fire: 'Fire', water: 'Water', electric: 'Electric', grass: 'Grass', ice: 'Ice',
  fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic', bug: 'Bug',
  rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy', stellar: 'Stellar',
};

// Nome dos tipos em português (pra mensagem do monotype; o validador roda também no servidor, sem o comum.js).
const TIPO_PT = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta', ice: 'Gelo', fighting: 'Lutador',
  poison: 'Venenoso', ground: 'Terrestre', flying: 'Voador', psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra',
  ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};

// Monotype: os 6 Pokémon precisam ter um tipo em comum (tipo da forma escolhida, não o Tera).
// Devolve os tipos que todo o time tem (ignora slot vazio).
export function tiposEmComum(ctx, time) {
  let comum = null;
  for (const s of time || []) {
    const o = ctx.pk.get(s?.pk);
    if (!o) continue;
    comum = comum ? comum.filter((t) => o.tp.includes(t)) : [...o.tp];
  }
  return comum || [];
}
export function motivoMonotype(ctx, o, tipo) {
  if (!ctx.mono.ativo || !o || !tipo) return null;
  return o.tp.includes(tipo) ? null : `Não é do tipo ${TIPO_PT[tipo] || tipo}`;
}

// Deixa as regras prontas pra consulta rápida e anota nome que não existe na base
// (ajuda quem edita o regras.json a achar erro de digitação).
export function preparar(regras, dados) {
  const ctx = { regras, dados, desconhecidos: [] };
  const R = regras || {};
  ctx.pk = new Map(dados.pokemon.map((o) => [o.k, o]));
  ctx.golpe = new Map(dados.golpes.map((g) => [g.id, g]));
  ctx.golpeIdx = dados.golpes;
  ctx.item = new Map(dados.itens.map((i) => [i.id, i]));
  ctx.hab = new Map(Object.entries(dados.habilidades));
  ctx.nat = new Map(dados.naturezas.map((n) => [n.id, n]));
  const porNome = new Map();
  for (const o of dados.pokemon) {
    if (!o.fo) porNome.set(tid(o.n), o);
    if (!porNome.has(o.sp)) porNome.set(o.sp, o);
  }
  const acharEspecie = (nome) => porNome.get(tid(nome)) || ctx.pk.get(String(nome).toLowerCase());
  const anota = (tipo, nome) => ctx.desconhecidos.push(`${tipo}: ${nome}`);

  // Pokémon proibidos (linha inteira por padrão)
  const P = R.pokemon || {};
  ctx.gruposProibidos = new Set(P.gruposProibidos || []);
  const regraPk = (e) => (typeof e === 'string' ? { nome: e } : e || {});
  const casa = (regra, o) => {
    const base = acharEspecie(regra.nome);
    if (!base) return false;
    if (regra.forma) {
      const f = tid(regra.forma);
      return o.sp === base.sp && (tid(o.fo) === f || o.k === String(regra.forma).toLowerCase() || (f === 'normal' && !o.fo));
    }
    if (regra.so) return o.sp === base.sp;
    return o.fam === base.fam;
  };
  ctx.pkProibidos = (P.proibidos || []).map(regraPk);
  ctx.pkLiberados = (P.liberados || []).map(regraPk);
  for (const r of [...ctx.pkProibidos, ...ctx.pkLiberados]) if (!acharEspecie(r.nome)) anota('Pokémon', r.nome);
  ctx.casaPk = casa;

  // Habilidades
  ctx.habProibidas = new Set();
  for (const n of R.habilidades?.proibidas || []) {
    const id = tid(n);
    if (!ctx.hab.has(id)) anota('Habilidade', n);
    ctx.habProibidas.add(id);
  }

  // Golpes, por categoria
  ctx.golpeProibido = new Map();
  for (const [cat, lista] of Object.entries(R.golpes?.proibidos || {})) {
    for (const n of lista) {
      const id = tid(n);
      if (!ctx.golpe.has(id)) anota('Golpe', n);
      ctx.golpeProibido.set(id, cat);
    }
  }

  // Itens
  ctx.itemProibido = new Set();
  for (const n of R.itens?.proibidos || []) {
    const id = tid(n);
    if (!ctx.item.has(id)) anota('Item', n);
    ctx.itemProibido.add(id);
  }

  // Mega
  const M = R.mega || {};
  ctx.mega = {
    liberada: M.liberada !== false,
    classicas: !!M.apenasClassicas,
    proibidas: new Set((M.proibidas || []).map((n) => {
      const e = acharEspecie(n);
      if (!e) anota('Mega', n);
      return e ? e.sp : tid(n);
    })),
    habBloqueia: M.habilidadeProibidaBloqueia !== false,
  };
  // Tera: com "tera.liberada" a ficha pede o tipo Tera de cada Pokémon
  const T = R.tera || {};
  ctx.tera = { liberada: T.liberada === true, stellar: T.stellar === true };
  ctx.mono = { ativo: R.monotype?.ativo === true };
  ctx.ficha = {
    tamanho: 6, golpesMin: 1, golpesMax: 4, itemObrigatorio: false,
    semEspecieRepetida: true, semItemRepetido: true, golpeForaDaLista: 'aviso',
    ...(R.ficha || {}),
  };
  return ctx;
}

// ---------- motivos (null = pode) ----------

export function motivoPokemon(ctx, o) {
  if (!o) return null;
  if (ctx.pkLiberados.some((r) => ctx.casaPk(r, o))) return null;
  for (const g of o.tag || []) if (ctx.gruposProibidos.has(g)) return `${nomeGrupo(g)}: proibido`;
  const r = ctx.pkProibidos.find((r) => ctx.casaPk(r, o));
  if (r) {
    if (r.motivo) return r.motivo;
    if (r.forma) return 'Esta forma é proibida';
    const base = ctx.dados.pokemon.find((x) => tid(x.n) === tid(r.nome) || x.sp === tid(r.nome));
    if (r.so || !base || base.sp === o.sp) return 'Proibido';
    return `Proibido (linha do ${base.n})`;
  }
  return null;
}

export function motivoTera(ctx, id) {
  if (!id) return null;
  if (!TIPOS_TERA[id]) return 'Tipo Tera inválido';
  if (id === 'stellar' && !ctx.tera.stellar) return 'Tera Stellar proibido';
  return null;
}

export const motivoHabilidade = (ctx, id) => (ctx.habProibidas.has(id) ? 'Habilidade proibida' : null);

export function motivoGolpe(ctx, id) {
  const cat = ctx.golpeProibido.get(id);
  return cat ? `Proibido (${cat})` : null;
}

export function motivoItem(ctx, id) {
  if (!id) return null;
  const it = ctx.item.get(id);
  if (!it) return 'Item desconhecido';
  if (ctx.itemProibido.has(id)) return 'Item proibido';
  if (it.cat === 'z' && ctx.regras.itens?.cristaisZ === false) return 'Cristal Z proibido';
  if (it.cat === 'mega') {
    if (!ctx.mega.liberada) return 'Mega desligada neste torneio';
    if (ctx.mega.classicas && !it.classica) return 'Mega nova (Legends Z-A): só as clássicas';
    for (const alvo of it.mega || []) {
      if (ctx.mega.proibidas.has(alvo.sp)) return 'Pedra de Mega proibida';
      if (ctx.mega.habBloqueia) {
        const h = (alvo.h || []).find((x) => ctx.habProibidas.has(x));
        if (h) return `A Mega tem ${ctx.hab.get(h)?.n || h}, que é proibida`;
      }
    }
  }
  return null;
}

// Golpes que a espécie aprende no Cobblemon (inclui o que veio de pré-evolução).
export function aprende(ctx, o, golpeId) {
  if (!o) return true;
  if (!o._set) o._set = new Set(o.g.map((i) => ctx.golpeIdx[i]?.id));
  return o._set.has(golpeId);
}

// ---------- ficha inteira ----------
// inscricao = { campos: {nick, discord, ...}, tipo (monotype, opcional: sem ele vale o tipo em comum), time: [{pk, item, hab, nat, tera, golpes: [..4]}], aceites: [true, ...] }
// devolve { erros: [{onde, campo, msg}], avisos: [...] }  (onde = índice do Pokémon ou 'ficha')
export function validar(ctx, inscricao) {
  const erros = [];
  const avisos = [];
  const F = ctx.ficha;
  const R = ctx.regras;
  const ins = inscricao || {};
  const campos = ins.campos || {};

  for (const c of R.campos || []) {
    const v = String(campos[c.id] ?? '').trim();
    if (c.obrigatorio && !v) erros.push({ onde: 'ficha', campo: c.id, msg: `Preencha: ${c.rotulo}` });
    else if (v && c.padrao && !new RegExp(c.padrao).test(v)) erros.push({ onde: 'ficha', campo: c.id, msg: c.erroPadrao || `${c.rotulo} inválido` });
    else if (v.length > (c.max || 80)) erros.push({ onde: 'ficha', campo: c.id, msg: `${c.rotulo} muito longo` });
  }

  const time = Array.isArray(ins.time) ? ins.time : [];
  if (time.length !== F.tamanho) erros.push({ onde: 'ficha', campo: 'time', msg: `O time tem que ter ${F.tamanho} Pokémon` });

  const especies = new Map();
  const itens = new Map();
  time.forEach((s, i) => {
    s = s || {};
    const e = (campo, msg) => erros.push({ onde: i, campo, msg });
    const o = ctx.pk.get(s.pk);
    if (!s.pk) { e('pk', 'Escolha o Pokémon'); return; }
    if (!o) { e('pk', 'Pokémon não existe no servidor'); return; }
    const mp = motivoPokemon(ctx, o);
    if (mp) e('pk', `${o.n}: ${mp}`);
    if (F.semEspecieRepetida) {
      if (especies.has(o.sp)) e('pk', `Pokémon repetido (já está no ${especies.get(o.sp) + 1}º)`);
      else especies.set(o.sp, i);
    }

    // habilidade
    if (!s.hab) e('hab', 'Escolha a habilidade');
    else if (![...o.h, ...o.ho].includes(s.hab)) e('hab', `${o.n} não tem essa habilidade`);
    else {
      const mh = motivoHabilidade(ctx, s.hab);
      if (mh) e('hab', `${ctx.hab.get(s.hab)?.n}: ${mh}`);
    }

    // natureza
    if (!s.nat) e('nat', 'Escolha a natureza');
    else if (!ctx.nat.has(s.nat)) e('nat', 'Natureza inválida');

    // item
    if (!s.item) { if (F.itemObrigatorio) e('item', 'Escolha o item'); }
    else {
      const it = ctx.item.get(s.item);
      const mi = motivoItem(ctx, s.item);
      if (mi) e('item', `${it?.n || s.item}: ${mi}`);
      if (F.semItemRepetido) {
        if (itens.has(s.item)) e('item', `Item repetido (já está no ${itens.get(s.item) + 1}º)`);
        else itens.set(s.item, i);
      }
      if (it?.cat === 'mega' && !mi && !(it.mega || []).some((a) => a.sp === o.sp)) {
        avisos.push({ onde: i, campo: 'item', msg: `${it.n} não megaevolui o ${o.n} (vale só como item)` });
      }
    }

    // tipo Tera
    if (ctx.tera.liberada) {
      if (!s.tera) e('tera', 'Escolha o tipo Tera');
      else { const mt = motivoTera(ctx, s.tera); if (mt) e('tera', mt); }
    }

    // golpes
    const golpes = (Array.isArray(s.golpes) ? s.golpes : []).filter(Boolean);
    if (golpes.length < F.golpesMin) e('golpes', F.golpesMin === 1 ? 'Escolha pelo menos 1 golpe' : `Escolha ${F.golpesMin} golpes`);
    if (golpes.length > F.golpesMax) e('golpes', `No máximo ${F.golpesMax} golpes`);
    const vistos = new Set();
    (s.golpes || []).forEach((g, j) => {
      if (!g) return;
      const campo = `golpe${j}`;
      const gg = ctx.golpe.get(g);
      if (!gg) { e(campo, 'Golpe desconhecido'); return; }
      if (vistos.has(g)) e(campo, `${gg.n} repetido`);
      vistos.add(g);
      const mg = motivoGolpe(ctx, g);
      if (mg) e(campo, `${gg.n}: ${mg}`);
      else if (!aprende(ctx, o, g) && F.golpeForaDaLista !== 'desligado') {
        const msg = `${o.n} não aprende ${gg.n} no Cobblemon`;
        if (F.golpeForaDaLista === 'erro') e(campo, msg);
        else avisos.push({ onde: i, campo, msg: `${msg}: a staff vai conferir no jogo` });
      }
    });
  });

  // monotype
  if (ctx.mono.ativo) {
    const tipo = TIPO_PT[ins.tipo] ? ins.tipo : '';
    if (!tipo && ins.tipo) erros.push({ onde: 'ficha', campo: 'tipo', msg: 'Tipo do time inválido' });
    if (tipo) {
      time.forEach((s, i) => {
        const m = motivoMonotype(ctx, ctx.pk.get(s?.pk), tipo);
        if (m) erros.push({ onde: i, campo: 'pk', msg: `${ctx.pk.get(s.pk).n}: ${m}` });
      });
    } else if (time.some((s) => ctx.pk.get(s?.pk)) && !tiposEmComum(ctx, time).length) {
      erros.push({ onde: 'ficha', campo: 'tipo', msg: 'Monotype: os 6 Pokémon precisam ter um tipo em comum' });
    } else if (!ins.tipo) {
      erros.push({ onde: 'ficha', campo: 'tipo', msg: 'Escolha o tipo do time' });
    }
  }

  (R.aceites || []).forEach((txt, i) => {
    if (!(ins.aceites || [])[i]) erros.push({ onde: 'ficha', campo: `aceite${i}`, msg: `Marque: ${txt}` });
  });

  return { erros, avisos };
}

// Time em texto no formato do Showdown (pra copiar e colar).
export function timeEmTexto(ctx, time) {
  return (time || []).map((s) => {
    const o = ctx.pk.get(s.pk);
    if (!o) return '';
    const it = ctx.item.get(s.item);
    const linhas = [`${o.n}${it ? ` @ ${it.n}` : ''}`];
    if (s.hab) linhas.push(`Ability: ${ctx.hab.get(s.hab)?.n || s.hab}`);
    linhas.push(`Level: ${ctx.regras.nivel || 50}`);
    if (s.tera && TIPOS_TERA[s.tera]) linhas.push(`Tera Type: ${TIPOS_TERA[s.tera]}`);
    if (s.nat) linhas.push(`${ctx.nat.get(s.nat)?.n || s.nat} Nature`);
    for (const g of s.golpes || []) if (g) linhas.push(`- ${ctx.golpe.get(g)?.n || g}`);
    return linhas.join('\n');
  }).filter(Boolean).join('\n\n');
}
