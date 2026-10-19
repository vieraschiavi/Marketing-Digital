// © 2026 Martín Viera. Todos los derechos reservados.
// Planificador (estilo Buffer / Hootsuite): redactor con validación en vivo por
// red, horarios sugeridos por los datos, calendario semanal/mensual y cola.

import { validarPost, horariosSugeridos, proximaFecha, agregarACola, quitarDeCola, actualizarEnCola, calendario, colaACsv } from "../../core/planificador.js";
import { REDES, IDS_REDES } from "../../core/catalogo.js";
import { esc } from "../graficos.js";
import { panel, red } from "./comun.js";

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

export function render(ctx) {
  const { ds, t, fmt, estado } = ctx;
  const b = estado.ui.borrador || { red: "instagram", texto: "" };
  const redSel = REDES[b.red] ? b.red : "instagram";
  const v = validarPost(b.texto, redSel, { tieneMedia: !!b.media });
  const sugeridos = horariosSugeridos(ds, redSel, 3);
  const dias = t("dias.cortos").split(",");
  const fechaDef = b.fecha || (sugeridos[0] ? proximaFecha(hoyIso(), sugeridos[0].dia, b.hora ?? sugeridos[0].hora) : `${hoyIso()}T20:00`);
  const modo = estado.ui.calModo || "semana";
  const ref = estado.ui.calRef || hoyIso();
  const cal = calendario(estado.cola, ref, modo);
  const campanas = estado.campanas || [];

  const mensajes = [...v.errores.map((e) => `<li class="err">✕ ${esc(t(e.clave, e.vars))}</li>`), ...v.avisos.map((a) => `<li class="aviso">! ${esc(t(a.clave, a.vars))}</li>`)].join("");
  const redactor = `
    <div class="redactor">
      <div class="fila-form">
        <label>${esc(t("col.red"))}<select data-cambio="borrador" data-campo="red">${IDS_REDES.map((r) => `<option value="${r}" ${r === redSel ? "selected" : ""}>${esc(REDES[r].nombre)}</option>`).join("")}</select></label>
        <label>${esc(t("plan.fecha"))}<input type="datetime-local" value="${esc(fechaDef)}" data-cambio="borrador" data-campo="fecha"></label>
        <label>${esc(t("plan.campana"))}<select data-cambio="borrador" data-campo="campana"><option value="">—</option>${campanas.map((c) => `<option value="${esc(c.id)}" ${b.campana === c.id ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></label>
        <label class="check"><input type="checkbox" data-cambio="borrador" data-campo="media" ${b.media ? "checked" : ""}> ${esc(t("plan.conMedia"))}</label>
      </div>
      <textarea id="textoBorrador" rows="6" data-cambio="borrador" data-campo="texto" placeholder="${esc(t("plan.placeholder"))}">${esc(b.texto)}</textarea>
      <div class="contador ${v.largo > v.limite ? "baja" : ""}">${v.largo} / ${v.limite} · ${v.hashtags} #</div>
      <ul class="validacion">${mensajes || `<li class="ok">✓ ${esc(t("plan.ok"))}</li>`}</ul>
      <div class="sugeridos">${esc(t("plan.sugeridos"))}: ${sugeridos.map((s) => `<button class="chip" data-accion="usarHorario" data-dia="${s.dia}" data-hora="${s.hora}">${esc(dias[s.dia])} ${s.hora}:00 · ER ${fmt.pct(s.er)}</button>`).join(" ") || "—"}</div>
      <div class="botones">
        <button class="btn-primario" data-accion="programar" ${v.ok ? "" : "disabled"}>${esc(t("plan.programar"))}</button>
        <button class="btn-ghost" data-accion="redactarIA">✦ ${esc(t("plan.redactarIA"))}</button>
        <button class="btn-ghost" data-accion="limpiarBorrador">${esc(t("plan.limpiar"))}</button>
      </div>
      <p class="muted">${esc(t("plan.nota"))}</p>
    </div>`;

  const nombresDias = [1, 2, 3, 4, 5, 6, 0].map((d) => dias[d]);
  const calendarioHtml = `
    <div class="cal ${modo}">
      ${nombresDias.map((d) => `<div class="cal-cab">${esc(d)}</div>`).join("")}
      ${cal.map((d) => `<div class="cal-dia ${d.mesActual ? "" : "fuera"} ${d.fecha === hoyIso() ? "hoy" : ""}"><span class="cal-n">${Number(d.fecha.slice(8))}</span>
        ${d.items.map((x) => `<div class="cal-item" style="--c:${REDES[x.red].color}" title="${esc(x.texto)}">${esc(x.fecha.slice(11, 16))} ${esc(REDES[x.red].nombre)}</div>`).join("")}</div>`).join("")}
    </div>`;
  const navCal = `<div class="seg chico"><button data-accion="calMover" data-d="-1">‹</button><button class="${modo === "semana" ? "on" : ""}" data-accion="calModo" data-m="semana">${esc(t("plan.semana"))}</button><button class="${modo === "mes" ? "on" : ""}" data-accion="calModo" data-m="mes">${esc(t("plan.mes"))}</button><button data-accion="calMover" data-d="1">›</button></div>`;

  const cola = estado.cola.length ? `<ul class="lista-cola">${estado.cola.map((x) => `<li>${red(x.red)} <b>${esc(fmt.fechaHora(x.fecha))}</b> <span class="trunc">${esc(x.texto)}</span>
      <select data-cambio="estadoCola" data-id="${esc(x.id)}">${["borrador", "programado", "publicado"].map((s) => `<option value="${s}" ${x.estado === s ? "selected" : ""}>${esc(t("plan.estado." + s))}</option>`).join("")}</select>
      <button class="btn-ghost chico" data-accion="copiarCola" data-id="${esc(x.id)}" title="${esc(t("plan.copiar"))}">⧉</button>
      <button class="btn-ghost chico" data-accion="quitarCola" data-id="${esc(x.id)}" title="${esc(t("plan.quitar"))}">✕</button></li>`).join("")}</ul>
      <button class="btn-ghost chico" data-accion="exportarCola">${esc(t("plan.exportar"))}</button>` : `<p class="muted">${esc(t("res.colaVacia"))}</p>`;

  return `
  <div class="grid g-1-1">
    ${panel(t("plan.redactor"), redactor)}
    ${panel(t("plan.calendario"), calendarioHtml, { extra: navCal })}
  </div>
  ${panel(t("plan.cola", { n: estado.cola.length }), cola)}`;
}

function borrador(ctx) {
  return { red: "instagram", texto: "", ...(ctx.estado.ui.borrador || {}) };
}

export const cambios = {
  borrador: (ctx, el) => {
    const campo = el.dataset.campo;
    const valor = el.type === "checkbox" ? el.checked : el.value;
    const b = { ...borrador(ctx), [campo]: valor };
    // Al escribir no se re-renderiza todo (perdería el foco): se actualiza el estado
    // y el contador/validación con un render diferido.
    ctx.estado.ui = { ...ctx.estado.ui, borrador: b };
    if (campo === "texto") return;
    ctx.actualizar({});
  },
  estadoCola: (ctx, el) => ctx.actualizar({ cola: actualizarEnCola(ctx.estado.cola, el.dataset.id, { estado: el.value }) }),
};

export function montar(ctx, raiz) {
  const ta = raiz.querySelector("#textoBorrador");
  if (!ta) return;
  let timer;
  ta.addEventListener("input", () => {
    ctx.estado.ui = { ...ctx.estado.ui, borrador: { ...borrador(ctx), texto: ta.value } };
    clearTimeout(timer);
    timer = setTimeout(() => {
      const pos = ta.selectionStart;
      ctx.actualizar({});
      const nuevo = document.getElementById("textoBorrador");
      if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(pos, pos); }
    }, 450);
  });
}

export const acciones = {
  usarHorario: (ctx, el) => {
    const f = proximaFecha(hoyIso(), Number(el.dataset.dia), Number(el.dataset.hora));
    ctx.actualizar({ ui: { ...ctx.estado.ui, borrador: { ...borrador(ctx), fecha: f } } });
  },
  programar: (ctx) => {
    const b = borrador(ctx);
    const fecha = document.querySelector('[data-campo="fecha"]')?.value || b.fecha;
    const cola = agregarACola(ctx.estado.cola, { red: b.red, texto: b.texto, fecha, campana: b.campana || null, tieneMedia: !!b.media });
    ctx.toast(ctx.t("plan.programado"));
    ctx.actualizar({ cola, ui: { ...ctx.estado.ui, borrador: { red: b.red, texto: "" } } });
  },
  limpiarBorrador: (ctx) => ctx.actualizar({ ui: { ...ctx.estado.ui, borrador: { red: borrador(ctx).red, texto: "" } } }),
  redactarIA: (ctx) => {
    const b = borrador(ctx);
    ctx.actualizar({ vista: "asistente", ui: { ...ctx.estado.ui, preguntaPendiente: ctx.t("ia.redactar", { red: REDES[b.red].nombre, limite: REDES[b.red].limite, idea: b.texto || ctx.t("ia.ideaLibre") }) } });
  },
  quitarCola: (ctx, el) => ctx.actualizar({ cola: quitarDeCola(ctx.estado.cola, el.dataset.id) }),
  copiarCola: async (ctx, el) => {
    const x = ctx.estado.cola.find((c) => c.id === el.dataset.id);
    await navigator.clipboard?.writeText(x.texto);
    ctx.toast(ctx.t("plan.copiado"));
  },
  exportarCola: (ctx) => ctx.plataforma.guardarArchivo("cola-publicaciones.csv", colaACsv(ctx.estado.cola), "text/csv"),
  calModo: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, calModo: el.dataset.m } }),
  calMover: (ctx, el) => {
    const modo = ctx.estado.ui.calModo || "semana";
    const ref = new Date((ctx.estado.ui.calRef || hoyIso()) + "T00:00:00Z");
    if (modo === "mes") ref.setUTCMonth(ref.getUTCMonth() + Number(el.dataset.d));
    else ref.setUTCDate(ref.getUTCDate() + 7 * Number(el.dataset.d));
    ctx.actualizar({ ui: { ...ctx.estado.ui, calRef: ref.toISOString().slice(0, 10) } });
  },
};
