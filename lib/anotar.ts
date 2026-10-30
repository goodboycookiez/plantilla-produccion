import { negocio } from "@/config/negocio";

/**
 * Entiende lo que la cocina escribe a mano, una línea por masa:
 *
 *   "Chocolate 70g 150"
 *   "hoy hice 150 de avena 70 gramos"
 *   "chocolate especial 90 g, 80 bolas"
 *
 * Saca el gramaje (número pegado a g/gr/gramos), la cantidad (el otro número)
 * y el nombre, que se ajusta a la lista de masas y rellenos si se parece.
 * Se usa igual en el navegador (para mostrar lo que entendió) y en el servidor.
 */

export type Linea = {
  texto: string;
  nombre: string;
  gramaje: string;
  cantidad: number | null;
  /** Qué falta para poder guardarla; vacío si está completa. */
  falta: string;
};

// Palabras de relleno que se dicen pero no son parte del nombre.
const RELLENO = new Set([
  "hoy", "hice", "hicimos", "hizo", "salieron", "salio", "salió", "conte", "conté",
  "contamos", "hay", "quedan", "quedaron", "de", "del", "la", "el", "los", "las",
  "y", "bolas", "bola", "unidades", "und", "u", "masa", "masas", "total",
]);

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const normal = (s: string) => sinTildes(s).toUpperCase().replace(/\s+/g, " ").trim();

/** Distancia de edición: cuántas letras hay que cambiar para ir de a a b. */
function distancia(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Ajusta lo escrito al nombre conocido más parecido (tolera errores de dedo). */
function ajustarNombre(escrito: string, conocidos: string[]) {
  const e = normal(escrito);
  if (!e) return "";
  const lista = conocidos.map((c) => ({ c, n: normal(c) }));
  const exacto = lista.find((x) => x.n === e);
  if (exacto) return exacto.c;
  const parecido = lista
    .map((x) => ({ ...x, d: distancia(e, x.n) }))
    .sort((a, b) => a.d - b.d)[0];
  if (parecido && parecido.d <= Math.max(1, Math.floor(parecido.n.length / 4))) return parecido.c;
  // "temporada" o "temporada" → SABOR DE TEMPORADA: lo escrito es parte de un solo nombre.
  const palabras = e.split(" ");
  const parte = lista.filter((x) => palabras.every((p) => x.n.split(" ").some((w) => w.startsWith(p))));
  if (parte.length === 1) return parte[0].c;
  // "avena" dentro de "masa avena nueva": el conocido más largo que aparezca.
  const contenido = lista.filter((x) => e.includes(x.n)).sort((a, b) => b.n.length - a.n.length)[0];
  return contenido ? contenido.c : e;
}

export function leerLinea(texto: string, conocidos: string[]): Linea {
  let resto = ` ${texto.toLowerCase()} `;

  let gramaje = "";
  const g = resto.match(/(\d+)\s*(g|gr|grs|gramos?)(?=[\s,.;]|$)/);
  if (g) {
    gramaje = `${g[1]}g`;
    resto = resto.replace(g[0], " ");
  }

  const numeros = [...resto.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]);
  // "Chocolate 70 150": con dos números y sin "g", el primero es el gramaje.
  if (!gramaje && numeros.length >= 2) {
    gramaje = `${numeros[0]}g`;
    resto = resto.replace(numeros.shift()!, " ");
  }
  const cantidadTexto = numeros.at(-1);
  const cantidad = cantidadTexto ? Number(cantidadTexto.replace(",", ".")) : null;
  if (cantidadTexto) resto = resto.replace(cantidadTexto, " ");

  const palabras = resto
    .replace(/[,.;:()\-]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !RELLENO.has(sinTildes(p)) && !/^\d/.test(p));
  const nombre = ajustarNombre(palabras.join(" "), conocidos);

  const falta = !nombre ? "falta el nombre" : cantidad === null ? "falta la cantidad" : "";
  return { texto: texto.trim(), nombre, gramaje, cantidad, falta };
}

