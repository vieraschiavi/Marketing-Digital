// © 2026 Martín Viera. Todos los derechos reservados.
//
// Generador del dataset de demostración. TODO es sintético y con semilla
// fija: marcas ficticias, posts inventados, menciones escritas por plantilla.
// El motor de análisis que corre encima es el real — es el mismo que analiza
// los CSV que el cliente importa de sus propias redes.
//
// Patrones inyectados a propósito (para que la demo tenga algo que descubrir
// y los tests puedan verificar que el motor lo descubre):
//   1. La marca propia publica mayormente entre 9 y 11 h, cuando su público
//      rinde más a las 13 y entre 19 y 21 h.
//   2. Sus Reels rinden ~1,6x los carruseles, pero publica más carruseles.
//   3. Un competidor crece rápido en TikTok en los últimos 60 días.
//   4. En los últimos 10 días hay un pico de menciones negativas por demoras
//      del delivery en una ciudad secundaria.
//   5. LinkedIn tiene frecuencia baja frente a la competencia.
//   6. Hay mensajes sin responder con más de 8 h de espera.

import { crearRng, hashTexto } from "./rng.js";
import { REDES, IDS_REDES, GEO, EDAD_POR_RED, INTERESES, INDUSTRIAS } from "./catalogo.js";

const COLORES_MARCA = ["#82C544", "#f2b441", "#2f74c0", "#e05c5c", "#9b6bd6", "#00c896"];
const DIA_MS = 86400000;

const ER_BASE = { instagram: 0.045, facebook: 0.02, tiktok: 0.062, x: 0.016, linkedin: 0.032, youtube: 0.041, pinterest: 0.013, threads: 0.034 };
const MULT_FORMATO = { reel: 1.6, carrusel: 1.0, imagen: 0.85, historia: 0.6, video: 1.3, short: 1.5, texto: 0.7, enlace: 0.6, documento: 1.3 };

/** Efecto de la hora y el día sobre el rendimiento (0.4 – 1.6). */
export function efectoHorario(red, dia, hora) {
  const g = (h, c, a) => Math.exp(-((h - c) ** 2) / (2 * a * a));
  const finde = dia === 0 || dia === 6;
  if (red === "linkedin") {
    const base = 0.45 + 0.9 * g(hora, 9, 1.4) + 0.6 * g(hora, 12.5, 1.2);
    return finde ? base * 0.45 : base;
  }
  const base = 0.45 + 0.55 * g(hora, 13, 1.3) + 1.0 * g(hora, 20, 1.6);
  return finde ? base * 1.12 : base;
}

