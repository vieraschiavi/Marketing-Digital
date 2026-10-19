// © 2026 Martín Viera. Todos los derechos reservados.
//
// Graba los videos demo de la landing: un recorrido de ~55 s por la app real
// (la demo web, con datos sintéticos) en los tres idiomas, a 1280×720.
//
//   node scripts/grabar_video.mjs            → es, en y pt
//   node scripts/grabar_video.mjs es pt      → sólo esos idiomas
//
// Salida: web/video/demo-{es,en,pt}.mp4 (H.264, yuv420p, +faststart, sin
// audio) y web/video/poster.jpg (captura limpia del Resumen).
//
// Cómo funciona: Playwright graba la pestaña en .webm (recordVideo) mientras
// el guion navega la app como lo haría una persona —clics en el menú, tipeo
// en la búsqueda y en el asistente—. La app no tiene subtítulos: el rótulo
// de cada escena lo inyecta este script con page.evaluate, como un elemento
// fijo encima de la interfaz. Después ffmpeg recorta el arranque en blanco y
// convierte a MP4 liviano (CRF 28: cada archivo queda en pocos MB porque la
// interfaz es mayormente plana).
//
// Chromium: PLAYWRIGHT_BROWSERS_PATH (preinstalado) o MVMD_CHROMIUM=/ruta.
// ffmpeg: /usr/bin/ffmpeg o el que diga MVMD_FFMPEG.
import { createRequire } from "node:module";
import { mkdir, rm, stat, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sincronizar } from "./sincronizar.mjs";
import { servir } from "./servir.mjs";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(raiz, "web", "video");
const TMP = join(SALIDA, ".crudo"); // los .webm intermedios; se borran al final
const PUERTO = 8794;
const ANCHO = 1280, ALTO = 720;
const FFMPEG = process.env.MVMD_FFMPEG || (existsSync("/usr/bin/ffmpeg") ? "/usr/bin/ffmpeg" : "ffmpeg");
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");

const require = createRequire(import.meta.url);
function cargarPlaywright() {
  for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright", "@playwright/test"]) {
    try { return require(p); } catch { /* siguiente */ }
  }
  console.error("PARCIAL: no se encontró Playwright (npm i -D playwright).");
  process.exit(2);
}

// ── Guion ──────────────────────────────────────────────────────────────
// Un rótulo por escena y por idioma. Lo que se ve debajo es la app real.
const TEXTOS = {
  es: {
    intro: ["MV Marketing Digital", "Tus redes y las de tu competencia, en un solo tablero"],
    resumen: ["Resumen", "KPIs de 8 redes y lo más importante para hacer hoy"],
    redes: ["Analítica por red", "Mapa de calor: el mejor horario para publicar"],
    competencia: ["Competencia", "Share of voice, crecimiento y quién está acelerando"],
    rankings: ["Rankings y proyecciones", "Grados A++ a D−, estadísticas diarias y proyección a 5 años"],
    escucha: ["Escucha social", "Sentimiento explicable y alertas de picos con causa probable"],
    busqueda: ["Búsqueda profunda", "Operadores red:, ciudad:, sent:, tema: y frase exacta"],
    planificador: ["Planificador", "Validación por red, mejores horarios y cola exportable"],
    sugerencias: ["Sugerencias", "Priorizadas por impacto × probabilidad ÷ esfuerzo"],
    asistente: ["Asistente IA", "Simulá escenarios en tu idioma, incluso sin clave de IA"],
    outro: ["Probala gratis", "Datos de demostración 100 % sintéticos · cifras ilustrativas"],
    consulta: "delivery ciudad:canelones",
    pregunta: "¿qué pasa si publico 3 reels más por semana en instagram?",
  },
  en: {
    intro: ["MV Marketing Digital", "Your social networks and your competitors’, in one dashboard"],
    resumen: ["Overview", "KPIs across 8 networks and what matters most today"],
    redes: ["Per-network analytics", "Heatmap: the best time to post"],
    competencia: ["Competitors", "Share of voice, growth and who is accelerating"],
    rankings: ["Rankings & projections", "A++ to D− grades, daily stats and 5-year projection"],
    escucha: ["Social listening", "Explainable sentiment and spike alerts with probable cause"],
    busqueda: ["Deep search", "Operators red:, ciudad:, sent:, tema: and exact phrase"],
    planificador: ["Planner", "Per-network validation, best slots and exportable queue"],
    sugerencias: ["Suggestions", "Prioritized by impact × probability ÷ effort"],
    asistente: ["AI assistant", "Simulate scenarios in plain language, even without an AI key"],
    outro: ["Try it free", "100% synthetic demo data · illustrative figures"],
    consulta: "delivery ciudad:canelones",
    pregunta: "what if I post 3 more reels per week on instagram?",
  },
  pt: {
    intro: ["MV Marketing Digital", "Suas redes e as da concorrência, em um só painel"],
    resumen: ["Resumo", "KPIs de 8 redes e o mais importante para fazer hoje"],
    redes: ["Análise por rede", "Mapa de calor: o melhor horário para publicar"],
    competencia: ["Concorrência", "Share of voice, crescimento e quem está acelerando"],
    rankings: ["Rankings e projeções", "Notas A++ a D−, estatísticas diárias e projeção de 5 anos"],
    escucha: ["Escuta social", "Sentimento explicável e alertas de picos com causa provável"],
    busqueda: ["Busca avançada", "Operadores red:, ciudad:, sent:, tema: e frase exata"],
    planificador: ["Planejador", "Validação por rede, melhores horários e fila exportável"],
    sugerencias: ["Sugestões", "Priorizadas por impacto × probabilidade ÷ esforço"],
    asistente: ["Assistente IA", "Simule cenários no seu idioma, mesmo sem chave de IA"],
    outro: ["Teste grátis", "Dados de demonstração 100% sintéticos · números ilustrativos"],
    consulta: "delivery ciudad:canelones",
    pregunta: "e se eu publicar 3 reels a mais por semana no instagram?",
  },
};

