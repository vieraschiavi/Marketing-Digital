// © 2026 Martín Viera. Todos los derechos reservados.
//
// Importador de CSV: lo que cada red deja exportar desde su panel (Meta
// Business Suite, TikTok Studio, LinkedIn, X Analytics, YouTube Studio) o
// cualquier planilla con columnas parecidas. Reconoce encabezados en ES/EN/PT
// y separador , o ;. Es la forma de analizar datos REALES propios y de la
// competencia sin pedirle a nadie un token de API.

import { REDES } from "./catalogo.js";
import { hoyLocal } from "./fechas.js";

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

// Columnas de tasa ("Engagement rate", "CTR", "% de…") no son conteos: nunca se
// mapean a interacciones, clics o alcance aunque empiecen igual.
const ES_TASA = /(rate|tasa|taxa|ratio|ctr|%|porcentaje|percent)/;

export function mapearEncabezados(encabezados) {
  const mapa = {};
  const candidatos = encabezados.filter((x) => !ES_TASA.test(norm(x)));
  for (const [campo, alias] of Object.entries(ALIAS)) {
    const a = alias.map(norm);
    const h = candidatos.find((x) => a.includes(norm(x))) || candidatos.find((x) => a.some((y) => norm(x).startsWith(y)));
    if (h) mapa[campo] = h;
  }
  return mapa;
}

/**
 * Número con separador decimal inferido POR COLUMNA (`decimal` = "," | ".").
 * "1.234" en una columna con coma decimal es mil doscientos treinta y cuatro;
 * en una columna con punto decimal es 1,234. Sin esa inferencia, "0.045"
 * terminaba en 45 y "-1.234" en −1,234 mientras "1.234" daba 1234.
 */
export function numero(v, decimal = ".") {
  if (v == null || v === "") return 0;
  let s = String(v).replace(/[\s%]/g, "");
  if (decimal === ",") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Infiere el separador decimal de una columna mirando todos sus valores. */
export function separadorDecimal(valores) {
  let coma = 0, punto = 0;
  for (const v of valores) {
    const s = String(v ?? "").replace(/\s/g, "");
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /^-?\d+,\d{1,2}$/.test(s) || /^-?\d+,\d{4,}$/.test(s) || /^-?0,\d+$/.test(s)) coma++;
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) || /^-?\d+\.\d{1,2}$/.test(s) || /^-?\d+\.\d{4,}$/.test(s) || /^-?0\.\d+$/.test(s)) punto++;
  }
  return coma > punto ? "," : ".";
}

const pad2 = (x) => String(x).padStart(2, "0");

/**
 * Decide si una columna de fechas con barras es dd/mm o mm/dd: si algún primer
 * número pasa de 12, es dd/mm; si algún segundo pasa de 12, es mm/dd. Ante la
 * duda (todo ≤ 12) se asume dd/mm, el formato de la región.
 */
export function ordenFechas(valores) {
  let dm = 0, md = 0;
  for (const v of valores) {
    const m = String(v ?? "").match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}/);
    if (!m) continue;
    if (Number(m[1]) > 12) dm++;
    if (Number(m[2]) > 12) md++;
  }
  return md > dm ? "md" : "dm";
}

function fechaValida(a, mes, dia, h, mi) {
  const d = new Date(Date.UTC(a, mes - 1, dia, h, mi));
  return d.getUTCFullYear() === a && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia && h < 24 && mi < 60;
}

