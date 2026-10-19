// © 2026 Martín Viera. Todos los derechos reservados.
//
// Planificador y cola de publicación (estilo Buffer/Hootsuite): validación por
// red, horario sugerido a partir de los datos y calendario. La cola es una
// lista inmutable — cada operación devuelve una lista nueva.
//
// Importante: la app NO publica sola en las redes. Publicar en nombre de una
// cuenta exige la app aprobada por cada plataforma (Meta, TikTok, LinkedIn…)
// con el token del cliente. La cola arma el plan, avisa y exporta; la
// publicación queda en manos del usuario o del conector que él configure.

import { REDES } from "./catalogo.js";
import { mejoresHorarios } from "./metricas.js";

/** Valida un borrador para una red. Devuelve errores (bloquean) y avisos. */
export function validarPost(texto, red, opciones = {}) {
  const def = REDES[red];
  const errores = [], avisos = [];
  if (!def) return { ok: false, errores: [{ clave: "plan.err.red", vars: { red } }], avisos };
  const largo = [...(texto || "")].length;
  const hashtags = (texto || "").match(/#[\p{L}\p{N}_]+/gu) || [];
  if (!largo && !opciones.tieneMedia) errores.push({ clave: "plan.err.vacio", vars: {} });
  if (largo > def.limite) errores.push({ clave: "plan.err.largo", vars: { largo, limite: def.limite } });
  if (hashtags.length > def.hashtagsMax) avisos.push({ clave: "plan.av.hashtags", vars: { n: hashtags.length, max: def.hashtagsMax } });
  if (["instagram", "tiktok", "pinterest", "youtube"].includes(red) && !opciones.tieneMedia) avisos.push({ clave: "plan.av.media", vars: { red: def.nombre } });
  if (red === "x" && largo > 240) avisos.push({ clave: "plan.av.casi", vars: { largo, limite: def.limite } });
  if (/https?:\/\//.test(texto || "") && red === "instagram") avisos.push({ clave: "plan.av.link", vars: {} });
  return { ok: errores.length === 0, errores, avisos, largo, limite: def.limite, hashtags: hashtags.length };
}

/** Las mejores franjas día×hora de una red (todas las marcas, más señal). */
export function horariosSugeridos(ds, red, n = 3, filtros = {}) {
  const h = mejoresHorarios(ds, { ...filtros, redes: [red] }, 3);
  return h.top.slice(0, n);
}

/** Próxima fecha (ISO local sin zona) que cae en ese día de semana y hora. */
export function proximaFecha(desdeIso, dia, hora) {
  const d = new Date(desdeIso + "T00:00:00Z");
  for (let i = 0; i < 8; i++) {
    const c = new Date(d.getTime() + i * 86400000);
    if (c.getUTCDay() === dia) return `${c.toISOString().slice(0, 10)}T${String(hora).padStart(2, "0")}:00`;
  }
  return null;
}

let secuencia = 0;
export function nuevoId() {
  secuencia += 1;
  return `q${Date.now().toString(36)}${secuencia}`;
}

export function agregarACola(cola, item) {
  const v = validarPost(item.texto, item.red, item);
  if (!v.ok) throw new Error("El borrador no pasa la validación: " + v.errores.map((e) => e.clave).join(", "));
  return [...cola, { id: item.id || nuevoId(), estado: "programado", creado: new Date().toISOString(), ...item }]
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function actualizarEnCola(cola, id, cambios) {
  return cola.map((x) => (x.id === id ? { ...x, ...cambios } : x)).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function quitarDeCola(cola, id) {
  return cola.filter((x) => x.id !== id);
}

/** Agrupa la cola por día para el calendario (semana o mes que contiene `ref`). */
export function calendario(cola, refIso, modo = "semana") {
  const ref = new Date(refIso + "T00:00:00Z");
  let inicio, dias;
  if (modo === "mes") {
    const primero = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
    inicio = new Date(primero.getTime() - ((primero.getUTCDay() + 6) % 7) * 86400000);
    dias = 42;
  } else {
    inicio = new Date(ref.getTime() - ((ref.getUTCDay() + 6) % 7) * 86400000);
    dias = 7;
  }
  return Array.from({ length: dias }, (_, i) => {
    const fecha = new Date(inicio.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { fecha, mesActual: fecha.slice(5, 7) === refIso.slice(5, 7), items: cola.filter((x) => x.fecha.slice(0, 10) === fecha) };
  });
}

/** Exporta la cola a CSV (para cargar en la herramienta de publicación). */
export function colaACsv(cola) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = [["fecha", "red", "texto", "estado", "campana"].join(",")];
  for (const x of cola) filas.push([x.fecha, x.red, x.texto, x.estado, x.campana || ""].map(esc).join(","));
  return filas.join("\n");
}
