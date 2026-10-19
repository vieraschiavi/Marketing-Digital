// © 2026 Martín Viera. Todos los derechos reservados.
// Asistente IA. Con clave configurada (app de escritorio) pregunta al proveedor
// elegido con el contexto numérico del tablero; sin clave responde el motor
// local (reglas + what-if por lenguaje natural). Siempre dice quién respondió.

import { responderLocal, construirContexto, PROVEEDORES } from "../../core/ia.js";
import { esc } from "../graficos.js";
import { panel, textoSugerencia } from "./comun.js";

const RAPIDAS = ["ia.rap.resumen", "ia.rap.horario", "ia.rap.competencia", "ia.rap.sentimiento", "ia.rap.whatif", "ia.rap.ideas", "ia.rap.tendencias", "ia.rap.plan"];

/** Markdown mínimo y seguro: escapa todo y después aplica negrita, listas y saltos. */
function md(texto) {
  return esc(texto)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/^#{1,3} (.+)$/gm, "<b>$1</b>")
    .replace(/^[-•] (.+)$/gm, "• $1")
    .replace(/\n/g, "<br>");
}

function redactarLocal(ctx, r) {
  const { t, fmt } = ctx;
  if (r.clave === "ia.loc.sugerencias") {
    return t("ia.loc.sugerencias") + "\n" + r.sugerencias.map((s, i) => `${i + 1}. **${textoSugerencia(t, s).titulo}** — ${textoSugerencia(t, s).accion}`).join("\n");
  }
  const v = { ...r.vars };
  if (r.clave === "ia.loc.whatifFrec") {
    Object.assign(v, { actual: fmt.entero(v.interaccionesMesActual), nuevo: fmt.entero(v.interaccionesMesNuevo), bajo: fmt.entero(v.rango.bajo), alto: fmt.entero(v.rango.alto), formato: v.formato ? t("fmt." + v.formato) : t("ia.publicaciones") });
  }
  if (r.clave === "ia.loc.whatifHora" && v.sinDatos) return t("ia.loc.whatifSinDatos");
  return t(r.clave, v);
}

export function render(ctx) {
  const { t, estado } = ctx;
  const ia = estado.ia || {};
  const prov = Object.entries(ia.proveedores || {}).filter(([, p]) => p.tieneClave);
  const activo = ia.activo && ia.proveedores?.[ia.activo]?.tieneClave ? ia.activo : prov[0]?.[0];
  const modelo = activo ? ia.proveedores[activo].modelo : null;
  const estadoIa = activo
    ? `<span class="pill verde">✦ ${esc(PROVEEDORES[activo].nombre)} · ${esc(modelo)}</span> <button class="btn-link" data-accion="ir" data-vista="config">${esc(t("ia.cambiar"))}</button>`
    : `<span class="pill gris">${esc(t("ia.local"))}</span> ${ctx.plataforma.esElectron ? `<button class="btn-link" data-accion="ir" data-vista="config">${esc(t("ia.configurar"))}</button>` : `<span class="muted">${esc(t("ia.soloEscritorio"))}</span>`}`;
  const chat = estado.chat.slice(-30);
  return `
  ${panel(t("nav.asistente"), `
    <div class="chat" id="chat">${chat.length ? chat.map((m) => `<div class="msg ${m.role}"><div class="burbuja">${md(m.content)}</div>${m.origen ? `<small class="muted">${esc(m.origen)}</small>` : ""}</div>`).join("") : `<p class="muted centro">${esc(t("ia.bienvenida"))}</p>`}
    ${estado.ui.pensando ? `<div class="msg assistant"><div class="burbuja pensando">…</div></div>` : ""}</div>
    <div class="rapidas">${RAPIDAS.map((k) => `<button class="chip" data-accion="rapida" data-k="${k}">${esc(t(k))}</button>`).join("")}</div>
    <div class="buscar-linea"><textarea id="pregunta" rows="2" placeholder="${esc(t("ia.placeholder"))}" data-enter="enviar">${esc(estado.ui.preguntaPendiente || "")}</textarea>
    <button class="btn-primario" data-accion="enviar" ${estado.ui.pensando ? "disabled" : ""}>${esc(t("ia.enviar"))}</button></div>
    <div class="pie-chat">${estadoIa} <button class="btn-link" data-accion="limpiarChat">${esc(t("ia.limpiar"))}</button></div>
  `, { clase: "panel-chat" })}
  <p class="muted nota">${esc(t("ia.privacidad"))}</p>`;
}

export function montar(ctx, raiz) {
  const c = raiz.querySelector("#chat");
  if (c) c.scrollTop = c.scrollHeight;
  const p = raiz.querySelector("#pregunta");
  if (p && ctx.estado.ui.preguntaPendiente) p.focus();
}

async function enviar(ctx, pregunta) {
  pregunta = (pregunta || "").trim();
  if (!pregunta || ctx.estado.ui.pensando) return;
  const { t, estado } = ctx;
  const historial = estado.chat.slice(-8); // antes de agregar la pregunta: armarMensajes la suma
  const chat = [...estado.chat, { role: "user", content: pregunta }];
  ctx.actualizar({ chat, ui: { ...estado.ui, preguntaPendiente: "", pensando: true } });
  const ia = estado.ia || {};
  const activo = ia.activo && ia.proveedores?.[ia.activo]?.tieneClave ? ia.activo : Object.entries(ia.proveedores || {}).find(([, p]) => p.tieneClave)?.[0];
  let respuesta, origen;
  if (activo) {
    try {
      const r = await ctx.plataforma.iaPreguntar({ proveedor: activo, idioma: estado.idioma, historial, pregunta, contexto: construirContexto(ctx.ds, ctx.filtros) });
      respuesta = r.texto;
      origen = `${PROVEEDORES[activo].nombre} · ${r.modelo}`;
    } catch (e) {
      const local = responderLocal(ctx.ds, pregunta, ctx.filtros);
      respuesta = t("ia.errorProveedor", { error: String(e.message || e) }) + (local ? "\n\n" + redactarLocal(ctx, local) : "");
      origen = t("ia.local");
    }
  } else {
    const local = responderLocal(ctx.ds, pregunta, ctx.filtros);
    respuesta = local ? redactarLocal(ctx, local) : t("ia.noEntendi");
    origen = t("ia.local");
  }
  ctx.actualizar({ chat: [...chat, { role: "assistant", content: respuesta, origen }], ui: { ...ctx.estado.ui, pensando: false } });
}

export const acciones = {
  enviar: (ctx) => enviar(ctx, document.getElementById("pregunta").value),
  rapida: (ctx, el) => enviar(ctx, ctx.t(el.dataset.k)),
  limpiarChat: (ctx) => ctx.actualizar({ chat: [] }),
};
