// Clientes de IA del proceso principal, con fetch falso (sin red).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { PROVEEDORES } from "../core/ia.js";

const require = createRequire(import.meta.url);
const { cliente, capacidadesClaude } = require("../desktop/ia-main.cjs");

function fetchFalso(rutas) {
  const llamadas = [];
  const f = async (url, op = {}) => {
    const u = String(url);
    llamadas.push({ url: u, op });
    const [, cuerpo] = Object.entries(rutas).find(([k]) => u.includes(k)) || [null, null];
    if (!cuerpo) return new Response(JSON.stringify({ error: { message: "no existe" } }), { status: 404, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify(typeof cuerpo === "function" ? cuerpo(u, op) : cuerpo), { status: 200, headers: { "content-type": "application/json" } });
  };
  f.llamadas = llamadas;
  return f;
}

test("capacidades de Claude por modelo", () => {
  assert.deepEqual(capacidadesClaude("claude-opus-5-5"), { moderno: true, fallback: true });
  assert.deepEqual(capacidadesClaude("claude-haiku-5-5"), { moderno: true, fallback: false });
  assert.deepEqual(capacidadesClaude("claude-haiku-4-5"), { moderno: false, fallback: false });
});

test("compatible OpenAI: lista modelos y pregunta con system + historial", async () => {
  const f = fetchFalso({
    "/models": { data: [{ id: "gpt-5", created: 1700000000 }] },
    "/chat/completions": (u, op) => {
      const body = JSON.parse(op.body);
      assert.equal(body.messages[0].role, "system");
      assert.equal(op.headers.Authorization, "Bearer sk-test-123456");
      return { model: body.model, choices: [{ message: { content: " hola " } }] };
    },
  });
  const c = cliente("openai", PROVEEDORES.openai, "sk-test-123456", { fetch: f });
  assert.deepEqual(await c.listar(), [{ id: "gpt-5", creado: 1700000000000 }]);
  const r = await c.preguntar({ modelo: "gpt-5", system: "S", mensajes: [{ role: "user", content: "Q" }] });
  assert.deepEqual(r, { texto: "hola", modelo: "gpt-5" });
});

test("Gemini: solo modelos con generateContent y la clave va por header", async () => {
  const f = fetchFalso({
    "/models?": { models: [{ name: "models/gemini-3-pro", supportedGenerationMethods: ["generateContent"] }, { name: "models/embedding-001", supportedGenerationMethods: ["embedContent"] }] },
    ":generateContent": (u, op) => {
      assert.ok(!u.includes("key="), "la clave no viaja en la URL");
      assert.equal(op.headers["x-goog-api-key"], "AIza-test-123");
      return { candidates: [{ content: { parts: [{ text: "ok" }] } }] };
    },
  });
  const c = cliente("gemini", PROVEEDORES.gemini, "AIza-test-123", { fetch: f });
  assert.deepEqual(await c.listar(), [{ id: "models/gemini-3-pro" }]);
  assert.equal((await c.preguntar({ modelo: "gemini-3-pro", system: "S", mensajes: [{ role: "assistant", content: "a" }, { role: "user", content: "b" }] })).texto, "ok");
});

test("errores HTTP se propagan con el mensaje del proveedor", async () => {
  const f = fetchFalso({});
  const c = cliente("groq", PROVEEDORES.groq, "gsk-test-123456", { fetch: f });
  await assert.rejects(() => c.listar(), /HTTP 404: no existe/);
});

const hayDeps = existsSync(new URL("../desktop/node_modules/@anthropic-ai/sdk", import.meta.url));

test("Claude (SDK oficial): lista modelos y usa fallback + thinking adaptativo en Opus 5.5", { skip: !hayDeps && "falta npm install en desktop/" }, async () => {
  let cuerpoEnviado = null, headers = null;
  const f = async (url, op = {}) => {
    const u = String(url);
    if (u.includes("/v1/models")) {
      return new Response(JSON.stringify({ data: [{ id: "claude-opus-5-5", type: "model", display_name: "Opus 5.5", created_at: "2026-08-01T00:00:00Z" }], has_more: false, first_id: "a", last_id: "a" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    cuerpoEnviado = JSON.parse(op.body);
    headers = new Headers(op.headers);
    return new Response(JSON.stringify({ id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "respuesta" }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  // ia-main.cjs hace require("@anthropic-ai/sdk") relativo a desktop/: está ahí.
  const c = cliente("anthropic", PROVEEDORES.anthropic, "sk-ant-test-123456", { fetch: f });
  assert.deepEqual(await c.listar(), [{ id: "claude-opus-5-5", creado: "2026-08-01T00:00:00Z" }]);
  const r = await c.preguntar({ modelo: "claude-opus-5-5", system: "S", mensajes: [{ role: "user", content: "Q" }] });
  assert.deepEqual(r, { texto: "respuesta", modelo: "claude-opus-5-5" });
  assert.deepEqual(cuerpoEnviado.thinking, { type: "adaptive" });
  assert.equal(cuerpoEnviado.fallbacks, "default");
  assert.match(headers.get("anthropic-beta"), /server-side-fallback-2026-07-01/);
});
