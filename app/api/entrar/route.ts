import { NextResponse } from "next/server";
import { COOKIE_ADMIN, COOKIE_CLIENTES, COOKIE_PROGRAMAR, tokenClientes, tokenEsperado, tokenProgramar } from "@/lib/auth";

const COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function POST(req: Request) {
  const form = await req.formData();
  const clave = String(form.get("clave") ?? "");
  const volver = String(form.get("volver") ?? "/cocina");
  const nivel = String(form.get("nivel") ?? "");
  const destino = volver.startsWith("/") ? volver : "/cocina";

  const equipo = process.env.ADMIN_PASSWORD;
  const programar = process.env.PROGRAMAR_PASSWORD;
  const claveClientes = process.env.CLIENTES_PASSWORD;
  const esProgramar = !!programar && clave === programar;
  const esClientes = !!claveClientes && clave === claveClientes;
  const esEquipo = !!equipo && clave === equipo;

  // La clave de programar también abre el panel; la del equipo no abre programar.
  // La de clientes abre el panel y Clientes, nada más.
  const entra =
    nivel === "clientes" ? esClientes : nivel === "programar" ? esProgramar : esProgramar || esClientes || esEquipo;
  if (!entra) {
    const extra = nivel === "programar" || nivel === "clientes" ? `&nivel=${nivel}` : "";
    return NextResponse.redirect(
      new URL(`/entrar?error=1&volver=${encodeURIComponent(destino)}${extra}`, req.url),
      303,
    );
  }

  const res = NextResponse.redirect(new URL(destino, req.url), 303);
  const tokenEquipo = await tokenEsperado();
  if (tokenEquipo) res.cookies.set(COOKIE_ADMIN, tokenEquipo, COOKIE);
  if (esProgramar) res.cookies.set(COOKIE_PROGRAMAR, (await tokenProgramar())!, COOKIE);
  if (esClientes) res.cookies.set(COOKIE_CLIENTES, (await tokenClientes())!, COOKIE);
  return res;
}
