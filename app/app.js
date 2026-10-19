// © 2026 Martín Viera. Todos los derechos reservados.
//
// Shell de la aplicación: estado, filtros globales, navegación y despacho de
// eventos. Las vistas (app/vistas/*.js) son funciones puras estado → HTML más
// un mapa de acciones; este archivo es el único que toca el DOM raíz.
//
// El mismo código corre en el .exe (Electron) y en la demo web (/app en Vercel).

import { generarDemo } from "../core/demo.js";
import { IDS_REDES, REDES, GEO, EDADES, INTERESES, INDUSTRIAS, FORMATOS } from "../core/catalogo.js";
import { campanasDemo } from "../core/campanas.js";
import { mezclarImportados } from "../core/importar.js";
import { generarSugerencias } from "../core/sugerencias.js";
import { crearTraductor, IDIOMAS } from "../core/i18n.js";
import { crearFormato } from "./formato.js";
import { plataforma } from "./plataforma.js";
import { esc } from "./graficos.js";
import { hoyLocal } from "../core/fechas.js";
import { VISTAS, ICONOS } from "./vistas/indice.js";

const PERIODOS = [7, 30, 90, 180];

const estado = {
  idioma: "es",
  vista: "resumen",
  tema: "oscuro",
  industria: "cafeteria",
  paisBase: "UY",
  semilla: 42,
  filtros: { periodo: 30, desde: null, hasta: null, marcas: null, redes: null, pais: null, ciudad: null, edades: null, generos: null, interes: null, formato: null },
  filtrosAbiertos: false,
  nombresMarcas: {},
  importados: { posts: [], diario: [], cuentas: [] },
  cola: [],
  campanas: null,
  chat: [],
  hechas: {},
  ia: { disponible: false, proveedores: {} },
  ds: null,
  ui: {},
};

// Claves que se persisten (el dataset demo se regenera: es determinístico).
const PERSISTIR = ["idioma", "vista", "tema", "industria", "paisBase", "filtros", "nombresMarcas", "importados", "cola", "campanas", "chat", "hechas"];

let t = crearTraductor("es");
let fmt = crearFormato("es");
let cacheSug = { clave: null, valor: [] };

function construirDataset() {
  const fin = hoyLocal();
  let ds = generarDemo({ semilla: estado.semilla, industria: estado.industria, paisBase: estado.paisBase, fin });
  try {
    ds = mezclarImportados(ds, estado.importados);
  } catch (e) {
    // Datos importados corruptos (versión vieja, archivo roto): la app arranca igual.
    console.error("Importados descartados:", e);
    estado.importados = { posts: [], diario: [], cuentas: [] };
  }
  ds.marcas = ds.marcas.map((m) => ({ ...m, nombre: estado.nombresMarcas[m.id] || m.nombre }));
  estado.ds = ds;
  if (!estado.campanas) estado.campanas = campanasDemo(ds);
  cacheSug = { clave: null, valor: [] };
}

/** Filtros efectivos para el motor (resuelve el período relativo). */
export function filtrosMotor(ds = estado.ds, f = estado.filtros) {
  let desde = f.desde, hasta = f.hasta;
  if (f.periodo) {
    const fin = Date.parse(ds.meta.fin + "T00:00:00Z");
    desde = new Date(fin - (f.periodo - 1) * 86400000).toISOString().slice(0, 10);
    hasta = ds.meta.fin;
  }
  return { ...f, desde, hasta };
}

function sugerencias() {
  const fm = filtrosMotor();
  const clave = JSON.stringify(fm) + estado.ds.posts.length;
  if (cacheSug.clave !== clave) cacheSug = { clave, valor: generarSugerencias(estado.ds, fm) };
  return cacheSug.valor;
}

function nombreMarca(id) {
  return estado.ds.marcas.find((m) => m.id === id)?.nombre || id;
}

function contexto() {
  return {
    estado, ds: estado.ds, t, fmt, plataforma,
    filtros: filtrosMotor(),
    propia: estado.ds.marcas.find((m) => m.propia),
    sugerencias,
    nombreMarca,
    actualizar,
    ir: (vista) => actualizar({ vista }),
    toast,
    rehacerDataset: () => { construirDataset(); render(); },
  };
}

