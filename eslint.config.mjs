/* © 2026 Martín Viera. Todos los derechos reservados. */

// ESLint (flat config). Austero a propósito: reglas que atrapan bugs reales
// (variables sin declarar o sin usar, código inalcanzable), no estilo.
//     npm run lint
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["**/node_modules/**", "desktop/release/**", "desktop/renderer/**", "web/app/**", "web/core/**", "scripts/capturas/**"] },
  {
    files: ["core/**/*.js", "app/**/*.js", "web/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser } },
    rules: { ...js.configs.recommended.rules, "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }] },
  },
  {
    // Los scripts de Playwright mandan funciones al navegador (page.evaluate):
    // necesitan los globals de los dos lados.
    files: ["tests/**/*.js", "scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
    rules: { ...js.configs.recommended.rules, "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }] },
  },
  {
    files: ["desktop/**/*.cjs"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules, "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }] },
  },
];
