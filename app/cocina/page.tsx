import { GRAMAJES, gramajeDeItem } from "@/lib/gramaje";
import TablaMuestrasDia from "@/components/TablaMuestrasDia";
import TablaPedidosDia from "@/components/TablaPedidosDia";
import NavSemana from "@/components/NavSemana";
import SelectorDias from "@/components/SelectorDias";
import { listarMuestras, pedidosDeProduccion } from "@/lib/db";

import {
  CAPACIDAD_DIARIA,
  diasDeLaSemana,
  hoyLocal,
  lunesDeLaSemana,
  sumarDias,
} from "@/lib/fechas";
import type { Muestra, Pedido } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const esFecha = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

function partes(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return {
    dia: DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
    numero: d,
    mes: MESES[m - 1],
  };
}

const estaListo = (p: Pedido) => p.estado === "listo" || p.estado === "entregado";
const galletas = (pedidos: Pedido[]) => pedidos.reduce((s, p) => s + p.totalUnidades, 0);

export default async function Produccion({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; dia?: string }>;
}) {
  const { semana, dia: diaPedido } = await searchParams;
  const hoy = hoyLocal();
  const lunes = lunesDeLaSemana(esFecha(semana) ? semana! : esFecha(diaPedido) ? diaPedido! : hoy);
  const dias = diasDeLaSemana(lunes);
  const viernes = dias[4];
  const [pedidos, muestras] = await Promise.all([
    pedidosDeProduccion(lunes, viernes),
    // Las muestras también se hornean: van al mismo día y al mismo cupo.
    listarMuestras(lunes, viernes),
  ]);
  const delDia = (d: string) => pedidos.filter((p) => p.fechaProduccion === d);
  const muestrasDe = (d: string) => muestras.filter((m) => m.fecha === d);

  // El día abierto: el que tocaron; si no, hoy; si no, el primero con pedidos.
  const abierto =
    (diaPedido && dias.includes(diaPedido) && diaPedido) ||
    (dias.includes(hoy) && hoy) ||
    dias.find((d) => delDia(d).length > 0) ||
    dias[0];

  // También se puede mover un pedido a la semana siguiente.
  const diasParaMover = [...dias, ...diasDeLaSemana(sumarDias(lunes, 7))];

  const ini = partes(lunes);
  const fin = partes(viernes);
  const rango =
    ini.mes === fin.mes
      ? `${ini.numero} al ${fin.numero} de ${fin.mes}`
      : `${ini.numero} de ${ini.mes} al ${fin.numero} de ${fin.mes}`;

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Producción</h1>
          <p className="mt-1 text-lg text-panel-700">Semana del {rango}</p>
        </div>
        <NavSemana ruta="/cocina" lunes={lunes} esEstaSemana={lunes === lunesDeLaSemana(hoy)} />
      </div>

      <SelectorDias
        abierto={abierto}
        hoy={hoy}
        dias={dias.map((d) => {
          const suyos = delDia(d);
          const susMuestras = muestrasDe(d);
          // Las muestras también se hornean, así que el día no está libre.
          const total = galletas(suyos) + susMuestras.reduce((s, m) => s + m.cantidad, 0);
          const faltan = suyos.filter((p) => !estaListo(p)).length;
          const detalle = !suyos.length && !susMuestras.length
            ? "libre"
            : faltan
              ? `faltan ${faltan}`
              : susMuestras.length && !suyos.length
                ? `${susMuestras.length} muestra${susMuestras.length === 1 ? "" : "s"}`
                : "✓ listo";
          return {
            dia: d,
            href: `/cocina?semana=${lunes}&dia=${d}`,
            cifra: total ? String(total) : "",
            detalle,
          };
        })}
      />

      <DiaProduccion
        dia={abierto}
        esHoy={abierto === hoy}
        pedidos={delDia(abierto)}
        muestras={muestrasDe(abierto)}
        diasParaMover={diasParaMover}
      />
    </main>
  );
}

function colorCapacidad(total: number) {
  if (total > CAPACIDAD_DIARIA) return "bg-red-600";
  if (total >= CAPACIDAD_DIARIA * 0.85) return "bg-amber-500";
  return "bg-panel-500";
}

