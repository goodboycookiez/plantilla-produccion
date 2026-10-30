import { obtenerTemporada } from "@/lib/temporada";
import listas from "@/data/listas.json";
import ObservacionStock from "@/components/ObservacionStock";
import AnotarLibre from "@/components/AnotarLibre";
import { BOLAS_POR_GALLETA, calcularInventario, type Alerta, type FilaInventario, type Urgencia } from "@/lib/inventario";
import NavSemana from "@/components/NavSemana";
import { diaSemana, fechaLarga, hoyLocal, lunesDeLaSemana, sumarDias } from "@/lib/fechas";
import { anotarConteo, eliminarConteo } from "../acciones";

export const dynamic = "force-dynamic";

/** Etiquetas de urgencia contra el mínimo de stock. */
const ETIQUETA: Record<Urgencia, { texto: string; clase: string }> = {
  suficiente: { texto: "STOCK SUFICIENTE", clase: "bg-green-200 text-green-900" },
  bajo: { texto: "STOCK BAJO", clase: "bg-yellow-200 text-yellow-900" },
  critico: { texto: "STOCK CRÍTICO", clase: "bg-fuchsia-200 text-fuchsia-900" },
  agotado: { texto: "AGOTADO", clase: "bg-red-400 text-red-950" },
};

/** Los conteos del congelador se hacen miércoles y viernes. */
const DIAS_DE_CONTEO = [3, 5];

const corta = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");

