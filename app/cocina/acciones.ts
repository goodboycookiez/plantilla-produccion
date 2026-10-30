"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actualizarMuestra,
  actualizarPedido,
  actualizarTarea,
  borrarBaja,
  borrarMuestra,
  borrarTarea,
  crearBaja,
  crearMuestra,
  borrarConteo,
  borrarRegistroRutina,
  borrarRutina,
  borrarEntradaHistorial,
  crearEntradaHistorial,
  FaltaTablaHistorial,
  guardarClientePanel,
  crearConteo,
  guardarMinimoPanel,
  listarMinimosPanel,
  crearPedido,
  crearRegistroRutina,
  actualizarRutina,
  crearRutina,
  listarRutinas,
  crearTarea,
  listarConteos,
  listarTodasLasTareas,
  listarPedidos,
  listarTareas,
} from "@/lib/db";
import listas from "@/data/listas.json";
import rutinasBase from "@/data/rutinas-base.json";
import { minimoBase } from "@/lib/inventario";
import {
  leerMuestras,
  leerPedidos,
  leerPlanSemanal,
  leerTexto,
  mismoNombre,
  separarSabores,
} from "@/lib/anotar";
import { gramajeDeItem, normalizarGramaje } from "@/lib/gramaje";
import { asegurarRutinaPausa, cambiarVideoPausa, idDeYoutube, ID_PAUSA, pausasEntre } from "@/lib/pausa";
import { aMasa, cambiarTemporada, listarProductos, obtenerTemporada, productosParaCliente } from "@/lib/temporada";
import { buscarCliente, listarClientes, listarTodosLosClientes } from "@/lib/clientes";
import { puedeProgramar, puedeVerClientes } from "@/lib/permisos";
import {
  diasDeLaSemana,
  esHabil,
  hoyLocal,
  lunesDeLaSemana,
  siguienteHabil,
  sumarDias,
} from "@/lib/fechas";
import type {
  CategoriaRutina,
  EntradaHistorial,
  EstadoCliente,
  EstadoPedido,
  ItemPedido,
  SeguimientoMuestra,
  TipoTarea,
} from "@/lib/tipos";

const ESTADOS: EstadoPedido[] = ["recibido", "en_produccion", "listo", "entregado", "cancelado"];

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function refrescarCocina() {
  revalidatePath("/cocina/preproduccion");
  revalidatePath("/cocina/programar");
  revalidatePath("/cocina/inventario");
}

function refrescar() {
  revalidatePath("/cocina");
  revalidatePath("/cocina/pedidos");
  revalidatePath("/cocina/inventario");
}

/** El chulé: marca el pedido como listo, o lo devuelve a recibido. */
export async function alternarListo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const estadoActual = String(formData.get("estado") ?? "");
  if (!id) return;
  await actualizarPedido(id, { estado: estadoActual === "listo" ? "recibido" : "listo" });
  refrescar();
}

export async function cambiarEstado(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoPedido;
  if (!id || !ESTADOS.includes(estado)) return;
  await actualizarPedido(id, { estado });
  refrescar();
}

/** Mueve un pedido a otro día de producción; la entrega corre con él. */
export async function moverPedido(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fechaProduccion = String(formData.get("fechaProduccion") ?? "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(fechaProduccion) || !esHabil(fechaProduccion)) return;

  const pedidos = await listarPedidos();
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido || pedido.fechaProduccion === fechaProduccion) return;

  await actualizarPedido(id, {
    fechaProduccion,
    fechaEntrega: siguienteHabil(fechaProduccion),
  });
  refrescar();
}

/** Las filas sabor · gramaje · cantidad de un formulario (ver FilasSabores). */
async function filasDeSabores(formData: FormData) {
  const productos = await listarProductos();
  const ids = formData.getAll("productoId").map(String);
  const gramajes = formData.getAll("gramaje").map(String);
  const cantidades = formData.getAll("cantidad").map((c) => Math.floor(Number(c)));
  return ids
    .map((id, n) => ({
      producto: productos.find((p) => p.id === id),
      gramaje: normalizarGramaje(gramajes[n] || "90g"),
      cantidad: cantidades[n],
    }))
    .filter((f) => f.producto && Number.isFinite(f.cantidad) && f.cantidad > 0);
}

export async function registrarBaja(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  const motivo = String(formData.get("motivo") ?? "").slice(0, 200);

  for (const f of await filasDeSabores(formData)) {
    await crearBaja({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      fecha,
      productoId: f.producto!.id,
      nombre: f.producto!.nombre,
      gramaje: f.gramaje,
      cantidad: f.cantidad,
      motivo,
    });
  }
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
}

export async function eliminarBaja(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarBaja(id);
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
}

