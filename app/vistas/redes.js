// © 2026 Martín Viera. Todos los derechos reservados.
// Análisis por red (estilo Metricool): resumen por red, evolución, mapa de
// calor de horarios, rendimiento por formato y mejores publicaciones.

import { porRed, serieDiaria, mejoresHorarios, porFormato, topPosts } from "../../core/metricas.js";
import { REDES } from "../../core/catalogo.js";
import { lineas, mapaCalor, barras, esc } from "../graficos.js";
import { panel, tabla, red, marcasFiltro } from "./comun.js";

export function listaPosts(ctx, posts) {
  const { t, fmt } = ctx;
  return tabla([
    { t: t("col.fecha"), v: (p) => esc(fmt.fechaHora(p.fecha)) },
    { t: t("col.marca"), v: (p) => esc(ctx.nombreMarca(p.marca)) },
    { t: t("col.red"), v: (p) => red(p.red) },
    { t: t("col.formato"), v: (p) => esc(t("fmt." + p.formato)) },
    { t: t("col.texto"), v: (p) => `<span class="trunc" title="${esc(p.texto)}">${esc(p.texto)}</span>` },
    { t: t("col.alcance"), v: (p) => fmt.corto(p.alcance), num: true },
    { t: t("col.interacciones"), v: (p) => fmt.entero(p.interacciones), num: true },
    { t: "ER", v: (p) => fmt.pct(p.er), num: true },
  ], posts, { vacio: t("app.sinDatos") });
}

export function render(ctx) {
  const { ds, t, fmt, filtros } = ctx;
  const f = { ...filtros, marcas: marcasFiltro(ctx) };
  const resumen = porRed(ds, f);
  const serie = serieDiaria(ds, f, "interacciones", "red");
  const h = mejoresHorarios(ds, f, 2);
  const formatos = porFormato(ds, f);
  const top = topPosts(ds, f, 10, ctx.estado.ui.ordenTop || "er");
  const dias = t("dias.cortos").split(",");

  const tablaRedes = tabla([
    { t: t("col.red"), v: (r) => red(r.red) },
    { t: t("kpi.seguidores"), v: (r) => fmt.corto(r.seguidores), num: true },
    { t: t("kpi.crecimiento"), v: (r) => fmt.pct(r.crecimiento), num: true },
    { t: t("col.publicaciones"), v: (r) => fmt.entero(r.publicaciones), num: true },
    { t: t("col.alcance"), v: (r) => fmt.corto(r.alcance), num: true },
    { t: t("col.interacciones"), v: (r) => fmt.corto(r.interacciones), num: true },
    { t: "ER", v: (r) => fmt.pct(r.er), num: true },
    { t: "CTR", v: (r) => fmt.pct(r.ctr), num: true },
  ], resumen, { vacio: t("app.sinDatos"), accionFila: (r) => `data-accion="elegirRed" data-red="${r.red}"` });

  const mejores = h.top.slice(0, 3).map((x) => `<span class="pill verde">${esc(dias[x.dia])} ${x.hora}:00 · ${fmt.pct(x.er)}</span>`).join(" ");
  const orden = ctx.estado.ui.ordenTop || "er";
  const selOrden = `<div class="seg chico">${["er", "interacciones", "alcance"].map((o) => `<button class="${orden === o ? "on" : ""}" data-accion="ordenTop" data-orden="${o}">${esc(t("orden." + o))}</button>`).join("")}</div>`;

  return `
  ${panel(t("redes.resumen"), tablaRedes, { ayuda: t("redes.resumenAyuda") })}
  <div class="grid g-2">
    ${panel(t("redes.evolucion"), lineas(serie.series.map((s) => ({ nombre: REDES[s.id]?.nombre, valores: s.valores, color: REDES[s.id]?.color })), serie.fechas.map(fmt.fecha), { formato: fmt.corto }))}
    ${panel(t("redes.formatos"), barras(formatos.map((x) => ({ etiqueta: t("fmt." + x.formato), valor: x.er })), { formato: (v) => fmt.dec(v) + "%" }) + `<p class="muted">${esc(t("redes.formatosNota"))}</p>`)}
  </div>
  ${panel(t("redes.horarios"), mapaCalor(h.er, dias, { formato: fmt.pct }) + `<p>${esc(t("redes.mejoresFranjas"))} ${mejores || "—"}</p>`, { ayuda: t("redes.horariosAyuda") })}
  ${panel(t("redes.top"), listaPosts(ctx, top), { extra: selOrden })}
  `;
}

export const acciones = {
  elegirRed: (ctx, el) => ctx.actualizar({ filtros: { ...ctx.estado.filtros, redes: [el.dataset.red] } }),
  ordenTop: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, ordenTop: el.dataset.orden } }),
};
