import { NextResponse } from "next/server";
import { crearPedido, cargaPorDia, guardarOrdenCompra } from "@/lib/db";
import { minimoDe } from "@/lib/catalogo";
import { productosParaCliente } from "@/lib/temporada";
import { buscarClientePublico } from "@/lib/clientes";
import {
  CAPACIDAD_DIARIA,
  entregaMasProxima,
  esHabil,
  produccionParaEntrega,
} from "@/lib/fechas";
import type { ItemPedido, Pedido } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const MAX_PDF = 5 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const clienteId = String(form.get("clienteId") ?? "");
  const cliente = await buscarClientePublico(clienteId);
  if (!cliente) {
    return NextResponse.json({ error: "Selecciona un cliente de la lista." }, { status: 400 });
  }

  // Cantidades
  const permitidos = new Map(
    (await productosParaCliente(clienteId, cliente.desarrollos)).map((p) => [p.id, p]),
  );
  let items: ItemPedido[] = [];
  try {
    const crudo = JSON.parse(String(form.get("items") ?? "[]")) as {
      productoId: string;
      cantidad: number;
    }[];
    items = crudo
      .map((i) => {
        const producto = permitidos.get(i.productoId);
        if (!producto) return null;
        const cantidad = Math.floor(Number(i.cantidad));
        if (!Number.isFinite(cantidad) || cantidad <= 0) return null;
        return {
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad,
          unidad: producto.unidad,
        };
      })
      .filter((i): i is ItemPedido => i !== null);
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Agrega al menos un producto a tu pedido." }, { status: 400 });
  }
  const bajoMinimo = items.find((i) => i.cantidad < minimoDe(i.unidad));
  if (bajoMinimo) {
    const minimo = minimoDe(bajoMinimo.unidad);
    return NextResponse.json(
      {
        error: `El mínimo de ${bajoMinimo.nombre} es ${minimo} ${
          bajoMinimo.unidad === "kg" ? "kilo" + (minimo === 1 ? "" : "s") : "unidades"
        }.`,
      },
      { status: 400 },
    );
  }

  const totalUnidades = items
    .filter((i) => i.unidad === "unidad")
    .reduce((s, i) => s + i.cantidad, 0);
  const totalKilos = items.filter((i) => i.unidad === "kg").reduce((s, i) => s + i.cantidad, 0);

  if (totalUnidades > CAPACIDAD_DIARIA) {
    return NextResponse.json(
      {
        error: `Un día de producción admite máximo ${CAPACIDAD_DIARIA} unidades. Escríbenos para coordinar un pedido más grande.`,
      },
      { status: 400 },
    );
  }

  // Fecha de entrega
  const fechaEntrega = String(form.get("fechaEntrega") ?? "");
  const minima = entregaMasProxima();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEntrega) || fechaEntrega < minima || !esHabil(fechaEntrega)) {
    return NextResponse.json(
      { error: `La fecha de entrega más próxima disponible es ${minima}.` },
      { status: 400 },
    );
  }
  const fechaProduccion = produccionParaEntrega(fechaEntrega);

  // Cupo del día
  const carga = await cargaPorDia();
  const usado = carga[fechaProduccion] ?? 0;
  if (usado + totalUnidades > CAPACIDAD_DIARIA) {
    return NextResponse.json(
      {
        error: `Ese día ya está copado (quedan ${Math.max(
          0,
          CAPACIDAD_DIARIA - usado,
        )} unidades). Elige otra fecha de entrega.`,
      },
      { status: 409 },
    );
  }

  // Orden de compra (opcional)
  let ordenCompra: string | null = null;
  const archivo = form.get("ordenCompra");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.type !== "application/pdf") {
      return NextResponse.json({ error: "La orden de compra debe ser un PDF." }, { status: 400 });
    }
    if (archivo.size > MAX_PDF) {
      return NextResponse.json({ error: "El PDF no puede pesar más de 5 MB." }, { status: 400 });
    }
    const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    ordenCompra = await guardarOrdenCompra(limpio, await archivo.arrayBuffer());
  }

  const nuevo: Omit<Pedido, "consecutivo"> = {
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
    clienteId: cliente.id,
    clienteNombre: cliente.nombre,
    direccion: cliente.direccion,
    gramaje: cliente.gramaje,
    items,
    totalUnidades,
    totalKilos,
    fechaProduccion,
    fechaEntrega,
    esEvento: form.get("esEvento") === "true",
    notas: String(form.get("notas") ?? "").slice(0, 1000),
    ordenCompra,
    estado: "recibido",
  };

  try {
    const pedido = await crearPedido(nuevo);
    return NextResponse.json({ pedido });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "No pudimos guardar el pedido. Intenta de nuevo o escríbenos por WhatsApp." },
      { status: 500 },
    );
  }
}
