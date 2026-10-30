import Link from "next/link";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export type BotonDia = {
  dia: string;
  href: string;
  /** Dato grande bajo el número del día (galletas, tareas...). Vacío = día libre. */
  cifra: string;
  /** Línea pequeña: "faltan 2", "✓ listo", "libre". */
  detalle: string;
};

function nombreDia(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Los días de la semana como botones; se toca uno y abajo se abre ese día. */
export default function SelectorDias({
  dias,
  abierto,
  hoy,
}: {
  dias: BotonDia[];
  abierto: string;
  hoy: string;
}) {
  const columnas = dias.length === 6 ? "grid-cols-6" : "grid-cols-5";

  return (
    <nav aria-label="Días de la semana" className={`mb-6 grid ${columnas} gap-1.5 sm:gap-3`}>
      {dias.map(({ dia, href, cifra, detalle }) => {
        const esAbierto = dia === abierto;
        const nombre = nombreDia(dia);
        return (
          <Link
            key={dia}
            href={href}
            scroll={false}
            aria-current={esAbierto ? "date" : undefined}
            className={`relative flex flex-col items-center rounded-2xl border-2 px-1 py-3 text-center transition ${
              esAbierto
                ? "border-panel-700 bg-panel-700 text-white shadow-lg shadow-panel-700/20"
                : cifra
                  ? "border-panel-200 bg-white text-panel-900 hover:border-panel-500"
                  : "border-dashed border-suave bg-claro text-panel-900/60 hover:border-panel-300"
            }`}
          >
            {dia === hoy && (
              <span
                className={`absolute -top-2.5 rounded-full px-2 text-xs font-semibold ${
                  esAbierto ? "bg-white text-panel-700 ring-2 ring-panel-700" : "bg-panel-700 text-white"
                }`}
              >
                hoy
              </span>
            )}
            <span className="text-sm font-semibold capitalize">
              <span className="sm:hidden">{nombre.slice(0, 3)}</span>
              <span className="hidden sm:inline">{nombre}</span>
            </span>
            <span className="text-3xl font-bold leading-tight sm:text-4xl">{dia.slice(8).replace(/^0/, "")}</span>
            <span className={`mt-1 text-sm font-bold ${esAbierto ? "" : "text-panel-700"}`}>
              {cifra || "—"}
            </span>
            <span
              className={`whitespace-nowrap text-[11px] leading-tight sm:text-xs ${
                esAbierto ? "text-white/80" : "text-panel-500"
              }`}
            >
              {detalle}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
