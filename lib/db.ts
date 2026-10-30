import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizarGramaje } from "./gramaje";
import type { Baja, Cliente, Conteo, EntradaHistorial, Muestra, Pedido, RegistroRutina, Rutina, Tarea } from "./tipos";

/**
 * Dos modos de almacenamiento:
 *  - Supabase (producción): si están las variables de entorno.
 *  - Archivo local .data/pedidos.json (desarrollo): para probar sin base de datos.
 */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
export const usandoSupabase = Boolean(URL && KEY);

const supabase = usandoSupabase ? createClient(URL!, KEY!, { auth: { persistSession: false } }) : null;

const ARCHIVO = path.join(process.cwd(), ".data", "pedidos.json");

function leerArchivo(): Pedido[] {
  try {
    const pedidos: Pedido[] = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
    return pedidos.map((p) => ({ ...p, gramaje: normalizarGramaje(p.gramaje) }));
  } catch {
    return [];
  }
}

function escribirArchivo(pedidos: Pedido[]) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(pedidos, null, 2));
}

/** Fila tal como se guarda en Supabase (snake_case). */
type Fila = {
  id: string;
  consecutivo: number;
  creado_en: string;
  cliente_id: string;
  cliente_nombre: string;
  direccion: string;
  gramaje: string;
  items: Pedido["items"];
  total_unidades: number;
  total_kilos: number;
  fecha_produccion: string;
  fecha_entrega: string;
  es_evento: boolean;
  notas: string;
  orden_compra: string | null;
  estado: Pedido["estado"];
  orden?: number | null;
};

const aPedido = (f: Fila): Pedido => ({
  id: f.id,
  consecutivo: f.consecutivo,
  creadoEn: f.creado_en,
  clienteId: f.cliente_id,
  clienteNombre: f.cliente_nombre,
  direccion: f.direccion,
  gramaje: normalizarGramaje(f.gramaje),
  items: f.items,
  totalUnidades: f.total_unidades,
  totalKilos: f.total_kilos ?? 0,
  fechaProduccion: f.fecha_produccion,
  fechaEntrega: f.fecha_entrega,
  esEvento: f.es_evento,
  notas: f.notas,
  ordenCompra: f.orden_compra,
  estado: f.estado,
  orden: f.orden ?? null,
});

const aFila = (p: Omit<Pedido, "consecutivo">): Omit<Fila, "consecutivo"> => ({
  id: p.id,
  creado_en: p.creadoEn,
  cliente_id: p.clienteId,
  cliente_nombre: p.clienteNombre,
  direccion: p.direccion,
  gramaje: p.gramaje,
  items: p.items,
  total_unidades: p.totalUnidades,
  total_kilos: p.totalKilos,
  fecha_produccion: p.fechaProduccion,
  fecha_entrega: p.fechaEntrega,
  es_evento: p.esEvento,
  notas: p.notas,
  orden_compra: p.ordenCompra,
  estado: p.estado,
});

export async function listarPedidos(): Promise<Pedido[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("pedidos")
      .select("*")
      .order("consecutivo", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as Fila[]).map(aPedido);
  }
  return leerArchivo().sort((a, b) => b.consecutivo - a.consecutivo);
}

export async function pedidosDeProduccion(desde: string, hasta: string): Promise<Pedido[]> {
  const todos = await listarPedidos();
  return todos.filter(
    (p) => p.estado !== "cancelado" && p.fechaProduccion >= desde && p.fechaProduccion <= hasta,
  );
}

/** Unidades ya comprometidas para cada día de producción. */
export async function cargaPorDia(): Promise<Record<string, number>> {
  const todos = await listarPedidos();
  const carga: Record<string, number> = {};
  for (const p of todos) {
    if (p.estado === "cancelado") continue;
    carga[p.fechaProduccion] = (carga[p.fechaProduccion] ?? 0) + p.totalUnidades;
  }
  return carga;
}

export async function crearPedido(pedido: Omit<Pedido, "consecutivo">): Promise<Pedido> {
  if (supabase) {
    const { data, error } = await supabase.from("pedidos").insert(aFila(pedido)).select().single();
    if (error) throw new Error(error.message);
    return aPedido(data as Fila);
  }
  const pedidos = leerArchivo();
  const consecutivo = pedidos.reduce((max, p) => Math.max(max, p.consecutivo), 0) + 1;
  const completo: Pedido = { ...pedido, consecutivo };
  pedidos.push(completo);
  escribirArchivo(pedidos);
  return completo;
}