export async function registrarMuestra(formData: FormData) {
  const prospecto = String(formData.get("prospecto") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  if (!prospecto || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;

  for (const f of await filasDeSabores(formData)) {
    await crearMuestra({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      fecha,
      prospecto: prospecto.slice(0, 120),
      contacto: String(formData.get("contacto") ?? "").slice(0, 120),
      productoId: f.producto!.id,
      nombre: f.producto!.nombre,
      gramaje: f.gramaje,
      cantidad: f.cantidad,
      notas: String(formData.get("notas") ?? "").slice(0, 200),
      seguimiento: "enviada",
    });
  }
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
}

export async function cambiarSeguimiento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const seguimiento = String(formData.get("seguimiento") ?? "") as SeguimientoMuestra;
  const validos: SeguimientoMuestra[] = ["enviada", "interesado", "cliente", "sin_interes"];
  if (!id || !validos.includes(seguimiento)) return;
  await actualizarMuestra(id, { seguimiento });
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
}

/**
 * Cambia una muestra ya agendada: las cantidades de cada sabor y la nota,
 * que es la misma para todos los sabores de esa persona. Una cantidad en
 * cero quita ese sabor.
 */
export async function ajustarMuestraAgendada(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ids.length === 0) return;

  const notas = String(formData.get("notas") ?? "").slice(0, 200);
  for (const id of ids) {
    const cantidad = Math.floor(Number(formData.get(`cantidad-${id}`) ?? NaN));
    if (Number.isFinite(cantidad) && cantidad <= 0) {
      await borrarMuestra(id);
      continue;
    }
    await actualizarMuestra(id, {
      notas,
      ...(Number.isFinite(cantidad) && cantidad > 0 ? { cantidad } : {}),
    });
  }
  refrescar();
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
  revalidatePath("/cocina/resumen");
}

/** Pasa la muestra completa a otro día de producción. */
export async function moverMuestra(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const fecha = String(formData.get("fecha") ?? "");
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!ES_FECHA.test(fecha) || ids.length === 0) return;

  for (const id of ids) await actualizarMuestra(id, { fecha });
  refrescar();
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
  revalidatePath("/cocina/resumen");
}

/** Quita la muestra completa: todos los sabores que le iban a esa persona. */
export async function eliminarMuestraCompleta(formData: FormData) {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (ids.length === 0) return;
  for (const id of ids) await borrarMuestra(id);
  refrescar();
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
  revalidatePath("/cocina/resumen");
}

export async function eliminarMuestra(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarMuestra(id);
  refrescar();
  revalidatePath("/cocina/inventario");
  revalidatePath("/cocina/muestras");
  revalidatePath("/cocina/resumen");
}

/* -------------------------- Preproducción -------------------------- */

const TIPOS: TipoTarea[] = ["masa", "relleno", "topping", "actividad"];

export async function crearTareaAccion(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const fecha = String(formData.get("fecha") ?? "");
  const tipo = String(formData.get("tipo") ?? "") as TipoTarea;
  const nombre = aMasa(String(formData.get("nombre") ?? "").trim(), await obtenerTemporada());
  if (!ES_FECHA.test(fecha) || !TIPOS.includes(tipo) || !nombre) return;

  const esperadoCrudo = Number(formData.get("esperado") ?? 0);

  // Va de última en la fila de ese día; el orden se cambia con las flechas.
  const delDia = await listarTareas(fecha, fecha);
  const orden = delDia.reduce((max, t) => Math.max(max, t.orden), 0) + 1;

  await crearTarea({
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    fecha,
    orden,
    tipo,
    nombre: nombre.slice(0, 120),
    gramaje: String(formData.get("gramaje") ?? ""),
    lote: String(formData.get("lote") ?? "").slice(0, 40),
    esperado: Number.isFinite(esperadoCrudo) && esperadoCrudo > 0 ? esperadoCrudo : null,
    encargada: String(formData.get("encargada") ?? "").slice(0, 60),
    horario: String(formData.get("horario") ?? "").slice(0, 60),
    notas: String(formData.get("notas") ?? "").slice(0, 200),
    hecho: false,
    cantidadReal: null,
    hechoPor: "",
    fechaHecho: null,
  });
  refrescarCocina();
}

