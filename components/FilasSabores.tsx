"use client";

import { useState } from "react";
import { GRAMAJES } from "@/lib/gramaje";

/**
 * Varias filas de sabor · gramaje · cantidad en un mismo formulario, para
 * registrar de una vez "Avena 90g 6 y Coco 70g 4". Cada fila manda
 * productoId, gramaje y cantidad (se leen con formData.getAll).
 */
export default function FilasSabores({
  productos,
  prefijo,
}: {
  productos: { id: string; nombre: string }[];
  /** Para que los ids de los campos no choquen entre formularios. */
  prefijo: string;
}) {
  const [filas, setFilas] = useState([0]);
  const [siguiente, setSiguiente] = useState(1);

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="hidden grid-cols-[1fr_6rem_6rem_2rem] gap-2 sm:grid">
        <span className="etiqueta">Producto</span>
        <span className="etiqueta">Gramaje</span>
        <span className="etiqueta">Cantidad</span>
      </div>
      {filas.map((f, n) => (
        <div key={f} className="grid grid-cols-[1fr_5.5rem_5rem_2rem] items-center gap-2 sm:grid-cols-[1fr_6rem_6rem_2rem]">
          <select name="productoId" aria-label={`Producto ${n + 1}`} className="campo" required>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select name="gramaje" aria-label={`Gramaje ${n + 1}`} className="campo" defaultValue="90g">
            {GRAMAJES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            id={n === 0 ? `${prefijo}-cantidad` : undefined}
            name="cantidad"
            type="number"
            min={1}
            aria-label={`Cantidad ${n + 1}`}
            className="campo"
            required
          />
          {filas.length > 1 ? (
            <button
              type="button"
              onClick={() => setFilas(filas.filter((x) => x !== f))}
              aria-label={`Quitar fila ${n + 1}`}
              className="text-xl font-bold text-red-700"
            >
              ×
            </button>
          ) : (
            <span />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setFilas([...filas, siguiente]);
          setSiguiente(siguiente + 1);
        }}
        className="text-sm font-semibold text-panel-700 underline"
      >
        + Otro sabor u otro gramaje
      </button>
    </div>
  );
}
