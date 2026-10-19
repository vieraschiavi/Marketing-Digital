// © 2026 Martín Viera. Todos los derechos reservados.
//
// Rankings y proyecciones por cuenta, al estilo Social Blade pero con motor
// propio y fórmulas a la vista:
//   • Grado A++ … D−  → percentil combinado de tamaño (40 %), crecimiento 30 d
//                       (35 %) y engagement (25 %) dentro de la misma red.
//   • Ranking         → posición por seguidores, crecimiento y ER en cada red.
//   • Tabla diaria    → seguidores, ganancia del día, impresiones e interacciones.
//   • Promedios       → ganancia media diaria, semanal y mensual (últimos 30 d).
//   • Proyección      → regresión log-lineal sobre los últimos 90 días, con banda
//                       por el desvío de los residuos y crecimiento AMORTIGUADO:
//                       la tasa decae con vida media de ~4 meses (τ = 180 d), porque
//                       ninguna cuenta sostiene un ritmo explosivo cinco años. Más
//                       allá de 6 meses es extrapolación y la UI lo marca.
//   • Hitos           → días estimados hasta el próximo número redondo.
//   • Ingresos        → vistas × rango de CPM que define el usuario. ESTIMADO.

import { pct } from "./metricas.js";
import { REDES } from "./catalogo.js";

