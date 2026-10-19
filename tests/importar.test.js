import test from "node:test";
import assert from "node:assert/strict";
import { parsearCsv, mapearEncabezados, importarCsv, datasetVacio, recalcularPeriodo } from "../core/importar.js";
import { kpis } from "../core/metricas.js";
import { ds } from "./_comun.js";

test("parser CSV: comillas, comillas escapadas, ; y saltos dentro de campos", () => {
  const r = parsearCsv('\uFEFFa;b;c\n1;"hola; ""che""";3\n4;"dos\nlíneas";6\n');
  assert.deepEqual(r.encabezados, ["a", "b", "c"]);
  assert.equal(r.filas[0].b, 'hola; "che"');
  assert.equal(r.filas[1].b, "dos\nlíneas");
  assert.equal(r.filas.length, 2);
});

test("reconoce encabezados en español, inglés y portugués", () => {
  assert.deepEqual(mapearEncabezados(["Publish time", "Description", "Reach", "Likes", "Comments", "Shares"]),
    { fecha: "Publish time", texto: "Description", alcance: "Reach", likes: "Likes", comentarios: "Comments", compartidos: "Shares" });
  const pt = mapearEncabezados(["Data", "Legenda", "Impressões", "Curtidas", "Comentários"]);
  assert.equal(pt.impresiones, "Impressões");
  assert.equal(pt.likes, "Curtidas");
});

test("importa posts reales con números en formato local y no muta el dataset", () => {
  const base = datasetVacio("Mi marca", ["Rival"]);
  const csv = "Fecha,Texto,Alcance,Me gusta,Comentarios,Tipo\n15/09/2026 20:30,Nuevo #producto,\"1.234\",56,7,Reel\n16/09/2026,Otro post,900,20,1,Carrusel\nsin fecha,x,1,1,1,Imagen";
  const { ds: nuevo, resumen } = importarCsv(base, csv, { marca: "m0", red: "instagram" });
  assert.equal(base.posts.length, 0, "el original no cambia");
  assert.equal(resumen.importadas, 2);
  assert.equal(resumen.descartadas, 1);
  const p = nuevo.posts[0];
  assert.equal(p.alcance, 1234);
  assert.equal(p.interacciones, 63);
  assert.equal(p.formato, "reel");
  assert.equal(p.hora, 20);
  assert.deepEqual(p.hashtags, ["#producto"]);
  const r = recalcularPeriodo(nuevo);
  assert.equal(r.meta.inicio, "2026-09-15");
  const k = kpis(r, { marcas: ["m0"] });
  assert.equal(k.publicaciones, 2);
  assert.equal(kpis(r, { marcas: ["m0"], pais: "UY" }).publicaciones, 0, "sin geografía no cuenta con filtro geo");
});

test("importa una serie diaria de seguidores", () => {
  const { resumen, ds: nuevo } = importarCsv(ds(), "date,followers,impressions\n2026-10-01,1000,5000\n2026-10-02,1010,5100", { marca: "m1", red: "x" });
  assert.equal(resumen.tipo, "serie");
  assert.equal(nuevo.diario.length, ds().diario.length + 2);
});

test("errores claros: sin columna de fecha o marca inexistente", () => {
  assert.throws(() => importarCsv(ds(), "texto,alcance\nhola,1", { marca: "m0", red: "x" }), /fecha/);
  assert.throws(() => importarCsv(ds(), "fecha\n2026-01-01", { marca: "zz", red: "x" }), /Marca desconocida/);
});
