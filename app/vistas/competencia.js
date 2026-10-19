// © 2026 Martín Viera. Todos los derechos reservados.
// Competencia (estilo Sprout / Metricool): benchmark con semáforo, share of
// voice, crecimiento comparado, quién acelera, brechas y sus mejores posts.

import { benchmark, aceleraciones, brechas } from "../../core/competencia.js";
import { serieDiaria, topPosts, semaforo } from "../../core/metricas.js";
import { REDES } from "../../core/catalogo.js";
import { lineas, dona, esc } from "../graficos.js";
import { panel, tabla, punto, red, semaforoHtml } from "./comun.js";
import { listaPosts } from "./redes.js";

export function render(ctx) {
  const { ds, t, fmt, filtros } = ctx;
  const f = { ...filtros, marcas: null };
  const bench = benchmark(ds, f);
  const lider = Math.max(...bench.map((b) => b.er), 0.0001);
  const serie = serieDiaria(ds, f, "seguidores", "marca");
  const acc = aceleraciones(ds, f, 60).slice(0, 8);
  const br = brechas(ds, f, 5);
  const competidores = ds.marcas.filter((m) => !m.propia).map((m) => m.id);
  const top = topPosts(ds, { ...f, marcas: competidores }, 8, "er");

  const tablaB = tabla([
    { t: t("col.marca"), v: (b) => `${punto(b.color)} ${b.propia ? "<b>" : ""}${esc(b.nombre)}${b.propia ? "</b>" : ""}` },
    { t: t("kpi.seguidores"), v: (b) => fmt.corto(b.seguidores), num: true },
    { t: t("kpi.crecimiento"), v: (b) => fmt.pct(b.crecimiento), num: true },
    { t: "ER", v: (b) => `${fmt.pct(b.er)} ${semaforoHtml(semaforo((b.er / lider) * 100), "")}`, num: true },
    { t: t("col.postsSemana"), v: (b) => fmt.dec(b.porSemana), num: true },
    { t: t("col.sovMenciones"), v: (b) => fmt.pct(b.sovMenciones), num: true },
    { t: t("col.sovInter"), v: (b) => fmt.pct(b.sovInteracciones), num: true },
    { t: t("esc.neto"), v: (b) => `<span class="${b.sentimientoNeto >= 0 ? "sube" : "baja"}">${b.sentimientoNeto > 0 ? "+" : ""}${b.sentimientoNeto}</span>`, num: true },
  ], bench, { claseFila: (b) => (b.propia ? "fila-propia" : "") });

  const tablaAcc = tabla([
    { t: t("col.marca"), v: (a) => esc(ctx.nombreMarca(a.marca)) },
    { t: t("col.red"), v: (a) => red(a.red) },
    { t: t("comp.crec60"), v: (a) => fmt.pct(a.crecimientoReciente), num: true },
    { t: t("comp.crecPrevio"), v: (a) => fmt.pct(a.crecimientoPrevio), num: true },
    { t: t("comp.aceleracion"), v: (a) => `<span class="${(a.aceleracion ?? 0) >= 0 ? "sube" : "baja"}">${a.aceleracion == null ? "—" : fmt.delta(a.aceleracion)}</span>`, num: true },
  ], acc);

  const tablaBrecha = (lista, clave, etiqueta) => tabla([
    { t: etiqueta, v: (x) => esc(clave === "formato" ? t("fmt." + x.formato) : x.tema) },
    { t: t("comp.erCompetencia"), v: (x) => fmt.pct(x.erCompetencia), num: true },
    { t: t("comp.erPropio"), v: (x) => (x.erPropio == null ? `<span class="muted">${esc(t("comp.noUsas"))}</span>` : fmt.pct(x.erPropio)), num: true },
    { t: t("comp.brecha"), v: (x) => (x.brecha == null ? "—" : `<span class="${x.brecha > 0 ? "baja" : "sube"}">${fmt.dec(x.brecha)} pp</span>`), num: true },
  ], lista.slice(0, 6));

  return `
  ${panel(t("comp.benchmark"), tablaB, { ayuda: t("comp.benchmarkAyuda") })}
  <div class="grid g-2-1">
    ${panel(t("comp.crecimiento"), lineas(serie.series.map((s) => ({ nombre: ctx.nombreMarca(s.id), valores: s.valores, color: ds.marcas.find((m) => m.id === s.id)?.color, ancho: ds.marcas.find((m) => m.id === s.id)?.propia ? 3 : 1.6 })), serie.fechas.map(fmt.fecha), { formato: fmt.corto, minCero: false }))}
    ${panel(t("comp.sov"), dona(bench.map((b) => ({ etiqueta: b.nombre, valor: b.menciones, color: b.color })), { formato: fmt.entero, centro: fmt.entero(bench.reduce((s, b) => s + b.menciones, 0)) }))}
  </div>
  ${panel(t("comp.aceleran"), tablaAcc, { ayuda: t("comp.aceleranAyuda") })}
  <div class="grid g-2">
    ${panel(t("comp.brechasFormato"), tablaBrecha(br.formatos, "formato", t("col.formato")))}
    ${panel(t("comp.brechasTema"), tablaBrecha(br.temas, "tema", t("col.tema")))}
  </div>
  ${panel(t("comp.topPosts"), listaPosts(ctx, top))}
  <p class="muted nota">${esc(t("comp.nota", { redes: Object.values(REDES).map((r) => r.nombre).join(", ") }))}</p>
  `;
}
