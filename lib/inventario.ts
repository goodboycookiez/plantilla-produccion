import { negocio } from "@/config/negocio";
import minimosJson from "@/data/minimos.json";
import {
  listarConteos,
  listarMuestras,
  listarPedidos,
  listarTodasLasBajas,
  listarMinimosPanel,
  listarTodasLasTareas,
} from "./db";
import { diaSemana, hoyLocal, sumarDias } from "./fechas";
import { gramajeDeItem, normalizarGramaje } from "./gramaje";
import { IDS_TEMPORADA, obtenerTemporada } from "./temporada";
import type { Conteo, Tarea } from "./tipos";

/**
 * Saldo de bolas en el congelador, por masa y gramaje.
 *
 * Se parte de un conteo físico,
 * se le suman las masas que la cocina marcó como hechas y se le resta lo que
 * se horneó para pedidos, las bajas y las muestras, hasta el siguiente conteo.
 */


export function normalizarNombre(n: string): string {
  return n
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Las llaves de config/negocio.ts, escritas igual que se comparan (mayúscula y sin tildes). */
function porNombre<T>(o: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [normalizarNombre(k), v]));
}

/**
 * Las reglas especiales de las masas están en config/negocio.ts → masas.
 *
 * Cuántas bolas de masa lleva una unidad. Casi siempre una; un sándwich
 * lleva dos (cada bola es una tapa).
 */
export const BOLAS_POR_GALLETA: Record<string, number> = porNombre(negocio.masas.bolasPorProducto);

/**
 * De qué tamaño es la bola de cada producto, cuando no coincide con el
 * gramaje del pedido (un sándwich de 90g con dos tapas de 50g).
 */
const GRAMAJE_DE_BOLA: Record<string, Record<string, string>> = porNombre(negocio.masas.tamanoDeBola);
const gramajeDeBola = (nombre: string, gramaje: string) => {
  const g = normalizarGramaje(gramaje);
  return GRAMAJE_DE_BOLA[normalizarNombre(nombre)]?.[g] ?? g;
};
const bolas = (nombre: string, unidades: number) =>
  unidades * (BOLAS_POR_GALLETA[normalizarNombre(nombre)] ?? 1);

/** Nombres distintos que salen de la misma masa: no llevan fila propia. */
const MISMA_MASA: Record<string, string> = Object.fromEntries(
  Object.entries(negocio.masas.mismaMasa).map(([k, v]) => [normalizarNombre(k), normalizarNombre(v)]),
);

/** Masas que solo se hacen en un gramaje: si se anotaron sin gramaje, es ese. */
const GRAMAJE_UNICO: Record<string, string> = porNombre(negocio.masas.tamanoUnico);

/**
 * Desde cuándo cuenta el stock. Los conteos anteriores quedan en el
 * historial, pero el cuadre arranca aquí. Vacío = desde el primer conteo.
 */
const INICIO_DEL_STOCK = negocio.inicioDelStock;

/** Lo que no se lleva en el stock de bolas del congelador. */
const FUERA_DEL_STOCK = new Set(negocio.masas.fueraDelStock.map(normalizarNombre));

/** El nombre de hoy del sabor de temporada (lo pone calcularInventario). */
let nombreTemporada = "";

export const clave = (nombre: string, gramaje: string) => {
  const n0 = normalizarNombre(nombre);
  const n = nombreTemporada && n0 === nombreTemporada ? "TEMPORADA" : n0;
  const masa = MISMA_MASA[n] ?? n;
  return `${masa}|${GRAMAJE_UNICO[masa] ?? normalizarGramaje(gramaje)}`;
};

/**
 * El mínimo base de una masa (data/minimos.json): primero el de esa masa y
 * gramaje, luego el de la masa en cualquier gramaje, luego el del gramaje.
 */
export function minimoBase(k: string): number | null {
  const [nombre, gramaje] = k.split("|");
  const porMasa = minimosJson.porMasa as Record<string, number>;
  const porGramaje = minimosJson.porGramaje as Record<string, number>;
  return porMasa[`${nombre}|${gramaje}`] ?? porMasa[`${nombre}|*`] ?? porGramaje[gramaje] ?? null;
}

