import Link from "next/link";
import Logo from "@/components/Logo";
import MenuCocina from "@/components/MenuCocina";
import PausaActiva from "@/components/PausaActiva";
import { estadoPausaHoy } from "@/lib/pausa";

export default async function LayoutCocina({ children }: { children: React.ReactNode }) {
  const pausa = await estadoPausaHoy();

  return (
    <div className="panel-cocina min-h-screen">
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 py-6">
          <Link href="/cocina" aria-label="Ir a producción">
            <Logo escala={0.75} />
          </Link>
          <MenuCocina />
        </header>
        {children}
      </div>
      {pausa && <PausaActiva {...pausa} />}
    </div>
  );
}
