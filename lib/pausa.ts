import { negocio } from "@/config/negocio";
import listas from "@/data/listas.json";
import { crearRutina, guardarAjuste, leerAjuste, listarRegistrosRutina, listarRutinas } from "./db";
import { esHabil, hoyLocal } from "./fechas";
import type { RegistroRutina } from "./tipos";

/**
 * Pausa activa: de lunes a viernes, a la hora de config/negocio.ts, el panel de la cocina se
 * detiene unos minutos con un video de YouTube, y cada una marca que la hizo.
 *
 * Por dentro es una rutina más (categoría "pausa", siempre con este id), así
 * cada marca queda en registros_rutina con quién y a qué hora, sin tablas
 * nuevas en Supabase.
 */
export const ID_PAUSA = "00000000-0000-4000-8000-0000000000a1";
export const HORA_PAUSA = negocio.pausaActiva.hora;
export const MINUTOS_PAUSA = negocio.pausaActiva.minutos;
/** Desde aquí cuenta la cronología: antes no existía la pausa y no es una falta. */
export const INICIO_PAUSAS = negocio.pausaActiva.inicio;

type AjustesPausa = { video: string };

/** El de config/negocio.ts; si se guarda otro en Programar, manda ese. */
const VIDEO_PREDETERMINADO = negocio.pausaActiva.video;

export async function obtenerVideoPausa(): Promise<string> {
  return (await leerAjuste<AjustesPausa>("pausa_activa"))?.video || VIDEO_PREDETERMINADO;
}

export async function cambiarVideoPausa(video: string): Promise<void> {
  await guardarAjuste<AjustesPausa>("pausa_activa", { video });
}

/** El id de un video a partir de cualquier link de YouTube (watch, youtu.be, shorts, embed, live). */
export function idDeYoutube(url: string): string | null {
  const m = url
    .trim()
    .match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Crea la rutina de la pausa la primera vez que alguien la marca. */
export async function asegurarRutinaPausa(): Promise<void> {
  if ((await listarRutinas()).some((r) => r.id === ID_PAUSA)) return;
  await crearRutina({
    id: ID_PAUSA,
    creadoEn: new Date().toISOString(),
    nombre: `Pausa activa (${HORA_PAUSA}:00)`,
    categoria: "pausa",
    dias: [1, 2, 3, 4, 5],
    encargada: "",
    notas: `${MINUTOS_PAUSA} minutos con el video`,
    orden: 0,
  });
}

export async function pausasEntre(desde: string, hasta: string): Promise<RegistroRutina[]> {
  return (await listarRegistrosRutina(desde, hasta)).filter((r) => r.rutinaId === ID_PAUSA);
}

/** Lo que necesita el aviso: quiénes ya la hicieron hoy y qué video poner. */
export async function estadoPausaHoy() {
  if (!negocio.pausaActiva.activa) return null;
  const hoy = hoyLocal();
  try {
    const [hechas, video] = await Promise.all([
      esHabil(hoy) ? pausasEntre(hoy, hoy) : Promise.resolve([]),
      obtenerVideoPausa(),
    ]);
    return {
      hoy,
      hechas: [...new Set(hechas.map((r) => r.hechoPor))],
      videoId: idDeYoutube(video),
      equipo: listas.equipo,
    };
  } catch {
    // Sin las tablas de la rutina el aviso no se muestra (el resto del panel sigue).
    return null;
  }
}
