import Cinta from "@/components/Cinta";
import Logo from "@/components/Logo";
import FormularioPedido from "@/components/FormularioPedido";
import Saludo from "@/components/Saludo";
import { Galleta } from "@/components/Garabatos";
import { negocio } from "@/config/negocio";
import { listarClientesPublicos } from "@/lib/clientes";
import { listarProductos } from "@/lib/temporada";

export const dynamic = "force-dynamic";

export default async function PaginaPedido() {
  const [clientesPublicos, productos] = await Promise.all([listarClientesPublicos(), listarProductos()]);
  return (
    <>
      <div className="bg-marca py-2 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-claro">
          {negocio.textos.franja}
        </p>
      </div>

      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6 sm:px-6">
        <Logo />
        <Galleta className="h-8 w-8 text-marca" />
      </div>

      <Saludo />

      <Cinta />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Al navegador solo va lo que el formulario muestra: nada de teléfonos, precios ni razón social. */}
        <FormularioPedido
          clientes={clientesPublicos.map(
            ({ id, nombre, gramaje, direccion, horarioEntrega, desarrollos }) => ({
              id,
              nombre,
              gramaje,
              direccion,
              horarioEntrega,
              desarrollos,
            }),
          )}
          productos={productos}
        />
      </div>
    </>
  );
}
