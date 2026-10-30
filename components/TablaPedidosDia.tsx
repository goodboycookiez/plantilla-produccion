import OpcionesPedido, {
  AjustarCantidades,
  MoverPedido,
  NotaPedido,
} from "@/components/OpcionesPedido";
import ListaOrdenable, { Agarradera } from "@/components/ListaOrdenable";
import { alternarListo, ordenarPedidosDelDia } from "@/app/cocina/acciones";
import type { Pedido } from "@/lib/tipos";
import { gramajeDeItem } from "@/lib/gramaje";

const estaListo = (p: Pedido) =>
  p.estado === "listo" || p.estado === "entregado";

/**
 * Los pedidos del día como en la hoja de cálculo de la cocina:
 * Cliente · Sabor · Gram · Cant · Notas, una fila por sabor.
 * El círculo de cada cliente se toca cuando su pedido está empacado.
 */
export default function TablaPedidosDia({
  pedidos,
  diasParaMover,
  fecha,
}: {
  pedidos: Pedido[];
  diasParaMover: string[];
  /** El día de producción: con esto se guarda el orden al arrastrar. */
  fecha: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-panel-200 bg-white">
      <ListaOrdenable
        como="table"
        className="w-full min-w-[560px] text-base"
        guardar={ordenarPedidosDelDia.bind(null, fecha)}
        cabecera={
          <thead>
            <tr className="bg-panel-700 text-left text-sm text-white">
              <th className="w-20 px-2 py-2.5" aria-label="Orden y empacado" />
              <th className="px-3 py-2.5 font-semibold">Cliente</th>
              <th className="px-3 py-2.5 font-semibold">Sabor</th>
              <th className="px-3 py-2.5 font-semibold">Gram</th>
              <th className="px-3 py-2.5 text-right font-semibold">Cant</th>
              <th className="px-3 py-2.5 font-semibold">Notas</th>
            </tr>
          </thead>
        }
        items={pedidos.map((p) => {
          const listo = estaListo(p);
          const filas = p.items.length || 1;
          // Cada pedido es su propio grupo de filas, separado del siguiente.
          const grupo = (
            <tbody
              key={p.id}
              data-orden-id={p.id}
              className={`border-t-2 border-panel-200 ${listo ? "bg-panel-50 text-panel-900/50" : ""}`}
            >
              {p.items.map((i, n) => (
                <tr
                  key={`${i.productoId}|${n}`}
                  className={n > 0 ? "border-t border-panel-100" : ""}
                >
                  {n === 0 && (
                    <>
                      <td rowSpan={filas} className="px-1 py-2 align-top">
                        <div className="flex items-start">
                          <Agarradera etiqueta={p.clienteNombre} />
                          <form action={alternarListo}>
                            <input type="hidden" name="id" value={p.id} />
                            <input
                              type="hidden"
                              name="estado"
                              value={p.estado}
                            />
                            <button
                              type="submit"
                              aria-label={
                                listo
                                  ? `Desmarcar ${p.clienteNombre}`
                                  : `Marcar empacado ${p.clienteNombre}`
                              }
                              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg font-bold transition ${
                                listo
                                  ? "border-panel-700 bg-panel-700 text-white"
                                  : "border-panel-300 bg-white text-transparent hover:border-panel-700 hover:text-panel-300"
                              }`}
                            >
                              ✓
                            </button>
                          </form>
                        </div>
                      </td>
                      <td rowSpan={filas} className="px-3 py-2 align-top">
                        <p
                          className={`font-bold ${listo ? "line-through" : ""}`}
                        >
                          {p.clienteNombre}
                        </p>
                        <p className="text-xs text-panel-500">
                          #{p.consecutivo}
                          {p.esEvento && (
                            <span className="ml-1 font-semibold text-red-700">
                              · Evento
                            </span>
                          )}
                        </p>
                        {/* Mover de día: siempre a la vista. */}
                        <div className="mt-2 [&_select]:py-1 [&_button]:py-1">
                          <MoverPedido
                            pedido={p}
                            diasParaMover={diasParaMover}
                            etiqueta="Día"
                          />
                        </div>
                        <AjustarCantidades pedido={p} />
                        <NotaPedido pedido={p} />
                        <OpcionesPedido
                          pedido={p}
                          className="-mx-3 text-left [&_summary]:justify-start [&_summary]:py-1 [&_summary]:text-xs"
                          titulo="Cambiar estado"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2">{i.nombre}</td>
                  <td className="px-3 py-2 text-sm">
                    {i.unidad === "kg" ? "kg" : gramajeDeItem(i, p)}
                  </td>
                  <td className="px-3 py-2 text-right text-lg font-bold tabular-nums">
                    {i.cantidad}
                  </td>
                  {n === 0 && (
                    <td
                      rowSpan={filas}
                      className="max-w-[220px] px-3 py-2 align-top text-sm"
                    >
                      {p.notas && (
                        <span className="block rounded-lg bg-amber-50 px-2 py-1 font-semibold text-amber-900">
                          {p.notas}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          );
          return { id: p.id, nodo: grupo };
        })}
      />
    </div>
  );
}