export function leerTexto(texto: string, conocidos: string[]): Linea[] {
  return texto
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => leerLinea(l, conocidos));
}

/* -------------------------- Programar escribiendo -------------------------- */

/** Bolas que da cada tanda (config/negocio.ts → produccion.unidadesPorLote). */
const BOLAS_POR_LOTE: Record<string, number> = negocio.produccion.unidadesPorLote;

export type LineaProgramada = {
  texto: string;
  nombre: string;
  gramaje: string;
  /** "1 triple", "2 dobles"… */
  lote: string;
  esperado: number | null;
  encargada: string;
  /** Lo que no es un sabor conocido ("BOLEAR CHOCOLATE", "LIMPIAR HORNO") va como actividad. */
  esActividad: boolean;
  falta: string;
};

/**
 * Una línea para programar preproducción:
 *
 *   "Avena 70g 1 triple Persona 1"
 *   "chocolate 90g doble"
 *   "arequipe 15g 2 simples persona 2"
 *   "chocolate 90g 120 bolas"
 *
 * La tanda calcula las bolas esperadas; un número suelto las reemplaza.
 * Un nombre del equipo en cualquier parte queda como encargada.
 */
export function leerLineaProgramada(texto: string, conocidos: string[], equipo: string[]): LineaProgramada {
  let resto = ` ${texto.toLowerCase()} `;

  const quien = equipo.find((p) => new RegExp(`\\b${sinTildes(p.toLowerCase())}\\b`).test(sinTildes(resto)));
  if (quien) resto = sinTildes(resto).replace(new RegExp(`\\b${sinTildes(quien.toLowerCase())}\\b`), " ");

  let gramaje = "";
  const g = resto.match(/(\d+)\s*(g|gr|grs|gramos?)(?=[\s,.;]|$)/);
  if (g) {
    gramaje = `${g[1]}g`;
    resto = resto.replace(g[0], " ");
  }

  let lote = "";
  let esperado: number | null = null;
  const t = resto.match(/(?:(\d+)\s*)?(simple|doble|triple)s?\b/);
  if (t) {
    const n = Number(t[1] ?? 1);
    lote = `${n} ${t[2]}${n > 1 ? "s" : ""}`;
    esperado = n * BOLAS_POR_LOTE[t[2]];
    resto = resto.replace(t[0], " ");
  }

  const suelto = resto.match(/\d+/);
  if (suelto) {
    esperado = Number(suelto[0]);
    resto = resto.replace(suelto[0], " ");
  }

  const palabras = resto
    .replace(/[,.;:()\-]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !RELLENO.has(sinTildes(p)));
  const escrito = normal(palabras.join(" "));
  const ajustado = ajustarNombre(escrito, conocidos);
  // "BOLEAR CHOCOLATE": contiene un sabor pero con palabras de más, es una actividad.
  const esActividad =
    !!escrito && (!conocidos.some((c) => normal(c) === normal(ajustado)) || (escrito.includes(normal(ajustado)) && escrito !== normal(ajustado)));
  const nombre = esActividad ? escrito : ajustado;

  return {
    texto: texto.trim(),
    nombre,
    gramaje,
    lote,
    esperado,
    encargada: quien ?? "",
    esActividad,
    falta: nombre ? "" : "falta el nombre",
  };
}

export function leerProgramacion(texto: string, conocidos: string[], equipo: string[]): LineaProgramada[] {
  return texto
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => leerLineaProgramada(l, conocidos, equipo));
}

/** "Chocolate 10, Vainilla 5": un sabor por línea o separados por comas. */
export function separarSabores(texto: string) {
  return texto.replace(/[,;]/g, "\n");
}

/* -------------------------- Varios pedidos a la vez -------------------------- */

type ClienteBasico = { id: string; nombre: string; gramaje: string; desarrollos?: string[] };
type ProductoBasico = { id: string; nombre: string; unidad: string; soloPara: string[] };

