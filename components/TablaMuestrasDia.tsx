import {
  ajustarMuestraAgendada,
  eliminarMuestraCompleta,
  moverMuestra,
} from "@/app/cocina/acciones";
import { fechaCorta } from "@/lib/fechas";
import type { Muestra } from "@/lib/tipos";

export type GrupoMuestra = { prospecto: string; notas: string; items: Muestra[] };

/**
 * Las muestras del día con la misma tabla de los pedidos:
 * Cliente · Sabor · Gram · Cant · Notas, una fila por sabor.
 * Las cantidades y la nota se editan ahí mismo; en cero se quita el sabor.
 */
export default function TablaMuestrasDia({
  grupos,
  diasParaMover,
}: {
  grupos: GrupoMuestra[];
  diasParaMover: string[];
}) {
  const idDe = (g: GrupoMuestra) => `muestra-${g.items[0].id}`;
  const ids = (g: GrupoMuestra) => g.items.map((m) => m.id).join(",");

  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-amber-300 bg-white">
      {/* Los formularios van fuera de la tabla; los campos los llaman por su id. */}
      {grupos.map((g) => (
        <div key={g.items[0].id}>
          <form id={idDe(g)} action={ajustarMuestraAgendada}>
            <input type="hidden" name="ids" value={ids(g)} />
          </form>
          <form id={`${idDe(g)}-borrar`} action={eliminarMuestraCompleta}>
            <input type="hidden" name="ids" value={ids(g)} />
          </form>
          <form id={`${idDe(g)}-mover`} action={moverMuestra}>
            <input type="hidden" name="ids" value={ids(g)} />
          </form>
        </div>
      ))}

      <table className="w-full min-w-[560px] text-base">
        <thead>
          <tr className="bg-amber-600 text-left text-sm text-white">
            <th className="w-24 px-2 py-2.5 font-semibold">Muestra</th>
            <th className="px-3 py-2.5 font-semibold">Para quién</th>
            <th className="px-3 py-2.5 font-semibold">Sabor</th>
            <th className="px-3 py-2.5 font-semibold">Gram</th>
            <th className="px-3 py-2.5 text-right font-semibold">Cant</th>
            <th className="px-3 py-2.5 font-semibold">Notas</th>
          </tr>
        </thead>

        {grupos.map((g) => {
          const filas = g.items.length;
          return (
            <tbody key={g.items[0].id} className="border-t-2 border-amber-300">
              {g.items.map((m, n) => (
                <tr key={m.id} className={n > 0 ? "border-t border-amber-100" : ""}>
                  {n === 0 && (
                    <>
                      <td rowSpan={filas} className="px-2 py-2 align-top">
                        <span className="rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                          muestra
                        </span>
                      </td>
                      <td rowSpan={filas} className="px-3 py-2 align-top">
                        <p className="font-bold">{g.prospecto}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <label
                            htmlFor={`${idDe(g)}-dia`}
                            className="text-xs font-semibold text-panel-500"
                          >
                            Día
                          </label>
                          <select
                            id={`${idDe(g)}-dia`}
                            form={`${idDe(g)}-mover`}
                            name="fecha"
                            defaultValue={g.items[0].fecha}
                            aria-label={`Mover la muestra de ${g.prospecto} de día`}
                            className="rounded-lg border-2 border-amber-300 bg-white px-2 py-1 text-sm font-semibold"
                          >
                            {diasParaMover.map((d) => (
                              <option key={d} value={d}>
                                {fechaCorta(d)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            form={`${idDe(g)}-mover`}
                            className="rounded-lg border-2 border-amber-400 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-800"
                          >
                            Mover
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="submit"
                            form={idDe(g)}
                            className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-semibold text-white hover:bg-amber-700"
                          >
                            Guardar
                          </button>
                          <button
                            type="submit"
                            form={`${idDe(g)}-borrar`}
                            aria-label={`Eliminar la muestra de ${g.prospecto}`}
                            className="rounded-lg border-2 border-amber-400 px-3 py-1 text-sm font-semibold text-amber-800 hover:bg-red-100 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2">{m.nombre}</td>
                  <td className="px-3 py-2 text-sm">{m.gramaje}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      form={idDe(g)}
                      name={`cantidad-${m.id}`}
                      defaultValue={m.cantidad}
                      aria-label={`Cantidad de ${m.nombre} para ${g.prospecto}`}
                      className="w-16 rounded-lg border-2 border-amber-300 bg-white px-2 py-1 text-right text-lg font-bold tabular-nums"
                    />
                  </td>

                  {n === 0 && (
                    <td rowSpan={filas} className="max-w-[240px] px-3 py-2 align-top">
                      <input
                        form={idDe(g)}
                        name="notas"
                        defaultValue={g.notas}
                        placeholder="Nota de la muestra"
                        aria-label={`Nota de la muestra de ${g.prospecto}`}
                        className="w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900 placeholder:font-normal placeholder:text-amber-700/50"
                      />
                      <p className="mt-1 text-xs text-panel-500">
                        Cantidad en 0 para quitar ese sabor.
                      </p>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
