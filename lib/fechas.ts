import { negocio } from "@/config/negocio";

/**
 * Reglas de producción y entrega (la hora de corte, la zona horaria y la
 * capacidad diaria se cambian en config/negocio.ts).
 *
 * - Se trabaja de lunes a viernes (sábados y domingos no cuentan).
 * - Pedido antes de la hora de corte: entra a producción ese mismo día.
 * - Pedido después de la hora de corte: entra a producción el siguiente día hábil.
 * - La entrega es el día hábil siguiente al día de producción.
 * - El cliente puede pedir una fecha de entrega posterior (eventos); en ese caso
 *   la producción es el día hábil anterior a la entrega.
 */

export const ZONA = negocio.produccion.zonaHoraria;
export const HORA_CORTE = negocio.produccion.horaCorte;
export const CAPACIDAD_DIARIA = negocio.produccion.capacidadDiaria;

/** Fecha y hora actual en la zona horaria del negocio, como partes numéricas. */
function ahoraLocal() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) };
}

/** "2026-09-17" -> Date en UTC (se usa solo para contar días y sacar el día de la semana). */
function aDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(iso: string): number {
  return aDate(iso).getUTCDay();
}

export function esHabil(iso: string): boolean {
  const d = diaSemana(iso);
  return d !== 0 && d !== 6;
}

export function sumarDias(iso: string, dias: number): string {
  const d = aDate(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return aIso(d);
}

export function siguienteHabil(iso: string): string {
  let f = sumarDias(iso, 1);
  while (!esHabil(f)) f = sumarDias(f, 1);
  return f;
}

export function anteriorHabil(iso: string): string {
  let f = sumarDias(iso, -1);
  while (!esHabil(f)) f = sumarDias(f, -1);
  return f;
}

/** Día de producción que corresponde a un pedido subido ahora mismo. */
export function produccionParaPedidoAhora(): string {
  const { fecha, hora } = ahoraLocal();
  if (esHabil(fecha) && hora < HORA_CORTE) return fecha;
  return siguienteHabil(fecha);
}

/** Fecha de entrega más próxima posible para un pedido subido ahora mismo. */
export function entregaMasProxima(): string {
  return siguienteHabil(produccionParaPedidoAhora());
}

/** Dada una fecha de entrega elegida, el día en que hay que producir. */
export function produccionParaEntrega(entregaIso: string): string {
  return anteriorHabil(entregaIso);
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function fechaLarga(iso: string): string {
  const d = aDate(iso);
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

export function fechaCorta(iso: string): string {
  const d = aDate(iso);
  return `${DIAS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

/** Lista de fechas de entrega seleccionables (hábiles), desde la más próxima. */
export function fechasEntregaPosibles(cantidad = 20): string[] {
  const out: string[] = [];
  let f = entregaMasProxima();
  while (out.length < cantidad) {
    if (esHabil(f)) out.push(f);
    f = sumarDias(f, 1);
  }
  return out;
}

export function hoyLocal(): string {
  return ahoraLocal().fecha;
}

export function horaLocal(): number {
  return ahoraLocal().hora;
}

/** Lunes de la semana a la que pertenece una fecha. */
export function lunesDeLaSemana(iso: string): string {
  const dia = diaSemana(iso);
  const atras = dia === 0 ? 6 : dia - 1;
  return sumarDias(iso, -atras);
}

/** Los cinco días hábiles de una semana, a partir de su lunes. */
export function diasDeLaSemana(lunes: string): string[] {
  return [0, 1, 2, 3, 4].map((n) => sumarDias(lunes, n));
}
