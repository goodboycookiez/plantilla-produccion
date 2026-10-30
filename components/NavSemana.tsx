import Link from "next/link";
import { sumarDias } from "@/lib/fechas";

/** Flechas para pasar de semana, iguales en todas las pantallas por semana. */
export default function NavSemana({
  ruta,
  lunes,
  esEstaSemana,
}: {
  ruta: string;
  lunes: string;
  esEstaSemana: boolean;
}) {
  // La ruta puede traer ya otros parámetros (?ver=…).
  const con = (semana: string) => `${ruta}${ruta.includes("?") ? "&" : "?"}semana=${semana}`;
  const boton =
    "flex h-10 items-center justify-center rounded-full border-2 border-panel-200 bg-white px-4 text-sm font-bold text-panel-700 transition hover:border-panel-500";

  return (
    <div className="flex gap-2">
      <Link href={con(sumarDias(lunes, -7))} className={boton} aria-label="Semana anterior">
        ←
      </Link>
      {!esEstaSemana && (
        <Link href={ruta} className={boton}>
          Hoy
        </Link>
      )}
      <Link href={con(sumarDias(lunes, 7))} className={boton} aria-label="Semana siguiente">
        →
      </Link>
    </div>
  );
}
