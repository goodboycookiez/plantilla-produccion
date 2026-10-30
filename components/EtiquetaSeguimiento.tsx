import type { SeguimientoMuestra } from "@/lib/tipos";

export const NOMBRE_SEGUIMIENTO: Record<SeguimientoMuestra, string> = {
  enviada: "Enviada",
  interesado: "Interesado",
  cliente: "Ya es cliente",
  sin_interes: "Sin interés",
};

const COLOR: Record<SeguimientoMuestra, string> = {
  enviada: "bg-marca/10 text-marca",
  interesado: "bg-amber-100 text-amber-900",
  cliente: "bg-green-100 text-green-900",
  sin_interes: "bg-tinta/10 text-tinta/60",
};

export default function EtiquetaSeguimiento({ estado }: { estado: SeguimientoMuestra }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${COLOR[estado]}`}>
      {NOMBRE_SEGUIMIENTO[estado]}
    </span>
  );
}
