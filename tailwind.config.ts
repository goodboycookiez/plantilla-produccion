import type { Config } from "tailwindcss";
import { negocio } from "./config/negocio";

// Los colores salen de config/negocio.ts: allá se cambian.
const c = negocio.colores;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fondo: c.fondo,
        suave: c.suave,
        claro: c.claro,
        marca: c.principal,
        "marca-oscuro": c.principalOscuro,
        negro: "#000000",
        tinta: c.texto,
        panel: c.panel,
      },
      fontFamily: {
        titulo: ["var(--fuente-titulo)", "Georgia", "serif"],
        texto: ["var(--fuente-texto)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        marca: "1.75rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
