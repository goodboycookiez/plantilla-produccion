import { cookies } from "next/headers";
import { COOKIE_CLIENTES, COOKIE_PROGRAMAR, tokenClientes, tokenProgramar } from "./auth";

/**
 * ¿Quien está mirando puede programar? Sin PROGRAMAR_PASSWORD configurada
 * cualquiera puede (solo en desarrollo local, igual que el panel).
 */
export async function puedeProgramar(): Promise<boolean> {
  const esperado = await tokenProgramar();
  if (!esperado) return true;
  return (await cookies()).get(COOKIE_PROGRAMAR)?.value === esperado;
}

/** ¿Puede ver y cambiar la base de clientes? Sin clave propia, vale la de Programar. */
export async function puedeVerClientes(): Promise<boolean> {
  const esperado = await tokenClientes();
  if (!esperado) return puedeProgramar();
  return (await cookies()).get(COOKIE_CLIENTES)?.value === esperado;
}
