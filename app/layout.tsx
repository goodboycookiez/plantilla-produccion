import type { Metadata } from "next";
import { Fraunces, Poppins } from "next/font/google";
import "./globals.css";
import { negocio } from "@/config/negocio";

/**
 * Tipografías: Fraunces para títulos y Poppins para el texto (gratis, de
 * Google Fonts). Se pueden cambiar por otras de https://fonts.google.com
 */
const titulo = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  variable: "--fuente-titulo",
});

const texto = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-texto",
});

export const metadata: Metadata = {
  title: `Pedidos · ${negocio.nombre}`,
  description: negocio.descripcion,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${titulo.variable} ${texto.variable}`}>
      <body className="min-h-screen overflow-x-hidden antialiased">{children}</body>
    </html>
  );
}