let guardadoPendiente = null;
function persistir() {
  clearTimeout(guardadoPendiente);
  guardadoPendiente = setTimeout(() => {
    const datos = Object.fromEntries(PERSISTIR.map((k) => [k, estado[k]]));
    plataforma.guardar("estado", datos).catch((e) => console.error("No se pudo guardar el estado", e));
  }, 300);
}

function actualizar(cambios = {}, { rehacer = false } = {}) {
  Object.assign(estado, cambios);
  if (cambios.idioma) {
    t = crearTraductor(estado.idioma);
    fmt = crearFormato(estado.idioma);
    document.documentElement.lang = estado.idioma;
  }
  if (rehacer) construirDataset();
  persistir();
  render();
}

function toast(mensaje, tipo = "ok") {
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.textContent = mensaje;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("fuera"), 3200);
  setTimeout(() => el.remove(), 3800);
}

// ── Barra de filtros ─────────────────────────────────────────────────────

function opciones(lista, actual, etiquetaTodas) {
  return `<option value="">${esc(etiquetaTodas)}</option>` + lista.map(([v, e]) => `<option value="${esc(v)}" ${String(actual) === String(v) ? "selected" : ""}>${esc(e)}</option>`).join("");
}

function barraFiltros() {
  const f = estado.filtros;
  const ds = estado.ds;
  const paises = Object.entries(GEO).map(([k, g]) => [k, g.nombre]);
  const ciudades = f.pais ? Object.keys(GEO[f.pais].ciudades).map((c) => [`${f.pais}|${c}`, c]) : [];
  const activos = ["marcas", "redes", "pais", "ciudad", "edades", "generos", "interes", "formato"].filter((k) => f[k] && (!Array.isArray(f[k]) || f[k].length)).length;
  const chip = (grupo, valor, etiqueta) => {
    const on = (f[grupo] || []).map(String).includes(String(valor));
    return `<button class="chip ${on ? "on" : ""}" data-accion="filtroChip" data-grupo="${grupo}" data-valor="${esc(valor)}">${esc(etiqueta)}</button>`;
  };
  return `
  <div class="filtros ${estado.filtrosAbiertos ? "abiertos" : ""}">
    <div class="filtros-linea">
      <div class="seg" role="group" aria-label="${esc(t("fil.periodo"))}">
        ${PERIODOS.map((p) => `<button class="${f.periodo === p ? "on" : ""}" data-accion="periodo" data-dias="${p}">${p}${esc(t("fil.diasCorto"))}</button>`).join("")}
        <button class="${!f.periodo ? "on" : ""}" data-accion="periodo" data-dias="">${esc(t("fil.personalizado"))}</button>
      </div>
      ${!f.periodo ? `<input type="date" data-cambio="filtro" data-campo="desde" value="${esc(f.desde || ds.meta.inicio)}" min="${ds.meta.inicio}" max="${ds.meta.fin}"><input type="date" data-cambio="filtro" data-campo="hasta" value="${esc(f.hasta || ds.meta.fin)}" min="${ds.meta.inicio}" max="${ds.meta.fin}">` : ""}
      <select data-cambio="filtro" data-campo="red" aria-label="${esc(t("fil.red"))}">${opciones(IDS_REDES.map((r) => [r, REDES[r].nombre]), f.redes?.[0] || "", t("fil.todasRedes"))}</select>
      <select data-cambio="filtro" data-campo="pais" aria-label="${esc(t("fil.pais"))}">${opciones(paises, f.pais || "", t("fil.todosPaises"))}</select>
      <select data-cambio="filtro" data-campo="ciudad" aria-label="${esc(t("fil.ciudad"))}" ${f.pais ? "" : "disabled"}>${opciones(ciudades, f.ciudad || "", t("fil.todasCiudades"))}</select>
      <button class="btn-ghost" data-accion="toggleFiltros">${esc(t("fil.publico"))}${activos ? ` <b class="badge">${activos}</b>` : ""} ▾</button>
      ${activos ? `<button class="btn-link" data-accion="limpiarFiltros">${esc(t("fil.limpiar"))}</button>` : ""}
    </div>
    <div class="filtros-extra">
      <div class="fx-grupo"><span>${esc(t("fil.marcas"))}</span>${ds.marcas.map((m) => chip("marcas", m.id, m.nombre)).join("")}</div>
      <div class="fx-grupo"><span>${esc(t("fil.edad"))}</span>${EDADES.map((e, i) => chip("edades", i, e)).join("")}</div>
      <div class="fx-grupo"><span>${esc(t("fil.genero"))}</span>${["mujer", "hombre", "otro"].map((g, i) => chip("generos", i, t("gen." + g))).join("")}</div>
      <div class="fx-grupo"><span>${esc(t("fil.interes"))}</span>
        <select data-cambio="filtro" data-campo="interes">${opciones(INTERESES.map((i) => [i, t("int." + i)]), f.interes || "", t("fil.todos"))}</select>
        <span>${esc(t("fil.formato"))}</span>
        <select data-cambio="filtro" data-campo="formato">${opciones(Object.keys(FORMATOS).map((k) => [k, t("fmt." + k)]), f.formato || "", t("fil.todos"))}</select>
      </div>
    </div>
  </div>`;
}

