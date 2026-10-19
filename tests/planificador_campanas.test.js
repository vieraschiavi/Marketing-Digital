import test from "node:test";
import assert from "node:assert/strict";
import { validarPost, agregarACola, quitarDeCola, actualizarEnCola, calendario, proximaFecha, horariosSugeridos, colaACsv } from "../core/planificador.js";
import { construirUtm, rendimientoCampana, campanasDemo } from "../core/campanas.js";
import { ds } from "./_comun.js";

test("validación por red: límite de caracteres, hashtags y media", () => {
  assert.equal(validarPost("a".repeat(281), "x").ok, false);
  assert.equal(validarPost("a".repeat(280), "x").ok, true);
  const ig = validarPost("Hola #a #b", "instagram");
  assert.ok(ig.ok && ig.avisos.some((a) => a.clave === "plan.av.media"));
  assert.ok(validarPost("#a #b #c #d", "threads").avisos.some((a) => a.clave === "plan.av.hashtags"));
  assert.equal(validarPost("", "linkedin").ok, false);
  assert.equal(validarPost("hola", "myspace").ok, false);
  assert.equal(validarPost("😀".repeat(280), "x").largo, 280, "cuenta caracteres, no unidades UTF-16");
});

test("la cola es inmutable y se mantiene ordenada por fecha", () => {
  const c0 = [];
  const c1 = agregarACola(c0, { red: "x", texto: "B", fecha: "2026-10-20T10:00" });
  const c2 = agregarACola(c1, { red: "x", texto: "A", fecha: "2026-10-19T10:00" });
  assert.equal(c0.length, 0);
  assert.deepEqual(c2.map((x) => x.texto), ["A", "B"]);
  const c3 = actualizarEnCola(c2, c2[0].id, { estado: "publicado" });
  assert.equal(c2[0].estado, "programado");
  assert.equal(c3[0].estado, "publicado");
  assert.equal(quitarDeCola(c3, c3[0].id).length, 1);
  assert.throws(() => agregarACola(c0, { red: "x", texto: "a".repeat(400), fecha: "2026-10-20T10:00" }));
  assert.match(colaACsv(c2), /^fecha,red,texto,estado,campana\n"2026-10-19T10:00","x","A"/);
});

test("calendario semanal empieza el lunes; el mensual trae 6 semanas", () => {
  const sem = calendario([{ fecha: "2026-10-21T09:00", red: "x", texto: "t" }], "2026-10-22", "semana");
  assert.equal(sem.length, 7);
  assert.equal(sem[0].fecha, "2026-10-19");
  assert.equal(sem[2].items.length, 1);
  assert.equal(calendario([], "2026-10-15", "mes").length, 42);
  assert.equal(proximaFecha("2026-10-19", 3, 20), "2026-10-21T20:00");
});

test("horarios sugeridos salen de los datos (noche en Instagram)", () => {
  const h = horariosSugeridos(ds(), "instagram", 3);
  assert.equal(h.length, 3);
  assert.ok(h.every((x) => x.hora >= 18));
});

test("UTM: valida la URL y normaliza los valores", () => {
  const u = construirUtm("https://tienda.com/p?x=1", { fuente: "Instagram", campana: "Lanzamiento Primavera", contenido: "Reel 1" });
  assert.equal(u, "https://tienda.com/p?x=1&utm_source=instagram&utm_medium=social&utm_campaign=lanzamiento_primavera&utm_content=reel_1");
  assert.throws(() => construirUtm("hola", {}));
  assert.throws(() => construirUtm("javascript:alert(1)", {}));
});

test("rendimiento de campaña: estimaciones explícitas y ROI coherente", () => {
  const c = campanasDemo(ds())[0];
  const r = rendimientoCampana(ds(), c);
  assert.equal(r.estimado, true);
  assert.ok(r.publicaciones > 0);
  assert.ok(Math.abs(r.conversionesEstimadas - r.clics * c.tasaConversion / 100) < 1e-9);
  assert.ok(Math.abs(r.roi - ((r.ingresosEstimados - c.inversion) / c.inversion) * 100) < 1e-9);
  assert.equal(r.embudo.length, 5);
  const sinInversion = rendimientoCampana(ds(), { ...c, inversion: 0 });
  assert.equal(sinInversion.roi, null);
});
