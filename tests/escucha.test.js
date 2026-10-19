import test from "node:test";
import assert from "node:assert/strict";
import { sentimiento, analizarMenciones, detectarPicos, bandeja, tiempoRespuesta, palabrasClave } from "../core/escucha.js";
import { ds } from "./_comun.js";

test("sentimiento trilingüe básico", () => {
  assert.equal(sentimiento("Me encantó, excelente atención").etiqueta, "positivo");
  assert.equal(sentimiento("Pésimo servicio, llegó frío y tarde").etiqueta, "negativo");
  assert.equal(sentimiento("Amazing coffee, best in town").etiqueta, "positivo");
  assert.equal(sentimiento("Terrible, the worst order ever").etiqueta, "negativo");
  assert.equal(sentimiento("Adorei, ótimo atendimento").etiqueta, "positivo");
  assert.equal(sentimiento("Péssimo, atraso enorme").etiqueta, "negativo");
});

test("no confunde raíces dentro de otras palabras ('mal' en 'normal')", () => {
  assert.equal(sentimiento("pasé por el local, normal").etiqueta, "neutro");
});

test("la negación invierte y los motivos explican el score", () => {
  const s = sentimiento("no es bueno");
  assert.ok(s.score < 0);
  assert.ok(s.motivos.some((m) => m.palabra === "bueno" && m.valor < 0));
  assert.ok(sentimiento("muy bueno").score > sentimiento("bueno").score);
});

test("detecta el pico negativo inyectado con ciudad y tema", () => {
  const a = analizarMenciones(ds(), { marcas: ["m0"] });
  assert.equal(a.alertas.length, 1);
  const al = a.alertas[0];
  assert.equal(al.tema, "delivery");
  assert.equal(al.ciudad, "UY|Canelones");
  assert.ok(al.z >= 2);
  assert.equal(a.positivo + a.neutro + a.negativo, a.total);
});

test("sin pico no hay alerta", () => {
  const fechas = Array.from({ length: 30 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);
  assert.deepEqual(detectarPicos(fechas, Array(30).fill(2), []), []);
});

test("la bandeja ordena por urgencia y pone primero lo no respondido", () => {
  const b = bandeja(ds(), { marcas: ["m0"] });
  for (let i = 1; i < b.length; i++) assert.ok(b[i - 1].urgencia >= b[i].urgencia);
  const primeraRespondida = b.findIndex((m) => m.respondida);
  assert.ok(b.slice(0, primeraRespondida).every((m) => !m.respondida));
  const t = tiempoRespuesta(ds(), { marcas: ["m0"] });
  assert.equal(t.requieren, t.respondidas + t.pendientes);
});

test("palabras clave ignora stopwords y menciones de usuario", () => {
  const p = palabrasClave(["el café de @juan es increíble", "café rico y café caliente"]);
  assert.equal(p[0].palabra, "café");
  assert.ok(!p.some((x) => x.palabra.startsWith("@")));
});