/**
 * Una fila de la tabla de stock, para una semana (lunes a domingo).
 *
 * Arranca con el conteo con que cerró la semana anterior (el viernes o
 * sábado), le suma lo que la cocina preparó y le resta lo horneado, las bajas
 * y las muestras de la semana: eso es lo que debería haber. Al lado va el
 * conteo final de la semana y si cuadró. Si la masa no se había contado
 * antes, arranca con su primer conteo de la semana.
 */
export type FilaInventario = {
  nombre: string;
  gramaje: string;
  /** Conteo con que arrancó la semana. */
  habia: number | null;
  fechaHabia: string | null;
  /** Movimientos de la semana, desde ese conteo. */
  producido: number;
  horneado: number;
  bajas: number;
  muestras: number;
  /** Había + producido − horneado − bajas − muestras (al conteo final, o a hoy). */
  deberia: number | null;
  /** Hasta qué día va "deberia": la fecha del conteo final, o hoy. */
  deberiaAl: string | null;
  /** Conteo final de la semana: lo que se contó de verdad. */
  contado: number | null;
  fechaConteo: string | null;
  /** Contado menos lo que debería haber. */
  descuadre: number | null;
  /** Comprobaciones de en medio (el miércoles): lo contado y lo que debía haber ese día. */
  conteosIntermedios: { fecha: string; cantidad: number; deberia: number | null }[];
  /** Lo que debería haber hoy (solo en la semana en curso). */
  hoy: number | null;
  /** Cada entrada y salida de la semana, para revisar de dónde sale un descuadre. */
  movimientosPeriodo: Movimiento[];
  /** Lo que pasó después del conteo final, hasta hoy. */
  movimientosDespues: Movimiento[];
  /** Mínimo de stock de esta masa (si está definido) y qué tan urgente es hacerla. */
  minimo: number | null;
  urgencia: Urgencia | null;
};

/**
 * Cómo está una masa frente a su mínimo: agotado (no queda nada), crítico
 * (menos de la mitad del mínimo), bajo (hasta un 20% por encima del mínimo)
 * o suficiente.
 */
export type Urgencia = "agotado" | "critico" | "bajo" | "suficiente";

export function urgenciaDe(hay: number, minimo: number): Urgencia {
  if (hay <= 0) return "agotado";
  if (hay < minimo * 0.5) return "critico";
  if (hay <= minimo * 1.2) return "bajo";
  return "suficiente";
}

/** Algo que no cuadra y hay que revisar. */
export type Alerta = {
  nivel: "rojo" | "amarillo";
  nombre: string;
  gramaje: string;
  titulo: string;
  /** Qué puede estar pasando, en palabras de cocina. */
  causa: string;
  /** La fila del stock, para mostrar sus movimientos (no aplica a tareas sin marcar). */
  fila?: FilaInventario;
};

/** Un movimiento de bolas: entra con la preproducción, sale al hornear. */
export type Movimiento = {
  fecha: string;
  cantidad: number;
  tipo: "produccion" | "horneado" | "baja" | "muestra";
  /** Quién o para quién: "Persona 1 (esperado 150)", "#12 Café Ejemplo"… */
  detalle: string;
};

