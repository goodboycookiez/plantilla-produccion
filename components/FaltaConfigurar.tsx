/** Aviso cuando Supabase todavía no tiene las tablas de Limpieza y rutina. */
export default function FaltaConfigurar() {
  return (
    <main className="rounded-3xl border-2 border-amber-300 bg-amber-50 px-6 py-8">
      <h1 className="text-2xl font-bold text-amber-900">Falta un paso para usar esta sección</h1>
      <p className="mt-2 text-amber-900">
        La base de datos todavía no tiene las tablas de Limpieza y rutina. En Supabase, abre{" "}
        <strong>SQL Editor</strong>, pega el archivo <code>supabase/esquema.sql</code> del proyecto
        y dale <strong>Run</strong>. Después recarga esta página.
      </p>
    </main>
  );
}
