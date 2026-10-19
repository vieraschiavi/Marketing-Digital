// © 2026 Martín Viera. Todos los derechos reservados.
// Escucha social (estilo Hootsuite / Sprout): volumen y sentimiento, alertas
// de pico con causa probable, temas, hashtags, palabras y menciones con la
// explicación de por qué cada una se clasificó así.

import { analizarMenciones } from "../../core/escucha.js";
import { lineas, barrasH, esc } from "../graficos.js";
import { panel, red, marcasFiltro } from "./comun.js";

const COLOR_SENT = { positivo: "#82C544", neutro: "#9db0c8", negativo: "#e05c5c" };

export function itemMencion(ctx, m) {
  const { t, fmt } = ctx;
  return `<li class="mencion ${m.sent.etiqueta}">
    <div class="men-cab">${red(m.red)} <b>${esc(m.autor)}</b> <span class="muted">→ ${esc(ctx.nombreMarca(m.marca))} · ${esc(fmt.fechaHora(m.fecha))} · ${esc((m.ciudad || "").split("|")[1] || "")} · ${esc(t("esc.alcance"))} ${fmt.corto(m.alcance)}</span>
    <span class="pill" style="--c:${COLOR_SENT[m.sent.etiqueta]}">${esc(t("sent." + m.sent.etiqueta))} ${m.sent.score > 0 ? "+" : ""}${m.sent.score}</span></div>
    <p>${esc(m.texto)}</p>
    ${m.sent.motivos.length ? `<small class="muted">${esc(t("esc.porque"))}: ${m.sent.motivos.map((x) => `${esc(x.palabra)} (${x.valor > 0 ? "+" : ""}${x.valor})`).join(", ")}</small>` : ""}
  </li>`;
}

export function render(ctx) {
  const { ds, t, fmt, filtros, estado } = ctx;
  const ambito = estado.ui.escuchaAmbito || "propia";
  const marcas = ambito === "todas" ? null : marcasFiltro(ctx);
  const a = analizarMenciones(ds, { ...filtros, marcas });
  const filtroSent = estado.ui.escuchaSent || "";
  const lista = a.menciones.filter((m) => !filtroSent || m.sent.etiqueta === filtroSent).slice(-40).reverse();
  const seg = `<div class="seg chico"><button class="${ambito === "propia" ? "on" : ""}" data-accion="escAmbito" data-v="propia">${esc(t("esc.propia"))}</button><button class="${ambito === "todas" ? "on" : ""}" data-accion="escAmbito" data-v="todas">${esc(t("esc.todas"))}</button></div>`;
  const segSent = `<div class="seg chico">${["", "positivo", "neutro", "negativo"].map((s) => `<button class="${filtroSent === s ? "on" : ""}" data-accion="escSent" data-v="${s}">${esc(s ? t("sent." + s) : t("fil.todos"))}</button>`).join("")}</div>`;

  return `
  <div class="kpis cuatro">
    <div class="kpi"><span class="kpi-et">${esc(t("esc.menciones"))}</span><b class="kpi-v">${fmt.entero(a.total)}</b></div>
    <div class="kpi"><span class="kpi-et">${esc(t("esc.alcancePot"))}</span><b class="kpi-v">${fmt.corto(a.alcance)}</b></div>
    <div class="kpi" title="${esc(t("esc.netoAyuda"))}"><span class="kpi-et">${esc(t("esc.neto"))}</span><b class="kpi-v ${a.sentimientoNeto >= 0 ? "sube" : "baja"}">${a.sentimientoNeto > 0 ? "+" : ""}${a.sentimientoNeto}</b></div>
    <div class="kpi"><span class="kpi-et">${esc(t("esc.negativas"))}</span><b class="kpi-v">${fmt.entero(a.negativo)}</b><span class="kpi-d">${fmt.pct(a.total ? (a.negativo / a.total) * 100 : 0)}</span></div>
  </div>
  ${a.alertas.map((x) => `<div class="alerta grande">⚠ <b>${esc(t("esc.alertaTitulo"))}</b> — ${esc(t("esc.alertaDetalle", { desde: fmt.fecha(x.desde), base: x.mediaBase, reciente: x.mediaReciente, z: x.z, ciudad: (x.ciudad || "").split("|")[1] || "—", pc: Math.round(x.shareCiudad * 100), tema: x.tema || "—", pt: Math.round(x.shareTema * 100) }))}</div>`).join("")}
  <div class="grid g-2-1">
    ${panel(t("esc.evolucion"), lineas(["positivo", "neutro", "negativo"].map((s) => ({ nombre: t("sent." + s), valores: a.serie[s], color: COLOR_SENT[s] })), a.serie.fechas.map(fmt.fecha), { formato: fmt.entero }), { extra: seg })}
    ${panel(t("esc.temas"), barrasH(a.temas.slice(0, 8).map((x) => ({ etiqueta: x.tema, valor: x.veces })), { formato: fmt.entero }))}
  </div>
  <div class="grid g-3">
    ${panel(t("esc.hashtags"), `<div class="nube">${a.hashtags.map((h) => `<span style="font-size:${Math.min(1.6, 0.8 + h.veces / (a.hashtags[0]?.veces || 1) * 0.8)}em">${esc(h.hashtag)}</span>`).join(" ") || "—"}</div>`)}
    ${panel(t("esc.palabras"), `<div class="nube">${a.palabras.map((p) => `<span style="font-size:${Math.min(1.5, 0.8 + p.veces / (a.palabras[0]?.veces || 1) * 0.7)}em">${esc(p.palabra)}</span>`).join(" ") || "—"}</div>`)}
    ${panel(t("esc.ciudadesNeg"), barrasH(a.ciudadesNegativas.slice(0, 6).map((c) => ({ etiqueta: c.ciudad.split("|")[1], valor: c.veces, color: "#e05c5c" })), { formato: fmt.entero }))}
  </div>
  ${panel(t("esc.ultimas"), `<ul class="menciones">${lista.map((m) => itemMencion(ctx, m)).join("") || `<p class="muted">${esc(t("app.sinDatos"))}</p>`}</ul>`, { extra: segSent })}
  `;
}

export const acciones = {
  escAmbito: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, escuchaAmbito: el.dataset.v } }),
  escSent: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, escuchaSent: el.dataset.v } }),
};
