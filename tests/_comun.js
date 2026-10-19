// © 2026 Martín Viera. Todos los derechos reservados.
// Dataset compartido por los tests: fin fijo para que todo sea reproducible.
import { generarDemo } from "../core/demo.js";

export const FIN = "2026-10-18";
let cache = null;
export function ds() {
  if (!cache) cache = generarDemo({ fin: FIN, semilla: 42 });
  return cache;
}
