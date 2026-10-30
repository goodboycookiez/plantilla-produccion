import listas from "@/data/listas.json";
import { fechaCorta } from "@/lib/fechas";
import { Agarradera } from "@/components/ListaOrdenable";
import { agregarNotaTarea, eliminarTarea, marcarTarea, moverTarea, moverTareaCocina } from "@/app/cocina/acciones";
import type { Tarea } from "@/lib/tipos";

const COLOR_TIPO: Record<string, string> = {
  masa: "bg-amber-100 text-amber-900",
  relleno: "bg-panel-100 text-panel-700",
  topping: "bg-pink-100 text-pink-900",
  actividad: "bg-suave text-panel-900/70",
};

const control = "rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm";
const botonSecundario =
  "rounded-lg border-2 border-panel-300 px-3 py-1.5 text-sm font-semibold text-panel-700 hover:border-panel-700 disabled:opacity-30";

/**
 * Una tarea de preproducción.
 * - modo "cocina": lo que ve el equipo; solo se marca como hecha y se firma.
 * - modo "programar": para quien programa; se ordena, se mueve de día o se borra.
 */
export default function TareaPre({
  tarea,
  modo,
  dias = [],
  diasPendiente = [],
  ordenable = false,
}: {
  tarea: Tarea;
  modo: "cocina" | "programar";
  dias?: string[];
  /** Si se puede arrastrar para cambiar el orden del día. */
  ordenable?: boolean;
  /** Días a los que la cocina puede mover la tarea. */
  diasPendiente?: { valor: string; texto: string }[];
}) {
  // Masas, rellenos y toppings se cuentan; las actividades no.
  const pideCantidad = tarea.tipo !== "actividad";
  const diferencia =
    tarea.cantidadReal != null && tarea.esperado != null
      ? tarea.cantidadReal - tarea.esperado
      : null;

  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        tarea.hecho ? "border-panel-100 bg-panel-50" : "border-panel-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Se arrastra para acomodar el orden del día: lo primero que se hace, arriba. */}
        {ordenable && <Agarradera etiqueta={tarea.nombre} />}

        <div className={`min-w-0 flex-1 ${tarea.hecho ? "opacity-70" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm font-semibold capitalize ${COLOR_TIPO[tarea.tipo]}`}
            >
              {tarea.tipo}
            </span>
            <p className={`text-lg font-bold ${tarea.hecho ? "line-through decoration-panel-500" : ""}`}>
              {tarea.nombre}
            </p>
            {!tarea.hecho && /⏩ (Pendiente del|Del) |📝 /.test(tarea.notas) && (
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-sm font-bold text-amber-950">
                ⏩ Tiene nota
              </span>
            )}
            {tarea.gramaje && (
              <span className="rounded-full bg-panel-700 px-2.5 py-0.5 text-sm font-semibold text-white">
                {tarea.gramaje}
              </span>
            )}
          </div>

          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-base">
            {tarea.lote && <Dato titulo="Hacer" valor={tarea.lote} />}
            {tarea.esperado != null && <Dato titulo="Bolas" valor={String(tarea.esperado)} />}
            {tarea.encargada && <Dato titulo="Quién" valor={tarea.encargada} />}
            {tarea.horario && <Dato titulo="Hora" valor={tarea.horario} />}
          </dl>

          {tarea.notas && (
            <p className="mt-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
              {tarea.notas}
            </p>
          )}

          {tarea.hecho && (
            <p className="mt-2 font-semibold text-panel-700">
              ✓ Hecho por {tarea.hechoPor}
              {tarea.fechaHecho ? ` · ${fechaCorta(tarea.fechaHecho)}` : ""}
              {tarea.cantidadReal != null && (
                <>
                  {" "}
                  · salieron {tarea.cantidadReal}
                  {diferencia != null && diferencia !== 0 && (
                    <span className={diferencia > 0 ? "text-green-700" : "text-red-700"}>
                      {" "}
                      ({diferencia > 0 ? "+" : ""}
                      {diferencia})
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Lo que hace la cocina: firmar la tarea. */}
      {modo === "cocina" &&
        (tarea.hecho ? (
          <form action={marcarTarea} className="mt-3 flex justify-end">
            <input type="hidden" name="id" value={tarea.id} />
            <input type="hidden" name="deshacer" value="si" />
            <button type="submit" className={botonSecundario}>
              Deshacer
            </button>
          </form>
        ) : (
          <form
            action={marcarTarea}
            className="mt-3 min-w-0 rounded-2xl border-2 border-panel-300 bg-panel-50 p-3"
          >
            <input type="hidden" name="id" value={tarea.id} />
            <p className="mb-2 text-sm font-semibold text-panel-700">Cuando termines:</p>
            <div className="flex flex-wrap items-end gap-3">
              {/* Lo que salió de verdad (con la merma, 153 en vez de 150) es lo que entra al stock. */}
              {pideCantidad && (
                <label className="flex w-full flex-col gap-1 sm:w-auto">
                  <span className="font-bold">¿Cuántas salieron de verdad?</span>
                  <input
                    type="number"
                    name="cantidadReal"
                    min={0}
                    required
                    inputMode="numeric"
                    placeholder={tarea.esperado != null ? `programadas ${tarea.esperado}` : "cuántas"}
                    aria-label={`Cuántas salieron de ${tarea.nombre}`}
                    className="w-full rounded-xl border-2 border-panel-700 bg-white px-3 py-2 text-2xl font-bold placeholder:text-base placeholder:font-normal sm:w-44"
                  />
                </label>
              )}
              <label className="flex w-full flex-col gap-1 sm:w-auto">
                <span className="font-bold">¿Quién lo hizo?</span>
                <select
                  name="hechoPor"
                  required
                  defaultValue={tarea.encargada || ""}
                  aria-label={`Quién hizo ${tarea.nombre}`}
                  className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2.5"
                >
                  <option value="" disabled>
                    Elegir…
                  </option>
                  {listas.equipo.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="otra">Otra persona…</option>
                </select>
              </label>
              <input
                type="text"
                name="otra"
                placeholder="Nombre (si es otra)"
                aria-label="Otra persona"
                className={`${control} w-full py-2.5 sm:w-40`}
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-panel-700 px-6 py-3 text-lg font-semibold text-white hover:bg-panel-900 sm:ml-auto sm:w-auto"
              >
                ✓ Listo
              </button>
            </div>
          </form>
        ))}

      {/* Mover a otro día; la nota es opcional, para quien la haga ese día. */}
      {modo === "cocina" && !tarea.hecho && diasPendiente.length > 0 && (
        <form action={moverTareaCocina} className="mt-2 space-y-2">
          <input type="hidden" name="id" value={tarea.id} />
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`mover-cocina-${tarea.id}`} className="text-sm font-semibold text-panel-700">
              Mover a
            </label>
            <select
              id={`mover-cocina-${tarea.id}`}
              name="fecha"
              className="rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm"
            >
              {diasPendiente
                .filter((d) => d.valor !== tarea.fecha)
                .map((d) => (
                  <option key={d.valor} value={d.valor}>
                    {d.texto}
                  </option>
                ))}
            </select>
            <button type="submit" className={botonSecundario}>
              Mover
            </button>
          </div>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-panel-500">+ Agregar nota</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                name="nota"
                placeholder="Ej: la masa está hecha, falta bolearla"
                className="min-w-[220px] flex-1 rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm"
              />
              <select name="quien" defaultValue="" className="rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm">
                <option value="">¿Quién?</option>
                {listas.equipo.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {/* La nota se puede dejar en el mismo día, sin mover la tarea. */}
              <button type="submit" formAction={agregarNotaTarea} className={botonSecundario}>
                Guardar nota (sin mover)
              </button>
            </div>
            <p className="mt-1 text-xs text-panel-500">
              Si además eliges otro día y tocas Mover, la tarea se va con la nota.
            </p>
          </details>
        </form>
      )}

      {/* Lo que hace quien programa: mover o borrar. */}
      {modo === "programar" && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-panel-100 pt-3">
          <form action={moverTarea} className="flex items-center gap-2">
            <input type="hidden" name="id" value={tarea.id} />
            <label className="text-sm text-panel-700" htmlFor={`mover-${tarea.id}`}>
              Pasar al
            </label>
            <select id={`mover-${tarea.id}`} name="fecha" defaultValue={tarea.fecha} className={control}>
              {dias.map((d) => (
                <option key={d} value={d}>
                  {fechaCorta(d)}
                </option>
              ))}
            </select>
            <button type="submit" className={botonSecundario}>
              Mover
            </button>
          </form>
          <form action={eliminarTarea}>
            <input type="hidden" name="id" value={tarea.id} />
            <button type="submit" className="px-2 text-sm font-semibold text-red-700 underline">
              Borrar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-sm text-panel-500">{titulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}
