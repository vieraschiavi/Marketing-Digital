# CLAUDE.md — MV Marketing Digital

Guía para Claude Code al trabajar en este repo. Leela antes de tocar código.

## Qué es

Analítica de redes sociales propias y de la competencia (lo mejor de Metricool, Hootsuite, Buffer,
Sprout Social, HubSpot Social y Social Blade, sobre motor propio) con asistente IA multi-proveedor.
App de escritorio Electron con instalador NSIS para Windows + landing y demo web en Vercel.
**Demo 100 % sintética con semilla fija**; el motor es real.

## Stack

- **JavaScript puro, ES modules.** Sin framework ni bundler: `core/` (motor, sin DOM) y `app/`
  (interfaz, gráficos SVG propios). El mismo código corre en el .exe y en la web.
- **Electron 33 + electron-builder 25** en `desktop/`. `main.cjs` maneja IPC, guardado y claves
  cifradas (`safeStorage`); `ia-main.cjs` llama a los proveedores (Claude con `@anthropic-ai/sdk`).
- **Tests:** `node --test` en `tests/`. **E2E:** Playwright + Chromium (`scripts/e2e.mjs`).

## Comandos

| Objetivo | Comando |
|---|---|
| Tests | `npm test` |
| Lint | `npm run lint` |
| E2E (14 vistas × 3 idiomas + móvil + flujos) | `npm run e2e` |
| **Verificar como CI antes de pushear** | `npm run verificar` |
| App en el navegador | `node scripts/servir.mjs` → `/app/` |
| App de escritorio | `npm start --prefix desktop` (en Linux como root: `npx electron . --no-sandbox`) |
| Copiar app+core a desktop/ o web/ | `node scripts/sincronizar.mjs desktop|web` |
| Videos de la landing | `npm run video` |

El instalador `.exe` NO se arma en Linux: lo hace `build-windows.yml` en un runner Windows al
taggear `v*`.

## Reglas

- **Una sola fuente:** se edita `app/` y `core/`. `web/app`, `web/core` y `desktop/renderer` son
  copias generadas (gitignored). Nunca edites las copias.
- **Trilingüe siempre (ES/EN/PT):** todo texto visible vive en `core/i18n.js`. `tests/i18n.test.js`
  rompe si falta una clave en un idioma o si el código usa una clave inexistente. Las sugerencias del
  motor devuelven `tipo + vars`, nunca texto armado.
- **Datos honestos:** demo sintética con marcas ficticias (nunca nombres de empresas reales como
  competidores de demo). Conversiones, ROI, proyecciones lejanas e ingresos se muestran como
  **estimados**. Nada de reseñas o testimonios inventados.
- **La IA es aditiva:** todo funciona sin clave (motor de reglas + what-if local). La clave vive
  cifrada en el proceso principal y nunca se expone al renderer ni a la web. Al proveedor solo van
  métricas agregadas (`construirContexto`), sin textos ni autores de terceros.
- **No se publica automáticamente** en redes: la cola se arma y exporta.
- **Motor sin DOM:** `core/` no toca `document` ni `window`; se testea con Node.
- Cada patrón nuevo inyectado en `core/demo.js` lleva su test que verifica que el motor lo descubre.

## Do / Don't

- ✅ `npm run verificar` antes de pushear · ✅ seeds fijos · ✅ paridad ES/EN/PT.
- ❌ `git push --force` ni `rm -rf` · ❌ leer o commitear claves/`.env` · ❌ CDNs externos en la app
  (la CSP lo prohíbe y el .exe tiene que andar offline).