function DiaProduccion({
  dia,
  esHoy,
  pedidos,
  muestras,
  diasParaMover,
}: {
  dia: string;
  esHoy: boolean;
  pedidos: Pedido[];
  muestras: Muestra[];
  diasParaMover: string[];
}) {
  // Las muestras se hornean igual que un pedido, así que cuentan para el cupo.
  const galletasMuestras = muestras.reduce((s, m) => s + m.cantidad, 0);
  const total = galletas(pedidos) + galletasMuestras;
  const porcentaje = Math.min(100, Math.round((total / CAPACIDAD_DIARIA) * 100));
  const pendientes = pedidos.filter((p) => !estaListo(p)).length;
  const { dia: nombre, numero, mes } = partes(dia);

  // Qué hornear: cada sabor en cada gramaje es una línea aparte, porque en la
  // cocina se separan por gramaje. Solo el total del día se suma (capacidad).
  const horno = new Map<string, { nombre: string; gramaje: string; cantidad: number; unidad: string }>();
  for (const p of pedidos) {
    for (const i of p.items) {
      const gramaje = gramajeDeItem(i, p);
      const clave = `${i.nombre}|${gramaje}`;
      const fila = horno.get(clave) ?? { nombre: i.nombre, gramaje, cantidad: 0, unidad: i.unidad };
      fila.cantidad += i.cantidad;
      horno.set(clave, fila);
    }
  }
  for (const m of muestras) {
    const clave = `${m.nombre}|${m.gramaje}`;
    const fila = horno.get(clave) ?? {
      nombre: m.nombre,
      gramaje: m.gramaje,
      cantidad: 0,
      unidad: "unidad",
    };
    fila.cantidad += m.cantidad;
    horno.set(clave, fila);
  }
  const porGramaje = GRAMAJES.concat(
    [...new Set([...horno.values()].map((f) => f.gramaje))].filter((g) => !GRAMAJES.includes(g)),
  )
    .map((g) => ({
      gramaje: g,
      filas: [...horno.values()].filter((f) => f.gramaje === g).sort((a, b) => b.cantidad - a.cantidad),
    }))
    .filter((grupo) => grupo.filas.length > 0);

  // Las muestras se ven como un pedido: el nombre una vez con sus sabores.
  const muestrasAgrupadas: { prospecto: string; notas: string; items: Muestra[] }[] = [];
  for (const m of muestras) {
    const ya = muestrasAgrupadas.find((g) => g.prospecto === m.prospecto);
    if (ya) {
      ya.items.push(m);
      if (m.notas && !ya.notas) ya.notas = m.notas;
    } else {
      muestrasAgrupadas.push({ prospecto: m.prospecto, notas: m.notas, items: [m] });
    }
  }

  // Los pendientes arriba, los ya empacados al final.
  // En el orden que se acomodó arrastrando (los empacados se ven en gris, pero no se mueven).
  const ordenados = [...pedidos].sort(
    (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || a.creadoEn.localeCompare(b.creadoEn),
  );

  return (
    <section className="overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
      {/* Cabecera del día */}
      <div className="border-b-2 border-panel-100 px-5 py-5">
        <h2 className="text-2xl font-bold sm:text-3xl">
          <span className="capitalize">{nombre}</span> {numero} de {mes}
          {esHoy && (
            <span className="ml-2 align-middle text-base font-bold text-panel-500">(hoy)</span>
          )}
        </h2>

        {total > 0 && (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg">
                <strong className="text-2xl">{total}</strong> de {CAPACIDAD_DIARIA} unidades
              </p>
              <p className="text-base font-bold text-panel-700">
                {pedidos.length === 0
                  ? `${muestras.length} muestra${muestras.length === 1 ? "" : "s"}`
                  : pendientes === 0
                    ? "✓ Todos los pedidos listos"
                    : `${pendientes} de ${pedidos.length} pedidos por hacer`}
              </p>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-panel-100">
              <div
                className={`h-full rounded-full ${colorCapacidad(total)}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            {total > CAPACIDAD_DIARIA && (
              <p className="mt-1.5 font-bold text-red-700">
                Se pasa por {total - CAPACIDAD_DIARIA} unidades: hay que mover algún pedido.
              </p>
            )}
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="px-5 py-10 text-center text-lg text-panel-500">No hay producción este día.</p>
      ) : (
        <>
          {/* Qué hornear */}
          <div className="px-5 py-5">
            <h3 className="mb-3 text-xl font-bold">Qué hornear</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {porGramaje.map(({ gramaje, filas }) => (
                <table key={gramaje} className="w-full self-start text-lg">
                  <thead>
                    <tr className="bg-panel-700 text-white">
                      <th className="rounded-l-xl px-4 py-2 text-left font-bold">{gramaje}</th>
                      <th className="whitespace-nowrap rounded-r-xl px-4 py-2 text-right text-sm font-normal text-white/80">
                        {filas.filter((f) => f.unidad !== "kg").reduce((s, f) => s + f.cantidad, 0)}{" "}
                        unidades
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f) => (
                      <tr key={f.nombre} className="border-b border-panel-100 last:border-0">
                        <td className="px-4 py-2">{f.nombre}</td>
                        <td className="px-4 py-2 text-right text-2xl font-bold tabular-nums">
                          {f.cantidad}
                          {f.unidad === "kg" && <span className="ml-1 text-base">kg</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </div>

          {/* Pedidos del día */}
          <div className="space-y-3 border-t-2 border-panel-100 bg-fondo/40 px-5 py-5">
            <div>
              <h3 className="text-xl font-bold">Pedidos</h3>
              <p className="text-sm text-panel-500">Toca el círculo de cada cliente cuando su pedido esté empacado.</p>
            </div>
            <TablaPedidosDia pedidos={ordenados} diasParaMover={diasParaMover} fecha={dia} />
          </div>

          {muestras.length > 0 && (
            <div className="space-y-2 border-t-2 border-panel-100 bg-fondo/40 px-5 py-5">
              <div>
                <h3 className="text-xl font-bold">Muestras</h3>
                <p className="text-sm text-panel-500">
                  Van con sticker, no se facturan. Ya están sumadas en “Qué hornear”.
                </p>
              </div>
              <TablaMuestrasDia grupos={muestrasAgrupadas} diasParaMover={diasParaMover} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
