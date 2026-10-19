import test from "node:test";
import assert from "node:assert/strict";
import { elegirModelo, debeRefrescar, whatIf, responderLocal, construirContexto, armarMensajes, systemPrompt, PROVEEDORES } from "../core/ia.js";
import { ds } from "./_comun.js";

test("Claude: recomienda el Opus más nuevo y excluye lo no disponible", () => {
  const r = elegirModelo("anthropic", [
    { id: "claude-haiku-5-5", creado: "2026-09-01" }, { id: "claude-opus-4-8", creado: "2026-03-01" },
    { id: "claude-opus-5-5", creado: "2026-08-01" }, { id: "claude-sonnet-5-5" }, { id: "claude-mythos-5-1" },
  ]);
  assert.equal(r.recomendado, "claude-opus-5-5");
  assert.ok(!r.lista.includes("claude-mythos-5-1"));
  assert.equal(r.origen, "api");
  assert.equal(PROVEEDORES.anthropic.modeloBase, "claude-opus-5-5");
});

test("OpenAI y Gemini: filtran modelos que no son de chat y normalizan ids", () => {
  const o = elegirModelo("openai", [{ id: "whisper-1" }, { id: "gpt-5", creado: 2 }, { id: "gpt-5-mini", creado: 1 }, { id: "text-embedding-3" }]);
  assert.equal(o.recomendado, "gpt-5");
  assert.ok(!o.lista.some((m) => /whisper|embedding/.test(m)));
  const g = elegirModelo("gemini", ["models/gemini-2.5-flash", "models/gemini-3-pro", "models/embedding-001"]);
  assert.equal(g.recomendado, "gemini-3-pro");
});

test("sin respuesta de la API queda el catálogo base", () => {
  const r = elegirModelo("anthropic", []);
  assert.equal(r.origen, "respaldo");
  assert.equal(r.recomendado, "claude-opus-5-5");
  assert.throws(() => elegirModelo("inexistente", []));
});

test("refresco de modelos cada 7 días", () => {
  const ahora = Date.parse("2026-10-18T12:00:00Z");
  assert.equal(debeRefrescar(null, ahora), true);
  assert.equal(debeRefrescar({ actualizado: "2026-10-15T00:00:00Z" }, ahora), false);
  assert.equal(debeRefrescar({ actualizado: "2026-10-01T00:00:00Z" }, ahora), true);
});

test("what-if de frecuencia: entiende formato, red y cantidad", () => {
  const w = whatIf(ds(), "¿qué pasa si publico 3 reels más por semana en instagram?");
  assert.equal(w.tipo, "frecuencia");
  assert.equal(w.red, "instagram");
  assert.equal(w.formato, "reel");
  assert.ok(w.postsSemanaNuevo > w.postsSemanaActual);
  assert.ok(w.interaccionesMesNuevo > w.interaccionesMesActual);
  assert.ok(w.rango.bajo <= w.interaccionesMesNuevo && w.interaccionesMesNuevo <= w.rango.alto);
  const menos = whatIf(ds(), "si reduzco 50% las publicaciones en tiktok");
  assert.ok(menos.interaccionesMesNuevo < menos.interaccionesMesActual);
});

test("what-if de horario y pregunta no entendida", () => {
  const h = whatIf(ds(), "si publico a las 20 en vez de a las 10 en instagram");
  assert.equal(h.tipo, "horario");
  assert.ok(h.cambioER > 0, "la noche rinde más que la mañana");
  assert.equal(whatIf(ds(), "hola").entendido, false);
});

test("responder local reconoce intenciones en ES/EN/PT", () => {
  assert.equal(responderLocal(ds(), "¿cuál es el mejor horario?").clave, "ia.loc.horario");
  assert.equal(responderLocal(ds(), "what is the best time to post?").clave, "ia.loc.horario");
  assert.equal(responderLocal(ds(), "qué hace la competencia").clave, "ia.loc.competencia");
  assert.equal(responderLocal(ds(), "como vamos").clave, "ia.loc.resumen");
  assert.equal(responderLocal(ds(), "e se eu publicar 2 videos a mais no tiktok").clave, "ia.loc.whatifFrec");
  assert.equal(responderLocal(ds(), "receta de milanesa"), null);
});

test("el contexto que viaja a la IA no lleva textos ni autores de terceros", () => {
  const c = construirContexto(ds(), {});
  const json = JSON.stringify(c);
  assert.ok(!/@[a-z]+\d+/.test(json), "no hay handles de autores");
  assert.ok(!ds().menciones.slice(0, 50).some((m) => json.includes(m.texto)));
  assert.equal(c.aviso, "DATOS SINTÉTICOS DE DEMOSTRACIÓN");
  assert.ok(c.competencia.length === 6 && c.sugerencias.length > 0);
});

test("mensajes: historial acotado, sin roles extraños, contexto en el último turno", () => {
  const hist = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i })).concat([{ role: "system", content: "x" }]);
  const m = armarMensajes(hist, "¿qué hago?", { a: 1 });
  assert.ok(m.length <= 9);
  assert.ok(m.every((x) => x.role === "user" || x.role === "assistant"));
  assert.match(m.at(-1).content, /CONTEXTO:[\s\S]*PREGUNTA:\n¿qué hago\?/);
  assert.match(systemPrompt("en"), /English/);
});
