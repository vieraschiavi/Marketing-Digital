// © 2026 Martín Viera. Todos los derechos reservados.
//
// Asistente IA: catálogo de proveedores, actualización automática de modelos,
// armado del contexto y un responder LOCAL que funciona sin ninguna clave.
//
// La IA externa es aditiva: sin clave, el asistente igual responde con el motor
// de reglas y el what-if local. Con clave, la llamada real la hace el proceso
// principal de Electron (nunca el navegador, para que la clave no viaje por el
// renderer); este módulo solo arma qué mandar y decide qué modelo usar.
//
// "Actualización de modelos": cada proveedor expone un endpoint que lista los
// modelos disponibles para esa clave. La app lo consulta al configurar la
// clave y cada 7 días, ordena lo que vuelve y recomienda el más nuevo de la
// familia preferida. Si la consulta falla, queda el catálogo base de abajo.

import { kpis, mejoresHorarios, porFormato } from "./metricas.js";
import { benchmark, aceleraciones } from "./competencia.js";
import { analizarMenciones, tiempoRespuesta } from "./escucha.js";
import { generarSugerencias } from "./sugerencias.js";
import { radarTendencias } from "./busqueda.js";
import { ultimosDias } from "./filtros.js";
import { REDES, FORMATOS, GEO } from "./catalogo.js";

export const PROVEEDORES = {
  anthropic: {
    nombre: "Claude (Anthropic)",
    modeloBase: "claude-opus-5-5",
    respaldo: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"],
    // Preferencia por familia: Opus por defecto (calidad), luego Sonnet, Haiku.
    preferir: [/^claude-opus-/, /^claude-sonnet-/, /^claude-haiku-/],
    excluir: [/mythos/],
    consola: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    nombre: "ChatGPT (OpenAI)",
    modeloBase: "gpt-5",
    respaldo: ["gpt-5", "gpt-5-mini"],
    preferir: [/^gpt-\d/, /^o\d/],
    excluir: [/audio|realtime|tts|whisper|embedding|image|dall|search|transcribe|moderation|instruct/],
    url: "https://api.openai.com/v1",
    consola: "https://platform.openai.com/api-keys",
  },
  gemini: {
    nombre: "Gemini (Google)",
    modeloBase: "gemini-2.5-pro",
    respaldo: ["gemini-2.5-pro", "gemini-2.5-flash"],
    preferir: [/^gemini-\d+(\.\d+)?-pro/, /^gemini-\d+(\.\d+)?-flash/],
    excluir: [/embedding|aqa|imagen|tts|vision|learnlm|exp-\d{4}/],
    url: "https://generativelanguage.googleapis.com/v1beta",
    consola: "https://aistudio.google.com/app/apikey",
  },
  groq: { nombre: "Groq", modeloBase: "llama-3.3-70b-versatile", respaldo: ["llama-3.3-70b-versatile"], preferir: [/llama|qwen|deepseek/], excluir: [/whisper|guard|tts/], url: "https://api.groq.com/openai/v1", consola: "https://console.groq.com/keys" },
  mistral: { nombre: "Mistral", modeloBase: "mistral-large-latest", respaldo: ["mistral-large-latest"], preferir: [/large/, /medium/], excluir: [/embed|moderation|ocr/], url: "https://api.mistral.ai/v1", consola: "https://console.mistral.ai/api-keys" },
  deepseek: { nombre: "DeepSeek", modeloBase: "deepseek-chat", respaldo: ["deepseek-chat"], preferir: [/chat/, /reasoner/], excluir: [], url: "https://api.deepseek.com/v1", consola: "https://platform.deepseek.com/api_keys" },
  xai: { nombre: "Grok (xAI)", modeloBase: "grok-4", respaldo: ["grok-4"], preferir: [/^grok-\d/], excluir: [/image|vision/], url: "https://api.x.ai/v1", consola: "https://console.x.ai" },
  ollama: { nombre: "Ollama (local)", modeloBase: "llama3.1", respaldo: ["llama3.1"], preferir: [/.*/], excluir: [/embed/], url: "http://localhost:11434", local: true, consola: "https://ollama.com/library" },
};

