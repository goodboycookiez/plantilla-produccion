import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ADMIN, COOKIE_CLIENTES, COOKIE_PROGRAMAR, tokenClientes, tokenEsperado, tokenProgramar } from "@/lib/auth";

function aEntrar(req: NextRequest, nivel?: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = `?volver=${encodeURIComponent(req.nextUrl.pathname)}${nivel ? `&nivel=${nivel}` : ""}`;
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  // Sin contraseñas configuradas el panel queda abierto (solo en desarrollo local).
  const esperado = await tokenEsperado();
  if (esperado && req.cookies.get(COOKIE_ADMIN)?.value !== esperado) return aEntrar(req);

  // Clientes tiene su propia clave; si no está configurada, pide la de Programar.
  if (req.nextUrl.pathname.startsWith("/cocina/clientes")) {
    const clientes = await tokenClientes();
    const programar = await tokenProgramar();
    if (clientes ? req.cookies.get(COOKIE_CLIENTES)?.value !== clientes
        : programar && req.cookies.get(COOKIE_PROGRAMAR)?.value !== programar) {
      return aEntrar(req, clientes ? "clientes" : "programar");
    }
  }

  if (req.nextUrl.pathname.startsWith("/cocina/programar")) {
    const programar = await tokenProgramar();
    if (programar && req.cookies.get(COOKIE_PROGRAMAR)?.value !== programar) {
      return aEntrar(req, "programar");
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/cocina/:path*"] };
