import test from "node:test";
import assert from "node:assert/strict";
import { generarDemo, efectoHorario } from "../core/demo.js";
import { INDUSTRIAS } from "../core/catalogo.js";
import { ds, FIN } from "./_comun.js";

test("el generador es determinístico con la misma semilla", () => {
  const a = generarDemo({ fin: FIN, semilla: 7, dias: 40 });
  const b = generarDemo({ fin: FIN, semilla: 7, dias: 40 });
  assert.deepEqual(a, b);
  const c = generarDemo({ fin: FIN, semilla: 8, dias: 40 });
  assert.notDeepEqual(a.posts.slice(0, 5), c.posts.slice(0, 5));
});

test("marca el dataset como sintético y usa solo marcas ficticias de la industria", () => {
  const d = ds();
  assert.equal(d.meta.sintetico, true);
  assert.equal(d.meta.fin, FIN);
  const nombres = d.marcas.map((m) => m.nombre);
  assert.deepEqual(nombres, [INDUSTRIAS.cafeteria.propia, ...INDUSTRIAS.cafeteria.competidores]);
  assert.equal(d.marcas.filter((m) => m.propia).length, 1);
});

test("cada post tiene métricas coherentes y repartos de audiencia normalizados", () => {
  for (const p of ds().posts.slice(0, 500)) {
    assert.ok(p.impresiones >= p.alcance, "impresiones ≥ alcance");
    assert.ok(p.interacciones >= 1);
    assert.ok(p.hora >= 0 && p.hora < 24 && p.dia >= 0 && p.dia < 7);
    const sg = Object.values(p.geo).reduce((a, b) => a + b, 0);
    const se = p.edad.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sg - 1) < 1e-9 && Math.abs(se - 1) < 1e-9);
    assert.equal(new Date(p.fecha + "Z").getUTCDay(), p.dia);
  }
});

test("las series diarias cubren todo el período sin huecos", () => {
  const d = ds();
  const c = d.cuentas[0];
  const serie = d.diario.filter((x) => x.marca === c.marca && x.red === c.red);
  assert.equal(serie.length, d.meta.dias);
  assert.equal(serie[0].fecha, d.meta.inicio);
  assert.equal(serie.at(-1).fecha, FIN);
});

test("el efecto horario premia la noche en redes de consumo y la mañana en LinkedIn", () => {
  assert.ok(efectoHorario("instagram", 2, 20) > efectoHorario("instagram", 2, 10));
  assert.ok(efectoHorario("linkedin", 2, 9) > efectoHorario("linkedin", 2, 21));
  assert.ok(efectoHorario("linkedin", 0, 9) < efectoHorario("linkedin", 2, 9), "LinkedIn rinde menos el fin de semana");
});

test("todas las industrias generan sin errores", () => {
  for (const id of Object.keys(INDUSTRIAS)) {
    const d = generarDemo({ fin: FIN, industria: id, dias: 30, paisBase: "AR" });
    assert.equal(d.meta.industria, id);
    assert.ok(d.posts.length > 50 && d.menciones.length > 50);
    assert.equal(d.meta.paisBase, "AR");
  }
});
