import FilasSabores from "@/components/FilasSabores";
import { hoyLocal } from "@/lib/fechas";
import { registrarMuestra } from "@/app/cocina/acciones";


/** Registro de una muestra enviada a un cliente potencial. */
export default function FormularioMuestra({ productos }: { productos: { id: string; nombre: string }[] }) {
  return (
    <form action={registrarMuestra} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="m-prospecto">
          ¿A quién se la enviamos?
        </label>
        <input
          id="m-prospecto"
          name="prospecto"
          className="campo"
          placeholder="Ej: Hotel Ejemplo Suites Jones"
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="m-contacto">
          Contacto (opcional)
        </label>
        <input
          id="m-contacto"
          name="contacto"
          className="campo"
          placeholder="Nombre, teléfono o correo"
        />
      </div>
      <FilasSabores productos={productos} prefijo="m" />
      <div>
        <label className="etiqueta" htmlFor="m-fecha">
          Día
        </label>
        <input
          id="m-fecha"
          name="fecha"
          type="date"
          defaultValue={hoyLocal()}
          className="campo"
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="m-notas">
          Notas (opcional)
        </label>
        <input
          id="m-notas"
          name="notas"
          className="campo"
          placeholder="Ej: la llevamos a la reunión del martes"
        />
      </div>
      <div className="sm:col-span-2">
        <button type="submit" className="boton w-full sm:w-auto">
          Registrar muestra
        </button>
      </div>
    </form>
  );
}
