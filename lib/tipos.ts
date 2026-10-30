export type Cliente = {
  id: string;
  nombre: string;
  razonSocial: string;
  direccion: string;
  telefono: string;
  gramaje: string;
  horarioEntrega: string;
  domicilio: string;
  valorUnitario: string;
  tipoPago: string;
  reteIva: boolean;
  desarrollos: string[];
  activo: boolean;
  /** Cliente de la casa (tu punto de venta): solo se programa desde el panel, no sale en el formulario. */
  interno?: boolean;
};

export type EstadoCliente = "activo" | "pausado" | "perdido";

/**
 * Una línea de la cronología de un cliente: una nota que alguien escribió,
 * un dato que cambió (precio, dirección…) o un cambio de estado.
 */
export type EntradaHistorial = {
  id: string;
  clienteId: string;
  creadoEn: string;
  fecha: string;
  tipo: "nota" | "cambio" | "estado";
  texto: string;
  autor: string;
};

/** Casi todo se pide por unidad; algunos productos (granel) se piden por kilo. */
export type Unidad = "unidad" | "kg";

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  foto: string;
  unidad: Unidad;
  activo: boolean;
  /** Si tiene ids de cliente, el producto solo se le muestra a esos clientes. */
  soloPara: string[];
};

export type ItemPedido = {
  productoId: string;
  nombre: string;
  cantidad: number;
  unidad: Unidad;
  /** Solo si este sabor va en otro gramaje que el resto del pedido ("Coco 70g" en un pedido de 90g). */
  gramaje?: string;
};

export type EstadoPedido = "recibido" | "en_produccion" | "listo" | "entregado" | "cancelado";

export type Pedido = {
  id: string;
  consecutivo: number;
  creadoEn: string;
  clienteId: string;
  clienteNombre: string;
  direccion: string;
  gramaje: string;
  items: ItemPedido[];
  /** Solo galletas por unidad: es lo que compite por el cupo diario de producción. */
  totalUnidades: number;
  totalKilos: number;
  fechaProduccion: string;
  fechaEntrega: string;
  esEvento: boolean;
  notas: string;
  ordenCompra: string | null;
  estado: EstadoPedido;
  /** Posición del pedido en su día de producción (lo que se hace primero). */
  orden?: number | null;
};

/** Producto que se perdió: se quemó, se dañó, salió mal. */
export type Baja = {
  id: string;
  creadoEn: string;
  fecha: string;
  productoId: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  motivo: string;
};

export type SeguimientoMuestra = "enviada" | "interesado" | "cliente" | "sin_interes";

/** Muestra enviada a un cliente potencial. */
export type Muestra = {
  id: string;
  creadoEn: string;
  fecha: string;
  prospecto: string;
  contacto: string;
  productoId: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  notas: string;
  seguimiento: SeguimientoMuestra;
};

export type TipoTarea = "masa" | "relleno" | "topping" | "actividad";

/**
 * Una fila del calendario de preproducción, con las mismas columnas que la
 * hoja de producción: qué masa o relleno, gramaje, qué lote se hace, quién lo hace,
 * en qué horario y cuántas bolas salieron de verdad.
 */
export type Tarea = {
  id: string;
  creadoEn: string;
  fecha: string;
  /** Posición dentro del día: qué se hace primero. */
  orden: number;
  tipo: TipoTarea;
  nombre: string;
  gramaje: string;
  /** "1 simple", "1 doble", "1 triple"… */
  lote: string;
  /** Cuántas bolas se esperan de ese lote. */
  esperado: number | null;
  encargada: string;
  horario: string;
  notas: string;
  hecho: boolean;
  /** Lo que de verdad salió del batch. */
  cantidadReal: number | null;
  hechoPor: string;
  fechaHecho: string | null;
};

/** Conteo físico de bolas en un congelador, hecho por el equipo. */
export type Conteo = {
  id: string;
  creadoEn: string;
  fecha: string;
  area: string;
  nombre: string;
  gramaje: string;
  cantidad: number;
  contadoPor: string;
  notas: string;
};

/** "pausa" es solo la pausa activa de las 12:00 (no se crea desde el formulario). */
export type CategoriaRutina = "limpieza" | "inventario" | "otra" | "pausa";

/**
 * Una tarea fija que se repite cada semana en los mismos días:
 * limpiar la campana los lunes, contar el congelador miércoles y viernes…
 */
export type Rutina = {
  id: string;
  creadoEn: string;
  nombre: string;
  categoria: CategoriaRutina;
  /** Días de la semana en que toca: 1 = lunes … 6 = sábado. */
  dias: number[];
  /** Quién la hace; vacío = cualquiera del equipo. */
  encargada: string;
  notas: string;
  orden: number;
};

/** La firma de que una rutina se hizo un día. */
export type RegistroRutina = {
  id: string;
  rutinaId: string;
  fecha: string;
  hechoPor: string;
  hechoEn: string;
};
