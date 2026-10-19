import test from "node:test";
import assert from "node:assert/strict";
import { generarSugerencias } from "../core/sugerencias.js";
import { ds } from "./_comun.js";

const sugs = () => generarSugerencias(ds(), {});

test("el motor descubre los seis patrones inyectados en la demo", () => {
  const tipos = new Set(sugs().map((s) => s.tipo));
  for (const t of ["horario", "formato", "competidor", "pico", "frecuencia", "bandeja"]) assert.ok(tipos.has(t), `falta ${t}`);
  const comp = sugs().find((s) => s.tipo === "competidor");
  assert.equal(comp.vars.marca, "Molienda Sur");
  assert.equal(comp.vars.red, "tiktok");
  const freq = sugs().find((s) => s.tipo === "frecuencia");
  assert.equal(freq.vars.red, "linkedin");
});

test("prioridad y score: urgentes primero, luego por score descendente", () => {
  const orden = { urgente: 0, alta: 1, media: 2, baja: 3 };
  const s = sugs();
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    assert.ok(orden[a.prioridad] < orden[b.prioridad] || (a.prioridad === b.prioridad && a.score >= b.score));
  }
  assert.ok(s.every((x) => x.score >= 0 && x.score <= 10));
  assert.equal(s.find((x) => x.tipo === "pico").prioridad, "urgente");
});

test("cada sugerencia trae evidencia y un id estable", () => {
  const a = sugs(), b = generarSugerencias(ds(), {});
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
  assert.ok(a.every((x) => x.evidencia && typeof x.vars === "object"));
});

test("con filtros que dejan sin datos, no rompe", () => {
  const s = generarSugerencias(ds(), { desde: "2020-01-01", hasta: "2020-01-31" });
  assert.ok(Array.isArray(s));
  assert.ok(!s.some((x) => x.tipo === "error"), JSON.stringify(s.filter((x) => x.tipo === "error")));
});
