// Confere o regras.json antes de subir:  node torneio/checar_regras.mjs   (ou  node checar_regras.mjs  dentro da pasta)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preparar, motivoPokemon, validar } from './validar.js';

const aqui = dirname(fileURLToPath(import.meta.url));
let regras;
try { regras = JSON.parse(readFileSync(join(aqui, 'regras.json'), 'utf8')); }
catch (e) { console.error('regras.json com erro de JSON:', e.message); process.exit(1); }
const dados = JSON.parse(readFileSync(join(aqui, 'dados.json'), 'utf8'));
const ctx = preparar(regras, dados);

let ruim = 0;
if (!regras.id) { console.error('FALTA "id" (cada torneio tem um id próprio)'); ruim++; }
if (!(regras.campos || []).some((c) => c.id === 'nick')) { console.error('FALTA o campo "nick" em "campos"'); ruim++; }
if (ctx.desconhecidos.length) {
  console.warn('Nomes que não existem no servidor (erro de digitação, ou item/golpe que não existe no Cobblemon):');
  for (const d of ctx.desconhecidos) console.warn('  -', d);
}
const barrados = dados.pokemon.filter((o) => motivoPokemon(ctx, o));
const livres = dados.pokemon.length - barrados.length;
console.log(`Torneio: ${regras.id} · ${regras.nome} · inscrições ${regras.inscricoes?.abertas === false ? 'FECHADAS' : 'abertas'}`);
console.log(`Pokémon/formas liberados: ${livres} · barrados: ${barrados.length}`);
const amostra = barrados.filter((o) => !o.tag.length).slice(0, 40).map((o) => o.n);
if (amostra.length) console.log('Barrados por nome/linha:', amostra.join(', '));
const r = validar(ctx, { campos: {}, time: [], aceites: [] });
if (!r.erros.length) { console.error('A ficha vazia passou: tem regra faltando'); ruim++; }
console.log(ruim ? `\n${ruim} problema(s).` : '\nOK, pode subir.');
process.exit(ruim ? 1 : 0);
