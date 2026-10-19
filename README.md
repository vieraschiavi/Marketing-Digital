# MV Marketing Digital

**Analítica de redes sociales propias y de la competencia, con asistente IA.** Reúne lo mejor de
Metricool, Hootsuite, Buffer, Sprout Social, HubSpot Social y Social Blade sobre un **motor propio**,
en una app de escritorio para Windows (Electron + instalador NSIS) y una demo web en Vercel.

> **Datos de demostración 100 % sintéticos.** El motor de análisis es real (es el mismo que procesa
> los CSV que importás de tus redes), pero las marcas, publicaciones y menciones de la demo son
> inventadas con semilla fija. Las cifras de impacto, proyecciones e ingresos son ilustrativas.

## Qué hace

| Módulo | Inspirado en | Qué resuelve |
|---|---|---|
| **Resumen** | Metricool | KPIs con delta vs. período anterior, evolución, lo más urgente, posición frente a la competencia |
| **Redes** | Metricool / Sprout | Rendimiento por red, mapa de calor de horarios (ER por día×hora), formatos, mejores posts |
| **Competencia** | Sprout / Metricool | Benchmark con semáforo, share of voice, quién acelera, brechas por formato y tema, sus mejores posts |
| **Rankings** | Social Blade | Grado A++…D−, ranking por red, estadísticas diarias, proyección de seguidores 30 d–5 años con banda, próximo hito, ingresos estimados por CPM |
| **Escucha social** | Hootsuite / Sprout | Sentimiento trilingüe explicable, alertas de pico con causa probable (ciudad + tema), temas, hashtags, palabras |
| **Búsqueda** | Hootsuite Streams | Buscador con operadores (`red:` `pais:` `ciudad:` `marca:` `formato:` `sent:` `tema:` `"frase"`), radar de tendencias por país, ideas de contenido |
| **Audiencia** | Sprout / Meta | País, ciudad, edad, género, intereses — y comparación contra la competencia |
| **Planificador** | Buffer / Hootsuite | Redactor con validación por red, mejores horarios según los datos, calendario y cola exportable |
| **Bandeja** | Sprout Smart Inbox | Lo que pide respuesta, ordenado por urgencia, con respuesta sugerida |
| **Campañas** | HubSpot | Rendimiento por campaña, embudo, ROI **estimado** y constructor de UTM |
| **Sugerencias** | — | Motor de reglas: `score = impacto × probabilidad ÷ esfuerzo`, Urgente/Alta/Media/Baja, con evidencia |
| **Asistente IA** | — | Claude, ChatGPT, Gemini, Groq, Mistral, DeepSeek, Grok, Ollama. Actualización automática de modelos. What-if local sin clave |
| **Informes** | — | Informe ejecutivo HTML autocontenido (imprime a PDF) y CSV de cada bloque |

**Filtros globales:** período, red, país, ciudad, edad, género, interés, formato y marcas. Filtrar
por público no descarta publicaciones: pondera cada métrica por la fracción de su audiencia que cae
en el segmento, así que rankings, horarios y formatos cambian de verdad con el filtro.

## Asistente IA y actualización de modelos

- Funciona **sin ninguna clave**: el motor local responde horarios, competencia, sentimiento,
  formatos, tendencias, resúmenes y *what-if* en lenguaje natural
  («¿qué pasa si publico 3 reels más por semana en instagram?»).
- En la app de escritorio, con una clave, consulta al proveedor elegido. **La llamada la hace el
  proceso principal de Electron**: la clave se guarda cifrada con `safeStorage` (DPAPI en Windows) y
  nunca pasa por la interfaz. Claude se usa con el SDK oficial `@anthropic-ai/sdk`
  (`claude-opus-5-5` por defecto, thinking adaptativo y fallback de servidor).
- **Actualización de modelos:** al guardar una clave y cada 7 días, la app consulta qué modelos tiene
  tu cuenta (`/v1/models` de cada proveedor), descarta los que no son de chat y recomienda el más
  nuevo de la familia preferida. Si elegiste un modelo a mano, se respeta mientras exista.
- Al proveedor viajan solo **métricas agregadas** del tablero: nunca textos ni autores de terceros.

## Datos reales

En **Configuración → Importar** subís los CSV que exportan Meta Business Suite, TikTok Studio,
LinkedIn, X Analytics o YouTube Studio (o cualquier planilla con fecha, texto, alcance, likes…).
Se reconocen encabezados en ES/EN/PT y separadores `,` o `;`. La app **no publica sola** en las
redes: publicar en nombre de una cuenta exige una app aprobada por cada plataforma; el planificador
arma el plan y exporta la cola.

## Estructura

```
core/       motor puro (sin DOM): demo sintética, filtros, métricas, competencia, escucha,
            búsqueda, sugerencias, rankings, planificador, campañas, importador, IA, i18n
app/        interfaz (ES modules + SVG propio, sin dependencias) — la misma en el .exe y la web
desktop/    Electron: main.cjs (IPC, claves cifradas), ia-main.cjs (proveedores), preload.cjs
web/        landing de Vercel con videos + /app (copia generada de app/ y core/)
scripts/    sincronizar (copia app+core), servir, e2e, grabar_video, verificar
tests/      node --test (motor, IA, importador, i18n, exportación)
```

## Comandos

| Acción | Comando |
|---|---|
| Instalar dependencias | `npm install` y `npm install --prefix desktop` |
| Abrir la app en el navegador | `node scripts/servir.mjs` → http://127.0.0.1:8790/app/ |
| Abrir la app de escritorio | `npm start --prefix desktop` |
| Tests | `npm test` |
| Lint | `npm run lint` |
| E2E en Chromium | `npm run e2e` |
| **Verificar como CI** | `npm run verificar` |
| Instalador Windows (en Windows) | `npm run dist --prefix desktop` → `desktop/release/MV-Marketing-Digital-Setup.exe` |
| Videos de la landing | `npm run video` → `web/video/demo-{es,en,pt}.mp4` |

El instalador lo arma GitHub Actions (`.github/workflows/build-windows.yml`) en cada tag `v*`
y lo adjunta al Release; la web enlaza a `releases/latest/download/MV-Marketing-Digital-Setup.exe`.

## Licencia

© 2026 Martín Viera. Todos los derechos reservados.
