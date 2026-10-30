import Link from "next/link";
import NavSemana from "@/components/NavSemana";
import { listarPedidos, listarTareas } from "@/lib/db";
import { fechaLarga, hoyLocal, lunesDeLaSemana, sumarDias } from "@/lib/fechas";
import { obtenerTemporada } from "@/lib/temporada";
import type { Pedido, Tarea } from "@/lib/tipos";
import { gramajesDelPedido } from "@/lib/gramaje";

export const dynamic = "force-dynamic";

const ESTADO: Record<Pedido["estado"], { texto: string; clase: string }> = {
  recibido: { texto: "Sin chulear", clase: "bg-amber-100 text-amber-900" },
  en_produccion: { texto: "En producción", clase: "bg-panel-100 text-panel-700" },
  listo: { texto: "✓ Empacado", clase: "bg-green-100 text-green-900" },
  entregado: { texto: "✓ Entregado", clase: "bg-green-100 text-green-900" },
  cancelado: { texto: "Cancelado", clase: "bg-red-100 text-red-900 line-through" },
};

/**
 * Historial por semana, día por día: lo que salió en producción (cada
 * pedido, si se chuleó, ajustes) y lo que hizo preproducción (quién, cuánto
 * salió de verdad, notas).
 */
export default async function Historial({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; ver?: string }>;
}) {
  const { semana, ver } = await searchParams;
  const vista = ver === "preproduccion" ? "preproduccion" : "produccion";
  const hoy = hoyLocal();
  const lunes = lunesDeLaSemana(/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? semana! : hoy);
  const sabado = sumarDias(lunes, 5);
  const dias = Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i)).reverse();

  const [pedidos, tareas, temporada] = await Promise.all([
    listarPedidos(),
    listarTareas(lunes, sabado),
    obtenerTemporada(),
  ]);
  const nombre = (n: string) => (n === "TEMPORADA" ? temporada.nombre.toUpperCase() : n);

  const pestana = (v: string, texto: string) => (
    <Link
      href={`/cocina/pedidos?ver=${v}&semana=${lunes}`}
      className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold ${
        vista === v ? "border-panel-700 bg-panel-700 text-white" : "border-panel-200 bg-white text-panel-700"
      }`}
    >
      {texto}
    </Link>
  );

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Historial</h1>
          <p className="mt-1 text-lg text-panel-700">
            Semana del {fechaLarga(lunes)} al {fechaLarga(sabado)}
          </p>
        </div>
        <NavSemana ruta={`/cocina/pedidos?ver=${vista}`} lunes={lunes} esEstaSemana={lunes === lunesDeLaSemana(hoy)} />
      </div>

      <div className="mb-5 flex gap-2">
        {pestana("produccion", "Producción")}
        {pestana("preproduccion", "Preproducción")}
      </div>

      {(vista === "produccion"
        ? !pedidos.some((p) => p.fechaProduccion >= lunes && p.fechaProduccion <= sabado)
        : tareas.length === 0) && (
        <p className="tarjeta text-panel-500">No hay nada registrado esta semana.</p>
      )}

      <div className="space-y-3">
        {vista === "produccion"
          ? dias.map((d) => (
              <DiaProduccion key={d} dia={d} pedidos={pedidos.filter((p) => p.fechaProduccion === d)} hoy={hoy} />
            ))
          : dias.map((d) => (
              <DiaPreproduccion
                key={d}
                dia={d}
                tareas={tareas.filter((t) => t.fecha === d).map((t) => ({ ...t, nombre: nombre(t.nombre) }))}
                hoy={hoy}
              />
            ))}
      </div>
    </main>
  );
}

function Encabezado({ dia, hoy, resumen }: { dia: string; hoy: string; resumen: string }) {
  return (
    <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
      <span className="text-lg font-bold first-letter:uppercase">
        {fechaLarga(dia)}
        {dia === hoy && <span className="ml-2 text-sm font-semibold normal-case text-panel-500">(hoy)</span>}
      </span>
      <span className="text-sm text-panel-500">{resumen}</span>
    </summary>
  );
}

function DiaProduccion({ dia, pedidos, hoy }: { dia: string; pedidos: Pedido[]; hoy: string }) {
  if (pedidos.length === 0) return null;
  const activos = pedidos.filter((p) => p.estado !== "cancelado");
  const galletas = activos.reduce((s, p) => s + p.totalUnidades, 0);
  const empacados = activos.filter((p) => p.estado === "listo" || p.estado === "entregado").length;
  const ordenados = [...pedidos].sort(
    (a, b) => (a.orden ?? 9999) - (b.orden ?? 9999) || a.creadoEn.localeCompare(b.creadoEn),
  );

  return (
    <details open={dia <= hoy && dia >= sumarDias(hoy, -1)} className="overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
      <Encabezado
        dia={dia}
        hoy={hoy}
        resumen={`${activos.length} pedido${activos.length === 1 ? "" : "s"} · ${galletas} unidades · ${empacados} de ${activos.length} empacados`}
      />
      <div className="overflow-x-auto border-t-2 border-panel-100">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-fondo/50 text-left">
              <th className="px-4 py-2 font-semibold">Cliente</th>
              <th className="px-3 py-2 font-semibold">Sabores</th>
              <th className="px-3 py-2 text-right font-semibold">Unidades</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
              <th className="px-3 py-2 font-semibold">Notas y ajustes</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((p) => (
              <tr key={p.id} className="border-t border-panel-100 align-top">
                <td className="px-4 py-2">
                  <p className="font-semibold">{p.clienteNombre}</p>
                  <p className="text-xs text-panel-500">
                    #{p.consecutivo} · {gramajesDelPedido(p)}
                  </p>
                </td>
                <td className="px-3 py-2">
                  {p.items.map((i) => `${i.cantidad}${i.unidad === "kg" ? " kg" : ""} ${i.nombre}${i.gramaje ? ` ${i.gramaje}` : ""}`).join(", ")}
                </td>
                <td className="px-3 py-2 text-right font-bold tabular-nums">{p.totalUnidades}</td>
                <td className="px-3 py-2">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO[p.estado].clase}`}>
                    {ESTADO[p.estado].texto}
                  </span>
                </td>
                <td className="max-w-[260px] px-3 py-2 text-xs text-panel-900/80">{p.notas || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function DiaPreproduccion({ dia, tareas, hoy }: { dia: string; tareas: Tarea[]; hoy: string }) {
  if (tareas.length === 0) return null;
  const hechas = tareas.filter((t) => t.hecho);

  return (
    <details open={dia <= hoy && dia >= sumarDias(hoy, -1)} className="overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
      <Encabezado
        dia={dia}
        hoy={hoy}
        resumen={`${tareas.length} tarea${tareas.length === 1 ? "" : "s"} · ${hechas.length} hecha${hechas.length === 1 ? "" : "s"}`}
      />
      <div className="overflow-x-auto border-t-2 border-panel-100">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="bg-fondo/50 text-left">
              <th className="px-4 py-2 font-semibold">Qué</th>
              <th className="px-3 py-2 font-semibold">Gram</th>
              <th className="px-3 py-2 text-right font-semibold">Programado</th>
              <th className="px-3 py-2 text-right font-semibold">Salieron</th>
              <th className="px-3 py-2 font-semibold">Quién</th>
              <th className="px-3 py-2 font-semibold">Notas</th>
            </tr>
          </thead>
          <tbody>
            {tareas.map((t) => {
              const dif = t.cantidadReal != null && t.esperado != null ? t.cantidadReal - t.esperado : null;
              return (
                <tr key={t.id} className={`border-t border-panel-100 align-top ${t.hecho ? "" : "bg-amber-50/60"}`}>
                  <td className="px-4 py-2">
                    <p className="font-semibold">{t.nombre}</p>
                    <p className="text-xs text-panel-500 first-letter:uppercase">
                      {t.tipo}
                      {t.lote ? ` · ${t.lote}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2">{t.gramaje || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-panel-500">{t.esperado ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {t.hecho ? (t.cantidadReal ?? "—") : <span className="font-normal text-amber-800">no se hizo</span>}
                    {dif != null && dif !== 0 && (
                      <span className={`ml-1 text-xs ${dif > 0 ? "text-green-700" : "text-red-700"}`}>
                        ({dif > 0 ? "+" : ""}
                        {dif})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {t.hecho ? t.hechoPor || "—" : <span className="text-panel-500">{t.encargada || "—"}</span>}
                  </td>
                  <td className="max-w-[240px] px-3 py-2 text-xs text-panel-900/80">{t.notas || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