/** Mueve una tarea a otro día: es el calendario que se acomoda a mano. */
export async function moverTarea(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const id = String(formData.get("id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;
  const delDia = await listarTareas(fecha, fecha);
  const orden = delDia.reduce((max, t) => Math.max(max, t.orden), 0) + 1;
  await actualizarTarea(id, { fecha, orden });
  refrescarCocina();
}

/** Quien cocina firma la tarea: quién la hizo y cuánto salió de verdad. */
export async function marcarTarea(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  if (formData.get("deshacer") === "si") {
    await actualizarTarea(id, {
      hecho: false,
      cantidadReal: null,
      hechoPor: "",
      fechaHecho: null,
    });
    refrescarCocina();
    return;
  }

  const hechoPor = String(formData.get("hechoPor") ?? "").trim();
  const otra = String(formData.get("otra") ?? "").trim();
  const quien = (hechoPor === "otra" ? otra : hechoPor).slice(0, 60);
  if (!quien) return;

  const real = Number(formData.get("cantidadReal") ?? 0);
  // Masas, rellenos y toppings no se marcan sin la cantidad real: es la que va al stock.
  const tarea = (await listarTodasLasTareas()).find((t) => t.id === id);
  if (tarea && tarea.tipo !== "actividad" && !(Number.isFinite(real) && real > 0)) return;
  await actualizarTarea(id, {
    hecho: true,
    cantidadReal: Number.isFinite(real) && real > 0 ? real : null,
    hechoPor: quien,
    fechaHecho: hoyLocal(),
  });
  refrescarCocina();
}

export async function eliminarTarea(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarTarea(id);
  refrescarCocina();
}

/* ------------------------- Conteo físico ------------------------- */

export async function registrarConteo(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const cantidad = Math.floor(Number(formData.get("cantidad") ?? -1));
  if (!ES_FECHA.test(fecha) || !nombre || !area) return;
  if (!Number.isFinite(cantidad) || cantidad < 0) return;

  await crearConteo({
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    fecha,
    area: area.slice(0, 60),
    nombre: nombre.slice(0, 120),
    gramaje: String(formData.get("gramaje") ?? ""),
    cantidad,
    contadoPor: String(formData.get("contadoPor") ?? "").slice(0, 60),
    notas: String(formData.get("notas") ?? "").slice(0, 200),
  });
  revalidatePath("/cocina/inventario");
}

export async function eliminarConteo(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarConteo(id);
  revalidatePath("/cocina/inventario");
}

/* ---------------------- Anotado a mano por la cocina ---------------------- */

const CONOCIDOS = [...listas.masas, ...listas.rellenos, ...listas.toppings];

/** Las masas conocidas más el nombre de hoy del sabor de temporada. */
async function conocidosConTemporada(base: string[]) {
  const t = await obtenerTemporada();
  return { conocidos: [...base, t.nombre], t };
}

/**
 * "Chocolate 70g 150": lo que la cocina hizo en el día. Si ya estaba programado,
 * se marca esa tarea como hecha; si no, se crea hecha.
 */
export async function anotarHecho(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 60);
  if (!ES_FECHA.test(fecha) || !quien) return;

  const { conocidos, t } = await conocidosConTemporada(CONOCIDOS);
  const lineas = leerTexto(String(formData.get("texto") ?? ""), conocidos)
    .filter((l) => !l.falta)
    .map((l) => ({ ...l, nombre: aMasa(l.nombre, t), gramaje: normalizarGramaje(l.gramaje) }));
  const delDia = await listarTareas(fecha, fecha);
  let orden = delDia.reduce((max, t) => Math.max(max, t.orden), 0);

  for (const l of lineas) {
    const firma = {
      hecho: true,
      cantidadReal: l.cantidad,
      hechoPor: quien,
      fechaHecho: hoyLocal(),
    };
    const programada = delDia.find(
      (t) => !t.hecho && mismoNombre(t.nombre, l.nombre) && (!l.gramaje || !t.gramaje || t.gramaje === l.gramaje),
    );
    if (programada) {
      programada.hecho = true;
      await actualizarTarea(programada.id, firma);
      continue;
    }
    await crearTarea({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      fecha,
      orden: ++orden,
      tipo: listas.rellenos.some((r) => mismoNombre(r, l.nombre))
        ? "relleno"
        : listas.toppings.some((r) => mismoNombre(r, l.nombre))
          ? "topping"
          : "masa",
      nombre: l.nombre.slice(0, 120),
      gramaje: l.gramaje,
      lote: "",
      esperado: null,
      encargada: quien,
      horario: "",
      notas: "",
      ...firma,
    });
  }
  refrescarCocina();
}

/** "Chocolate 70g 150": conteo del congelador escrito a mano, una línea por masa. */
export async function anotarConteo(formData: FormData) {
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 60);
  const area = String(formData.get("area") ?? "") || listas.areas[0];
  const { conocidos: masas, t: temp } = await conocidosConTemporada(listas.masas);
  const lineas = leerTexto(String(formData.get("texto") ?? ""), masas)
    .filter((l) => !l.falta)
    .map((l) => ({ ...l, nombre: aMasa(l.nombre, temp), gramaje: normalizarGramaje(l.gramaje) }));
  // El día del conteo: hoy, o uno de las dos últimas semanas para completar
  // un conteo que quedó a medias.
  const hoy = hoyLocal();
  const pedida = String(formData.get("fecha") ?? "");
  const fecha = ES_FECHA.test(pedida) && pedida <= hoy && pedida >= sumarDias(hoy, -14) ? pedida : hoy;

  // La misma masa en dos líneas (dos bolsas, por ejemplo) se suma.
  const porMasa = new Map<string, { nombre: string; gramaje: string; cantidad: number }>();
  for (const l of lineas) {
    const k = `${l.nombre.toUpperCase()}|${l.gramaje}`;
    const fila = porMasa.get(k) ?? { nombre: l.nombre, gramaje: l.gramaje, cantidad: 0 };
    fila.cantidad += Math.max(0, Math.floor(l.cantidad ?? 0));
    porMasa.set(k, fila);
  }

  // Volver a contar una masa el mismo día reemplaza el conteo anterior.
  const deHoy = (await listarConteos()).filter((c) => c.fecha === fecha && c.area === area);
  for (const [k] of porMasa) {
    for (const c of deHoy.filter((c) => `${c.nombre.toUpperCase()}|${normalizarGramaje(c.gramaje)}` === k)) {
      await borrarConteo(c.id);
    }
  }

  for (const m of porMasa.values()) {
    await crearConteo({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      fecha,
      area: area.slice(0, 60),
      nombre: m.nombre.slice(0, 120),
      gramaje: m.gramaje,
      cantidad: m.cantidad,
      contadoPor: quien,
      notas: "",
    });
  }
  revalidatePath("/cocina/inventario");
}

/* ------------------------- Limpieza y rutina ------------------------- */

const CATEGORIAS: CategoriaRutina[] = ["limpieza", "inventario", "otra"];

function refrescarRutina() {
  revalidatePath("/cocina/limpieza");
  revalidatePath("/cocina/programar/rutina");
}

/** Nueva tarea fija: se repite cada semana en los días elegidos. */
export async function crearRutinaAccion(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "") as CategoriaRutina;
  const dias = formData
    .getAll("dias")
    .map(Number)
    .filter((d) => d >= 1 && d <= 6);
  if (!nombre || !CATEGORIAS.includes(categoria) || dias.length === 0) return;

  const orden = (await listarRutinas()).reduce((max, r) => Math.max(max, r.orden), 0) + 1;
  await crearRutina({
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    nombre: nombre.slice(0, 120),
    categoria,
    dias: [...new Set(dias)].sort(),
    encargada: String(formData.get("encargada") ?? "").slice(0, 60),
    notas: String(formData.get("notas") ?? "").slice(0, 200),
    orden,
  });
  refrescarRutina();
}

