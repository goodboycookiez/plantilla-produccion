# Guía paso a paso

Esta guía es para personas que **no programan**. Si sigues los pasos en orden,
en más o menos una hora tendrás tu propia plataforma de pedidos y producción
funcionando en internet, gratis.

---

## De dónde nace esto

En Goodboy Cookies, todos los pedidos de nuestros clientes mayoristas (cafés,
tiendas, hoteles) llegaban por WhatsApp. Eran decenas de chats, mensajes que
se perdían entre audios y fotos, y datos que había que copiar a mano a un
calendario: el nombre del cliente, la dirección, el tamaño de la galleta, los
sabores, la fecha de entrega.

Cada vez que copiábamos algo a mano aparecía un error: un gramaje equivocado,
un pedido que nunca llegó a la cocina, un día con más galletas de las que
podíamos hornear. En la cocina nadie sabía con certeza qué hornear cada día,
cuánta masa había en el congelador o por qué el conteo del viernes no
cuadraba con lo que se había producido.

Así que construimos nuestra propia herramienta. Hoy el cliente hace su pedido
en un link, eligiendo su negocio de una lista (sin errores de digitación). El
pedido cae solo en el calendario de producción, el equipo ve qué hornear por
sabor y por tamaño, la preproducción queda programada y el stock del
congelador se cuadra solo cada semana, avisando cuando algo no coincide.
También organiza la limpieza, las muestras, las bajas y hasta la pausa
activa del equipo.

Después de contarlo en un video, muchas personas con negocios parecidos nos
escribieron para pedirla. Por eso la convertimos en esta **plantilla en
blanco**: la misma lógica que usamos en nuestra cocina, lista para que le
pongas tus sabores, tus clientes, tu equipo y tu marca.

---

## 1. ¿Qué es esto?

Es una página web con dos partes:

**Para tus clientes (formulario de pedidos)**
- Un link privado (no aparece en Google) donde tus clientes mayoristas hacen su pedido.
- No se registran ni crean contraseña: buscan su negocio en una lista, y su
  dirección y su tamaño de producto ya están guardados. Así no hay errores de digitación.
- Eligen sabores y cantidades, la fecha de entrega y, si quieren, adjuntan su orden de compra en PDF.
- El sistema sabe tu hora de corte y tu capacidad diaria: si un día ya está lleno, no deja elegirlo.

**Para tu equipo (panel de cocina, con contraseña)**
- **Producción**: qué hornear cada día, por sabor y por tamaño, con el total del día frente a tu capacidad.
- **Preproducción**: las masas, rellenos y toppings que hay que preparar; al marcarlas hechas se anota cuántas salieron.
- **Stock**: el congelador por semana: lo que había, + lo preparado, − lo horneado, − bajas, − muestras = lo que debería haber, comparado con lo que se contó. Avisa cuando algo no cuadra.
- **Muestras y bajas**: lo que se regala a clientes potenciales y lo que se pierde.
- **Limpieza y rutina**: tareas fijas de cada día que el equipo firma, y la **pausa activa** (el panel se detiene unos minutos con un video).
- **Historial** de pedidos y **Clientes** con la cronología de cada uno.
- **Programar** (solo quien administra): planear la preproducción, escribir pedidos que llegan por WhatsApp, rutinas, mínimos de stock y el sabor de temporada.

Todo corre en tres servicios con plan gratuito:

| Servicio | Para qué sirve |
| --- | --- |
| **GitHub** | Guarda los archivos de tu página (como un Google Drive para código). |
| **Supabase** | La base de datos: ahí quedan los pedidos, conteos, clientes, etc. |
| **Vercel** | Publica la página en internet y te da el link. |

---

## 2. Crea las tres cuentas (gratis)

1. **GitHub**: entra a https://github.com/signup y crea una cuenta.
2. **Vercel**: entra a https://vercel.com/signup y elige **Continue with GitHub** (así quedan conectadas).
3. **Supabase**: entra a https://supabase.com y elige **Start your project** → **Continue with GitHub**.

Ninguna pide tarjeta de crédito para el plan gratuito.

---

## 3. Crea tu copia de la plantilla

1. Abre el link de la plantilla en GitHub que te compartieron.
2. Arriba a la derecha toca el botón verde **Use this template** → **Create a new repository**.
3. En **Repository name** escribe un nombre, por ejemplo `pedidos-mi-panaderia`.
4. Marca **Private** (para que nadie más vea tus datos) y toca **Create repository**.

Listo: ya tienes tu propia copia. Lo que cambies ahí no afecta a nadie más.

---

## 4. Prepara la base de datos (Supabase)

1. En Supabase toca **New project**.
   - **Name**: el nombre de tu negocio.
   - **Database Password**: toca **Generate a password** y guárdala en un lugar seguro.
   - **Region**: la más cercana a tu país (por ejemplo *South America (São Paulo)* para Colombia).
   - Toca **Create new project** y espera un par de minutos.
