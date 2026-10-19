// © 2026 Martín Viera. Todos los derechos reservados.
// Registro de vistas (el orden es el del menú) e íconos SVG del menú.

import * as resumen from "./resumen.js";
import * as redes from "./redes.js";
import * as competencia from "./competencia.js";
import * as rankings from "./rankings.js";
import * as escucha from "./escucha.js";
import * as busqueda from "./busqueda.js";
import * as audiencia from "./audiencia.js";
import * as planificador from "./planificador.js";
import * as bandeja from "./bandeja.js";
import * as campanas from "./campanas.js";
import * as sugerencias from "./sugerencias.js";
import * as asistente from "./asistente.js";
import * as informes from "./informes.js";
import * as config from "./config.js";

export const VISTAS = { resumen, redes, competencia, rankings, escucha, busqueda, audiencia, planificador, bandeja, campanas, sugerencias, asistente, informes, config };

const svg = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONOS = {
  resumen: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  redes: svg('<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>'),
  competencia: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  rankings: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3"/>'),
  escucha: svg('<path d="M3 11a9 9 0 0118 0v3a3 3 0 01-3 3h-1v-6h4M3 11v3a3 3 0 003 3h1v-6H3"/>'),
  busqueda: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  audiencia: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6"/>'),
  planificador: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  bandeja: svg('<path d="M3 13l3-8h12l3 8v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6zM3 13h5l1 3h6l1-3h5"/>'),
  campanas: svg('<path d="M3 11l15-6v14L3 13v-2zM7 13v5a2 2 0 004 0v-4"/>'),
  sugerencias: svg('<path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V16h8v-1.3A7 7 0 0012 2z"/>'),
  asistente: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/>'),
  informes: svg('<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6M8 13h8M8 17h5"/>'),
  config: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>'),
};