export type PedidoLeido = {
  /** Lo que se escribió para nombrar al cliente. */
  clienteTexto: string;
  cliente: ClienteBasico | null;
  /** Pedido de alguien que no es cliente ("Extra Ana Pérez: Chocolate 6"): su nombre. */
  extra: string;
  /** Si el nombre sirve para varios ("Tienda Demo"), cuáles. */
  ambiguos: string[];
  /** Gramaje escrito junto al cliente; vacío = el del cliente. */
  gramaje: string;
  /** Lo que va después de "//" o de "nota:": llega al pedido tal cual. */
  notas: string;
  items: {
    texto: string;
    producto: ProductoBasico | null;
    cantidad: number | null;
    /** Gramaje escrito junto al sabor ("Coco 70g 4"); vacío = el del pedido. */
    gramaje: string;
    problema: string;
  }[];
};

/** "Extra Ana Pérez" o "extra: Ana": un pedido que no es de un punto de distribución. */
export const ES_EXTRA = /^\s*extra\b[\s:-]*/i;

/** Encuentra el cliente que se quiso escribir: "café ejemplo" → CAFÉ EJEMPLO, "tienda demo 85" → Tienda Demo 85. */
export function buscarClienteEscrito<T extends ClienteBasico>(escrito: string, clientes: T[]) {
  const e = normal(escrito);
  if (!e) return { cliente: null, ambiguos: [] as string[] };
  const lista = clientes.map((c) => ({ c, n: normal(c.nombre) }));

  const exacto = lista.find((x) => x.n === e);
  if (exacto) return { cliente: exacto.c, ambiguos: [] };

  // Por palabras: todas las palabras escritas están en el nombre del cliente.
  const palabras = e.split(" ");
  const contienen = lista.filter((x) => palabras.every((p) => x.n.split(" ").some((w) => w.startsWith(p))));
  if (contienen.length === 1) return { cliente: contienen[0].c, ambiguos: [] };
  if (contienen.length > 1) return { cliente: null, ambiguos: contienen.map((x) => x.c.nombre) };

  // Con errores de dedo.
  const parecido = lista.map((x) => ({ ...x, d: distancia(e, x.n) })).sort((a, b) => a.d - b.d)[0];
  if (parecido && parecido.d <= Math.max(1, Math.floor(parecido.n.length / 5))) {
    return { cliente: parecido.c, ambiguos: [] };
  }
  return { cliente: null, ambiguos: [] };
}

/**
 * Varios pedidos escritos de una vez. Cada cliente en su línea, con los
 * sabores después de dos puntos o en las líneas siguientes:
 *
 *   Café Ejemplo: Chocolate 10, Vainilla 5
 *   Tienda Demo 85 70g: Vainilla 20, Avena 10
 *   Panadería Sol: Avena 90g 6, Coco 70g 4      (cada sabor con su gramaje)
 *   Extra Ana Pérez: Chocolate 6, Vainilla 6          (no es cliente)
 *   Local
 *   Coco 4, Vainilla 4
 *   Coco 4
 */