const GRADOS = ["D-", "D", "D+", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+", "A++"];

// CPM orientativo por red (USD por 1000 vistas monetizadas). El usuario lo ajusta.
export const CPM_DEFECTO = {
  youtube: [0.5, 4], tiktok: [0.02, 0.06], facebook: [0.2, 1.5], instagram: [0.1, 1], x: [0.05, 0.4],
  linkedin: [0.3, 2], pinterest: [0.05, 0.5], threads: [0.02, 0.2],
};

function serieCuenta(ds, marca, red) {
  return ds.diario.filter((d) => d.marca === marca && d.red === red).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function percentil(valor, lista) {
  if (lista.length <= 1) return 0.5;
  const menores = lista.filter((x) => x < valor).length;
  const iguales = lista.filter((x) => x === valor).length;
  return (menores + (iguales - 1) / 2) / (lista.length - 1);
}

export function letraGrado(puntaje) {
  const i = Math.max(0, Math.min(GRADOS.length - 1, Math.floor(puntaje * GRADOS.length)));
  return GRADOS[i];
}

/** Métricas base de cada cuenta (últimos 30 días). */
function metricasCuentas(ds, dias = 30) {
  return ds.cuentas.map((c) => {
    const s = serieCuenta(ds, c.marca, c.red);
    if (s.length < 2) return null;
    const ult = s[s.length - 1];
    const ini = s[Math.max(0, s.length - 1 - dias)];
    const ventana = s.slice(-dias);
    const posts = ds.posts.filter((p) => p.marca === c.marca && p.red === c.red && p.fecha.slice(0, 10) > ini.fecha);
    const alc = posts.reduce((a, p) => a + p.alcance, 0);
    const int = posts.reduce((a, p) => a + p.interacciones, 0);
    return {
      cuenta: c.id, marca: c.marca, red: c.red, handle: c.handle,
      nombre: ds.marcas.find((m) => m.id === c.marca)?.nombre, propia: ds.marcas.find((m) => m.id === c.marca)?.propia,
      seguidores: ult.seguidores,
      ganancia30: ult.seguidores - ini.seguidores,
      crecimiento30: pct(ult.seguidores - ini.seguidores, ini.seguidores),
      er: pct(int, alc),
      vistas30: ventana.reduce((a, d) => a + d.impresiones, 0),
    };
  }).filter(Boolean);
}

/** Ranking por red con grado. Si `red` es null, rankea dentro de cada red. */
export function ranking(ds, red = null) {
  const todas = metricasCuentas(ds);
  const salida = [];
  for (const r of red ? [red] : Object.keys(REDES)) {
    const grupo = todas.filter((x) => x.red === r);
    if (!grupo.length) continue;
    const seg = grupo.map((x) => Math.log10(x.seguidores + 1));
    const cre = grupo.map((x) => x.crecimiento30);
    const ers = grupo.map((x) => x.er);
    const conPuntaje = grupo.map((x) => {
      const puntaje = 0.4 * percentil(Math.log10(x.seguidores + 1), seg) + 0.35 * percentil(x.crecimiento30, cre) + 0.25 * percentil(x.er, ers);
      return { ...x, puntaje: Math.round(puntaje * 100) / 100, grado: letraGrado(puntaje) };
    });
    const pos = (clave) => {
      const orden = [...conPuntaje].sort((a, b) => b[clave] - a[clave]).map((x) => x.cuenta);
      return (x) => orden.indexOf(x.cuenta) + 1;
    };
    const pSeg = pos("seguidores"), pCre = pos("crecimiento30"), pEr = pos("er");
    for (const x of conPuntaje) salida.push({ ...x, rankSeguidores: pSeg(x), rankCrecimiento: pCre(x), rankEr: pEr(x), totalRed: grupo.length });
  }
  return salida.sort((a, b) => a.red.localeCompare(b.red) || a.rankSeguidores - b.rankSeguidores);
}

/** Tabla diaria estilo "detailed statistics" (más reciente primero). */
export function tablaDiaria(ds, marca, red, dias = 30) {
  const s = serieCuenta(ds, marca, red);
  const desde = Math.max(1, s.length - dias);
  const filas = [];
  for (let i = desde; i < s.length; i++) {
    filas.push({
      fecha: s[i].fecha, dia: new Date(s[i].fecha + "T00:00:00Z").getUTCDay(),
      seguidores: s[i].seguidores, ganancia: s[i].seguidores - s[i - 1].seguidores,
      impresiones: s[i].impresiones, interacciones: s[i].interacciones, publicaciones: s[i].publicaciones,
    });
  }
  return filas.reverse();
}

export function promedios(ds, marca, red, dias = 30) {
  const t = tablaDiaria(ds, marca, red, dias);
  if (!t.length) return { diaria: 0, semanal: 0, mensual: 0, vistasDiarias: 0 };
  const g = t.reduce((a, f) => a + f.ganancia, 0) / t.length;
  const v = t.reduce((a, f) => a + f.impresiones, 0) / t.length;
  return { diaria: g, semanal: g * 7, mensual: g * 30, vistasDiarias: v };
}

/** Regresión lineal simple y = a + b·x. */
function regresion(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const b = sxx ? sxy / sxx : 0;
  const a = my - b * mx;
  const res = ys.map((y, i) => y - (a + b * xs[i]));
  const sd = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2));
  return { a, b, sd };
}

export const HORIZONTES = [30, 90, 180, 365, 1825];
export const TAU_AMORTIGUACION = 180;

/** Días "efectivos" de crecimiento a horizonte h con tasa que decae: τ(1 − e^(−h/τ)). */
export const diasEfectivos = (h, tau = TAU_AMORTIGUACION) => tau * (1 - Math.exp(-h / tau));

/**
 * Proyección de seguidores. Ajusta log(seguidores) contra el día (crecimiento
 * compuesto) sobre la ventana reciente; la banda crece con √horizonte.
 */
export function proyeccion(ds, marca, red, ventana = 90) {
  const s = serieCuenta(ds, marca, red).slice(-ventana);
  if (s.length < 14) return null;
  const xs = s.map((_, i) => i);
  const ys = s.map((d) => Math.log(Math.max(1, d.seguidores)));
  const { a, b, sd } = regresion(xs, ys);
  const ultimo = s[s.length - 1];
  const finMs = Date.parse(ultimo.fecha + "T00:00:00Z");
  const xFin = xs[xs.length - 1];
  const puntos = HORIZONTES.map((h) => {
    const he = diasEfectivos(h);
    const media = a + b * (xFin + he);
    const banda = 1.64 * sd * Math.sqrt(1 + he / ventana) * Math.sqrt(he / 7);
    return {
      dias: h,
      fecha: new Date(finMs + h * 86400000).toISOString().slice(0, 10),
      estimado: Math.round(Math.exp(media)),
      bajo: Math.round(Math.exp(media - banda)),
      alto: Math.round(Math.exp(media + banda)),
      extrapolacion: h > 180,
    };
  });
  return { seguidoresHoy: ultimo.seguidores, tasaDiaria: (Math.exp(b) - 1) * 100, tasaMensual: (Math.exp(b * 30) - 1) * 100, puntos, ventana: s.length };
}