// ── Rótulos inyectados ─────────────────────────────────────────────────
// Se cuelgan de <html> y no de <body>: así sobreviven aunque la app vuelva a
// pintar el body entero al cambiar de vista.
function rotulo(page, n, total, titulo, sub) {
  return page.evaluate(([n, total, titulo, sub]) => {
    document.getElementById("mv-rotulo")?.remove();
    const el = document.createElement("div");
    el.id = "mv-rotulo";
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:fixed;left:28px;bottom:26px;z-index:99999;max-width:640px;padding:16px 22px 16px 20px;"
      + "background:rgba(8,21,39,.93);border:1px solid #2a4160;border-left:4px solid #82C544;border-radius:14px;"
      + "box-shadow:0 18px 40px rgba(0,0,0,.45);color:#eaf1fb;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;"
      + "opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease;pointer-events:none";
    el.innerHTML = `<div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#f2b441;font-weight:700">MV Marketing Digital · ${String(n).padStart(2, "0")}/${String(total).padStart(2, "0")}</div>`
      + `<div style="font-size:30px;font-weight:800;line-height:1.15;margin-top:6px">${titulo}</div>`
      + `<div style="font-size:16.5px;color:#9db0c8;margin-top:5px;line-height:1.4">${sub}</div>`;
    document.documentElement.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = "1"; el.style.transform = "none"; }));
  }, [n, total, titulo, sub]);
}

// Placa a pantalla completa para la apertura y el cierre.
function placa(page, titulo, sub, extra = "") {
  return page.evaluate(([titulo, sub, extra]) => {
    document.getElementById("mv-placa")?.remove();
    const el = document.createElement("div");
    el.id = "mv-placa";
    el.style.cssText = "position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;"
      + "background:radial-gradient(120% 140% at 20% -10%,#14314f 0%,#081527 60%);color:#eaf1fb;"
      + "font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;transition:opacity .5s ease;padding:40px";
    el.innerHTML = `<img src="/logo-mv.svg" alt="" width="96" height="96" style="border-radius:22px">`
      + `<div style="font-size:52px;font-weight:800;line-height:1.1">${titulo}</div>`
      + `<div style="font-size:22px;color:#9db0c8;max-width:900px">${sub}</div>`
      + (extra ? `<div style="margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;letter-spacing:.08em;color:#f2b441">${extra}</div>` : "");
    document.documentElement.appendChild(el);
  }, [titulo, sub, extra]);
}
const sacarPlaca = (page) => page.evaluate(() => {
  const el = document.getElementById("mv-placa");
  if (!el) return;
  el.style.opacity = "0";
  setTimeout(() => el.remove(), 600);
});

