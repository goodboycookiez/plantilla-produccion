import Link from "next/link";

const PESTANAS = [
  { href: "/cocina/programar", texto: "Preproducción" },
  { href: "/cocina/programar/pedidos", texto: "Pedidos" },
  { href: "/cocina/programar/rutina", texto: "Limpieza y rutina" },
  { href: "/cocina/programar/minimos", texto: "Mínimos" },
  { href: "/cocina/programar/temporada", texto: "Temporada" },
];

/** Lo que se puede programar, en pestañas. */
export default function PestanasProgramar({ activa }: { activa: string }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 border-b-2 border-panel-200">
      {PESTANAS.map(({ href, texto }) => (
        <Link
          key={href}
          href={href}
          className={`-mb-0.5 rounded-t-xl border-2 px-4 py-2 font-semibold ${
            activa === href
              ? "border-panel-200 border-b-fondo bg-fondo text-panel-900"
              : "border-transparent text-panel-500 hover:text-panel-700"
          }`}
        >
          {texto}
        </Link>
      ))}
    </div>
  );
}
