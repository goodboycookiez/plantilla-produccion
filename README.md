# Plantilla de pedidos y producción

Plataforma para negocios de producción (panaderías, galletas, repostería) que
reciben pedidos mayoristas y quieren organizar su cocina:

- `/` y `/pedido`: formulario abierto para los clientes (link privado, sin registro).
- `/cocina`: panel del equipo: producción por día y gramaje, preproducción,
  stock del congelador, muestras y bajas, limpieza y rutina, pausa activa,
  historial de pedidos y clientes con su cronología.
- `/cocina/programar`: solo para quien administra (con su propia contraseña).

**¿Primera vez? Lee [GUIA.md](GUIA.md)**: explica paso a paso, sin saber
programar, cómo tener tu propia copia en internet gratis.

## Dónde se cambia cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre, logo, colores, textos del formulario | `config/negocio.ts` |
| Hora de corte, capacidad diaria, gramajes, mínimos por pedido | `config/negocio.ts` → `produccion` |
| Reglas de masas (sándwich de 2 bolas, masas de un solo tamaño…) | `config/negocio.ts` → `masas` |
| Fecha de inicio del stock, pausa activa, sabor de temporada | `config/negocio.ts` |
| Productos | `data/productos.json` |
| Clientes | `data/clientes.json` o el panel → Clientes |
| Equipo, masas, rellenos, toppings, áreas de conteo | `data/listas.json` |
| Mínimos de stock | `data/minimos.json` o Programar → Mínimos |
| Rutina de limpieza base | `data/rutinas-base.json` |
| Logo y fotos | carpeta `public/` |

## Reglas que trae

- Se produce y se entrega de lunes a viernes.
- Pedido antes de la hora de corte → producción ese mismo día; después → el siguiente día hábil.
- Entrega: el día hábil siguiente a la producción (el cliente puede elegir una fecha posterior).
- Capacidad máxima por día: al llenarse, la fecha se bloquea.
- Mínimo de unidades por sabor en cada pedido.

## Correr en el computador

```bash
npm install
npm run dev
```

Sin variables de Supabase, todo se guarda en la carpeta `.data/` (solo para probar).

## Publicar

Ver [GUIA.md](GUIA.md): GitHub + Supabase (`supabase/esquema.sql`) + Vercel, todo en planes gratuitos.