export async function actualizarPedido(
  id: string,
  cambios: Partial<
    Pick<
      Pedido,
      | "estado"
      | "fechaProduccion"
      | "fechaEntrega"
      | "notas"
      | "items"
      | "totalUnidades"
      | "totalKilos"
      | "gramaje"
      | "orden"
    >
  >,
): Promise<void> {
  if (supabase) {
    const fila: Record<string, unknown> = {};
    if (cambios.items) fila.items = cambios.items;
    if (cambios.gramaje) fila.gramaje = cambios.gramaje;
    if (cambios.orden !== undefined) fila.orden = cambios.orden;
    if (cambios.totalUnidades !== undefined) fila.total_unidades = cambios.totalUnidades;
    if (cambios.totalKilos !== undefined) fila.total_kilos = cambios.totalKilos;
    if (cambios.estado) fila.estado = cambios.estado;
    if (cambios.fechaProduccion) fila.fecha_produccion = cambios.fechaProduccion;
    if (cambios.fechaEntrega) fila.fecha_entrega = cambios.fechaEntrega;
    if (cambios.notas !== undefined) fila.notas = cambios.notas;
    const { error } = await supabase.from("pedidos").update(fila).eq("id", id);
    // Si todavía no se agregó la columna "orden" en Supabase, ordenar no hace nada en vez de fallar.
    if (error && Object.keys(fila).join() === "orden" && /orden/.test(error.message)) return;
    if (error) throw new Error(error.message);
    return;
  }
  const pedidos = leerArchivo();
  const i = pedidos.findIndex((p) => p.id === id);
  if (i === -1) throw new Error("Pedido no encontrado");
  pedidos[i] = { ...pedidos[i], ...cambios };
  escribirArchivo(pedidos);
}

/** Guarda la orden de compra en PDF y devuelve la URL para verla. */
export async function guardarOrdenCompra(
  nombreArchivo: string,
  bytes: ArrayBuffer,
): Promise<string> {
  if (supabase) {
    // Un nombre imposible de adivinar: el enlace del PDF solo lo tiene quien ve el pedido.
    const ruta = `ordenes/${crypto.randomUUID()}-${nombreArchivo}`;
    const { error } = await supabase.storage
      .from("ordenes-compra")
      .upload(ruta, bytes, { contentType: "application/pdf" });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("ordenes-compra").getPublicUrl(ruta);
    return data.publicUrl;
  }
  const dir = path.join(process.cwd(), "public", "ordenes");
  fs.mkdirSync(dir, { recursive: true });
  const archivo = `${Date.now()}-${nombreArchivo}`;
  fs.writeFileSync(path.join(dir, archivo), Buffer.from(bytes));
  return `/ordenes/${archivo}`;
}

/* ------------------------------ Bajas ------------------------------ */

const ARCHIVO_BAJAS = path.join(process.cwd(), ".data", "bajas.json");

function leerBajas(): Baja[] {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_BAJAS, "utf8"));
  } catch {
    return [];
  }
}

function escribirBajas(bajas: Baja[]) {
  fs.mkdirSync(path.dirname(ARCHIVO_BAJAS), { recursive: true });
  fs.writeFileSync(ARCHIVO_BAJAS, JSON.stringify(bajas, null, 2));
}

type FilaBaja = {
  id: string;
  creado_en: string;
  fecha: string;
  producto_id: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  motivo: string;
};

export async function listarBajas(desde: string, hasta: string): Promise<Baja[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("bajas")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as FilaBaja[]).map((f) => ({
      id: f.id,
      creadoEn: f.creado_en,
      fecha: f.fecha,
      productoId: f.producto_id,
      nombre: f.nombre,
      gramaje: f.gramaje,
      cantidad: f.cantidad,
      motivo: f.motivo,
    }));
  }
  return leerBajas()
    .filter((b) => b.fecha >= desde && b.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function crearBaja(baja: Baja): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("bajas").insert({
      id: baja.id,
      creado_en: baja.creadoEn,
      fecha: baja.fecha,
      producto_id: baja.productoId,
      nombre: baja.nombre,
      gramaje: baja.gramaje,
      cantidad: baja.cantidad,
      motivo: baja.motivo,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const bajas = leerBajas();
  bajas.push(baja);
  escribirBajas(bajas);
}

export async function borrarBaja(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("bajas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  escribirBajas(leerBajas().filter((b) => b.id !== id));
}

/* ----------------------------- Muestras ----------------------------- */

const ARCHIVO_MUESTRAS = path.join(process.cwd(), ".data", "muestras.json");

function leerMuestras(): Muestra[] {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_MUESTRAS, "utf8"));
  } catch {
    return [];
  }
}

