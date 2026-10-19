// © 2026 Martín Viera. Todos los derechos reservados.
//
// Filtros transversales: marca, red, período, país, ciudad, público (edad,
// género, interés) y formato. Cada post trae su reparto de audiencia; filtrar
// por "Montevideo, 25-34, mujeres" no descarta posts: pondera cada métrica por
// la fracción del público del post que cae en ese segmento. Así el ranking de
// posts, formatos y horarios cambia de verdad con el filtro.

import { EDADES, GENEROS } from "./catalogo.js";

export function filtrosVacios() {
  return { marcas: null, redes: null, desde: null, hasta: null, pais: null, ciudad: null, edades: null, generos: null, interes: null, formato: null };
}

/** Normaliza lo que llega de la UI / del asistente a un objeto de filtros válido. */
export function normalizarFiltros(f = {}) {
  const base = filtrosVacios();
  const lista = (v) => (Array.isArray(v) && v.length ? v : null);
  return {
    ...base,
    marcas: lista(f.marcas),
    redes: lista(f.redes),
    desde: f.desde || null,
    hasta: f.hasta || null,
    pais: f.pais || null,
    ciudad: f.ciudad || null,
    edades: lista(f.edades)?.map(Number).filter((i) => i >= 0 && i < EDADES.length) || null,
    generos: lista(f.generos)?.map(Number).filter((i) => i >= 0 && i < GENEROS.length) || null,
    interes: f.interes || null,
    formato: f.formato || null,
  };
}

/** Fracción geográfica del reparto que cae en el filtro (1 si no hay filtro geo). */
export function fraccionGeo(geo, f) {
  if (!f.pais && !f.ciudad) return 1;
  if (!geo) return 0; // dato importado sin geografía: no se puede atribuir
  let s = 0;
  for (const [clave, share] of Object.entries(geo)) {
    if (f.ciudad ? clave === f.ciudad : clave.startsWith(f.pais + "|")) s += share;
  }
  return s;
}

function fraccionLista(reparto, indices) {
  if (!indices) return 1;
  if (!reparto) return 0;
  return indices.reduce((s, i) => s + (reparto[i] || 0), 0);
}

/** Peso de un post bajo los filtros de público (0 = no aplica). */
export function factorPost(p, f) {
  if (f.interes && !(p.intereses || []).includes(f.interes)) return 0;
  if (f.formato && p.formato !== f.formato) return 0;
  return fraccionGeo(p.geo, f) * fraccionLista(p.edad, f.edades) * fraccionLista(p.genero, f.generos);
}

/** Peso de una cuenta (para series diarias) bajo los filtros de público. */
export function factorCuenta(cuenta, f) {
  if (!cuenta?.audiencia) return f.pais || f.ciudad || f.edades || f.generos ? 0 : 1;
  const a = cuenta.audiencia;
  return fraccionGeo(a.ciudades, f) * fraccionLista(a.edad, f.edades) * fraccionLista(a.genero, f.generos);
}

const enRango = (fecha, f) => (!f.desde || fecha.slice(0, 10) >= f.desde) && (!f.hasta || fecha.slice(0, 10) <= f.hasta);
const enMarcaRed = (x, f) => (!f.marcas || f.marcas.includes(x.marca)) && (!f.redes || f.redes.includes(x.red));

/** Posts que pasan el filtro, cada uno con su peso `w` (0 < w ≤ 1). */
export function postsFiltrados(ds, filtros) {
  const f = normalizarFiltros(filtros);
  const out = [];
  for (const p of ds.posts) {
    if (!enMarcaRed(p, f) || !enRango(p.fecha, f)) continue;
    const w = factorPost(p, f);
    if (w > 0) out.push({ p, w });
  }
  return out;
}

export function diarioFiltrado(ds, filtros) {
  const f = normalizarFiltros(filtros);
  const cuentas = new Map(ds.cuentas.map((c) => [`${c.marca}-${c.red}`, c]));
  const out = [];
  for (const d of ds.diario) {
    if (!enMarcaRed(d, f) || !enRango(d.fecha, f)) continue;
    const w = factorCuenta(cuentas.get(`${d.marca}-${d.red}`), f);
    if (w > 0) out.push({ d, w });
  }
  return out;
}

export function mencionesFiltradas(ds, filtros) {
  const f = normalizarFiltros(filtros);
  return ds.menciones.filter((m) =>
    enMarcaRed(m, f) && enRango(m.fecha, f) &&
    (!f.pais || m.pais === f.pais) && (!f.ciudad || m.ciudad === f.ciudad));
}

/** Período anterior de igual largo (para los deltas de los KPI). */
export function periodoAnterior(filtros, ds) {
  const desde = filtros.desde || ds.meta.inicio;
  const hasta = filtros.hasta || ds.meta.fin;
  const dMs = Date.parse(desde + "T00:00:00Z");
  const hMs = Date.parse(hasta + "T00:00:00Z");
  const largo = hMs - dMs + 86400000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { ...filtros, desde: iso(dMs - largo), hasta: iso(dMs - 86400000) };
}

/** Atajo: últimos N días respecto del fin del dataset. */
export function ultimosDias(ds, n) {
  const fin = Date.parse(ds.meta.fin + "T00:00:00Z");
  return { desde: new Date(fin - (n - 1) * 86400000).toISOString().slice(0, 10), hasta: ds.meta.fin };
}