export function leerPedidos<C extends ClienteBasico, P extends ProductoBasico>(
  texto: string,
  clientes: C[],
  productos: P[],
): PedidoLeido[] {
  const pedidos: PedidoLeido[] = [];
  let actual: PedidoLeido | null = null;

  const empezar = (cabecera: string) => {
    let resto = cabecera;
    let gramaje = "";
    const g = resto.match(/(\d+)\s*(g|gr|grs|gramos?)\b/i);
    if (g) {
      gramaje = `${g[1]}g`;
      resto = resto.replace(g[0], " ");
    }
    if (ES_EXTRA.test(resto)) {
      const extra = resto.replace(ES_EXTRA, "").trim();
      actual = { clienteTexto: resto.trim(), cliente: null, extra, ambiguos: [], gramaje, notas: "", items: [] };
      pedidos.push(actual);
      return;
    }
    const { cliente, ambiguos } = buscarClienteEscrito(resto, clientes);
    actual = { clienteTexto: resto.trim(), cliente, extra: "", ambiguos, gramaje, notas: "", items: [] };
    pedidos.push(actual);
  };

  const agregarSabores = (textoSabores: string) => {
    if (!actual) return;
    const catalogo = productos.filter(
      (p) =>
        p.soloPara.length === 0 ||
        (!!actual!.cliente &&
          (p.soloPara.includes(actual!.cliente.id) ||
            (actual!.cliente.desarrollos ?? []).some((d) => normal(d) === normal(p.nombre)))),
    );
    for (const l of leerTexto(separarSabores(textoSabores), catalogo.map((p) => p.nombre))) {
      const producto = catalogo.find((p) => normal(p.nombre) === normal(l.nombre)) ?? null;
      actual.items.push({
        texto: l.texto,
        producto,
        cantidad: l.cantidad === null ? null : Math.floor(l.cantidad),
        gramaje: l.gramaje,
        problema: l.falta || (!producto ? "no es un sabor de este cliente" : ""),
      });
    }
  };

  /** Le pega una nota al pedido que se está armando. */
  const anotar = (nota: string) => {
    const a: PedidoLeido | null = actual;
    if (!a || !nota) return;
    a.notas = a.notas ? `${a.notas} · ${nota}` : nota;
  };

  /**
   * Saca la nota de una línea: "// algo" o "— algo" en cualquier parte, o una
   * línea que empieza por "nota:". Así un cliente llamado "Sin nota" no se
   * parte por la mitad.
   */
  const partirNota = (linea: string): { resto: string; nota: string } => {
    const sola = linea.match(/^notas?:\s*(.*)$/i);
    if (sola) return { resto: "", nota: sola[1].trim() };
    const m = linea.match(/(?:\/\/|—)\s*(.*)$/);
    if (!m) return { resto: linea, nota: "" };
    return { resto: linea.slice(0, m.index).trim(), nota: m[1].trim() };
  };

  for (const crudo of texto.split(/\n/)) {
    const linea0 = crudo.trim();
    if (!linea0) continue;

    const { resto: linea, nota } = partirNota(linea0);
    // Una línea que es solo la nota se le pega al pedido que se está armando.
    if (!linea && nota) {
      anotar(nota);
      continue;
    }
    const dosPuntos = linea.indexOf(":");
    if (dosPuntos > 0) {
      empezar(linea.slice(0, dosPuntos));
      agregarSabores(linea.slice(dosPuntos + 1));
      anotar(nota);
      continue;
    }
    // Una línea que es justo el nombre de un cliente abre su pedido.
    const sinGramaje = linea.replace(/(\d+)\s*(g|gr|grs|gramos?)\b/i, " ");
    const comoCliente = buscarClienteEscrito(sinGramaje, clientes);
    const pareceSabores = /\d/.test(sinGramaje) && !comoCliente.cliente;
    if (!actual || ES_EXTRA.test(linea) || (!pareceSabores && (comoCliente.cliente || comoCliente.ambiguos.length))) {
      empezar(linea);
    } else {
      agregarSabores(linea);
    }
    anotar(nota);
  }
  return pedidos;
}

/* ---------------------- Programar la semana de corrido ---------------------- */

const DIAS_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MESES_NOMBRE = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * Una línea que solo anuncia un día: "LUNES", "martes 14", "Miércoles 15 de
 * octubre", "jueves:". Devuelve el índice del día (0 = lunes) o null si la
 * línea es una tarea.
 */
