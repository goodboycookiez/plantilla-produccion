import Link from "next/link";
import NavSemana from "@/components/NavSemana";
import SelectorDias from "@/components/SelectorDias";
import listas from "@/data/listas.json";
import FaltaConfigurar from "@/components/FaltaConfigurar";
import { FaltanTablasRutina, listarRegistrosRutina, listarRutinas } from "@/lib/db";
import { diaSemana, diasDeLaSemana, hoyLocal, lunesDeLaSemana, sumarDias, ZONA } from "@/lib/fechas";
import type { CategoriaRutina, RegistroRutina, Rutina } from "@/lib/tipos";
import rutinasBase from "@/data/rutinas-base.json";
import { mismoNombre } from "@/lib/anotar";
import { puedeProgramar } from "@/lib/permisos";
import { ID_PAUSA, INICIO_PAUSAS } from "@/lib/pausa";
import { negocio } from "@/config/negocio";
import { cargarRutinasBase, deshacerRutina, marcarPausa, marcarRutina } from "../acciones";

export const dynamic = "force-dynamic";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const GRUPOS: { categoria: CategoriaRutina; titulo: string }[] = [
  { categoria: "limpieza", titulo: "Limpieza" },
  { categoria: "inventario", titulo: "Inventario" },
  { categoria: "otra", titulo: "Otras tareas" },
];
const esFecha = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");

function partes(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { dia: DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], numero: d, mes: MESES[m - 1] };
}

