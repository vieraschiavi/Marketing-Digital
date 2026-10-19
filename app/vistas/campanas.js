// © 2026 Martín Viera. Todos los derechos reservados.
// Campañas y ROI (estilo HubSpot): rendimiento por campaña, embudo,
// conversiones e ingresos ESTIMADOS con parámetros del usuario, y UTM.

import { rendimientoCampana, construirUtm } from "../../core/campanas.js";
import { IDS_REDES, REDES } from "../../core/catalogo.js";
import { embudo, esc } from "../graficos.js";
import { panel, tabla } from "./comun.js";

export function render(ctx) {
  const { ds, t, fmt, estado } = ctx;
  const campanas = (estado.campanas || []).map((c) => rendimientoCampana(ds, c));
  const sel = campanas.find((c) => c.id === estado.ui.campanaSel) || campanas[0];
  const temas = [...new Set(ds.posts.filter((p) => p.marca === ctx.propia.id && p.tema).map((p) => p.tema))];
  const utm = estado.ui.utm || { base: "https://", fuente: "instagram", campana: sel?.nombre || "" };
  let urlUtm = "", errUtm = "";
  try {
    if (utm.base && utm.base !== "https://") urlUtm = construirUtm(utm.base, utm);
  } catch (e) {
    errUtm = t("camp.urlInvalida");
  }
  const tablaC = tabla([
    { t: t("camp.nombre"), v: (c) => `<b>${esc(c.nombre)}</b>` },
    { t: t("col.publicaciones"), v: (c) => fmt.entero(c.publicaciones), num: true },
    { t: t("col.alcance"), v: (c) => fmt.corto(c.alcance), num: true },
    { t: "ER", v: (c) => fmt.pct(c.er), num: true },
    { t: t("kpi.clics"), v: (c) => fmt.entero(c.clics), num: true },
    { t: t("camp.inversion"), v: (c) => fmt.entero(c.inversion), num: true },
    { t: "CPA*", v: (c) => (c.cpa == null ? "—" : fmt.dec(c.cpa)), num: true },
    { t: "ROI*", v: (c) => (c.roi == null ? "—" : `<span class="${c.roi >= 0 ? "sube" : "baja"}">${fmt.pct(c.roi)}</span>`), num: true },
    { t: "", v: (c) => `<button class="btn-ghost chico" data-accion="quitarCampana" data-id="${esc(c.id)}">✕</button>` },
  ], campanas, { accionFila: (c) => `data-accion="elegirCampana" data-id="${esc(c.id)}"`, claseFila: (c) => (c.id === sel?.id ? "fila-propia" : "") });

  const form = `
  <div class="fila-form">
    <label>${esc(t("camp.nombre"))}<input id="cNombre" placeholder="${esc(t("camp.nombreEj"))}"></label>
    <label>${esc(t("col.tema"))}<select id="cTema">${temas.map((x) => `<option>${esc(x)}</option>`).join("")}</select></label>
    <label>${esc(t("camp.desde"))}<input type="date" id="cDesde" value="${ds.meta.fin.slice(0, 8)}01"></label>
    <label>${esc(t("camp.hasta"))}<input type="date" id="cHasta" value="${ds.meta.fin}"></label>
  </div>
  <div class="fila-form">
    <label>${esc(t("col.red"))}<select id="cRed"><option value="">${esc(t("fil.todasRedes"))}</option>${IDS_REDES.map((r) => `<option value="${r}">${esc(REDES[r].nombre)}</option>`).join("")}</select></label>
    <label>${esc(t("camp.inversion"))}<input type="number" id="cInv" min="0" value="10000"></label>
    <label>${esc(t("camp.tasa"))}<input type="number" id="cTasa" min="0" step="0.1" value="2.5"></label>
    <label>${esc(t("camp.ticket"))}<input type="number" id="cTicket" min="0" value="500"></label>
  </div>
  <button class="btn-primario" data-accion="crearCampana">${esc(t("camp.crear"))}</button>`;

  return `
  ${panel(t("camp.lista"), tablaC + `<p class="muted">* ${esc(t("camp.estimadoNota"))}</p>`)}
  ${sel ? `<div class="grid g-2">
    ${panel(t("camp.embudo", { nombre: sel.nombre }), embudo(sel.embudo.map((e) => ({ etiqueta: t("camp.etapa." + e.etapa), valor: e.valor })), { formato: fmt.corto }))}
    ${panel(t("camp.detalle"), `<div class="mini-kpis seis">
      <div><b>${fmt.entero(sel.conversionesEstimadas)}</b><span>${esc(t("camp.conversiones"))}*</span></div>
      <div><b>${fmt.corto(sel.ingresosEstimados)}</b><span>${esc(t("camp.ingresos"))}*</span></div>
      <div><b>${sel.cpc == null ? "—" : fmt.dec2(sel.cpc)}</b><span>CPC</span></div>
      <div><b>${fmt.pct(sel.ctr)}</b><span>CTR</span></div>
      <div><b>${esc(fmt.fecha(sel.desde))}</b><span>${esc(t("camp.desde"))}</span></div>
      <div><b>${esc(fmt.fecha(sel.hasta))}</b><span>${esc(t("camp.hasta"))}</span></div></div>
      <p class="muted">${esc(t("camp.parametros", { tasa: sel.tasaConversion, ticket: sel.ticket }))}</p>`)}
  </div>` : ""}
  <div class="grid g-2">
    ${panel(t("camp.nueva"), form)}
    ${panel(t("camp.utm"), `<div class="fila-form"><label>URL<input data-cambio="utm" data-campo="base" value="${esc(utm.base)}"></label>
      <label>utm_source<input data-cambio="utm" data-campo="fuente" value="${esc(utm.fuente)}"></label>
      <label>utm_campaign<input data-cambio="utm" data-campo="campana" value="${esc(utm.campana)}"></label>
      <label>utm_content<input data-cambio="utm" data-campo="contenido" value="${esc(utm.contenido || "")}"></label></div>
      ${errUtm ? `<p class="baja">${esc(errUtm)}</p>` : urlUtm ? `<code class="utm">${esc(urlUtm)}</code> <button class="btn-ghost chico" data-accion="copiarUtm">⧉ ${esc(t("plan.copiar"))}</button>` : `<p class="muted">${esc(t("camp.utmAyuda"))}</p>`}`)}
  </div>`;
}

