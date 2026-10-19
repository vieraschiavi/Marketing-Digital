// © 2026 Martín Viera. Todos los derechos reservados.
//
// Generador pseudoaleatorio con semilla (mulberry32). Todo lo sintético del
// producto sale de acá: con la misma semilla, los mismos números en la app de
// escritorio, en la demo web y en los tests. Sin semilla fija no hay forma de
// reproducir un "esto se vio raro" que reporte un cliente.

export function crearRng(semilla = 42) {
  let a = semilla >>> 0;
  const siguiente = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng = {
    next: siguiente,
    entre: (min, max) => min + siguiente() * (max - min),
    entero: (min, max) => Math.floor(min + siguiente() * (max - min + 1)),
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    // Normal estándar por Box-Muller: ruido realista en series diarias.
    normal: (media = 0, desvio = 1) => {
      const u = Math.max(siguiente(), 1e-12);
      const v = siguiente();
      return media + desvio * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    // Elige según pesos {clave: peso}.
    ponderado: (pesos) => {
      const claves = Object.keys(pesos);
      const total = claves.reduce((s, k) => s + pesos[k], 0);
      let r = siguiente() * total;
      for (const k of claves) {
        r -= pesos[k];
        if (r <= 0) return k;
      }
      return claves[claves.length - 1];
    },
    // Reparte 1.0 entre n partes (Dirichlet aproximado).
    reparto: (n, concentracion = 1) => {
      const xs = Array.from({ length: n }, () => (-Math.log(Math.max(siguiente(), 1e-12))) ** (1 / concentracion));
      const s = xs.reduce((a2, b) => a2 + b, 0);
      return xs.map((x) => x / s);
    },
  };
  return rng;
}

/** Hash estable de un string → entero (para derivar semillas por entidad). */
export function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