export async function borrarRutinaAccion(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarRutina(id);
  refrescarRutina();
}

/** Quien la hizo firma la rutina del día. */
export async function marcarRutina(formData: FormData) {
  const rutinaId = String(formData.get("rutinaId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 60);
  if (!rutinaId || !ES_FECHA.test(fecha) || !quien) return;
  await crearRegistroRutina({
    id: crypto.randomUUID(),
    rutinaId,
    fecha,
    hechoPor: quien,
    hechoEn: new Date().toISOString(),
  });
  refrescarRutina();
}

export async function deshacerRutina(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarRegistroRutina(id);
  refrescarRutina();
  // Si era una pausa activa, el aviso tiene que volver a enterarse.
  revalidatePath("/cocina", "layout");
}

/* ------------------------- Pausa activa ------------------------- */

/** Marca la pausa activa de un día para las que la hicieron (se puede elegir a varias). */
export async function marcarPausa(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  const quienes = formData.getAll("quien").map(String).filter((q) => listas.equipo.includes(q));
  if (!ES_FECHA.test(fecha) || quienes.length === 0) return;

  await asegurarRutinaPausa();
  const ya = new Set((await pausasEntre(fecha, fecha)).map((r) => r.hechoPor));
  for (const quien of quienes.filter((q) => !ya.has(q))) {
    await crearRegistroRutina({
      id: crypto.randomUUID(),
      rutinaId: ID_PAUSA,
      fecha,
      hechoPor: quien,
      hechoEn: new Date().toISOString(),
    });
  }
  refrescarRutina();
  // El aviso vive en el layout de la cocina: así se cierra en todas las pantallas.
  revalidatePath("/cocina", "layout");
}

/** El video de YouTube que sale en la pausa activa. */
export async function guardarVideoPausa(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const video = String(formData.get("video") ?? "").trim();
  if (video && !idDeYoutube(video)) return;
  await cambiarVideoPausa(video);
  revalidatePath("/cocina", "layout");
}

/**
 * Programar escribiendo. Se puede planear un día o la semana entera de
 * corrido, anunciando cada día por su nombre:
 *
 *   LUNES
 *   avena 50g 1 triple persona 2
 *   MARTES
 *   vainilla 70g 1 triple persona 1
 *
 * Lo que se escribe antes del primer día va al día elegido en el selector.
 */
export async function programarTexto(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const fecha = String(formData.get("fecha") ?? "");
  if (!ES_FECHA.test(fecha)) return;

  const lunes = lunesDeLaSemana(fecha);
  const dias = [...diasDeLaSemana(lunes), sumarDias(lunes, 5)];

  const { conocidos: conTemporada, t: tempo } = await conocidosConTemporada(CONOCIDOS);
  const grupos = leerPlanSemanal(
    String(formData.get("texto") ?? ""),
    dias,
    fecha,
    conTemporada,
    listas.equipo,
  );

  for (const grupo of grupos) {
    const delDia = await listarTareas(grupo.fecha, grupo.fecha);
    let orden = delDia.reduce((max, t) => Math.max(max, t.orden), 0);

    for (const l of grupo.lineas) {
      if (l.falta) continue;
      const tipo: TipoTarea = l.esActividad
        ? "actividad"
        : listas.rellenos.some((r) => mismoNombre(r, l.nombre))
          ? "relleno"
          : listas.toppings.some((r) => mismoNombre(r, l.nombre))
            ? "topping"
            : "masa";
      await crearTarea({
        id: crypto.randomUUID(),
        creadoEn: new Date().toISOString(),
        fecha: grupo.fecha,
        orden: ++orden,
        tipo,
        nombre: aMasa(l.nombre, tempo).slice(0, 120),
        gramaje: normalizarGramaje(l.gramaje),
        lote: l.lote,
        esperado: l.esperado,
        encargada: l.encargada,
        horario: "",
        notas: "",
        hecho: false,
        cantidadReal: null,
        hechoPor: "",
        fechaHecho: null,
      });
    }
  }
  refrescarCocina();
}

/* ------------------------- Pedido escrito desde el panel ------------------------- */

/**
 * Pedido que llega por WhatsApp y se programa desde el panel. Va al mismo
 * calendario y al mismo stock que los del formulario. Si el día se pasa de
 * la capacidad, igual se guarda: el calendario lo muestra en rojo.
 */
/**
 * Junta los sabores leídos en los items del pedido: el mismo sabor en el mismo
 * gramaje se suma; en otro gramaje va aparte ("Avena 90g 6, Avena 70g 4").
 * Solo se guarda el gramaje del sabor cuando es distinto al del pedido.
 */
function armarItems(
  lineas: { producto: { id: string; nombre: string; unidad: string } | null | undefined; cantidad: number; gramaje: string }[],
  gramajePedido: string,
): ItemPedido[] {
  const porClave = new Map<string, ItemPedido>();
  for (const l of lineas) {
    if (!l.producto || l.cantidad <= 0) continue;
    const unidad = l.producto.unidad as ItemPedido["unidad"];
    const gramaje = unidad === "kg" || !l.gramaje ? "" : normalizarGramaje(l.gramaje);
    const propio = gramaje && gramaje !== gramajePedido ? gramaje : "";
    const clave = `${l.producto.id}|${propio}`;
    const item = porClave.get(clave) ?? {
      productoId: l.producto.id,
      nombre: l.producto.nombre,
      cantidad: 0,
      unidad,
      ...(propio ? { gramaje: propio } : {}),
    };
    item.cantidad += l.cantidad;
    porClave.set(clave, item);
  }
  return [...porClave.values()];
}

const totales = (items: ItemPedido[]) => ({
  totalUnidades: items.filter((i) => i.unidad === "unidad").reduce((s, i) => s + i.cantidad, 0),
  totalKilos: items.filter((i) => i.unidad === "kg").reduce((s, i) => s + i.cantidad, 0),
});

/** Id de los pedidos que no son de un punto de distribución (una persona, una caja x6…). */
const CLIENTE_EXTRA = "extra";

export async function crearPedidoEscrito(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const clienteId = String(formData.get("clienteId") ?? "");
  const fechaProduccion = String(formData.get("fechaProduccion") ?? "");
  if (!ES_FECHA.test(fechaProduccion) || !esHabil(fechaProduccion)) return;

  // Un pedido extra no sale de la base: se escribe a nombre de quién va.
  const esExtra = clienteId === CLIENTE_EXTRA;
  const cliente = esExtra ? null : await buscarCliente(clienteId);
  const nombreExtra = String(formData.get("nombreExtra") ?? "").trim().slice(0, 120);
  if (esExtra ? !nombreExtra : !cliente) return;

  const catalogo = await productosParaCliente(cliente?.id ?? "", cliente?.desarrollos ?? []);
  const gramaje = normalizarGramaje(String(formData.get("gramaje") ?? "") || cliente?.gramaje || "90g");
  const lineas = leerTexto(separarSabores(String(formData.get("texto") ?? "")), catalogo.map((p) => p.nombre));
  const items = armarItems(
    lineas.map((l) => ({
      producto: catalogo.find((p) => mismoNombre(p.nombre, l.nombre)),
      cantidad: Math.floor(l.cantidad ?? 0),
      gramaje: l.gramaje,
    })),
    gramaje,
  );
  if (items.length === 0) return;

  const telefono = String(formData.get("telefonoExtra") ?? "").trim().slice(0, 40);
  const notas = [telefono && `Tel ${telefono}`, String(formData.get("notas") ?? "").trim()]
    .filter(Boolean)
    .join(" · ");
  await crearPedido({
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    clienteId: cliente?.id ?? CLIENTE_EXTRA,
    clienteNombre: cliente?.nombre ?? nombreExtra,
    direccion: cliente?.direccion ?? String(formData.get("direccionExtra") ?? "").trim().slice(0, 200),
    gramaje,
    items,
    ...totales(items),
    fechaProduccion,
    fechaEntrega: siguienteHabil(fechaProduccion),
    esEvento: formData.get("esEvento") === "on",
    notas: notas.slice(0, 1000),
    ordenCompra: null,
    estado: "recibido",
  });
  refrescar();
  revalidatePath("/cocina/inventario");
}

/**
 * Varios pedidos escritos de una vez ("Café Ejemplo: Chocolate 10, Vainilla 5" por línea).
 * Se guardan los que tienen cliente claro (o son "Extra Nombre") y al menos un
 * sabor válido; las líneas con problemas se saltan (en pantalla ya se ven en rojo).
 */
export async function crearPedidosVarios(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const fechaProduccion = String(formData.get("fechaProduccion") ?? "");
  if (!ES_FECHA.test(fechaProduccion) || !esHabil(fechaProduccion)) return;

  const [clientes, productos] = await Promise.all([listarClientes(), listarProductos()]);
  const leidos = leerPedidos(String(formData.get("texto") ?? ""), clientes, productos);
  for (const p of leidos) {
    if (!p.cliente && !p.extra) continue;
    const cliente = p.cliente ? clientes.find((c) => c.id === p.cliente!.id)! : null;
    const gramaje = normalizarGramaje(p.gramaje || cliente?.gramaje || "90g");
    const items = armarItems(
      p.items
        .filter((i) => !i.problema)
        .map((i) => ({ producto: i.producto, cantidad: i.cantidad ?? 0, gramaje: i.gramaje })),
      gramaje,
    );
    if (items.length === 0) continue;

    await crearPedido({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      clienteId: cliente?.id ?? CLIENTE_EXTRA,
      clienteNombre: cliente?.nombre ?? p.extra.slice(0, 120),
      direccion: cliente?.direccion ?? "",
      gramaje,
      items,
      ...totales(items),
      fechaProduccion,
      fechaEntrega: siguienteHabil(fechaProduccion),
      esEvento: false,
      notas: p.notas.slice(0, 1000),
      ordenCompra: null,
      estado: "recibido",
    });
  }
  refrescar();
  revalidatePath("/cocina/inventario");
}

/**
 * Cuando un pedido no se puede completar: se corrigen las cantidades que de
 * verdad salieron, y si hace falta el gramaje. Queda anotado en las notas qué cambió; si todo queda en
 * cero, el pedido se cancela. Así el stock descuenta lo que salió de verdad.
 */
export async function ajustarCantidades(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const pedido = (await listarPedidos()).find((p) => p.id === id);
  if (!pedido) return;

  const cambios: string[] = [];
  const items = pedido.items
    .map((i, n) => {
      let nuevo = i;
      const crudo = formData.get(`cantidad-${n}`);
      const cantidad = crudo === null || crudo === "" ? i.cantidad : Math.max(0, Math.floor(Number(crudo)));
      if (Number.isFinite(cantidad) && cantidad !== i.cantidad) {
        cambios.push(`${i.nombre} ${i.cantidad}→${cantidad}`);
        nuevo = { ...nuevo, cantidad };
      }
      // Cada sabor guarda su gramaje solo si es distinto al del pedido.
      const antes = gramajeDeItem(i, pedido);
      const gramaje = normalizarGramaje(String(formData.get(`gramaje-${n}`) ?? "") || antes);
      if (i.unidad !== "kg" && gramaje !== antes) {
        cambios.push(`${i.nombre} ${antes}→${gramaje}`);
        const { gramaje: _viejo, ...sinGramaje } = nuevo;
        nuevo = gramaje === normalizarGramaje(pedido.gramaje) ? sinGramaje : { ...sinGramaje, gramaje };
      }
      return nuevo;
    })
    .filter((i) => i.cantidad > 0);
  // Si todos quedaron en el mismo gramaje, ese pasa a ser el del pedido.
  const gramajes = [...new Set(items.filter((i) => i.unidad !== "kg").map((i) => gramajeDeItem(i, pedido)))];
  const gramajeNuevo = gramajes.length === 1 ? gramajes[0] : normalizarGramaje(pedido.gramaje);
  const cambiaGramaje = gramajeNuevo !== normalizarGramaje(pedido.gramaje);
  if (cambiaGramaje) {
    for (let k = 0; k < items.length; k++) {
      const { gramaje: _g, ...resto } = items[k];
      items[k] = resto;
    }
  }
  if (cambios.length === 0) return;

  const nota = `Ajustado ${hoyLocal().slice(8)}/${hoyLocal().slice(5, 7)}: ${cambios.join(", ")}`;
  const notas = [pedido.notas, nota].filter(Boolean).join(" · ").slice(0, 1000);
  if (items.length === 0) {
    // Nada salió: se cancela y se deja como estaba, para que se vea qué era.
    await actualizarPedido(id, { estado: "cancelado", notas });
  } else {
    await actualizarPedido(id, {
      items,
      totalUnidades: items.filter((i) => i.unidad === "unidad").reduce((s, i) => s + i.cantidad, 0),
      totalKilos: items.filter((i) => i.unidad === "kg").reduce((s, i) => s + i.cantidad, 0),
      notas,
      ...(cambiaGramaje ? { gramaje: gramajeNuevo } : {}),
    });
  }
  refrescar();
  revalidatePath("/cocina/inventario");
}

/* ------------------------- Clientes desde el panel ------------------------- */

const slugCliente = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function refrescarClientes() {
  revalidatePath("/pedido");
  revalidatePath("/cocina/clientes", "layout");
  revalidatePath("/cocina/programar/pedidos");
}

/** Los campos de la ficha del cliente. */
function leerFichaCliente(formData: FormData) {
  const texto = (k: string, max = 200) => String(formData.get(k) ?? "").trim().slice(0, max);
  return {
    nombre: texto("nombre", 80),
    razonSocial: texto("razonSocial"),
    direccion: texto("direccion"),
    telefono: texto("telefono", 40),
    gramaje: normalizarGramaje(texto("gramaje", 10) || "90g"),
    horarioEntrega: texto("horarioEntrega", 40),
    domicilio: texto("domicilio", 60),
    valorUnitario: texto("valorUnitario", 60),
    tipoPago: texto("tipoPago", 20),
    reteIva: formData.get("reteIva") === "on",
    desarrollos: texto("saborEspecial", 200)
      .split(/[,\n]/)
      .map((d) => d.trim().toUpperCase())
      .filter(Boolean),
  };
}

/** Anota en la cronología; si falta la tabla en Supabase, el cambio se guarda igual sin anotarse. */
async function anotarEnHistorial(clienteId: string, tipo: EntradaHistorial["tipo"], texto: string, autor = "") {
  try {
    await crearEntradaHistorial({
      id: crypto.randomUUID(),
      clienteId,
      creadoEn: new Date().toISOString(),
      fecha: hoyLocal(),
      tipo,
      texto: texto.slice(0, 1000),
      autor,
    });
  } catch (e) {
    if (!(e instanceof FaltaTablaHistorial)) throw e;
  }
}

/** Cliente nuevo: queda de inmediato en el formulario de pedidos. */
export async function crearClienteAccion(formData: FormData) {
  if (!(await puedeVerClientes())) return;
  const ficha = leerFichaCliente(formData);
  if (!ficha.nombre) return;

  // El id sale del nombre, como en la base; si ya existe, se le agrega un número.
  const existentes = new Set((await listarTodosLosClientes()).map((c) => c.id));
  let id = slugCliente(ficha.nombre) || "cliente";
  for (let n = 2; existentes.has(id); n++) id = `${slugCliente(ficha.nombre)}-${n}`;

  await guardarClientePanel({ id, ...ficha, activo: true });
  await anotarEnHistorial(id, "estado", "activo · cliente nuevo");
  refrescarClientes();
  redirect(`/cocina/clientes/${id}`);
}

const CAMPOS_CLIENTE: [keyof ReturnType<typeof leerFichaCliente>, string][] = [
  ["nombre", "Nombre"],
  ["razonSocial", "Razón social"],
  ["direccion", "Dirección"],
  ["telefono", "Número"],
  ["gramaje", "Tamaño"],
  ["horarioEntrega", "Horario de entrega"],
  ["valorUnitario", "Valor individual"],
  ["domicilio", "Domicilio"],
  ["tipoPago", "Pago"],
  ["reteIva", "Reteiva"],
  ["desarrollos", "Sabor especial"],
];

const comoTexto = (v: unknown) =>
  Array.isArray(v) ? v.join(", ") || "—" : typeof v === "boolean" ? (v ? "sí" : "no") : String(v || "—");

/** Guarda la ficha y deja en la cronología qué cambió ("Valor individual: $6.000 → $6.500"). */
export async function guardarClienteAccion(formData: FormData) {
  if (!(await puedeVerClientes())) return;
  const id = String(formData.get("id") ?? "");
  const actual = (await listarTodosLosClientes()).find((c) => c.id === id);
  const ficha = leerFichaCliente(formData);
  if (!actual || !ficha.nombre) return;
  // "JURÍDICA" del archivo y "JURIDICA" del selector son lo mismo: no es un cambio.
  const sinTilde = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  if (sinTilde(actual.tipoPago) === sinTilde(ficha.tipoPago)) ficha.tipoPago = actual.tipoPago;

  const cambios = CAMPOS_CLIENTE.filter(([k]) => comoTexto(actual[k]) !== comoTexto(ficha[k])).map(
    ([k, etiqueta]) => `${etiqueta}: ${comoTexto(actual[k])} → ${comoTexto(ficha[k])}`,
  );
  if (cambios.length === 0) return;

  await guardarClientePanel({ ...actual, ...ficha });
  await anotarEnHistorial(id, "cambio", cambios.join(" · "), String(formData.get("autor") ?? "").slice(0, 40));
  refrescarClientes();
}

/** Activo, pausado o perdido. Solo los activos salen en el formulario y en Programar. */
export async function cambiarEstadoCliente(formData: FormData) {
  if (!(await puedeVerClientes())) return;
  const id = String(formData.get("id") ?? "");
  const estado = String(formData.get("estado") ?? "") as EstadoCliente;
  const actual = (await listarTodosLosClientes()).find((c) => c.id === id);
  if (!actual || !["activo", "pausado", "perdido"].includes(estado)) return;

  if (actual.activo !== (estado === "activo")) await guardarClientePanel({ ...actual, activo: estado === "activo" });
  // "pausado · cerró por remodelación": el estado y, si lo hay, el motivo.
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 300);
  await anotarEnHistorial(id, "estado", [estado, motivo].filter(Boolean).join(" · "));
  refrescarClientes();
}

/** Una nota en la cronología: visita, llamada, queja, acuerdo… */
export async function agregarNotaCliente(formData: FormData) {
  if (!(await puedeVerClientes())) return;
  const clienteId = String(formData.get("id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 1000);
  const fecha = String(formData.get("fecha") ?? "");
  if (!clienteId || !texto) return;
  await crearEntradaHistorial({
    id: crypto.randomUUID(),
    clienteId,
    creadoEn: new Date().toISOString(),
    fecha: ES_FECHA.test(fecha) ? fecha : hoyLocal(),
    tipo: "nota",
    texto,
    autor: String(formData.get("autor") ?? "").slice(0, 40),
  });
  refrescarClientes();
}

export async function borrarNotaCliente(formData: FormData) {
  if (!(await puedeVerClientes())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await borrarEntradaHistorial(id);
  refrescarClientes();
}

/* ------------------------- Mínimos de stock ------------------------- */

/**
 * Guarda los mínimos editados en Programar → Mínimos. Si un valor queda
 * igual al mínimo base (o vacío), se vuelve al base.
 */
export async function guardarMinimos(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const actuales = await listarMinimosPanel();
  for (const [campo, crudo] of formData.entries()) {
    if (!campo.startsWith("m|")) continue;
    const k = campo.slice(2);
    const texto = String(crudo).trim();
    const valor = texto === "" ? null : Math.max(0, Math.floor(Number(texto)));
    if (valor !== null && !Number.isFinite(valor)) continue;
    const nuevo = valor === null || valor === minimoBase(k) ? null : valor;
    if ((actuales[k] ?? null) === nuevo) continue;
    await guardarMinimoPanel(k, nuevo);
  }
  revalidatePath("/cocina/programar/minimos");
  revalidatePath("/cocina/inventario");
}

/* ------------------------- Sabor de temporada ------------------------- */

/** Cambia el sabor de temporada: nombre, descripción y si está a la venta. */
export async function guardarTemporada(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 60);
  if (!nombre) return;
  await cambiarTemporada({
    nombre,
    descripcion: String(formData.get("descripcion") ?? "").trim().slice(0, 120),
    activo: formData.get("activo") === "on",
  });
  revalidatePath("/pedido");
  revalidatePath("/cocina", "layout");
}

/**
 * Mover una tarea de preproducción a otro día desde la vista de la cocina
 * (por ejemplo, si se agendó todo el lunes por error). La nota es opcional:
 * si se escribe, la ve quien tenga la tarea ese día ("falta bolear").
 */
export async function moverTareaCocina(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 160);
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 40);
  if (!id || !ES_FECHA.test(fecha)) return;

  const tarea = (await listarTodasLasTareas()).find((t) => t.id === id);
  if (!tarea || tarea.hecho || tarea.fecha === fecha) return;
  // Dentro de la semana de la tarea o hasta tres semanas después.
  if (fecha < lunesDeLaSemana(tarea.fecha) || fecha > sumarDias(hoyLocal(), 21)) return;

  const delDia = await listarTareas(fecha, fecha);
  const orden = delDia.reduce((max, t) => Math.max(max, t.orden), 0) + 1;
  const desde = `${tarea.fecha.slice(8)}/${tarea.fecha.slice(5, 7)}`;
  await actualizarTarea(id, {
    fecha,
    orden,
    ...(nota
      ? {
          notas: [tarea.notas, `⏩ Del ${desde}: ${nota}${quien ? ` (${quien})` : ""}`]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 400),
        }
      : {}),
  });
  refrescarCocina();
}

