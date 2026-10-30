import { negocio } from "@/config/negocio";
import { Corazon, Galleta, Taza } from "./Garabatos";

const ICONOS = [Galleta, Taza, Corazon];

/** Cinta en movimiento con dibujitos (las frases salen de config/negocio.ts). */
export default function Cinta() {
  const mensajes = negocio.textos.cinta.map((texto, i) => ({ texto, Icono: ICONOS[i % ICONOS.length] }));
  return (
    <div className="overflow-hidden border-y-2 border-marca bg-fondo py-2.5">
      <div className="animar-cinta flex w-max">
        {[0, 1].map((tanda) => (
          <div key={tanda} className="flex shrink-0 items-center">
            {mensajes.map(({ texto, Icono }) => (
              <span key={texto} className="flex shrink-0 items-center gap-2.5 px-5 text-marca">
                <Icono className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                  {texto}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