// Scroll suave del documento hasta un elemento (o un desplazamiento fijo).
async function deslizar(page, destino, ms = 1200) {
  await page.evaluate(([destino, ms]) => new Promise((ok) => {
    let y1;
    if (typeof destino === "number") y1 = destino;
    else {
      const el = typeof destino === "string" ? document.querySelector(destino) : null;
      if (!el) return ok();
      const r = el.getBoundingClientRect();
      y1 = window.scrollY + r.top - 90;
    }
    y1 = Math.max(0, Math.min(y1, document.documentElement.scrollHeight - innerHeight));
    const y0 = window.scrollY, t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      window.scrollTo(0, y0 + (y1 - y0) * e);
      k < 1 ? requestAnimationFrame(paso) : ok();
    };
    requestAnimationFrame(paso);
  }), [destino, ms]);
}

async function ir(page, vista) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click(`.lateral [data-accion="ir"][data-vista="${vista}"]`);
  await page.waitForTimeout(450);
}

// ── Recorrido de un idioma ─────────────────────────────────────────────
async function grabar(navegador, idioma) {
  const T = TEXTOS[idioma];
  const dirCrudo = join(TMP, idioma);
  await rm(dirCrudo, { recursive: true, force: true }); // restos de una corrida cortada
  await mkdir(dirCrudo, { recursive: true });
  const ctx = await navegador.newContext({
    viewport: { width: ANCHO, height: ALTO },
    deviceScaleFactor: 1,
    recordVideo: { dir: dirCrudo, size: { width: ANCHO, height: ALTO } },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(String(e)));
  const espera = (ms) => page.waitForTimeout(ms);

  await page.goto(`http://127.0.0.1:${PUERTO}/app/index.html?lang=${idioma}&vista=resumen`);
  await page.waitForSelector("body.listo", { timeout: 20000 });
  await placa(page, T.intro[0], T.intro[1]);
  await espera(300); // que la placa ya esté pintada antes de marcar el corte
  const inicio = (Date.now() - t0) / 1000; // todo lo anterior es blanco y carga: se recorta
  await espera(2100);
  await sacarPlaca(page);

  const ESCENAS = ["resumen", "redes", "competencia", "rankings", "escucha", "busqueda", "planificador", "sugerencias", "asistente"];
  const total = ESCENAS.length;
  for (const [i, vista] of ESCENAS.entries()) {
    if (vista !== "resumen") await ir(page, vista);
    await rotulo(page, i + 1, total, ...T[vista]);
    switch (vista) {
      case "resumen":
        await espera(2100);
        await deslizar(page, 420, 1600);
        await espera(1300);
        break;
      case "redes": {
        await espera(900);
        // El mapa de calor es el SVG con 7×24 celdas.
        await page.evaluate(() => {
          const svg = [...document.querySelectorAll("svg.graf")].find((s) => s.querySelectorAll("rect").length >= 160);
          if (svg) svg.closest(".panel, section, article, div")?.setAttribute("data-mv-calor", "1");
        });
        await deslizar(page, "[data-mv-calor]", 1500);
        await espera(2100);
        break;
      }
      case "competencia":
        await espera(1500);
        await deslizar(page, 520, 1700);
        await espera(1500);
        break;
      case "rankings":
        await espera(1500);
        await page.click('tr[data-accion="abrirFicha"]');
        await page.waitForSelector(".ficha .grado", { timeout: 8000 });
        await espera(300);
        await deslizar(page, ".ficha", 1400);
        await espera(2300);
        break;
      case "escucha":
        await espera(1900);
        await deslizar(page, 380, 1500);
        await espera(1600);
        break;
      case "busqueda":
        await espera(600);
        await page.fill("#consulta", "");
        await page.locator("#consulta").pressSequentially(T.consulta, { delay: 55 });
        await espera(350);
        await page.click('[data-accion="buscar"]');
        await page.waitForSelector(".mencion, .resultado, .post", { timeout: 8000 }).catch(() => {});
        await espera(1600);
        await deslizar(page, 360, 1400);
        await espera(1200);
        break;
      case "planificador":
        await espera(1500);
        await deslizar(page, 460, 1600);
        await espera(1600);
        break;
      case "sugerencias":
        await espera(2000);
        await deslizar(page, 400, 1500);
        await espera(1300);
        break;
      case "asistente":
        await espera(500);
        await page.fill("#pregunta", "");
        await page.locator("#pregunta").pressSequentially(T.pregunta, { delay: 38 });
        await espera(300);
        await page.click('[data-accion="enviar"]');
        await page.waitForSelector(".msg.assistant .burbuja", { timeout: 10000 });
        await espera(600);
        await page.evaluate(() => document.querySelector(".msg.assistant:last-of-type .burbuja, .msg.assistant .burbuja")?.scrollIntoView({ block: "center", behavior: "smooth" }));
        await espera(3300);
        break;
    }
  }

  await page.evaluate(() => document.getElementById("mv-rotulo")?.remove());
  await placa(page, T.outro[0], T.outro[1], "Windows · demo web · ES / EN / PT");
  await espera(2700);
  const fin = (Date.now() - t0) / 1000;

  // Se cierra apenas termina la placa final: Playwright escribe el .webm con
  // atraso respecto del reloj real (unos segundos en un minuto de grabación,
  // más si la máquina está cargada), así que el final NO se corta por tiempo
  // medido sino por la duración real del archivo: lo último que hay en él es
  // la placa de cierre.
  await page.close();
  await ctx.close(); // recién acá Playwright termina de escribir el .webm
  if (errores.length) throw new Error(`[${idioma}] errores de JS durante la grabación: ${errores.join(" | ")}`);

  const [crudo] = (await readdir(dirCrudo)).filter((f) => f.endsWith(".webm"));
  const webm = join(dirCrudo, crudo);
  const durCrudo = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", webm]).toString().trim());
  const dur = Math.max(1, durCrudo - inicio - 0.15);
  const mp4 = join(SALIDA, `demo-${idioma}.mp4`);
  if (process.env.MVMD_CONSERVAR) console.log("crudo:", webm, { inicio, fin, durCrudo });
  execFileSync(FFMPEG, [
    "-y", "-loglevel", "error",
    "-ss", inicio.toFixed(2), "-i", webm, "-t", dur.toFixed(2),
    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-r", "25",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
  ]);
  const mb = (await stat(mp4)).size / 1048576;
  console.log(`✓ ${mp4} — ${dur.toFixed(1)} s, ${mb.toFixed(2)} MB`);
}

// Poster de la landing: el Resumen en español, limpio (sin rótulos), en un
// contexto aparte que no graba.
async function poster(navegador) {
  const ctx = await navegador.newContext({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PUERTO}/app/index.html?lang=es&vista=resumen`);
  await p.waitForSelector("body.listo");
  await p.waitForTimeout(500);
  await p.screenshot({ path: join(SALIDA, "poster.jpg"), type: "jpeg", quality: 82 });
  await ctx.close();
  console.log(`✓ ${join(SALIDA, "poster.jpg")}`);
}

// ── Principal ──────────────────────────────────────────────────────────
const pedidos = process.argv.slice(2).filter((a) => TEXTOS[a]);
const idiomas = pedidos.length ? pedidos : Object.keys(TEXTOS);

await sincronizar("web");
await mkdir(SALIDA, { recursive: true });
const { chromium } = cargarPlaywright();
const srv = await servir(join(raiz, "web"), PUERTO);
const navegador = await chromium.launch(process.env.MVMD_CHROMIUM ? { executablePath: process.env.MVMD_CHROMIUM } : {});
let codigo = 0;
try {
  await poster(navegador);
  for (const idioma of idiomas) await grabar(navegador, idioma);
} catch (e) {
  console.error("ROJO:", e.message);
  codigo = 1;
} finally {
  await navegador.close();
  srv.close();
  if (!process.env.MVMD_CONSERVAR) await rm(TMP, { recursive: true, force: true });
}
process.exit(codigo);
