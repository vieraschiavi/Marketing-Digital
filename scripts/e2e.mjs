// © 2026 Martín Viera. Todos los derechos reservados.
//
// E2E de la interfaz en Chromium real: levanta la app, recorre las 14 vistas
// en los 3 idiomas y falla si aparece un error de JS, una vista con el panel
// de error, texto sin traducir ("nav.xxx") o desborde horizontal. Guarda una
// captura por vista en scripts/capturas/ (ignorada por git).
//
// Uso: node scripts/e2e.mjs [--dir web]   (por defecto prueba app/ desde la raíz)
// Chromium: PLAYWRIGHT_BROWSERS_PATH o MVMD_CHROMIUM=/ruta/al/chrome
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { servir } from "./servir.mjs";

const require = createRequire(import.meta.url);
function cargarPlaywright() {
  for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright", "@playwright/test"]) {
    try { return require(p); } catch { /* siguiente */ }
  }
  console.error("PARCIAL: no se encontró Playwright (npm i -D playwright).");
  process.exit(2);
}

const VISTAS = ["resumen", "redes", "competencia", "rankings", "escucha", "busqueda", "audiencia", "planificador", "bandeja", "campanas", "sugerencias", "asistente", "informes", "config"];
const args = process.argv.slice(2);
const dir = args.includes("--dir") ? args[args.indexOf("--dir") + 1] : ".";
const ruta = dir === "." ? "/app/index.html" : "/app/index.html";
const puerto = 8791;

const { chromium } = cargarPlaywright();
const srv = await servir(dir, puerto);
const navegador = await chromium.launch(process.env.MVMD_CHROMIUM ? { executablePath: process.env.MVMD_CHROMIUM } : {});
const fallas = [];
await mkdir("scripts/capturas", { recursive: true });

for (const [ancho, alto, sufijo] of [[1440, 900, ""], [390, 844, "-movil"]]) {
  for (const idioma of sufijo ? ["es"] : ["es", "en", "pt"]) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    const errores = [];
    pagina.on("pageerror", (e) => errores.push(String(e)));
    pagina.on("console", (m) => m.type() === "error" && errores.push(m.text()));
    for (const vista of VISTAS) {
      await pagina.goto(`http://127.0.0.1:${puerto}${ruta}?lang=${idioma}&vista=${vista}`);
      await pagina.waitForSelector("body.listo", { timeout: 15000 });
      await pagina.evaluate(() => localStorage.clear());
      const r = await pagina.evaluate(() => ({
        errorVista: !!document.querySelector(".panel.error"),
        claves: (document.body.innerText.match(/\b(nav|kpi|col|res|redes|comp|rank|esc|bus|aud|plan|bdj|camp|sug|ia|inf|cfg|fil|fmt|gen|int|sent|prio|tend)\.[a-zA-Z_]+(\.[a-zA-Z_]+)?\b/g) || []).filter((x) => !/^(ia\.anthropic|[a-z]+\.(com|ai|app|uy|io))/.test(x)),
        desborde: document.documentElement.scrollWidth - window.innerWidth,
        titulo: document.querySelector(".superior h1")?.textContent,
      }));
      if (errores.length) fallas.push(`[${idioma}${sufijo}] ${vista}: errores JS → ${errores.splice(0).join(" | ")}`);
      if (r.errorVista) fallas.push(`[${idioma}${sufijo}] ${vista}: panel de error renderizado`);
      if (r.claves.length) fallas.push(`[${idioma}${sufijo}] ${vista}: claves sin traducir → ${[...new Set(r.claves)].join(", ")}`);
      if (r.desborde > 2) fallas.push(`[${idioma}${sufijo}] ${vista}: desborde horizontal de ${r.desborde}px`);
      if (idioma === "es" || sufijo) await pagina.screenshot({ path: `scripts/capturas/${vista}${sufijo}.png`, fullPage: !sufijo });
    }
    await pagina.close();
  }
}

// Flujos: búsqueda, asistente local, planificador y ficha de ranking.
const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(`http://127.0.0.1:${puerto}${ruta}?lang=es&vista=busqueda`);
await p.waitForSelector("body.listo");
await p.fill("#consulta", "delivery sent:negativo");
await p.click('[data-accion="buscar"]');
await p.waitForSelector(".mencion");
await p.click('[data-accion="ir"][data-vista="asistente"]');
await p.fill("#pregunta", "¿qué pasa si publico 3 reels más por semana en instagram?");
await p.click('[data-accion="enviar"]');
await p.waitForSelector(".msg.assistant .burbuja");
const respuesta = await p.textContent(".msg.assistant .burbuja");
if (!/interacciones/.test(respuesta)) fallas.push("asistente: el what-if local no respondió con interacciones → " + respuesta);
await p.click('[data-accion="ir"][data-vista="planificador"]');
await p.fill("#textoBorrador", "Probando la cola #cafe");
await p.check('[data-campo="media"]');
await p.waitForTimeout(600);
await p.click('[data-accion="programar"]');
await p.waitForSelector(".lista-cola li");
await p.click('[data-accion="ir"][data-vista="rankings"]');
await p.click('tr[data-accion="abrirFicha"]');
await p.waitForSelector(".ficha .grado");
await p.screenshot({ path: "scripts/capturas/flujo-ficha.png", fullPage: true });
if (errs.length) fallas.push("flujos: " + errs.join(" | "));

await navegador.close();
srv.close();
if (fallas.length) {
  console.error("ROJO\n" + fallas.join("\n"));
  process.exit(1);
}
console.log(`VERDE: ${VISTAS.length} vistas × 3 idiomas + móvil + 4 flujos, sin errores.`);