// ── Render ───────────────────────────────────────────────────────────────

function render() {
  const raiz = document.getElementById("app");
  const ctx = contexto();
  const vista = VISTAS[estado.vista] || VISTAS.resumen;
  const urgentes = sugerencias().filter((s) => s.prioridad === "urgente").length;
  const pendientes = estado.ds.menciones.filter((m) => m.marca === ctx.propia.id && m.requiereRespuesta && !m.respondida).length;
  let cuerpo;
  try {
    cuerpo = vista.render(ctx);
  } catch (e) {
    console.error(e);
    cuerpo = `<div class="panel error"><h3>${esc(t("app.errorVista"))}</h3><pre>${esc(e.stack || e)}</pre></div>`;
  }
  document.documentElement.dataset.theme = estado.tema === "claro" ? "light" : "dark";
  raiz.innerHTML = `
  <aside class="lateral">
    <div class="marca-app"><img src="logo-mv.svg" alt="MV" width="34" height="34"><div><b>MV Marketing</b><small>Digital</small></div></div>
    <nav>${Object.keys(VISTAS).map((id) => `
      <button class="nav ${estado.vista === id ? "on" : ""}" data-accion="ir" data-vista="${id}">${ICONOS[id] || ""}<span>${esc(t("nav." + id))}</span>
      ${id === "sugerencias" && urgentes ? `<b class="badge rojo">${urgentes}</b>` : ""}${id === "bandeja" && pendientes ? `<b class="badge">${pendientes}</b>` : ""}</button>`).join("")}
    </nav>
    <div class="lateral-pie">
      <select data-cambio="idioma" aria-label="Idioma">${IDIOMAS.map((l) => `<option value="${l}" ${estado.idioma === l ? "selected" : ""}>${l.toUpperCase()}</option>`).join("")}</select>
      <button class="btn-ghost chico" data-accion="tema" title="${esc(t("app.tema"))}">${estado.tema === "claro" ? "☾" : "☀"}</button>
    </div>
  </aside>
  <main>
    <header class="superior">
      <div><h1>${esc(t("nav." + estado.vista))}</h1>
      <p class="muted">${esc(ctx.propia.nombre)} · ${esc(estado.ds.meta.industriaNombre)} · ${esc(fmt.fecha(ctx.filtros.desde))} – ${esc(fmt.fecha(ctx.filtros.hasta))}
      ${estado.ds.meta.importado ? `<span class="pill azul" title="${esc(t("app.mixtoTip"))}">${esc(t("app.mixto"))}</span>` : estado.ds.meta.sintetico ? `<span class="pill ambar" title="${esc(t("app.sinteticoTip"))}">${esc(t("app.sintetico"))}</span>` : ""}</p></div>
      <button class="btn-primario" data-accion="ir" data-vista="asistente">✦ ${esc(t("nav.asistente"))}</button>
    </header>
    ${vista.sinFiltros ? "" : barraFiltros()}
    <section class="contenido" id="contenido">${cuerpo}</section>
  </main>`;
  if (vista.montar) {
    try {
      vista.montar(ctx, document.getElementById("contenido"));
    } catch (e) {
      console.error(e);
    }
  }
}

// ── Eventos (delegados) ──────────────────────────────────────────────────

