// © 2026 Martín Viera. Todos los derechos reservados.
//
// Importador de CSV: lo que cada red deja exportar desde su panel (Meta
// Business Suite, TikTok Studio, LinkedIn, X Analytics, YouTube Studio) o
// cualquier planilla con columnas parecidas. Reconoce encabezados en ES/EN/PT
// y separador , o ;. Es la forma de analizar datos REALES propios y de la
// competencia sin pedirle a nadie un token de API.

import { REDES } from "./catalogo.js";

/** Parser CSV con comillas, comillas escapadas ("") y saltos dentro de campos. */
export function parsearCsv(texto) {
  const limpio = texto.replace(/^\uFEFF/, "");
  const primera = limpio.split(/\r?\n/, 1)[0] || "";
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ";" : primera.includes("\t") && !primera.includes(",") ? "\t" : ",";
  const filas = [];
  let fila = [], campo = "", comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const ch = limpio[i];
    if (comillas) {
      if (ch === '"' && limpio[i + 1] === '"') { campo += '"'; i++; }
      else if (ch === '"') comillas = false;
      else campo += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) { fila.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo); campo = "";
      if (fila.some((c) => c.trim() !== "")) filas.push(fila);
      fila = [];
    } else campo += ch;
  }
  fila.push(campo);
  if (fila.some((c) => c.trim() !== "")) filas.push(fila);
  if (!filas.length) return { encabezados: [], filas: [] };
  const encabezados = filas[0].map((h) => h.trim());
  return { encabezados, filas: filas.slice(1).map((f) => Object.fromEntries(encabezados.map((h, i) => [h, (f[i] ?? "").trim()]))) };
}

const ALIAS = {
  fecha: ["fecha", "date", "data", "publish time", "hora de publicación", "fecha de publicación", "created", "post time", "time", "día", "day"],
  texto: ["texto", "descripción", "descripcion", "description", "post", "caption", "title", "título", "titulo", "mensaje", "message", "content", "legenda"],
  alcance: ["alcance", "reach", "alcance de la publicación", "accounts reached", "cuentas alcanzadas"],
  impresiones: ["impresiones", "impressions", "views", "visualizaciones", "reproducciones", "video views", "impressões"],
  likes: ["likes", "me gusta", "reacciones", "reactions", "curtidas", "likes and reactions"],
  comentarios: ["comentarios", "comments", "comentários", "replies", "respuestas"],
  compartidos: ["compartidos", "shares", "veces compartido", "reposts", "retweets", "compartilhamentos"],
  guardados: ["guardados", "saves", "salvamentos"],
  clics: ["clics", "clicks", "link clicks", "clics en el enlace", "cliques"],
  interacciones: ["interacciones", "engagements", "engagement", "interações", "total engagement"],
  formato: ["formato", "tipo", "post type", "type", "tipo de publicación", "media type"],
  seguidores: ["seguidores", "followers", "seguidores totales", "total followers"],
  red: ["red", "network", "platform", "plataforma", "rede"],
};

const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export function mapearEncabezados(encabezados) {
  const mapa = {};
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const a = alias.map(norm);
    const h = encabezados.find((x) => a.includes(norm(x))) || encabezados.find((x) => a.some((y) => norm(x).startsWith(y)));
    if (h) mapa[campo] = h;
  }
  return mapa;
}

