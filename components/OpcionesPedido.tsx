import { fechaCorta } from "@/lib/fechas";
import listas from "@/data/listas.json";
import { agregarNotaPedido, ajustarCantidades, cambiarEstado, moverPedido } from "@/app/cocina/acciones";
import { GRAMAJES, gramajeDeItem } from "@/lib/gramaje";
import type { Pedido } from "@/lib/tipos";

export const NOMBRE_ESTADO: Record<string, string> = {
  recibido: "Recibido",
  en_produccion: "En producción",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const control =
  "rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm";
const botonControl =
  "rounded-lg border-2 border-panel-700 px-3 py-1.5 text-sm font-bold text-panel-700 hover:bg-panel-700 hover:text-white";

/** Mover de día y cambiar estado: se usan poco, van escondidos. */
export default function OpcionesPedido({
  pedido,
  diasParaMover = [],
  className = "",
  titulo = "Opciones",
}: {
  pedido: Pedido;
  diasParaMover?: string[];
  className?: string;
  titulo?: string;
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="flex cursor-pointer list-none items-center justify-end gap-1 px-3 py-2 text-sm font-bold text-panel-500 hover:text-panel-700 [&::-webkit-details-marker]:hidden">
        {titulo}
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 px-3 pb-3">
        {diasParaMover.length > 0 && (
          <MoverPedido pedido={pedido} diasParaMover={diasParaMover} />
        )}

        <form action={cambiarEstado} className="flex items-center gap-1.5">
          <input type="hidden" name="id" value={pedido.id} />
          <label
            className="text-sm text-panel-700"
            htmlFor={`estado-${pedido.id}`}
          >
            Estado
          </label>
          <select
            id={`estado-${pedido.id}`}
            name="estado"
            defaultValue={pedido.estado}
            className={control}
          >
            {Object.entries(NOMBRE_ESTADO).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
          <button type="submit" className={botonControl}>
            Guardar
          </button>
        </form>
      </div>
    </details>
  );
}

/** Pasar el pedido a otro día de producción; la entrega corre con él. */
export function MoverPedido({
  pedido,
  diasParaMover,
  etiqueta = "Producir el",
}: {
  pedido: Pedido;
  diasParaMover: string[];
  etiqueta?: string;
}) {
  return (
    <form action={moverPedido} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={pedido.id} />
      <label className="text-sm text-panel-700" htmlFor={`mover-${pedido.id}`}>
        {etiqueta}
      </label>
      <select
        id={`mover-${pedido.id}`}
        name="fechaProduccion"
        defaultValue={pedido.fechaProduccion}
        className={control}
      >
        {diasParaMover.map((d) => (
          <option key={d} value={d}>
            {fechaCorta(d)}
          </option>
        ))}
      </select>
      <button type="submit" className={botonControl}>
        Mover
      </button>
    </form>
  );
}

/** Corregir lo que salió cuando un pedido no se pudo completar. */
export function AjustarCantidades({ pedido }: { pedido: Pedido }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-xs font-bold text-panel-500 hover:text-panel-700 [&::-webkit-details-marker]:hidden">
        Ajustar cantidades o gramaje
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <form action={ajustarCantidades} className="mt-1 space-y-1.5 rounded-xl border-2 border-panel-200 bg-white p-2">
        <input type="hidden" name="id" value={pedido.id} />
        <p className="text-xs text-panel-500">¿Cuántas salieron de verdad y de qué gramaje?</p>
        {pedido.items.map((i, n) => (
          <div key={`${i.productoId}|${n}`} className="flex items-center justify-between gap-1.5 text-sm">
            <span className="min-w-0 flex-1">{i.nombre}</span>
            {i.unidad !== "kg" && (
              <select
                name={`gramaje-${n}`}
                defaultValue={gramajeDeItem(i, pedido)}
                aria-label={`Gramaje de ${i.nombre}`}
                className="rounded-lg border-2 border-panel-200 bg-white px-1 py-1 font-bold"
              >
                {[...new Set([...GRAMAJES, gramajeDeItem(i, pedido)])].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
            <input
              type="number"
              name={`cantidad-${n}`}
              min={0}
              defaultValue={i.cantidad}
              aria-label={`Cantidad real de ${i.nombre}`}
              className="w-16 rounded-lg border-2 border-panel-200 px-2 py-1 text-right font-bold"
            />
          </div>
        ))}
        <button type="submit" className={`${botonControl} w-full`}>
          Guardar
        </button>
      </form>
    </details>
  );
}

/** Una nota en el pedido para el equipo (como en preproducción). */
export function NotaPedido({ pedido }: { pedido: Pedido }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-1 py-1 text-xs font-bold text-panel-500 hover:text-panel-700 [&::-webkit-details-marker]:hidden">
        + Agregar nota
        <span className="transition group-open:rotate-180">▾</span>
      </summary>
      <form action={agregarNotaPedido} className="mt-1 space-y-1.5 rounded-xl border-2 border-panel-200 bg-white p-2">
        <input type="hidden" name="id" value={pedido.id} />
        <input
          name="nota"
          required
          placeholder="Ej: empacar en cajas de 4"
          aria-label={`Nota para el pedido de ${pedido.clienteNombre}`}
          className="w-full rounded-lg border-2 border-panel-200 px-2 py-1.5 text-sm"
        />
        <select
          name="quien"
          defaultValue=""
          aria-label="Quién deja la nota"
          className="w-full rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="">¿Quién?</option>
          {listas.equipo.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="submit" className={`${botonControl} w-full`}>
          Guardar nota
        </button>
      </form>
    </details>
  );
}
