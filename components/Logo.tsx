import Image from "next/image";
import { negocio } from "@/config/negocio";

/** El logo del negocio (se cambia en config/negocio.ts). */
export default function Logo({ escala = 1 }: { escala?: number }) {
  const { archivo, ancho, alto } = negocio.logo;
  return (
    <Image
      src={archivo}
      alt={negocio.nombre}
      width={Math.round(ancho * escala)}
      height={Math.round(alto * escala)}
      priority
      unoptimized={archivo.endsWith(".svg")}
    />
  );
}
