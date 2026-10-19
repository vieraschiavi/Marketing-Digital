// © 2026 Martín Viera. Todos los derechos reservados.
// Resumen ejecutivo: KPIs con delta vs. período anterior, evolución, top
// sugerencias, posición frente a la competencia y lo próximo en la cola.

import { kpis, serieDiaria } from "../../core/metricas.js";
import { benchmark } from "../../core/competencia.js";
import { analizarMenciones } from "../../core/escucha.js";
import { REDES } from "../../core/catalogo.js";
import { lineas, barrasH, esc } from "../graficos.js";
import { ahoraLocal } from "../../core/fechas.js";
import { kpi, panel, tarjetaSugerencia, accionesSugerencia, marcasFiltro, red } from "./comun.js";

export function render(ctx) {
  const { ds, t, fmt, filtros } = ctx;
  const marcas = marcasFiltro(ctx);
  const f = { ...filtros, marcas };
  const k = kpis(ds, f);
  const seg = serieDiaria(ds, f, "seguidores", "red");
  const imp = serieDiaria(ds, f, "impresiones");
  const inter = serieDiaria(ds, f, "interacciones");
  const bench = benchmark(ds, { ...filtros, marcas: null });
  const esc2 = analizarMenciones(ds, f);
  const sug = ctx.sugerencias().filter((s) => !ctx.estado.hechas[s.id]).slice(0, 4);
  const proximos = ctx.estado.cola.filter((x) => x.fecha >= ahoraLocal()).slice(0, 5);

  const tarjetas = [
    kpi(t("kpi.seguidores"), fmt.corto(k.seguidores), k.deltas.seguidores, { fmt, spark: seg.series.length ? seg.fechas.map((_, i) => seg.series.reduce((s, x) => s + x.valores[i], 0)) : null }),
    kpi(t("kpi.crecimiento"), fmt.pct(k.crecimiento), null, { fmt, ayuda: t("kpi.crecimientoAyuda") }),
    kpi(t("kpi.alcance"), fmt.corto(k.alcance), k.deltas.alcance, { fmt, spark: imp.series[0]?.valores }),
    kpi(t("kpi.er"), fmt.pct(k.er), k.deltas.er, { fmt, ayuda: t("kpi.erAyuda"), spark: inter.series[0]?.valores }),
    kpi(t("kpi.clics"), fmt.corto(k.clics), k.deltas.clics, { fmt }),
    kpi(t("kpi.publicaciones"), fmt.entero(k.publicaciones), k.deltas.publicaciones, { fmt }),
  ].join("");

  const graf = lineas(seg.series.map((s) => ({ nombre: REDES[s.id]?.nombre || s.id, valores: s.valores, color: REDES[s.id]?.color })), seg.fechas.map(fmt.fecha), { formato: fmt.corto });
  const propiaB = bench.find((b) => b.propia);
  const posEr = [...bench].sort((a, b) => b.er - a.er).findIndex((b) => b.propia) + 1;

  return `
  <div class="kpis">${tarjetas}</div>
  <div class="grid g-2-1">
    ${panel(t("res.evolucion"), graf)}
    ${panel(t("res.sugerencias"), sug.map((s) => tarjetaSugerencia(ctx, s, { compacta: true })).join("") + `<button class="btn-link" data-accion="ir" data-vista="sugerencias">${esc(t("res.verTodas"))} →</button>`, { clase: "lista-sug" })}
  </div>
  <div class="grid g-3">
    ${panel(t("res.erCompetencia"), barrasH(bench.map((b) => ({ etiqueta: b.nombre, valor: b.er, color: b.propia ? "#82C544" : "#4b6385" })), { formato: fmt.pct }) + `<p class="muted">${esc(t("res.posicionEr", { pos: posEr, total: bench.length }))}</p>`)}
    ${panel(t("res.sov"), barrasH(bench.map((b) => ({ etiqueta: b.nombre, valor: b.sovMenciones, color: b.propia ? "#82C544" : "#4b6385" })), { formato: fmt.pct }) + `<p class="muted">${esc(t("res.sovPropio", { v: fmt.pct(propiaB?.sovMenciones) }))}</p>`)}
    ${panel(t("res.escucha"), `<div class="mini-kpis"><div><b>${fmt.entero(esc2.total)}</b><span>${esc(t("esc.menciones"))}</span></div><div><b class="${esc2.sentimientoNeto >= 0 ? "sube" : "baja"}">${esc2.sentimientoNeto > 0 ? "+" : ""}${esc2.sentimientoNeto}</b><span>${esc(t("esc.neto"))}</span></div><div><b>${fmt.entero(esc2.negativo)}</b><span>${esc(t("esc.negativas"))}</span></div></div>
      ${esc2.alertas.length ? `<div class="alerta">⚠ ${esc(t("esc.alerta", { ciudad: (esc2.alertas[0].ciudad || "").split("|")[1] || "—", tema: esc2.alertas[0].tema || "—", z: esc2.alertas[0].z }))}</div>` : `<p class="muted">${esc(t("esc.sinAlertas"))}</p>`}
      <button class="btn-link" data-accion="ir" data-vista="escucha">${esc(t("res.verEscucha"))} →</button>`)}
  </div>
  ${panel(t("res.proximos"), proximos.length ? `<ul class="lista-cola">${proximos.map((x) => `<li>${red(x.red)} <b>${esc(fmt.fechaHora(x.fecha))}</b> ${esc(x.texto.slice(0, 90))}</li>`).join("")}</ul>` : `<p class="muted">${esc(t("res.colaVacia"))}</p> <button class="btn-ghost chico" data-accion="ir" data-vista="planificador">${esc(t("res.irPlanificar"))}</button>`)}
  `;
}

export const acciones = { ...accionesSugerencia };
