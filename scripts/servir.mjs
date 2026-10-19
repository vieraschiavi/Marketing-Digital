// © 2026 Martín Viera. Todos los derechos reservados.
// Servidor estático mínimo para desarrollo y para el E2E: sirve una carpeta
// (por defecto la raíz del repo) sin dependencias. Uso:
//   node scripts/servir.mjs [carpeta] [puerto]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, isAbsolute } from "node:path";

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".json": "application/json", ".ico": "image/x-icon", ".vtt": "text/vtt" };

export function servir(raiz = ".", puerto = 8790) {
  const base = resolve(raiz);
  const srv = createServer(async (req, res) => {
    try {
      const ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let archivo = normalize(join(base, ruta));
      const rel = relative(base, archivo);
      if (rel.startsWith("..") || isAbsolute(rel)) { res.writeHead(403).end(); return; } // path traversal
      if ((await stat(archivo).catch(() => null))?.isDirectory()) archivo = join(archivo, "index.html");
      const datos = await readFile(archivo);
      res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(datos);
    } catch {
      res.writeHead(404).end("no encontrado");
    }
  });
  return new Promise((ok) => srv.listen(puerto, "127.0.0.1", () => ok(srv)));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const [carpeta = ".", puerto = "8790"] = process.argv.slice(2);
  servir(carpeta, Number(puerto)).then(() => console.log(`Sirviendo ${resolve(carpeta)} en http://127.0.0.1:${puerto}/`));
}
