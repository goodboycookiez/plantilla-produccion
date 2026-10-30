import EtiquetaSeguimiento, { NOMBRE_SEGUIMIENTO } from "@/components/EtiquetaSeguimiento";
import FormularioMuestra from "@/components/FormularioMuestra";
import FilasSabores from "@/components/FilasSabores";
import { listarBajas, listarMuestras } from "@/lib/db";
import { listarProductos } from "@/lib/temporada";
import { fechaLarga, hoyLocal, sumarDias } from "@/lib/fechas";
import type { SeguimientoMuestra } from "@/lib/tipos";
import { cambiarSeguimiento, eliminarBaja, eliminarMuestra, registrarBaja } from "../acciones";


export const dynamic = "force-dynamic";

export default async function Muestras() {
  const productos = await listarProductos();
  const muestras = await listarMuestras();
  const hoy = hoyLocal();
  const bajas = await listarBajas(sumarDias(hoy, -13), hoy);

  const porProspecto = new Map<string, typeof muestras>();
  for (const m of muestras) {
    porProspecto.set(m.prospecto, [...(porProspecto.get(m.prospecto) ?? []), m]);
  }

  const conteo = (estado: SeguimientoMuestra) =>
    muestras.filter((m) => m.seguimiento === estado).length;

  return (
    <main>
      <p className="micro text-marca/60">Lo que sale sin venderse</p>
      <h1 className="titulo mb-6 text-3xl sm:text-4xl">Muestras y bajas</h1>

      {/* Bajas */}
      <section id="bajas" className="tarjeta mb-10 scroll-mt-6">
        <h2 className="titulo mb-1 text-2xl">Bajas</h2>
        <p className="mb-4 text-sm text-tinta/60">
          Producto que se perdió: se quemaron, se cayeron, salieron mal.
        </p>

        <form action={registrarBaja} className="mb-6 grid gap-3 sm:grid-cols-2">
          <FilasSabores productos={productos} prefijo="baja" />
          <div>
            <label className="etiqueta" htmlFor="baja-fecha">
              Día
            </label>
            <input
              id="baja-fecha"
              name="fecha"
              type="date"
              defaultValue={hoyLocal()}
              className="campo"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="baja-motivo">
              Motivo
            </label>
            <input
              id="baja-motivo"
              name="motivo"
              className="campo"
              placeholder="Ej: se quemaron en el horno 2"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="boton w-full sm:w-auto">
              Registrar baja
            </button>
          </div>
        </form>

        <p className="micro mb-3 text-marca/60">Últimos 14 días</p>
        {bajas.length === 0 ? (
          <p className="text-sm text-tinta/60">Sin bajas en los últimos 14 días. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {bajas.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-marca/15 px-4 py-3 text-sm"
              >
                <span>
                  <strong>
                    {b.cantidad} {b.nombre}
                  </strong>{" "}
                  {b.gramaje} · {fechaLarga(b.fecha)}
                  {b.motivo && <span className="text-tinta/60"> — {b.motivo}</span>}
                </span>
                <form action={eliminarBaja}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="text-xs font-bold text-red-700 underline">
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <h2 className="titulo text-2xl sm:text-3xl">Muestras enviadas</h2>
      <p className="mt-1 text-sm text-tinta/60">
        {muestras.length} muestra{muestras.length === 1 ? "" : "s"} a {porProspecto.size} posible
        {porProspecto.size === 1 ? "" : "s"} cliente{porProspecto.size === 1 ? "" : "s"}
      </p>

      {muestras.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(NOMBRE_SEGUIMIENTO) as SeguimientoMuestra[]).map((estado) => (
            <span key={estado} className="rounded-full bg-claro px-3 py-1.5 text-sm">
              <strong>{conteo(estado)}</strong>{" "}
              <span className="text-tinta/60">{NOMBRE_SEGUIMIENTO[estado].toLowerCase()}</span>
            </span>
          ))}
        </div>
      )}

      <section className="tarjeta mt-6">
        <h2 className="titulo mb-4 text-2xl">Registrar una muestra</h2>
        <FormularioMuestra productos={productos.map(({ id, nombre }) => ({ id, nombre }))} />
      </section>

      <section className="mt-6 space-y-4">
        {[...porProspecto.entries()].map(([prospecto, suyas]) => (
          <div key={prospecto} className="tarjeta">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="titulo text-xl">{prospecto}</h3>
              <EtiquetaSeguimiento estado={suyas[0].seguimiento} />
            </div>
            {suyas[0].contacto && (
              <p className="mb-3 text-sm text-tinta/60">{suyas[0].contacto}</p>
            )}
            <ul className="space-y-2">
              {suyas.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-marca/15 px-4 py-3 text-sm"
                >
                  <span>
                    <strong>
                      {m.cantidad} {m.nombre}
                    </strong>{" "}
                    <span className="text-tinta/60">
                      {m.gramaje} · {fechaLarga(m.fecha)}
                    </span>
                    {m.notas && <span className="block text-xs text-tinta/50">{m.notas}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <form action={cambiarSeguimiento} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={m.id} />
                      <select
                        name="seguimiento"
                        defaultValue={m.seguimiento}
                        aria-label={`Seguimiento de la muestra de ${m.prospecto}`}
                        className="rounded-lg border-2 border-marca/20 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        {(Object.keys(NOMBRE_SEGUIMIENTO) as SeguimientoMuestra[]).map((valor) => (
                          <option key={valor} value={valor}>
                            {NOMBRE_SEGUIMIENTO[valor]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border-2 border-marca/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-marca/70"
                      >
                        Ok
                      </button>
                    </form>
                    <form action={eliminarMuestra}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="text-xs font-bold text-red-700 underline">
                        Eliminar
                      </button>
                    </form>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {muestras.length === 0 && (
          <p className="tarjeta text-sm text-tinta/60">
            Todavía no hay muestras registradas. Cuando envíes una, queda acá el historial por
            cliente potencial.
          </p>
        )}
      </section>
    </main>
  );
}
