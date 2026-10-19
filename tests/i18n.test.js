// Paridad ES/EN/PT y cobertura: toda clave usada en el código existe en los 3 idiomas.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TEXTOS, crearTraductor, IDIOMAS } from "../core/i18n.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const archivos = (dir) => readdirSync(join(raiz, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(join(dir, e.name)) : e.name.endsWith(".js") ? [join(raiz, dir, e.name)] : []));

test("los tres idiomas tienen exactamente las mismas claves", () => {
  const es = Object.keys(TEXTOS.es).sort();
  for (const l of IDIOMAS) assert.deepEqual(Object.keys(TEXTOS[l]).sort(), es, `paridad ${l}`);
});

test("los placeholders {x} coinciden entre idiomas", () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
  for (const k of Object.keys(TEXTOS.es)) for (const l of ["en", "pt"]) assert.equal(ph(TEXTOS[l][k]), ph(TEXTOS.es[k]), `${l}:${k}`);
});

test("toda clave literal t(\"...\") usada en app/ y core/ existe", () => {
  const usadas = new Set();
  for (const f of [...archivos("app"), ...archivos("core")]) {
    for (const m of readFileSync(f, "utf8").matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) if (!m[1].endsWith(".")) usadas.add(m[1]);
  }
  assert.ok(usadas.size > 200);
  const faltan = [...usadas].filter((k) => !(k in TEXTOS.es));
  assert.deepEqual(faltan, []);
});

test("claves dinámicas: vistas, sugerencias, respuestas locales y validaciones", () => {
  const dinamicas = [];
  for (const v of ["resumen", "redes", "competencia", "rankings", "escucha", "busqueda", "audiencia", "planificador", "bandeja", "campanas", "sugerencias", "asistente", "informes", "config"]) dinamicas.push("nav." + v);
  for (const t of ["horario", "formato", "competidor", "pico", "frecuencia", "bandeja", "tendencia", "idea", "brecha", "er_baja", "sov", "error"]) for (const p of ["titulo", "detalle", "accion"]) dinamicas.push(`sug.${t}.${p}`);
  for (const k of ["horario", "competencia", "sentimiento", "sentimientoAlerta", "formato", "tendencias", "resumen", "sugerencias", "whatifHora", "whatifFrec", "whatifSinDatos"]) dinamicas.push("ia.loc." + k);
  for (const k of ["vacio", "largo", "red"]) dinamicas.push("plan.err." + k);
  for (const k of ["hashtags", "media", "casi", "link"]) dinamicas.push("plan.av." + k);
  assert.deepEqual(dinamicas.filter((k) => !(k in TEXTOS.es)), []);
});

test("el traductor interpola y cae al español / a la clave", () => {
  const t = crearTraductor("en");
  assert.equal(t("res.posicionEr", { pos: 2, total: 6 }), "You rank 2 of 6 by engagement.");
  assert.equal(t("clave.inexistente"), "clave.inexistente");
  assert.equal(crearTraductor("fr")("nav.resumen"), "Resumen");
  assert.equal(t("res.posicionEr", {}), "You rank {pos} of {total} by engagement.");
});
