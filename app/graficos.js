// © 2026 Martín Viera. Todos los derechos reservados.
//
// Gráficos SVG propios, sin librerías: funcionan offline en el .exe y en la
// demo web con la misma CSP estricta. Cada función devuelve un string SVG
// que escala al ancho del contenedor. Los tooltips son <title> nativos
// (accesibles con lector de pantalla y sin JS extra).

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PALETA = ["#82C544", "#f2b441", "#2f74c0", "#e05c5c", "#9b6bd6", "#00c896", "#ff8a3d", "#5bc0eb"];
export const colorSerie = (i) => PALETA[i % PALETA.length];

function escalaNice(max) {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const n = max / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Líneas múltiples. series: [{nombre, valores, color?}], etiquetas: eje X. */
export function lineas(series, etiquetas, { alto = 220, formato = (v) => v, area = false, minCero = true } = {}) {
  const W = 640, H = alto, m = { t: 12, r: 12, b: 26, l: 52 };
  const todos = series.flatMap((s) => s.valores).filter((v) => v != null);
  if (!todos.length) return vacio(alto);
  let min = minCero ? 0 : Math.min(...todos);
  const max = escalaNice(Math.max(...todos) - min) + min;
  if (!minCero) min = Math.floor(min * 0.98);
  const n = etiquetas.length;
  const x = (i) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - m.l - m.r));
  const y = (v) => H - m.b - ((v - min) / (max - min || 1)) * (H - m.t - m.b);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" preserveAspectRatio="none">`;
  for (let k = 0; k <= 4; k++) {
    const v = min + ((max - min) * k) / 4;
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="grilla"/><text x="${m.l - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${esc(formato(v))}</text>`;
  }
  const paso = Math.max(1, Math.ceil(n / 7));
  etiquetas.forEach((e, i) => {
    if (i % paso === 0 || i === n - 1) svg += `<text x="${x(i)}" y="${H - 8}" class="eje" text-anchor="middle">${esc(e)}</text>`;
  });
  series.forEach((s, si) => {
    const c = s.color || colorSerie(si);
    const pts = s.valores.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
    if (area && pts.length) svg += `<polygon points="${x(0)},${y(min)} ${pts.join(" ")} ${x(n - 1)},${y(min)}" fill="${c}" opacity="0.12"/>`;
    svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="${c}" stroke-width="${s.ancho || 2}" ${s.punteada ? 'stroke-dasharray="5 4"' : ""}><title>${esc(s.nombre)}</title></polyline>`;
  });
  return svg + "</svg>" + leyenda(series);
}

export function leyenda(series) {
  if (series.length < 2) return "";
  return `<div class="leyenda">${series.map((s, i) => `<span><i style="background:${s.color || colorSerie(i)}"></i>${esc(s.nombre)}</span>`).join("")}</div>`;
}

/** Barras verticales. datos: [{etiqueta, valor, color?}] */
export function barras(datos, { alto = 220, formato = (v) => v, colorBase = "#82C544" } = {}) {
  if (!datos.length) return vacio(alto);
  const W = 640, H = alto, m = { t: 14, r: 8, b: 30, l: 48 };
  const max = escalaNice(Math.max(...datos.map((d) => d.valor), 0));
  const bw = (W - m.l - m.r) / datos.length;
  const y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" preserveAspectRatio="none">`;
  for (let k = 0; k <= 4; k++) {
    const v = (max * k) / 4;
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" class="grilla"/><text x="${m.l - 6}" y="${y(v) + 4}" class="eje" text-anchor="end">${esc(formato(v))}</text>`;
  }
  datos.forEach((d, i) => {
    const h = Math.max(0, H - m.b - y(d.valor));
    svg += `<rect x="${m.l + i * bw + bw * 0.15}" y="${y(d.valor)}" width="${bw * 0.7}" height="${h}" rx="3" fill="${d.color || colorBase}"><title>${esc(d.etiqueta)}: ${esc(formato(d.valor))}</title></rect>`;
    svg += `<text x="${m.l + i * bw + bw / 2}" y="${H - 10}" class="eje" text-anchor="middle">${esc(String(d.etiqueta).slice(0, 12))}</text>`;
  });
  return svg + "</svg>";
}

/** Barras horizontales en HTML (mejor para etiquetas largas). */
export function barrasH(datos, { formato = (v) => v, max = null } = {}) {
  if (!datos.length) return `<p class="muted">—</p>`;
  const tope = max ?? Math.max(...datos.map((d) => d.valor), 1e-9);
  return `<div class="barrash">${datos.map((d, i) => `
    <div class="bh-fila"><span class="bh-et" title="${esc(d.etiqueta)}">${esc(d.etiqueta)}</span>
    <span class="bh-bar"><i style="width:${Math.max(1, (d.valor / tope) * 100).toFixed(1)}%;background:${d.color || colorSerie(i)}"></i></span>
    <span class="bh-v">${esc(formato(d.valor))}</span></div>`).join("")}</div>`;
}

/** Mapa de calor 7×24. matriz[dia][hora] = valor | null. */
export function mapaCalor(matriz, nombresDias, { formato = (v) => v } = {}) {
  const vals = matriz.flat().filter((v) => v != null);
  if (!vals.length) return vacio(200);
  const max = Math.max(...vals), min = Math.min(...vals);
  const W = 640, cw = (W - 40) / 24, ch = 22, H = 7 * ch + 22;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img">`;
  for (let h = 0; h < 24; h += 3) svg += `<text x="${40 + h * cw + cw / 2}" y="${H - 6}" class="eje" text-anchor="middle">${h}h</text>`;
  // Lunes primero: orden 1..6,0
  [1, 2, 3, 4, 5, 6, 0].forEach((d, fila) => {
    svg += `<text x="34" y="${fila * ch + 15}" class="eje" text-anchor="end">${esc(nombresDias[d])}</text>`;
    for (let h = 0; h < 24; h++) {
      const v = matriz[d][h];
      const k = v == null ? 0 : (v - min) / (max - min || 1);
      const fill = v == null ? "var(--celda-vacia)" : `rgba(130,197,68,${(0.12 + 0.88 * k).toFixed(2)})`;
      svg += `<rect x="${40 + h * cw + 1}" y="${fila * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="3" fill="${fill}"><title>${esc(nombresDias[d])} ${h}:00 — ${v == null ? "s/d" : esc(formato(v))}</title></rect>`;
    }
  });
  return svg + "</svg>";
}

/** Dona. datos: [{etiqueta, valor, color?}] */
export function dona(datos, { formato = (v) => v, centro = "" } = {}) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (!total) return vacio(180);
  const R = 70, r = 44, cx = 90, cy = 90;
  let ang = -Math.PI / 2, svg = `<div class="dona"><svg viewBox="0 0 180 180" class="graf-dona" role="img">`;
  datos.forEach((d, i) => {
    const a = (d.valor / total) * Math.PI * 2;
    const large = a > Math.PI ? 1 : 0;
    const p = (rad, rr) => `${cx + rr * Math.cos(rad)},${cy + rr * Math.sin(rad)}`;
    const fin = ang + Math.min(a, Math.PI * 2 - 1e-4);
    svg += `<path d="M${p(ang, R)} A${R},${R} 0 ${large} 1 ${p(fin, R)} L${p(fin, r)} A${r},${r} 0 ${large} 0 ${p(ang, r)}Z" fill="${d.color || colorSerie(i)}"><title>${esc(d.etiqueta)}: ${esc(formato(d.valor))}</title></path>`;
    ang += a;
  });
  svg += `<text x="90" y="96" text-anchor="middle" class="dona-centro">${esc(centro)}</text></svg>`;
  return svg + `<div class="leyenda vertical">${datos.map((d, i) => `<span><i style="background:${d.color || colorSerie(i)}"></i>${esc(d.etiqueta)} · ${esc(formato(d.valor))}</span>`).join("")}</div></div>`;
}

/** Mini línea para tarjetas KPI. */
export function sparkline(valores, color = "#82C544") {
  if (!valores?.length) return "";
  const W = 120, H = 32, max = Math.max(...valores), min = Math.min(...valores);
  const pts = valores.map((v, i) => `${((i / Math.max(1, valores.length - 1)) * W).toFixed(1)},${(H - 2 - ((v - min) / (max - min || 1)) * (H - 4)).toFixed(1)}`);
  return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none"><polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}

/** Embudo horizontal. etapas: [{etiqueta, valor}] */
export function embudo(etapas, { formato = (v) => v } = {}) {
  const max = Math.max(...etapas.map((e) => e.valor), 1);
  return `<div class="embudo">${etapas.map((e, i) => `<div class="emb-fila"><span class="emb-et">${esc(e.etiqueta)}</span><span class="emb-bar" style="width:${Math.max(4, (e.valor / max) * 100)}%;background:${colorSerie(i)}">${esc(formato(e.valor))}</span></div>`).join("")}</div>`;
}

function vacio(alto) {
  return `<div class="graf-vacio" style="height:${alto}px">—</div>`;
}

export { esc };