export default async function Stock({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const temporadaHoy = (await obtenerTemporada()).nombre;
  const { semana } = await searchParams;
  const hoy = hoyLocal();
  const lunes = lunesDeLaSemana(/^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? semana! : hoy);
  const domingo = sumarDias(lunes, 6);
  const esEstaSemana = hoy >= lunes && hoy <= domingo;
  const { filas, conteos, alertas, temporada } = await calcularInventario(lunes);
  // Alertas de masas que no tienen fila en la tabla (preproducción sin marcar, por ejemplo).
  const sueltas = alertas.filter((a) => !filas.some((f) => f.nombre === a.nombre && f.gramaje === a.gramaje));
  const tocaContar = DIAS_DE_CONTEO.includes(diaSemana(hoy));
  const cierre = filas.map((f) => f.fechaConteo).filter(Boolean).sort().at(-1) ?? null;
  const noCuadran = filas.filter((f) => f.descuadre !== null && f.descuadre !== 0);
  const cuadran = filas.filter((f) => f.descuadre === 0);
  const urgentes = filas.filter((f) => f.urgencia === "agotado" || f.urgencia === "critico");

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Stock</h1>
          <p className="mt-1 text-lg text-panel-700">
            Semana del {fechaLarga(lunes)} al {fechaLarga(domingo)}
          </p>
        </div>
        <NavSemana ruta="/cocina/inventario" lunes={lunes} esEstaSemana={esEstaSemana} />
      </div>

      {tocaContar && esEstaSemana && (
        <a
          href="#conteo"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-panel-700 px-5 py-4 text-white"
        >
          <span className="text-lg font-semibold">Hoy toca conteo del congelador</span>
          <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-panel-700">
            Anotar ↓
          </span>
        </a>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-white px-3 py-1.5">
          Cierre de la semana: <strong>{cierre ? fechaLarga(cierre) : "todavía no (es el viernes)"}</strong>
        </span>
        {cuadran.length > 0 && (
          <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-900">
            <strong>{cuadran.length}</strong> cuadran
          </span>
        )}
        {urgentes.length > 0 && (
          <span className="rounded-full bg-fuchsia-200 px-3 py-1.5 text-fuchsia-900">
            <strong>{urgentes.length}</strong> agotada{urgentes.length === 1 ? "" : "s"} o en stock crítico:{" "}
            {urgentes.map((f) => `${f.nombre} ${f.gramaje}`).join(", ")}
          </span>
        )}
        {noCuadran.length > 0 && (
          <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-900">
            <strong>{noCuadran.length}</strong> no cuadran
          </span>
        )}
      </div>


      {/* La tabla completa */}
      <section className="mt-5 overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
        <div className="px-5 pb-3 pt-5">
          <h2 className="text-xl font-bold">Cuadre de la semana</h2>
          <p className="text-sm text-panel-500">
            Con lo que iniciamos (el cierre de la semana anterior), más lo que preparó la cocina, menos
            lo horneado, las bajas y las muestras: eso es lo que debería haber. Al lado, el conteo del
            viernes y si cuadró. El miércoles es una comprobación y sale en la observación.
          </p>
        </div>

        {filas.length === 0 ? (
          <p className="px-5 pb-6 text-panel-500">
            Todavía no hay movimientos ni conteos. Anota un conteo abajo para arrancar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1140px] text-base">
              <thead>
                <tr className="whitespace-nowrap border-y-2 border-panel-100 bg-fondo/50 text-left text-sm">
                  <th className="sticky left-0 bg-claro px-4 py-2.5 font-semibold">Sabor</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Iniciamos</th>
                  <th className="px-2 py-2.5 text-right font-semibold text-green-800">+ Preparado</th>
                  <th className="px-2 py-2.5 text-right font-semibold text-red-800">− Horneado</th>
                  <th className="px-2 py-2.5 text-right font-semibold text-red-800">− Bajas</th>
                  <th className="px-2 py-2.5 text-right font-semibold text-red-800">− Muestras</th>
                  <th className="bg-panel-50 px-4 py-2.5 text-right font-semibold">= Debería haber</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Conteo final</th>
                  <th className="min-w-[280px] px-3 py-2.5 font-semibold">Observación</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Estado del stock</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <Fila
                    key={`${f.nombre}|${f.gramaje}`}
                    f={f}
                    temporada={temporada}
                    alertas={alertas.filter((a) => a.nombre === f.nombre && a.gramaje === f.gramaje)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {sueltas.length > 0 && (
          <ul className="space-y-1 border-t-2 border-panel-100 px-5 py-4 text-sm text-amber-900">
            {sueltas.map((a, i) => (
              <li key={i}>
                <strong>
                  {a.nombre} {a.gramaje}:
                </strong>{" "}
                {a.titulo}. {a.causa}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Anotar el conteo */}
      <section id="conteo" className="mt-6 scroll-mt-6 rounded-3xl border-2 border-panel-200 bg-white px-5 py-5">
        <h2 className="text-xl font-bold">Anotar el conteo</h2>
        <p className="mb-3 text-sm text-panel-500">
          Miércoles y viernes. Una línea por masa: sabor, gramaje y cuántas bolas hay. Queda con la
          fecha de hoy. El del viernes es el cierre de la semana.
        </p>
        <AnotarLibre
          accion={anotarConteo}
          conocidos={[...listas.masas, temporadaHoy]}
          equipo={listas.equipo}
          pregunta="Lo que contaste en el congelador"
          ejemplo={"Chocolate 70g 140\nAvena 70g 95\nVainilla 90g 60"}
          boton="Guardar conteo"
        >
          <label className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Día del conteo</span>
            <select
              name="fecha"
              defaultValue={hoy}
              className="rounded-xl border-2 border-panel-200 bg-white px-3 py-2"
            >
              {Array.from({ length: 15 }, (_, i) => sumarDias(hoy, -i)).map((d, i) => (
                <option key={d} value={d}>
                  {i === 0 ? `Hoy, ${fechaLarga(d)}` : i === 1 ? `Ayer, ${fechaLarga(d)}` : fechaLarga(d)}
                </option>
              ))}
            </select>
            <span className="text-sm text-panel-500">
              Cámbialo solo para completar un conteo de otro día.
            </span>
          </label>
        </AnotarLibre>

        {/* Historial: todos los conteos, por día, para revisar o corregir. */}
        {conteos.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-lg font-bold">Historial de conteos</h3>
            <div className="space-y-2">
              {[...new Set(conteos.map((c) => c.fecha))]
                .sort()
                .reverse()
                .map((fecha) => {
                  const delDia = conteos
                    .filter((c) => c.fecha === fecha)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre) || a.gramaje.localeCompare(b.gramaje));
                  const quienes = [...new Set(delDia.map((c) => c.contadoPor).filter(Boolean))];
                  return (
                    <details key={fecha} className="rounded-2xl border-2 border-panel-100 bg-panel-50">
                      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                        <span className="font-semibold capitalize">{fechaLarga(fecha)}</span>
                        <span className="text-sm text-panel-500">
                          {delDia.length} masa{delDia.length === 1 ? "" : "s"}
                          {quienes.length ? ` · ${quienes.join(", ")}` : ""}
                        </span>
                      </summary>
                      <ul className="space-y-1 px-4 pb-3">
                        {delDia.map((c) => (
                          <li
                            key={c.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-sm"
                          >
                            <span>
                              <strong>
                                {c.nombre === "TEMPORADA" ? temporadaHoy.toUpperCase() : c.nombre} {c.gramaje}
                              </strong>{" "}
                              · <span className="font-bold tabular-nums">{c.cantidad}</span>
                              {c.contadoPor && <span className="text-panel-500"> · {c.contadoPor}</span>}
                            </span>
                            <form action={eliminarConteo}>
                              <input type="hidden" name="id" value={c.id} />
                              <button type="submit" className="text-sm font-semibold text-red-700 underline">
                                Borrar
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Numero({ n, fecha, tenue = false }: { n: number | null; fecha?: string | null; tenue?: boolean }) {
  if (n === null) return <span className="text-panel-300">—</span>;
  return (
    <span className={`tabular-nums ${tenue && n === 0 ? "text-panel-300" : ""}`}>
      {tenue && n === 0 ? "—" : n}
      {fecha && <span className="block text-[11px] font-normal text-panel-500">{corta(fecha)}</span>}
    </span>
  );
}

function Fila({ f, alertas, temporada }: { f: FilaInventario; alertas: Alerta[]; temporada: string }) {
  // La fila se pone en rojo cuando no cuadra o cuando no alcanza lo que hay.
  const roja = alertas.some((a) => a.nivel === "rojo");
  return (
    <tr className={`border-b border-panel-100 align-top ${roja ? "bg-red-50" : ""}`}>
      <td className={`sticky left-0 whitespace-nowrap px-4 py-2.5 ${roja ? "bg-red-50" : "bg-white"}`}>
        <span className="font-semibold">{f.nombre === "TEMPORADA" ? temporada.toUpperCase() : f.nombre}</span>{" "}
        {f.nombre === "TEMPORADA" && <span className="text-xs text-panel-500">(temporada) </span>}
        {f.gramaje && (
          <span className="ml-1 whitespace-nowrap rounded-full bg-panel-700 px-2 py-0.5 text-xs font-semibold text-white">
            {f.gramaje}
          </span>
        )}
      </td>
      <td className="px-2 py-2.5 text-right">
        {f.habia === null ? (
          <span className="text-sm text-panel-500">sin conteo</span>
        ) : (
          <Numero n={f.habia} fecha={f.fechaHabia} />
        )}
      </td>
      <td className="px-2 py-2.5 text-right text-green-800">
        <Numero n={f.producido} tenue />
      </td>
      <td className="px-2 py-2.5 text-right text-red-800">
        <Numero n={f.horneado} tenue />
      </td>
      <td className="px-2 py-2.5 text-right text-red-800">
        <Numero n={f.bajas} tenue />
      </td>
      <td className="px-2 py-2.5 text-right text-red-800">
        <Numero n={f.muestras} tenue />
      </td>
      <td
        className={`px-4 py-2.5 text-right text-lg font-bold tabular-nums ${
          f.deberia !== null && f.deberia < 0 ? "text-red-700" : ""
        } ${roja ? "" : "bg-panel-50"}`}
      >
        {f.deberia ?? <span className="text-sm font-normal text-panel-500">—</span>}
        <Galletas f={f} n={f.deberia} />
        {f.deberiaAl && (
          <span className="block text-[11px] font-normal text-panel-500">
            {f.fechaConteo ? `al ${corta(f.deberiaAl)}` : f.deberiaAl === hoyLocal() ? "a hoy" : `al ${corta(f.deberiaAl)}`}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-lg font-bold">
        {f.contado === null ? (
          <span className="text-sm font-normal text-panel-500">pendiente</span>
        ) : (
          <>
            <Numero n={f.contado} fecha={f.fechaConteo} />
            <Galletas f={f} n={f.contado} />
          </>
        )}
      </td>
      <td className="px-3 py-2.5">
        <ObservacionStock fila={f} alertas={alertas} />
      </td>
      <td className="px-3 py-2.5 text-center">
        {f.urgencia ? (
          <>
            <span
              className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold ${ETIQUETA[f.urgencia].clase}`}
            >
              {ETIQUETA[f.urgencia].texto}
            </span>
            <span className="mt-1 block text-[11px] text-panel-500">mínimo {f.minimo}</span>
          </>
        ) : f.minimo !== null ? (
          <span className="text-[11px] text-panel-500">mínimo {f.minimo}</span>
        ) : (
          <span className="text-panel-300">—</span>
        )}
      </td>
    </tr>
  );
}

/** Lo que lleva varias bolas por unidad (un sándwich) se lleva por bola: debajo, cuántas unidades salen. */
function Galletas({ f, n }: { f: FilaInventario; n: number | null }) {
  const porGalleta = BOLAS_POR_GALLETA[f.nombre];
  if (!porGalleta || n === null) return null;
  return (
    <span className="block text-[11px] font-normal text-panel-500">
      = {Math.floor(n / porGalleta)} unidades
    </span>
  );
}