function isoDia(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function textoPost(rng, industria, tema, red, hashtags) {
  const aperturas = ["¡Llegó", "Te contamos sobre", "Hoy hablamos de", "Nuevo:", "No te pierdas", "Así preparamos", "Lo que más pidieron:", "Detrás de escena:"];
  const cierres = ["¿Ya lo probaste?", "Contanos en comentarios 👇", "Link en la bio.", "Etiquetá a quien tiene que verlo.", "Te esperamos.", "Guardalo para después."];
  let t = `${rng.elegir(aperturas)} ${tema}. ${rng.elegir(cierres)}`;
  if (red !== "linkedin" && red !== "youtube") t += " " + hashtags.join(" ");
  return t.slice(0, REDES[red].limite);
}

const FRASES = {
  positivo: ["me encantó {t}, súper recomendable", "excelente atención con {t}, volvería", "lo mejor de la semana fue {t} 😍", "gracias por {t}, una genia la gente", "increíble {t}, 10 puntos"],
  neutro: ["¿alguien probó {t}?", "vi lo de {t}, ¿a qué hora abren?", "consulta sobre {t}: ¿hacen envíos?", "pasé por {t}, normal", "¿hasta cuándo es lo de {t}?"],
  negativo: ["pésimo {t}, el pedido llegó frío y tarde", "mala experiencia con {t}, nadie responde", "decepcionado con {t}, demora de una hora", "horrible {t}, no lo recomiendo", "malísimo el delivery, {t} un desastre"],
};

function audienciaCuenta(rng, red, paisBase) {
  const paises = {};
  const otros = Object.keys(GEO).filter((p) => p !== paisBase);
  paises[paisBase] = rng.entre(0.62, 0.78);
  const vecinos = [rng.elegir(otros), rng.elegir(otros)];
  let resto = 1 - paises[paisBase];
  vecinos.forEach((p, i) => {
    const s = i === 0 ? resto * rng.entre(0.4, 0.6) : resto * rng.entre(0.3, 0.5);
    paises[p] = (paises[p] || 0) + s;
  });
  resto = 1 - Object.values(paises).reduce((a, b) => a + b, 0);
  paises[rng.elegir(otros)] = (paises[rng.elegir(otros)] || 0) + Math.max(resto, 0);

  const ciudades = {};
  for (const [p, sp] of Object.entries(paises)) {
    const cs = GEO[p].ciudades;
    const tot = Object.values(cs).reduce((a, b) => a + b, 0);
    for (const [c, w] of Object.entries(cs)) ciudades[`${p}|${c}`] = sp * (w / tot) * rng.entre(0.7, 1.3);
  }
  const sc = Object.values(ciudades).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(ciudades)) ciudades[k] /= sc;

  const edad = EDAD_POR_RED[red].map((w) => w * rng.entre(0.8, 1.2));
  const se = edad.reduce((a, b) => a + b, 0);
  const m = rng.entre(0.42, 0.6);
  const intereses = {};
  INTERESES.forEach((i) => (intereses[i] = rng.entre(0.2, 1)));
  return { ciudades, edad: edad.map((w) => w / se), genero: [m, 1 - m - 0.02, 0.02], intereses };
}

function geoPost(rng, aud) {
  const claves = Object.keys(aud.ciudades);
  const elegidas = new Set();
  while (elegidas.size < Math.min(4, claves.length)) elegidas.add(rng.ponderado(aud.ciudades));
  const reparto = rng.reparto(elegidas.size, 1.5);
  const geo = {};
  [...elegidas].forEach((c, i) => (geo[c] = reparto[i]));
  return geo;
}

/**
 * Genera el dataset completo.
 * @param {{semilla?:number, industria?:string, dias?:number, fin?:string, paisBase?:string}} opts
 */
