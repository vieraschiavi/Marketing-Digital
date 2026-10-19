// © 2026 Martín Viera. Todos los derechos reservados.
//
// Copia la interfaz (app/) y el motor (core/) a donde se empaquetan:
//   node scripts/sincronizar.mjs desktop  → desktop/renderer/{app,core}  (el .exe)
//   node scripts/sincronizar.mjs web      → web/{app,core}               (demo en Vercel)
// Hay UNA sola fuente de verdad (app/ y core/); las copias están en .gitignore.
import { cp, rm, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINOS = { desktop: join(raiz, "desktop", "renderer"), web: join(raiz, "web") };

export async function sincronizar(destino) {
  const base = DESTINOS[destino];
  if (!base) throw new Error(`Destino desconocido: ${destino} (usá: ${Object.keys(DESTINOS).join(", ")})`);
  for (const carpeta of ["app", "core"]) {
    const d = join(base, carpeta);
    await rm(d, { recursive: true, force: true });
    await mkdir(d, { recursive: true });
    await cp(join(raiz, carpeta), d, { recursive: true });
  }
  // El proceso principal de Electron importa core/*.js: sin este marcador,
  // Node los toma como CommonJS (desktop/package.json no es "type": "module").
  if (destino === "desktop") await writeFile(join(base, "package.json"), '{ "type": "module" }\n');
  return base;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const destinos = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DESTINOS);
  for (const d of destinos) console.log("✓ sincronizado:", await sincronizar(d));
}