export async function calcularInventario(lunes: string): Promise<{
  filas: FilaInventario[];
  conteos: Conteo[];
  ultimoConteo: string | null;
  alertas: Alerta[];
  /** Cómo se llama hoy el sabor de temporada (la fila TEMPORADA). */
  temporada: string;
}> {
  const [conteos, tareas, pedidos, muestras, bajas, minimos, temporada] = await Promise.all([
    listarConteos(),
    listarTodasLasTareas(),
    listarPedidos(),
    listarMuestras(),
    listarTodasLasBajas(),
    listarMinimosPanel(),
    obtenerTemporada(),
  ]);
  nombreTemporada = normalizarNombre(temporada.nombre);
  // Lo de temporada se reconoce por su id, aunque el sabor haya cambiado de nombre.
  const nombreDe = (productoId: string, nombre: string) => (IDS_TEMPORADA.has(productoId) ? "TEMPORADA" : nombre);

  const movimientos = new Map<string, Movimiento[]>();
  const anotar = (nombre: string, gramaje: string, m: Movimiento) => {
    const k = clave(nombre, gramaje);
    movimientos.set(k, [...(movimientos.get(k) ?? []), m]);
  };

  // Entra: masas que la cocina marcó como hechas.
  for (const t of tareas) {
    if (t.tipo !== "masa" || !t.hecho) continue;
    anotar(t.nombre, t.gramaje, {
      fecha: t.fechaHecho ?? t.fecha,
      cantidad: t.cantidadReal ?? t.esperado ?? 0,
      tipo: "produccion",
      detalle: `Preproducción · ${t.hechoPor || "sin firma"}${
        t.esperado != null && t.cantidadReal != null && t.cantidadReal !== t.esperado
          ? ` (programado ${t.esperado})`
          : ""
      }`,
    });
  }

  // Sale: lo que se horneó para pedidos, solo cuando producción lo chuleó
  // (listo o entregado), con las cantidades ya ajustadas. Lo que todavía no
  // se chulea se guarda aparte para avisar.
  const sinChulear: { nombre: string; gramaje: string; fecha: string; detalle: string }[] = [];
  for (const p of pedidos) {
    if (p.estado === "cancelado") continue;
    if (p.estado !== "listo" && p.estado !== "entregado") {
      for (const i of p.items) {
        if (i.unidad === "kg") continue;
        const [nombre, gramaje] = clave(nombreDe(i.productoId, i.nombre), gramajeDeBola(i.nombre, gramajeDeItem(i, p))).split("|");
        sinChulear.push({ nombre, gramaje, fecha: p.fechaProduccion, detalle: `#${p.consecutivo} ${p.clienteNombre}` });
      }
      continue;
    }
    for (const i of p.items) {
      if (i.unidad === "kg") continue;
      anotar(nombreDe(i.productoId, i.nombre), gramajeDeBola(i.nombre, gramajeDeItem(i, p)), {
        fecha: p.fechaProduccion,
        cantidad: bolas(i.nombre, i.cantidad),
        tipo: "horneado",
        detalle: `Pedido #${p.consecutivo} · ${p.clienteNombre}${
          normalizarNombre(i.nombre) in BOLAS_POR_GALLETA ? ` (${i.cantidad} unidades de ${gramajeDeItem(i, p)})` : ""
        }`,
      });
    }
  }

  // Sale: muestras enviadas.
  for (const m of muestras) {
    anotar(nombreDe(m.productoId, m.nombre), gramajeDeBola(m.nombre, m.gramaje), {
      fecha: m.fecha,
      cantidad: bolas(m.nombre, m.cantidad),
      tipo: "muestra",
      detalle: `Muestra · ${m.prospecto}`,
    });
  }

  // Sale: bajas registradas.
  for (const b of bajas) {
    anotar(nombreDe(b.productoId, b.nombre), gramajeDeBola(b.nombre, b.gramaje), {
      fecha: b.fecha,
      cantidad: bolas(b.nombre, b.cantidad),
      tipo: "baja",
      detalle: `Baja${b.motivo ? ` · ${b.motivo}` : ""}`,
    });
  }

  // Si la misma masa se contó dos veces el mismo día en la misma área (se
  // guardó dos veces), vale el último conteo, no la suma.
  const ultimos = new Map<string, Conteo>();
  for (const c of conteos) {
    if (c.fecha < INICIO_DEL_STOCK) continue;
    const k = `${clave(c.nombre, c.gramaje)}|${c.fecha}|${c.area}`;
    const previo = ultimos.get(k);
    if (!previo || c.creadoEn > previo.creadoEn) ultimos.set(k, c);
  }

  // Conteos agrupados por masa y por fecha: las áreas de un mismo día se suman.
  const porClave = new Map<string, Map<string, number>>();
  for (const c of ultimos.values()) {
    const k = clave(c.nombre, c.gramaje);
    const porFecha = porClave.get(k) ?? new Map<string, number>();
    porFecha.set(c.fecha, (porFecha.get(c.fecha) ?? 0) + c.cantidad);
    porClave.set(k, porFecha);
  }

  const hoy = hoyLocal();
  const domingo = sumarDias(lunes, 6);
  const esEstaSemana = hoy >= lunes && hoy <= domingo;
  const claves = new Set([...movimientos.keys(), ...porClave.keys()]);
  const filas: FilaInventario[] = [];

  for (const k of claves) {
    const [nombre, gramaje] = k.split("|");
    if (FUERA_DEL_STOCK.has(nombre)) continue;
    const conteosMasa = porClave.get(k) ?? new Map<string, number>();
    const fechas = [...conteosMasa.keys()].sort();

    // Inicio: el último conteo antes del lunes; si no hay, el primero de la semana.
    const antes = fechas.filter((f) => f < lunes);
    const deLaSemana = fechas.filter((f) => f >= lunes && f <= domingo);
    const inicio = antes.at(-1) ?? deLaSemana[0] ?? null;
    // Final: el cierre de la semana, el conteo del viernes (o del fin de semana).
    // El del miércoles es solo una comprobación.
    const fin = deLaSemana.filter((f) => (!inicio || f > inicio) && diaSemana(f) >= 5).at(-1) ?? null;

    const míos = (movimientos.get(k) ?? []).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const enRango = (m: Movimiento, desde: string, hasta: string) => m.fecha > desde && m.fecha <= hasta;
    const saldoDe = (lista: Movimiento[]) =>
      suma(lista, "produccion") - suma(lista, "horneado") - suma(lista, "baja") - suma(lista, "muestra");

    // Hasta dónde se cuenta: el conteo final, o hoy (sin pasar del domingo).
    const hasta = fin ?? (hoy < domingo ? hoy : domingo);
    // Con conteo inicial se cuenta desde ahí; sin él igual se ve lo que se
    // movió en la semana, aunque no se pueda calcular el "debería haber".
    const periodo =
      hasta < lunes
        ? []
        : inicio
          ? míos.filter((m) => enRango(m, inicio, hasta))
          : míos.filter((m) => m.fecha >= lunes && m.fecha <= hasta);
    const habia = inicio ? (conteosMasa.get(inicio) as number) : null;
    const deberia = habia !== null && hasta >= (inicio ?? hasta) ? habia + saldoDe(periodo) : null;
    const contado = fin ? (conteosMasa.get(fin) as number) : null;
    const despues = fin && esEstaSemana ? míos.filter((m) => enRango(m, fin, hoy)) : [];

    // Una masa que no se movió ni se contó esta semana no ocupa fila.
    if (habia === null && periodo.length === 0 && !míos.some((m) => m.fecha >= lunes && m.fecha <= domingo)) continue;

    filas.push({
      nombre,
      gramaje,
      habia,
      fechaHabia: inicio,
      producido: suma(periodo, "produccion"),
      horneado: suma(periodo, "horneado"),
      bajas: suma(periodo, "baja"),
      muestras: suma(periodo, "muestra"),
      deberia,
      deberiaAl: deberia !== null ? hasta : null,
      contado,
      fechaConteo: fin,
      descuadre: contado !== null && deberia !== null ? contado - deberia : null,
      conteosIntermedios: deLaSemana
        .filter((f) => f !== inicio && f !== fin && (!inicio || f > inicio))
        .map((f) => ({
          fecha: f,
          cantidad: conteosMasa.get(f) as number,
          deberia: habia !== null ? habia + saldoDe(míos.filter((m) => enRango(m, inicio!, f))) : null,
        })),
      // Solo lo que ya pasó: los pedidos programados para mañana no han salido.
      hoy: !esEstaSemana ? null : contado !== null ? contado + saldoDe(despues) : deberia,
      movimientosPeriodo: periodo,
      movimientosDespues: despues,
      minimo: minimos[k] ?? minimoBase(k),
      // Con el cierre del viernes; mientras no lo hay, con lo que debería haber hoy.
      urgencia: (() => {
        const minimo = minimos[k] ?? minimoBase(k);
        const hay = contado ?? deberia;
        return minimo === null || hay === null ? null : urgenciaDe(hay, minimo);
      })(),
    });
  }

  filas.sort((a, b) => a.nombre.localeCompare(b.nombre) || a.gramaje.localeCompare(b.gramaje));

  const ultimoConteo = conteos.length
    ? conteos.reduce((max, c) => (c.fecha > max ? c.fecha : max), conteos[0].fecha)
    : null;

  return {
    filas,
    conteos,
    ultimoConteo,
    alertas: buscarAlertas(filas, tareas, hoy, lunes, sinChulear),
    temporada: temporada.nombre,
  };
}