export function generarDemo(opts = {}) {
  const semilla = opts.semilla ?? 42;
  const industriaId = opts.industria in INDUSTRIAS ? opts.industria : "cafeteria";
  const ind = INDUSTRIAS[industriaId];
  const dias = opts.dias ?? 180;
  const paisBase = opts.paisBase in GEO ? opts.paisBase : "UY";
  const finMs = Date.parse((opts.fin ?? new Date().toISOString().slice(0, 10)) + "T00:00:00Z");
  const inicioMs = finMs - (dias - 1) * DIA_MS;
  const rng = crearRng(semilla + hashTexto(industriaId));

  const marcas = [ind.propia, ...ind.competidores].map((nombre, i) => ({
    id: `m${i}`,
    nombre,
    propia: i === 0,
    color: COLORES_MARCA[i % COLORES_MARCA.length],
    calidad: i === 0 ? 1 : rng.entre(0.8, 1.25),
  }));
  const crecedor = marcas[2].id; // patrón 3
  const ciudadesBase = Object.keys(GEO[paisBase].ciudades);
  const ciudadQueja = ciudadesBase[1]; // patrón 4

  const cuentas = [];
  const diario = [];
  const posts = [];
  let nPost = 0;

  for (const marca of marcas) {
    for (const red of IDS_REDES) {
      const presencia = marca.propia ? red !== "threads" || rng.next() < 0.5 : rng.next() < 0.72;
      if (!presencia) continue;
      const aud = audienciaCuenta(rng, red, paisBase);
      const seguidores0 = Math.round(rng.entre(2500, 48000) * (red === "instagram" ? 1.8 : red === "tiktok" ? 1.4 : red === "pinterest" ? 0.5 : 1));
      const cuenta = {
        id: `${marca.id}-${red}`,
        marca: marca.id,
        red,
        handle: "@" + marca.nombre.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, ""),
        audiencia: aud,
      };
      cuentas.push(cuenta);

      // Frecuencia semanal de publicación (patrón 5: LinkedIn propio bajo).
      let porSemana = rng.entre(2.5, 6);
      if (red === "linkedin") porSemana = marca.propia ? 0.8 : rng.entre(2.5, 4);
      if (red === "youtube") porSemana *= 0.4;

      let seguidores = seguidores0;
      const crecBase = rng.entre(0.0004, 0.0018);
      for (let d = 0; d < dias; d++) {
        const ms = inicioMs + d * DIA_MS;
        const fecha = new Date(ms);
        const dia = fecha.getUTCDay();
        let crec = crecBase;
        if (marca.id === crecedor && red === "tiktok" && d > dias - 60) crec = 0.0085;
        seguidores = Math.round(seguidores * (1 + crec + rng.normal(0, 0.0006)));

        let impresionesDia = Math.round(seguidores * rng.entre(0.05, 0.11));
        let interaccionesDia = Math.round(impresionesDia * ER_BASE[red] * 0.25);
        let clicsDia = Math.round(impresionesDia * 0.004);
        let publicacionesDia = 0;

        const nHoy = rng.next() < (porSemana / 7) % 1 ? Math.ceil(porSemana / 7) : Math.floor(porSemana / 7);
        for (let k = 0; k < nHoy; k++) {
          const formatos = REDES[red].formatos;
          let formato;
          if (marca.propia && red === "instagram") formato = rng.ponderado({ carrusel: 5, imagen: 3, reel: 1.5, historia: 1 }); // patrón 2
          else formato = rng.elegir(formatos);
          // Patrón 1: la marca propia publica temprano.
          const hora = marca.propia ? rng.ponderado({ 9: 4, 10: 4, 11: 3, 13: 1, 18: 1, 20: 1 }) * 1 : rng.ponderado({ 8: 1, 9: 1, 12: 2, 13: 3, 18: 2, 19: 3, 20: 3, 21: 2 }) * 1;
          const minuto = rng.entero(0, 59);
          const tema = rng.elegir(ind.temas);
          const hashtags = [];
          const nh = Math.min(REDES[red].hashtagsMax, rng.entero(1, 5));
          while (hashtags.length < nh) {
            const h = rng.elegir(ind.hashtags);
            if (!hashtags.includes(h)) hashtags.push(h);
          }
          const efecto = efectoHorario(red, dia, Number(hora));
          const er = ER_BASE[red] * MULT_FORMATO[formato] * efecto * marca.calidad * Math.exp(rng.normal(0, 0.25));
          const alcance = Math.round(seguidores * rng.entre(0.12, 0.35) * (formato === "reel" || formato === "short" ? 1.5 : 1) * Math.sqrt(efecto));
          const impresiones = Math.round(alcance * rng.entre(1.15, 1.6));
          const interacciones = Math.max(1, Math.round(alcance * er));
          const reparto = rng.reparto(4, 2);
          const clics = Math.round(alcance * rng.entre(0.003, 0.012) * (formato === "enlace" ? 3 : 1));
          const intereses = [rng.ponderado(aud.intereses), rng.ponderado(aud.intereses)];
          posts.push({
            id: `p${++nPost}`,
            marca: marca.id,
            red,
            fecha: `${isoDia(ms)}T${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00`,
            dia,
            hora: Number(hora),
            formato,
            tema,
            texto: textoPost(rng, ind, tema, red, hashtags),
            hashtags,
            alcance,
            impresiones,
            likes: Math.round(interacciones * (0.55 + reparto[0] * 0.3)),
            comentarios: Math.round(interacciones * reparto[1] * 0.25),
            compartidos: Math.round(interacciones * reparto[2] * 0.2),
            guardados: Math.round(interacciones * reparto[3] * 0.2),
            interacciones,
            clics,
            geo: geoPost(rng, aud),
            edad: aud.edad.map((w) => w * rng.entre(0.75, 1.25)),
            genero: aud.genero.slice(),
            intereses: [...new Set(intereses)],
          });
          impresionesDia += impresiones;
          interaccionesDia += interacciones;
          clicsDia += clics;
          publicacionesDia++;
        }
        diario.push({
          fecha: isoDia(ms), marca: marca.id, red, seguidores,
          impresiones: impresionesDia, interacciones: interaccionesDia, clics: clicsDia, publicaciones: publicacionesDia,
        });
      }
    }
  }
  // Normalizar el reparto por edad de cada post.
  for (const p of posts) {
    const s = p.edad.reduce((a, b) => a + b, 0);
    p.edad = p.edad.map((w) => w / s);
  }

  // ── Menciones / escucha social ────────────────────────────────────────
  const menciones = [];
  const nombres = ["Lu", "Martu", "Seba", "Caro", "Nico", "Vale", "Fede", "Juli", "Agus", "Pato", "Romi", "Diego", "Sofi", "Tomi", "Flor"];
  const redesMencion = ["instagram", "x", "facebook", "tiktok", "threads"];
  const totalMenciones = Math.round(dias * 9);
  for (let i = 0; i < totalMenciones; i++) {
    const d = rng.entero(0, dias - 1);
    const ms = inicioMs + d * DIA_MS;
    const marca = rng.ponderado(Object.fromEntries(marcas.map((m) => [m.id, m.propia ? 2.2 : 1])));
    const reciente = d >= dias - 10;
    let ciudad = rng.elegir(ciudadesBase);
    let sent = rng.ponderado({ positivo: 5, neutro: 4, negativo: 1.6 });
    let tema = rng.elegir(ind.temas);
    if (marca === "m0" && reciente && rng.next() < 0.45) { // patrón 4
      sent = "negativo"; tema = "delivery"; ciudad = ciudadQueja;
    }
    const red = rng.elegir(redesMencion);
    const nombre = marcas.find((m) => m.id === marca).nombre;
    const texto = rng.elegir(FRASES[sent]).replace("{t}", rng.next() < 0.5 ? `${nombre} (${tema})` : tema) + (rng.next() < 0.4 ? " " + rng.elegir(ind.hashtags) : "");
    const tipo = rng.ponderado({ mencion: 6, comentario: 3, dm: 1.5 });
    const requiere = marca === "m0" && (tipo === "dm" || sent !== "positivo" || texto.includes("?"));
    const horaMs = ms + rng.entero(8, 23) * 3600000 + rng.entero(0, 59) * 60000;
    const antiguedadH = (finMs + DIA_MS - horaMs) / 3600000;
    const respondida = requiere ? (antiguedadH > 30 ? rng.next() < 0.93 : rng.next() < 0.45) : false;
    menciones.push({
      id: `n${i + 1}`,
      fecha: new Date(horaMs).toISOString().slice(0, 19),
      red, tipo, marca,
      autor: "@" + rng.elegir(nombres).toLowerCase() + rng.entero(1, 999),
      texto,
      tema,
      sentimientoOrigen: sent,
      alcance: Math.round(Math.exp(rng.normal(6, 1.2))),
      pais: paisBase,
      ciudad: `${paisBase}|${ciudad}`,
      requiereRespuesta: requiere,
      respondida,
      minutosRespuesta: respondida ? Math.round(Math.exp(rng.normal(4.6, 0.8))) : null,
    });
  }
  menciones.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // ── Tendencias de hashtags por país (últimos 30 días) ────────────────
  const tendencias = [];
  for (const pais of Object.keys(GEO)) {
    for (const h of ind.hashtags) {
      const base = rng.entre(200, 5000) * (pais === paisBase ? 1.6 : 1);
      const pendiente = rng.normal(0, 0.012) + (h === ind.hashtags[6] && pais === paisBase ? 0.035 : 0);
      const serie = Array.from({ length: 30 }, (_, i) => Math.max(10, Math.round(base * Math.exp(pendiente * i) * (1 + rng.normal(0, 0.08)))));
      tendencias.push({ hashtag: h, pais, serie });
    }
  }

  return {
    meta: { sintetico: true, semilla, industria: industriaId, industriaNombre: ind.nombre, dias, inicio: isoDia(inicioMs), fin: isoDia(finMs), paisBase },
    marcas: marcas.map(({ calidad, ...m }) => m),
    cuentas, diario, posts, menciones, tendencias,
  };
}
