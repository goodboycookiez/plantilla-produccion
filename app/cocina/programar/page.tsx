import { GRAMAJES } from "@/lib/gramaje";
import { obtenerTemporada } from "@/lib/temporada";
import NavSemana from "@/components/NavSemana";
import PestanasProgramar from "@/components/PestanasProgramar";
import ProgramarRapido from "@/components/ProgramarRapido";
import ListaOrdenable from "@/components/ListaOrdenable";
import TareaPre from "@/components/TareaPre";
import listas from "@/data/listas.json";
import { listarTareas } from "@/lib/db";
import {
  diasDeLaSemana,
  fechaLarga,
  hoyLocal,
  lunesDeLaSemana,
  sumarDias,
} from "@/lib/fechas";
import type { Tarea } from "@/lib/tipos";
import {
  crearTareaAccion,
  ordenarTareasDelDia,
  programarTexto,
} from "../acciones";

export const dynamic = "force-dynamic";

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const TIPOS = [
  { valor: "masa", texto: "Masa" },
  { valor: "relleno", texto: "Relleno" },
  { valor: "topping", texto: "Topping" },
  { valor: "actividad", texto: "Actividad" },
];

function nombreDia(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default async function Programar({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const temporadaHoy = (await obtenerTemporada()).nombre;
  const { semana } = await searchParams;
  const lunes = lunesDeLaSemana(
    /^\d{4}-\d{2}-\d{2}$/.test(semana ?? "") ? semana! : hoyLocal(),
  );
  // La preproducción también puede caer sábado, así que se muestran seis días.
  const dias = [...diasDeLaSemana(lunes), sumarDias(lunes, 5)];
  const sabado = dias[5];
  const tareas = await listarTareas(lunes, sabado);

  const diasParaMover = [...dias, ...diasDeLaSemana(sumarDias(lunes, 7))];
  const hechas = tareas.filter((t) => t.hecho);

  return (
    <main>
      <h1 className="titulo mb-4 text-3xl sm:text-4xl">Programar</h1>
      <PestanasProgramar activa="/cocina/programar" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-lg text-panel-700">
            Semana del {fechaLarga(lunes)} al {fechaLarga(sabado)}
          </p>
          <p className="mt-1 text-sm text-panel-500">
            {tareas.length} tarea{tareas.length === 1 ? "" : "s"} ·{" "}
            {hechas.length} hecha
            {hechas.length === 1 ? "" : "s"}
          </p>
        </div>
        <NavSemana
          ruta="/cocina/programar"
          lunes={lunes}
          esEstaSemana={lunes === lunesDeLaSemana(hoyLocal())}
        />
      </div>

      {/* Programar una tarea */}
      <section className="tarjeta mb-6">
        <h2 className="titulo mb-4 text-2xl">Nueva tarea</h2>
        <form action={crearTareaAccion} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="etiqueta" htmlFor="t-dia">
              Día
            </label>
            <select
              id="t-dia"
              name="fecha"
              className="campo"
              defaultValue={dias[0]}
            >
              {dias.map((d) => (
                <option key={d} value={d}>
                  {nombreDia(d)} {d.split("-")[2]}{" "}
                  {MESES[Number(d.split("-")[1]) - 1]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-tipo">
              Qué es
            </label>
            <select
              id="t-tipo"
              name="tipo"
              className="campo"
              defaultValue="masa"
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-nombre">
              Masa, relleno o actividad
            </label>
            <input
              id="t-nombre"
              name="nombre"
              list="lista-masas"
              className="campo"
              placeholder="Ej: AVENA, AREQUIPE, CHOCOLATE"
              required
            />
            <datalist id="lista-masas">
              {[
                ...listas.masas.map((m) =>
                  m === "TEMPORADA" ? temporadaHoy.toUpperCase() : m,
                ),
                ...listas.rellenos,
                ...listas.toppings,
              ].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-gramaje">
              Gramaje
            </label>
            <select
              id="t-gramaje"
              name="gramaje"
              className="campo"
              defaultValue=""
            >
              <option value="">—</option>
              <optgroup label="Masas">
                {GRAMAJES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Rellenos">
                {listas.gramajesRelleno.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </optgroup>
              <option value="n/a">No aplica</option>
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-lote">
              A hacer
            </label>
            <input
              id="t-lote"
              name="lote"
              list="lista-lotes"
              className="campo"
              placeholder="Ej: 1 triple"
            />
            <datalist id="lista-lotes">
              {listas.lotes.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-esperado">
              Bolas esperadas
            </label>
            <input
              id="t-esperado"
              name="esperado"
              type="number"
              min={0}
              className="campo"
              placeholder="Ej: 150"
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-encargada">
              Encargada
            </label>
            <select
              id="t-encargada"
              name="encargada"
              className="campo"
              defaultValue=""
            >
              <option value="">—</option>
              {listas.equipo.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-notas">
              Notas
            </label>
            <input
              id="t-notas"
              name="notas"
              className="campo"
              placeholder="Ej: bolear al final"
            />
          </div>
          <div className="flex items-end sm:col-span-3">
            <button type="submit" className="boton w-full sm:w-auto">
              Agregar al día
            </button>
          </div>
        </form>
      </section>

      {/* Lo mismo, escribiendo: más rápido para programar varias cosas. */}
      <section className="tarjeta mb-6">
        <h2 className="titulo mb-1 text-2xl">Programar escribiendo</h2>
        <p className="mb-4 text-sm text-panel-500">
          Una línea por tarea: sabor, gramaje, tanda (simple, doble o triple) y
          quién. Las bolas se calculan solas (simple 50, doble 100, triple 150);
          si escribes un número, vale ese. Para planear varios días seguidos,
          escribe el nombre del día en su propia línea y debajo sus tareas.
        </p>
        <ProgramarRapido
          accion={programarTexto}
          conocidos={[
            ...listas.masas,
            ...listas.rellenos,
            ...listas.toppings,
            temporadaHoy,
          ]}
          equipo={listas.equipo}
          dias={dias.map((d) => ({
            valor: d,
            texto: `${nombreDia(d)} ${Number(d.split("-")[2])} de ${MESES[Number(d.split("-")[1]) - 1]}`,
          }))}
        />
      </section>

      {/* Los días */}
      <div className="space-y-4">
        {dias.map((dia) => (
          <DiaPre
            key={dia}
            dia={dia}
            tareas={tareas
              .filter((t) => t.fecha === dia)
              .map((t) =>
                t.nombre === "TEMPORADA"
                  ? { ...t, nombre: temporadaHoy.toUpperCase() }
                  : t,
              )}
            dias={diasParaMover}
          />
        ))}
      </div>

      {/* Resumen de lo que se hizo */}
      <section className="tarjeta mt-8 overflow-x-auto">
        <h2 className="titulo mb-1 text-2xl">Qué se hizo esta semana</h2>
        <p className="mb-4 text-sm text-panel-500">
          Lo que quedó firmado por quien lo preparó.
        </p>
        {hechas.length === 0 ? (
          <p className="text-sm text-panel-500">
            Todavía no hay tareas marcadas como hechas.
          </p>
        ) : (
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b-2 border-panel-700 text-left">
                <th className="py-2 pr-3 font-bold">Día</th>
                <th className="px-3 py-2 font-bold">Qué es</th>
                <th className="px-3 py-2 font-bold">Nombre</th>
                <th className="px-3 py-2 font-bold">Gramaje</th>
                <th className="px-3 py-2 font-bold">Lote</th>
                <th className="px-3 py-2 text-right font-bold">Esperado</th>
                <th className="px-3 py-2 text-right font-bold">Salió</th>
                <th className="py-2 pl-3 font-bold">Quién</th>
              </tr>
            </thead>
            <tbody>
              {hechas.map((t) => (
                <tr key={t.id} className="border-b border-panel-100">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {nombreDia(t.fecha)} {t.fecha.split("-")[2]}
                  </td>
                  <td className="px-3 py-2 capitalize">{t.tipo}</td>
                  <td className="px-3 py-2 font-semibold">{t.nombre}</td>
                  <td className="px-3 py-2">{t.gramaje || "—"}</td>
                  <td className="px-3 py-2">{t.lote || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-panel-500">
                    {t.esperado ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums">
                    {t.cantidadReal ?? "—"}
                  </td>
                  <td className="py-2 pl-3 font-semibold text-panel-700">
                    {t.hechoPor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

function DiaPre({
  dia,
  tareas,
  dias,
}: {
  dia: string;
  tareas: Tarea[];
  dias: string[];
}) {
  const esHoy = dia === hoyLocal();
  const pendientes = tareas.filter((t) => !t.hecho).length;
  const [, mes, numero] = dia.split("-");

  if (tareas.length === 0) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-suave bg-claro px-5 py-3 text-panel-500">
        <span className="font-semibold capitalize text-panel-900/70">
          {nombreDia(dia)}
        </span>
        <span>
          {Number(numero)} de {MESES[Number(mes) - 1]}
        </span>
        <span className="ml-auto text-sm">sin tareas</span>
      </section>
    );
  }

  // Cada día se abre y se cierra; los que ya pasaron empiezan cerrados.
  return (
    <details
      open={dia >= hoyLocal()}
      className="group overflow-hidden rounded-3xl border-2 border-panel-200 bg-white"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 group-open:border-b-2 group-open:border-panel-100 [&::-webkit-details-marker]:hidden">
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <span className="inline-block text-base text-panel-500 transition group-open:rotate-90">
            ▶
          </span>
          <span className="capitalize">{nombreDia(dia)}</span> {Number(numero)}{" "}
          de {MESES[Number(mes) - 1]}
          {esHoy && (
            <span className="text-base font-semibold text-panel-500">
              (hoy)
            </span>
          )}
        </h3>
        <span className="text-sm font-semibold text-panel-700">
          {tareas.length} tarea{tareas.length === 1 ? "" : "s"} ·{" "}
          {pendientes === 0 ? "✓ todo hecho" : `${pendientes} por hacer`}
        </span>
      </summary>

      <div className="space-y-3 bg-fondo/40 px-5 py-4">
        <ListaOrdenable
          className="space-y-3"
          guardar={ordenarTareasDelDia.bind(null, dia)}
          items={tareas.map((t) => ({
            id: t.id,
            nodo: <TareaPre modo="programar" tarea={t} dias={dias} ordenable />,
          }))}
        />
      </div>
    </details>
  );
}
