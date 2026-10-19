import test from "node:test";
import assert from "node:assert/strict";
import { kpis, serieDiaria, mejoresHorarios, porFormato, topPosts, audiencia, semaforo, pct, delta } from "../core/metricas.js";
import { postsFiltrados, fraccionGeo, factorPost, normalizarFiltros, periodoAnterior, ultimosDias } from "../core/filtros.js";
import { ds } from "./_comun.js";

test("fórmulas base", () => {
  assert.equal(pct(5, 200), 2.5);
  assert.equal(pct(5, 0), 0);
  assert.equal(delta(110, 100), 10);
  assert.equal(delta(5, 0), null);
  assert.equal(semaforo(90), "verde");
  assert.equal(semaforo(75), "amarillo");
  assert.equal(semaforo(10), "rojo");
});

test("el filtro geográfico pondera por la fracción del público", () => {
  const geo = { "UY|Montevideo": 0.5, "UY|Salto": 0.2, "AR|Córdoba": 0.3 };
  assert.equal(fraccionGeo(geo, { pais: null, ciudad: null }), 1);
  assert.ok(Math.abs(fraccionGeo(geo, { pais: "UY" }) - 0.7) < 1e-12);
  assert.equal(fraccionGeo(geo, { pais: "UY", ciudad: "UY|Salto" }), 0.2);
  assert.equal(fraccionGeo(null, { pais: "UY" }), 0, "sin geografía no se atribuye");
});

test("filtros de público combinan geo × edad × género y excluyen por interés", () => {
  const p = { geo: { "UY|Montevideo": 1 }, edad: [0, 0.5, 0.5, 0, 0, 0], genero: [0.6, 0.38, 0.02], intereses: ["moda"], formato: "reel" };
  const f = normalizarFiltros({ ciudad: "UY|Montevideo", edades: [1], generos: [0] });
  assert.ok(Math.abs(factorPost(p, f) - 0.3) < 1e-12);
  assert.equal(factorPost(p, normalizarFiltros({ interes: "deporte" })), 0);
  assert.equal(factorPost(p, normalizarFiltros({ formato: "carrusel" })), 0);
});

test("KPIs: ER = interacciones/alcance y el filtro de público achica el alcance", () => {
  const d = ds();
  const f = { ...ultimosDias(d, 30), marcas: ["m0"] };
  const k = kpis(d, f);
  assert.ok(Math.abs(k.er - (k.interacciones / k.alcance) * 100) < 1e-9);
  const kf = kpis(d, { ...f, pais: "UY", edades: [2] });
  assert.ok(kf.alcance < k.alcance && kf.alcance > 0);
  assert.equal(k.publicaciones, postsFiltrados(d, f).length);
  assert.ok(k.deltas.er !== undefined && k.anterior.publicaciones > 0);
});

test("el período anterior tiene el mismo largo y termina el día previo", () => {
  const p = periodoAnterior({ desde: "2026-10-01", hasta: "2026-10-10" }, ds());
  assert.deepEqual([p.desde, p.hasta], ["2026-09-21", "2026-09-30"]);
});

test("serie diaria agrupada por red suma lo mismo que la serie total", () => {
  const d = ds();
  const f = { ...ultimosDias(d, 10), marcas: ["m0"] };
  const tot = serieDiaria(d, f, "impresiones");
  const porRed = serieDiaria(d, f, "impresiones", "red");
  const sumaRedes = tot.fechas.map((_, i) => porRed.series.reduce((s, x) => s + x.valores[i], 0));
  assert.deepEqual(sumaRedes.map(Math.round), tot.series[0].valores.map(Math.round));
});

test("mejores horarios encuentra la noche y la tabla tiene 7×24", () => {
  const h = mejoresHorarios(ds(), { redes: ["instagram"] });
  assert.equal(h.er.length, 7);
  assert.equal(h.er[0].length, 24);
  assert.ok(h.top[0].hora >= 18, `mejor hora ${h.top[0].hora}`);
});

test("los Reels de la marca propia rinden más que los carruseles (patrón inyectado)", () => {
  const f = porFormato(ds(), { marcas: ["m0"], redes: ["instagram"] });
  const reel = f.find((x) => x.formato === "reel");
  const carrusel = f.find((x) => x.formato === "carrusel");
  assert.ok(reel.er > carrusel.er * 1.2);
  assert.ok(carrusel.publicaciones > reel.publicaciones);
});

test("topPosts ordena por ER y respeta el mínimo de alcance", () => {
  const t = topPosts(ds(), { marcas: ["m0"] }, 10, "er", 500);
  assert.equal(t.length, 10);
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1].er >= t[i].er);
  assert.ok(t.every((p) => p.alcance >= 500));
});

test("audiencia: shares suman 1 y el filtro de país restringe ciudades", () => {
  const a = audiencia(ds(), { marcas: ["m0"] });
  const s = (l) => l.reduce((x, y) => x + y.share, 0);
  assert.ok(Math.abs(s(a.paises) - 1) < 1e-9 && Math.abs(s(a.ciudades) - 1) < 1e-9);
  assert.equal(a.paises[0].clave, "UY");
  const ar = audiencia(ds(), { marcas: ["m0"], pais: "AR" });
  assert.ok(ar.ciudades.every((c) => c.pais === "AR"));
});
