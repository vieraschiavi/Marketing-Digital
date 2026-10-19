// © 2026 Martín Viera. Todos los derechos reservados.
//
// Formato de números y fechas según el idioma activo (separador de miles,
// decimales consistentes, abreviaturas k / M).

const LOCALE = { es: "es-UY", en: "en-US", pt: "pt-BR" };

export function crearFormato(idioma = "es") {
  const loc = LOCALE[idioma] || "es-UY";
  const nf0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f = {
    entero: (v) => (v == null || Number.isNaN(v) ? "—" : nf0.format(Math.round(v))),
    dec: (v) => (v == null || Number.isNaN(v) ? "—" : nf1.format(v)),
    dec2: (v) => (v == null || Number.isNaN(v) ? "—" : nf2.format(v)),
    pct: (v) => (v == null || Number.isNaN(v) ? "—" : nf1.format(v) + " %"),
    delta: (v) => (v == null || Number.isNaN(v) ? "—" : (v > 0 ? "+" : "") + nf1.format(v) + " %"),
    signo: (v) => (v == null ? "—" : (v > 0 ? "+" : "") + nf0.format(Math.round(v))),
    corto: (v) => {
      if (v == null || Number.isNaN(v)) return "—";
      const a = Math.abs(v);
      if (a >= 1e9) return nf1.format(v / 1e9) + " B";
      if (a >= 1e6) return nf1.format(v / 1e6) + " M";
      if (a >= 1e4) return nf1.format(v / 1e3) + " k";
      return nf0.format(Math.round(v));
    },
    moneda: (v, m = "USD") => (v == null ? "—" : new Intl.NumberFormat(loc, { style: "currency", currency: m, maximumFractionDigits: v < 100 ? 2 : 0 }).format(v)),
    fecha: (iso) => (iso ? new Date(iso.length <= 10 ? iso + "T12:00:00Z" : iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleDateString(loc, { day: "2-digit", month: "short", timeZone: "UTC" }) : "—"),
    fechaLarga: (iso) => (iso ? new Date(iso.slice(0, 10) + "T12:00:00Z").toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—"),
    fechaHora: (iso) => (iso ? new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString(loc, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"),
  };
  return f;
}