function numero(v) {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); // 1.234,5
  else s = s.replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fechaIso(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?/); // dd/mm/aaaa
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${(m[4] || "12").padStart(2, "0")}:${m[5] || "00"}:00`;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

function formatoNormal(v, red) {
  const t = norm(v);
  const tabla = [["reel", "reel"], ["carrusel", "carrusel"], ["carousel", "carrusel"], ["album", "carrusel"], ["short", "short"], ["historia", "historia"], ["story", "historia"], ["video", "video"], ["vídeo", "video"], ["link", "enlace"], ["enlace", "enlace"], ["document", "documento"], ["foto", "imagen"], ["photo", "imagen"], ["image", "imagen"], ["imagen", "imagen"], ["text", "texto"], ["status", "texto"]];
  for (const [k, f] of tabla) if (t.includes(k)) return f;
  const formatos = REDES[red]?.formatos || [];
  return formatos.includes("imagen") ? "imagen" : formatos[0] || "imagen";
}

/**
 * Importa un CSV de posts (o de serie diaria) a una marca y red.
 * Devuelve el dataset NUEVO (no muta el original) y un resumen con avisos.
 */
export function importarCsv(ds, texto, { marca, red }) {
  if (!ds.marcas.some((m) => m.id === marca)) throw new Error(`Marca desconocida: ${marca}`);
  const { encabezados, filas } = parsearCsv(texto);
  const mapa = mapearEncabezados(encabezados);
  const avisos = [];
  if (!mapa.fecha) throw new Error("El CSV no tiene una columna de fecha reconocible (fecha / date / publish time).");
  const esSerie = mapa.seguidores && !mapa.texto;
  const nuevosPosts = [], nuevoDiario = [];
  let descartadas = 0;
  for (const [i, f] of filas.entries()) {
    const fecha = fechaIso(f[mapa.fecha]);
    const redFila = mapa.red ? Object.keys(REDES).find((r) => norm(f[mapa.red]).includes(r)) || red : red;
    if (!fecha || !REDES[redFila]) { descartadas++; continue; }
    if (esSerie) {
      nuevoDiario.push({ fecha: fecha.slice(0, 10), marca, red: redFila, seguidores: numero(f[mapa.seguidores]), impresiones: numero(f[mapa.impresiones]), interacciones: numero(f[mapa.interacciones]), clics: numero(f[mapa.clics]), publicaciones: 0 });
      continue;
    }
    const likes = numero(f[mapa.likes]), comentarios = numero(f[mapa.comentarios]), compartidos = numero(f[mapa.compartidos]), guardados = numero(f[mapa.guardados]);
    const interacciones = mapa.interacciones ? numero(f[mapa.interacciones]) : likes + comentarios + compartidos + guardados;
    const impresiones = numero(f[mapa.impresiones]);
    const alcance = mapa.alcance ? numero(f[mapa.alcance]) : Math.round(impresiones * 0.75);
    const d = new Date(fecha + "Z");
    const textoPost = f[mapa.texto] || "";
    nuevosPosts.push({
      id: `imp-${marca}-${redFila}-${i}-${fecha}`,
      marca, red: redFila, fecha, dia: d.getUTCDay(), hora: d.getUTCHours(),
      formato: formatoNormal(f[mapa.formato], redFila),
      tema: null,
      texto: textoPost,
      hashtags: textoPost.match(/#[\p{L}\p{N}_]+/gu) || [],
      alcance, impresiones, likes, comentarios, compartidos, guardados, interacciones,
      clics: numero(f[mapa.clics]),
      geo: null, edad: null, genero: null, intereses: [],
      importado: true,
    });
  }
  if (!mapa.alcance && !esSerie) avisos.push("Sin columna de alcance: se estimó como 75 % de las impresiones.");
  if (descartadas) avisos.push(`${descartadas} filas sin fecha válida quedaron afuera.`);
  avisos.push("Los datos importados no traen geografía ni edad por post: con filtros de país, ciudad o público no se cuentan.");
  const cuentaExiste = ds.cuentas.some((c) => c.marca === marca && c.red === red);
  return {
    ds: {
      ...ds,
      meta: { ...ds.meta, importado: true },
      cuentas: cuentaExiste ? ds.cuentas : [...ds.cuentas, { id: `${marca}-${red}`, marca, red, handle: "", audiencia: null }],
      posts: [...ds.posts, ...nuevosPosts],
      diario: [...ds.diario, ...nuevoDiario],
    },
    resumen: { tipo: esSerie ? "serie" : "posts", filas: filas.length, importadas: esSerie ? nuevoDiario.length : nuevosPosts.length, descartadas, columnas: mapa, avisos },
  };
}

/** Dataset vacío (para un cliente que solo quiere analizar lo que importa). */
export function datasetVacio(nombrePropia = "Mi marca", competidores = []) {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    meta: { sintetico: false, industria: "propia", industriaNombre: "Datos importados", dias: 0, inicio: hoy, fin: hoy, paisBase: "UY" },
    marcas: [{ id: "m0", nombre: nombrePropia, propia: true, color: "#82C544" }, ...competidores.map((n, i) => ({ id: `m${i + 1}`, nombre: n, propia: false, color: ["#f2b441", "#2f74c0", "#e05c5c", "#9b6bd6", "#00c896"][i % 5] }))],
    cuentas: [], diario: [], posts: [], menciones: [], tendencias: [],
  };
}

/** Recalcula inicio/fin del dataset según los datos que tenga. */
export function recalcularPeriodo(ds) {
  const fechas = [...ds.posts.map((p) => p.fecha.slice(0, 10)), ...ds.diario.map((d) => d.fecha)];
  if (!fechas.length) return ds;
  fechas.sort();
  const inicio = fechas[0], fin = fechas[fechas.length - 1];
  return { ...ds, meta: { ...ds.meta, inicio, fin, dias: Math.round((Date.parse(fin) - Date.parse(inicio)) / 86400000) + 1 } };
}