function escribirMuestras(muestras: Muestra[]) {
  fs.mkdirSync(path.dirname(ARCHIVO_MUESTRAS), { recursive: true });
  fs.writeFileSync(ARCHIVO_MUESTRAS, JSON.stringify(muestras, null, 2));
}

type FilaMuestra = {
  id: string;
  creado_en: string;
  fecha: string;
  prospecto: string;
  contacto: string;
  producto_id: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  notas: string;
  seguimiento: Muestra["seguimiento"];
};

const aMuestra = (f: FilaMuestra): Muestra => ({
  id: f.id,
  creadoEn: f.creado_en,
  fecha: f.fecha,
  prospecto: f.prospecto,
  contacto: f.contacto,
  productoId: f.producto_id,
  nombre: f.nombre,
  gramaje: f.gramaje,
  cantidad: f.cantidad,
  notas: f.notas,
  seguimiento: f.seguimiento,
});

/** Sin fechas devuelve el historial completo, de la más reciente a la más vieja. */
export async function listarMuestras(desde?: string, hasta?: string): Promise<Muestra[]> {
  if (supabase) {
    let consulta = supabase.from("muestras").select("*");
    if (desde) consulta = consulta.gte("fecha", desde);
    if (hasta) consulta = consulta.lte("fecha", hasta);
    const { data, error } = await consulta.order("fecha", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaMuestra[]).map(aMuestra);
  }
  return leerMuestras()
    .filter((m) => (!desde || m.fecha >= desde) && (!hasta || m.fecha <= hasta))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function crearMuestra(muestra: Muestra): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("muestras").insert({
      id: muestra.id,
      creado_en: muestra.creadoEn,
      fecha: muestra.fecha,
      prospecto: muestra.prospecto,
      contacto: muestra.contacto,
      producto_id: muestra.productoId,
      nombre: muestra.nombre,
      gramaje: muestra.gramaje,
      cantidad: muestra.cantidad,
      notas: muestra.notas,
      seguimiento: muestra.seguimiento,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const muestras = leerMuestras();
  muestras.push(muestra);
  escribirMuestras(muestras);
}

export async function actualizarMuestra(
  id: string,
  cambios: Partial<Pick<Muestra, "seguimiento" | "cantidad" | "notas" | "fecha">>,
): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("muestras").update(cambios).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const muestras = leerMuestras();
  const i = muestras.findIndex((m) => m.id === id);
  if (i === -1) return;
  muestras[i] = { ...muestras[i], ...cambios };
  escribirMuestras(muestras);
}

export async function borrarMuestra(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("muestras").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  escribirMuestras(leerMuestras().filter((m) => m.id !== id));
}

/* -------------------------- Preproducción -------------------------- */

const ARCHIVO_TAREAS = path.join(process.cwd(), ".data", "tareas.json");

function leerTareas(): Tarea[] {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_TAREAS, "utf8"));
  } catch {
    return [];
  }
}

function escribirTareas(tareas: Tarea[]) {
  fs.mkdirSync(path.dirname(ARCHIVO_TAREAS), { recursive: true });
  fs.writeFileSync(ARCHIVO_TAREAS, JSON.stringify(tareas, null, 2));
}

type FilaTarea = {
  id: string;
  creado_en: string;
  fecha: string;
  orden: number;
  tipo: Tarea["tipo"];
  nombre: string;
  gramaje: string;
  lote: string;
  esperado: number | null;
  encargada: string;
  horario: string;
  notas: string;
  hecho: boolean;
  cantidad_real: number | null;
  hecho_por: string;
  fecha_hecho: string | null;
};

const aTarea = (f: FilaTarea): Tarea => ({
  id: f.id,
  creadoEn: f.creado_en,
  fecha: f.fecha,
  orden: f.orden ?? 0,
  tipo: f.tipo,
  nombre: f.nombre,
  gramaje: f.gramaje,
  lote: f.lote,
  esperado: f.esperado,
  encargada: f.encargada,
  horario: f.horario,
  notas: f.notas,
  hecho: f.hecho,
  cantidadReal: f.cantidad_real,
  hechoPor: f.hecho_por,
  fechaHecho: f.fecha_hecho,
});

