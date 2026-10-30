"use client";

import { Fragment, useRef, useState, useTransition } from "react";

/**
 * Una lista que se reordena arrastrando. Cada elemento trae su propia
 * agarradera (cualquier cosa con el atributo data-arrastrar); se toma y se
 * lleva arriba o abajo, con el mouse o con el dedo. Al soltar se guarda el
 * orden nuevo.
 *
 * Sirve para una lista de tarjetas (como="div") o para los grupos de filas
 * de una tabla (como="table", con la cabecera aparte). En la tabla, cada
 * elemento ya es un <tbody> y debe traer data-orden-id con su id.
 */
export default function ListaOrdenable({
  items,
  guardar,
  como = "div",
  cabecera,
  className = "",
}: {
  items: { id: string; nodo: React.ReactNode }[];
  /** Recibe los ids en el orden nuevo. */
  guardar: (ids: string[]) => Promise<void>;
  como?: "div" | "table";
  cabecera?: React.ReactNode;
  className?: string;
}) {
  const [orden, setOrden] = useState(items.map((i) => i.id));
  const [, empezar] = useTransition();
  const contenedor = useRef<HTMLElement | null>(null);

  // Si la página trae elementos nuevos (se agregó o movió algo), se respeta.
  const ids = items.map((i) => i.id);
  const vigente = orden.length === ids.length && orden.every((id) => ids.includes(id)) ? orden : ids;
  const porId = new Map(items.map((i) => [i.id, i.nodo]));

  function alTomar(e: React.PointerEvent) {
    const agarradera = (e.target as HTMLElement).closest("[data-arrastrar]");
    const fila = agarradera?.closest("[data-orden-id]") as HTMLElement | null;
    if (!agarradera || !fila || !contenedor.current) return;
    e.preventDefault();
    const id = fila.dataset.ordenId!;
    let actual = [...vigente];
    // Se resalta lo que se está arrastrando.
    const resaltar = ["opacity-70", "outline", "outline-2", "outline-panel-500"];
    fila.classList.add(...resaltar);

    const mover = (ev: PointerEvent) => {
      const filas = [...contenedor.current!.querySelectorAll<HTMLElement>(":scope > [data-orden-id]")];
      // La nueva posición: antes del primer elemento cuya mitad queda por debajo del dedo.
      const otras = filas.filter((f) => f.dataset.ordenId !== id);
      let posicion = otras.findIndex((f) => {
        const r = f.getBoundingClientRect();
        return ev.clientY < r.top + r.height / 2;
      });
      if (posicion === -1) posicion = otras.length;
      const sinEl = actual.filter((x) => x !== id);
      const nuevo = [...sinEl.slice(0, posicion), id, ...sinEl.slice(posicion)];
      if (nuevo.join() !== actual.join()) {
        actual = nuevo;
        setOrden(nuevo);
      }
    };
    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      contenedor.current
        ?.querySelector<HTMLElement>(`:scope > [data-orden-id="${CSS.escape(id)}"]`)
        ?.classList.remove(...resaltar);
      if (actual.join() !== vigente.join()) empezar(() => guardar(actual));
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  const hijos = vigente.map((id) =>
    como === "table" ? (
      <Fragment key={id}>{porId.get(id)}</Fragment>
    ) : (
      <div key={id} data-orden-id={id}>
        {porId.get(id)}
      </div>
    ),
  );

  if (como === "table") {
    return (
      <table
        ref={(el) => {
          contenedor.current = el;
        }}
        onPointerDown={alTomar}
        className={className}
      >
        {cabecera}
        {hijos}
      </table>
    );
  }
  return (
    <div
      ref={(el) => {
        contenedor.current = el;
      }}
      onPointerDown={alTomar}
      className={className}
    >
      {hijos}
    </div>
  );
}

/** La agarradera: se toma de aquí para arrastrar. */
export function Agarradera({ etiqueta }: { etiqueta: string }) {
  return (
    <span
      data-arrastrar
      role="button"
      aria-label={`Arrastrar ${etiqueta} para cambiar el orden`}
      title="Arrastra para cambiar el orden"
      className="flex h-9 w-7 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-lg text-xl leading-none text-panel-300 hover:bg-panel-50 hover:text-panel-700 active:cursor-grabbing"
    >
      ⠿
    </span>
  );
}
