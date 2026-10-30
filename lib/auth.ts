export const COOKIE_ADMIN = "pp_admin";
/** Segunda llave: solo quien programa la producción. */
export const COOKIE_PROGRAMAR = "pp_programar";
/** Tercera llave: la base de clientes. */
export const COOKIE_CLIENTES = "pp_clientes";

/** Hash de la contraseña de administración; es lo que se guarda en la cookie. */
export async function hashClave(clave: string): Promise<string> {
  const datos = new TextEncoder().encode(`plantilla::${clave}`);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function tokenEsperado(): Promise<string | null> {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave) return null;
  return hashClave(clave);
}

export async function tokenProgramar(): Promise<string | null> {
  const clave = process.env.PROGRAMAR_PASSWORD;
  if (!clave) return null;
  return hashClave(`programar::${clave}`);
}

/**
 * Llave de Clientes. Sin CLIENTES_PASSWORD configurada, Clientes queda con la
 * misma llave de Programar (nunca abierta a todo el equipo).
 */
export async function tokenClientes(): Promise<string | null> {
  const clave = process.env.CLIENTES_PASSWORD;
  if (!clave) return null;
  return hashClave(`clientes::${clave}`);
}