export function leerEncabezadoDia(texto: string): number | null {
  const palabras = sinTildes(texto.toLowerCase())
    .replace(/[:,.\-–]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (palabras.length === 0) return null;

  const indice = DIAS_SEMANA.indexOf(palabras[0]);
  if (indice === -1) return null;

  // Lo que sigue solo puede ser la fecha: "14", "de", "octubre".
  const resto = palabras.slice(1);
  const soloFecha = resto.every(
    (p) => /^\d{1,2}(\/\d{1,2})?$/.test(p) || p === "de" || MESES_NOMBRE.includes(p),
  );
  return soloFecha ? indice : null;
}

export type GrupoProgramado = {
  /** El día al que van estas líneas. */
  fecha: string;
  /** Cómo se anunció en el texto; vacío si cayeron en el día por defecto. */
  encabezado: string;
  lineas: LineaProgramada[];
};

/**
 * Lee un plan de varios días escrito de corrido:
 *
 *   LUNES
 *   avena 50g 1 triple persona 2
 *   bolear chocolate
 *
 *   MARTES
 *   vainilla 70g 1 triple persona 1
 *
 * Las líneas que aparecen antes del primer día van al día por defecto.
 * Los días del texto se emparejan con los de la semana que se está viendo.
 */
export function leerPlanSemanal(
  texto: string,
  dias: string[],
  porDefecto: string,
  conocidos: string[],
  equipo: string[],
): GrupoProgramado[] {
  const grupos: GrupoProgramado[] = [];
  let actual: GrupoProgramado | null = null;

  for (const cruda of texto.split(/\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;

    const indice = leerEncabezadoDia(linea);
    if (indice !== null) {
      // Si la semana no llega a ese día (domingo), se queda en el último.
      const fecha = dias[Math.min(indice, dias.length - 1)];
      actual = { fecha, encabezado: linea, lineas: [] };
      grupos.push(actual);
      continue;
    }

    if (!actual) {
      actual = { fecha: porDefecto, encabezado: "", lineas: [] };
      grupos.push(actual);
    }
    actual.lineas.push(leerLineaProgramada(linea, conocidos, equipo));
  }

  return grupos.filter((g) => g.lineas.length > 0);
}

/** Dos nombres son el mismo si solo cambian mayúsculas o espacios de sobra. */
export const mismoNombre = (a: string, b: string) =>
  a.trim().toUpperCase() === b.trim().toUpperCase();

/* ---------------------------- Muestras escritas ---------------------------- */

export type MuestraLeida = {
  /** A quién se le manda: texto libre, no sale de la base de clientes. */
  prospecto: string;
  nombre: string;
  cantidad: number | null;
  gramaje: string;
  notas: string;
  falta: string;
};

/**
 * Muestras escritas de corrido, una por línea:
 *
 *   Hotel Ejemplo: Chocolate 6 // para la reunión del martes
 *   Café nuevo de la 85: Avena 90g 6, Coco 70g 4
 *
 * El prospecto es lo que va antes de los dos puntos, tal cual se escribe.
 * Cada sabor lleva su gramaje; el que no lo diga va en el gramaje elegido.
 */
export function leerMuestras(texto: string, sabores: string[]): MuestraLeida[] {
  const salida: MuestraLeida[] = [];

  for (const crudo of texto.split(/\n/)) {
    const linea = crudo.trim();
    if (!linea) continue;

    // "nota:" solo abre línea; "//" y "—" valen en cualquier parte.
    const sola = linea.match(/^notas?:\s*(.*)$/i);
    const m = sola ?? linea.match(/(?:\/\/|—)\s*(.*)$/);
    const notas = m ? m[1].trim() : "";
    const sinNota = sola ? "" : m ? linea.slice(0, m.index).trim() : linea;

    const dosPuntos = sinNota.indexOf(":");
    if (dosPuntos <= 0) {
      salida.push({
        prospecto: sinNota,
        nombre: "",
        cantidad: null,
        gramaje: "",
        notas,
        falta: "falta el sabor: escribe «a quién: sabor cantidad»",
      });
      continue;
    }

    const prospecto = sinNota.slice(0, dosPuntos).trim();
    const resto = sinNota.slice(dosPuntos + 1);

    for (const l of leerTexto(separarSabores(resto), sabores)) {
      const sabor = sabores.find((s) => normal(s) === normal(l.nombre));
      salida.push({
        prospecto,
        nombre: sabor ?? l.nombre,
        cantidad: l.cantidad === null ? null : Math.floor(l.cantidad),
        gramaje: l.gramaje,
        notas,
        falta: !prospecto
          ? "falta a quién se le manda"
          : l.falta || (!sabor ? "no reconocí ese sabor" : !l.cantidad ? "falta la cantidad" : ""),
      });
    }
  }
  return salida;
}
