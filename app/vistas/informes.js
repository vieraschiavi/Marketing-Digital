// © 2026 Martín Viera. Todos los derechos reservados.
// Informes: informe ejecutivo HTML autocontenido (se abre en cualquier
// navegador y se imprime a PDF) y exportaciones CSV de cada bloque.

import { kpis } from "../../core/metricas.js";
import { benchmark } from "../../core/competencia.js";
import { ranking } from "../../core/rankings.js";
import { analizarMenciones } from "../../core/escucha.js";
import { EXPORTABLES } from "../../core/exportar.js";
import { REDES } from "../../core/catalogo.js";
import { esc, barrasH } from "../graficos.js";
import { panel, textoSugerencia } from "./comun.js";

export function informeHtml(ctx) {
  const { ds, t, fmt, filtros, propia } = ctx;
  const k = kpis(ds, { ...filtros, marcas: [propia.id] });
  const b = benchmark(ds, { ...filtros, marcas: null });
  const r = ranking(ds).filter((x) => x.propia);
  const e = analizarMenciones(ds, { ...filtros, marcas: [propia.id] });
  const s = ctx.sugerencias().filter((x) => x.tipo !== "error").slice(0, 8);
  const fila = (cols) => `<tr>${cols.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  return `<!doctype html><html lang="${ctx.estado.idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t("inf.titulo"))} — ${esc(propia.nombre)}</title>
<style>
body{font-family:"Segoe UI",system-ui,sans-serif;color:#122238;margin:0;background:#f4f7fb}
.wrap{max-width:960px;margin:0 auto;padding:32px 20px}
header{background:linear-gradient(135deg,#0d2440,#081324);color:#eaf1fb;padding:28px 20px}
header .wrap{padding:0 20px}h1{margin:0 0 4px;font-size:26px}h2{color:#0d2440;border-bottom:2px solid #82C544;padding-bottom:4px;margin-top:32px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.kpi{background:#fff;border:1px solid #e6ebf2;border-radius:10px;padding:12px}.kpi b{display:block;font-size:22px}.kpi span{color:#586a80;font-size:12px}
table{width:100%;border-collapse:collapse;background:#fff;font-size:13px}td,th{padding:7px 9px;border-bottom:1px solid #e6ebf2;text-align:left}th{background:#eef3f9}
.sug{background:#fff;border-left:4px solid #82C544;padding:10px 14px;margin:8px 0;border-radius:6px}.sug.urgente{border-color:#e05c5c}.sug.alta{border-color:#f2b441}
.aviso{background:#fff7e6;border:1px solid #f2b441;padding:10px;border-radius:8px;font-size:13px}
.barrash .bh-fila{display:grid;grid-template-columns:140px 1fr 70px;gap:8px;align-items:center;margin:4px 0}.bh-bar{background:#e6ebf2;height:10px;border-radius:5px;overflow:hidden;display:block}.bh-bar i{display:block;height:100%}
@media print{header{-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{page-break-after:avoid}}
</style></head><body>
<header><div class="wrap"><h1>${esc(t("inf.titulo"))}: ${esc(propia.nombre)}</h1><p>${esc(fmt.fechaLarga(filtros.desde))} – ${esc(fmt.fechaLarga(filtros.hasta))} · MV Marketing Digital</p></div></header>
<div class="wrap">
${ds.meta.sintetico ? `<p class="aviso">${esc(t("inf.avisoSintetico"))}</p>` : ""}
<h2>${esc(t("inf.kpis"))}</h2>
<div class="kpis">
<div class="kpi"><span>${esc(t("kpi.seguidores"))}</span><b>${fmt.entero(k.seguidores)}</b><span>${esc(fmt.delta(k.deltas.seguidores))}</span></div>
<div class="kpi"><span>${esc(t("kpi.alcance"))}</span><b>${fmt.corto(k.alcance)}</b><span>${esc(fmt.delta(k.deltas.alcance))}</span></div>
<div class="kpi"><span>${esc(t("kpi.er"))}</span><b>${fmt.pct(k.er)}</b><span>${esc(fmt.delta(k.deltas.er))}</span></div>
<div class="kpi"><span>${esc(t("kpi.clics"))}</span><b>${fmt.entero(k.clics)}</b><span>${esc(fmt.delta(k.deltas.clics))}</span></div>
<div class="kpi"><span>${esc(t("kpi.publicaciones"))}</span><b>${fmt.entero(k.publicaciones)}</b></div>
<div class="kpi"><span>${esc(t("esc.neto"))}</span><b>${e.sentimientoNeto > 0 ? "+" : ""}${e.sentimientoNeto}</b><span>${fmt.entero(e.total)} ${esc(t("esc.menciones"))}</span></div>
</div>
<h2>${esc(t("inf.sugerencias"))}</h2>
${s.map((x) => { const tx = textoSugerencia(t, x); return `<div class="sug ${x.prioridad}"><b>[${esc(t("prio." + x.prioridad))} · ${x.score}] ${esc(tx.titulo)}</b><br>${esc(tx.detalle)}<br><i>→ ${esc(tx.accion)}</i></div>`; }).join("")}
<h2>${esc(t("comp.benchmark"))}</h2>
<table><tr><th>${esc(t("col.marca"))}</th><th>${esc(t("kpi.seguidores"))}</th><th>${esc(t("kpi.crecimiento"))}</th><th>ER</th><th>${esc(t("col.postsSemana"))}</th><th>${esc(t("col.sovMenciones"))}</th><th>${esc(t("esc.neto"))}</th></tr>
${b.map((x) => fila([`${x.propia ? "<b>" : ""}${esc(x.nombre)}${x.propia ? "</b>" : ""}`, fmt.entero(x.seguidores), fmt.pct(x.crecimiento), fmt.pct(x.er), fmt.dec(x.porSemana), fmt.pct(x.sovMenciones), x.sentimientoNeto])).join("")}</table>
<h2>${esc(t("rank.titulo"))}</h2>
<table><tr><th>${esc(t("col.red"))}</th><th>${esc(t("rank.grado"))}</th><th>#</th><th>${esc(t("kpi.seguidores"))}</th><th>${esc(t("rank.ganancia30"))}</th><th>ER</th></tr>
${r.map((x) => fila([esc(REDES[x.red].nombre), `<b>${esc(x.grado)}</b>`, `${x.rankSeguidores}/${x.totalRed}`, fmt.entero(x.seguidores), fmt.signo(x.ganancia30), fmt.pct(x.er)])).join("")}</table>
<h2>${esc(t("nav.escucha"))}</h2>
${barrasH(e.temas.slice(0, 6).map((x) => ({ etiqueta: x.tema, valor: x.veces })), { formato: fmt.entero })}
${e.alertas.map((a) => `<p class="aviso">⚠ ${esc(t("esc.alerta", { ciudad: (a.ciudad || "").split("|")[1] || "—", tema: a.tema || "—", z: a.z }))}</p>`).join("")}
<p style="color:#586a80;font-size:12px;margin-top:32px">${esc(t("inf.pie"))}</p>
</div></body></html>`;
}

export function render(ctx) {
  const { t } = ctx;
  return `
  <div class="grid g-2">
    ${panel(t("inf.ejecutivo"), `<p>${esc(t("inf.ejecutivoDesc"))}</p>
      <div class="botones"><button class="btn-primario" data-accion="descargarInforme">${esc(t("inf.descargar"))}</button>
      <button class="btn-ghost" data-accion="verInforme">${esc(t("inf.ver"))}</button></div>`)}
    ${panel(t("inf.csv"), `<p>${esc(t("inf.csvDesc"))}</p><div class="botones">${Object.keys(EXPORTABLES).map((k) => `<button class="btn-ghost" data-accion="exportarCsv" data-k="${k}">${esc(t("inf.exp." + k))}</button>`).join("")}</div>`)}
  </div>
  <div id="vistaInforme"></div>`;
}

function nombreArchivo(ctx, ext) {
  const slug = ctx.propia.nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");
  return `informe-${slug}-${ctx.filtros.hasta}.${ext}`;
}

export const acciones = {
  descargarInforme: (ctx) => ctx.plataforma.guardarArchivo(nombreArchivo(ctx, "html"), informeHtml(ctx), "text/html"),
  verInforme: (ctx) => {
    const cont = document.getElementById("vistaInforme");
    const iframe = document.createElement("iframe");
    iframe.className = "iframe-informe";
    iframe.setAttribute("sandbox", "allow-modals");
    iframe.srcdoc = informeHtml(ctx);
    cont.replaceChildren(iframe);
  },
  exportarCsv: (ctx, el) => ctx.plataforma.guardarArchivo(`${el.dataset.k}-${ctx.filtros.hasta}.csv`, EXPORTABLES[el.dataset.k](ctx.ds, ctx.filtros), "text/csv"),
};
