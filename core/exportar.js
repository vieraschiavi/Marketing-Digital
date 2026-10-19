// © 2026 Martín Viera. Todos los derechos reservados.
//
// Exportación tabular (CSV con BOM, abre bien en Excel con tildes) de los
// bloques del tablero: posts, benchmark, ranking, menciones y sugerencias.

import { postsFiltrados } from "./filtros.js";
import { benchmark } from "./competencia.js";
import { ranking } from "./rankings.js";
import { analizarMenciones } from "./escucha.js";
import { generarSugerencias } from "./sugerencias.js";
import { pct } from "./metricas.js";

export function aCsv(filas, columnas = null, sep = ",") {
  if (!filas.length) return "\uFEFF";
  const cols = columnas || Object.keys(filas[0]);
  const esc = (v) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Evita inyección de fórmulas al abrir en Excel (=, +, -, @ al inicio).
    const seguro = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s;
    return /[",\n\r;]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
  };
  return "\uFEFF" + [cols.join(sep), ...filas.map((f) => cols.map((c) => esc(f[c])).join(sep))].join("\n");
}

const r2 = (x) => Math.round(x * 100) / 100;

export const EXPORTABLES = {
  posts: (ds, f) => aCsv(postsFiltrados(ds, f).map(({ p, w }) => ({
    fecha: p.fecha, marca: ds.marcas.find((m) => m.id === p.marca)?.nombre, red: p.red, formato: p.formato, tema: p.tema, texto: p.texto,
    alcance: Math.round(p.alcance * w), impresiones: Math.round(p.impresiones * w), interacciones: Math.round(p.interacciones * w), clics: Math.round(p.clics * w),
    er: r2(pct(p.interacciones, p.alcance)), peso_filtro: r2(w),
  }))),
  benchmark: (ds, f) => aCsv(benchmark(ds, { ...f, marcas: null }).map((b) => ({
    marca: b.nombre, propia: b.propia, seguidores: Math.round(b.seguidores), crecimiento_pct: r2(b.crecimiento), er_pct: r2(b.er),
    posts_semana: r2(b.porSemana), sov_menciones_pct: r2(b.sovMenciones), sov_interacciones_pct: r2(b.sovInteracciones), sentimiento_neto: b.sentimientoNeto,
  }))),
  ranking: (ds) => aCsv(ranking(ds).map((x) => ({
    red: x.red, marca: x.nombre, grado: x.grado, puntaje: x.puntaje, seguidores: x.seguidores, ganancia_30d: x.ganancia30,
    crecimiento_30d_pct: r2(x.crecimiento30), er_pct: r2(x.er), rank_seguidores: x.rankSeguidores, rank_crecimiento: x.rankCrecimiento, rank_er: x.rankEr,
  }))),
  menciones: (ds, f) => aCsv(analizarMenciones(ds, { ...f, marcas: null }).menciones.map((m) => ({
    fecha: m.fecha, red: m.red, tipo: m.tipo, marca: ds.marcas.find((x) => x.id === m.marca)?.nombre, autor: m.autor, texto: m.texto,
    sentimiento: m.sent.etiqueta, score: m.sent.score, ciudad: m.ciudad, alcance: m.alcance,
  }))),
  sugerencias: (ds, f) => aCsv(generarSugerencias(ds, f).map((s) => ({ prioridad: s.prioridad, score: s.score, tipo: s.tipo, variables: s.vars, evidencia: s.evidencia }))),
};
