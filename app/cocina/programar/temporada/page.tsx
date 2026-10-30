import PestanasProgramar from "@/components/PestanasProgramar";
import { obtenerTemporada } from "@/lib/temporada";
import { guardarTemporada } from "../../acciones";

export const dynamic = "force-dynamic";

/** El sabor de temporada: se cambia aquí cada vez que llega una temporada nueva. */
export default async function ProgramarTemporada() {
  const t = await obtenerTemporada();

  return (
    <main>
      <h1 className="titulo mb-4 text-3xl sm:text-4xl">Programar</h1>
      <PestanasProgramar activa="/cocina/programar/temporada" />

      <section className="tarjeta">
        <h2 className="titulo mb-1 text-2xl">Sabor de temporada</h2>
        <p className="mb-4 text-sm text-panel-500">
          Es un solo sabor que va cambiando (Halloween, Navidad…). Lo que pongas aquí es lo que ven
          todos los clientes, incluido tu punto de venta. En preproducción y en los conteos se puede escribir
          con este nombre; en el Stock siempre es la fila <strong>TEMPORADA 90g</strong> y su mínimo
          se cambia en Mínimos.
        </p>
        <form action={guardarTemporada} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="t-nombre">
              Nombre del sabor
            </label>
            <input id="t-nombre" name="nombre" className="campo" defaultValue={t.nombre} required />
          </div>
          <div>
            <label className="etiqueta" htmlFor="t-descripcion">
              Descripción (la ven los clientes)
            </label>
            <input id="t-descripcion" name="descripcion" className="campo" defaultValue={t.descripcion} />
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="activo" defaultChecked={t.activo} className="h-5 w-5" />
            <span className="font-semibold">A la venta (si lo desmarcas, deja de salir en el formulario)</span>
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className="boton w-full sm:w-auto">
              Guardar temporada
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
