import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite levantar una segunda copia de prueba en su propia carpeta
  // (NEXT_DIST_DIR=.next-prueba) sin pisar la del servidor de siempre.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
