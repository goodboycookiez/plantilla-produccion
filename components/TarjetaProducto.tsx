"use client";

import { useEffect, useRef, useState } from "react";
import type { Producto } from "@/lib/tipos";
import { minimoDe } from "@/lib/catalogo";
import { Galleta, Ovalo } from "./Garabatos";

/** Marca de galleta que se usa cuando todavía no hay foto del producto. */
function FotoPendiente() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-fondo">
      <Galleta className="w-16 text-marca" />
      <span className="mt-2 text-[11px] font-medium text-tinta/40">foto pendiente</span>
    </div>
  );
}

export default function TarjetaProducto({
  producto,
  propio,
  cantidad,
  onCambiar,
}: {
  producto: Producto;
  propio: boolean;
  cantidad: number;
  onCambiar: (valor: number) => void;
}) {
  const minimo = minimoDe(producto.unidad);
  const insuficiente = cantidad > 0 && cantidad < minimo;
  const elegida = cantidad > 0;

  // El contador late cada vez que cambia la cantidad.
  const [late, setLate] = useState(false);
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    setLate(true);
    const t = setTimeout(() => setLate(false), 320);
    return () => clearTimeout(t);
  }, [cantidad]);

  return (
    <li
      className={`group relative rounded-marca bg-claro p-2.5 transition-all duration-200
        ${
          elegida
            ? "ring-2 ring-marca sm:-translate-y-0.5"
            : "ring-1 ring-marca/15 hover:ring-2 hover:ring-marca/60 sm:hover:-translate-y-0.5"
        }`}
    >
      {/* La foto se toca para agregar o quitar */}
      <button
        type="button"
        onClick={() => onCambiar(cantidad ? 0 : minimo)}
        aria-label={elegida ? `Quitar ${producto.nombre}` : `Agregar ${producto.nombre}`}
        className="block aspect-square w-full overflow-hidden rounded-2xl"
      >
        {producto.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={producto.foto}
            alt={producto.nombre}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <FotoPendiente />
        )}
      </button>

      {/* Sello dibujado a mano para los desarrollos propios */}
      {propio && (
        <span className="pointer-events-none absolute -left-1 top-1 -rotate-12 text-marca">
          <span className="relative block px-3 py-1.5">
            <Ovalo className="absolute inset-0 h-full w-full" />
            <span className="relative font-mono text-[10px] font-bold uppercase tracking-wider">
              tuya
            </span>
          </span>
        </span>
      )}

      {/* Cantidad elegida */}
      {elegida && (
        <span
          className={`animar-sello-chico pointer-events-none absolute right-4 top-4 flex h-10 min-w-10
            items-center justify-center rounded-full border-2 border-claro bg-marca px-2
            text-sm font-bold text-claro ${late ? "animar-latir" : ""}`}
        >
          {cantidad}
          {producto.unidad === "kg" ? " kg" : ""}
        </span>
      )}

      <div className="px-1.5 pb-1 pt-3">
        <p className="titulo text-xl">{producto.nombre}</p>
        {producto.descripcion && (
          <p className="mt-0.5 text-sm leading-snug text-tinta/60">{producto.descripcion}</p>
        )}
        {insuficiente && (
          <p className="mt-1 text-xs font-semibold text-red-600">
            Mínimo {minimo} {producto.unidad === "kg" ? "kg" : "unidades"}
          </p>
        )}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center rounded-full border-2 border-marca/20 text-marca">
        <button
          type="button"
          aria-label={`Quitar ${producto.nombre}`}
          onClick={() => onCambiar(cantidad <= minimo ? 0 : cantidad - 1)}
          className="py-1.5 text-xl font-bold transition active:scale-90 disabled:opacity-25"
          disabled={cantidad === 0}
        >
          −
        </button>
        <div className="flex items-center gap-1 px-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={cantidad || ""}
            placeholder="0"
            onChange={(e) => onCambiar(Number(e.target.value))}
            aria-label={`Cantidad de ${producto.nombre}`}
            className="w-10 bg-transparent text-center text-base font-bold text-marca outline-none"
          />
          {producto.unidad === "kg" && <span className="text-xs font-bold text-marca/60">kg</span>}
        </div>
        <button
          type="button"
          aria-label={`Agregar ${producto.nombre}`}
          onClick={() => onCambiar(cantidad < minimo ? minimo : cantidad + 1)}
          className="py-1.5 text-xl font-bold transition active:scale-90"
        >
          +
        </button>
      </div>
    </li>
  );
}