export async function listarTareas(desde: string, hasta: string): Promise<Tarea[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("tareas")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true })
      .order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as FilaTarea[]).map(aTarea);
  }
  return leerTareas()
    .filter((t) => t.fecha >= desde && t.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
}

export async function crearTarea(tarea: Tarea): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("tareas").insert({
      id: tarea.id,
      creado_en: tarea.creadoEn,
      fecha: tarea.fecha,
      orden: tarea.orden,
      tipo: tarea.tipo,
      nombre: tarea.nombre,
      gramaje: tarea.gramaje,
      lote: tarea.lote,
      esperado: tarea.esperado,
      encargada: tarea.encargada,
      horario: tarea.horario,
      notas: tarea.notas,
      hecho: tarea.hecho,
      cantidad_real: tarea.cantidadReal,
      hecho_por: tarea.hechoPor,
      fecha_hecho: tarea.fechaHecho,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const tareas = leerTareas();
  tareas.push(tarea);
  escribirTareas(tareas);
}

export async function actualizarTarea(
  id: string,
  cambios: Partial<
    Pick<Tarea, "fecha" | "orden" | "hecho" | "cantidadReal" | "hechoPor" | "fechaHecho" | "notas">
  >,
): Promise<void> {
  if (supabase) {
    const fila: Record<string, unknown> = {};
    if (cambios.fecha !== undefined) fila.fecha = cambios.fecha;
    if (cambios.orden !== undefined) fila.orden = cambios.orden;
    if (cambios.hecho !== undefined) fila.hecho = cambios.hecho;
    if (cambios.cantidadReal !== undefined) fila.cantidad_real = cambios.cantidadReal;
    if (cambios.hechoPor !== undefined) fila.hecho_por = cambios.hechoPor;
    if (cambios.fechaHecho !== undefined) fila.fecha_hecho = cambios.fechaHecho;
    if (cambios.notas !== undefined) fila.notas = cambios.notas;
    const { error } = await supabase.from("tareas").update(fila).eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  const tareas = leerTareas();
  const i = tareas.findIndex((t) => t.id === id);
  if (i === -1) return;
  tareas[i] = { ...tareas[i], ...cambios };
  escribirTareas(tareas);
}

export async function borrarTarea(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("tareas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  escribirTareas(leerTareas().filter((t) => t.id !== id));
}

/* ---------------------- Conteos del congelador ---------------------- */

const ARCHIVO_CONTEOS = path.join(process.cwd(), ".data", "conteos.json");

function leerConteos(): Conteo[] {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_CONTEOS, "utf8"));
  } catch {
    return [];
  }
}

function escribirConteos(conteos: Conteo[]) {
  fs.mkdirSync(path.dirname(ARCHIVO_CONTEOS), { recursive: true });
  fs.writeFileSync(ARCHIVO_CONTEOS, JSON.stringify(conteos, null, 2));
}

type FilaConteo = {
  id: string;
  creado_en: string;
  fecha: string;
  area: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  contado_por: string;
  notas: string;
};

