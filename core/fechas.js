// © 2026 Martín Viera. Todos los derechos reservados.
// "Hoy" en la hora LOCAL del usuario. toISOString() da la fecha UTC: en
// Uruguay (UTC−3), después de las 21 h ya sería "mañana".
const pad = (n) => String(n).padStart(2, "0");

export function hoyLocal(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ahoraLocal(d = new Date()) {
  return `${hoyLocal(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
