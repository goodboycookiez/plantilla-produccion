import { sumarDias } from "./fechas";
import type { EstadoCliente, Pedido } from "./tipos";

export const ESTADOS: Record<EstadoCliente, { texto: string; clase: string }> = {
  activo: { texto: "Activo", clase: "bg-cielo-700 text-white" },
  pausado: { texto: "Pausado", clase: "bg-amber-100 text-amber-900" },
  perdido: { texto: "Perdido", clase: "bg-red-100 text-red-800" },
};


/** Los números de un cliente que se ven de un vistazo: cuánto pide y desde cuándo. */
export function resumenPedidos(pedidos: Pedido[], hoy: string) {
  const validos = pedidos
    .filter((p) => p.estado !== "cancelado")
    .sort((a, b) => a.fechaProduccion.localeCompare(b.fechaProduccion));
  const hace30 = sumarDias(hoy, -30);
  const ultimoMes = validos.filter((p) => p.fechaProduccion > hace30 && p.fechaProduccion <= hoy);

  const porSabor = new Map<string, number>();
  for (const p of validos) for (const i of p.items) porSabor.set(i.nombre, (porSabor.get(i.nombre) ?? 0) + i.cantidad);

  return {
    total: validos.length,
    primero: validos[0]?.fechaProduccion ?? null,
    ultimo: validos.filter((p) => p.fechaProduccion <= hoy).at(-1)?.fechaProduccion ?? null,
    proximo: validos.find((p) => p.fechaProduccion > hoy)?.fechaProduccion ?? null,
    galletasMes: ultimoMes.reduce((s, p) => s + p.totalUnidades, 0),
    pedidosMes: ultimoMes.length,
    sabores: [...porSabor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
  };
}
