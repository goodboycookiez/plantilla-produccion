import { obtenerTemporada } from "@/lib/temporada";
import Link from "next/link";
import AnotarLibre from "@/components/AnotarLibre";
import listas from "@/data/listas.json";
import NavSemana from "@/components/NavSemana";
import SelectorDias from "@/components/SelectorDias";
import ListaOrdenable from "@/components/ListaOrdenable";
import TareaPre from "@/components/TareaPre";
import { listarTareas } from "@/lib/db";
import { diaSemana, diasDeLaSemana, hoyLocal, lunesDeLaSemana, sumarDias } from "@/lib/fechas";
import { anotarHecho, ordenarTareasDelDia } from "../acciones";

export const dynamic = "force-dynamic";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const esFecha = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

function partes(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { dia: DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], numero: d, mes: MESES[m - 1] };
}

/** Lo que ve la cocina: se elige el día y aparece lo que hay que preparar. */
export default async function Preproduccion({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; dia?: string }>;
}) {
  const temporadaHoy = (await obtenerTemporada()).nombre;
  const { semana, dia: diaPedido } = await searchParams;
  const hoy = hoyLocal();
  const lunes = lunesDeLaSemana(esFecha(semana) ? semana! : esFecha(diaPedido) ? diaPedido! : hoy);
  // La preproducción también puede caer sábado, así que se muestran seis días.
  const dias = [...diasDeLaSemana(lunes), sumarDias(lunes, 5)];
  const tareas = await listarTareas(lunes, dias[5]);
  const delDia = (d: string) => tareas.filter((t) => t.fecha === d);

  const abierto =
    (diaPedido && dias.includes(diaPedido) && diaPedido) ||
    (dias.includes(hoy) && hoy) ||
    dias.find((d) => delDia(d).length > 0) ||
    dias[0];

  const ini = partes(lunes);
  const fin = partes(dias[5]);
  const rango =
    ini.mes === fin.mes
      ? `${ini.numero} al ${fin.numero} de ${fin.mes}`
      : `${ini.numero} de ${ini.mes} al ${fin.numero} de ${fin.mes}`;

  // A dónde puede mover la cocina: la semana abierta y las dos siguientes, sin domingos.
  const diasPendiente = Array.from({ length: 21 }, (_, i) => sumarDias(lunes, i))
    .filter((d) => diaSemana(d) !== 0)
    .map((d) => {
      const p = partes(d);
      return { valor: d, texto: `${d === hoy ? "Hoy, " : ""}${p.dia} ${p.numero} de ${p.mes}` };
    });

  // La masa de temporada se guarda como TEMPORADA; en pantalla va con su nombre de hoy.
  const conNombre = (t: (typeof tareas)[number]) =>
    t.nombre === "TEMPORADA" ? { ...t, nombre: temporadaHoy.toUpperCase() } : t;
  const suyas = delDia(abierto).map(conNombre);
  const faltan = suyas.filter((t) => !t.hecho).length;
  const { dia: nombre, numero, mes } = partes(abierto);

  return (
    <main>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Preproducción</h1>
          <p className="mt-1 text-lg text-panel-700">Semana del {rango}</p>
        </div>
        <NavSemana
          ruta="/cocina/preproduccion"
          lunes={lunes}
          esEstaSemana={lunes === lunesDeLaSemana(hoy)}
        />
      </div>

      <SelectorDias
        abierto={abierto}
        hoy={hoy}
        dias={dias.map((d) => {
          const del = delDia(d);
          const pendientes = del.filter((t) => !t.hecho).length;
          return {
            dia: d,
            href: `/cocina/preproduccion?semana=${lunes}&dia=${d}`,
            cifra: del.length ? `${del.length} tarea${del.length === 1 ? "" : "s"}` : "",
            detalle: !del.length ? "libre" : pendientes ? `faltan ${pendientes}` : "✓ listo",
          };
        })}
      />

      <section className="overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-panel-100 px-5 py-5">
          <h2 className="text-2xl font-bold sm:text-3xl">
            <span className="capitalize">{nombre}</span> {numero} de {mes}
            {abierto === hoy && (
              <span className="ml-2 align-middle text-base font-semibold text-panel-500">(hoy)</span>
            )}
          </h2>
          {suyas.length > 0 && (
            <p className="text-base font-bold text-panel-700">
              {faltan === 0 ? "✓ Todo hecho" : `${faltan} de ${suyas.length} por hacer`}
            </p>
          )}
        </div>

        {suyas.length === 0 ? (
          <p className="px-5 py-10 text-center text-lg text-panel-500">
            No hay preproducción este día.
          </p>
        ) : (
          <div className="space-y-3 bg-fondo/40 px-5 py-5">
            <p className="text-sm text-panel-500">
              En este orden (arrastra ⠿ para acomodarlo). Cuando termines, escribe cuántas salieron,
              quién lo hizo y toca Listo.
            </p>
            {/* Lo pendiente, en el orden del día (se acomoda arrastrando); lo hecho baja. */}
            <ListaOrdenable
              className="space-y-3"
              guardar={ordenarTareasDelDia.bind(null, abierto)}
              items={suyas
                .filter((t) => !t.hecho)
                .map((t) => ({
                  id: t.id,
                  nodo: <TareaPre tarea={t} modo="cocina" diasPendiente={diasPendiente} ordenable />,
                }))}
            />
            {suyas
              .filter((t) => t.hecho)
              .map((t) => (
                <TareaPre key={t.id} tarea={t} modo="cocina" diasPendiente={diasPendiente} />
              ))}
          </div>
        )}
      </section>

      {/* Anotar a mano lo que se hizo, esté programado o no. */}
      <section className="mt-6 rounded-3xl border-2 border-panel-200 bg-white px-5 py-5">
        <h2 className="text-xl font-bold">Anotar lo que hice</h2>
        <p className="mb-3 text-sm text-panel-500">
          Una línea por masa: sabor, gramaje y cuántas salieron. Si estaba programado arriba,
          se marca solo.
        </p>
        <AnotarLibre
          accion={anotarHecho}
          conocidos={[...listas.masas, ...listas.rellenos, ...listas.toppings, temporadaHoy]}
          equipo={listas.equipo}
          ocultos={{ fecha: abierto }}
          pregunta="Qué hice hoy"
          ejemplo={"Chocolate 70g 150\nAvena 70g 120\nArequipe 2"}
          boton="Guardar"
        />
      </section>

      <p className="mt-6 text-center text-sm text-panel-500">
        ¿Hay que agregar o mover algo?{" "}
        <Link href="/cocina/programar" className="font-semibold text-panel-700 underline">
          Programar
        </Link>{" "}
        (solo quien administra).
      </p>
    </main>
  );
}
