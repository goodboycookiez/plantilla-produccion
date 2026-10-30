import { GRAMAJES } from "@/lib/gramaje";
import type { Cliente } from "@/lib/tipos";

const PAGOS = [
  { valor: "JURIDICA", texto: "Jurídica" },
  { valor: "NATURAL", texto: "Natural" },
  { valor: "VENTA", texto: "Venta" },
];

/** "JURÍDICA" y "JURIDICA" son lo mismo. */
const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/**
 * Los campos de un punto de distribución, en el mismo orden que el archivo
 * de clientes. Sirve para crear uno nuevo y para editarlo.
 */
export default function CamposCliente({ cliente, prefijo }: { cliente?: Cliente; prefijo: string }) {
  const id = (k: string) => `${prefijo}-${k}`;
  const pago = sinTildes(cliente?.tipoPago ?? "");

  return (
    <>
      <div>
        <label className="etiqueta" htmlFor={id("nombre")}>
          Nombre (como lo buscan en el formulario)
        </label>
        <input
          id={id("nombre")}
          name="nombre"
          className="campo"
          defaultValue={cliente?.nombre}
          placeholder="Ej: Café Bonito Chapinero"
          required
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("direccion")}>
          Dirección
        </label>
        <input id={id("direccion")} name="direccion" className="campo" defaultValue={cliente?.direccion} />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("telefono")}>
          Número
        </label>
        <input id={id("telefono")} name="telefono" className="campo" inputMode="tel" defaultValue={cliente?.telefono} />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("razon")}>
          Razón social
        </label>
        <input id={id("razon")} name="razonSocial" className="campo" defaultValue={cliente?.razonSocial} />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("especial")}>
          Sabor especial
        </label>
        <input
          id={id("especial")}
          name="saborEspecial"
          className="campo"
          defaultValue={cliente?.desarrollos.join(", ")}
          placeholder="Si tiene un desarrollo propio (separados por coma)"
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("pago")}>
          Pago
        </label>
        <select id={id("pago")} name="tipoPago" className="campo" defaultValue={PAGOS.some((p) => p.valor === pago) ? pago : cliente?.tipoPago ?? ""}>
          <option value="">—</option>
          {PAGOS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.texto}
            </option>
          ))}
          {cliente?.tipoPago && !PAGOS.some((p) => p.valor === pago) && (
            <option value={cliente.tipoPago}>{cliente.tipoPago}</option>
          )}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("gramaje")}>
          Tamaño
        </label>
        <select id={id("gramaje")} name="gramaje" className="campo" defaultValue={cliente?.gramaje ?? "90g"}>
          {[...new Set([...GRAMAJES, cliente?.gramaje ?? "90g"])].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("horario")}>
          Horario de entrega
        </label>
        <input
          id={id("horario")}
          name="horarioEntrega"
          className="campo"
          defaultValue={cliente?.horarioEntrega}
          placeholder="Ej: 8AM"
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("valor")}>
          Valor individual
        </label>
        <input
          id={id("valor")}
          name="valorUnitario"
          className="campo"
          defaultValue={cliente?.valorUnitario}
          placeholder="Ej: $6.000"
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor={id("domicilio")}>
          Domicilio
        </label>
        <input
          id={id("domicilio")}
          name="domicilio"
          className="campo"
          defaultValue={cliente?.domicilio}
          placeholder="Ej: $10.000 o recogen en cocina"
        />
      </div>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="reteIva" defaultChecked={cliente?.reteIva} className="h-5 w-5" />
        <span className="font-semibold">Reteiva</span>
      </label>
    </>
  );
}
