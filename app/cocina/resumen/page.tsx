import { redirect } from "next/navigation";

// El resumen semanal quedó dentro de Stock: una sola tabla con todo.
export default function Resumen() {
  redirect("/cocina/inventario");
}