export const DIAS_REFRESCO_MODELOS = 7;

/** Extrae una "versión" numérica comparable de un id de modelo (claude-opus-5-5 → [5,5]). */
function version(id) {
  const nums = (id.match(/\d+(?:\.\d+)?/g) || []).filter((n) => n.length < 6).flatMap((n) => n.split(".").map(Number));
  return nums;
}
function compararVersion(a, b) {
  const va = version(a), vb = version(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (vb[i] ?? -1) - (va[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

/**
 * Ordena los modelos que devolvió un proveedor y elige el recomendado.
 * `modelos`: [{id, creado?}] (creado = epoch ms o ISO, si el proveedor lo da).
 */
export function elegirModelo(proveedor, modelos) {
  const def = PROVEEDORES[proveedor];
  if (!def) throw new Error(`Proveedor desconocido: ${proveedor}`);
  const validos = (modelos || [])
    .map((m) => (typeof m === "string" ? { id: m } : m))
    .map((m) => ({ ...m, id: String(m.id).replace(/^models\//, "") }))
    .filter((m) => m.id && !def.excluir.some((r) => r.test(m.id)));
  if (!validos.length) return { recomendado: def.modeloBase, lista: def.respaldo, origen: "respaldo" };
  const ts = (m) => (m.creado ? new Date(m.creado).getTime() || Number(m.creado) || 0 : 0);
  const rango = (id) => {
    const i = def.preferir.findIndex((r) => r.test(id));
    return i === -1 ? 99 : i;
  };
  const ordenados = [...validos].sort((a, b) => rango(a.id) - rango(b.id) || ts(b) - ts(a) || compararVersion(a.id, b.id));
  return { recomendado: ordenados[0].id, lista: ordenados.map((m) => m.id), origen: "api" };
}

/** ¿Toca volver a consultar la lista de modelos? */
export function debeRefrescar(cache, ahora = Date.now()) {
  if (!cache?.actualizado) return true;
  return ahora - new Date(cache.actualizado).getTime() > DIAS_REFRESCO_MODELOS * 86400000;
}

const r1 = (x) => Math.round(x * 10) / 10;

/** Contexto compacto y numérico del tablero para el prompt (sin PII). */
export function construirContexto(ds, filtros = {}) {
  const propia = ds.marcas.find((m) => m.propia);
  const per = filtros.desde ? filtros : { ...filtros, ...ultimosDias(ds, 30) };
  const k = kpis(ds, { ...per, marcas: [propia.id] });
  const bench = benchmark(ds, per).map((b) => ({ marca: b.nombre, propia: b.propia, seguidores: Math.round(b.seguidores), crecimiento: r1(b.crecimiento), er: r1(b.er), postsSemana: r1(b.porSemana), sovMenciones: r1(b.sovMenciones), sentimientoNeto: b.sentimientoNeto }));
  const esc = analizarMenciones(ds, { ...per, marcas: [propia.id] });
  const horas = mejoresHorarios(ds, per, 4).porHora.filter((h) => h.er !== null).sort((a, b) => b.er - a.er).slice(0, 3).map((h) => h.hora);
  return {
    aviso: ds.meta.sintetico ? "DATOS SINTÉTICOS DE DEMOSTRACIÓN" : "datos importados por el usuario",
    marca: propia.nombre,
    industria: ds.meta.industriaNombre,
    periodo: { desde: per.desde, hasta: per.hasta },
    filtros: { pais: filtros.pais || null, ciudad: filtros.ciudad || null, edades: filtros.edades || null, generos: filtros.generos || null, redes: filtros.redes || null },
    kpis: { seguidores: Math.round(k.seguidores), crecimiento: r1(k.crecimiento), er: r1(k.er), alcance: Math.round(k.alcance), publicaciones: k.publicaciones, deltaER: k.deltas.er === null ? null : r1(k.deltas.er) },
    competencia: bench,
    formatos: porFormato(ds, { ...per, marcas: [propia.id] }).slice(0, 5).map((f) => ({ formato: f.formato, er: r1(f.er), n: f.publicaciones })),
    mejoresHoras: horas,
    escucha: { total: esc.total, sentimientoNeto: esc.sentimientoNeto, alertas: esc.alertas.map((a) => ({ ciudad: a.ciudad, tema: a.tema, z: a.z })), temas: esc.temas.slice(0, 5) },
    sugerencias: generarSugerencias(ds, filtros).slice(0, 8).map((s) => ({ tipo: s.tipo, prioridad: s.prioridad, ...s.vars })),
    tendencias: radarTendencias(ds, filtros.pais || ds.meta.paisBase).slice(0, 5).map((t) => ({ hashtag: t.hashtag, crecimiento: Math.round(t.crecimiento) })),
  };
}

export function systemPrompt(idioma = "es") {
  const lengua = { es: "español rioplatense", en: "English", pt: "português do Brasil" }[idioma] || "español";
  return [
    "Sos el asistente de MV Marketing Digital, una herramienta de analítica de redes sociales.",
    `Respondé siempre en ${lengua}, en forma breve y accionable (máximo ~250 palabras salvo que pidan más).`,
    "Basate SOLO en el CONTEXTO JSON que acompaña cada pregunta: no inventes cifras, marcas ni datos que no estén ahí.",
    "Si el contexto dice que los datos son sintéticos, recordalo cuando des números.",
    "Cuando recomiendes, priorizá por impacto esperado y esfuerzo, y nombrá la evidencia (métrica y valor).",
    "Para redactar posts, respetá el límite de caracteres de cada red y sugerí hashtags del contexto.",
  ].join("\n");
}

/** Mensajes listos para el proveedor (formato neutro role/content). */
export function armarMensajes(historial, pregunta, contexto) {
  // Solo {role, content}: Anthropic/OpenAI rechazan campos extra (p. ej. `origen`).
  const hist = (historial || []).slice(-8)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));
  return [...hist, { role: "user", content: `CONTEXTO:\n${JSON.stringify(contexto)}\n\nPREGUNTA:\n${pregunta}` }];
}

// ── What-if local por lenguaje natural ───────────────────────────────────

const NUM = /(\d+(?:[.,]\d+)?)\s*%?/;

/**
 * Entiende preguntas del tipo:
 *   "¿qué pasa si publico 3 reels más por semana en instagram?"
 *   "si aumento 20% la frecuencia en tiktok"
 *   "si publico a las 20 en vez de a las 10"
 * y estima el impacto con los coeficientes medidos en el propio dataset.
 */
export function whatIf(ds, pregunta, filtros = {}) {
  const t = pregunta.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const propia = ds.marcas.find((m) => m.propia).id;
  const palabra = (w) => new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(t);
  // Por palabra completa: "x" no tiene que encontrarse en "próximo" ni en "texto".
  const red = Object.keys(REDES).find((r) => palabra(r) || palabra(REDES[r].nombre.toLowerCase())) || "instagram";
  const per = filtros.desde ? filtros : { ...filtros, ...ultimosDias(ds, 30) };
  const base = kpis(ds, { ...per, marcas: [propia], redes: [red] });
  const semanas = (Date.parse(per.hasta) - Date.parse(per.desde)) / (7 * 86400000) + 1 / 7;
  const porSemana = base.publicaciones / semanas;
  const interPorPost = base.publicaciones ? base.interacciones / base.publicaciones : 0;

  // 1) Cambio de horario
  const horas = [...t.matchAll(/(?:a las|las|at|as)\s*(\d{1,2})/g)].map((m) => Number(m[1])).filter((h) => h < 24);
  if (horas.length >= 1 && /(hora|horario|a las|en vez|instead|em vez)/.test(t)) {
    // Coeficientes horarios con todo el historial y todas las marcas: 30 días de
    // una sola cuenta no alcanzan para estimar 24 franjas.
    const h = mejoresHorarios(ds, { ...filtros, desde: null, hasta: null, marcas: null, redes: [red] }, 3).porHora;
    const destino = horas[0];
    const origen = horas[1] ?? Number(Object.entries(postsPorHora(ds, per, propia, red)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10);
    const erD = h[destino]?.er, erO = h[origen]?.er;
    if (erD == null || erO == null) return { entendido: true, tipo: "horario", red, sinDatos: true };
    const cambio = ((erD - erO) / erO) * 100;
    return { entendido: true, tipo: "horario", red, desde: origen, hacia: destino, cambioER: r1(cambio), interaccionesExtraMes: Math.round(base.interacciones * (cambio / 100)), base: { er: r1(base.er), interacciones: Math.round(base.interacciones) } };
  }

  // 2) Más / menos publicaciones de un formato o en general
  const formato = Object.keys(FORMATOS).find((f) => t.includes(f) || t.includes(f + "s"));
  const m = t.match(NUM);
  const esPorcentaje = /%|por ciento|percent|porcento/.test(t);
  const reduce = /(menos|reduc|reduz|bajar|fewer|less|diminu)/.test(t);
  if (m && /(public|post|subir|frecuencia|frequency|reel|video|carrusel|historia|short|aument|increase|mas|more|menos|reduc)/.test(t)) {
    const valor = Number(m[1].replace(",", "."));
    let extraSemana = esPorcentaje ? porSemana * (valor / 100) : valor;
    if (reduce) extraSemana = -extraSemana;
    let factorFormato = 1;
    if (formato) {
      const fs = porFormato(ds, { ...per, marcas: [propia], redes: [red] });
      const f = fs.find((x) => x.formato === formato);
      const media = fs.reduce((s, x) => s + x.er * x.publicaciones, 0) / Math.max(1, fs.reduce((s, x) => s + x.publicaciones, 0));
      factorFormato = f && media ? f.er / media : 1;
    }
    // Rendimientos decrecientes: cada post extra rinde menos (saturación de audiencia).
    const saturacion = 1 / (1 + Math.max(0, extraSemana) / Math.max(porSemana, 1) * 0.35);
    const extraMes = extraSemana * 4.3 * interPorPost * factorFormato * (extraSemana > 0 ? saturacion : 1);
    const totalMes = base.interacciones / semanas * 4.3;
    return {
      entendido: true, tipo: "frecuencia", red, formato: formato || null,
      postsSemanaActual: r1(porSemana), postsSemanaNuevo: r1(Math.max(0, porSemana + extraSemana)),
      interaccionesMesActual: Math.round(totalMes), interaccionesMesNuevo: Math.round(totalMes + extraMes),
      cambio: totalMes ? r1((extraMes / totalMes) * 100) : 0,
      supuestos: { factorFormato: r1(factorFormato), saturacion: r1(saturacion) },
      rango: { bajo: Math.round(totalMes + extraMes * 0.6), alto: Math.round(totalMes + extraMes * 1.3) },
    };
  }
  return { entendido: false };
}

function postsPorHora(ds, per, marca, red) {
  const c = {};
  for (const p of ds.posts) if (p.marca === marca && p.red === red && p.fecha.slice(0, 10) >= per.desde && p.fecha.slice(0, 10) <= per.hasta) c[p.hora] = (c[p.hora] || 0) + 1;
  return c;
}

/**
 * Responder local (sin IA): reconoce intenciones frecuentes y contesta con
 * datos del tablero. Devuelve {clave, vars} para que la UI lo redacte en el
 * idioma activo, o null si no entendió (la UI ofrece entonces configurar IA).
 */
export function responderLocal(ds, pregunta, filtros = {}) {
  const t = pregunta.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const propia = ds.marcas.find((m) => m.propia);
  const per = filtros.desde ? filtros : { ...filtros, ...ultimosDias(ds, 30) };

  const wi = /(que pasa si|si publico|si aumento|si reduzco|what if|e se|y si|si subo|si paso)/.test(t) ? whatIf(ds, pregunta, filtros) : null;
  if (wi?.entendido) return { clave: wi.tipo === "horario" ? "ia.loc.whatifHora" : "ia.loc.whatifFrec", vars: wi, datos: wi };

  if (/(horario|hora|cuando publico|when|quando|best time)/.test(t)) {
    const h = mejoresHorarios(ds, per, 4).porHora.filter((x) => x.er !== null).sort((a, b) => b.er - a.er).slice(0, 3);
    return { clave: "ia.loc.horario", vars: { horas: h.map((x) => `${x.hora}:00`).join(", "), er: r1(h[0]?.er || 0) } };
  }
  if (/(competen|competidor|rival|benchmark|concorr)/.test(t)) {
    const acc = aceleraciones(ds, per, 60).find((a) => a.marca !== propia.id);
    const b = benchmark(ds, per);
    const lider = [...b].sort((x, y) => y.er - x.er)[0];
    return { clave: "ia.loc.competencia", vars: { lider: lider.nombre, erLider: r1(lider.er), acelera: ds.marcas.find((m) => m.id === acc?.marca)?.nombre || "—", red: acc ? REDES[acc.red].nombre : "—", crec: r1(acc?.crecimientoReciente || 0) } };
  }
  if (/(sentim|opinan|dicen|queja|reclamo|menciones|reputa|feeling|mentions)/.test(t)) {
    const e = analizarMenciones(ds, { ...per, marcas: [propia.id] });
    const tr = tiempoRespuesta(ds, { ...per, marcas: [propia.id] });
    const a = e.alertas[0];
    return { clave: a ? "ia.loc.sentimientoAlerta" : "ia.loc.sentimiento", vars: { neto: e.sentimientoNeto, total: e.total, ciudad: a?.ciudad?.split("|")[1] || "", tema: a?.tema || "", pendientes: tr.pendientes } };
  }
  if (/(formato|reel|carrusel|video|que publico|que public|contenido|content|ideas?)/.test(t)) {
    const fs = porFormato(ds, { ...per, marcas: [propia.id] });
    return { clave: "ia.loc.formato", vars: { mejor: fs[0]?.formato || "—", er: r1(fs[0]?.er || 0), peor: fs.at(-1)?.formato || "—" } };
  }
  if (/(tendenc|hashtag|trend|viral)/.test(t)) {
    const pais = filtros.pais || ds.meta.paisBase;
    const r = radarTendencias(ds, pais).slice(0, 3);
    return { clave: "ia.loc.tendencias", vars: { pais: GEO[pais]?.nombre || pais, lista: r.map((x) => `${x.hashtag} (+${Math.round(x.crecimiento)}%)`).join(", ") } };
  }
  if (/(resumen|como vamos|como estamos|kpi|summary|resumo|estado)/.test(t)) {
    const k = kpis(ds, { ...per, marcas: [propia.id] });
    return { clave: "ia.loc.resumen", vars: { seguidores: Math.round(k.seguidores), crec: r1(k.crecimiento), er: r1(k.er), delta: k.deltas.er === null ? "—" : r1(k.deltas.er) } };
  }
  if (/(sugeren|recomend|que hago|prioridad|suggest|what should)/.test(t)) {
    const s = generarSugerencias(ds, filtros).slice(0, 3);
    return { clave: "ia.loc.sugerencias", vars: { lista: s }, sugerencias: s };
  }
  return null;
}
