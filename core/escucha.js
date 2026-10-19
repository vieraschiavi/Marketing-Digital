// © 2026 Martín Viera. Todos los derechos reservados.
//
// Escucha social: sentimiento léxico trilingüe (con negación e intensificadores),
// temas y hashtags más mencionados, y alertas de pico. Es local y explicable:
// cada score se puede justificar palabra por palabra, sin mandar el texto de
// nadie a una IA externa.

import { mencionesFiltradas } from "./filtros.js";

const POSITIVAS = [
  "encant", "excelente", "recomend", "mejor", "genia", "genial", "increíble", "increible", "bueno", "buena", "rico", "rica",
  "amo", "feliz", "gracias", "perfecto", "perfecta", "volvería", "volveria", "10 puntos", "top", "espectacular", "lindo", "linda",
  "love", "great", "amazing", "awesome", "good", "best", "excellent", "thanks", "ótimo", "otimo", "adorei", "maravilh", "obrigad", "😍", "❤️", "👏", "🔥",
];
const NEGATIVAS = [
  "pésim", "pesim", "mal", "horrible", "decepcion", "demora", "tarde", "frío", "frio", "nadie responde", "no lo recomiendo",
  "desastre", "estafa", "caro", "sucio", "lento", "queja", "reclamo", "nunca más", "nunca mas", "peor", "fatal", "odio",
  "bad", "worst", "terrible", "awful", "late", "cold", "scam", "péssim", "pessim", "ruim", "horrível", "atraso", "😡", "👎",
];
const NEGADORES = ["no", "nunca", "ni", "not", "never", "não", "nao", "sin"];
const INTENSIFICADORES = ["muy", "súper", "super", "re", "tan", "very", "so", "muito", "demasiado", "-ísimo"];

const STOP = new Set("de la el en y a los las un una que por con para del se lo al es su sus me mi te tu ya no si más mas muy hay como pero o le este esta eso fue ser the and to of in is it for on with this that was are you com do da em um uma os as".split(" "));

const normalizar = (t) => t.toLowerCase().normalize("NFC");

