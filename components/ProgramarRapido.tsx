"use client";

import { useState } from "react";
import { leerPlanSemanal } from "@/lib/anotar";

/**
 * Programar escribiendo. Sirve para un día suelto o para planear la semana
 * entera de corrido, anunciando cada día por su nombre:
 *
 *   LUNES
 *   avena 50g 1 triple persona 2
 *   MARTES
 *   vainilla 70g 1 triple persona 1
 *
 * Debajo se ve, día por día, lo que entendió antes de guardar.
 */
export default function ProgramarRapido({
  accion,
  dias,
  conocidos,
  equipo,
}: {
  accion: (formData: FormData) => Promise<void>;
  dias: { valor: string; texto: string }[];
  conocidos: string[];
  equipo: string[];
}) {
  const [texto, setTexto] = useState("");
  const [dia, setDia] = useState(dias[0]?.valor ?? "");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(0);

  const grupos = leerPlanSemanal(
    texto,
    dias.map((d) => d.valor),
    dia,
    conocidos,
    equipo,
  );
  const buenas = grupos.flatMap((g) => g.lineas).filter((l) => !l.falta).length;
  const nombreDia = (valor: string) => dias.find((d) => d.valor === valor)?.texto ?? valor;

  return (
    <form
      action={async (fd) => {
        if (guardando) return;
        setGuardando(true);
        try {
          await accion(fd);
          setGuardado(buenas);
          setTexto("");
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="rapido-dia" className="font-semibold">
          Día
        </label>
        <select
          id="rapido-dia"
          name="fecha"
          value={dia}
          onChange={(e) => setDia(e.target.value)}
          className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2"
        >
          {dias.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.texto}
            </option>
          ))}
        </select>
        <span className="text-sm text-panel-500">
          o escribe el día en el texto (LUNES, MARTES…) para planear varios
        </span>
      </div>

      <textarea
        name="texto"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setGuardado(0);
        }}
        rows={10}
        aria-label="Plan de la semana"
        placeholder={
          "LUNES\nAvena 70g 1 triple Persona 1\nBolear Chocolate\n\nMARTES\nVainilla 90g doble\nArequipe 15g 2 simples Persona 2"
        }
        className="w-full rounded-2xl border-2 border-panel-200 bg-white px-4 py-3 text-lg outline-none placeholder:text-panel-300 focus:border-panel-500"
      />

      {grupos.length > 0 && (
        <div className="space-y-3">
          {grupos.map((grupo, g) => (
            <div key={g}>
              <p className="mb-1.5 font-semibold text-panel-700">
                {nombreDia(grupo.fecha)}
                {!grupo.encabezado && (
                  <span className="ml-2 text-sm font-normal text-panel-500">
                    (el día que elegiste arriba)
                  </span>
                )}
              </p>
              <ul className="space-y-1.5">
                {grupo.lineas.map((l, i) => (
                  <li
                    key={i}
                    className={`flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 ${
                      l.falta ? "bg-red-50 text-red-800" : "bg-panel-50"
                    }`}
                  >
                    {l.falta ? (
                      <span>
                        “{l.texto}” — {l.falta}
                      </span>
                    ) : (
                      <>
                        <span className="text-sm text-panel-500">
                          {l.esActividad ? "Actividad:" : "Entendí:"}
                        </span>
                        <strong>{l.nombre}</strong>
                        {l.gramaje && (
                          <span className="rounded-full bg-panel-700 px-2 py-0.5 text-sm font-semibold text-white">
                            {l.gramaje}
                          </span>
                        )}
                        {l.lote && <span className="text-sm">{l.lote}</span>}
                        {l.esperado != null && <span className="text-sm">· {l.esperado} bolas</span>}
                        {l.encargada && (
                          <span className="ml-auto text-sm font-semibold">{l.encargada}</span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={buenas === 0 || guardando}
          className="rounded-xl bg-panel-700 px-5 py-2.5 font-semibold text-white hover:bg-panel-900 disabled:opacity-40"
        >
          {guardando ? "Guardando…" : `Programar${buenas > 1 ? ` (${buenas})` : ""}`}
        </button>
        {guardado > 0 && (
          <span className="font-semibold text-green-700">
            ✓ {guardado} tarea{guardado === 1 ? "" : "s"} programada{guardado === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </form>
  );
}
