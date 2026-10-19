// © 2026 Martín Viera. Todos los derechos reservados.
//
// KPIs y agregados. Fórmulas (las mismas en la app, la demo web y el informe):
//   ER (engagement rate)  = interacciones / alcance × 100
//   CTR                   = clics / impresiones × 100
//   Crecimiento           = (seguidores_fin − seguidores_inicio) / seguidores_inicio × 100
//   Delta vs. anterior    = (actual − anterior) / anterior × 100, mismo largo de período

import { postsFiltrados, diarioFiltrado, periodoAnterior, normalizarFiltros } from "./filtros.js";
import { EDADES, GENEROS, GEO } from "./catalogo.js";

export const pct = (a, b) => (b ? (a / b) * 100 : 0);
export const delta = (actual, anterior) => (anterior ? ((actual - anterior) / Math.abs(anterior)) * 100 : null);

function sumarPosts(lista) {
  const t = { alcance: 0, impresiones: 0, interacciones: 0, clics: 0, likes: 0, comentarios: 0, compartidos: 0, guardados: 0, publicaciones: 0 };
  for (const { p, w } of lista) {
    t.alcance += p.alcance * w;
    t.impresiones += p.impresiones * w;
    t.interacciones += p.interacciones * w;
    t.clics += p.clics * w;
    t.likes += p.likes * w;
    t.comentarios += p.comentarios * w;
    t.compartidos += p.compartidos * w;
    t.guardados += p.guardados * w;
    t.publicaciones += 1;
  }
  return t;
}

/** Seguidores al inicio y al fin del período (suma de cuentas, ponderada). */
function seguidores(ds, filtros) {
  const filas = diarioFiltrado(ds, filtros);
  if (!filas.length) return { inicio: 0, fin: 0 };
  let primera = "9999", ultima = "0000";
  for (const { d } of filas) {
    if (d.fecha < primera) primera = d.fecha;
    if (d.fecha > ultima) ultima = d.fecha;
  }
  let inicio = 0, fin = 0;
  for (const { d, w } of filas) {
    if (d.fecha === primera) inicio += d.seguidores * w;
    if (d.fecha === ultima) fin += d.seguidores * w;
  }
  return { inicio, fin };
}

function bloqueKpi(ds, filtros) {
  const t = sumarPosts(postsFiltrados(ds, filtros));
  const s = seguidores(ds, filtros);
  return {
    seguidores: s.fin,
    crecimiento: pct(s.fin - s.inicio, s.inicio),
    nuevosSeguidores: s.fin - s.inicio,
    alcance: t.alcance,
    impresiones: t.impresiones,
    interacciones: t.interacciones,
    er: pct(t.interacciones, t.alcance),
    clics: t.clics,
    ctr: pct(t.clics, t.impresiones),
    publicaciones: t.publicaciones,
  };
}

/** KPIs del período + deltas contra el período anterior de igual largo. */
export function kpis(ds, filtros = {}) {
  const actual = bloqueKpi(ds, filtros);
  const previo = bloqueKpi(ds, periodoAnterior(filtros, ds));
  const deltas = {};
  for (const k of Object.keys(actual)) deltas[k] = delta(actual[k], previo[k]);
  return { ...actual, deltas, anterior: previo };
}

/** Serie diaria de un campo, opcionalmente agrupada por "marca" o "red". */
export function serieDiaria(ds, filtros, campo = "seguidores", agrupar = null) {
  const filas = diarioFiltrado(ds, filtros);
  const grupos = new Map();
  for (const { d, w } of filas) {
    const g = agrupar ? d[agrupar] : "total";
    if (!grupos.has(g)) grupos.set(g, new Map());
    const m = grupos.get(g);
    m.set(d.fecha, (m.get(d.fecha) || 0) + d[campo] * w);
  }
  const fechas = [...new Set(filas.map(({ d }) => d.fecha))].sort();
  return {
    fechas,
    series: [...grupos.entries()].map(([id, m]) => ({ id, valores: fechas.map((f) => m.get(f) ?? 0) })),
  };
}

/** Mapa de calor 7×24 de ER medio (ponderado por alcance) + mejores franjas. */
export function mejoresHorarios(ds, filtros = {}, minimoPosts = 3) {
  const alc = Array.from({ length: 7 }, () => Array(24).fill(0));
  const int = Array.from({ length: 7 }, () => Array(24).fill(0));
  const n = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const { p, w } of postsFiltrados(ds, filtros)) {
    alc[p.dia][p.hora] += p.alcance * w;
    int[p.dia][p.hora] += p.interacciones * w;
    n[p.dia][p.hora] += 1;
  }
  const er = alc.map((fila, d) => fila.map((a, h) => (n[d][h] >= minimoPosts ? pct(int[d][h], a) : null)));
  const franjas = [];
  er.forEach((fila, d) => fila.forEach((v, h) => v !== null && franjas.push({ dia: d, hora: h, er: v, posts: n[d][h] })));
  franjas.sort((a, b) => b.er - a.er);
  // ER por hora del día (todas las jornadas) — más robusto con pocos datos.
  const porHora = Array.from({ length: 24 }, (_, h) => {
    let a = 0, i = 0, c = 0;
    for (let d = 0; d < 7; d++) { a += alc[d][h]; i += int[d][h]; c += n[d][h]; }
    return { hora: h, er: c >= minimoPosts ? pct(i, a) : null, posts: c };
  });
  return { er, posts: n, top: franjas.slice(0, 5), porHora };
}

