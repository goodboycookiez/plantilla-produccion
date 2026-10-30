import { fechaLarga } from "@/lib/fechas";
import OpcionesPedido, { NOMBRE_ESTADO } from "@/components/OpcionesPedido";
import { alternarListo } from "@/app/cocina/acciones";
import type { Pedido } from "@/lib/tipos";
import { gramajesDelPedido } from "@/lib/gramaje";



export default function FilaPedido({
  pedido,
  diasParaMover = [],
}: {
  pedido: Pedido;
  /** Días hábiles a los que se puede mover el pedido. */
  diasParaMover?: string[];
}) {
  const listo = pedido.estado === "listo" || pedido.estado === "entregado";
  const muestraEstado = pedido.estado !== "recibido" && pedido.estado !== "listo";

  return (
    <div
      className={`rounded-2xl border-2 transition-colors ${
        listo ? "border-panel-100 bg-panel-100/60" : "border-panel-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* El chulo */}
        <form action={alternarListo} className="shrink-0">
          <input type="hidden" name="id" value={pedido.id} />
          <input type="hidden" name="estado" value={pedido.estado} />
          <button
            type="submit"
            aria-label={listo ? `Desmarcar pedido ${pedido.consecutivo}` : `Marcar listo el pedido ${pedido.consecutivo}`}
            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xl font-bold transition ${
              listo
                ? "border-panel-700 bg-panel-700 text-white"
                : "border-panel-300 bg-white text-transparent hover:border-panel-700 hover:text-panel-300"
            }`}
          >
            ✓
          </button>
        </form>

        <div className={`min-w-0 flex-1 ${listo ? "opacity-55" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`text-lg font-bold ${listo ? "line-through decoration-panel-500" : ""}`}>
              {pedido.clienteNombre}
            </p>
            <span className="text-sm text-panel-500">#{pedido.consecutivo}</span>
            <span className="rounded-full bg-panel-700 px-2.5 py-0.5 text-sm font-bold text-white">
              {gramajesDelPedido(pedido)}
            </span>
            {pedido.esEvento && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-bold text-red-800">
                Evento
              </span>
            )}
            {muestraEstado && (
              <span className="rounded-full bg-panel-100 px-2.5 py-0.5 text-sm font-bold text-panel-700">
                {NOMBRE_ESTADO[pedido.estado]}
              </span>
            )}
          </div>

          <ul className="mt-2 flex flex-wrap gap-1.5 text-base">
            {pedido.items.map((i, n) => (
              <li
                key={`${i.productoId}|${n}`}
                className="flex items-baseline gap-1.5 rounded-lg border border-panel-200 bg-panel-50 px-2.5 py-1"
              >
                <span className="font-bold tabular-nums text-panel-700">
                  {i.cantidad}
                  {i.unidad === "kg" ? " kg" : ""}
                </span>
                <span>{i.nombre}</span>
                {i.gramaje && <span className="text-sm font-semibold text-panel-500">{i.gramaje}</span>}
              </li>
            ))}
          </ul>

          {pedido.notas && (
            <p className="mt-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900">
              {pedido.notas}
            </p>
          )}

          <p className="mt-2 text-sm text-panel-500">
            Entrega {fechaLarga(pedido.fechaEntrega)}
            {pedido.direccion ? ` · ${pedido.direccion}` : ""}
          </p>
        </div>
      </div>

      <OpcionesPedido pedido={pedido} diasParaMover={diasParaMover} className="border-t border-panel-100" />
    </div>
  );
}
