/** Aviso mientras Supabase no tenga la tabla de la cronología de clientes. */
export default function FaltaHistorial() {
  return (
    <section className="mb-6 rounded-3xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
      <h2 className="text-lg font-bold">Falta un paso para guardar la cronología</h2>
      <p className="mt-1 text-sm">
        Los datos de los clientes ya se pueden editar, pero las notas y el registro de cambios
        necesitan una tabla nueva. En Supabase abre <strong>SQL Editor</strong>, pega el archivo{" "}
        <code>supabase/esquema.sql</code> del proyecto y dale <strong>Run</strong>.
      </p>
    </section>
  );
}
