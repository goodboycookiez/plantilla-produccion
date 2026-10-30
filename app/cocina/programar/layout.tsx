/**
 * Aviso para quien administra: si en Vercel no está PROGRAMAR_PASSWORD, Programar
 * queda abierto para todo el equipo (solo tiene sentido así en el computador).
 */
export default function LayoutProgramar({ children }: { children: React.ReactNode }) {
  const sinClave = !process.env.PROGRAMAR_PASSWORD;
  return (
    <>
      {sinClave && process.env.NODE_ENV === "production" && (
        <div className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-900">
          <p className="font-bold">⚠️ Programar está sin clave: cualquiera del equipo puede entrar.</p>
          <p className="mt-1 text-sm">
            En Vercel → Settings → Environments → Production → Environment Variables, agrega{" "}
            <code className="font-bold">PROGRAMAR_PASSWORD</code> (exactamente así, marcando Production) y haz
            Redeploy.
          </p>
        </div>
      )}
      {children}
    </>
  );
}
