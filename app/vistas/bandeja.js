// © 2026 Martín Viera. Todos los derechos reservados.
// Bandeja unificada (estilo Sprout Social): mensajes, comentarios y menciones
// que piden respuesta, ordenados por urgencia, con respuesta sugerida.

import { bandeja, tiempoRespuesta } from "../../core/escucha.js";
import { esc } from "../graficos.js";
import { panel, red } from "./comun.js";

function respuestaSugerida(t, m, marca) {
  if (m.sent.etiqueta === "negativo") return t("bdj.resp.negativo", { autor: m.autor, marca });
  if (/\?/.test(m.texto)) return t("bdj.resp.pregunta", { autor: m.autor, marca });
  return t("bdj.resp.positivo", { autor: m.autor, marca });
}

export function render(ctx) {
  const { ds, t, fmt, filtros, estado, propia } = ctx;
  const hechas = estado.hechas;
  const items = bandeja(ds, { ...filtros, marcas: [propia.id] }).map((m) => ({ ...m, respondida: m.respondida || !!hechas["resp-" + m.id] }));
  const tr = tiempoRespuesta(ds, { ...filtros, marcas: [propia.id] });
  const pestaña = estado.ui.bdjTab || "pendientes";
  const lista = items.filter((m) => (pestaña === "pendientes" ? !m.respondida : pestaña === "negativas" ? m.sent.etiqueta === "negativo" : true)).slice(0, 60);
  const pendientes = items.filter((m) => !m.respondida).length;
  const tabs = `<div class="seg chico">${["pendientes", "negativas", "todas"].map((x) => `<button class="${pestaña === x ? "on" : ""}" data-accion="bdjTab" data-v="${x}">${esc(t("bdj." + x))}</button>`).join("")}</div>`;
  return `
  <div class="kpis cuatro">
    <div class="kpi"><span class="kpi-et">${esc(t("bdj.pendientes"))}</span><b class="kpi-v ${pendientes ? "baja" : "sube"}">${fmt.entero(pendientes)}</b></div>
    <div class="kpi"><span class="kpi-et">${esc(t("bdj.tasa"))}</span><b class="kpi-v">${fmt.pct(tr.tasa)}</b></div>
    <div class="kpi"><span class="kpi-et">${esc(t("bdj.mediana"))}</span><b class="kpi-v">${tr.medianaMin == null ? "—" : fmt.dec(tr.medianaMin / 60) + " h"}</b></div>
    <div class="kpi"><span class="kpi-et">${esc(t("bdj.requieren"))}</span><b class="kpi-v">${fmt.entero(tr.requieren)}</b></div>
  </div>
  ${panel(t("nav.bandeja"), `<ul class="menciones bandeja">${lista.map((m) => `
    <li class="mencion ${m.sent.etiqueta} ${m.respondida ? "hecha" : ""}">
      <div class="men-cab">${red(m.red)} <span class="pill gris">${esc(t("bdj.tipo." + m.tipo))}</span> <b>${esc(m.autor)}</b>
      <span class="muted">${esc(fmt.fechaHora(m.fecha))} · ${esc(t("bdj.espera", { h: fmt.dec(m.esperaHoras) }))}</span>
      <span class="pill ${m.urgencia > 3 ? "rojo" : m.urgencia > 2 ? "ambar" : "gris"}" title="${esc(t("bdj.urgenciaAyuda"))}">${esc(t("bdj.urgencia"))} ${fmt.dec(m.urgencia)}</span></div>
      <p>${esc(m.texto)}</p>
      ${m.respondida ? `<small class="sube">✓ ${esc(t("bdj.respondida"))}</small>` : `<div class="respuesta"><textarea rows="2" id="resp-${esc(m.id)}">${esc(respuestaSugerida(t, m, propia.nombre))}</textarea>
      <div class="botones"><button class="btn-ghost chico" data-accion="copiarResp" data-id="${esc(m.id)}">⧉ ${esc(t("plan.copiar"))}</button><button class="btn-primario chico" data-accion="marcarResp" data-id="${esc(m.id)}">${esc(t("bdj.marcar"))}</button></div></div>`}
    </li>`).join("") || `<p class="muted">${esc(t("bdj.vacia"))}</p>`}</ul>`, { extra: tabs })}
  <p class="muted nota">${esc(t("bdj.nota"))}</p>`;
}

export const acciones = {
  bdjTab: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, bdjTab: el.dataset.v } }),
  marcarResp: (ctx, el) => ctx.actualizar({ hechas: { ...ctx.estado.hechas, ["resp-" + el.dataset.id]: new Date().toISOString() } }),
  copiarResp: async (ctx, el) => {
    const ta = document.getElementById("resp-" + el.dataset.id);
    await navigator.clipboard?.writeText(ta.value);
    ctx.toast(ctx.t("plan.copiado"));
  },
};