/** Proyección día a día (para graficar sin deformar el eje temporal). */
export function serieProyectada(ds, marca, red, dias = 30, ventana = 90) {
  const s = serieCuenta(ds, marca, red).slice(-ventana);
  if (s.length < 14) return [];
  const { a, b, sd } = regresion(s.map((_, i) => i), s.map((d) => Math.log(Math.max(1, d.seguidores))));
  const xFin = s.length - 1;
  const finMs = Date.parse(s[xFin].fecha + "T00:00:00Z");
  return Array.from({ length: dias }, (_, i) => {
    const h = i + 1, he = diasEfectivos(h);
    const media = a + b * (xFin + he);
    const banda = 1.64 * sd * Math.sqrt(1 + he / ventana) * Math.sqrt(he / 7);
    return { fecha: new Date(finMs + h * 86400000).toISOString().slice(0, 10), estimado: Math.exp(media), bajo: Math.exp(media - banda), alto: Math.exp(media + banda) };
  });
}

/** Próximo hito redondo y días estimados hasta alcanzarlo. */
export function proximoHito(ds, marca, red) {
  const p = proyeccion(ds, marca, red);
  if (!p) return null;
  const hoy = p.seguidoresHoy;
  const escala = 10 ** Math.floor(Math.log10(Math.max(hoy, 10)));
  const pasos = [1, 2, 2.5, 5, 10].map((k) => k * escala).filter((v) => v > hoy);
  const hito = pasos[0] || 10 * escala;
  const tasa = p.tasaDiaria / 100;
  if (tasa <= 0) return { hito, dias: null };
  // Con crecimiento amortiguado el techo es hoy·e^(b·τ): si el hito queda arriba, no llega.
  const necesario = Math.log(hito / hoy) / Math.log(1 + tasa);
  if (necesario >= TAU_AMORTIGUACION) return { hito, dias: null };
  const dias = Math.ceil(-TAU_AMORTIGUACION * Math.log(1 - necesario / TAU_AMORTIGUACION));
  return { hito, dias, fecha: new Date(Date.parse(ds.meta.fin + "T00:00:00Z") + dias * 86400000).toISOString().slice(0, 10) };
}

/** Ingresos estimados por vistas (rango) — mensual y anual. */
export function ingresosEstimados(ds, marca, red, cpm = CPM_DEFECTO[red] || [0.1, 1]) {
  const prom = promedios(ds, marca, red);
  const mensuales = prom.vistasDiarias * 30;
  return {
    cpm,
    vistasMensuales: Math.round(mensuales),
    mensual: [mensuales / 1000 * cpm[0], mensuales / 1000 * cpm[1]],
    anual: [mensuales * 12 / 1000 * cpm[0], mensuales * 12 / 1000 * cpm[1]],
    estimado: true,
  };
}

/** Ficha completa de una cuenta (para la vista de detalle). */
export function fichaCuenta(ds, marca, red) {
  const r = ranking(ds, red).find((x) => x.marca === marca);
  if (!r) return null;
  return { ...r, promedios: promedios(ds, marca, red), proyeccion: proyeccion(ds, marca, red), hito: proximoHito(ds, marca, red), serieProyectada: serieProyectada(ds, marca, red, 30), ingresos: ingresosEstimados(ds, marca, red), tabla: tablaDiaria(ds, marca, red, 30) };
}
