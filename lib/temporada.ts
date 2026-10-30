import { negocio } from "@/config/negocio";
import { productos as catalogo } from "./catalogo";
import { guardarAjuste, leerAjuste } from "./db";
import type { Producto } from "./tipos";

/**
 * El sabor de temporada: un solo producto ("temporada") cuyo nombre se
 * cambia desde Programar → Temporada (Halloween, luego Navidad…).
 * En el stock siempre es la masa TEMPORADA, sin importar cómo se llame.
 */
export type Temporada = { nombre: string; descripcion: string; activo: boolean };

export const ID_TEMPORADA = "temporada";
/** Ids que se cuentan como el sabor de temporada. */
export const IDS_TEMPORADA = new Set([ID_TEMPORADA]);
export const MASA_TEMPORADA = "TEMPORADA";

/** Lo de config/negocio.ts, mientras no se guarde otro nombre en Programar. */
const PREDETERMINADA: Temporada = negocio.temporada;

export async function obtenerTemporada(): Promise<Temporada> {
  return (await leerAjuste<Temporada>("temporada")) ?? PREDETERMINADA;
}

export async function cambiarTemporada(t: Temporada): Promise<void> {
  await guardarAjuste("temporada", t);
}

/** El catálogo con el sabor de temporada puesto (o quitado si no hay temporada). */
export async function listarProductos(): Promise<Producto[]> {
  const t = await obtenerTemporada();
  return catalogo
    .filter((p) => p.id !== ID_TEMPORADA || t.activo)
    .map((p) => (p.id === ID_TEMPORADA ? { ...p, nombre: t.nombre, descripcion: t.descripcion } : p));
}

/**
 * Lo que puede pedir un cliente: sus desarrollos propios primero, luego el
 * menú general.
 *
 * Un sabor exclusivo se le abre a un cliente de dos formas: porque el producto
 * lo nombra en `soloPara`, o porque el cliente lo tiene escrito en su campo de
 * sabor especial. Lo segundo permite darle, por ejemplo, un sabor exclusivo a un
 * cliente nuevo sin tocar el catálogo.
 */
export async function productosParaCliente(
  clienteId: string,
  desarrollos: string[] = [],
): Promise<Producto[]> {
  const todos = await listarProductos();
  const suyos = desarrollos.map(normal);
  const esSuyo = (p: Producto) =>
    p.soloPara.includes(clienteId) || suyos.includes(normal(p.nombre));
  return [
    ...todos.filter((p) => p.soloPara.length > 0 && esSuyo(p)),
    ...todos.filter((p) => p.soloPara.length === 0),
  ];
}

const normal = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

/** Si lo anotado es el sabor de temporada (por su nombre de hoy), se guarda como TEMPORADA. */
export function aMasa(nombre: string, t: Temporada): string {
  return normal(nombre) === normal(t.nombre) ? MASA_TEMPORADA : nombre;
}
