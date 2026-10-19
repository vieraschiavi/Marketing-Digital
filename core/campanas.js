// © 2026 Martín Viera. Todos los derechos reservados.
//
// Campañas y ROI (estilo HubSpot): constructor de UTM y rendimiento de una
// campaña a partir de los posts que la componen (tema + período + redes).
// Las conversiones e ingresos son ESTIMACIONES con los parámetros que pone el
// usuario (tasa de conversión y ticket promedio): la app lo dice en pantalla y
// en el informe. Para conversiones reales hace falta conectar la analítica web.

import { postsFiltrados } from "./filtros.js";
import { pct } from "./metricas.js";

const SLUG = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Construye una URL con parámetros UTM. Lanza si la URL base no es válida. */
export function construirUtm(base, { fuente, medio = "social", campana, contenido, termino } = {}) {
  const url = new URL(base); // valida: "hola" lanza TypeError
  if (!/^https?:$/.test(url.protocol)) throw new Error("Solo se aceptan URLs http(s)");
  const set = (k, v) => v && url.searchParams.set(k, SLUG(v));
  set("utm_source", fuente);
  set("utm_medium", medio);
  set("utm_campaign", campana);
  set("utm_content", contenido);
  set("utm_term", termino);
  return url.toString();
}

/** Métricas de una campaña. `c`: {nombre, tema, desde, hasta, redes, inversion, tasaConversion, ticket}. */
export function rendimientoCampana(ds, c) {
  const propia = ds.marcas.find((m) => m.propia)?.id;
  const lista = postsFiltrados(ds, { marcas: [propia], redes: c.redes?.length ? c.redes : null, desde: c.desde, hasta: c.hasta })
    .filter(({ p }) => !c.tema || p.tema === c.tema);
  let alcance = 0, impresiones = 0, interacciones = 0, clics = 0;
  for (const { p } of lista) {
    alcance += p.alcance; impresiones += p.impresiones; interacciones += p.interacciones; clics += p.clics;
  }
  const tasa = (c.tasaConversion ?? 2.5) / 100;
  const conversiones = clics * tasa;
  const ingresos = conversiones * (c.ticket ?? 0);
  const inversion = c.inversion ?? 0;
  return {
    ...c,
    publicaciones: lista.length, alcance, impresiones, interacciones, clics,
    er: pct(interacciones, alcance), ctr: pct(clics, impresiones),
    conversionesEstimadas: conversiones,
    ingresosEstimados: ingresos,
    cpc: clics ? inversion / clics : null,
    cpa: conversiones ? inversion / conversiones : null,
    roi: inversion ? ((ingresos - inversion) / inversion) * 100 : null,
    estimado: true,
    embudo: [
      { etapa: "impresiones", valor: impresiones },
      { etapa: "alcance", valor: alcance },
      { etapa: "interacciones", valor: interacciones },
      { etapa: "clics", valor: clics },
      { etapa: "conversiones", valor: conversiones },
    ],
  };
}

/** Campañas de ejemplo para la demo (sobre los temas de la industria). */
export function campanasDemo(ds) {
  const fin = Date.parse(ds.meta.fin + "T00:00:00Z");
  const iso = (d) => new Date(fin - d * 86400000).toISOString().slice(0, 10);
  const temas = [...new Set(ds.posts.filter((p) => ds.marcas.find((m) => m.id === p.marca)?.propia).map((p) => p.tema))];
  return [
    { id: "c1", nombre: `Lanzamiento — ${temas[0]}`, tema: temas[0], desde: iso(45), hasta: iso(15), redes: ["instagram", "tiktok"], inversion: 18000, tasaConversion: 2.5, ticket: 650 },
    { id: "c2", nombre: `Always-on — ${temas[1]}`, tema: temas[1], desde: iso(89), hasta: iso(0), redes: [], inversion: 30000, tasaConversion: 1.8, ticket: 480 },
    { id: "c3", nombre: `Promo — ${temas[2]}`, tema: temas[2], desde: iso(30), hasta: iso(0), redes: ["facebook", "instagram"], inversion: 9000, tasaConversion: 3.2, ticket: 390 },
  ];
}
