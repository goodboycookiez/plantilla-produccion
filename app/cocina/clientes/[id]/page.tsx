import Link from "next/link";
import { notFound } from "next/navigation";
import CamposCliente from "@/components/CamposCliente";
import FaltaHistorial from "@/components/FaltaHistorial";
import { negocio } from "@/config/negocio";
import listas from "@/data/listas.json";
import { estadoDe, historialSeguro, listarTodosLosClientes } from "@/lib/clientes";
import { ESTADOS, resumenPedidos } from "@/lib/cronologia";
import { listarPedidos } from "@/lib/db";
import { fechaCorta, fechaLarga, hoyLocal } from "@/lib/fechas";
import { gramajeDeItem } from "@/lib/gramaje";
import type { EntradaHistorial, EstadoCliente, Pedido } from "@/lib/tipos";
import { agregarNotaCliente, borrarNotaCliente, cambiarEstadoCliente, guardarClienteAccion } from "../../acciones";

export const dynamic = "force-dynamic";

const QUIENES = [...new Set([...negocio.administradoras, ...listas.equipo])];

const ETIQUETA: Record<EntradaHistorial["tipo"], { texto: string; clase: string }> = {
  nota: { texto: "Nota", clase: "bg-amber-50 text-amber-900" },
  cambio: { texto: "Cambio de datos", clase: "bg-panel-50 text-panel-700" },
  estado: { texto: "Estado", clase: "bg-fondo text-panel-900" },
};

const ESTADO_PEDIDO: Record<Pedido["estado"], string> = {
  recibido: "recibido",
  en_produccion: "en producción",
  listo: "listo",
  entregado: "entregado",
  cancelado: "cancelado",
};

/** "pausado · cerró por remodelación" → "Pasó a pausado: cerró por remodelación". */
function textoEstado(texto: string) {
  const [estado, ...motivo] = texto.split(" · ");
  const nombre = estado in ESTADOS ? ESTADOS[estado as EstadoCliente].texto.toLowerCase() : estado;
  return `Pasó a ${nombre}${motivo.length ? `: ${motivo.join(" · ")}` : ""}`;
}

/** Un renglón de la cronología: un pedido o algo anotado. */
type Renglon =
  | { clase: "pedido"; fecha: string; orden: string; pedido: Pedido }
  | { clase: "entrada"; fecha: string; orden: string; entrada: EntradaHistorial };

