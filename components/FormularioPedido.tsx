"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Cliente, Pedido, Producto } from "@/lib/tipos";
import TarjetaProducto from "./TarjetaProducto";
import { negocio } from "@/config/negocio";
import { minimoDe, MINIMO_UNIDADES } from "@/lib/catalogo";

type Disponibilidad = {
  entrega: string;
  produccion: string;
  disponible: number;
  lleno: boolean;
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function fechaLegible(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  return fecha.toLocaleDateString(negocio.produccion.idioma, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Lo único que el formulario necesita de cada cliente. */
export type ClientePublico = Pick<
  Cliente,
  "id" | "nombre" | "gramaje" | "direccion" | "horarioEntrega" | "desarrollos"
>;

export default function FormularioPedido({
  clientes,
  productos,
}: {
  clientes: ClientePublico[];
  productos: Producto[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClientePublico | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [fechas, setFechas] = useState<Disponibilidad[]>([]);
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState<Pedido | null>(null);
  const [resaltada, setResaltada] = useState(0);
  const catalogoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch("/api/disponibilidad")
      .then((r) => r.json())
      .then((d: { fechas: Disponibilidad[] }) => setFechas(d.fechas))
      .catch(() => setError("No pudimos cargar las fechas disponibles. Recarga la página."));
  }, []);

  const sugerencias = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return [];
    return clientes.filter((c) => normalizar(c.nombre).includes(q)).slice(0, 8);
  }, [busqueda, clientes]);

  const catalogo = useMemo(() => {
    if (!cliente) return [];
    // Un sabor es del cliente si el producto lo nombra, o si el cliente lo
    // tiene escrito como desarrollo propio.
    const suyos = (cliente.desarrollos ?? []).map((d: string) => d.trim().toUpperCase());
    const esSuyo = (p: Producto) =>
      p.soloPara.includes(cliente.id) || suyos.includes(p.nombre.trim().toUpperCase());
    const propios = productos.filter((p) => p.soloPara.length > 0 && esSuyo(p));
    const generales = productos.filter((p) => p.soloPara.length === 0);
    return [...propios, ...generales];
  }, [cliente, productos]);

  const items = Object.entries(cantidades).filter(([, n]) => n > 0);
  const porId = new Map(catalogo.map((p) => [p.id, p]));
  const total = items
    .filter(([id]) => porId.get(id)?.unidad !== "kg")
    .reduce((s, [, n]) => s + n, 0);
  const kilos = items
    .filter(([id]) => porId.get(id)?.unidad === "kg")
    .reduce((s, [, n]) => s + n, 0);
  const bajoMinimo = items.filter(([id, n]) => n < minimoDe(porId.get(id)?.unidad ?? "unidad"));
  // La primera fecha hábil que todavía tiene cupo para todo el pedido.
  const fechaElegida = fechas.find((f) => !f.lleno && f.disponible >= Math.max(total, 1));
  const fechaEntrega = fechaElegida?.entrega ?? "";
  const puedeEnviar =
    Boolean(cliente) && items.length > 0 && bajoMinimo.length === 0 && Boolean(fechaEntrega);

  function cambiarCantidad(id: string, valor: number) {
    setCantidades((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(valor) || 0) }));
  }

  function elegirCliente(c: ClientePublico) {
    setCliente(c);
    setBusqueda("");
    setCantidades({});
    setResaltada(0);
    // Deja el catálogo a la vista sin que el cliente tenga que buscarlo.
    setTimeout(() => catalogoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  /** Flechas y Enter para elegir la tienda sin soltar el teclado. */
  function teclasBusqueda(e: React.KeyboardEvent<HTMLInputElement>) {
    if (sugerencias.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltada((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltada((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      elegirCliente(sugerencias[resaltada] ?? sugerencias[0]);
    } else if (e.key === "Escape") {
      setBusqueda("");
    }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente || !puedeEnviar) return;
    setEnviando(true);
    setError("");
    const datos = new FormData();
    datos.set("clienteId", cliente.id);
    datos.set("items", JSON.stringify(items.map(([productoId, cantidad]) => ({ productoId, cantidad }))));
    datos.set("fechaEntrega", fechaEntrega);
    datos.set("notas", notas);
    if (archivo) datos.set("ordenCompra", archivo);

    try {
      const res = await fetch("/api/pedidos", { method: "POST", body: datos });
      const cuerpo = await res.json();
      if (!res.ok) {
        setError(cuerpo.error ?? "No pudimos guardar el pedido.");
        setEnviando(false);
        return;
      }
      setListo(cuerpo.pedido as Pedido);
    } catch {
      setError("Falló la conexión. Revisa tu internet e intenta de nuevo.");
      setEnviando(false);
    }
  }

  if (listo) return <Gracias pedido={listo} />;

  return (
    <form id="pedido" onSubmit={enviar} className="space-y-6 pb-28">
      {/* 1. Cliente */}
      <section className="tarjeta">
        <h2 className="titulo mb-1 text-2xl">1. ¿Quién hace el pedido?</h2>
        <p className="mb-4 text-sm text-tinta/60">
          Escribe el nombre de tu tienda y selecciónalo de la lista.
        </p>

        {cliente ? (
          <div className="rounded-2xl bg-fondo p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{cliente.nombre}</p>
                <dl className="mt-2 space-y-1 text-sm text-tinta/60">
                  {cliente.direccion && <dd>📍 {cliente.direccion}</dd>}
                  <dd>⚖️ Presentación: {cliente.gramaje}</dd>
                  {cliente.horarioEntrega && <dd>🕗 Entrega: {cliente.horarioEntrega}</dd>}
                </dl>
              </div>
              <button
                type="button"
                onClick={() => setCliente(null)}
                className="shrink-0 text-sm font-semibold text-marca underline"
              >
                Cambiar
              </button>
            </div>
            <p className="mt-3 text-xs text-tinta/60">
              ¿Algún dato está desactualizado? Escríbenos y lo corregimos.
            </p>
          </div>
        ) : (
          <div className="relative">
            <input
              className="campo"
              placeholder="Ej: Café Ejemplo"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setResaltada(0);
              }}
              onKeyDown={teclasBusqueda}
              autoComplete="off"
            />
            {sugerencias.length > 0 && (
              <ul className="animar-desplegar absolute z-10 mt-2 max-h-72 w-full overflow-auto rounded-2xl border-2 border-marca/15 bg-white shadow-lg">
                {sugerencias.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => elegirCliente(c)}
                      onMouseEnter={() => setResaltada(i)}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        i === resaltada ? "bg-fondo" : "hover:bg-fondo"
                      }`}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      {c.direccion && (
                        <span className="block text-xs text-tinta/60">{c.direccion}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busqueda && sugerencias.length === 0 && (
              <p className="mt-3 text-sm text-tinta/60">
                No encontramos esa tienda. Escríbenos por WhatsApp y te registramos.
              </p>
            )}
          </div>
        )}
      </section>

      {/* 2. Sabores */}
      {cliente && (
        <section ref={catalogoRef} className="tarjeta scroll-mt-4">
          <h2 className="titulo mb-1 text-2xl">2. Tu pedido</h2>
          <p className="mb-4 text-sm text-tinta/60">
            Mínimo <strong>{MINIMO_UNIDADES} unidades por sabor</strong>. Presentación {cliente.gramaje}.
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {catalogo.map((p) => (
              <TarjetaProducto
                key={p.id}
                producto={p}
                propio={
                  p.soloPara.length > 0 &&
                  (p.soloPara.includes(cliente.id) ||
                    (cliente.desarrollos ?? [])
                      .map((d: string) => d.trim().toUpperCase())
                      .includes(p.nombre.trim().toUpperCase()))
                }
                cantidad={cantidades[p.id] ?? 0}
                onCambiar={(valor) => cambiarCantidad(p.id, valor)}
              />
            ))}
          </ul>
          {total > 0 && (
            <p className="mt-4 text-right font-bold">
              Total: {total} unidad{total === 1 ? "" : "es"}
            </p>
          )}
        </section>
      )}

      {/* 4. Extras */}
      {cliente && (
        <section className="tarjeta">
          <h2 className="titulo mb-4 text-2xl">3. Orden de compra y notas</h2>
          <label className="etiqueta" htmlFor="oc">
            Orden de compra en PDF (opcional)
          </label>
          <input
            id="oc"
            type="file"
            accept="application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="campo file:mr-3 file:rounded-lg file:border-0 file:bg-fondo file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
          <label className="etiqueta mt-4" htmlFor="notas">
            Notas o especificaciones (opcional)
          </label>
          <textarea
            id="notas"
            className="campo min-h-24"
            placeholder="Ej: es para un evento el 30 de septiembre, entregar antes de las 9am…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            maxLength={1000}
          />
        </section>
      )}

      {cliente && (
        <div className="space-y-3">
          {error && (
            <p className="animar-temblar rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {fechaEntrega && (
            <p className="rounded-2xl border-2 border-marca/20 bg-claro px-4 py-3 text-center text-sm">
              Te lo entregamos el{" "}
              <strong className="first-letter:uppercase">{fechaLegible(fechaEntrega)}</strong>
            </p>
          )}
          <p className="text-center text-xs text-tinta/60">
            Al enviar, tu pedido entra directo al calendario de producción de nuestra cocina.
          </p>
        </div>
      )}

      {/* Barra fija con el resumen del pedido */}
      {cliente && items.length > 0 && (
        <div className="animar-barra fixed inset-x-0 bottom-0 z-20 border-t-2 border-marca bg-claro/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-bold leading-tight">
                {total} unidad{total === 1 ? "" : "es"}
                {kilos > 0 && <span className="text-tinta/60"> · {kilos} kg</span>}
              </p>
              {fechaEntrega && (
                <p className="truncate text-xs text-tinta/60">
                  Entrega {fechaLegible(fechaEntrega)}
                </p>
              )}
            </div>
            <button
              type="submit"
              form="pedido"
              className="boton shrink-0 px-5 py-3"
              disabled={!puedeEnviar || enviando}
            >
              {enviando && (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-claro/40 border-t-claro"
                  aria-hidden
                />
              )}
              {enviando ? "Enviando…" : "Enviar pedido"}
            </button>
          </div>
        </div>
      )}

    </form>
  );
}

/** Confeti que estalla al abrir la pantalla de gracias. */
const CONFETI = [
  [-150, -90], [150, -100], [-190, 30], [190, 40], [-100, -140], [100, -145],
  [-50, 110], [50, 115], [-210, -40], [210, -30], [0, -160], [0, 130],
];

function Gracias({ pedido }: { pedido: Pedido }) {
  return (
    <div className="relative px-6 py-10 sm:px-10">
      <div className="tarjeta-limpia relative bg-suave px-6 py-14 text-center sm:px-12 sm:py-20">
        {/* Confeti desde el título */}
        <div className="pointer-events-none absolute left-1/2 top-32 h-0 w-0">
          {CONFETI.map(([x, y], i) => (
            <span
              key={i}
              className="animar-confeti absolute h-3 w-3 rounded-full bg-marca"
              style={
                {
                  "--x": `${x}px`,
                  "--y": `${y}px`,
                  animationDelay: `${0.2 + i * 0.03}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <p className="animar-subir font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-marca/70">
          Pedido #{pedido.consecutivo} · {pedido.clienteNombre}
        </p>

        <h2 className="titulo animar-aparecer mt-3 text-6xl sm:text-8xl">¡Gracias!</h2>

        <p
          className="animar-subir mx-auto mt-6 max-w-md text-lg leading-snug text-tinta sm:text-xl"
          style={{ animationDelay: "0.4s" }}
        >
          <strong className="text-marca">Recibimos tu pedido.</strong> Gracias por confiar en
          nosotros.
        </p>

        <div
          className="animar-subir mx-auto mt-8 w-fit rounded-full border-[3px] border-marca bg-claro px-6 py-2.5"
          style={{ animationDelay: "0.6s" }}
        >
          <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-marca">
            Pedido agendado
          </p>
        </div>

        <div
          className="animar-subir mx-auto mt-8 max-w-sm rounded-2xl bg-claro p-5 text-left text-sm"
          style={{ animationDelay: "0.8s" }}
        >
          <ul className="space-y-1">
            {pedido.items.map((i) => (
              <li key={i.productoId} className="flex justify-between">
                <span>{i.nombre}</span>
                <span className="font-bold">
                  {i.cantidad}
                  {i.unidad === "kg" ? " kg" : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t-2 border-marca/15 pt-3">
            Te lo entregamos el{" "}
            <strong className="first-letter:uppercase">{fechaLegible(pedido.fechaEntrega)}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => location.reload()}
          className="boton animar-subir mt-8"
          style={{ animationDelay: "1s" }}
        >
          Subir otro pedido
        </button>
      </div>

    </div>
  );
}
