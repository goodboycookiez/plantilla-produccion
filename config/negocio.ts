/**
 * ==========================================================================
 *  CONFIGURACIÓN DEL NEGOCIO
 * ==========================================================================
 *
 * Este es el ÚNICO archivo que hay que cambiar para ponerle tu marca y tus
 * reglas a la plataforma. Cambia lo que está entre comillas o los números,
 * guarda, y la página se actualiza sola.
 *
 * Tus productos, clientes, equipo y listas no van aquí: van en la carpeta
 * `data/` (ver GUIA.md, paso 6).
 */

export const negocio = {
  /* ------------------------------ Marca ------------------------------ */

  /** Nombre del negocio: sale en la pestaña del navegador y en el panel. */
  nombre: "Mi Panadería",

  /** Una frase corta para Google y para cuando se comparte el link. */
  descripcion: "Haz tu pedido mayorista en línea.",

  /**
   * Tu logo. Pon el archivo en la carpeta `public/` (PNG, JPG o SVG) y
   * escribe aquí su nombre empezando con "/". Ancho y alto en píxeles, tal
   * como quieres que se vea arriba de la página.
   */
  logo: { archivo: "/logo.svg", ancho: 150, alto: 40 },

  /**
   * Colores, en código hexadecimal (#RRGGBB). Puedes sacarlos de tu manual
   * de marca o de una página como https://htmlcolorcodes.com/es/
   */
  colores: {
    /** Botones, títulos y bordes del formulario de pedidos. */
    principal: "#3F4A5A",
    /** El mismo color, un poco más oscuro (cuando se pasa el mouse por un botón). */
    principalOscuro: "#2A3240",
    /** Fondo de toda la página. */
    fondo: "#F4F2EE",
    /** Fondo de las cajas destacadas (el saludo). */
    suave: "#E8E4DC",
    /** Fondo de las tarjetas. */
    claro: "#FFFFFF",
    /** Color del texto. */
    texto: "#1F1F1F",
    /**
     * Gama del panel de cocina, del más claro (50) al más oscuro (900).
     * Si cambias el color principal, busca una gama parecida en
     * https://uicolors.app y pega aquí los valores.
     */
    panel: {
      50: "#F6F7F9",
      100: "#ECEEF2",
      200: "#D5DAE1",
      300: "#B0B9C6",
      500: "#66758A",
      700: "#3F4A5A",
      900: "#1F2530",
    },
  },

  /** Textos de la página de inicio y del formulario público. */
  textos: {
    /** Franja de arriba. */
    franja: "Pedidos de lunes a viernes",
    /** Letrero pequeño encima del saludo. */
    etiqueta: "Pedidos mayoristas",
    /** El saludo grande. Cada elemento va en una línea. */
    saludo: ["¡Hola! Aquí", "tomamos tu pedido."],
    /** Frase debajo del saludo. */
    bajada: "Cuéntanos qué necesitas y lo preparamos fresco para tu negocio.",
    /** Frases que corren en la cinta de abajo. */
    cinta: ["Horneado fresco cada día", "Entregas de lunes a viernes", "Pedidos en línea"],
    /** Título de la pantalla de entrada al panel. */
    panel: "Panel de cocina",
  },

  /* ---------------------- Reglas de producción ---------------------- */

  produccion: {
    /** Zona horaria del negocio (lista: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones). */
    zonaHoraria: "America/Bogota",
    /** Formato de fechas y horas ("es-CO" Colombia, "es-MX" México, "es-ES" España…). */
    idioma: "es-CO",
    /**
     * Hora de corte (0 a 23). Un pedido antes de esta hora entra a
     * producción ese mismo día; después, al siguiente día hábil.
     */
    horaCorte: 12,
    /** Máximo de unidades que la cocina puede hacer en un día. Al llenarse, el día se bloquea. */
    capacidadDiaria: 500,
    /** Mínimo de unidades por producto en un pedido. */
    minimoUnidades: 5,
    /** Mínimo de kilos para los productos que se venden por kilo. */
    minimoKilos: 1,
    /** Los tamaños (gramajes) que se usan, del más pequeño al más grande. */
    gramajes: ["50g", "70g", "90g"],
    /**
     * Tamaños viejos que hoy se llaman distinto. Ejemplo: si antes vendías
     * "100g" y ahora se llama "90g", escribe { "100g": "90g" }.
     */
    equivalenciasGramaje: {} as Record<string, string>,
    /** Cuántas unidades (bolas, piezas) sale de cada tanda de masa. */
    unidadesPorLote: { simple: 50, doble: 100, triple: 150 },
  },

  /* ------------------ Reglas especiales de las masas ------------------ */
  /*  Los nombres van en MAYÚSCULA, igual que en data/listas.json → masas. */

  masas: {
    /**
     * Productos que llevan más de una bola de masa. Ejemplo: un sándwich
     * de dos tapas lleva 2 bolas por unidad.
     */
    bolasPorProducto: { SANDWICH: 2 } as Record<string, number>,
    /**
     * Cuando la bola no es del mismo tamaño del producto. Ejemplo: el
     * SANDWICH de 90g se hace con dos bolas de 50g.
     */
    tamanoDeBola: { SANDWICH: { "90g": "50g", "70g": "50g" } } as Record<string, Record<string, string>>,
    /** Nombres distintos que salen de la misma masa: { "NOMBRE ESPECIAL": "MASA BASE" }. */
    mismaMasa: { "CHOCOLATE ESPECIAL": "CHOCOLATE" } as Record<string, string>,
    /** Masas que solo se hacen en un tamaño: { MASA: "90g" }. */
    tamanoUnico: { TEMPORADA: "90g" } as Record<string, string>,
    /** Lo que no se lleva en el stock de bolas del congelador. */
    fueraDelStock: ["CAJA SURTIDA"],
  },

  /* ------------------------------ Fechas ------------------------------ */

  /**
   * Desde cuándo cuenta el stock (AAAA-MM-DD): pon la fecha de tu primer
   * conteo completo del congelador. Vacío = desde el primer conteo que haya.
   */
  inicioDelStock: "",

  /* --------------------------- Pausa activa --------------------------- */

  pausaActiva: {
    /** Si es false, el panel nunca se detiene para la pausa. */
    activa: true,
    /** Hora del día (0 a 23) en que empieza, de lunes a viernes. */
    hora: 12,
    /** Cuánto dura, en minutos. */
    minutos: 10,
    /** Link de YouTube por defecto (también se cambia en Programar → Limpieza y rutina). */
    video: "",
    /** Desde cuándo cuenta en la cronología (AAAA-MM-DD). Vacío = desde siempre. */
    inicio: "",
  },

  /* ------------------------- Sabor de temporada ------------------------- */

  /**
   * Un producto que cambia de nombre según la época (Navidad, Halloween…).
   * El nombre se cambia desde Programar → Temporada; esto es lo que sale
   * mientras no se haya guardado nada allá.
   */
  temporada: { nombre: "Sabor de temporada", descripcion: "Edición especial", activo: false },

  /* ------------------------------ Personas ------------------------------ */

  /**
   * Quienes administran (programan y cambian clientes), además del equipo
   * de cocina de data/listas.json. Salen en la cronología de clientes.
   */
  administradoras: ["Administración"],
};
