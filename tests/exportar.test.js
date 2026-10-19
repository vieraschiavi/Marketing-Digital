import test from "node:test";
import assert from "node:assert/strict";
import { aCsv, EXPORTABLES } from "../core/exportar.js";
import { ds } from "./_comun.js";

test("CSV con BOM, escapado y protección contra inyección de fórmulas", () => {
  const csv = aCsv([{ a: "=HYPERLINK(\"x\")", b: "hola, che", c: -12.5, d: "@usuario" }]);
  assert.ok(csv.startsWith("\uFEFFa,b,c,d\n"));
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"hola, che"/);
  assert.match(csv, /,-12\.5,/);
  assert.match(csv, /'@usuario/);
});

test("todos los exportables generan filas", () => {
  for (const [nombre, fn] of Object.entries(EXPORTABLES)) {
    const csv = fn(ds(), { desde: "2026-09-19", hasta: "2026-10-18" });
    assert.ok(csv.split("\n").length > 2, nombre);
  }
});
