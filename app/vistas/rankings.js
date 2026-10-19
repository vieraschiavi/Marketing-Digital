// © 2026 Martín Viera. Todos los derechos reservados.
// Rankings y proyecciones (estilo Social Blade, motor propio): grado A++…D−,
// posiciones por red, ficha de cuenta con estadísticas diarias, promedios,
// proyección de seguidores con banda, próximo hito e ingresos estimados.

import { ranking, fichaCuenta, CPM_DEFECTO } from "../../core/rankings.js";
import { REDES, IDS_REDES } from "../../core/catalogo.js";
import { lineas, esc } from "../graficos.js";
import { panel, tabla, red, punto } from "./comun.js";

const claseGrado = (g) => (g.startsWith("A") ? "verde" : g.startsWith("B") ? "azul" : g.startsWith("C") ? "ambar" : "rojo");

function ficha(ctx, marca, redId) {
  const { ds, t, fmt, estado } = ctx;
  const cpmUsuario = estado.ui.cpm?.[redId];
  const f = fichaCuenta(ds, marca, redId);
  if (!f) return panel(t("rank.ficha"), `<p class="muted">${esc(t("app.sinDatos"))}</p>`);
  // Con menos de 14 días de serie no hay proyección: se muestra la ficha sin ella.
  if (!f.proyeccion) return panel(t("rank.ficha"), `<p class="muted">${esc(t("rank.sinProyeccion"))}</p>`, { extra: `<button class="btn-ghost chico" data-accion="cerrarFicha">✕</button>` });
  const cpm = cpmUsuario || CPM_DEFECTO[redId];
  const ingresosMes = [f.ingresos.vistasMensuales / 1000 * cpm[0], f.ingresos.vistasMensuales / 1000 * cpm[1]];
  const hist = f.tabla.slice().reverse();
  const proy = f.serieProyectada;
  const etiquetas = [...hist.map((x) => fmt.fecha(x.fecha)), ...proy.map((p) => fmt.fecha(p.fecha))];
  const nh = hist.length;
  const serieHist = [...hist.map((x) => x.seguidores), ...Array(proy.length).fill(null)];
  const unir = (campo) => [...Array(nh - 1).fill(null), hist[nh - 1].seguidores, ...proy.map((p) => p[campo])];
  const graf = lineas([
    { nombre: t("rank.historico"), valores: serieHist, color: REDES[redId].color },
    { nombre: t("rank.proyeccion"), valores: unir("estimado"), color: "#f2b441", punteada: true },
    { nombre: t("rank.bandaAlta"), valores: unir("alto"), color: "#4b6385", punteada: true, ancho: 1 },
    { nombre: t("rank.bandaBaja"), valores: unir("bajo"), color: "#4b6385", punteada: true, ancho: 1 },
  ], etiquetas, { formato: fmt.corto, minCero: false });

  const nombresHz = { 30: t("rank.h30"), 90: t("rank.h90"), 180: t("rank.h180"), 365: t("rank.h365"), 1825: t("rank.h1825") };
  const tablaProy = tabla([
    { t: t("rank.horizonte"), v: (p) => `${esc(nombresHz[p.dias])}${p.extrapolacion ? ` <span class="pill gris" title="${esc(t("rank.extrapolacionTip"))}">${esc(t("rank.extrapolacion"))}</span>` : ""}` },
    { t: t("col.fecha"), v: (p) => esc(fmt.fecha(p.fecha)) },
    { t: t("rank.estimado"), v: (p) => `<b>${fmt.entero(p.estimado)}</b>`, num: true },
    { t: t("rank.rango"), v: (p) => `${fmt.corto(p.bajo)} – ${fmt.corto(p.alto)}`, num: true },
  ], f.proyeccion.puntos);

  const dias = t("dias.cortos").split(",");
  const tablaDia = tabla([
    { t: t("col.fecha"), v: (x) => `${esc(fmt.fecha(x.fecha))} <span class="muted">${esc(dias[x.dia])}</span>` },
    { t: t("kpi.seguidores"), v: (x) => fmt.entero(x.seguidores), num: true },
    { t: t("rank.ganancia"), v: (x) => `<span class="${x.ganancia >= 0 ? "sube" : "baja"}">${fmt.signo(x.ganancia)}</span>`, num: true },
    { t: t("col.impresiones"), v: (x) => fmt.corto(x.impresiones), num: true },
    { t: t("col.interacciones"), v: (x) => fmt.entero(x.interacciones), num: true },
    { t: t("col.publicaciones"), v: (x) => fmt.entero(x.publicaciones), num: true },
  ], f.tabla);

  return `
  <div class="panel ficha">
    <div class="ficha-cab">
      <span class="grado ${claseGrado(f.grado)}" title="${esc(t("rank.gradoAyuda"))}">${esc(f.grado)}</span>
      <div><h3>${esc(f.nombre)} ${red(redId)}</h3><p class="muted">${esc(f.handle)} · ${esc(t("rank.posiciones", { s: f.rankSeguidores, c: f.rankCrecimiento, e: f.rankEr, n: f.totalRed }))}</p></div>
      <button class="btn-ghost chico" data-accion="cerrarFicha">✕</button>
    </div>
    <div class="mini-kpis seis">
      <div><b>${fmt.corto(f.seguidores)}</b><span>${esc(t("kpi.seguidores"))}</span></div>
      <div><b class="${f.promedios.diaria >= 0 ? "sube" : "baja"}">${fmt.signo(f.promedios.diaria)}</b><span>${esc(t("rank.promDiario"))}</span></div>
      <div><b>${fmt.signo(f.promedios.semanal)}</b><span>${esc(t("rank.promSemanal"))}</span></div>
      <div><b>${fmt.signo(f.promedios.mensual)}</b><span>${esc(t("rank.promMensual"))}</span></div>
      <div><b>${fmt.pct(f.proyeccion.tasaMensual)}</b><span>${esc(t("rank.tasaMensual"))}</span></div>
      <div><b>${f.hito?.dias ? fmt.entero(f.hito.dias) + " d" : "—"}</b><span>${esc(t("rank.hito", { hito: fmt.corto(f.hito?.hito) }))}</span></div>
    </div>
    <div class="grid g-2">
      <div>${graf}</div>
      <div>${tablaProy}<p class="muted">${esc(t("rank.proyNota"))}</p></div>
    </div>
    <div class="grid g-2">
      <div><h4>${esc(t("rank.ingresos"))}</h4>
        <p class="ingresos"><b>${fmt.moneda(ingresosMes[0])} – ${fmt.moneda(ingresosMes[1])}</b> / ${esc(t("rank.mes"))} · <b>${fmt.moneda(ingresosMes[0] * 12)} – ${fmt.moneda(ingresosMes[1] * 12)}</b> / ${esc(t("rank.anio"))}</p>
        <label class="inline">CPM USD <input type="number" step="0.01" min="0" value="${cpm[0]}" data-cambio="cpm" data-red="${redId}" data-i="0"> – <input type="number" step="0.01" min="0" value="${cpm[1]}" data-cambio="cpm" data-red="${redId}" data-i="1"></label>
        <p class="muted">${esc(t("rank.ingresosNota", { vistas: fmt.corto(f.ingresos.vistasMensuales) }))}</p>
      </div>
      <div><h4>${esc(t("rank.diario"))}</h4>${tablaDia}</div>
    </div>
  </div>`;
}