2. En el menú de la izquierda entra a **SQL Editor** → **New query**.
3. En GitHub, abre tu copia, entra a la carpeta `supabase` y abre `esquema.sql`.
   Toca el botón de copiar (los dos cuadraditos, arriba a la derecha del archivo).
4. Vuelve a Supabase, pega todo en el editor y toca **Run**. Debe decir *Success*.
5. Ve a **Project Settings** (la tuerca, abajo a la izquierda) → **API** y deja esa pestaña abierta.
   Vas a necesitar dos datos:
   - **Project URL** (empieza con `https://` y termina en `.supabase.co`).
   - La clave **service_role** (toca **Reveal** para verla). ⚠️ Es secreta: no la compartas ni la pegues en ningún archivo.

---

## 5. Publica la página (Vercel)

1. En Vercel toca **Add New…** → **Project**.
2. Busca tu repositorio (`pedidos-mi-panaderia`) y toca **Import**.
3. Abre **Environment Variables** y agrega estas cinco, una por una (nombre a la izquierda, valor a la derecha):

| Nombre (escríbelo exactamente así) | Valor |
| --- | --- |
| `ADMIN_PASSWORD` | La contraseña del panel de cocina (la usa todo el equipo). |
| `PROGRAMAR_PASSWORD` | Otra contraseña, solo para quien administra. Abre también todo el panel. |
| `CLIENTES_PASSWORD` | Otra contraseña para ver la base de clientes. Si no la pones, vale la de Programar. |
| `SUPABASE_URL` | El **Project URL** del paso 4. |
| `SUPABASE_SERVICE_KEY` | La clave **service_role** del paso 4. |

4. Toca **Deploy** y espera un par de minutos.
5. Vercel te muestra el link de tu página, algo como `pedidos-mi-panaderia.vercel.app`.
   - El **formulario para clientes** es ese link + `/pedido`.
   - El **panel de cocina** es ese link + `/cocina`.

> Si después cambias una contraseña en Vercel (**Settings → Environment Variables**),
> tienes que ir a **Deployments**, tocar los tres puntos del último y elegir **Redeploy**.

---

## 6. Pon tu información

Todo se cambia desde la página de GitHub, sin instalar nada: abres el archivo,
tocas el **lápiz** (Edit), cambias lo que necesites y tocas **Commit changes**.
Vercel publica el cambio solo en uno o dos minutos.

### 6.1 Nombre, logo, colores y textos → `config/negocio.ts`

Es el único archivo de configuración. Cada línea tiene una explicación encima.
Cambia solo lo que está entre comillas o los números:

- `nombre`: el nombre de tu negocio.
- `logo`: sube tu logo a la carpeta `public` (en GitHub: entra a `public` → **Add file** → **Upload files**)
  y escribe aquí su nombre, por ejemplo `"/mi-logo.png"`.
- `colores`: en formato `#RRGGBB`. Si no los conoces, búscalos en https://htmlcolorcodes.com/es/.
  Para la gama del panel (`panel`), pon tu color principal en https://uicolors.app y copia los tonos 50 a 900.
- `textos`: la franja de arriba, el saludo, la frase y las frases que corren en la cinta.

### 6.2 Reglas de producción → `config/negocio.ts` → `produccion`

- `zonaHoraria` e `idioma`: tu país (vienen para Colombia).
- `horaCorte`: hasta qué hora un pedido entra a producción el mismo día (12 = mediodía).
- `capacidadDiaria`: cuántas unidades caben en un día.
- `minimoUnidades`: mínimo por sabor en cada pedido.
- `gramajes`: los tamaños que vendes, por ejemplo `["50g", "70g", "90g"]`.
- `unidadesPorLote`: cuántas bolas salen de una tanda simple, doble y triple.

### 6.3 Reglas especiales de las masas → `config/negocio.ts` → `masas`

Vienen con ejemplos; cámbialos por los tuyos o déjalos vacíos (`{}` o `[]`):

- `bolasPorProducto`: productos que llevan más de una bola (un sándwich de 2 tapas = 2).
- `tamanoDeBola`: cuando la bola es de otro tamaño que el producto (el sándwich de 90g lleva bolas de 50g).
- `mismaMasa`: un producto con otro nombre que sale de la misma masa (`"CHOCOLATE ESPECIAL": "CHOCOLATE"`).
- `tamanoUnico`: masas que solo se hacen en un tamaño.
- `fueraDelStock`: lo que no se cuenta en el congelador.

### 6.4 Fechas de arranque → `config/negocio.ts`

- `inicioDelStock`: la fecha de tu **primer conteo completo** del congelador (formato `"2026-11-06"`).
  Antes de esa fecha nada cuenta para el cuadre.
- `pausaActiva`: si la quieres (`activa: true` o `false`), a qué hora, cuántos minutos y el video de YouTube.

### 6.5 Productos → `data/productos.json`

Cada producto es una línea así:

```json
{ "id": "chocolate", "nombre": "Chocolate", "descripcion": "Chips de chocolate", "foto": "", "unidad": "unidad", "activo": true, "soloPara": [] }
```

