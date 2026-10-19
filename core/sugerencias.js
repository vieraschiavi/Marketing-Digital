// © 2026 Martín Viera. Todos los derechos reservados.
//
// Motor de sugerencias por reglas. Funciona siempre, sin IA: cada sugerencia
// sale de una medición concreta del dataset (la `evidencia`) y se prioriza con
//     score = impacto × probabilidad_de_éxito ÷ esfuerzo   (escala 0–10)
// Las sugerencias no traen texto armado: traen `tipo` + `vars`, y la UI las
// redacta en ES/EN/PT con las plantillas de i18n (`sug.<tipo>.*`).

import { mejoresHorarios, porFormato, kpis, pct } from "./metricas.js";
import { benchmark, aceleraciones, brechas } from "./competencia.js";
import { analizarMenciones, bandeja } from "./escucha.js";
import { radarTendencias, ideasContenido } from "./busqueda.js";
import { normalizarFiltros, postsFiltrados, ultimosDias } from "./filtros.js";

const r1 = (x) => Math.round(x * 10) / 10;

function crear(tipo, vars, { impacto, probabilidad, esfuerzo, urgente = false, evidencia = {} }) {
  const score = Math.min(10, (impacto * probabilidad) / Math.max(esfuerzo, 1) * 3);
  const prioridad = urgente ? "urgente" : score >= 6 ? "alta" : score >= 3 ? "media" : "baja";
  return { id: `${tipo}-${Object.values(vars).join("-")}`.replace(/\s+/g, "_"), tipo, vars, impacto, probabilidad, esfuerzo, score: r1(score), prioridad, evidencia };
}

