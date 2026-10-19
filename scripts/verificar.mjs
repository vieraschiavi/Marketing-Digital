// © 2026 Martín Viera. Todos los derechos reservados.
//
// "Verificar como CI" antes de pushear: lint, tests y E2E — los mismos gates
// que .github/workflows/ci.yml. Un pytest/npm test verde no alcanza: el lint y
// el E2E atrapan lo que los tests no ven.
//     node scripts/verificar.mjs          (todo)
//     node scripts/verificar.mjs --rapido (sin E2E)
import { spawnSync } from "node:child_process";

const pasos = [
  ["Lint", "npm", ["run", "lint"]],
  ["Tests", "npm", ["test"]],
];
if (!process.argv.includes("--rapido")) pasos.push(["E2E", "node", ["scripts/e2e.mjs"]]);

let ok = true;
for (const [nombre, cmd, args] of pasos) {
  process.stdout.write(`▶ ${nombre}… `);
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32" });
  if (r.status === 0) {
    console.log("VERDE");
  } else {
    ok = false;
    console.log(r.status === 2 ? "PARCIAL (falta una herramienta)" : "ROJO");
    console.log((r.stdout + r.stderr).split("\n").slice(-25).join("\n"));
  }
}
process.exit(ok ? 0 : 1);
