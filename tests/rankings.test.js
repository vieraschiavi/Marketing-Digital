import test from "node:test";
import assert from "node:assert/strict";
import { ranking, letraGrado, proyeccion, proximoHito, tablaDiaria, promedios, ingresosEstimados, fichaCuenta, serieProyectada, diasEfectivos } from "../core/rankings.js";
import { ds } from "./_comun.js";

test("letras de grado de D− a A++", () => {
  assert.equal(letraGrado(0), "D-");
  assert.equal(letraGrado(0.999), "A++");
  assert.equal(letraGrado(1), "A++");
  assert.equal(letraGrado(0.5), "B-", "la mediana cae en el grado del medio de los 13");
});

test("ranking por red: posiciones completas y grado consistente con el puntaje", () => {
  const r = ranking(ds(), "tiktok");
  const n = r.length;
  assert.deepEqual(r.map((x) => x.rankSeguidores).sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i + 1));
  for (const x of r) assert.equal(x.grado, letraGrado(x.puntaje));
  const crecedor = r.find((x) => x.marca === "m2");
  assert.equal(crecedor.rankCrecimiento, 1);
  assert.ok(crecedor.grado.startsWith("A"), crecedor.grado);
});

test("tabla diaria: la ganancia es la diferencia de seguidores entre días", () => {
  const t = tablaDiaria(ds(), "m0", "instagram", 10);
  assert.equal(t.length, 10);
  assert.equal(t[0].seguidores - t[1].seguidores, t[0].ganancia);
  const p = promedios(ds(), "m0", "instagram", 10);
  assert.ok(Math.abs(p.semanal - p.diaria * 7) < 1e-9);
});

test("proyección: creciente, banda contiene al estimado y crecimiento amortiguado", () => {
  const p = proyeccion(ds(), "m2", "tiktok");
  const pts = p.puntos;
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].estimado >= pts[i - 1].estimado);
  assert.ok(pts.every((x) => x.bajo <= x.estimado && x.estimado <= x.alto));
  assert.ok(pts.at(-1).estimado < p.seguidoresHoy * 10, "5 años no explota");
  assert.equal(pts.at(-1).extrapolacion, true);
  assert.equal(pts[0].extrapolacion, false);
  assert.ok(diasEfectivos(1825) < 181 && Math.abs(diasEfectivos(1) - 1) < 0.01);
});

test("serie proyectada diaria empalma con el último dato", () => {
  const s = serieProyectada(ds(), "m0", "instagram", 30);
  assert.equal(s.length, 30);
  const hoy = tablaDiaria(ds(), "m0", "instagram", 1)[0].seguidores;
  assert.ok(Math.abs(s[0].estimado - hoy) / hoy < 0.05);
});

test("hito: el próximo número redondo está por encima de hoy", () => {
  const h = proximoHito(ds(), "m2", "tiktok");
  const hoy = proyeccion(ds(), "m2", "tiktok").seguidoresHoy;
  assert.ok(h.hito > hoy);
  assert.ok(h.dias > 0);
});

test("ingresos estimados escalan con el CPM y se marcan como estimados", () => {
  const a = ingresosEstimados(ds(), "m0", "youtube", [1, 2]);
  assert.equal(a.estimado, true);
  assert.ok(Math.abs(a.mensual[1] - 2 * a.mensual[0]) < 1e-9);
  assert.ok(Math.abs(a.anual[0] - 12 * a.mensual[0]) < 1e-6);
  assert.ok(fichaCuenta(ds(), "m0", "instagram").tabla.length > 0);
  assert.equal(fichaCuenta(ds(), "m0", "red-inexistente"), null);
});
