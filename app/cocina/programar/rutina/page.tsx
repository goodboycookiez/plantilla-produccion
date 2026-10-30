import PestanasProgramar from "@/components/PestanasProgramar";
import listas from "@/data/listas.json";
import FaltaConfigurar from "@/components/FaltaConfigurar";
import { FaltanTablasRutina, listarRutinas } from "@/lib/db";
import type { CategoriaRutina } from "@/lib/tipos";
import rutinasBase from "@/data/rutinas-base.json";
import { mismoNombre } from "@/lib/anotar";
import { idDeYoutube, obtenerVideoPausa } from "@/lib/pausa";
import { borrarRutinaAccion, cargarRutinasBase, crearRutinaAccion, guardarVideoPausa } from "../../acciones";

export const dynamic = "force-dynamic";

const DIAS = [
  { n: 1, texto: "Lun" },
  { n: 2, texto: "Mar" },
  { n: 3, texto: "Mié" },
  { n: 4, texto: "Jue" },
  { n: 5, texto: "Vie" },
  { n: 6, texto: "Sáb" },
];
const CATEGORIAS: { valor: CategoriaRutina; texto: string }[] = [
  { valor: "limpieza", texto: "Limpieza" },
  { valor: "inventario", texto: "Inventario" },
  { valor: "otra", texto: "Otra" },
];

/** Las tareas fijas de la semana: se crean una vez y salen cada semana. */
export default async function ProgramarRutina() {
  let rutinas;
  try {
    // La pausa activa no se borra ni se edita como una tarea más.
    rutinas = (await listarRutinas()).filter((r) => r.categoria !== "pausa");
  } catch (e) {
    if (e instanceof FaltanTablasRutina) return <FaltaConfigurar />;
    throw e;
  }

  // De la rutina estándar: las que no están, y las que quedaron con otros días.
  const faltan = rutinasBase.filter(
    (b) => !rutinas.some((r) => mismoNombre(r.nombre, b.nombre)),
  );
  const cambiadas = rutinasBase.filter((b) => {
    const ya = rutinas.find((r) => mismoNombre(r.nombre, b.nombre));
    return ya && ya.dias.join() !== b.dias.join();
  });
  const porHacer = faltan.length + cambiadas.length;
  const video = await obtenerVideoPausa();
  const videoId = idDeYoutube(video);


  return (
    <main>
      <h1 className="titulo mb-4 text-3xl sm:text-4xl">Programar</h1>
      <PestanasProgramar activa="/cocina/programar/rutina" />

      {porHacer > 0 && (
        <section className="tarjeta mb-6 border-panel-500 bg-claro">
          <h2 className="titulo mb-1 text-2xl">La rutina estándar de la cocina</h2>
          <p className="mb-3 text-sm text-panel-500">
            La rutina base del archivo data/rutinas-base.json: limpieza, conteos e
            inventario con sus días fijos.{" "}
            {faltan.length > 0 && (
              <>
                Faltan <strong>{faltan.length}</strong> por cargar.{" "}
              </>
            )}
            {cambiadas.length > 0 && (
              <>
                Hay <strong>{cambiadas.length}</strong> con días distintos a los
                acordados.
              </>
            )}
          </p>
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {[...faltan, ...cambiadas].map((r) => (
              <li
                key={r.nombre}
                className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-panel-200"
              >
                <span className="font-semibold text-panel-700">
                  {r.dias.map((d) => DIAS.find((x) => x.n === d)?.texto).join(" ")}
                </span>{" "}
                {r.nombre}
              </li>
            ))}
          </ul>
          <form action={cargarRutinasBase}>
            <button
              type="submit"
              className="rounded-xl bg-panel-700 px-5 py-2.5 font-semibold text-white hover:bg-panel-900"
            >
              {faltan.length > 0 && cambiadas.length > 0
                ? `Cargar ${faltan.length} y corregir ${cambiadas.length}`
                : faltan.length > 0
                  ? `Cargar las ${faltan.length} que faltan`
                  : `Corregir los días de ${cambiadas.length}`}
            </button>
          </form>
        </section>
      )}

      <section className="tarjeta mb-6">
        <h2 className="titulo mb-1 text-2xl">🧘‍♀️ Video de la pausa activa</h2>
        <p className="mb-4 text-sm text-panel-500">
          De lunes a viernes a las 12:00 el panel se tapa con este video y una cuenta regresiva de 10
          minutos; al final cada una marca que la hizo. Pega aquí el link de YouTube (se puede cambiar
          cuando quieras).
        </p>
        <form action={guardarVideoPausa} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label className="etiqueta" htmlFor="p-video">
              Link del video
            </label>
            <input
              id="p-video"
              name="video"
              className="campo"
              defaultValue={video}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>
          <button type="submit" className="boton">
            Guardar video
          </button>
        </form>
        {videoId ? (
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-panel-700 underline"
          >
            Ver el video guardado →
          </a>
        ) : (
          <p className="mt-3 text-sm font-semibold text-red-700">Todavía no hay video guardado.</p>
        )}
      </section>

      <section className="tarjeta mb-6">
        <h2 className="titulo mb-1 text-2xl">Nueva tarea fija</h2>
        <p className="mb-4 text-sm text-panel-500">
          Se crea una vez y aparece todas las semanas en los días que marques.
        </p>
        <form action={crearRutinaAccion} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="r-nombre">
              Qué hay que hacer
            </label>
            <input
              id="r-nombre"
              name="nombre"
              className="campo"
              placeholder="Ej: Limpiar la campana y los filtros"
              required
            />
          </div>
          <div>
            <label className="etiqueta" htmlFor="r-categoria">
              Tipo
            </label>
            <select id="r-categoria" name="categoria" className="campo" defaultValue="limpieza">
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.texto}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="etiqueta" htmlFor="r-encargada">
              Quién
            </label>
            <select id="r-encargada" name="encargada" className="campo" defaultValue="">
              <option value="">Cualquiera del equipo</option>
              {listas.equipo.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="etiqueta">Qué días</legend>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <label
                  key={d.n}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-panel-200 bg-white px-3 py-2 has-[:checked]:border-panel-700 has-[:checked]:bg-panel-700 has-[:checked]:text-white"
                >
                  <input type="checkbox" name="dias" value={d.n} className="sr-only" />
                  <span className="font-semibold">{d.texto}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <label className="etiqueta" htmlFor="r-notas">
              Notas
            </label>
            <input id="r-notas" name="notas" className="campo" placeholder="Ej: con desengrasante" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="boton w-full sm:w-auto">
              Agregar a la rutina
            </button>
          </div>
        </form>
      </section>

      <section className="tarjeta">
        <h2 className="titulo mb-4 text-2xl">La rutina de la semana</h2>
        {rutinas.length === 0 ? (
          <p className="text-panel-500">Todavía no hay tareas fijas.</p>
        ) : (
          <ul className="space-y-2">
            {rutinas.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-panel-100 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.nombre}</p>
                  <p className="text-sm text-panel-500">
                    {CATEGORIAS.find((c) => c.valor === r.categoria)?.texto} ·{" "}
                    {r.encargada || "Cualquiera"}
                    {r.notas ? ` · ${r.notas}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  {DIAS.map((d) => (
                    <span
                      key={d.n}
                      className={`w-9 rounded-lg py-1 text-center text-xs font-semibold ${
                        r.dias.includes(d.n) ? "bg-panel-700 text-white" : "bg-panel-50 text-panel-300"
                      }`}
                    >
                      {d.texto}
                    </span>
                  ))}
                </div>
                <form action={borrarRutinaAccion}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-sm font-semibold text-red-700 underline">
                    Borrar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