function moda(arr) {
  const c = new Map();
  arr.forEach((x) => c.set(x, (c.get(x) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function reglaHorario(ds, f, propia) {
  const salida = [];
  const redes = [...new Set(postsFiltrados(ds, { ...f, marcas: [propia] }).map(({ p }) => p.red))];
  for (const red of redes) {
    const todos = mejoresHorarios(ds, { ...f, redes: [red] }, 4).porHora.filter((h) => h.er !== null);
    if (todos.length < 4) continue;
    const mejor = todos.reduce((a, b) => (b.er > a.er ? b : a));
    const propios = postsFiltrados(ds, { ...f, marcas: [propia], redes: [red] }).map(({ p }) => p.hora);
    if (propios.length < 6) continue;
    const habitual = Number(moda(propios));
    const erHabitual = todos.find((h) => h.hora === habitual)?.er;
    if (!erHabitual || mejor.er < erHabitual * 1.2) continue;
    const mejora = pct(mejor.er - erHabitual, erHabitual);
    salida.push(crear("horario", { red, mejorHora: mejor.hora, horaHabitual: habitual, mejora: Math.round(mejora) }, {
      impacto: Math.min(9, 4 + mejora / 25), probabilidad: 0.8, esfuerzo: 1.5,
      evidencia: { erMejor: r1(mejor.er), erHabitual: r1(erHabitual), postsAnalizados: propios.length },
    }));
  }
  return salida.sort((a, b) => b.score - a.score).slice(0, 2);
}

function reglaFormato(ds, f, propia) {
  const salida = [];
  for (const red of ["instagram", "tiktok", "facebook", "linkedin", "youtube"]) {
    const fs = porFormato(ds, { ...f, marcas: [propia], redes: [red] }).filter((x) => x.publicaciones >= 4);
    if (fs.length < 2) continue;
    const mejor = fs[0];
    const usado = fs.reduce((a, b) => (b.publicaciones > a.publicaciones ? b : a));
    if (mejor.formato === usado.formato || mejor.er < usado.er * 1.25) continue;
    const total = fs.reduce((s, x) => s + x.publicaciones, 0);
    salida.push(crear("formato", { red, mejor: mejor.formato, usado: usado.formato, ratio: r1(mejor.er / usado.er), share: Math.round(pct(usado.publicaciones, total)) }, {
      impacto: Math.min(9, 3 + (mejor.er / usado.er) * 2), probabilidad: 0.75, esfuerzo: 3,
      evidencia: { erMejor: r1(mejor.er), erUsado: r1(usado.er), nMejor: mejor.publicaciones, nUsado: usado.publicaciones },
    }));
  }
  return salida;
}

function reglaCompetidor(ds, f, propia) {
  const acc = aceleraciones(ds, f, 60);
  const propias = acc.filter((a) => a.marca === propia);
  const mediaPropia = propias.length ? propias.reduce((s, a) => s + a.crecimientoReciente, 0) / propias.length : 0;
  const top = acc.find((a) => a.marca !== propia);
  if (!top || top.crecimientoReciente < Math.max(8, mediaPropia * 2)) return [];
  const nombre = ds.marcas.find((m) => m.id === top.marca)?.nombre;
  const propiaRed = propias.find((a) => a.red === top.red);
  return [crear("competidor", { marca: nombre, red: top.red, crecimiento: Math.round(top.crecimientoReciente), propio: Math.round(propiaRed?.crecimientoReciente ?? 0) }, {
    impacto: 7, probabilidad: 0.6, esfuerzo: 4,
    evidencia: { aceleracion: r1(top.aceleracion ?? 0), ventanaDias: 60 },
  })];
}

function reglaSentimiento(ds, f, propia) {
  const an = analizarMenciones(ds, { ...f, marcas: [propia] });
  return an.alertas.map((a) => crear("pico", { ciudad: (a.ciudad || "").split("|")[1] || "—", tema: a.tema || "—", z: a.z, total: a.total }, {
    impacto: 9, probabilidad: 0.85, esfuerzo: 3, urgente: true,
    evidencia: { mediaBase: a.mediaBase, mediaReciente: a.mediaReciente, shareCiudad: Math.round(a.shareCiudad * 100), shareTema: Math.round(a.shareTema * 100) },
  }));
}

function reglaFrecuencia(ds, f, propia) {
  const salida = [];
  for (const red of ["linkedin", "tiktok", "instagram", "youtube", "facebook"]) {
    const b = benchmark(ds, { ...f, redes: [red] }).filter((x) => x.publicaciones > 0 || x.propia);
    const nuestro = b.find((x) => x.marca === propia);
    const otros = b.filter((x) => x.marca !== propia && x.publicaciones > 0).map((x) => x.porSemana).sort((a, c) => a - c);
    if (!nuestro || otros.length < 2) continue;
    const mediana = otros[Math.floor(otros.length / 2)];
    if (nuestro.porSemana >= mediana * 0.5) continue;
    salida.push(crear("frecuencia", { red, propia: r1(nuestro.porSemana), competencia: r1(mediana) }, {
      impacto: 6, probabilidad: 0.7, esfuerzo: 4, evidencia: { competidores: otros.length },
    }));
  }
  return salida;
}

function reglaBandeja(ds, f, propia) {
  const pend = bandeja(ds, { ...f, marcas: [propia] }).filter((m) => !m.respondida && m.esperaHoras > 8);
  if (!pend.length) return [];
  const negativos = pend.filter((m) => m.sent.etiqueta === "negativo").length;
  return [crear("bandeja", { n: pend.length, negativos }, {
    impacto: 6 + Math.min(3, negativos / 3), probabilidad: 0.95, esfuerzo: 2, urgente: negativos >= 5,
    evidencia: { esperaMaxHoras: Math.round(Math.max(...pend.map((m) => m.esperaHoras))) },
  })];
}

function reglaTendencia(ds, f, propia) {
  const pais = f.pais || ds.meta.paisBase;
  const usados = new Set(postsFiltrados(ds, { ...ultimosDias(ds, 30), marcas: [propia] }).flatMap(({ p }) => p.hashtags));
  const alza = radarTendencias(ds, pais).filter((t) => t.estado === "en alza");
  const nuevo = alza.find((t) => !usados.has(t.hashtag)) || alza[0];
  if (!nuevo) return [];
  return [crear("tendencia", { hashtag: nuevo.hashtag, crecimiento: Math.round(nuevo.crecimiento), pais }, {
    impacto: 5, probabilidad: 0.6, esfuerzo: 1.5, evidencia: { volumen7d: nuevo.volumen7d, yaLoUsas: usados.has(nuevo.hashtag) },
  })];
}

function reglaIdeas(ds, f) {
  return ideasContenido(ds, f, 2).map((i) => crear("idea", { red: i.red, tema: i.tema, formato: i.formato, marca: i.marcaEjemplo, sobre: Math.round(i.sobreMediana) }, {
    impacto: 5 + Math.min(3, i.sobreMediana / 40), probabilidad: 0.55, esfuerzo: 3,
    evidencia: { erCombo: r1(i.er), publicacionesCompetencia: i.publicaciones },
  }));
}

function reglaBrechaTema(ds, f) {
  const b = brechas(ds, f, 6).temas.find((t) => t.brecha !== null && t.brecha > 0.5);
  if (!b) return [];
  return [crear("brecha", { tema: b.tema, erCompetencia: r1(b.erCompetencia), erPropio: r1(b.erPropio) }, {
    impacto: 5, probabilidad: 0.55, esfuerzo: 3.5, evidencia: { publicacionesPropias: b.publicacionesPropias },
  })];
}

function reglaTendenciaEr(ds, f, propia) {
  const per = f.desde ? f : { ...f, ...ultimosDias(ds, 30) };
  const k = kpis(ds, { ...per, marcas: [propia] });
  const d = k.deltas.er;
  if (d === null || d > -10) return [];
  return [crear("er_baja", { delta: Math.round(d), er: r1(k.er) }, { impacto: 7, probabilidad: 0.6, esfuerzo: 4, evidencia: { erAnterior: r1(k.anterior.er) } })];
}

function reglaSov(ds, f, propia) {
  const b = benchmark(ds, f);
  const nuestro = b.find((x) => x.marca === propia);
  const lider = [...b].sort((a, c) => c.sovMenciones - a.sovMenciones)[0];
  if (!nuestro || !lider || lider.marca === propia || lider.sovMenciones < nuestro.sovMenciones * 1.2) return [];
  return [crear("sov", { lider: lider.nombre, sovLider: Math.round(lider.sovMenciones), sovPropio: Math.round(nuestro.sovMenciones) }, { impacto: 5, probabilidad: 0.5, esfuerzo: 5 })];
}

const REGLAS = [reglaSentimiento, reglaBandeja, reglaHorario, reglaFormato, reglaCompetidor, reglaFrecuencia, reglaTendencia, reglaIdeas, reglaBrechaTema, reglaTendenciaEr, reglaSov];

/** Corre todas las reglas y devuelve las sugerencias priorizadas. */
export function generarSugerencias(ds, filtros = {}) {
  const f = normalizarFiltros(filtros);
  f.marcas = null; // las reglas eligen marcas solas; el resto del filtro se respeta
  const propia = ds.marcas.find((m) => m.propia)?.id;
  const orden = { urgente: 0, alta: 1, media: 2, baja: 3 };
  const todas = [];
  for (const regla of REGLAS) {
    try {
      todas.push(...regla(ds, f, propia));
    } catch (e) {
      // Una regla rota no puede tumbar el panel entero: se registra y se sigue.
      todas.push({ id: `error-${regla.name}`, tipo: "error", vars: { regla: regla.name, mensaje: String(e.message || e) }, score: 0, prioridad: "baja", evidencia: {} });
    }
  }
  return todas.sort((a, b) => orden[a.prioridad] - orden[b.prioridad] || b.score - a.score);
}