/**
 * Lo que no cuadra entre lo que había, lo que preparó la cocina y lo que
 * salió a hornear. Primero lo grave (rojo), después lo que conviene revisar.
 */
function buscarAlertas(
  filas: FilaInventario[],
  tareas: Tarea[],
  hoy: string,
  lunes: string,
  sinChulear: { nombre: string; gramaje: string; fecha: string; detalle: string }[],
): Alerta[] {
  const alertas: Alerta[] = [];

  for (const f of filas) {
    const base = { nombre: f.nombre, gramaje: f.gramaje, fila: f };

    if (f.descuadre !== null && f.descuadre < 0) {
      alertas.push({
        ...base,
        nivel: "rojo",
        titulo: `Faltaron ${-f.descuadre} bolas en el cierre del ${corta(f.fechaConteo)}`,
        causa:
          "Salió más masa de la que está anotada: se hornearon galletas de más, hubo bajas sin anotar, o se usó esta masa para otro sabor o gramaje.",
      });
    } else if (f.descuadre !== null && f.descuadre > 0) {
      alertas.push({
        ...base,
        nivel: "rojo",
        titulo: `Sobraron ${f.descuadre} bolas en el cierre del ${corta(f.fechaConteo)}`,
        causa:
          "Hay más masa de la esperada: se preparó más de lo anotado, un pedido no se horneó (o se movió de día), o el conteo de inicio quedó corto.",
      });
    }

    if (f.hoy !== null && f.hoy < 0) {
      alertas.push({
        ...base,
        nivel: "rojo",
        titulo: `Se horneó más de lo que había: van ${f.hoy} bolas`,
        causa:
          "Esta semana salió más de lo que había más lo preparado. Seguramente falta anotar una preproducción, o se está horneando de otra masa.",
      });
    }

    if (f.habia === null) {
      alertas.push({
        ...base,
        nivel: "amarillo",
        titulo: "Se usa pero nunca se ha contado",
        causa: "Sin un conteo no se puede saber si cuadra. Inclúyela en el próximo conteo, aunque esté en 0.",
      });
    }
  }

  const domingo = sumarDias(lunes, 6);

  // Pedidos de esta semana, de hoy o antes, que producción no ha chuleado:
  // no se descuentan del stock hasta que se chuleen.
  const pendientes = new Map<string, string[]>();
  for (const p of sinChulear) {
    if (p.fecha < lunes || p.fecha > domingo || p.fecha > hoy || FUERA_DEL_STOCK.has(p.nombre)) continue;
    const k = `${p.nombre}|${p.gramaje}`;
    pendientes.set(k, [...new Set([...(pendientes.get(k) ?? []), `${p.detalle} (${corta(p.fecha)})`])]);
  }
  for (const [k, lista] of pendientes) {
    const [nombre, gramaje] = k.split("|");
    alertas.push({
      nivel: "amarillo",
      nombre,
      gramaje,
      titulo: `${lista.length} pedido${lista.length === 1 ? "" : "s"} sin chulear: ${lista.join(", ")}`,
      causa: "No se descuentan del stock hasta que producción los chulee en Producción.",
    });
  }

  // Preproducción de esta semana, de días que ya pasaron, que nadie marcó como hecha.
  for (const t of tareas) {
    if (t.tipo !== "masa" || t.hecho || t.fecha >= hoy || t.fecha < lunes || t.fecha > domingo) continue;
    const [nombre, gramaje] = clave(t.nombre, t.gramaje).split("|");
    if (FUERA_DEL_STOCK.has(nombre)) continue;
    alertas.push({
      nivel: "amarillo",
      nombre,
      gramaje,
      titulo: `Preproducción del ${corta(t.fecha)} sin marcar`,
      causa:
        "Si se hizo, falta anotarla (y el stock queda corto). Si no se hizo, muévela o bórrala en Programar.",
    });
  }

  return alertas.sort((a, b) => (a.nivel === b.nivel ? a.nombre.localeCompare(b.nombre) : a.nivel === "rojo" ? -1 : 1));
}

const suma = (lista: Movimiento[], tipo: Movimiento["tipo"]) =>
  lista.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.cantidad, 0);

const corta = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");
