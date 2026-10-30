"use client";

import { useState } from "react";
import { leerTexto, separarSabores } from "@/lib/anotar";
import type { Cliente, Producto } from "@/lib/tipos";

/** Opción del selector para alguien que no es punto de distribución. */
const EXTRA = "extra";

/**
 * Pedido que llega por WhatsApp: se elige el cliente y el día, y se escriben
 * los sabores ("Chocolate 10, Vainilla 5"). Cada sabor puede ir en su gramaje
 * ("Avena 90g 6, Coco 70g 4"). Debajo se ve lo que entendió.
 *
 * También sirve para un pedido extra (una persona que pidió una caja x6):
 * no es cliente, se escribe su nombre y ve el menú general.
 */
export default function PedidoEscrito({
  accion,
  clientes,
  productos,
  gramajes,
  dias,
}: {
  accion: (formData: FormData) => Promise<void>;
  clientes: Pick<Cliente, "id" | "nombre" | "gramaje" | "desarrollos">[];
  productos: Pick<Producto, "id" | "nombre" | "unidad" | "soloPara">[];
  gramajes: string[];
  /** Días de producción para elegir, con la entrega que les corresponde. */
  dias: { valor: string; texto: string }[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState("");

  const esExtra = clienteId === EXTRA;
  const [nombreExtra, setNombreExtra] = useState("");
  const [gramaje, setGramaje] = useState("");
  const cliente = clientes.find((c) => c.id === clienteId);
  const gramajePedido = gramaje || cliente?.gramaje || "90g";
  // Lo que ese cliente puede pedir: sus desarrollos propios y el menú general.
  const suyos = (cliente?.desarrollos ?? []).map((d) => d.trim().toUpperCase());
  const catalogo = productos.filter(
    (p) =>
      p.soloPara.length === 0 ||
      p.soloPara.includes(clienteId) ||
      suyos.includes(p.nombre.trim().toUpperCase()),
  );
  const lineas = leerTexto(separarSabores(texto), catalogo.map((p) => p.nombre)).map((l) => {
    const producto = catalogo.find((p) => p.nombre.toUpperCase() === l.nombre.toUpperCase());
    return {
      ...l,
      producto,
      problema: l.falta || (!producto ? `no es un sabor ${esExtra ? "del menú" : "de este cliente"}` : ""),
    };
  });
  const buenas = lineas.filter((l) => !l.problema);
  const total = buenas.filter((l) => l.producto?.unidad === "unidad").reduce((s, l) => s + (l.cantidad ?? 0), 0);

  return (
    <form
      action={async (fd) => {
        if (guardando) return;
        setGuardando(true);
        try {
          await accion(fd);
          setGuardado(cliente?.nombre ?? nombreExtra);
          setTexto("");
          setNombreExtra("");
        } finally {
          setGuardando(false);
        }
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="pe-cliente">
          Cliente
        </label>
        <select
          id="pe-cliente"
          name="clienteId"
          required
          value={clienteId}
          onChange={(e) => {
            setClienteId(e.target.value);
            setGramaje("");
            setGuardado("");
          }}
          className="campo"
        >
          <option value="" disabled>
            Elige el cliente…
          </option>
          <option value={EXTRA}>➕ Pedido extra (no es cliente)</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      {esExtra && (
        <>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="pe-extra">
              ¿A nombre de quién?
            </label>
            <input
              id="pe-extra"
              name="nombreExtra"
              required
              value={nombreExtra}
              onChange={(e) => setNombreExtra(e.target.value)}
              className="campo"
              placeholder="Ej: Ana Pérez (caja x6)"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="pe-tel">
              Teléfono (opcional)
            </label>
            <input id="pe-tel" name="telefonoExtra" inputMode="tel" className="campo" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="pe-dir">
              Dirección (opcional)
            </label>
            <input id="pe-dir" name="direccionExtra" className="campo" placeholder="Si hay que llevarlo" />
          </div>
        </>
      )}

      <div>
        <label className="etiqueta" htmlFor="pe-dia">
          Día de producción
        </label>
        <select id="pe-dia" name="fechaProduccion" className="campo">
          {dias.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.texto}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="etiqueta" htmlFor="pe-gramaje">
          Gramaje
        </label>
        <select
          id="pe-gramaje"
          name="gramaje"
          className="campo"
          value={gramaje}
          onChange={(e) => setGramaje(e.target.value)}
        >
          <option value="">
            {esExtra ? "90g" : cliente ? `El del cliente (${cliente.gramaje})` : "El del cliente"}
          </option>
          {gramajes.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="pe-sabores">
          Sabores y cantidades
        </label>
        <textarea
          id="pe-sabores"
          name="texto"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setGuardado("");
          }}
          rows={4}
          placeholder={"Chocolate 10, Vainilla 5, Avena 15\nOtro gramaje en un sabor: Avena 70g 4"}
          className="w-full rounded-2xl border-2 border-panel-200 bg-white px-4 py-3 text-lg outline-none placeholder:text-panel-300 focus:border-panel-500"
        />
      </div>

      {lineas.length > 0 && (
        <ul className="space-y-1.5 sm:col-span-2">
          {lineas.map((l, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                l.problema ? "bg-red-50 text-red-800" : "bg-panel-50"
              }`}
            >
              {l.problema ? (
                <span>
                  “{l.texto}” — {l.problema}
                </span>
              ) : (
                <>
                  <span className="text-sm text-panel-500">Entendí:</span>
                  <strong>{l.producto!.nombre}</strong>
                  {l.producto!.unidad !== "kg" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        l.gramaje && l.gramaje !== gramajePedido ? "bg-panel-700 text-white" : "bg-white text-panel-500"
                      }`}
                    >
                      {l.gramaje || gramajePedido}
                    </span>
                  )}
                  <span className="ml-auto text-xl font-bold tabular-nums">
                    {l.cantidad}
                    {l.producto!.unidad === "kg" ? " kg" : ""}
                  </span>
                </>
              )}
            </li>
          ))}
          {total > 0 && (
            <li className="px-3 text-right text-sm text-panel-500">
              Total: <strong className="text-panel-900">{total} unidades</strong>
            </li>
          )}
        </ul>
      )}

      <div>
        <label className="etiqueta" htmlFor="pe-notas">
          Notas
        </label>
        <input id="pe-notas" name="notas" className="campo" placeholder="Ej: entregar antes de las 9am" />
      </div>
      <label className="flex items-end gap-2 pb-3">
        <input type="checkbox" name="esEvento" className="h-5 w-5" />
        <span className="font-semibold">Es para un evento</span>
      </label>

      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={(esExtra ? !nombreExtra.trim() : !cliente) || buenas.length === 0 || guardando}
          className="boton disabled:opacity-40"
        >
          {guardando ? "Guardando…" : "Programar pedido"}
        </button>
        {guardado && <span className="font-semibold text-green-700">✓ Pedido de {guardado} programado</span>}
      </div>
    </form>
  );
}