export const acciones = {
  elegirCampana: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, campanaSel: el.dataset.id } }),
  quitarCampana: (ctx, el) => ctx.actualizar({ campanas: ctx.estado.campanas.filter((c) => c.id !== el.dataset.id) }),
  crearCampana: (ctx) => {
    const v = (id) => document.getElementById(id).value;
    const nombre = v("cNombre").trim();
    if (!nombre) throw new Error(ctx.t("camp.faltaNombre"));
    if (v("cDesde") > v("cHasta")) throw new Error(ctx.t("camp.fechasInvalidas"));
    const c = { id: "c" + Date.now().toString(36), nombre, tema: v("cTema"), desde: v("cDesde"), hasta: v("cHasta"), redes: v("cRed") ? [v("cRed")] : [], inversion: Number(v("cInv")) || 0, tasaConversion: Number(v("cTasa")) || 0, ticket: Number(v("cTicket")) || 0 };
    ctx.actualizar({ campanas: [...ctx.estado.campanas, c], ui: { ...ctx.estado.ui, campanaSel: c.id } });
  },
  copiarUtm: async (ctx) => {
    await navigator.clipboard?.writeText(document.querySelector("code.utm").textContent);
    ctx.toast(ctx.t("plan.copiado"));
  },
};

export const cambios = {
  utm: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, utm: { ...(ctx.estado.ui.utm || { base: "https://", fuente: "instagram" }), [el.dataset.campo]: el.value } } }),
};
