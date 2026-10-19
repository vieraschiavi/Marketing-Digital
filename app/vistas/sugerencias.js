// © 2026 Martín Viera. Todos los derechos reservados.
// Sugerencias priorizadas del motor de reglas (sin IA), con evidencia y fórmula.

import { esc } from "../graficos.js";
import { tarjetaSugerencia, accionesSugerencia, chipPrioridad } from "./comun.js";

export function render(ctx) {
  const { t, estado } = ctx;
  const todas = ctx.sugerencias().filter((s) => s.tipo !== "error");
  const filtro = estado.ui.sugPrio || "";
  const verHechas = !!estado.ui.sugHechas;
  const lista = todas.filter((s) => (!filtro || s.prioridad === filtro) && (verHechas || !estado.hechas[s.id]));
  const conteo = (p) => todas.filter((s) => s.prioridad === p).length;
  const errores = ctx.sugerencias().filter((s) => s.tipo === "error");
  return `
  <div class="barra-sug">
    <div class="seg chico"><button class="${!filtro ? "on" : ""}" data-accion="sugPrio" data-v="">${esc(t("fil.todos"))} (${todas.length})</button>
    ${["urgente", "alta", "media", "baja"].map((p) => `<button class="${filtro === p ? "on" : ""}" data-accion="sugPrio" data-v="${p}">${esc(t("prio." + p))} (${conteo(p)})</button>`).join("")}</div>
    <label class="check"><input type="checkbox" data-cambio="sugHechas" ${verHechas ? "checked" : ""}> ${esc(t("sug.verHechas"))}</label>
  </div>
  <p class="muted">${esc(t("sug.intro"))} ${["urgente", "alta", "media", "baja"].map((p) => chipPrioridad(t, p)).join(" ")}</p>
  <div class="grid-sug">${lista.map((s) => tarjetaSugerencia(ctx, s)).join("") || `<p class="muted">${esc(t("sug.ninguna"))}</p>`}</div>
  ${errores.length ? `<details class="muted"><summary>${esc(t("sug.reglasConError", { n: errores.length }))}</summary><pre>${esc(JSON.stringify(errores.map((e) => e.vars), null, 2))}</pre></details>` : ""}`;
}

export const acciones = {
  ...accionesSugerencia,
  sugPrio: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, sugPrio: el.dataset.v } }),
};
export const cambios = {
  sugHechas: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, sugHechas: el.checked } }),
};