/* ------------------------- Orden del día (arrastrar) ------------------------- */

/** El orden de las tareas de preproducción de un día: lo primero que se hace arriba. */
export async function ordenarTareasDelDia(fecha: string, ids: string[]) {
  if (!ES_FECHA.test(fecha)) return;
  const delDia = new Map((await listarTareas(fecha, fecha)).map((t) => [t.id, t]));
  let n = 0;
  for (const id of ids) {
    const t = delDia.get(id);
    if (!t) continue;
    n++;
    if (t.orden !== n) await actualizarTarea(id, { orden: n });
  }
  refrescarCocina();
}

/** El orden de los pedidos de un día de producción. */
export async function ordenarPedidosDelDia(fecha: string, ids: string[]) {
  if (!ES_FECHA.test(fecha)) return;
  const delDia = new Map((await listarPedidos()).filter((p) => p.fechaProduccion === fecha).map((p) => [p.id, p]));
  let n = 0;
  for (const id of ids) {
    const p = delDia.get(id);
    if (!p) continue;
    n++;
    if (p.orden !== n) await actualizarPedido(id, { orden: n });
  }
  refrescar();
}

/** Una nota en la tarea, sin moverla de día (para quien la haga). */
export async function agregarNotaTarea(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 160);
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 40);
  if (!id || !nota) return;
  const tarea = (await listarTodasLasTareas()).find((t) => t.id === id);
  if (!tarea) return;
  await actualizarTarea(id, {
    notas: [tarea.notas, `📝 ${nota}${quien ? ` (${quien})` : ""}`].filter(Boolean).join(" · ").slice(0, 400),
  });
  refrescarCocina();
}

