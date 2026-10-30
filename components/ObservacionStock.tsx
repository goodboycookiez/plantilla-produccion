import type { Alerta, FilaInventario, Movimiento } from "@/lib/inventario";

const corta = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

const QUE: Record<
  Movimiento["tipo"],
  { texto: string; signo: 1 | -1; color: string }
> = {
  produccion: { texto: "Preparado", signo: 1, color: "text-green-800" },
  horneado: { texto: "Horneado", signo: -1, color: "text-red-800" },
  baja: { texto: "Baja", signo: -1, color: "text-red-800" },
  muestra: { texto: "Muestra", signo: -1, color: "text-red-800" },
};

/**
 * La columna "Observación" de cada sabor en el stock: si cuadró o no, qué
 * puede estar pasando y cada movimiento de esa masa para revisarlo.
 */
export default function ObservacionStock({
  fila,
  alertas,
}: {
  fila: FilaInventario;
  alertas: Alerta[];
}) {
  const d = fila.descuadre;
  // El descuadre ya se dice en la etiqueta; de esas alertas solo se muestra la causa.
  const otras = alertas.filter((a) => !a.titulo.includes("en el cierre del"));
  const delDescuadre = alertas.find((a) =>
    a.titulo.includes("en el cierre del"),
  );
  const hayMovimientos =
    fila.movimientosPeriodo.length > 0 || fila.movimientosDespues.length > 0;

  return (
    <div className="space-y-1.5 text-left">
      {d === null ? null : d === 0 ? (
        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-semibold text-green-900">
          ✓ Cuadró al cierre del {corta(fila.fechaConteo!)}
        </span>
      ) : (
        <span className="inline-block rounded-full bg-red-600 px-2.5 py-0.5 text-sm font-bold text-white">
          {d > 0 ? `Sobraron ${d}` : `Faltaron ${-d}`} al cierre del{" "}
          {corta(fila.fechaConteo!)}
        </span>
      )}
      {delDescuadre && (
        <p className="text-xs text-red-900/80">{delDescuadre.causa}</p>
      )}

      {otras.map((a, i) => (
        <p
          key={i}
          className={`text-xs ${a.nivel === "rojo" ? "text-red-900" : "text-amber-900"}`}
        >
          <strong>{a.titulo}.</strong> {a.causa}
        </p>
      ))}

      {/* La comprobación del miércoles: no es el cierre, pero sirve para ver cómo va. */}
      {fila.conteosIntermedios.map((c) => {
        const dif = c.deberia === null ? null : c.cantidad - c.deberia;
        return (
          <p key={c.fecha} className="text-xs text-panel-700">
            Comprobación del {corta(c.fecha)}: contaron{" "}
            <strong>{c.cantidad}</strong>
            {c.deberia !== null && (
              <>
                , debía haber {c.deberia}{" "}
                <span
                  className={
                    dif === 0 ? "text-green-800" : "font-bold text-red-700"
                  }
                >
                  {dif === 0 ? "✓" : `(${dif! > 0 ? "+" : ""}${dif})`}
                </span>
              </>
            )}
          </p>
        );
      })}

      {/* Después del cierre: lo que va de la semana siguiente. */}
      {fila.fechaConteo &&
        fila.hoy !== null &&
        fila.movimientosDespues.length > 0 && (
          <p className="text-xs text-panel-700">
            Después del cierre, hoy debería haber <strong>{fila.hoy}</strong>.
          </p>
        )}

      {d === null &&
        otras.length === 0 &&
        fila.conteosIntermedios.length === 0 && (
          <span className="text-panel-300">—</span>
        )}

      {hayMovimientos && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold text-panel-700">
            Ver movimientos
          </summary>
          <div className="mt-2 w-[min(420px,80vw)] space-y-2">
            {fila.movimientosPeriodo.length > 0 && (
              <Lista
                titulo={`Desde el conteo del ${fila.fechaHabia ? corta(fila.fechaHabia) : "—"} (iniciamos con ${
                  fila.habia ?? "—"
                })${fila.fechaConteo ? ` al cierre del ${corta(fila.fechaConteo)} (contaron ${fila.contado})` : " hasta hoy"}`}
                movimientos={fila.movimientosPeriodo}
              />
            )}
            {fila.movimientosDespues.length > 0 && (
              <Lista
                titulo={`Después del último conteo${
                  fila.fechaConteo
                    ? ` (${corta(fila.fechaConteo)}, contaron ${fila.contado})`
                    : ""
                }`}
                movimientos={fila.movimientosDespues}
              />
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Lista({
  titulo,
  movimientos,
}: {
  titulo: string;
  movimientos: Movimiento[];
}) {
  const neto = movimientos.reduce(
    (s, m) => s + QUE[m.tipo].signo * m.cantidad,
    0,
  );
  return (
    <div className="overflow-hidden rounded-xl border border-panel-200 bg-white">
      <p className="bg-panel-50 px-3 py-2 text-sm font-semibold">{titulo}</p>
      <table className="w-full text-sm">
        <tbody>
          {movimientos.map((m, i) => (
            <tr key={i} className="border-t border-panel-100">
              <td className="w-14 px-3 py-1.5 text-panel-500">
                {corta(m.fecha)}
              </td>
              <td className="px-3 py-1.5">
                <span className={`font-semibold ${QUE[m.tipo].color}`}>
                  {QUE[m.tipo].texto}
                </span>{" "}
                <span className="text-panel-900/70">{m.detalle}</span>
              </td>
              <td
                className={`px-3 py-1.5 text-right font-bold tabular-nums ${QUE[m.tipo].color}`}
              >
                {QUE[m.tipo].signo > 0 ? "+" : "−"}
                {m.cantidad}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-panel-200 bg-panel-50">
            <td />
            <td className="px-3 py-1.5 font-semibold">Neto</td>
            <td className="px-3 py-1.5 text-right font-bold tabular-nums">
              {neto > 0 ? "+" : ""}
              {neto}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
