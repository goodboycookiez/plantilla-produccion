import Link from "next/link";
import PedidoEscrito from "@/components/PedidoEscrito";
import PedidosVarios from "@/components/PedidosVarios";
import MuestrasEscritas from "@/components/MuestrasEscritas";
import PestanasProgramar from "@/components/PestanasProgramar";
import { listarProductos } from "@/lib/temporada";
import { listarClientes } from "@/lib/clientes";
import { esHabil, fechaCorta, hoyLocal, siguienteHabil, sumarDias } from "@/lib/fechas";
import { GRAMAJES } from "@/lib/gramaje";
import { crearMuestrasEscritas, crearPedidoEscrito, crearPedidosVarios } from "../../acciones";

export const dynamic = "force-dynamic";

/** Pedidos que llegan por WhatsApp: se programan aquí y van al mismo calendario. */
export default async function ProgramarPedidos() {
  const [clientes, productos] = await Promise.all([listarClientes(), listarProductos()]);
  // Los próximos días hábiles de producción, desde hoy.
  const dias: string[] = [];
  for (let f = hoyLocal(); dias.length < 12; f = sumarDias(f, 1)) if (esHabil(f)) dias.push(f);

  const listaClientes = [...clientes]
    .sort((a, b) => Number(!!b.interno) - Number(!!a.interno) || a.nombre.localeCompare(b.nombre))
    .map(({ id, nombre, gramaje, desarrollos }) => ({ id, nombre, gramaje, desarrollos }));
  const listaProductos = productos.map(({ id, nombre, unidad, soloPara }) => ({ id, nombre, unidad, soloPara }));
  const opcionesDias = dias.map((d) => ({
    valor: d,
    texto: `${fechaCorta(d)} (entrega ${fechaCorta(siguienteHabil(d))})`,
  }));

  return (
    <main>
      <h1 className="titulo mb-4 text-3xl sm:text-4xl">Programar</h1>
      <PestanasProgramar activa="/cocina/programar/pedidos" />

      {/* Lo más rápido: todos los pedidos del día escritos de una vez. */}
      <section className="tarjeta mb-6">
        <h2 className="titulo mb-1 text-2xl">Varios pedidos a la vez</h2>
        <p className="mb-4 text-sm text-panel-500">
          Un cliente por línea, con dos puntos y sus sabores: <strong>Café Ejemplo: Chocolate 10, Vainilla 5</strong>.
          Si es otro gramaje, escríbelo junto al cliente: <strong>Tienda Demo 85 70g: Vainilla 20</strong>.
          Un sabor en otro gramaje lleva el suyo al lado: <strong>Panadería Sol: Avena 90g 6, Coco 70g 4</strong>.
          Si no es un cliente (una persona, una caja x6), empieza con <strong>Extra</strong>:{" "}
          <strong>Extra Ana Pérez: Chocolate 6</strong>.
          El nombre puede ir corto; debajo ves a quién se lo asignó. Para dejarle
          una nota al pedido, escríbela después de <strong>//</strong>:{" "}
          <strong>Café Ejemplo: Chocolate 10 // entregar antes de las 9am</strong>.
        </p>
        <PedidosVarios
          accion={crearPedidosVarios}
          clientes={listaClientes}
          productos={listaProductos}
          dias={opcionesDias}
        />
      </section>

      <section className="tarjeta">
        <h2 className="titulo mb-1 text-2xl">Un pedido</h2>
        <p className="mb-4 text-sm text-panel-500">
          Para los pedidos que llegan por WhatsApp, de clientes o de alguien que no es cliente
          (elige «Pedido extra»). Queda igual que uno del formulario: aparece en{" "}
          <Link href="/cocina" className="font-semibold text-panel-700 underline">
            Producción
          </Link>{" "}
          ese día y se descuenta del stock. La entrega es el día hábil siguiente.
        </p>
        <PedidoEscrito
          accion={crearPedidoEscrito}
          clientes={listaClientes}
          productos={listaProductos}
          gramajes={GRAMAJES}
          dias={opcionesDias}
        />
      </section>

      {/* Muestras: van al mismo calendario de producción, con sticker. */}
      <section className="tarjeta mt-6">
        <h2 className="titulo mb-1 text-2xl">Muestras</h2>
        <p className="mb-4 text-sm text-panel-500">
          Se escriben igual que un pedido —{" "}
          <strong>Hotel Ejemplo: Chocolate 6, Avena 4</strong>, cada sabor con su gramaje si es otro
          (<strong>Avena 90g 6, Coco 70g 4</strong>) — con la nota después
          de <strong>//</strong>. La única diferencia es que el nombre va libre,
          porque casi siempre es alguien que todavía no es cliente. Aparecen en
          Producción ese día, marcadas como muestra, y quedan en el historial.
        </p>
        <MuestrasEscritas
          accion={crearMuestrasEscritas}
          sabores={listaProductos.map((p) => p.nombre)}
          gramajes={GRAMAJES}
          dias={opcionesDias}
        />
      </section>
    </main>
  );
}