/** Una nota en un pedido de producción, para el equipo. */
export async function agregarNotaPedido(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 160);
  const quien = String(formData.get("quien") ?? "").trim().slice(0, 40);
  if (!id || !nota) return;
  const pedido = (await listarPedidos()).find((p) => p.id === id);
  if (!pedido) return;
  await actualizarPedido(id, {
    notas: [pedido.notas, `📝 ${nota}${quien ? ` (${quien})` : ""}`].filter(Boolean).join(" · ").slice(0, 1000),
  });
  refrescar();
}

/**
 * Pone la rutina estándar al día: crea las que faltan y corrige los días de
 * las que ya existen si cambiaron. No toca las que el equipo haya creado
 * por su cuenta, ni borra el historial de lo ya marcado.
 *
 * Se puede correr las veces que sea.
 */
export async function cargarRutinasBase() {
  if (!(await puedeProgramar())) return;

  const actuales = await listarRutinas();
  let orden = actuales.reduce((max, r) => Math.max(max, r.orden), 0);

  for (const base of rutinasBase as {
    nombre: string;
    categoria: CategoriaRutina;
    dias: number[];
    notas?: string;
  }[]) {
    const ya = actuales.find((r) => mismoNombre(r.nombre, base.nombre));

    if (!ya) {
      await crearRutina({
        id: crypto.randomUUID(),
        creadoEn: new Date().toISOString(),
        nombre: base.nombre,
        categoria: base.categoria,
        dias: base.dias,
        encargada: "",
        notas: base.notas ?? "",
        orden: ++orden,
      });
      continue;
    }

    if (ya.dias.join() !== base.dias.join() || ya.notas !== (base.notas ?? "")) {
      await actualizarRutina(ya.id, { dias: base.dias, notas: base.notas ?? "" });
    }
  }
  refrescarRutina();
}

