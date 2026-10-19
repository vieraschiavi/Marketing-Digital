// Regresiones de la revisión de código: cada test reproduce un defecto real.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { armarMensajes, whatIf } from "../core/ia.js";
import { fechaIso, numero, separadorDecimal, ordenFechas, mapearEncabezados, importarCsv, mezclarImportados } from "../core/importar.js";
import { hoyLocal } from "../core/fechas.js";
import { mejoresHorarios } from "../core/metricas.js";
import { servir } from "../scripts/servir.mjs";
import { ds } from "./_comun.js";

const require = createRequire(import.meta.url);
const { capacidadesClaude } = require("../desktop/ia-main.cjs");

test("historial al proveedor: solo {role, content} (sin `origen`)", () => {
  const m = armarMensajes([{ role: "user", content: "a" }, { role: "assistant", content: "b", origen: "Claude" }], "c", {});
  assert.deepEqual(Object.keys(m[1]).sort(), ["content", "role"]);
  assert.equal(m.filter((x) => x.role === "user" && x.content.includes("PREGUNTA:\nc")).length, 1);
});

test("fechas: mm/dd se infiere por columna, imposibles se descartan, ISO no corre de día", () => {
  assert.equal(ordenFechas(["10/19/2026", "10/02/2026"]), "md");
  assert.equal(fechaIso("10/19/2026 20:30", "md"), "2026-10-19T20:30:00");
  assert.equal(fechaIso("10/19/2026", "dm"), null, "mes 19 no existe");
  assert.equal(fechaIso("31/02/2026"), null);
  assert.equal(fechaIso("2026-03-01"), "2026-03-01T12:00:00", "sin pasar por UTC");
  const { ds: nuevo, resumen } = importarCsv(ds(), "Date,Description,Reach\n10/19/2026 20:00,a,100\n10/02/2026,b,200", { marca: "m1", red: "x" });
  assert.equal(resumen.importadas, 2);
  const imp = nuevo.posts.filter((p) => p.importado);
  assert.equal(imp[0].fecha, "2026-10-19T20:00:00");
  assert.equal(imp[1].fecha, "2026-10-02T12:00:00");
  assert.doesNotThrow(() => mejoresHorarios(nuevo, {}));
});

test("números: el separador decimal se decide por columna", () => {
  assert.equal(separadorDecimal(["0.045", "0.12"]), ".");
  assert.equal(numero("0.045", "."), 0.045);
  assert.equal(separadorDecimal(["1.234,5", "12,3"]), ",");
  assert.equal(numero("1.234,5", ","), 1234.5);
  assert.equal(numero("-1.234", ","), -1234);
  assert.equal(numero("12,345", "."), 12345);
  assert.equal(numero("4,5 %", ","), 4.5);
});

test("encabezados de tasa no se mapean a conteos", () => {
  const m = mapearEncabezados(["Date", "Post title", "Impressions", "Engagement rate", "Clicks", "CTR"]);
  assert.equal(m.interacciones, undefined);
  assert.equal(m.clics, "Clicks");
});

test("importados reemplazan a la cuenta demo y no se duplican", () => {
  const { ds: soloImp } = importarCsv({ ...ds(), posts: [], diario: [], cuentas: [] }, "date,followers\n2026-10-01,500\n2026-10-02,510", { marca: "m0", red: "instagram" });
  const imp = { posts: [], diario: [...soloImp.diario, ...soloImp.diario], cuentas: soloImp.cuentas };
  const mezcla = mezclarImportados(ds(), imp);
  const serie = mezcla.diario.filter((d) => d.marca === "m0" && d.red === "instagram");
  assert.deepEqual(serie.map((d) => d.seguidores), [500, 510], "sin filas demo ni duplicados");
  assert.ok(mezcla.diario.some((d) => d.marca === "m0" && d.red === "facebook"), "las demás cuentas siguen");
  const corrupto = mezclarImportados(ds(), { posts: [{ id: "x", marca: "m0", red: "x", fecha: "2026-19-10T00:00:00", dia: NaN, hora: NaN }], diario: [], cuentas: [] });
  assert.equal(corrupto.meta.fin, ds().meta.fin, "una fila imposible no corre el período");
});

test("capacidades de Claude con ids fechados", () => {
  assert.equal(capacidadesClaude("claude-opus-4-20250514").moderno, false);
  assert.equal(capacidadesClaude("claude-sonnet-4-5-20250929").moderno, false);
  assert.equal(capacidadesClaude("claude-opus-4-6").moderno, true);
});

test("what-if: 'próximo' no se confunde con la red X", () => {
  assert.equal(whatIf(ds(), "si publico 2 posts más por semana en linkedin el próximo mes").red, "linkedin");
  assert.equal(whatIf(ds(), "si publico 3 videos más en x").red, "x");
});

test("hoyLocal usa la fecha local, no la UTC", () => {
  const d = new Date(2026, 9, 18, 23, 30); // 18/10 23:30 hora local
  assert.equal(hoyLocal(d), "2026-10-18");
});

test("servidor estático: no sale de la carpeta ni hacia carpetas hermanas", async () => {
  const base = await mkdtemp(join(tmpdir(), "mvmd-"));
  await mkdir(join(base, "a")); await mkdir(join(base, "ab"));
  await writeFile(join(base, "a", "index.html"), "ok");
  await writeFile(join(base, "ab", "secreto.txt"), "no");
  const srv = await servir(join(base, "a"), 8799);
  try {
    assert.equal((await fetch("http://127.0.0.1:8799/")).status, 200);
    assert.notEqual((await fetch("http://127.0.0.1:8799/..%2fab/secreto.txt")).status, 200);
  } finally {
    srv.close();
  }
});