export async function listarConteos(): Promise<Conteo[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("conteos")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaConteo[]).map((f) => ({
      id: f.id,
      creadoEn: f.creado_en,
      fecha: f.fecha,
      area: f.area,
      nombre: f.nombre,
      gramaje: f.gramaje,
      cantidad: f.cantidad,
      contadoPor: f.contado_por,
      notas: f.notas,
    }));
  }
  return leerConteos().sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function crearConteo(conteo: Conteo): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("conteos").insert({
      id: conteo.id,
      creado_en: conteo.creadoEn,
      fecha: conteo.fecha,
      area: conteo.area,
      nombre: conteo.nombre,
      gramaje: conteo.gramaje,
      cantidad: conteo.cantidad,
      contado_por: conteo.contadoPor,
      notas: conteo.notas,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const conteos = leerConteos();
  conteos.push(conteo);
  escribirConteos(conteos);
}

export async function borrarConteo(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("conteos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }
  escribirConteos(leerConteos().filter((c) => c.id !== id));
}

/** Todas las tareas de preproducción, sin filtrar por semana. */
export async function listarTodasLasTareas(): Promise<Tarea[]> {
  if (supabase) {
    const { data, error } = await supabase.from("tareas").select("*").order("fecha");
    if (error) throw new Error(error.message);
    return (data as FilaTarea[]).map(aTarea);
  }
  return leerTareas().sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Todas las bajas registradas. */
export async function listarTodasLasBajas(): Promise<Baja[]> {
  if (supabase) {
    const { data, error } = await supabase.from("bajas").select("*").order("fecha");
    if (error) throw new Error(error.message);
    return (data as FilaBaja[]).map((f) => ({
      id: f.id,
      creadoEn: f.creado_en,
      fecha: f.fecha,
      productoId: f.producto_id,
      nombre: f.nombre,
      gramaje: f.gramaje,
      cantidad: f.cantidad,
      motivo: f.motivo,
    }));
  }
  return leerBajas().sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ---------------------- Limpieza y rutina ---------------------- */

const ARCHIVO_RUTINAS = path.join(process.cwd(), ".data", "rutinas.json");
const ARCHIVO_REGISTROS = path.join(process.cwd(), ".data", "registros-rutina.json");

function leerJson<T>(archivo: string): T[] {
  try {
    return JSON.parse(fs.readFileSync(archivo, "utf8"));
  } catch {
    return [];
  }
}

function escribirJson<T>(archivo: string, datos: T[]) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  fs.writeFileSync(archivo, JSON.stringify(datos, null, 2));
}

/** Se lanza cuando faltan las tablas de la rutina en Supabase (no se corrió esquema.sql). */
export class FaltanTablasRutina extends Error {}

function errorRutina(error: { code?: string; message: string }): never {
  // 42P01 = la tabla no existe; PGRST205 = Supabase no la encuentra.
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message)) {
    throw new FaltanTablasRutina(error.message);
  }
  throw new Error(error.message);
}

type FilaRutina = {
  id: string;
  creado_en: string;
  nombre: string;
  categoria: Rutina["categoria"];
  dias: number[];
  encargada: string;
  notas: string;
  orden: number;
};

type FilaRegistro = {
  id: string;
  rutina_id: string;
  fecha: string;
  hecho_por: string;
  hecho_en: string;
};

export async function listarRutinas(): Promise<Rutina[]> {
  if (supabase) {
    const { data, error } = await supabase.from("rutinas").select("*").order("orden");
    if (error) errorRutina(error);
    return (data as FilaRutina[]).map((f) => ({
      id: f.id,
      creadoEn: f.creado_en,
      nombre: f.nombre,
      categoria: f.categoria,
      dias: f.dias,
      encargada: f.encargada,
      notas: f.notas,
      orden: f.orden,
    }));
  }
  return leerJson<Rutina>(ARCHIVO_RUTINAS).sort((a, b) => a.orden - b.orden);
}

export async function crearRutina(r: Rutina): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("rutinas").insert({
      id: r.id,
      creado_en: r.creadoEn,
      nombre: r.nombre,
      categoria: r.categoria,
      dias: r.dias,
      encargada: r.encargada,
      notas: r.notas,
      orden: r.orden,
    });
    if (error) errorRutina(error);
    return;
  }
  escribirJson(ARCHIVO_RUTINAS, [...leerJson<Rutina>(ARCHIVO_RUTINAS), r]);
}

/** Cambia los días o las notas de una tarea fija sin perder su historial. */
export async function actualizarRutina(
  id: string,
  cambios: Partial<Pick<Rutina, "dias" | "notas" | "categoria" | "encargada">>,
): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("rutinas").update(cambios).eq("id", id);
    if (error) errorRutina(error);
    return;
  }
  escribirJson(
    ARCHIVO_RUTINAS,
    leerJson<Rutina>(ARCHIVO_RUTINAS).map((r) => (r.id === id ? { ...r, ...cambios } : r)),
  );
}

export async function borrarRutina(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("rutinas").delete().eq("id", id);
    if (error) errorRutina(error);
    return;
  }
  escribirJson(ARCHIVO_RUTINAS, leerJson<Rutina>(ARCHIVO_RUTINAS).filter((r) => r.id !== id));
}

export async function listarRegistrosRutina(desde: string, hasta: string): Promise<RegistroRutina[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("registros_rutina")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta);
    if (error) errorRutina(error);
    return (data as FilaRegistro[]).map((f) => ({
      id: f.id,
      rutinaId: f.rutina_id,
      fecha: f.fecha,
      hechoPor: f.hecho_por,
      hechoEn: f.hecho_en,
    }));
  }
  return leerJson<RegistroRutina>(ARCHIVO_REGISTROS).filter(
    (r) => r.fecha >= desde && r.fecha <= hasta,
  );
}

