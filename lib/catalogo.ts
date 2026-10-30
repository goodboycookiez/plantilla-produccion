import clientesJson from "@/data/clientes.json";
import productosJson from "@/data/productos.json";
import { negocio } from "@/config/negocio";
import type { Cliente, Producto, Unidad } from "./tipos";

/** La base de clientes (data/clientes.json). La lista completa, con los del panel, está en lib/clientes.ts. */
export const clientes: Cliente[] = (clientesJson as Cliente[]).filter((c) => c.activo);

export const productos: Producto[] = (productosJson as Producto[]).filter((p) => p.activo);

export const MINIMO_UNIDADES = negocio.produccion.minimoUnidades;
export const MINIMO_KILOS = negocio.produccion.minimoKilos;

export function minimoDe(unidad: Unidad): number {
  return unidad === "kg" ? MINIMO_KILOS : MINIMO_UNIDADES;
}

/** Catálogo visible para un cliente: sus desarrollos propios primero, luego el menú general. */
export function productosPara(clienteId: string): Producto[] {
  const propios = productos.filter((p) => p.soloPara.includes(clienteId));
  const generales = productos.filter((p) => p.soloPara.length === 0);
  return [...propios, ...generales];
}