/** Sentimiento de un texto: score en [-1, 1], etiqueta y palabras que lo explican. */
export function sentimiento(texto) {
  const t = normalizar(texto || "");
  const tokens = t.split(/[\s,.;:!¡?¿()"']+/).filter(Boolean);
  let score = 0;
  const motivos = [];
  const evaluar = (lista, signo) => {
    for (const raiz of lista) {
      let idx = t.indexOf(raiz);
      while (idx !== -1) {
        // Solo al inicio de palabra: "mal" no tiene que encontrarse en "normal".
        if (idx > 0 && /\p{L}/u.test(t[idx - 1])) {
          idx = t.indexOf(raiz, idx + raiz.length);
          continue;
        }
        const antes = t.slice(Math.max(0, idx - 18), idx).split(/\s+/).filter(Boolean).slice(-3);
        const negado = antes.some((w) => NEGADORES.includes(w)) && !(raiz.startsWith("no ") || raiz.includes("nadie"));
        const intenso = antes.some((w) => INTENSIFICADORES.includes(w)) || t.slice(idx, idx + raiz.length + 6).includes("ísim");
        const valor = signo * (intenso ? 1.5 : 1) * (negado ? -0.8 : 1);
        score += valor;
        motivos.push({ palabra: raiz, valor: Math.round(valor * 10) / 10 });
        idx = t.indexOf(raiz, idx + raiz.length);
      }
    }
  };
  evaluar(POSITIVAS, 1);
  evaluar(NEGATIVAS, -1);
  const norm = Math.tanh(score / Math.max(1.5, Math.sqrt(tokens.length) / 2));
  const etiqueta = norm > 0.2 ? "positivo" : norm < -0.2 ? "negativo" : "neutro";
  return { score: Math.round(norm * 100) / 100, etiqueta, motivos };
}

export function palabrasClave(textos, n = 15) {
  const cuenta = new Map();
  for (const tx of textos) {
    for (const w of normalizar(tx).split(/[^\p{L}\p{N}#@]+/u)) {
      if (w.length < 4 || STOP.has(w) || w.startsWith("@")) continue;
      cuenta.set(w, (cuenta.get(w) || 0) + 1);
    }
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([palabra, veces]) => ({ palabra, veces }));
}

/** Análisis completo de menciones bajo filtros. */
export function analizarMenciones(ds, filtros = {}) {
  const lista = mencionesFiltradas(ds, filtros).map((m) => ({ ...m, sent: sentimiento(m.texto) }));
  const porDia = new Map();
  const temas = new Map(), hashtags = new Map(), ciudades = new Map();
  let pos = 0, neg = 0, neu = 0, alcance = 0;
  for (const m of lista) {
    const d = m.fecha.slice(0, 10);
    if (!porDia.has(d)) porDia.set(d, { positivo: 0, neutro: 0, negativo: 0 });
    porDia.get(d)[m.sent.etiqueta]++;
    if (m.sent.etiqueta === "positivo") pos++;
    else if (m.sent.etiqueta === "negativo") neg++;
    else neu++;
    alcance += m.alcance;
    if (m.tema) temas.set(m.tema, (temas.get(m.tema) || 0) + 1);
    for (const h of m.texto.match(/#[\p{L}\p{N}_]+/gu) || []) hashtags.set(h, (hashtags.get(h) || 0) + 1);
    if (m.sent.etiqueta === "negativo" && m.ciudad) ciudades.set(m.ciudad, (ciudades.get(m.ciudad) || 0) + 1);
  }
  const fechas = [...porDia.keys()].sort();
  const total = lista.length;
  return {
    total,
    alcance,
    positivo: pos, neutro: neu, negativo: neg,
    sentimientoNeto: total ? Math.round(((pos - neg) / total) * 100) : 0,
    serie: { fechas, positivo: fechas.map((f) => porDia.get(f).positivo), neutro: fechas.map((f) => porDia.get(f).neutro), negativo: fechas.map((f) => porDia.get(f).negativo) },
    temas: [...temas.entries()].sort((a, b) => b[1] - a[1]).map(([tema, veces]) => ({ tema, veces })),
    hashtags: [...hashtags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([hashtag, veces]) => ({ hashtag, veces })),
    ciudadesNegativas: [...ciudades.entries()].sort((a, b) => b[1] - a[1]).map(([ciudad, veces]) => ({ ciudad, veces })),
    palabras: palabrasClave(lista.map((m) => m.texto)),
    menciones: lista,
    alertas: detectarPicos(fechas, fechas.map((f) => porDia.get(f).negativo), lista),
  };
}

/**
 * Pico de negativas: z-score de los últimos 7 días contra la línea base previa.
 * Devuelve también la ciudad y el tema que concentran el pico (la causa probable).
 */
export function detectarPicos(fechas, negativos, lista, ventana = 7, umbralZ = 2) {
  if (fechas.length < ventana * 3) return [];
  const base = negativos.slice(0, -ventana);
  const reciente = negativos.slice(-ventana);
  const media = base.reduce((a, b) => a + b, 0) / base.length;
  const desv = Math.sqrt(base.reduce((s, x) => s + (x - media) ** 2, 0) / base.length) || 0.5;
  const mediaReciente = reciente.reduce((a, b) => a + b, 0) / ventana;
  const z = (mediaReciente - media) / (desv / Math.sqrt(ventana));
  if (z < umbralZ) return [];
  const desde = fechas[fechas.length - ventana];
  const negRecientes = lista.filter((m) => m.sent.etiqueta === "negativo" && m.fecha.slice(0, 10) >= desde);
  const moda = (campo) => {
    const c = new Map();
    negRecientes.forEach((m) => c.set(m[campo], (c.get(m[campo]) || 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
  };
  const [ciudad, nCiudad] = moda("ciudad");
  const [tema, nTema] = moda("tema");
  return [{
    tipo: "pico_negativo",
    desde,
    z: Math.round(z * 10) / 10,
    mediaBase: Math.round(media * 10) / 10,
    mediaReciente: Math.round(mediaReciente * 10) / 10,
    ciudad, shareCiudad: negRecientes.length ? nCiudad / negRecientes.length : 0,
    tema, shareTema: negRecientes.length ? nTema / negRecientes.length : 0,
    total: negRecientes.length,
  }];
}

/** Bandeja: lo que requiere respuesta, con horas de espera, ordenado por urgencia. */
export function bandeja(ds, filtros = {}, ahora = null) {
  const finMs = ahora ?? Date.parse(ds.meta.fin + "T23:59:59Z");
  return mencionesFiltradas(ds, filtros)
    .filter((m) => m.requiereRespuesta)
    .map((m) => {
      const s = sentimiento(m.texto);
      const espera = (finMs - Date.parse(m.fecha + "Z")) / 3600000;
      const urgencia = (m.respondida ? 0 : 1) * (1 + (s.etiqueta === "negativo" ? 1.5 : 0) + (m.tipo === "dm" ? 0.5 : 0) + Math.min(espera, 48) / 24 + Math.log10(m.alcance + 1) / 3);
      return { ...m, sent: s, esperaHoras: Math.round(espera * 10) / 10, urgencia: Math.round(urgencia * 100) / 100 };
    })
    .sort((a, b) => b.urgencia - a.urgencia);
}

export function tiempoRespuesta(ds, filtros = {}) {
  const r = mencionesFiltradas(ds, filtros).filter((m) => m.requiereRespuesta);
  const resp = r.filter((m) => m.respondida && m.minutosRespuesta != null).map((m) => m.minutosRespuesta).sort((a, b) => a - b);
  const mediana = resp.length ? resp[Math.floor(resp.length / 2)] : null;
  return { requieren: r.length, respondidas: resp.length, tasa: r.length ? (resp.length / r.length) * 100 : 100, medianaMin: mediana, pendientes: r.length - resp.length };
}