/** Fecha → "AAAA-MM-DDTHH:MM:00" (hora local del export), o null si no es válida. */
export function fechaIso(v, orden = "dm") {
  if (!v) return null;
  const s = String(v).trim();
  let a, mes, dia, h = 12, mi = 0;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/); // ISO literal, sin pasar por UTC
  if (m) [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/))) {
    a = Number(m[3]);
    [dia, mes] = orden === "md" ? [Number(m[2]), Number(m[1])] : [Number(m[1]), Number(m[2])];
  } else {
    const d = new Date(s); // "Oct 19, 2026 8:30 PM" y similares
    if (Number.isNaN(d.getTime())) return null;
    [a, mes, dia, h, mi] = [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
    m = null;
  }
  if (m && m[4] !== undefined) [h, mi] = [Number(m[4]), Number(m[5])];
  if (!fechaValida(a, mes, dia, h, mi)) return null;
  return `${a}-${pad2(mes)}-${pad2(dia)}T${pad2(h)}:${pad2(mi)}:00`;
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
  const orden = ordenFechas(filas.map((f) => f[mapa.fecha]));
  const dec = {};
  for (const campo of ["alcance", "impresiones", "likes", "comentarios", "compartidos", "guardados", "clics", "interacciones", "seguidores"]) {
    if (mapa[campo]) dec[campo] = separadorDecimal(filas.map((f) => f[mapa[campo]]));
  }
  const num = (f, campo) => numero(f[mapa[campo]], dec[campo]);
  for (const [i, f] of filas.entries()) {
    const fecha = fechaIso(f[mapa.fecha], orden);
    const redFila = mapa.red ? Object.keys(REDES).find((r) => norm(f[mapa.red]).includes(r)) || red : red;
    if (!fecha || !REDES[redFila]) { descartadas++; continue; }
    if (esSerie) {
      nuevoDiario.push({ fecha: fecha.slice(0, 10), marca, red: redFila, seguidores: num(f, "seguidores"), impresiones: num(f, "impresiones"), interacciones: num(f, "interacciones"), clics: num(f, "clics"), publicaciones: 0 });
      continue;
    }
    const likes = num(f, "likes"), comentarios = num(f, "comentarios"), compartidos = num(f, "compartidos"), guardados = num(f, "guardados");
    const interacciones = mapa.interacciones ? num(f, "interacciones") : likes + comentarios + compartidos + guardados;
    const impresiones = num(f, "impresiones");
    const alcance = mapa.alcance ? num(f, "alcance") : Math.round(impresiones * 0.75);
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
      clics: num(f, "clics"),
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

/**
 * Mezcla lo importado con la demo: cada cuenta (marca + red) que trae datos
 * reales REEMPLAZA a su versión sintética — nunca se suman seguidores reales y
 * ficticios en el mismo día. Lo importado se deduplica por id (posts) y por
 * cuenta + fecha (serie diaria), así reimportar el mismo CSV no duplica.
 */
export function mezclarImportados(ds, imp) {
  if (!imp?.posts?.length && !imp?.diario?.length) return ds;
  // Filas inválidas guardadas por una versión anterior (fechas imposibles) se descartan.
  const fechaOk = (f) => typeof f === "string" && /^\d{4}-\d{2}-\d{2}/.test(f) && !Number.isNaN(Date.parse(f.slice(0, 10) + "T00:00:00Z"));
  const marcas = new Set(ds.marcas.map((m) => m.id));
  const valido = (x) => fechaOk(x.fecha) && marcas.has(x.marca) && REDES[x.red];
  const posts = [...new Map(imp.posts.filter((p) => valido(p) && Number.isInteger(p.dia) && Number.isInteger(p.hora)).map((p) => [p.id, p])).values()];
  const diario = [...new Map(imp.diario.filter(valido).map((d) => [`${d.marca}|${d.red}|${d.fecha}`, d])).values()];
  const conPosts = new Set(posts.map((p) => `${p.marca}|${p.red}`));
  const conSerie = new Set(diario.map((d) => `${d.marca}|${d.red}`));
  const cuentas = [...ds.cuentas];
  for (const c of imp.cuentas || []) if (!cuentas.some((x) => x.id === c.id)) cuentas.push(c);
  return recalcularPeriodo({
    ...ds,
    cuentas,
    posts: [...ds.posts.filter((p) => !conPosts.has(`${p.marca}|${p.red}`)), ...posts],
    diario: [...ds.diario.filter((d) => !conSerie.has(`${d.marca}|${d.red}`)), ...diario],
    meta: { ...ds.meta, importado: true },
  });
}

/** Dataset vacío (para un cliente que solo quiere analizar lo que importa). */
export function datasetVacio(nombrePropia = "Mi marca", competidores = []) {
  const hoy = hoyLocal();
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
