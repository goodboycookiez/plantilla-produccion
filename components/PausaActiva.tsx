"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { marcarPausa } from "@/app/cocina/acciones";
import { negocio } from "@/config/negocio";

const { hora: HORA, minutos: MINUTOS } = negocio.pausaActiva;

/** Fecha, minuto del día y si es hábil, en la hora del negocio (sin depender del reloj del equipo). */
function ahoraLocal() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: negocio.produccion.zonaHoraria,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    minuto: (Number(p.hour) % 24) * 60 + Number(p.minute),
    habil: p.weekday !== "Sat" && p.weekday !== "Sun",
  };
}

/** Tres campanadas suaves; si el navegador no deja sonar, no pasa nada. */
function sonar() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.25, ctx.currentTime + t);
      vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.connect(vol).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
}

const llave = (fecha: string) => `pausa-activa-inicio-${fecha}`;

function leerInicio(fecha: string): number | null {
  try {
    const v = Number(localStorage.getItem(llave(fecha)));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * De lunes a viernes a la hora de la pausa (config/negocio.ts) tapa el panel con la pausa activa: el video,
 * 10 minutos de cuenta regresiva y, al final, cada una marca que la hizo.
 * Mientras nadie la marque, el panel no se puede usar (salvo Programar y Clientes).
 */
export default function PausaActiva({
  hoy,
  hechas,
  videoId,
  equipo,
}: {
  hoy: string;
  hechas: string[];
  videoId: string | null;
  equipo: string[];
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [ahora, setAhora] = useState<ReturnType<typeof ahoraLocal> | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [cerrada, setCerrada] = useState("");
  const [enviando, setEnviando] = useState(false);
  const estabaActiva = useRef(false);

  // El reloj: cada segundo mientras corre la pausa, cada 15 s el resto del día.
  useEffect(() => {
    const tic = () => setAhora(ahoraLocal());
    tic();
    const id = setInterval(tic, inicio ? 1000 : 15000);
    return () => clearInterval(id);
  }, [inicio]);

  const fecha = ahora?.fecha ?? "";
  // Lo que mandó el servidor es de "hoy" suyo; si ya cambió el día, no sirve.
  const yaHecha = fecha === hoy && hechas.length > 0;
  const activa =
    !!ahora &&
    ahora.habil &&
    ahora.minuto >= HORA * 60 &&
    !yaHecha &&
    cerrada !== fecha &&
    // Programar y Clientes son de quien administra: ahí no se bloquea.
    !ruta.startsWith("/cocina/programar") &&
    !ruta.startsWith("/cocina/clientes");

  useEffect(() => {
    if (fecha) setInicio(leerInicio(fecha));
  }, [fecha]);

  // Al llegar las 12:00: sonido, título y datos frescos (quizá otra pantalla ya la marcó).
  useEffect(() => {
    if (activa && !estabaActiva.current) {
      sonar();
      router.refresh();
    }
    estabaActiva.current = activa;
    if (!activa) return;
    const titulo = document.title;
    document.title = "⏰ Pausa activa";
    document.body.style.overflow = "hidden";
    // Si la marcan desde otra pantalla, esta se entera en menos de un minuto.
    const id = setInterval(() => router.refresh(), 60000);
    return () => {
      document.title = titulo;
      document.body.style.overflow = "";
      clearInterval(id);
    };
  }, [activa, router]);

  if (!activa || !ahora) return null;

  const empezar = () => {
    const t = Date.now();
    try {
      localStorage.setItem(llave(fecha), String(t));
    } catch {}
    setInicio(t);
  };

  const faltan = inicio ? Math.max(0, MINUTOS * 60 - Math.floor((Date.now() - inicio) / 1000)) : MINUTOS * 60;
  const terminada = inicio !== null && faltan === 0;
  const reloj = `${Math.floor(faltan / 60)}:${String(faltan % 60).padStart(2, "0")}`;
  const alternar = (p: string) =>
    setMarcadas((m) => (m.includes(p) ? m.filter((x) => x !== p) : [...m, p]));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pausa-titulo"
      className="fixed inset-0 z-50 overflow-y-auto bg-panel-900/80 px-4 py-6 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-2xl rounded-3xl border-2 border-panel-200 bg-white p-5 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-wide text-panel-500">
          Pausa de las 12:00 · {MINUTOS} minutos para nosotras
        </p>
        <h2 id="pausa-titulo" className="titulo mt-1 text-3xl sm:text-4xl">
          ¡Pausa activa! 🧘‍♀️
        </h2>

        {!inicio ? (
          <>
            <p className="mt-3 text-lg text-panel-700">
              Dejen lo que están haciendo, lávense las manos si hace falta y sigan el video juntas.
              Al terminar, cada una marca que la hizo.
            </p>
            <button
              type="button"
              onClick={empezar}
              className="mt-5 w-full rounded-2xl bg-panel-700 px-6 py-4 text-xl font-bold text-white hover:bg-panel-900"
            >
              ▶ Empezar la pausa
            </button>
          </>
        ) : (
          <>
            {videoId ? (
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-panel-900">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                  title="Video de la pausa activa"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-claro px-4 py-3 text-panel-700">
                Todavía no hay video. Hagan estiramientos de cuello, hombros, muñecas y espalda; el video
                se pone en Programar → Limpieza y rutina.
              </p>
            )}

            {!terminada ? (
              <p className="mt-5 text-center text-lg text-panel-700">
                Faltan <span className="text-3xl font-bold tabular-nums text-panel-900">{reloj}</span> para
                poder marcar
              </p>
            ) : (
              <form
                action={async (fd) => {
                  setEnviando(true);
                  await marcarPausa(fd);
                  setCerrada(fecha);
                  setEnviando(false);
                  router.refresh();
                }}
                className="mt-5"
              >
                <input type="hidden" name="fecha" value={fecha} />
                <p className="mb-2 text-lg font-bold">¿Quiénes la hicieron?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {equipo.map((p) => (
                    <label
                      key={p}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-panel-200 px-3 py-3 text-lg font-semibold text-panel-700 has-[:checked]:border-panel-700 has-[:checked]:bg-panel-700 has-[:checked]:text-white"
                    >
                      <input
                        type="checkbox"
                        name="quien"
                        value={p}
                        checked={marcadas.includes(p)}
                        onChange={() => alternar(p)}
                        className="sr-only"
                      />
                      {marcadas.includes(p) ? "✓ " : ""}
                      {p}
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={marcadas.length === 0 || enviando}
                  className="mt-4 w-full rounded-2xl bg-panel-700 px-6 py-4 text-xl font-bold text-white hover:bg-panel-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {enviando ? "Guardando…" : "✓ Listo, volver al trabajo"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