export async function crearRegistroRutina(r: RegistroRutina): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("registros_rutina").insert({
      id: r.id,
      rutina_id: r.rutinaId,
      fecha: r.fecha,
      hecho_por: r.hechoPor,
      hecho_en: r.hechoEn,
    });
    if (error) errorRutina(error);
    return;
  }
  escribirJson(ARCHIVO_REGISTROS, [...leerJson<RegistroRutina>(ARCHIVO_REGISTROS), r]);
}

export async function borrarRegistroRutina(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("registros_rutina").delete().eq("id", id);
    if (error) errorRutina(error);
    return;
  }
  escribirJson(
    ARCHIVO_REGISTROS,
    leerJson<RegistroRutina>(ARCHIVO_REGISTROS).filter((r) => r.id !== id),
  );
}

/* ---------------------- Clientes agregados desde el panel ---------------------- */

const ARCHIVO_CLIENTES = path.join(process.cwd(), ".data", "clientes-panel.json");

type FilaCliente = {
  id: string;
  creado_en: string;
  nombre: string;
  razon_social: string;
  direccion: string;
  telefono: string;
  gramaje: string;
  horario_entrega: string;
  domicilio: string;
  valor_unitario: string;
  tipo_pago: string;
  rete_iva: boolean;
  sabor_especial: string | null;
  activo: boolean;
};

const aCliente = (f: FilaCliente): Cliente => ({
  id: f.id,
  nombre: f.nombre,
  razonSocial: f.razon_social,
  direccion: f.direccion,
  telefono: f.telefono,
  gramaje: f.gramaje,
  horarioEntrega: f.horario_entrega,
  domicilio: f.domicilio,
  valorUnitario: f.valor_unitario,
  tipoPago: f.tipo_pago,
  reteIva: f.rete_iva,
  desarrollos: (f.sabor_especial ?? "").split(",").map((d) => d.trim()).filter(Boolean),
  activo: f.activo,
});

/** Los clientes agregados o editados en Clientes (activos e inactivos). */
export async function listarClientesPanel(): Promise<Cliente[]> {
  if (supabase) {
    const { data, error } = await supabase.from("clientes").select("*").order("nombre");
    if (error) {
      // Si todavía no se creó la tabla, se sigue solo con la base de clientes.
      if (error.code === "42P01" || error.code === "PGRST205") return [];
      throw new Error(error.message);
    }
    return (data as FilaCliente[]).map(aCliente);
  }
  return leerJson<Cliente>(ARCHIVO_CLIENTES);
}

/**
 * Guarda la ficha completa de un cliente. Sirve igual para uno nuevo y para
 * uno de la base (el CSV): su fila en Supabase manda sobre la del archivo.
 */
export async function guardarClientePanel(c: Cliente): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("clientes").upsert({
      id: c.id,
      nombre: c.nombre,
      razon_social: c.razonSocial,
      direccion: c.direccion,
      telefono: c.telefono,
      gramaje: c.gramaje,
      horario_entrega: c.horarioEntrega,
      domicilio: c.domicilio,
      valor_unitario: c.valorUnitario,
      tipo_pago: c.tipoPago,
      rete_iva: c.reteIva,
      sabor_especial: c.desarrollos.join(", "),
      activo: c.activo,
    });
    if (error) throw new Error(error.message);
    return;
  }
  const { interno: _interno, ...fila } = c;
  escribirJson(ARCHIVO_CLIENTES, [...leerJson<Cliente>(ARCHIVO_CLIENTES).filter((x) => x.id !== c.id), fila]);
}

/* ---------------------- Cronología de cada cliente ---------------------- */

const ARCHIVO_HISTORIAL = path.join(process.cwd(), ".data", "historial-clientes.json");

/** Se lanza cuando falta la tabla historial_clientes en Supabase (no se corrió esquema.sql). */
export class FaltaTablaHistorial extends Error {}

function errorHistorial(error: { code?: string; message: string }): never {
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|Could not find the table/i.test(error.message)) {
    throw new FaltaTablaHistorial(error.message);
  }
  throw new Error(error.message);
}

type FilaHistorial = {
  id: string;
  cliente_id: string;
  creado_en: string;
  fecha: string;
  tipo: EntradaHistorial["tipo"];
  texto: string;
  autor: string;
};

