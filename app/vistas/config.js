// © 2026 Martín Viera. Todos los derechos reservados.
// Configuración: marca y competidores, datos (demo por industria / importar
// CSV), proveedores de IA con actualización de modelos, idioma y acerca de.

import { INDUSTRIAS, GEO, IDS_REDES, REDES } from "../../core/catalogo.js";
import { PROVEEDORES } from "../../core/ia.js";
import { importarCsv } from "../../core/importar.js";
import { esc } from "../graficos.js";
import { panel } from "./comun.js";

export const sinFiltros = true;

function bloqueIa(ctx) {
  const { t, estado, fmt } = ctx;
  if (!ctx.plataforma.esElectron) return `<p class="muted">${esc(t("cfg.iaWeb"))}</p>`;
  const ia = estado.ia || { proveedores: {} };
  return `<p class="muted">${esc(t("cfg.iaIntro"))}</p>
  <div class="proveedores">${Object.entries(PROVEEDORES).map(([id, p]) => {
    const e = ia.proveedores?.[id] || {};
    const modelos = e.modelos?.length ? e.modelos : p.respaldo;
    return `<div class="prov ${e.tieneClave ? "on" : ""}">
      <div class="prov-cab"><b>${esc(p.nombre)}</b> ${e.tieneClave ? `<span class="pill verde">${esc(t("cfg.conectado"))}</span>` : ""} ${ia.activo === id ? `<span class="pill azul">${esc(t("cfg.activo"))}</span>` : ""}</div>
      ${p.local ? `<p class="muted">${esc(t("cfg.ollama"))}</p>` : `<div class="buscar-linea"><input type="password" id="clave-${id}" placeholder="${esc(e.tieneClave ? "••••••••••••" : t("cfg.pegarClave"))}" autocomplete="off">
      <button class="btn-ghost chico" data-accion="guardarClave" data-p="${id}">${esc(t("cfg.guardar"))}</button>
      ${e.tieneClave ? `<button class="btn-ghost chico" data-accion="borrarClave" data-p="${id}">${esc(t("cfg.borrar"))}</button>` : ""}</div>`}
      ${e.tieneClave || p.local ? `<div class="fila-form"><label>${esc(t("cfg.modelo"))}<select data-cambio="modelo" data-p="${id}">${modelos.map((m) => `<option ${m === e.modelo ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
        <button class="btn-ghost chico" data-accion="actualizarModelos" data-p="${id}">↻ ${esc(t("cfg.actualizarModelos"))}</button>
        <button class="btn-ghost chico" data-accion="usarProveedor" data-p="${id}">${esc(t("cfg.usar"))}</button></div>
        <small class="muted">${esc(e.actualizado ? t("cfg.modelosAl", { fecha: fmt.fechaHora(e.actualizado.slice(0, 19)), origen: e.origen || "—" }) : t("cfg.modelosBase"))}</small>` : `<a href="#" data-accion="abrirConsola" data-url="${esc(p.consola)}">${esc(t("cfg.obtenerClave"))}</a>`}
    </div>`;
  }).join("")}</div>`;
}

export function render(ctx) {
  const { ds, t, estado } = ctx;
  const imp = estado.importados;
  return `
  <div class="grid g-2">
    ${panel(t("cfg.marcas"), `<p class="muted">${esc(t("cfg.marcasDesc"))}</p>
      ${ds.marcas.map((m) => `<label class="inline">${m.propia ? `<b>${esc(t("cfg.propia"))}</b>` : esc(t("cfg.competidor"))}<input data-cambio="nombreMarca" data-id="${m.id}" value="${esc(m.nombre)}"></label>`).join("")}`)}
    ${panel(t("cfg.datos"), `
      <div class="fila-form">
        <label>${esc(t("cfg.industria"))}<select data-cambio="industria">${Object.entries(INDUSTRIAS).map(([k, v]) => `<option value="${k}" ${estado.industria === k ? "selected" : ""}>${esc(v.nombre)}</option>`).join("")}</select></label>
        <label>${esc(t("cfg.paisBase"))}<select data-cambio="paisBase">${Object.entries(GEO).map(([k, g]) => `<option value="${k}" ${estado.paisBase === k ? "selected" : ""}>${esc(g.nombre)}</option>`).join("")}</select></label>
      </div>
      <p class="muted">${esc(t("cfg.demoDesc"))}</p>
      <h4>${esc(t("cfg.importar"))}</h4>
      <p class="muted">${esc(t("cfg.importarDesc"))}</p>
      <div class="fila-form">
        <label>${esc(t("col.marca"))}<select id="impMarca">${ds.marcas.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select></label>
        <label>${esc(t("col.red"))}<select id="impRed">${IDS_REDES.map((r) => `<option value="${r}">${esc(REDES[r].nombre)}</option>`).join("")}</select></label>
        <label>CSV<input type="file" id="impArchivo" accept=".csv,text/csv,.txt"></label>
      </div>
      <button class="btn-primario" data-accion="importar">${esc(t("cfg.importarBtn"))}</button>
      ${imp.posts.length || imp.diario.length ? `<p>${esc(t("cfg.importados", { posts: imp.posts.length, dias: imp.diario.length }))} <button class="btn-link" data-accion="borrarImportados">${esc(t("cfg.borrarImportados"))}</button></p>` : ""}
      ${estado.ui.ultimoImport ? `<div class="aviso-box"><b>${esc(t("cfg.resultadoImport", { n: estado.ui.ultimoImport.importadas, total: estado.ui.ultimoImport.filas }))}</b><ul>${estado.ui.ultimoImport.avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul><small class="muted">${esc(t("cfg.columnas"))}: ${esc(Object.entries(estado.ui.ultimoImport.columnas).map(([k, v]) => `${k}←${v}`).join(", "))}</small></div>` : ""}
    `)}
  </div>
  ${panel(t("cfg.ia"), bloqueIa(ctx))}
  ${panel(t("cfg.acerca"), `<p>${esc(t("cfg.acercaTexto"))}</p><p class="muted">${esc(t("cfg.version"))}: <span id="version">…</span> · © 2026 Martín Viera</p>
    <button class="btn-ghost chico" data-accion="reiniciar">${esc(t("cfg.reiniciar"))}</button>`)}
  `;
}

export async function montar(ctx, raiz) {
  const v = raiz.querySelector("#version");
  if (v) v.textContent = await ctx.plataforma.version();
}

async function refrescarIa(ctx) {
  ctx.estado.ia = await ctx.plataforma.iaEstado();
  ctx.actualizar({});
}

export const acciones = {
  guardarClave: async (ctx, el) => {
    const p = el.dataset.p;
    const input = document.getElementById("clave-" + p);
    const clave = input.value.trim();
    if (clave.length < 10) throw new Error(ctx.t("cfg.claveCorta"));
    await ctx.plataforma.iaGuardarClave(p, clave);
    input.value = "";
    ctx.toast(ctx.t("cfg.claveGuardada"));
    try {
      const r = await ctx.plataforma.iaActualizarModelos(p, true);
      ctx.toast(ctx.t("cfg.modelosOk", { n: r.lista.length, modelo: r.recomendado }));
    } catch (e) {
      ctx.toast(ctx.t("cfg.modelosError", { error: String(e.message || e) }), "error");
    }
    await refrescarIa(ctx);
  },
  borrarClave: async (ctx, el) => {
    await ctx.plataforma.iaBorrarClave(el.dataset.p);
    await refrescarIa(ctx);
  },
  actualizarModelos: async (ctx, el) => {
    const r = await ctx.plataforma.iaActualizarModelos(el.dataset.p, true);
    ctx.toast(ctx.t("cfg.modelosOk", { n: r.lista.length, modelo: r.recomendado }));
    await refrescarIa(ctx);
  },
  usarProveedor: async (ctx, el) => {
    await ctx.plataforma.guardar("iaActivo", el.dataset.p);
    await refrescarIa(ctx);
  },
  abrirConsola: (ctx, el) => ctx.plataforma.abrirExterno(el.dataset.url),
  importar: async (ctx) => {
    const archivo = document.getElementById("impArchivo").files[0];
    if (!archivo) throw new Error(ctx.t("cfg.elegiArchivo"));
    if (archivo.size > 20 * 1024 * 1024) throw new Error(ctx.t("cfg.archivoGrande"));
    const texto = await archivo.text();
    const marca = document.getElementById("impMarca").value;
    const red = document.getElementById("impRed").value;
    const vacio = { ...ctx.ds, posts: [], diario: [], cuentas: [] };
    const { ds, resumen } = importarCsv(vacio, texto, { marca, red });
    const imp = ctx.estado.importados;
    ctx.actualizar({
      importados: { posts: [...imp.posts, ...ds.posts], diario: [...imp.diario, ...ds.diario], cuentas: [...imp.cuentas, ...ds.cuentas] },
      ui: { ...ctx.estado.ui, ultimoImport: resumen },
    }, { rehacer: true });
    ctx.toast(ctx.t("cfg.resultadoImport", { n: resumen.importadas, total: resumen.filas }));
  },
  borrarImportados: (ctx) => ctx.actualizar({ importados: { posts: [], diario: [], cuentas: [] }, ui: { ...ctx.estado.ui, ultimoImport: null } }, { rehacer: true }),
  reiniciar: (ctx) => {
    if (!confirm(ctx.t("cfg.reiniciarConfirmar"))) return;
    ctx.actualizar({ cola: [], campanas: null, chat: [], hechas: {}, nombresMarcas: {}, importados: { posts: [], diario: [], cuentas: [] }, ui: {} }, { rehacer: true });
  },
};

export const cambios = {
  industria: (ctx, el) => ctx.actualizar({ industria: el.value, campanas: null, nombresMarcas: {} }, { rehacer: true }),
  paisBase: (ctx, el) => ctx.actualizar({ paisBase: el.value }, { rehacer: true }),
  nombreMarca: (ctx, el) => {
    const nombre = el.value.trim().slice(0, 60);
    if (!nombre) return;
    ctx.actualizar({ nombresMarcas: { ...ctx.estado.nombresMarcas, [el.dataset.id]: nombre } }, { rehacer: true });
  },
  modelo: async (ctx, el) => {
    await ctx.plataforma.iaElegirModelo(el.dataset.p, el.value);
    await refrescarIa(ctx);
  },
};