export function render(ctx) {
  const { ds, t, fmt, estado } = ctx;
  const redSel = ctx.filtros.redes?.[0] || estado.ui.rankRed || "instagram";
  const filas = ranking(ds, redSel);
  const sel = estado.ui.rankFicha;
  const selector = `<div class="seg chico">${IDS_REDES.filter((r) => ds.cuentas.some((c) => c.red === r)).map((r) => `<button class="${r === redSel ? "on" : ""}" data-accion="rankRed" data-red="${r}">${esc(REDES[r].nombre)}</button>`).join("")}</div>`;
  const tablaR = tabla([
    { t: "#", v: (x) => `<b>${x.rankSeguidores}</b>`, num: true },
    { t: t("rank.grado"), v: (x) => `<span class="grado chico ${claseGrado(x.grado)}">${esc(x.grado)}</span>` },
    { t: t("col.marca"), v: (x) => `${punto(ds.marcas.find((m) => m.id === x.marca)?.color)} ${x.propia ? "<b>" : ""}${esc(x.nombre)}${x.propia ? "</b>" : ""} <span class="muted">${esc(x.handle)}</span>` },
    { t: t("kpi.seguidores"), v: (x) => fmt.entero(x.seguidores), num: true },
    { t: t("rank.ganancia30"), v: (x) => `<span class="${x.ganancia30 >= 0 ? "sube" : "baja"}">${fmt.signo(x.ganancia30)}</span>`, num: true },
    { t: t("kpi.crecimiento"), v: (x) => `${fmt.pct(x.crecimiento30)} <span class="muted">#${x.rankCrecimiento}</span>`, num: true },
    { t: "ER", v: (x) => `${fmt.pct(x.er)} <span class="muted">#${x.rankEr}</span>`, num: true },
    { t: t("rank.vistas30"), v: (x) => fmt.corto(x.vistas30), num: true },
  ], filas, { claseFila: (x) => (x.propia ? "fila-propia" : ""), accionFila: (x) => `data-accion="abrirFicha" data-marca="${x.marca}" data-red="${x.red}"` });

  return `
  ${panel(t("rank.titulo"), tablaR + `<p class="muted">${esc(t("rank.formula"))}</p>`, { extra: selector, ayuda: t("rank.gradoAyuda") })}
  ${sel && sel.red === redSel ? ficha(ctx, sel.marca, sel.red) : `<p class="muted centro">${esc(t("rank.elegi"))}</p>`}
  `;
}

export const acciones = {
  rankRed: (ctx, el) => ctx.actualizar({ filtros: { ...ctx.estado.filtros, redes: null }, ui: { ...ctx.estado.ui, rankRed: el.dataset.red, rankFicha: null } }),
  abrirFicha: (ctx, el) => ctx.actualizar({ ui: { ...ctx.estado.ui, rankFicha: { marca: el.dataset.marca, red: el.dataset.red } } }),
  cerrarFicha: (ctx) => ctx.actualizar({ ui: { ...ctx.estado.ui, rankFicha: null } }),
};

export const cambios = {
  cpm: (ctx, el) => {
    const r = el.dataset.red;
    const actual = [...(ctx.estado.ui.cpm?.[r] || CPM_DEFECTO[r])];
    actual[Number(el.dataset.i)] = Math.max(0, Number(el.value) || 0);
    ctx.actualizar({ ui: { ...ctx.estado.ui, cpm: { ...(ctx.estado.ui.cpm || {}), [r]: actual } } });
  },
};
