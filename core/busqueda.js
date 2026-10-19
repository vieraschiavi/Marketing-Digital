// © 2026 Martín Viera. Todos los derechos reservados.
//
// Buscador global y radar de tendencias. Busca en posts propios y de la
// competencia, menciones, marcas y hashtags, con operadores:
//   red:tiktok  pais:UY  ciudad:montevideo  marca:brava  formato:reel
//   sent:negativo  tema:delivery  #hashtag  "frase exacta"
// Todo corre local sobre el dataset cargado (demo o importado).

import { sentimiento } from "./escucha.js";
import { postsFiltrados, normalizarFiltros } from "./filtros.js";
import { pct } from "./metricas.js";
import { GEO } from "./catalogo.js";

const sinTildes = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Separa la consulta en operadores, frases exactas y términos libres. */
export function parsearConsulta(consulta) {
  const ops = {};
  const frases = [];
  let resto = (consulta || "").replace(/"([^"]+)"/g, (_, f) => {
    frases.push(sinTildes(f));
    return " ";
  });
  resto = resto.replace(/\b(red|pais|país|ciudad|marca|formato|sent|tema):(\S+)/gi, (_, k, v) => {
    ops[sinTildes(k).replace("pais", "pais")] = sinTildes(v);
    return " ";
  });
  const terminos = resto.split(/\s+/).map(sinTildes).filter((t) => t.length > 1);
  return { ops, frases, terminos };
}

function coincide(texto, q) {
  const t = sinTildes(texto);
  let score = 0;
  for (const f of q.frases) {
    if (!t.includes(f)) return 0;
    score += 3;
  }
  for (const term of q.terminos) if (t.includes(term)) score += term.startsWith("#") ? 2 : 1;
  return q.terminos.length || q.frases.length ? score : 1;
}

export function buscar(ds, consulta, filtros = {}, limite = 30) {
  const q = parsearConsulta(consulta);
  const f = normalizarFiltros(filtros);
  const marcaPorId = new Map(ds.marcas.map((m) => [m.id, m]));
  const marcaOk = (id) => !q.ops.marca || sinTildes(marcaPorId.get(id)?.nombre).includes(q.ops.marca);
  const paisOp = q.ops.pais ? Object.keys(GEO).find((p) => sinTildes(p) === q.ops.pais || sinTildes(GEO[p].nombre) === q.ops.pais) : null;
  if (paisOp) f.pais = paisOp;
  if (q.ops.ciudad) {
    for (const [p, g] of Object.entries(GEO)) for (const c of Object.keys(g.ciudades)) if (sinTildes(c) === q.ops.ciudad) f.ciudad = `${p}|${c}`;
  }
  if (q.ops.red) f.redes = [q.ops.red];
  if (q.ops.formato) f.formato = q.ops.formato;

  const posts = q.ops.sent ? [] : postsFiltrados(ds, f)
    .filter(({ p }) => marcaOk(p.marca) && (!q.ops.tema || sinTildes(p.tema).includes(q.ops.tema)))
    .map(({ p, w }) => ({ p, w, s: coincide(`${p.texto} ${p.tema} ${p.hashtags.join(" ")}`, q) }))
    .filter((x) => x.s > 0)
    .map(({ p, w, s }) => ({ tipo: "post", ...p, marcaNombre: marcaPorId.get(p.marca)?.nombre, propia: marcaPorId.get(p.marca)?.propia, er: pct(p.interacciones, p.alcance), relevancia: s + Math.log10(p.interacciones * w + 1) }))
    .sort((a, b) => b.relevancia - a.relevancia)
    .slice(0, limite);

  const menciones = ds.menciones
    .filter((m) => (!f.redes || f.redes.includes(m.red)) && (!f.pais || m.pais === f.pais) && (!f.ciudad || m.ciudad === f.ciudad) && marcaOk(m.marca) && (!q.ops.tema || sinTildes(m.tema).includes(q.ops.tema)))
    .map((m) => ({ m, s: coincide(`${m.texto} ${m.tema}`, q), sent: sentimiento(m.texto) }))
    .filter((x) => x.s > 0 && (!q.ops.sent || x.sent.etiqueta === q.ops.sent))
    .map(({ m, s, sent }) => ({ tipo: "mencion", ...m, marcaNombre: marcaPorId.get(m.marca)?.nombre, sent, relevancia: s + Math.log10(m.alcance + 1) / 2 }))
    .sort((a, b) => b.relevancia - a.relevancia || b.fecha.localeCompare(a.fecha))
    .slice(0, limite);

  const hashtags = radarTendencias(ds, f.pais || ds.meta.paisBase).filter((h) => coincide(h.hashtag, q) > 0 && (q.terminos.length || q.frases.length)).slice(0, 10);
  const marcas = ds.marcas.filter((m) => q.terminos.some((t) => sinTildes(m.nombre).includes(t)));
  return { consulta: q, total: posts.length + menciones.length + hashtags.length + marcas.length, posts, menciones, hashtags, marcas };
}

