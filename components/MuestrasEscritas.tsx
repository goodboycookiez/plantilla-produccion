"use client";

import { useState } from "react";
import { leerMuestras } from "@/lib/anotar";

/**
 * Muestras agendadas escribiendo. El nombre de a quién se le manda es libre:
 * no sale de la base de clientes, porque casi siempre es alguien nuevo.
 */
export default function MuestrasEscritas({
  accion,
  sabores,
  gramajes,
  dias,
}: {
  accion: (formData: FormData) => Promise<void>;
  sabores: string[];
  gramajes: string[];
  dias: { valor: string; texto: string }[];
}) {
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadas, setGuardadas] = useState(0);

  const leidas = leerMuestras(texto, sabores);
  const buenas = leidas.filter((m) => !m.falta && m.cantidad);

  // Una muestra es para una persona, aunque lleve varios sabores.
  // Se muestra como un pedido: el nombre una vez, con sus sabores debajo.
  const porProspecto: { prospecto: string; notas: string; lineas: typeof leidas }[] = [];
  for (const m of leidas) {
    const ya = porProspecto.find((g) => g.prospecto === m.prospecto);
    if (ya) {
      ya.lineas.push(m);
      if (m.notas && !ya.notas) ya.notas = m.notas;
    } else {
      porProspecto.push({ prospecto: m.prospecto, notas: m.notas, lineas: [m] });
    }
  }

  const listos = porProspecto.filter((g) => g.lineas.some((m) => !m.falta && m.cantidad)).length;

  return (
    <form
      action={async (fd) => {
        if (guardando) return;
        setGuardando(true);
        try {
          await accion(fd);
          setGuardadas(listos);
          setTexto("");
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="me-dia" className="font-semibold">
          Día
        </label>
        <select id="me-dia" name="fecha" className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2">
          {dias.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.texto}
            </option>
          ))}
        </select>
        <label htmlFor="me-gramaje" className="font-semibold">
          Gramaje si no se escribe
        </label>
        <select
          id="me-gramaje"
          name="gramaje"
          defaultValue="90g"
          className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2"
        >
          {gramajes.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="texto"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setGuardadas(0);
        }}
        rows={5}
        aria-label="Muestras, una por línea"
        placeholder={
          "Hotel Ejemplo: Chocolate 6, Avena 4 // la llevamos el martes\nCafé nuevo del centro: Vainilla 90g 6, Avena 70g 4"
        }
        className="w-full rounded-2xl border-2 border-panel-200 bg-white px-4 py-3 text-lg outline-none placeholder:text-panel-300 focus:border-panel-500"
      />

      {porProspecto.length > 0 && (
        <ul className="space-y-2">
          {porProspecto.map((g, i) => (
            <li
              key={i}
              className={`rounded-2xl border-2 px-4 py-3 ${
                g.lineas.every((m) => m.falta)
                  ? "border-red-200 bg-red-50"
                  : "border-amber-300 bg-white"
              }`}
            >
              <p className="font-bold">
                {g.prospecto || "¿para quién?"}{" "}
                <span className="ml-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                  muestra
                </span>
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {g.lineas.map((m, k) => (
                  <li
                    key={k}
                    className={`rounded-lg px-2.5 py-1 text-sm ${
                      m.falta ? "bg-red-100 text-red-800" : "border border-amber-300 bg-amber-50"
                    }`}
                  >
                    {m.falta ? (
                      m.falta
                    ) : (
                      <>
                        <strong className="text-panel-700">{m.cantidad}</strong> {m.nombre}
                        {m.gramaje && <span className="text-panel-500"> {m.gramaje}</span>}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {g.notas && (
                <p className="mt-1.5 text-sm text-panel-700">
                  <span className="font-semibold">Nota:</span> {g.notas}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={listos === 0 || guardando}
          className="rounded-xl bg-panel-700 px-5 py-2.5 font-semibold text-white hover:bg-panel-900 disabled:opacity-40"
        >
          {guardando
            ? "Guardando…"
            : `Agendar${listos > 1 ? ` ${listos} muestras` : " muestra"}`}
        </button>
        {guardadas > 0 && (
          <span className="font-semibold text-green-700">
            ✓ {guardadas} muestra{guardadas === 1 ? "" : "s"} agendada{guardadas === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </form>
  );
}
