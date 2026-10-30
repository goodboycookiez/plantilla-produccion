import { negocio } from "@/config/negocio";

/**
 * Los gramajes que se usan hoy (config/negocio.ts → produccion.gramajes).
 *
 * Si un tamaño cambió de nombre (antes "100g", hoy "90g"), las equivalencias
 * hacen que todo lo viejo (pedidos, conteos, la base de clientes) se lea con
 * el nombre nuevo.
 */
export const GRAMAJES = negocio.produccion.gramajes;

const EQUIVALENCIAS: Record<string, string> = negocio.produccion.equivalenciasGramaje;

export function normalizarGramaje(g: string): string {
  const limpio = g.trim().toLowerCase().replace(/\s+/g, "");
  return EQUIVALENCIAS[limpio] ?? limpio;
}

/** El gramaje de un sabor dentro de un pedido: el suyo propio o el del pedido. */
export function gramajeDeItem(item: { gramaje?: string }, pedido: { gramaje: string }): string {
  return item.gramaje ? normalizarGramaje(item.gramaje) : normalizarGramaje(pedido.gramaje);
}

/** Para mostrar el pedido: "90g", o "90g + 70g" si mezcla gramajes. */
export function gramajesDelPedido(pedido: {
  gramaje: string;
  items: { gramaje?: string; unidad: string }[];
}): string {
  const todos = pedido.items.filter((i) => i.unidad !== "kg").map((i) => gramajeDeItem(i, pedido));
  return [...new Set(todos.length ? todos : [normalizarGramaje(pedido.gramaje)])].join(" + ");
}
