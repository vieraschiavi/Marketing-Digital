import test from "node:test";
import assert from "node:assert/strict";
import { benchmark, aceleraciones, brechas } from "../core/competencia.js";
import { buscar, parsearConsulta, radarTendencias, ideasContenido } from "../core/busqueda.js";
import { ds } from "./_comun.js";

test("benchmark: share of voice suma 100 % entre todas las marcas", () => {
  const b = benchmark(ds(), {});
  assert.equal(b.length, 6);
  const sov = b.reduce((s, x) => s + x.sovMenciones, 0);
  assert.ok(Math.abs(sov - 100) < 1e-6);
  const sovI = b.reduce((s, x) => s + x.sovInteracciones, 0);
  assert.ok(Math.abs(sovI - 100) < 1e-6);
});

test("aceleraciones encuentra al competidor que crece en TikTok", () => {
  const top = aceleraciones(ds(), {})[0];
  assert.equal(top.marca, "m2");
  assert.equal(top.red, "tiktok");
  assert.ok(top.crecimientoReciente > 30);
});

test("brechas lista formatos y temas con ER de ambos lados", () => {
  const b = brechas(ds(), {});
  assert.ok(b.formatos.length > 0 && b.temas.length > 0);
  assert.ok(b.temas.every((t) => t.erCompetencia > 0));
});

test("parsear consulta: operadores, frases y términos", () => {
  const q = parsearConsulta('red:tiktok "nuevo local" café sent:negativo');
  assert.deepEqual(q.ops, { red: "tiktok", sent: "negativo" });
  assert.deepEqual(q.frases, ["nuevo local"]);
  assert.deepEqual(q.terminos, ["cafe"]);
});

test("búsqueda con operadores filtra de verdad", () => {
  const r = buscar(ds(), "delivery sent:negativo ciudad:canelones");
  assert.ok(r.menciones.length > 0);
  assert.ok(r.menciones.every((m) => m.sent.etiqueta === "negativo" && m.ciudad === "UY|Canelones"));
  assert.equal(r.posts.length, 0, "sent: solo aplica a menciones");
  const r2 = buscar(ds(), "#coldbrew red:instagram");
  assert.ok(r2.posts.length > 0 && r2.posts.every((p) => p.red === "instagram"));
  const r3 = buscar(ds(), "marca:molienda");
  assert.ok(r3.posts.every((p) => p.marcaNombre === "Molienda Sur"));
});

test("radar de tendencias detecta el hashtag en alza inyectado", () => {
  const r = radarTendencias(ds(), "UY");
  assert.equal(r[0].hashtag, "#coldbrew");
  assert.equal(r[0].estado, "en alza");
});

test("ideas de contenido: combinaciones que la marca propia casi no usa", () => {
  const ideas = ideasContenido(ds(), {});
  assert.ok(ideas.length > 0);
  assert.ok(ideas.every((i) => i.usoPropio <= 1 && i.sobreMediana > 0));
});
