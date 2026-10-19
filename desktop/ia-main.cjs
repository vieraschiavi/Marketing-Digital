// © 2026 Martín Viera. Todos los derechos reservados.
//
// Llamadas a los proveedores de IA desde el PROCESO PRINCIPAL. La clave nunca
// llega al renderer: se descifra acá, se usa y se descarta.
//   • Claude (Anthropic): SDK oficial @anthropic-ai/sdk.
//   • OpenAI, Groq, Mistral, DeepSeek, xAI: API compatible /chat/completions.
//   • Gemini: generateContent.   • Ollama: /api/chat local.
// Cada proveedor implementa `listar` (para actualizar modelos) y `preguntar`.

const TIMEOUT_MS = 90000;

// Modelos Claude con thinking adaptativo y esfuerzo (familias 4.6 en adelante).
function capacidadesClaude(modelo) {
  const m = /claude-(opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d+))?/.exec(modelo) || [];
  const mayor = Number(m[2] || 0), menor = Number(m[3] || 0);
  const moderno = mayor >= 5 || (mayor === 4 && menor >= 6 && m[1] !== "haiku");
  // Fallback de servidor ante rechazos: solo en estos modelos (Claude API).
  const fallback = /^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/.test(modelo);
  return { moderno, fallback };
}

async function fetchJson(url, opciones = {}, f = fetch) {
  const r = await f(url, { ...opciones, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* respuesta no JSON */ }
  if (!r.ok) {
    const msg = json?.error?.message || json?.message || texto.slice(0, 200) || r.statusText;
    const e = new Error(`HTTP ${r.status}: ${msg}`);
    e.status = r.status;
    throw e;
  }
  return json;
}

function anthropic(clave, { fetch: f } = {}) {
  const Anthropic = require("@anthropic-ai/sdk");
  const Cliente = Anthropic.default || Anthropic;
  const client = new Cliente({ apiKey: clave, timeout: TIMEOUT_MS, maxRetries: 2, ...(f ? { fetch: f } : {}) });
  return {
    async listar() {
      const modelos = [];
      for await (const m of client.models.list()) modelos.push({ id: m.id, creado: m.created_at });
      return modelos;
    },
    async preguntar({ modelo, system, mensajes }) {
      const cap = capacidadesClaude(modelo);
      const params = { model: modelo, max_tokens: 16000, system, messages: mensajes };
      if (cap.moderno) {
        params.thinking = { type: "adaptive" };
        params.output_config = { effort: "medium" };
      }
      let resp;
      if (cap.fallback) {
        resp = await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
      } else {
        resp = await client.messages.create(params);
      }
      if (resp.stop_reason === "refusal") {
        throw new Error(`el modelo declinó la consulta (${resp.stop_details?.category || "sin categoría"})`);
      }
      const texto = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return { texto: texto || "(sin texto)", modelo: resp.model || modelo };
    },
  };
}

function compatibleOpenAI(url, clave, { fetch: f } = {}) {
  const h = { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" };
  return {
    async listar() {
      const j = await fetchJson(`${url}/models`, { headers: h }, f);
      return (j?.data || []).map((m) => ({ id: m.id, creado: m.created ? m.created * 1000 : null }));
    },
    async preguntar({ modelo, system, mensajes }) {
      const j = await fetchJson(`${url}/chat/completions`, {
        method: "POST", headers: h,
        body: JSON.stringify({ model: modelo, messages: [{ role: "system", content: system }, ...mensajes] }),
      }, f);
      return { texto: j?.choices?.[0]?.message?.content?.trim() || "(sin texto)", modelo: j?.model || modelo };
    },
  };
}

function gemini(url, clave, { fetch: f } = {}) {
  const h = { "x-goog-api-key": clave, "Content-Type": "application/json" };
  return {
    async listar() {
      const j = await fetchJson(`${url}/models?pageSize=200`, { headers: h }, f);
      return (j?.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => ({ id: m.name }));
    },
    async preguntar({ modelo, system, mensajes }) {
      const j = await fetchJson(`${url}/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: mensajes.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        }),
      }, f);
      const texto = (j?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
      return { texto: texto || "(sin texto)", modelo };
    },
  };
}

function ollama(url, { fetch: f } = {}) {
  return {
    async listar() {
      const j = await fetchJson(`${url}/api/tags`, {}, f);
      return (j?.models || []).map((m) => ({ id: m.name, creado: m.modified_at }));
    },
    async preguntar({ modelo, system, mensajes }) {
      const j = await fetchJson(`${url}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelo, stream: false, messages: [{ role: "system", content: system }, ...mensajes] }),
      }, f);
      return { texto: j?.message?.content?.trim() || "(sin texto)", modelo };
    },
  };
}

/**
 * Devuelve el cliente del proveedor. `def` viene de PROVEEDORES (core/ia.js).
 * `opciones.fetch` permite inyectar un fetch falso en los tests.
 */
function cliente(id, def, clave, opciones = {}) {
  if (id === "anthropic") return anthropic(clave, opciones);
  if (id === "gemini") return gemini(def.url, clave, opciones);
  if (id === "ollama") return ollama(def.url, opciones);
  return compatibleOpenAI(def.url, clave, opciones);
}

module.exports = { cliente, capacidadesClaude };