/**
 * Muestras agendadas escribiendo, una por línea:
 *
 *   Hotel Ejemplo: Chocolate 6 // para la reunión del martes
 *
 * Quedan en el día de producción elegido, para que la cocina las hornee, y
 * en el historial de muestras con su seguimiento.
 */
export async function crearMuestrasEscritas(formData: FormData) {
  if (!(await puedeProgramar())) return;
  const fecha = String(formData.get("fecha") ?? "");
  if (!ES_FECHA.test(fecha)) return;

  const porDefecto = String(formData.get("gramaje") ?? "90g");
  const { conocidos: sabores } = await conocidosConTemporada(CONOCIDOS);
  const leidas = leerMuestras(String(formData.get("texto") ?? ""), sabores);

  for (const m of leidas) {
    if (m.falta || !m.cantidad) continue;
    const producto = (await productosParaCliente("")).find((p) => mismoNombre(p.nombre, m.nombre));
    await crearMuestra({
      id: crypto.randomUUID(),
      creadoEn: new Date().toISOString(),
      fecha,
      prospecto: m.prospecto.slice(0, 120),
      contacto: "",
      productoId: producto?.id ?? "",
      nombre: m.nombre,
      gramaje: normalizarGramaje(m.gramaje || porDefecto),
      cantidad: m.cantidad,
      notas: m.notas.slice(0, 200),
      seguimiento: "enviada",
    });
  }
  refrescar();
  revalidatePath("/cocina/muestras");
  revalidatePath("/cocina/inventario");
}
