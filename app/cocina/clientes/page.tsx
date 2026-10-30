import Link from "next/link";
import CamposCliente from "@/components/CamposCliente";
import FaltaHistorial from "@/components/FaltaHistorial";
import { estadoDe, historialSeguro, listarTodosLosClientes } from "@/lib/clientes";
import { ESTADOS, resumenPedidos } from "@/lib/cronologia";
import { listarPedidos } from "@/lib/db";
import { fechaCorta, hoyLocal } from "@/lib/fechas";
import { crearClienteAccion } from "../acciones";

export const dynamic = "force-dynamic";

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * La base de clientes: reemplaza el archivo de Excel. Cada cliente
 * tiene su ficha con los datos y la cronología (pedidos, notas y cambios).
 */
export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ver?: string }>;
}) {
  const { q = "", ver = "activos" } = await searchParams;
  const hoy = hoyLocal();
  const [todos, pedidos, { historial, falta }] = await Promise.all([
    listarTodosLosClientes(),
    listarPedidos(),
    historialSeguro(),
  ]);

  const filas = todos
    .map((c) => ({
      cliente: c,
      estado: estadoDe(c, historial),
      resumen: resumenPedidos(pedidos.filter((p) => p.clienteId === c.id), hoy),
    }))
    .filter(({ cliente: c, estado }) => {
      if (ver === "activos" && estado !== "activo") return false;
      if (ver === "inactivos" && estado === "activo") return false;
      const buscado = sinTildes(q.trim());
      return !buscado || sinTildes(`${c.nombre} ${c.razonSocial} ${c.direccion} ${c.telefono}`).includes(buscado);
    })
    .sort(
      (a, b) =>
        Number(!!b.cliente.interno) - Number(!!a.cliente.interno) ||
        a.cliente.nombre.localeCompare(b.cliente.nombre, "es", { sensitivity: "base" }),
    );
  const cuantos = (e: string) => todos.filter((c) => (estadoDe(c, historial) === "activo") === (e === "activos")).length;

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="titulo text-3xl sm:text-4xl">Clientes</h1>
          <p className="mt-1 text-lg text-panel-700">Tus clientes, su información y su historia</p>
        </div>
      </div>

      {falta && <FaltaHistorial />}

      <details className="tarjeta mb-6">
        <summary className="cursor-pointer text-xl font-bold">+ Cliente nuevo</summary>
        <p className="mb-4 mt-1 text-sm text-panel-500">
          Al guardarlo aparece de inmediato en el formulario de pedidos y en Programar → Pedidos, con el
          menú general de sabores.
        </p>
        <form action={crearClienteAccion} className="grid gap-3 sm:grid-cols-2">
          <CamposCliente prefijo="nuevo" />
          <div className="sm:col-span-2">
            <button type="submit" className="boton w-full sm:w-auto">
              Agregar cliente
            </button>
          </div>
        </form>
      </details>

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, razón social, dirección o número"
          aria-label="Buscar cliente"
          className="min-w-0 flex-1 rounded-xl border-2 border-panel-200 bg-white px-4 py-2"
        />
        <input type="hidden" name="ver" value={ver} />
        <button type="submit" className="rounded-xl bg-panel-700 px-4 py-2 font-semibold text-white">
          Buscar
        </button>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { valor: "activos", texto: `Activos (${cuantos("activos")})` },
          { valor: "inactivos", texto: `Pausados y perdidos (${cuantos("inactivos")})` },
          { valor: "todos", texto: `Todos (${todos.length})` },
        ].map((o) => (
          <Link
            key={o.valor}
            href={`/cocina/clientes?${new URLSearchParams({ ...(q ? { q } : {}), ver: o.valor })}`}
            className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${
              ver === o.valor
                ? "border-panel-700 bg-panel-700 text-white"
                : "border-panel-200 bg-white text-panel-700 hover:border-panel-500"
            }`}
          >
            {o.texto}
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border-2 border-panel-200 bg-white">
        {filas.length === 0 ? (
          <p className="px-5 py-10 text-center text-lg text-panel-500">No hay clientes con esa búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b-2 border-panel-100 text-sm text-panel-500">
                  <th className="px-4 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Tamaño</th>
                  <th className="px-3 py-2 font-semibold">Valor</th>
                  <th className="px-3 py-2 font-semibold">Último pedido</th>
                  <th className="px-3 py-2 text-right font-semibold">Unidades 30 días</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ cliente: c, estado, resumen }) => (
                  <tr key={c.id} className="border-b border-panel-100 last:border-0 hover:bg-panel-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/cocina/clientes/${c.id}`} className="font-semibold text-panel-900 underline-offset-2 hover:underline">
                        {c.nombre}
                      </Link>
                      <p className="text-xs text-panel-500">{c.direccion || c.razonSocial || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5">{c.gramaje}</td>
                    <td className="px-3 py-2.5 text-sm">{c.valorUnitario || "—"}</td>
                    <td className="px-3 py-2.5 text-sm">{resumen.ultimo ? fechaCorta(resumen.ultimo) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{resumen.galletasMes || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADOS[estado].clase}`}>
                        {ESTADOS[estado].texto}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