const ACCIONES_GLOBALES = {
  ir: (ctx, el) => actualizar({ vista: el.dataset.vista }),
  tema: () => actualizar({ tema: estado.tema === "claro" ? "oscuro" : "claro" }),
  toggleFiltros: () => actualizar({ filtrosAbiertos: !estado.filtrosAbiertos }),
  periodo: (ctx, el) => {
    const d = el.dataset.dias ? Number(el.dataset.dias) : null;
    actualizar({ filtros: { ...estado.filtros, periodo: d, desde: d ? null : estado.filtros.desde || estado.ds.meta.inicio, hasta: d ? null : estado.filtros.hasta || estado.ds.meta.fin } });
  },
  limpiarFiltros: () => actualizar({ filtros: { ...estado.filtros, marcas: null, redes: null, pais: null, ciudad: null, edades: null, generos: null, interes: null, formato: null } }),
  filtroChip: (ctx, el) => {
    const g = el.dataset.grupo;
    const v = g === "marcas" ? el.dataset.valor : Number(el.dataset.valor);
    const lista = new Set(estado.filtros[g] || []);
    lista.has(v) ? lista.delete(v) : lista.add(v);
    actualizar({ filtros: { ...estado.filtros, [g]: lista.size ? [...lista] : null } });
  },
};

const CAMBIOS_GLOBALES = {
  idioma: (ctx, el) => actualizar({ idioma: el.value }),
  filtro: (ctx, el) => {
    const campo = el.dataset.campo;
    const v = el.value || null;
    const f = { ...estado.filtros };
    if (campo === "red") f.redes = v ? [v] : null;
    else if (campo === "pais") { f.pais = v; f.ciudad = null; }
    else f[campo] = v;
    actualizar({ filtros: f });
  },
};

function despachar(tipo, ev) {
  const atributo = tipo === "click" ? "accion" : "cambio";
  const el = ev.target.closest(`[data-${atributo}]`);
  if (!el) return;
  const nombre = el.dataset[atributo];
  const vista = VISTAS[estado.vista] || VISTAS.resumen;
  const mapa = tipo === "click" ? { ...ACCIONES_GLOBALES, ...(vista.acciones || {}) } : { ...CAMBIOS_GLOBALES, ...(vista.cambios || {}) };
  const fn = mapa[nombre];
  if (!fn) return;
  if (tipo === "click" && el.tagName !== "INPUT") ev.preventDefault();
  Promise.resolve(fn(contexto(), el, ev)).catch((e) => {
    console.error(e);
    toast(String(e.message || e), "error");
  });
}

async function iniciar() {
  const guardado = await plataforma.leer("estado", null);
  if (guardado) for (const k of PERSISTIR) if (guardado[k] !== undefined) estado[k] = guardado[k];
  if (!INDUSTRIAS[estado.industria]) estado.industria = "cafeteria";
  if (!GEO[estado.paisBase]) estado.paisBase = "UY";
  const param = new URLSearchParams(location.search);
  if (IDIOMAS.includes(param.get("lang"))) estado.idioma = param.get("lang");
  if (param.get("vista")) estado.vista = param.get("vista");
  // Una vista desconocida (URL vieja, estado de otra versión) no puede romper los clics.
  if (!Object.hasOwn(VISTAS, estado.vista)) estado.vista = "resumen";
  if (!IDIOMAS.includes(estado.idioma)) estado.idioma = "es";
  t = crearTraductor(estado.idioma);
  fmt = crearFormato(estado.idioma);
  document.documentElement.lang = estado.idioma;
  try {
    estado.ia = await plataforma.iaEstado();
  } catch {
    estado.ia = { disponible: false, proveedores: {} };
  }
  construirDataset();
  document.addEventListener("click", (e) => despachar("click", e));
  document.addEventListener("change", (e) => despachar("change", e));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("[data-enter]")) {
      e.preventDefault();
      const fn = (VISTAS[estado.vista] || VISTAS.resumen).acciones?.[e.target.dataset.enter];
      if (fn) Promise.resolve(fn(contexto(), e.target, e)).catch((err) => toast(String(err.message || err), "error"));
    }
  });
  render();
  document.body.classList.add("listo");
}

iniciar().catch((e) => {
  console.error(e);
  document.getElementById("app").innerHTML = `<pre class="panel error">${esc(e.stack || e)}</pre>`;
});
