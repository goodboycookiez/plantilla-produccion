-- Tablas de la plataforma de pedidos y producción.
-- Pegar este bloque en Supabase → SQL Editor → Run.

create table if not exists pedidos (
  id uuid primary key,
  consecutivo bigint generated always as identity,
  creado_en timestamptz not null default now(),
  cliente_id text not null,
  cliente_nombre text not null,
  direccion text not null default '',
  gramaje text not null default '',
  items jsonb not null,
  total_unidades integer not null,
  total_kilos integer not null default 0,
  fecha_produccion date not null,
  fecha_entrega date not null,
  es_evento boolean not null default false,
  notas text not null default '',
  orden_compra text,
  estado text not null default 'recibido'
);

create index if not exists pedidos_fecha_produccion_idx on pedidos (fecha_produccion);

-- Solo el servidor (service key) puede leer o escribir.
alter table pedidos enable row level security;

-- Bajas de producción (producto que se perdió).
create table if not exists bajas (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  fecha date not null,
  producto_id text not null,
  nombre text not null,
  gramaje text not null default '',
  cantidad integer not null,
  motivo text not null default ''
);

create index if not exists bajas_fecha_idx on bajas (fecha);
alter table bajas enable row level security;

-- Muestras enviadas a clientes potenciales.
create table if not exists muestras (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  fecha date not null,
  prospecto text not null,
  contacto text not null default '',
  producto_id text not null,
  nombre text not null,
  gramaje text not null default '',
  cantidad integer not null,
  notas text not null default '',
  seguimiento text not null default 'enviada'
);

create index if not exists muestras_fecha_idx on muestras (fecha);
alter table muestras enable row level security;

-- Preproducción: masas, rellenos y toppings.
create table if not exists tareas (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  fecha date not null,
  orden integer not null default 0,
  tipo text not null,
  nombre text not null,
  gramaje text not null default '',
  lote text not null default '',
  esperado integer,
  encargada text not null default '',
  horario text not null default '',
  notas text not null default '',
  hecho boolean not null default false,
  cantidad_real integer,
  hecho_por text not null default '',
  fecha_hecho date
);

create index if not exists tareas_fecha_idx on tareas (fecha);
alter table tareas enable row level security;

-- Conteos físicos del congelador.
create table if not exists conteos (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  fecha date not null,
  area text not null,
  nombre text not null,
  gramaje text not null default '',
  cantidad integer not null,
  contado_por text not null default '',
  notas text not null default ''
);

create index if not exists conteos_fecha_idx on conteos (fecha);
alter table conteos enable row level security;

-- Limpieza y rutina: tareas fijas que se repiten cada semana.
create table if not exists rutinas (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  nombre text not null,
  categoria text not null default 'limpieza',
  dias integer[] not null,          -- 1 = lunes … 6 = sábado
  encargada text not null default '',
  notas text not null default '',
  orden integer not null default 0
);

alter table rutinas enable row level security;

-- La firma de que una rutina se hizo un día.
create table if not exists registros_rutina (
  id uuid primary key,
  rutina_id uuid not null references rutinas (id) on delete cascade,
  fecha date not null,
  hecho_por text not null,
  hecho_en timestamptz not null default now()
);

create index if not exists registros_rutina_fecha_idx on registros_rutina (fecha);
alter table registros_rutina enable row level security;

-- Viene con el conteo del congelador de miércoles y viernes.
insert into rutinas (id, nombre, categoria, dias, orden)
values ('00000000-0000-4000-8000-000000000001', 'Conteo del congelador (anotar en Stock)', 'inventario', '{3,5}', 1)
on conflict (id) do nothing;

-- Clientes que se agregan desde Programar → Clientes (la base sale del CSV).
create table if not exists clientes (
  id text primary key,
  creado_en timestamptz not null default now(),
  nombre text not null,
  razon_social text not null default '',
  direccion text not null default '',
  telefono text not null default '',
  gramaje text not null default '90g',
  horario_entrega text not null default '',
  domicilio text not null default '',
  valor_unitario text not null default '',
  tipo_pago text not null default '',
  rete_iva boolean not null default false,
  sabor_especial text not null default '',
  activo boolean not null default true
);

alter table clientes enable row level security;
-- Para quien ya había creado la tabla sin esta columna.
alter table clientes add column if not exists sabor_especial text not null default '';

-- Mínimos de stock cambiados desde Programar → Mínimos ("NOMBRE|gramaje").
create table if not exists minimos (
  clave text primary key,
  minimo integer not null
);

alter table minimos enable row level security;

-- Posición de cada pedido en su día de producción (se ordena arrastrando).
alter table pedidos add column if not exists orden integer;

-- Ajustes que se cambian desde el panel (por ejemplo, el sabor de temporada).
create table if not exists ajustes (
  clave text primary key,
  valor jsonb not null
);

alter table ajustes enable row level security;

-- Cronología de cada cliente (Clientes → ficha): notas, cambios de datos y de estado.
create table if not exists historial_clientes (
  id uuid primary key,
  cliente_id text not null,
  creado_en timestamptz not null default now(),
  fecha date not null,
  tipo text not null default 'nota',   -- nota | cambio | estado
  texto text not null,
  autor text not null default ''
);

create index if not exists historial_clientes_cliente_idx on historial_clientes (cliente_id);
alter table historial_clientes enable row level security;

-- Carpeta pública para los PDF de órdenes de compra que adjuntan los clientes.
insert into storage.buckets (id, name, public)
values ('ordenes-compra', 'ordenes-compra', true)
on conflict (id) do nothing;
