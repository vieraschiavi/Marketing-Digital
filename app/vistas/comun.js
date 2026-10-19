// © 2026 Martín Viera. Todos los derechos reservados.
//
// Piezas de UI compartidas por las vistas: tarjetas KPI, tablas, semáforo y la
// redacción trilingüe de las sugerencias del motor.

import { esc, sparkline } from "../graficos.js";
import { REDES } from "../../core/catalogo.js";

export function kpi(etiqueta, valor, deltaVal, { fmt, spark = null, invertir = false, ayuda = "" } = {}) {
  let clase = "neutro";
  if (deltaVal != null && Math.abs(deltaVal) >= 0.5) clase = (deltaVal > 0) !== invertir ? "sube" : "baja";
  return `<div class="kpi" ${ayuda ? `title="${esc(ayuda)}"` : ""}>
    <span class="kpi-et">${esc(etiqueta)}</span>
    <b class="kpi-v">${esc(valor)}</b>
    <span class="kpi-d ${clase}">${deltaVal == null ? "&nbsp;" : esc(fmt.delta(deltaVal))}</span>
    ${spark ? sparkline(spark) : ""}
  </div>`;
}

export function panel(titulo, contenido, { extra = "", clase = "", ayuda = "" } = {}) {
  return `<div class="panel ${clase}"><div class="panel-cab"><h3>${esc(titulo)}${ayuda ? ` <span class="ayuda" title="${esc(ayuda)}">?</span>` : ""}</h3>${extra}</div>${contenido}</div>`;
}

/** Tabla genérica. columnas: [{t: título, v: (fila) => html, num?: bool}] — v devuelve HTML ya escapado. */
export function tabla(columnas, filas, { vacio = "—", claseFila = null, accionFila = null } = {}) {
  if (!filas.length) return `<p class="muted">${esc(vacio)}</p>`;
  return `<div class="tabla-wrap"><table class="tabla"><thead><tr>${columnas.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.t)}</th>`).join("")}</tr></thead>
  <tbody>${filas.map((f) => `<tr class="${claseFila ? claseFila(f) : ""}" ${accionFila ? accionFila(f) : ""}>${columnas.map((c) => `<td class="${c.num ? "num" : ""}">${c.v(f)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export const punto = (color) => `<i class="punto" style="background:${color}"></i>`;
export const red = (id) => `<span class="red-tag" style="--c:${REDES[id]?.color || "#888"}">${esc(REDES[id]?.nombre || id)}</span>`;

export function semaforoHtml(estado, texto) {
  return `<span class="sem ${estado}">${esc(texto)}</span>`;
}

const PRIO_COLOR = { urgente: "rojo", alta: "ambar", media: "azul", baja: "gris" };
export const chipPrioridad = (t, p) => `<span class="pill ${PRIO_COLOR[p]}">${esc(t("prio." + p))}</span>`;

/** Variables de una sugerencia, con nombres legibles (red, formato) en el idioma. */
function varsLegibles(t, s) {
  const v = { ...s.vars };
  if (v.red) v.red = REDES[v.red]?.nombre || v.red;
  for (const k of ["mejor", "usado", "formato"]) if (v[k]) v[k] = t("fmt." + v[k]);
  return v;
}

export function textoSugerencia(t, s) {
  const v = varsLegibles(t, s);
  return {
    titulo: t(`sug.${s.tipo}.titulo`, v),
    detalle: t(`sug.${s.tipo}.detalle`, v),
    accion: t(`sug.${s.tipo}.accion`, v),
  };
}

export function tarjetaSugerencia(ctx, s, { compacta = false } = {}) {
  const { t } = ctx;
  const tx = textoSugerencia(t, s);
  const hecha = ctx.estado.hechas[s.id];
  return `<article class="sug ${s.prioridad} ${hecha ? "hecha" : ""}">
    <div class="sug-cab">${chipPrioridad(t, s.prioridad)}<span class="sug-score" title="${esc(t("sug.formula"))}">${esc(t("sug.score"))} ${s.score}</span></div>
    <h4>${esc(tx.titulo)}</h4>
    ${compacta ? "" : `<p>${esc(tx.detalle)}</p>
    <p class="sug-accion">→ ${esc(tx.accion)}</p>
    <details><summary>${esc(t("sug.evidencia"))}</summary><code>${esc(JSON.stringify({ ...s.vars, ...s.evidencia, impacto: s.impacto, probabilidad: s.probabilidad, esfuerzo: s.esfuerzo }))}</code></details>
    <div class="sug-botones">
      <button class="btn-ghost chico" data-accion="sugHecha" data-id="${esc(s.id)}">${esc(hecha ? t("sug.deshacer") : t("sug.hecha"))}</button>
      <button class="btn-ghost chico" data-accion="sugPreguntar" data-id="${esc(s.id)}">✦ ${esc(t("sug.preguntar"))}</button>
      ${["horario", "formato", "idea", "tendencia", "frecuencia"].includes(s.tipo) ? `<button class="btn-ghost chico" data-accion="sugPlanificar" data-id="${esc(s.id)}">${esc(t("sug.planificar"))}</button>` : ""}
    </div>`}
  </article>`;
}

/** Acciones de sugerencias reutilizables desde varias vistas. */
export const accionesSugerencia = {
  sugHecha: (ctx, el) => {
    const h = { ...ctx.estado.hechas };
    if (h[el.dataset.id]) delete h[el.dataset.id];
    else h[el.dataset.id] = new Date().toISOString();
    ctx.actualizar({ hechas: h });
  },
  sugPreguntar: (ctx, el) => {
    const s = ctx.sugerencias().find((x) => x.id === el.dataset.id);
    if (!s) return;
    const tx = textoSugerencia(ctx.t, s);
    ctx.actualizar({ vista: "asistente", ui: { ...ctx.estado.ui, preguntaPendiente: ctx.t("ia.sobreSugerencia", { titulo: tx.titulo }) } });
  },
  sugPlanificar: (ctx, el) => {
    const s = ctx.sugerencias().find((x) => x.id === el.dataset.id);
    if (!s) return;
    const borrador = { red: s.vars.red && REDES[s.vars.red] ? s.vars.red : "instagram", texto: s.vars.hashtag ? `${s.vars.hashtag} ` : s.vars.tema ? `${s.vars.tema} — ` : "", hora: s.vars.mejorHora ?? null };
    ctx.actualizar({ vista: "planificador", ui: { ...ctx.estado.ui, borrador } });
  },
};

export function marcasFiltro(ctx) {
  return ctx.filtros.marcas?.length ? ctx.filtros.marcas : [ctx.propia.id];
}