/** Rendimiento por formato (ER, alcance medio, cantidad). */
export function porFormato(ds, filtros = {}) {
  const g = new Map();
  for (const x of postsFiltrados(ds, filtros)) {
    if (!g.has(x.p.formato)) g.set(x.p.formato, []);
    g.get(x.p.formato).push(x);
  }
  return [...g.entries()].map(([formato, lista]) => {
    const t = sumarPosts(lista);
    return { formato, publicaciones: t.publicaciones, er: pct(t.interacciones, t.alcance), alcanceMedio: t.alcance / t.publicaciones, interacciones: t.interacciones };
  }).sort((a, b) => b.er - a.er);
}

/** Resumen por red de una o más marcas. */
export function porRed(ds, filtros = {}) {
  const g = new Map();
  for (const x of postsFiltrados(ds, filtros)) {
    if (!g.has(x.p.red)) g.set(x.p.red, []);
    g.get(x.p.red).push(x);
  }
  return [...g.entries()].map(([red, lista]) => {
    const t = sumarPosts(lista);
    const s = seguidores(ds, { ...filtros, redes: [red] });
    return { red, ...t, er: pct(t.interacciones, t.alcance), ctr: pct(t.clics, t.impresiones), seguidores: s.fin, crecimiento: pct(s.fin - s.inicio, s.inicio) };
  }).sort((a, b) => b.alcance - a.alcance);
}

/** Mejores (o peores) posts por ER, interacciones o alcance. */
export function topPosts(ds, filtros = {}, n = 10, orden = "er", minimoAlcance = 200) {
  const lista = postsFiltrados(ds, filtros)
    .filter(({ p }) => p.alcance >= minimoAlcance)
    .map(({ p, w }) => ({ ...p, peso: w, er: pct(p.interacciones, p.alcance), alcancePonderado: p.alcance * w, interaccionesPonderadas: p.interacciones * w }));
  const clave = { er: "er", interacciones: "interaccionesPonderadas", alcance: "alcancePonderado" }[orden] || "er";
  return lista.sort((a, b) => b[clave] - a[clave]).slice(0, n);
}

/** Rendimiento por tema (las etiquetas temáticas de cada post). */
export function porTema(ds, filtros = {}) {
  const g = new Map();
  for (const x of postsFiltrados(ds, filtros)) {
    if (!x.p.tema) continue;
    if (!g.has(x.p.tema)) g.set(x.p.tema, []);
    g.get(x.p.tema).push(x);
  }
  return [...g.entries()].map(([tema, lista]) => {
    const t = sumarPosts(lista);
    return { tema, publicaciones: t.publicaciones, er: pct(t.interacciones, t.alcance), interacciones: t.interacciones };
  }).sort((a, b) => b.er - a.er);
}

/** Audiencia agregada (ponderada por seguidores) de las cuentas filtradas. */
export function audiencia(ds, filtros = {}) {
  const f = normalizarFiltros(filtros);
  const cuentas = ds.cuentas.filter((c) => (!f.marcas || f.marcas.includes(c.marca)) && (!f.redes || f.redes.includes(c.red)) && c.audiencia);
  const ultimo = new Map();
  for (const d of ds.diario) ultimo.set(`${d.marca}-${d.red}`, d.seguidores);
  const paises = {}, ciudades = {}, intereses = {};
  const edad = Array(EDADES.length).fill(0), genero = Array(GENEROS.length).fill(0);
  let total = 0;
  for (const c of cuentas) {
    const s = ultimo.get(`${c.marca}-${c.red}`) || 0;
    total += s;
    for (const [k, v] of Object.entries(c.audiencia.ciudades)) {
      if (f.pais && !k.startsWith(f.pais + "|")) continue;
      ciudades[k] = (ciudades[k] || 0) + v * s;
      const p = k.split("|")[0];
      paises[p] = (paises[p] || 0) + v * s;
    }
    c.audiencia.edad.forEach((v, i) => (edad[i] += v * s));
    c.audiencia.genero.forEach((v, i) => (genero[i] += v * s));
    for (const [k, v] of Object.entries(c.audiencia.intereses)) intereses[k] = (intereses[k] || 0) + v * s;
  }
  const norm = (o) => {
    const t = Object.values(o).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(o).map(([k, v]) => ({ clave: k, share: v / t })).sort((a, b) => b.share - a.share);
  };
  const normArr = (a) => {
    const t = a.reduce((x, y) => x + y, 0) || 1;
    return a.map((v) => v / t);
  };
  return {
    total,
    paises: norm(paises).map((x) => ({ ...x, nombre: GEO[x.clave]?.nombre || x.clave })),
    ciudades: norm(ciudades).map((x) => ({ ...x, nombre: x.clave.split("|")[1], pais: x.clave.split("|")[0] })),
    edad: normArr(edad),
    genero: normArr(genero),
    intereses: norm(intereses),
  };
}

export function semaforo(valor, metas = { verde: 85, amarillo: 70 }) {
  if (valor >= metas.verde) return "verde";
  if (valor >= metas.amarillo) return "amarillo";
  return "rojo";
}
