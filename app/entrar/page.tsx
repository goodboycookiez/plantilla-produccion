import { negocio } from "@/config/negocio";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; error?: string; nivel?: string }>;
}) {
  const { volver = "/cocina", error, nivel } = await searchParams;
  const esProgramar = nivel === "programar";
  const esClientes = nivel === "clientes";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <form action="/api/entrar" method="post" className="tarjeta">
        <h1 className="mb-1 text-xl font-bold">
          {esProgramar ? "Programar producción" : esClientes ? "Clientes" : negocio.textos.panel}
        </h1>
        <p className="mb-5 text-sm text-tinta/60">
          {esProgramar
            ? "Solo para quien programa la producción. Ingresa la contraseña de programar."
            : esClientes
              ? "La base de clientes. Ingresa la contraseña de clientes."
              : "Ingresa la contraseña del equipo."}
        </p>
        <input type="hidden" name="volver" value={volver} />
        {(esProgramar || esClientes) && <input type="hidden" name="nivel" value={nivel} />}
        <input
          className="campo"
          type="password"
          name="clave"
          placeholder="Contraseña"
          autoFocus
          required
        />
        {error && <p className="mt-2 text-sm font-semibold text-red-600">Contraseña incorrecta.</p>}
        <button className="boton mt-4 w-full" type="submit">
          Entrar
        </button>
        {(esProgramar || esClientes) && (
          <a href="/cocina/preproduccion" className="mt-4 block text-center text-sm text-marca underline">
            Volver a preproducción
          </a>
        )}
      </form>
    </main>
  );
}
