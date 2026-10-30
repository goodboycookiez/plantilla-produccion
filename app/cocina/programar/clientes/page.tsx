import { redirect } from "next/navigation";

/** Los clientes ahora tienen su propia sección, con su propia clave. */
export default function ProgramarClientes() {
  redirect("/cocina/clientes");
}
