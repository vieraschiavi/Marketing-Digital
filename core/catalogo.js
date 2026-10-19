// © 2026 Martín Viera. Todos los derechos reservados.
//
// Catálogo de dominio: redes, formatos, geografía, públicos e industrias.
// Es la única fuente de verdad de "qué existe" — los filtros de la UI, el
// generador de la demo, el importador de CSV y el asistente leen de acá.

export const REDES = {
  instagram: { nombre: "Instagram", color: "#E1306C", limite: 2200, hashtagsMax: 30, formatos: ["reel", "carrusel", "imagen", "historia"] },
  facebook: { nombre: "Facebook", color: "#1877F2", limite: 63206, hashtagsMax: 10, formatos: ["video", "imagen", "enlace", "texto"] },
  tiktok: { nombre: "TikTok", color: "#25F4EE", limite: 4000, hashtagsMax: 8, formatos: ["video", "carrusel"] },
  x: { nombre: "X", color: "#8899A6", limite: 280, hashtagsMax: 3, formatos: ["texto", "imagen", "video"] },
  linkedin: { nombre: "LinkedIn", color: "#0A66C2", limite: 3000, hashtagsMax: 5, formatos: ["texto", "documento", "imagen", "video"] },
  youtube: { nombre: "YouTube", color: "#FF0000", limite: 5000, hashtagsMax: 15, formatos: ["video", "short"] },
  pinterest: { nombre: "Pinterest", color: "#E60023", limite: 500, hashtagsMax: 20, formatos: ["imagen", "video"] },
  threads: { nombre: "Threads", color: "#B5B5B5", limite: 500, hashtagsMax: 1, formatos: ["texto", "imagen"] },
};

export const IDS_REDES = Object.keys(REDES);

export const FORMATOS = {
  reel: "Reel", carrusel: "Carrusel", imagen: "Imagen", historia: "Historia",
  video: "Video", enlace: "Enlace", texto: "Texto", documento: "Documento", short: "Short",
};

// Países y ciudades con peso poblacional relativo (para repartir audiencia).
export const GEO = {
  UY: { nombre: "Uruguay", moneda: "UYU", ciudades: { Montevideo: 5, Canelones: 2, Maldonado: 1.2, Salto: 0.8, Paysandú: 0.6 } },
  AR: { nombre: "Argentina", moneda: "ARS", ciudades: { "Buenos Aires": 6, Córdoba: 2, Rosario: 1.7, Mendoza: 1.2, "La Plata": 1 } },
  CL: { nombre: "Chile", moneda: "CLP", ciudades: { Santiago: 5, Valparaíso: 1.2, Concepción: 1, Antofagasta: 0.6 } },
  MX: { nombre: "México", moneda: "MXN", ciudades: { CDMX: 6, Guadalajara: 2.5, Monterrey: 2.4, Puebla: 1.2 } },
  CO: { nombre: "Colombia", moneda: "COP", ciudades: { Bogotá: 5, Medellín: 2.5, Cali: 1.8, Barranquilla: 1.1 } },
  PE: { nombre: "Perú", moneda: "PEN", ciudades: { Lima: 6, Arequipa: 1.1, Trujillo: 0.9 } },
  ES: { nombre: "España", moneda: "EUR", ciudades: { Madrid: 4, Barcelona: 3.5, Valencia: 1.4, Sevilla: 1.1 } },
  BR: { nombre: "Brasil", moneda: "BRL", ciudades: { "São Paulo": 6, "Rio de Janeiro": 4, "Porto Alegre": 1.4, Curitiba: 1.2 } },
};

export const EDADES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];
export const GENEROS = ["mujer", "hombre", "otro"];
export const INTERESES = ["gastronomía", "deporte", "tecnología", "moda", "viajes", "finanzas", "familia", "bienestar", "música", "educación"];

// Perfil de audiencia típico de cada red (peso por franja de edad).
export const EDAD_POR_RED = {
  instagram: [0.06, 0.3, 0.32, 0.18, 0.09, 0.05],
  facebook: [0.02, 0.12, 0.24, 0.24, 0.2, 0.18],
  tiktok: [0.18, 0.38, 0.24, 0.12, 0.05, 0.03],
  x: [0.04, 0.24, 0.32, 0.2, 0.12, 0.08],
  linkedin: [0, 0.16, 0.38, 0.26, 0.14, 0.06],
  youtube: [0.1, 0.24, 0.26, 0.18, 0.12, 0.1],
  pinterest: [0.05, 0.26, 0.3, 0.2, 0.12, 0.07],
  threads: [0.05, 0.32, 0.34, 0.17, 0.08, 0.04],
};

// Industrias de la demo. Cada una trae marcas 100 % ficticias: nunca se
// usa el nombre de una empresa real como "competidor" de demostración.
export const INDUSTRIAS = {
  cafeteria: {
    nombre: "Cafetería y gastronomía",
    propia: "Café Aurora",
    competidores: ["Brava Café", "Molienda Sur", "Tostado & Co", "Grano Norte", "La Taza Urbana"],
    temas: ["café de especialidad", "brunch", "promo 2x1", "nuevo local", "baristas", "delivery", "medialunas", "cold brew"],
    hashtags: ["#cafe", "#brunch", "#coffeelover", "#cafedeespecialidad", "#desayuno", "#barista", "#coldbrew", "#foodie", "#latteart", "#delivery"],
  },
  moda: {
    nombre: "Moda y retail",
    propia: "Lumen Moda",
    competidores: ["Hilo Fino", "Urbana Store", "Costura Viva", "Trama Sur", "Pliegue"],
    temas: ["nueva colección", "rebajas", "envío gratis", "lookbook", "sustentable", "talles inclusivos", "outlet", "influencers"],
    hashtags: ["#moda", "#ootd", "#estilo", "#nuevacoleccion", "#sale", "#modasustentable", "#outfit", "#tendencias", "#lookdeldia", "#shopping"],
  },
  fintech: {
    nombre: "Fintech y servicios financieros",
    propia: "Pulsar Pay",
    competidores: ["Cuota Fácil", "Vértice Finanzas", "Ahorro+", "Nube Cash", "Prisma Crédito"],
    temas: ["tarjeta sin costo", "préstamo online", "cashback", "seguridad", "educación financiera", "app nueva", "atención", "inversiones"],
    hashtags: ["#fintech", "#finanzaspersonales", "#ahorro", "#cashback", "#inversiones", "#educacionfinanciera", "#pagos", "#credito", "#app", "#dinero"],
  },
};

export const SEMAFORO = { verde: 85, amarillo: 70 };