const hora = (iso: string) =>
  new Intl.DateTimeFormat(negocio.produccion.idioma, { timeZone: ZONA, hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );

/** Lo fijo de cada día: limpieza, conteos y demás, igual todas las semanas. */
export default async function Limpieza({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; dia?: string; quien?: string }>;
}) {
  const { semana, dia: diaPedido, quien } = await searchParams;
  const persona = listas.equipo.includes(quien ?? "") ? quien! : "";
  const hoy = hoyLocal();
  const lunes = lunesDeLaSemana(esFecha(semana) ? semana! : esFecha(diaPedido) ? diaPedido! : hoy);
  const dias = [...diasDeLaSemana(lunes), sumarDias(lunes, 5)];
  const abierto =
    (diaPedido && dias.includes(diaPedido) && diaPedido) || (dias.includes(hoy) && hoy) || dias[0];

  let todas, registros;
  try {
    [todas, registros] = await Promise.all([listarRutinas(), listarRegistrosRutina(lunes, dias[5])]);
  } catch (e) {
    if (e instanceof FaltanTablasRutina) return <FaltaConfigurar />;
    throw e;
  }
  // La pausa activa va aparte: tiene su propio bloque y su cronología.
  todas = todas.filter((r) => r.categoria !== "pausa");
  const pausas = registros.filter((r) => r.rutinaId === ID_PAUSA);
  const equipoVisto = persona ? [persona] : listas.equipo;
  // De la rutina acordada: lo que todavía no está cargado o quedó con otros días.
  const porCargar = rutinasBase.filter((b) => {
    const ya = todas.find((r) => mismoNombre(r.nombre, b.nombre));
    return !ya || ya.dias.join() !== b.dias.join();
  });
  const puedeCargar = porCargar.length > 0 && (await puedeProgramar());

  // Con una persona elegida: lo suyo y lo que es de cualquiera.
  const rutinas = persona ? todas.filter((r) => !r.encargada || r.encargada === persona) : todas;
  const delDia = (d: string) => rutinas.filter((r) => r.dias.includes(diaSemana(d)));
  const firma = (r: Rutina, d: string) =>
    registros.find((x) => x.rutinaId === r.id && x.fecha === d);

  const url = (extra: Record<string, string>) => {
    const q = new URLSearchParams({ semana: lunes, dia: abierto, ...(persona ? { quien: persona } : {}), ...extra });
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    return `/cocina/limpieza?${q}`;
  };

  const suyas = delDia(abierto);
  // Lo que se repite toda la semana se separa de lo fijo de ese día.
  const deSiempre = suyas.filter((r) => r.dias.length >= 5);
  const delDiaFijo = suyas.filter((r) => r.dias.length < 5);
  const faltan = suyas.filter((r) => !firma(r, abierto)).length;
  const { dia: nombre, numero, mes } = partes(abierto);

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Limpieza y rutina</h1>
          <p className="mt-1 text-lg text-panel-700">Lo que toca cada día, todas las semanas</p>
        </div>
        <NavSemana ruta="/cocina/limpieza" lunes={lunes} esEstaSemana={lunes === lunesDeLaSemana(hoy)} />
      </div>

      {/* Cada una puede ver solo lo suyo. */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-panel-500">Ver:</span>
        {["", ...listas.equipo].map((p) => (
          <Link
            key={p || "todas"}
            href={url({ quien: p })}
            scroll={false}
            className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${
              persona === p
                ? "border-panel-700 bg-panel-700 text-white"
                : "border-panel-200 bg-white text-panel-700 hover:border-panel-500"
            }`}
          >
            {p || "Todas"}
          </Link>
        ))}
      </div>

      {puedeCargar && (
        <section className="mb-5 rounded-3xl border-2 border-panel-500 bg-claro px-5 py-4">
          <h2 className="text-xl font-bold">La rutina acordada todavía no está completa</h2>
          <p className="mt-1 text-panel-700">
            Faltan <strong>{porCargar.length}</strong> tareas fijas de la rutina base
            (data/rutinas-base.json): {porCargar.map((r) => r.nombre.toLowerCase()).join(", ")}.
          </p>
          <form action={cargarRutinasBase} className="mt-3">
            <button
              type="submit"
              className="rounded-xl bg-panel-700 px-5 py-2.5 font-semibold text-white hover:bg-panel-900"
            >
              Cargar la rutina acordada
            </button>
          </form>
        </section>
      )}

      <SelectorDias
        abierto={abierto}
        hoy={hoy}
        dias={dias.map((d) => {
          const del = delDia(d);
          const pendientes = del.filter((r) => !firma(r, d)).length;
          return {
            dia: d,
            href: url({ dia: d }),
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
          <p className="px-5 py-10 text-center text-lg text-panel-500">Nada programado este día.</p>
        ) : (
          <div className="space-y-6 bg-fondo/40 px-5 py-5">
            {/* Primero lo propio del día, que es lo que cambia; después lo de siempre. */}
            {[
              { titulo: `Solo los ${nombre}`, lista: delDiaFijo, aviso: "" },
              {
                titulo: "Todos los días",
                lista: deSiempre,
                aviso: "Al cierre de cada turno",
              },
            ].map(({ titulo, lista, aviso }) =>
              lista.length === 0 ? null : (
                <div key={titulo}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-2">
                    <h3 className="text-lg font-bold first-letter:uppercase">{titulo}</h3>
                    {aviso && <span className="text-sm text-panel-500">{aviso}</span>}
                  </div>
                  <div className="space-y-4">
                    {GRUPOS.map(({ categoria, titulo: grupo }) => {
                      const items = lista.filter((r) => r.categoria === categoria);
                      if (!items.length) return null;
                      return (
                        <div key={categoria}>
                          {lista.filter((r) => r.categoria !== categoria).length > 0 && (
                            <h4 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-panel-500">
                              {grupo}
                            </h4>
                          )}
                          <ul className="space-y-2">
                            {items.map((r) => (
                              <ItemRutina
                                key={r.id}
                                rutina={r}
                                fecha={abierto}
                                registro={firma(r, abierto)}
                                persona={persona}
                              />
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <PausasDeLaSemana
        dias={dias.slice(0, 5)}
        hoy={hoy}
        abierto={abierto}
        equipo={equipoVisto}
        pausas={pausas}
      />

      <p className="mt-6 text-center text-sm text-panel-500">
        ¿Hay que agregar o quitar algo de la rutina?{" "}
        <Link href="/cocina/programar/rutina" className="font-semibold text-panel-700 underline">
          Programar
        </Link>{" "}
        (solo quien administra).
      </p>
    </main>
  );
}

function ItemRutina({
  rutina,
  fecha,
  registro,
  persona,
}: {
  rutina: Rutina;
  fecha: string;
  registro?: RegistroRutina;
  persona: string;
}) {
  const esConteo = rutina.categoria === "inventario";

  return (
    <li
      className={`rounded-2xl border-2 px-4 py-3 ${
        registro ? "border-panel-100 bg-panel-50" : "border-panel-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className={`min-w-0 flex-1 ${registro ? "opacity-70" : ""}`}>
          <p className={`text-lg font-semibold ${registro ? "line-through decoration-panel-500" : ""}`}>
            {rutina.nombre}
          </p>
          <p className="text-sm text-panel-500">
            {rutina.encargada || "Cualquiera del equipo"}
            {rutina.notas ? ` · ${rutina.notas}` : ""}
          </p>
          {esConteo && !registro && (
            <Link href="/cocina/inventario#conteo" className="text-sm font-semibold text-panel-700 underline">
              Ir a anotar el conteo →
            </Link>
          )}
        </div>

        {registro ? (
          <form action={deshacerRutina} className="flex items-center gap-3">
            <input type="hidden" name="id" value={registro.id} />
            <span className="font-semibold text-panel-700">
              ✓ {registro.hechoPor} · {hora(registro.hechoEn)}
            </span>
            <button
              type="submit"
              className="rounded-lg border-2 border-panel-300 px-3 py-1 text-sm font-semibold text-panel-700"
            >
              Deshacer
            </button>
          </form>
        ) : (
          <form action={marcarRutina} className="flex items-center gap-2">
            <input type="hidden" name="rutinaId" value={rutina.id} />
            <input type="hidden" name="fecha" value={fecha} />
            <select
              name="quien"
              required
              defaultValue={persona || rutina.encargada || ""}
              aria-label={`Quién hizo ${rutina.nombre}`}
              className="rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                ¿Quién?
              </option>
              {listas.equipo.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-panel-700 px-4 py-1.5 font-semibold text-white hover:bg-panel-900"
            >
              ✓ Hecho
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

/**
 * La cronología de la pausa activa: quién la hizo cada día y a qué hora.
 * Desde aquí se marca a quien se le pasó (o se deshace una marca errada).
 */
function PausasDeLaSemana({
  dias,
  hoy,
  abierto,
  equipo,
  pausas,
}: {
  dias: string[];
  hoy: string;
  abierto: string;
  equipo: string[];
  pausas: RegistroRutina[];
}) {
  const de = (p: string, d: string) => pausas.find((r) => r.hechoPor === p && r.fecha === d);
  const conFirma = equipo.filter((p) => de(p, abierto)).length;
  const esDiaHabil = dias.includes(abierto);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-panel-100 px-5 py-4">
        <h2 className="text-2xl font-bold">🧘‍♀️ Pausa activa · 12:00</h2>
        <p className="text-sm text-panel-500">10 minutos con el video, de lunes a viernes</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b-2 border-panel-100 text-sm text-panel-500">
              <th className="px-5 py-2 font-semibold">Quién</th>
              {dias.map((d) => {
                const { dia, numero } = partes(d);
                return (
                  <th
                    key={d}
                    className={`px-2 py-2 text-center font-semibold capitalize ${d === abierto ? "text-panel-900" : ""}`}
                  >
                    {dia.slice(0, 3)} {numero}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {equipo.map((p) => (
              <tr key={p} className="border-b border-panel-100 last:border-0">
                <td className="px-5 py-2.5 font-semibold">{p}</td>
                {dias.map((d) => {
                  const r = de(p, d);
                  return (
                    <td key={d} className={`px-2 py-2.5 text-center ${d === abierto ? "bg-panel-50" : ""}`}>
                      {r ? (
                        <span className="font-semibold text-panel-700">✓ {hora(r.hechoEn)}</span>
                      ) : d < hoy && d >= INICIO_PAUSAS ? (
                        <span className="font-semibold text-red-700">✗</span>
                      ) : (
                        <span className="text-panel-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {esDiaHabil && abierto <= hoy && (
        <div className="border-t-2 border-panel-100 bg-fondo/40 px-5 py-4">
          <p className="mb-2 font-semibold">
            <span className="capitalize">{partes(abierto).dia}</span> {partes(abierto).numero}:{" "}
            {conFirma === equipo.length ? "✓ todas la hicieron" : `${conFirma} de ${equipo.length} la hicieron`}
          </p>
          <ul className="flex flex-wrap gap-2">
            {equipo.map((p) => {
              const r = de(p, abierto);
              return (
                <li key={p}>
                  {r ? (
                    <form action={deshacerRutina} className="flex items-center gap-2 rounded-xl border-2 border-panel-100 bg-panel-50 px-3 py-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <span className="font-semibold text-panel-700">✓ {p}</span>
                      <button type="submit" className="text-xs font-semibold text-panel-500 underline">
                        Deshacer
                      </button>
                    </form>
                  ) : (
                    <form action={marcarPausa}>
                      <input type="hidden" name="fecha" value={abierto} />
                      <input type="hidden" name="quien" value={p} />
                      <button
                        type="submit"
                        className="rounded-xl border-2 border-panel-300 bg-white px-3 py-1.5 font-semibold text-panel-700 hover:border-panel-700"
                      >
                        Marcar a {p}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
