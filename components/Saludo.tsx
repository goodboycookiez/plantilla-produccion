import { negocio } from "@/config/negocio";
import { Galleta } from "./Garabatos";

/** El saludo grande de la página de inicio y del formulario (textos en config/negocio.ts). */
export default function Saludo() {
  const { etiqueta, saludo, bajada } = negocio.textos;
  return (
    <div className="relative mx-auto my-12 max-w-2xl px-8 sm:my-20">
      <div className="rounded-marca bg-suave px-6 py-14 text-center sm:px-12 sm:py-20">
        <Galleta className="mx-auto mb-4 h-12 w-12 text-marca/70" />
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-marca/70">{etiqueta}</p>
        <h1 className="titulo mt-4 text-4xl sm:text-6xl">
          {saludo.map((linea, i) => (
            <span key={i} className="block">
              {linea}
            </span>
          ))}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-tinta/70">{bajada}</p>
      </div>
    </div>
  );
}
