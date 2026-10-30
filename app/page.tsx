import Link from "next/link";
import Cinta from "@/components/Cinta";
import Logo from "@/components/Logo";
import Saludo from "@/components/Saludo";
import { negocio } from "@/config/negocio";

export default function Inicio() {
  return (
    <>
      <div className="bg-marca py-2 text-center">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-claro">
          {negocio.textos.franja}
        </p>
      </div>

      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-6 sm:px-6">
        <Logo />
      </div>

      <Saludo />

      <div className="px-6 pb-12 text-center">
        <Link href="/pedido" className="boton">
          Hacer un pedido
        </Link>
      </div>

      <Cinta />
    </>
  );
}
