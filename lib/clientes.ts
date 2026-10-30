import clientesJson from "@/data/clientes.json";
import { FaltaTablaHistorial, listarClientesPanel, listarHistorialClientes } from "./db";
import type { Cliente, EntradaHistorial, EstadoCliente } from "./tipos";

/**
 * Todos los clientes, activos o no: la base (data/clientes.json) más los que se agregan o editan en
 * Clientes. Si un cliente de la base se editó en el panel, manda lo del panel.
 */
export async function listarTodosLosClientes(): Promise<Cliente[]> {
  const delPanel = await listarClientesPanel();
  const editados = new Map(delPanel.map((c) => [c.id, c]));
  const base = (clientesJson as Cliente[]).map((b) => {
    const editado = editados.get(b.id);
    return editado ? { ...editado, interno: b.interno } : b;
  });
  const ids = new Set(base.map((c) => c.id));
  return [...base, ...delPanel.filter((c) => !ids.has(c.id))];
}

/** Los clientes activos: los que se pueden programar y piden en el formulario. */
export async function listarClientes(): Promise<Cliente[]> {
  return (await listarTodosLosClientes()).filter((c) => c.activo);
}

/** Los que ven el formulario público: sin los clientes de la casa (el punto de venta propio). */
export async function listarClientesPublicos(): Promise<Cliente[]> {
  return (await listarClientes()).filter((c) => !c.interno);
}

export async function buscarCliente(id: string): Promise<Cliente | undefined> {
  return (await listarClientes()).find((c) => c.id === id);
}

export async function buscarClientePublico(id: string): Promise<Cliente | undefined> {
  return (await listarClientesPublicos()).find((c) => c.id === id);
}

/**
 * El estado de un cliente: activo si está activo; si no, el último estado que
 * se le puso en la cronología (pausado o perdido).
 */
export function estadoDe(c: Cliente, historial: EntradaHistorial[]): EstadoCliente {
  if (c.activo) return "activo";
  const ultimo = historial.find((e) => e.clienteId === c.id && e.tipo === "estado");
  return ultimo?.texto.split(" · ")[0] === "perdido" ? "perdido" : "pausado";
}

/** La cronología, o vacía (y el aviso) si Supabase todavía no tiene la tabla. */
export async function historialSeguro(clienteId?: string) {
  try {
    return { historial: await listarHistorialClientes(clienteId), falta: false };
  } catch (e) {
    if (e instanceof FaltaTablaHistorial) return { historial: [], falta: true };
    throw e;
  }
}