- `id`: una palabra sin tildes ni espacios (usa guiones: `"red-velvet"`). No la cambies después.
- `foto`: sube la foto a `public` y escribe `"/nombre-de-la-foto.jpg"`. Vacío = un dibujo de galleta.
- `unidad`: `"unidad"` o `"kg"` (para lo que se vende por kilo).
- `activo`: `false` para esconderlo sin borrarlo.
- `soloPara`: si es exclusivo de un cliente, pon su `id`: `["cafe-ejemplo"]`.
- Cuidado con las comas: todas las líneas llevan coma al final **menos la última**.

El producto con `id` `"temporada"` es especial: su nombre se cambia desde **Programar → Temporada**.

### 6.6 Masas, equipo y listas → `data/listas.json`

- `masas`: los nombres de tus masas, en MAYÚSCULA (los mismos que usarás en preproducción y en los conteos).
- `rellenos` y `toppings`.
- `equipo`: los nombres de las personas de cocina (salen para firmar tareas y la pausa activa).
- `areas`: dónde se cuenta (congelador, nevera…).

### 6.7 Clientes

Tienes tres formas:

1. **Desde el panel** (lo más fácil): entra a `/cocina/clientes` con la contraseña de clientes y abre **+ Cliente nuevo**.
2. **Editando** `data/clientes.json` (viene con ejemplos: bórralos y deja los tuyos).
3. **Desde Excel**, si ya tienes una lista: mira el formato en `data/clientes-ejemplo.csv`
   (los títulos de la primera fila deben ser iguales), guárdala como CSV y en tu computador corre
   `node scripts/importar-clientes.mjs "mi-archivo.csv"` (ver paso 7).

El cliente `PUNTO DE VENTA` (con `"interno": true`) es tu propia tienda: no sale en el
formulario público, se le programan pedidos desde **Programar → Pedidos**. Si no tienes tienda, bórralo.

### 6.8 Mínimos de stock y rutina

- `data/minimos.json`: cuántas bolas mínimo quieres tener en el congelador, por tamaño o por masa.
  También se cambian después en **Programar → Mínimos**.
- `data/rutinas-base.json`: las tareas fijas de limpieza que vienen de ejemplo.
  Se cargan desde **Programar → Limpieza y rutina**, y allí mismo se agregan o quitan.

---

## 7. Probar en tu computador (opcional)

Solo si quieres ver los cambios antes de publicarlos.

1. Instala **Node.js** (versión 20 o más nueva) desde https://nodejs.org.
2. Instala **GitHub Desktop** (https://desktop.github.com), entra con tu cuenta y
   **clona** tu repositorio (File → Clone repository).
3. Abre la app **Terminal** (Mac) o **PowerShell** (Windows), entra a la carpeta y corre:

```bash
npm install
npm run dev
```

4. Abre http://localhost:3000 en el navegador.

Sin el archivo `.env.local`, la página no pide contraseñas y guarda todo en la carpeta
`.data` del computador: sirve para jugar sin miedo. Si quieres probar con contraseñas,
copia `.env.example` como `.env.local` y llena los valores.

Cuando estés feliz con los cambios, en GitHub Desktop escribe un resumen, toca
**Commit** y luego **Push**: Vercel publica solo.

---

## 8. Compartir con tus clientes y tu equipo

- **Clientes**: mándales el link `…vercel.app/pedido`. Es privado: solo lo tiene quien tú se lo das.
- **Equipo de cocina**: el link `…vercel.app/cocina` y la contraseña `ADMIN_PASSWORD`.
  Lo ideal es dejarlo abierto en una tablet en la cocina.
- **Quien administra**: además, la contraseña `PROGRAMAR_PASSWORD`.

---

## Problemas comunes

| Qué pasa | Qué hacer |
| --- | --- |
| La página dice que falta configurar una tabla | Vuelve a correr `supabase/esquema.sql` en Supabase (paso 4). No borra nada. |
| Cambié una contraseña y no funciona | En Vercel → Deployments → **Redeploy**. |
| Programar muestra un aviso rojo de "sin clave" | Falta `PROGRAMAR_PASSWORD` en Vercel. |
| Después de editar un `.json` la página no publica | Seguramente falta o sobra una coma o unas comillas. En Vercel → Deployments, el último en rojo dice en qué línea. |
| Un cliente no aparece en el formulario | Revisa que esté `activo` y que no sea `interno`. |

---

## ¿Prefieres que lo hagamos por ti?

Si no tienes tiempo o no te interesa hacer todo esto, te acompañamos. En una
asesoría te dejamos la plataforma funcionando con tus productos, tus clientes
y tu marca, y te enseñamos a ti y a tu equipo a manejarla en el día a día:
programar la producción, cuadrar el stock y organizar tu cocina.

**Agenda tu asesoría:**

- WhatsApp: **321 932 9936**
- Correo: **goodboycookiez@gmail.com**

Hecho con cariño por Goodboy Cookies.
