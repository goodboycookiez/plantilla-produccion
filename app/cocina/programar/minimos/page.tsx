import PestanasProgramar from "@/components/PestanasProgramar";
import { negocio } from "@/config/negocio";
import listas from "@/data/listas.json";
import { listarMinimosPanel } from "@/lib/db";
import { hoyLocal, lunesDeLaSemana } from "@/lib/fechas";
import { calcularInventario, clave, minimoBase } from "@/lib/inventario";
import { guardarMinimos } from "../../acciones";

export const dynamic = "force-dynamic";

/** Masas que no se llevan en el stock, y las que salen de otra masa (no llevan fila propia). */
const FUERA = new Set([...negocio.masas.fueraDelStock, ...Object.keys(negocio.masas.mismaMasa)]);
const { bolasPorProducto, tamanoDeBola } = negocio.masas;

/** Mínimos de stock: se cambian aquí y el Stock los usa de inmediato. */
export default async function ProgramarMinimos() {
  const [editados, { filas, temporada }] = await Promise.all([
    listarMinimosPanel(),
    calcularInventario(lunesDeLaSemana(hoyLocal())),
  ]);

  // Las masas de la lista en cada gramaje, las que ya se mueven en el stock y las ya editadas.
  // Lo que se hace con bolas de otro tamaño (config/negocio.ts) va en el tamaño de su bola.
  const claves = new Set<string>();
  for (const m of listas.masas) {
    if (FUERA.has(m)) continue;
    for (const g of negocio.produccion.gramajes) claves.add(clave(m, tamanoDeBola[m]?.[g] ?? g));
  }
  for (const f of filas) claves.add(`${f.nombre}|${f.gramaje}`);
  for (const k of Object.keys(editados)) claves.add(k);

  const lista = [...claves].sort();

  return (
    <main>
      <h1 className="titulo mb-4 text-3xl sm:text-4xl">Programar</h1>
      <PestanasProgramar activa="/cocina/programar/minimos" />

      <section className="tarjeta">
        <h2 className="titulo mb-1 text-2xl">Mínimos de stock</h2>
        <p className="mb-4 text-sm text-panel-500">
          Bolas que debería haber como mínimo en el congelador. Con esto el Stock marca cada masa como
          suficiente, bajo, crítico o agotado. Cambia el número y toca Guardar; si lo dejas vacío,
          vuelve al mínimo base.
        </p>
        <form action={guardarMinimos}>
          <ul className="grid gap-x-6 sm:grid-cols-2">
            {lista.map((k) => {
              const [nombre, gramaje] = k.split("|");
              const base = minimoBase(k);
              const valor = editados[k] ?? base;
              return (
                <li key={k} className="flex items-center justify-between gap-3 border-b border-panel-100 py-2">
                  <label htmlFor={`m-${k}`} className="min-w-0">
                    <span className="font-semibold">{nombre === "TEMPORADA" ? temporada.toUpperCase() : nombre}</span>{" "}
                    <span className="ml-1 rounded-full bg-panel-700 px-2 py-0.5 text-xs font-semibold text-white">
                      {gramaje}
                    </span>
                    {bolasPorProducto[nombre] && (
                      <span className="ml-2 text-xs text-panel-500">(bolas; {bolasPorProducto[nombre]} por unidad)</span>
                    )}
                    {editados[k] !== undefined && (
                      <span className="ml-2 text-xs text-panel-500">(base {base ?? "—"})</span>
                    )}
                  </label>
                  <input
                    id={`m-${k}`}
                    name={`m|${k}`}
                    type="number"
                    min={0}
                    defaultValue={valor ?? ""}
                    placeholder="sin mínimo"
                    className="w-24 rounded-lg border-2 border-panel-200 bg-white px-2 py-1.5 text-right font-bold"
                  />
                </li>
              );
            })}
          </ul>
          <button type="submit" className="boton mt-5 w-full sm:w-auto">
            Guardar mínimos
          </button>
        </form>
      </section>
    </main>
  );
}