/** La cronología de un cliente, o de todos si no se dice cuál. */
export async function listarHistorialClientes(clienteId?: string): Promise<EntradaHistorial[]> {
  if (supabase) {
    let q = supabase.from("historial_clientes").select("*").order("creado_en", { ascending: false });
    if (clienteId) q = q.eq("cliente_id", clienteId);
    const { data, error } = await q;
    if (error) errorHistorial(error);
    return (data as FilaHistorial[]).map((f) => ({
      id: f.id,
      clienteId: f.cliente_id,
      creadoEn: f.creado_en,
      fecha: f.fecha,
      tipo: f.tipo,
      texto: f.texto,
      autor: f.autor,
    }));
  }
  return leerJson<EntradaHistorial>(ARCHIVO_HISTORIAL)
    .filter((e) => !clienteId || e.clienteId === clienteId)
    .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
}

export async function crearEntradaHistorial(e: EntradaHistorial): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("historial_clientes").insert({
      id: e.id,
      cliente_id: e.clienteId,
      creado_en: e.creadoEn,
      fecha: e.fecha,
      tipo: e.tipo,
      texto: e.texto,
      autor: e.autor,
    });
    if (error) errorHistorial(error);
    return;
  }
  escribirJson(ARCHIVO_HISTORIAL, [...leerJson<EntradaHistorial>(ARCHIVO_HISTORIAL), e]);
}

export async function borrarEntradaHistorial(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("historial_clientes").delete().eq("id", id);
    if (error) errorHistorial(error);
    return;
  }
  escribirJson(ARCHIVO_HISTORIAL, leerJson<EntradaHistorial>(ARCHIVO_HISTORIAL).filter((x) => x.id !== id));
}

/* ---------------------- Mínimos de stock editados en el panel ---------------------- */

const ARCHIVO_MINIMOS = path.join(process.cwd(), ".data", "minimos.json");

/** Mínimos cambiados desde Programar → Mínimos, por "NOMBRE|gramaje". */
export async function listarMinimosPanel(): Promise<Record<string, number>> {
  if (supabase) {
    const { data, error } = await supabase.from("minimos").select("*");
    if (error) {
      // Sin la tabla todavía, se usan solo los mínimos base.
      if (error.code === "42P01" || error.code === "PGRST205") return {};
      throw new Error(error.message);
    }
    return Object.fromEntries((data as { clave: string; minimo: number }[]).map((f) => [f.clave, f.minimo]));
  }
  return Object.fromEntries(leerJson<{ clave: string; minimo: number }>(ARCHIVO_MINIMOS).map((f) => [f.clave, f.minimo]));
}

/** Guarda un mínimo; con null vuelve al mínimo base. */
export async function guardarMinimoPanel(clave: string, minimo: number | null): Promise<void> {
  if (supabase) {
    const { error } =
      minimo === null
        ? await supabase.from("minimos").delete().eq("clave", clave)
        : await supabase.from("minimos").upsert({ clave, minimo });
    if (error) throw new Error(error.message);
    return;
  }
  const resto = leerJson<{ clave: string; minimo: number }>(ARCHIVO_MINIMOS).filter((f) => f.clave !== clave);
  escribirJson(ARCHIVO_MINIMOS, minimo === null ? resto : [...resto, { clave, minimo }]);
}

/* ---------------------- Ajustes que se cambian desde el panel ---------------------- */

const ARCHIVO_AJUSTES = path.join(process.cwd(), ".data", "ajustes.json");

/** Un ajuste guardado (la temporada, por ejemplo); null si no se ha guardado. */
export async function leerAjuste<T>(clave: string): Promise<T | null> {
  if (supabase) {
    const { data, error } = await supabase.from("ajustes").select("valor").eq("clave", clave).maybeSingle();
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") return null;
      throw new Error(error.message);
    }
    return (data?.valor as T) ?? null;
  }
  const fila = leerJson<{ clave: string; valor: T }>(ARCHIVO_AJUSTES).find((f) => f.clave === clave);
  return fila?.valor ?? null;
}

export async function guardarAjuste<T>(clave: string, valor: T): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("ajustes").upsert({ clave, valor });
    if (error) throw new Error(error.message);
    return;
  }
  escribirJson(ARCHIVO_AJUSTES, [
    ...leerJson<{ clave: string; valor: T }>(ARCHIVO_AJUSTES).filter((f) => f.clave !== clave),
    { clave, valor },
  ]);
}
