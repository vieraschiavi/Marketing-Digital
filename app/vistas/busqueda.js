// © 2026 Martín Viera. Todos los derechos reservados.
// Búsqueda profunda: buscador con operadores sobre posts propios y de la
// competencia, menciones, marcas y hashtags; radar de tendencias por país e
// ideas de contenido que funcionan en la competencia y vos no usás.

import { buscar, radarTendencias, ideasContenido } from "../../core/busqueda.js";
import { GEO, INDUSTRIAS } from "../../core/catalogo.js";
import { sparkline, esc } from "../graficos.js";
import { panel, tabla, red } from "./comun.js";
import { listaPosts } from "./redes.js";
import { itemMencion } from "./escucha.js";

/** Ejemplos armados con la industria activa (temas, hashtags y competidores reales del dataset). */
function ejemplos(ds) {
  const ind = INDUSTRIAS[ds.meta.industria] || INDUSTRIAS.cafeteria;
  const rival = ds.marcas.find((m) => !m.propia)?.nombre.split(" ")[0].toLowerCase() || "";
  const ciudad = Object.keys(GEO[ds.meta.paisBase]?.ciudades || {})[0]?.toLowerCase() || "";
  return [`${ind.temas[0].split(" ")[0]} sent:negativo`, `${ind.hashtags[0]} red:instagram`, `marca:${rival} formato:video`, `"${ind.temas[1]}" pais:${ds.meta.paisBase}`, `${ind.temas[2].split(" ")[0]} ciudad:${ciudad}`];
}

export function render(ctx) {
  const { ds, t, fmt, filtros, estado } = ctx;
  const q = estado.ui.consulta || "";
  const r = q ? buscar(ds, q, { ...filtros, marcas: null }, 25) : null;
  const pais = filtros.pais || ds.meta.paisBase;
  const radar = radarTendencias(ds, pais);
  const ideas = ideasContenido(ds, { ...filtros, marcas: null }, 8);

  const resultados = !r ? `<p class="muted">${esc(t("bus.ayuda"))}</p><div class="ejemplos">${ejemplos(ds).map((e) => `<button class="chip" data-accion="buscarEjemplo" data-q="${esc(e)}">${esc(e)}</button>`).join("")}</div>`
    : `<p><b>${fmt.entero(r.total)}</b> ${esc(t("bus.resultados"))}</p>
      ${r.marcas.length ? `<p>${esc(t("bus.marcas"))}: ${r.marcas.map((m) => `<span class="pill">${esc(m.nombre)}</span>`).join(" ")}</p>` : ""}
      ${r.hashtags.length ? panel(t("bus.hashtags"), tabla([
        { t: "Hashtag", v: (h) => `<b>${esc(h.hashtag)}</b>` },
        { t: t("bus.vol7"), v: (h) => fmt.corto(h.volumen7d), num: true },
        { t: t("kpi.crecimiento"), v: (h) => fmt.delta(h.crecimiento), num: true },
      ], r.hashtags)) : ""}
      ${panel(t("bus.posts", { n: r.posts.length }), listaPosts(ctx, r.posts))}
      ${panel(t("bus.menciones", { n: r.menciones.length }), `<ul class="menciones">${r.menciones.map((m) => itemMencion(ctx, m)).join("") || `<p class="muted">—</p>`}</ul>`)}`;

  const tablaRadar = tabla([
    { t: "Hashtag", v: (h) => `<b>${esc(h.hashtag)}</b>` },
    { t: t("bus.vol7"), v: (h) => fmt.corto(h.volumen7d), num: true },
    { t: t("kpi.crecimiento"), v: (h) => `<span class="${h.crecimiento >= 0 ? "sube" : "baja"}">${fmt.delta(h.crecimiento)}</span>`, num: true },
    { t: t("bus.estado"), v: (h) => `<span class="pill ${h.estado === "en alza" ? "verde" : h.estado === "en baja" ? "rojo" : "gris"}">${esc(t("tend." + h.estado.replace(" ", "_")))}</span>` },
    { t: t("bus.30d"), v: (h) => sparkline(h.serie, h.crecimiento >= 0 ? "#82C544" : "#e05c5c") },
  ], radar.slice(0, 10));

  const tablaIdeas = tabla([
    { t: t("col.red"), v: (i) => red(i.red) },
    { t: t("col.tema"), v: (i) => `<b>${esc(i.tema)}</b>` },
    { t: t("col.formato"), v: (i) => esc(t("fmt." + i.formato)) },
    { t: t("bus.erCombo"), v: (i) => `${fmt.pct(i.er)} <span class="sube">(+${fmt.entero(i.sobreMediana)} %)</span>`, num: true },
    { t: t("bus.ejemplo"), v: (i) => `<span class="trunc" title="${esc(i.ejemplo.texto)}">${esc(i.marcaEjemplo)}: ${esc(i.ejemplo.texto)}</span>` },
    { t: "", v: (i) => `<button class="btn-ghost chico" data-accion="ideaPlanificar" data-red="${i.red}" data-tema="${esc(i.tema)}">${esc(t("sug.planificar"))}</button>` },
  ], ideas);

  return `
  <div class="panel buscador">
    <div class="buscar-linea"><input type="search" id="consulta" value="${esc(q)}" placeholder="${esc(t("bus.placeholder"))}" data-enter="buscar" autofocus>
    <button class="btn-primario" data-accion="buscar">${esc(t("bus.buscar"))}</button></div>
    <small class="muted">${esc(t("bus.operadores"))}</small>
  </div>
  ${resultados}
  <div class="grid g-2">
    ${panel(t("bus.radar", { pais: GEO[pais]?.nombre || pais }), tablaRadar, { ayuda: t("bus.radarAyuda") })}
    ${panel(t("bus.ideas"), tablaIdeas || "", { ayuda: t("bus.ideasAyuda") })}
  </div>`;
}

export const acciones = {
  buscar: (ctx) => ctx.actualizar({ ui: { ...ctx.estado.ui, consulta: document.getElementById("consulta").value.trim() } }),
  buscarEjemplo: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, consulta: el.dataset.q } }),
  ideaPlanificar: (ctx, el) => ctx.actualizar({ vista: "planificador", ui: { ...ctx.estado.ui, borrador: { red: el.dataset.red, texto: `${el.dataset.tema} — ` } } }),
};
