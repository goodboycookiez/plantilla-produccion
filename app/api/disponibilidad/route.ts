import { NextResponse } from "next/server";
import { cargaPorDia } from "@/lib/db";
import {
  CAPACIDAD_DIARIA,
  fechasEntregaPosibles,
  produccionParaEntrega,
  entregaMasProxima,
} from "@/lib/fechas";

export const dynamic = "force-dynamic";

/** Fechas de entrega seleccionables, con el cupo que queda en cada día de producción. */
export async function GET() {
  const carga = await cargaPorDia();
  const fechas = fechasEntregaPosibles(20).map((entrega) => {
    const produccion = produccionParaEntrega(entrega);
    const usado = carga[produccion] ?? 0;
    return {
      entrega,
      produccion,
      disponible: Math.max(0, CAPACIDAD_DIARIA - usado),
      lleno: usado >= CAPACIDAD_DIARIA,
    };
  });
  return NextResponse.json({ masProxima: entregaMasProxima(), fechas });
}