/** La ficha de un punto de distribución: sus datos y su historia completa. */
export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hoy = hoyLocal();
  const [todos, pedidos, { historial, falta }] = await Promise.all([
    listarTodosLosClientes(),
    listarPedidos(),
    historialSeguro(decodeURIComponent(id)),
  ]);
  const cliente = todos.find((c) => c.id === decodeURIComponent(id));
  if (!cliente) notFound();

  const suyos = pedidos.filter((p) => p.clienteId === cliente.id);
  const resumen = resumenPedidos(suyos, hoy);
  const estado = estadoDe(cliente, historial);

  const renglones: Renglon[] = [
    ...suyos.map((p) => ({ clase: "pedido" as const, fecha: p.fechaProduccion, orden: p.creadoEn, pedido: p })),
    ...historial.map((e) => ({ clase: "entrada" as const, fecha: e.fecha, orden: e.creadoEn, entrada: e })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden.localeCompare(a.orden));

  // Agrupada por mes, lo más reciente arriba.
  const meses = new Map<string, Renglon[]>();
  for (const r of renglones) {
    const mes = r.fecha.slice(0, 7);
    meses.set(mes, [...(meses.get(mes) ?? []), r]);
  }
  const nombreMes = (m: string) => {
    const texto = fechaLarga(`${m}-01`).split(" de ")[1];
    return `${texto} ${m.slice(0, 4)}`;
  };

  return (
    <main>
      <Link href="/cocina/clientes" className="text-sm font-semibold text-panel-700 underline">
        ← Todos los clientes
      </Link>
      <div className="mb-5 mt-2 flex flex-wrap items-center gap-3">
        <h1 className="titulo text-3xl sm:text-4xl">{cliente.nombre}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ESTADOS[estado].clase}`}>
          {ESTADOS[estado].texto}
        </span>
        {cliente.interno && <span className="text-sm text-panel-500">(cliente de la casa)</span>}
      </div>

      {falta && <FaltaHistorial />}

      {/* De un vistazo. */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { cifra: resumen.primero ? fechaCorta(resumen.primero) : "—", texto: "Primer pedido aquí" },
          { cifra: resumen.ultimo ? fechaCorta(resumen.ultimo) : "—", texto: "Último pedido" },
          { cifra: String(resumen.galletasMes), texto: `Unidades en 30 días (${resumen.pedidosMes} pedidos)` },
          { cifra: String(resumen.total), texto: "Pedidos en total" },
        ].map((d) => (
          <div key={d.texto} className="rounded-2xl border-2 border-panel-200 bg-white px-4 py-3">
            <p className="text-2xl font-bold capitalize tabular-nums">{d.cifra}</p>
            <p className="text-sm text-panel-500">{d.texto}</p>
          </div>
        ))}
      </section>
      {resumen.sabores.length > 0 && (
        <p className="-mt-3 mb-6 text-sm text-panel-700">
          <span className="font-semibold">Lo que más pide:</span>{" "}
          {resumen.sabores.map(([n, c]) => `${n} (${c})`).join(" · ")}
          {resumen.proximo && (
            <>
              {" "}
              · <span className="font-semibold">Próximo pedido:</span> {fechaCorta(resumen.proximo)}
            </>
          )}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          {/* Estado */}
          <section className="tarjeta">
            <h2 className="titulo mb-1 text-2xl">Estado</h2>
            <p className="mb-3 text-sm text-panel-500">
              Solo los activos salen en el formulario de pedidos y en Programar. El cambio queda en la
              cronología con el motivo.
            </p>
            <form action={cambiarEstadoCliente} className="space-y-2">
              <input type="hidden" name="id" value={cliente.id} />
              <input
                name="motivo"
                aria-label="Motivo del cambio de estado"
                placeholder="Motivo (opcional): ej. cerró el local, cambió de proveedor"
                className="campo"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  name="estado"
                  aria-label="Nuevo estado"
                  className="campo w-auto"
                  defaultValue={estado === "activo" ? "pausado" : "activo"}
                >
                  {(Object.keys(ESTADOS) as EstadoCliente[])
                    .filter((e) => e !== estado)
                    .map((e) => (
                      <option key={e} value={e}>
                        Pasar a {ESTADOS[e].texto.toLowerCase()}
                      </option>
                    ))}
                </select>
                <button type="submit" className="boton">
                  Cambiar estado
                </button>
              </div>
            </form>
          </section>

          {/* Datos */}
          <section className="tarjeta">
            <h2 className="titulo mb-1 text-2xl">Datos</h2>
            <p className="mb-4 text-sm text-panel-500">
              Lo que cambies queda anotado en la cronología (antes → después).
            </p>
            <form action={guardarClienteAccion} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={cliente.id} />
              <CamposCliente cliente={cliente} prefijo="ficha" />
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                <select name="autor" aria-label="Quién hace el cambio" className="campo w-auto" defaultValue={QUIENES[0]}>
                  {QUIENES.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
                <button type="submit" className="boton">
                  Guardar cambios
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Cronología */}
        <section className="tarjeta self-start">
          <h2 className="titulo mb-3 text-2xl">Cronología</h2>
          <form action={agregarNotaCliente} className="mb-5 space-y-2 rounded-2xl border-2 border-panel-100 bg-claro p-3">
            <input type="hidden" name="id" value={cliente.id} />
            <textarea
              name="texto"
              required
              rows={2}
              aria-label="Nota nueva"
              placeholder="Visita, llamada, queja, acuerdo… ej: subimos el precio a $6.500 desde noviembre"
              className="w-full rounded-xl border-2 border-panel-200 bg-white px-3 py-2 outline-none focus:border-panel-500"
            />
            <div className="flex flex-wrap gap-2">
              <input type="date" name="fecha" defaultValue={hoy} aria-label="Fecha de la nota" className="campo w-auto" />
              <select name="autor" aria-label="Quién escribe" className="campo w-auto" defaultValue={QUIENES[0]}>
                {QUIENES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={falta} className="boton disabled:opacity-40">
                Anotar
              </button>
            </div>
          </form>

          {renglones.length === 0 ? (
            <p className="text-panel-500">Todavía no hay pedidos ni notas.</p>
          ) : (
            <div className="space-y-5">
              {[...meses.entries()].map(([mes, lista]) => (
                <div key={mes}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-panel-500">{nombreMes(mes)}</h3>
                  <ul className="space-y-2">
                    {lista.map((r) =>
                      r.clase === "pedido" ? (
                        <li key={r.pedido.id} className="rounded-xl border border-panel-100 px-3 py-2">
                          <p className="text-sm">
                            <span className="font-semibold">{fechaCorta(r.fecha)}</span>{" "}
                            <span className="text-panel-500">
                              · Pedido #{r.pedido.consecutivo} · {r.pedido.totalUnidades} unidades ·{" "}
                              {ESTADO_PEDIDO[r.pedido.estado]}
                            </span>
                          </p>
                          <p className={r.pedido.estado === "cancelado" ? "text-panel-500 line-through" : ""}>
                            {r.pedido.items
                              .map(
                                (i) =>
                                  `${i.nombre} ${i.cantidad}${i.unidad === "kg" ? " kg" : ` (${gramajeDeItem(i, r.pedido)})`}`,
                              )
                              .join(", ")}
                          </p>
                          {r.pedido.notas && <p className="text-sm text-panel-500">{r.pedido.notas}</p>}
                        </li>
                      ) : (
                        <li key={r.entrada.id} className={`rounded-xl px-3 py-2 ${ETIQUETA[r.entrada.tipo].clase}`}>
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-sm">
                              <span className="font-semibold">{fechaCorta(r.fecha)}</span> ·{" "}
                              {ETIQUETA[r.entrada.tipo].texto}
                              {r.entrada.autor && ` · ${r.entrada.autor}`}
                            </p>
                            {r.entrada.tipo === "nota" && (
                              <form action={borrarNotaCliente}>
                                <input type="hidden" name="id" value={r.entrada.id} />
                                <button type="submit" className="text-xs font-semibold underline opacity-70">
                                  Borrar
                                </button>
                              </form>
                            )}
                          </div>
                          <p>
                            {r.entrada.tipo === "estado" ? textoEstado(r.entrada.texto) : r.entrada.texto}
                          </p>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