/** Hashtags por país ordenados por crecimiento (últimos 7 días vs 7 previos). */
export function radarTendencias(ds, pais = null) {
  return ds.tendencias
    .filter((t) => !pais || t.pais === pais)
    .map((t) => {
      const ult = t.serie.slice(-7).reduce((a, b) => a + b, 0);
      const prev = t.serie.slice(-14, -7).reduce((a, b) => a + b, 0);
      const crec = pct(ult - prev, prev);
      return { ...t, volumen7d: ult, crecimiento: crec, estado: crec > 15 ? "en alza" : crec < -10 ? "en baja" : "estable" };
    })
    .sort((a, b) => b.crecimiento - a.crecimiento);
}

/**
 * Ideas de contenido: combinaciones tema × formato que funcionan en la
 * competencia (por encima de la mediana de ER) y que la marca propia casi no usa.
 */
export function ideasContenido(ds, filtros = {}, n = 8) {
  const propia = ds.marcas.find((m) => m.propia)?.id;
  const f = normalizarFiltros(filtros);
  const ellos = postsFiltrados(ds, { ...f, marcas: ds.marcas.filter((m) => !m.propia).map((m) => m.id) });
  const nuestros = postsFiltrados(ds, { ...f, marcas: [propia] });
  const usoPropio = new Map();
  for (const { p } of nuestros) usoPropio.set(`${p.red}|${p.tema}|${p.formato}`, (usoPropio.get(`${p.red}|${p.tema}|${p.formato}`) || 0) + 1);
  const combos = new Map();
  for (const { p, w } of ellos) {
    const k = `${p.red}|${p.tema}|${p.formato}`;
    if (!combos.has(k)) combos.set(k, { alc: 0, int: 0, n: 0, ejemplo: p });
    const c = combos.get(k);
    c.alc += p.alcance * w;
    c.int += p.interacciones * w;
    c.n++;
    if (pct(p.interacciones, p.alcance) > pct(c.ejemplo.interacciones, c.ejemplo.alcance)) c.ejemplo = p;
  }
  const lista = [...combos.entries()].filter(([, c]) => c.n >= 4).map(([k, c]) => {
    const [red, tema, formato] = k.split("|");
    return { red, tema, formato, er: pct(c.int, c.alc), publicaciones: c.n, usoPropio: usoPropio.get(k) || 0, ejemplo: c.ejemplo };
  });
  const ers = lista.map((x) => x.er).sort((a, b) => a - b);
  const mediana = ers[Math.floor(ers.length / 2)] || 0;
  return lista
    .filter((x) => x.er > mediana && x.usoPropio <= 1)
    .sort((a, b) => b.er - a.er)
    .slice(0, n)
    .map((x) => ({ ...x, marcaEjemplo: ds.marcas.find((m) => m.id === x.ejemplo.marca)?.nombre, sobreMediana: mediana ? (x.er / mediana - 1) * 100 : 0 }));
}
