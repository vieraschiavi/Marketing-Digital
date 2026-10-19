// © 2026 Martín Viera. Todos los derechos reservados.
//
// Benchmark contra la competencia: tamaño, crecimiento, engagement, frecuencia,
// share of voice (menciones e interacciones), sentimiento neto y brechas por
// formato y tema — dónde la competencia rinde más que vos.

import { kpis, porFormato, porTema, pct } from "./metricas.js";
import { mencionesFiltradas, postsFiltrados, normalizarFiltros } from "./filtros.js";
import { sentimiento } from "./escucha.js";

function semanas(ds, filtros) {
  const d = filtros.desde || ds.meta.inicio;
  const h = filtros.hasta || ds.meta.fin;
  return Math.max(1, (Date.parse(h) - Date.parse(d)) / (7 * 86400000) + 1 / 7);
}

/** Tabla de benchmark: una fila por marca. */
export function benchmark(ds, filtros = {}) {
  const f = normalizarFiltros(filtros);
  const marcas = ds.marcas.filter((m) => !f.marcas || f.marcas.includes(m.id));
  const sinMarca = { ...f, marcas: null };
  const totMenciones = mencionesFiltradas(ds, sinMarca).length || 1;
  const totInter = postsFiltrados(ds, sinMarca).reduce((s, { p, w }) => s + p.interacciones * w, 0) || 1;
  const sem = semanas(ds, f);
  return marcas.map((m) => {
    const fm = { ...f, marcas: [m.id] };
    const k = kpis(ds, fm);
    const menc = mencionesFiltradas(ds, fm);
    let pos = 0, neg = 0;
    for (const x of menc) {
      const s = sentimiento(x.texto).etiqueta;
      if (s === "positivo") pos++;
      else if (s === "negativo") neg++;
    }
    return {
      marca: m.id, nombre: m.nombre, propia: m.propia, color: m.color,
      seguidores: k.seguidores, crecimiento: k.crecimiento, er: k.er, alcance: k.alcance,
      interacciones: k.interacciones, publicaciones: k.publicaciones, porSemana: k.publicaciones / sem,
      sovMenciones: pct(menc.length, totMenciones), sovInteracciones: pct(k.interacciones, totInter),
      sentimientoNeto: menc.length ? Math.round(((pos - neg) / menc.length) * 100) : 0,
      menciones: menc.length,
    };
  }).sort((a, b) => b.seguidores - a.seguidores);
}

/** Crecimiento por marca y red: detecta quién acelera y dónde. */
export function aceleraciones(ds, filtros = {}, ventana = 60) {
  const fin = Date.parse(ds.meta.fin + "T00:00:00Z");
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const corte = iso(fin - ventana * 86400000);
  const corte2 = iso(fin - 2 * ventana * 86400000);
  const idx = new Map();
  for (const d of ds.diario) idx.set(`${d.marca}|${d.red}|${d.fecha}`, d.seguidores);
  const f = normalizarFiltros(filtros);
  const out = [];
  for (const c of ds.cuentas) {
    if (f.redes && !f.redes.includes(c.red)) continue;
    const s0 = idx.get(`${c.marca}|${c.red}|${corte2}`);
    const s1 = idx.get(`${c.marca}|${c.red}|${corte}`);
    const s2 = idx.get(`${c.marca}|${c.red}|${ds.meta.fin}`);
    if (!s1 || !s2) continue;
    const reciente = pct(s2 - s1, s1);
    const previo = s0 ? pct(s1 - s0, s0) : null;
    out.push({ marca: c.marca, red: c.red, crecimientoReciente: reciente, crecimientoPrevio: previo, aceleracion: previo != null ? reciente - previo : null });
  }
  return out.sort((a, b) => b.crecimientoReciente - a.crecimientoReciente);
}

/**
 * Brechas: formatos y temas donde el promedio de la competencia supera a la
 * marca propia. Solo cuenta con un mínimo de publicaciones de cada lado.
 */
export function brechas(ds, filtros = {}, minimo = 5) {
  const propia = ds.marcas.find((m) => m.propia)?.id;
  const competidores = ds.marcas.filter((m) => !m.propia).map((m) => m.id);
  const base = { ...normalizarFiltros(filtros) };
  const comparar = (fn, clave) => {
    const nuestro = new Map(fn(ds, { ...base, marcas: [propia] }).map((x) => [x[clave], x]));
    const ellos = fn(ds, { ...base, marcas: competidores });
    return ellos
      .filter((x) => x.publicaciones >= minimo)
      .map((x) => {
        const n = nuestro.get(x[clave]);
        return { [clave]: x[clave], erCompetencia: x.er, erPropio: n && n.publicaciones >= minimo ? n.er : null, publicacionesPropias: n?.publicaciones || 0, brecha: n && n.publicaciones >= minimo ? x.er - n.er : null };
      })
      .sort((a, b) => (b.brecha ?? 99) - (a.brecha ?? 99));
  };
  return { formatos: comparar(porFormato, "formato"), temas: comparar(porTema, "tema") };
}
