"use client";

import { useState } from "react";
import { leerPedidos } from "@/lib/anotar";
import type { Cliente, Producto } from "@/lib/tipos";

/**
 * Todos los pedidos del día escritos de una vez, un cliente por línea:
 * "Café Ejemplo: Chocolate 10, Vainilla 5". Lo que va después de "//" queda como nota del
 * pedido. Debajo se ve cada pedido como lo entendió.
 */
export default function PedidosVarios({
  accion,
  clientes,
  productos,
  dias,
}: {
  accion: (formData: FormData) => Promise<void>;
  clientes: Pick<Cliente, "id" | "nombre" | "gramaje" | "desarrollos">[];
  productos: Pick<Producto, "id" | "nombre" | "unidad" | "soloPara">[];
  dias: { valor: string; texto: string }[];
}) {
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardados, setGuardados] = useState(0);

  const leidos = leerPedidos(texto, clientes, productos);
  const listos = leidos.filter((p) => (p.cliente || p.extra) && p.items.some((i) => !i.problema && i.cantidad));
  const total = listos.reduce(
    (s, p) =>
      s + p.items.filter((i) => !i.problema && i.producto?.unidad === "unidad").reduce((t, i) => t + (i.cantidad ?? 0), 0),
    0,
  );

  return (
    <form
      action={async (fd) => {
        if (guardando) return;
        setGuardando(true);
        try {
          await accion(fd);
          setGuardados(listos.length);
          setTexto("");
        } finally {
          setGuardando(false);
        }
      }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="pv-dia" className="font-semibold">
          Día de producción
        </label>
        <select id="pv-dia" name="fechaProduccion" className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2">
          {dias.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.texto}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="texto"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setGuardados(0);
        }}
        rows={8}
        aria-label="Pedidos, un cliente por línea"
        placeholder={
          "Café Ejemplo: Chocolate 10, Vainilla 5, Avena 6 // entregar antes de las 9am\nTienda Demo 70g: Chocolate 20, Avena 10\nCafé Ejemplo: Vainilla 90g 6, Avena 70g 4\nExtra Ana Pérez: Chocolate 6 // caja x6"
        }
        className="w-full rounded-2xl border-2 border-panel-200 bg-white px-4 py-3 text-lg outline-none placeholder:text-panel-300 focus:border-panel-500"
      />

      {leidos.length > 0 && (
        <ul className="space-y-2">
          {leidos.map((p, n) => (
            <li
              key={n}
              className={`rounded-2xl border-2 px-4 py-3 ${
                p.cliente || p.extra ? "border-panel-200 bg-white" : "border-red-200 bg-red-50"
              }`}
            >
              {p.extra ? (
                <p className="font-bold">
                  {p.extra}{" "}
                  <span className="ml-1 rounded-full bg-fondo px-2 py-0.5 text-xs font-semibold text-panel-700">
                    Pedido extra · {p.gramaje || "90g"}
                  </span>
                </p>
              ) : p.cliente ? (
                <p className="font-bold">
                  {p.cliente.nombre}{" "}
                  <span className="ml-1 rounded-full bg-panel-700 px-2 py-0.5 text-xs font-semibold text-white">
                    {p.gramaje || p.cliente.gramaje}
                  </span>
                </p>
              ) : (
                <p className="font-semibold text-red-800">
                  “{p.clienteTexto}” —{" "}
                  {p.ambiguos.length
                    ? `¿cuál? ${p.ambiguos.slice(0, 6).join(", ")}${p.ambiguos.length > 6 ? "…" : ""}`
                    : "no encontré ese cliente"}
                </p>
              )}
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {p.items.map((i, k) => (
                  <li
                    key={k}
                    className={`rounded-lg px-2.5 py-1 text-sm ${
                      i.problema ? "bg-red-100 text-red-800" : "border border-panel-200 bg-panel-50"
                    }`}
                  >
                    {i.problema ? (
                      <>
                        “{i.texto}” — {i.problema}
                      </>
                    ) : (
                      <>
                        <strong className="text-panel-700">{i.cantidad}</strong> {i.producto!.nombre}
                        {i.gramaje && i.producto!.unidad !== "kg" && (
                          <span className="ml-1 rounded-full bg-panel-700 px-1.5 text-xs font-semibold text-white">
                            {i.gramaje}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {p.items.length === 0 && <li className="text-sm text-red-800">faltan los sabores</li>}
              </ul>
              {p.notas && (
                <p className="mt-1.5 text-sm text-panel-700">
                  <span className="font-semibold">Nota:</span> {p.notas}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={listos.length === 0 || guardando} className="boton disabled:opacity-40">
          {guardando
            ? "Guardando…"
            : `Programar ${listos.length || ""} pedido${listos.length === 1 ? "" : "s"}`}
        </button>
        {total > 0 && !guardando && <span className="text-sm text-panel-500">{total} unidades en total</span>}
        {guardados > 0 && (
          <span className="font-semibold text-green-700">
            ✓ {guardados} pedido{guardados === 1 ? "" : "s"} programado{guardados === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {leidos.length > listos.length && (
        <p className="text-sm text-red-800">
          Lo que está en rojo no se guarda. Corrígelo o se programa solo lo que está bien.
        </p>
      )}
    </form>
  );
}
