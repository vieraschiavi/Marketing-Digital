// © 2026 Martín Viera. Todos los derechos reservados.
// Audiencia: dónde está y quién es (país, ciudad, edad, género, intereses),
// para la marca propia o la que se elija en el filtro.

import { audiencia } from "../../core/metricas.js";
import { EDADES } from "../../core/catalogo.js";
import { barras, barrasH, dona, esc } from "../graficos.js";
import { panel, marcasFiltro } from "./comun.js";

export function render(ctx) {
  const { ds, t, fmt, filtros } = ctx;
  const marcas = marcasFiltro(ctx);
  const a = audiencia(ds, { ...filtros, marcas });
  const comp = audiencia(ds, { ...filtros, marcas: ds.marcas.filter((m) => !m.propia).map((m) => m.id) });
  return `
  <p class="muted">${esc(t("aud.de", { marcas: marcas.map(ctx.nombreMarca).join(", "), total: fmt.corto(a.total) }))}</p>
  <div class="grid g-2">
    ${panel(t("aud.paises"), barrasH(a.paises.slice(0, 8).map((p) => ({ etiqueta: p.nombre, valor: p.share * 100 })), { formato: fmt.pct }))}
    ${panel(t("aud.ciudades"), barrasH(a.ciudades.slice(0, 10).map((c) => ({ etiqueta: `${c.nombre} (${c.pais})`, valor: c.share * 100 })), { formato: fmt.pct }))}
  </div>
  <div class="grid g-3">
    ${panel(t("aud.edad"), barras(EDADES.map((e, i) => ({ etiqueta: e, valor: a.edad[i] * 100, color: "#2f74c0" })), { formato: (v) => fmt.dec(v) + "%" }) +
      `<p class="muted">${esc(t("aud.vsComp"))}: ${EDADES.map((e, i) => `${e} ${fmt.delta((a.edad[i] - comp.edad[i]) * 100).replace(" %", " pp")}`).join(" · ")}</p>`)}
    ${panel(t("aud.genero"), dona(["mujer", "hombre", "otro"].map((g, i) => ({ etiqueta: t("gen." + g), valor: a.genero[i] * 100 })), { formato: fmt.pct }))}
    ${panel(t("aud.intereses"), barrasH(a.intereses.slice(0, 8).map((x) => ({ etiqueta: t("int." + x.clave), valor: x.share * 100 })), { formato: fmt.pct }))}
  </div>
  <p class="muted nota">${esc(t("aud.nota"))}</p>`;
}
