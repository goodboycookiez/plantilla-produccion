"use client";

import { useState } from "react";
import { leerTexto } from "@/lib/anotar";

/**
 * Cuadro para escribir a mano, una línea por masa ("Chocolate 70g 150").
 * Debajo muestra lo que entendió, para corregir antes de guardar.
 */
export default function AnotarLibre({
  accion,
  conocidos,
  equipo,
  ocultos = {},
  pregunta,
  ejemplo,
  boton,
  children,
}: {
  accion: (formData: FormData) => Promise<void>;
  /** Masas y rellenos conocidos, para ajustar lo escrito. */
  conocidos: string[];
  equipo: string[];
  /** Campos fijos que viajan con el formulario (el día, por ejemplo). */
  ocultos?: Record<string, string>;
  pregunta: string;
  ejemplo: string;
  boton: string;
  /** Campos extra dentro del formulario, arriba del cuadro (el día del conteo, por ejemplo). */
  children?: React.ReactNode;
}) {
  const [texto, setTexto] = useState("");
  const [guardado, setGuardado] = useState(0);
  // Mientras guarda, el botón queda bloqueado para no guardar dos veces.
  const [guardando, setGuardando] = useState(false);
  const lineas = leerTexto(texto, conocidos);
  const buenas = lineas.filter((l) => !l.falta);

  return (
    <form
      action={async (fd) => {
        if (guardando) return;
        setGuardando(true);
        try {
          await accion(fd);
          setGuardado(buenas.length);
          setTexto("");
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-3"
    >
      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      {children}

      <textarea
        name="texto"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setGuardado(0);
        }}
        rows={4}
        placeholder={ejemplo}
        aria-label={pregunta}
        className="w-full rounded-2xl border-2 border-panel-200 bg-white px-4 py-3 text-lg outline-none placeholder:text-panel-300 focus:border-panel-500"
      />

      {lineas.length > 0 && (
        <ul className="space-y-1.5">
          {lineas.map((l, i) => (
            <li
              key={i}
              className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 ${
                l.falta ? "bg-red-50 text-red-800" : "bg-panel-50"
              }`}
            >
              {l.falta ? (
                <>
                  <span className="font-semibold">“{l.texto}”</span>
                  <span className="text-sm">— {l.falta}</span>
                </>
              ) : (
                <>
                  <span className="text-sm text-panel-500">Entendí:</span>
                  <strong>{l.nombre}</strong>
                  {l.gramaje && (
                    <span className="rounded-full bg-panel-700 px-2 py-0.5 text-sm font-semibold text-white">
                      {l.gramaje}
                    </span>
                  )}
                  <span className="ml-auto text-xl font-bold tabular-nums">{l.cantidad}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          name="quien"
          required
          defaultValue=""
          aria-label="Quién"
          className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2.5"
        >
          <option value="" disabled>
            ¿Quién eres?
          </option>
          {equipo.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={buenas.length === 0 || guardando}
          className="ml-auto rounded-xl bg-panel-700 px-5 py-2.5 font-semibold text-white hover:bg-panel-900 disabled:opacity-40"
        >
          {guardando ? "Guardando…" : boton}
          {!guardando && buenas.length > 1 ? ` (${buenas.length})` : ""}
        </button>
      </div>

      {guardado > 0 && (
        <p className="font-semibold text-green-700">
          ✓ Guardado{guardado > 1 ? `: ${guardado} líneas` : ""}.
        </p>
      )}
    </form>
  );
}
