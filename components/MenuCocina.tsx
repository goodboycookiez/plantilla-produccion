"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "/cocina", texto: "Producción" },
  { href: "/cocina/preproduccion", texto: "Preproducción" },
  { href: "/cocina/inventario", texto: "Stock" },
  { href: "/cocina/limpieza", texto: "Limpieza y rutina" },
  { href: "/cocina/muestras", texto: "Muestras y bajas" },
  { href: "/cocina/pedidos", texto: "Historial" },
  { href: "/cocina/clientes", texto: "🔒 Clientes", restringida: true },
  { href: "/cocina/programar", texto: "🔒 Programar", restringida: true },
];

/** El mismo menú en todas las pantallas de la cocina. */
export default function MenuCocina() {
  const ruta = usePathname();

  return (
    <nav>
      <ul className="flex flex-wrap gap-1.5">
        {SECCIONES.map(({ href, texto, restringida }) => {
          const activa = href === "/cocina" ? ruta === href : ruta.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activa ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition ${
                  activa
                    ? "border-panel-700 bg-panel-700 text-white"
                    : restringida
                      ? "border-dashed border-panel-300 bg-claro text-panel-700 hover:border-panel-500"
                      : "border-panel-200 bg-white text-panel-700 hover:border-panel-500"
                }`}
              >
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
