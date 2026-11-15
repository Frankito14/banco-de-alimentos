// src/common/database/database.seed.ts
// NOTA ARQUITECTÓNICA: La autenticación e identidad está 100% delegada en Keycloak.
// No existen tablas de usuarios ni credenciales locales en PostgreSQL.
//
// Este script es el mismo que db/init.sql y se ejecuta en cada arranque del backend.
// Es idempotente: crea lo que falta e inserta los seeds con ON CONFLICT DO NOTHING.
// Si se modifica uno, hay que modificar el otro.

export const INITIAL_SCHEMA_AND_SEED = `
-- Base de Datos: PostgreSQL 16
-- Dominio: Banco de Alimentos Provincial
-- NOTA ARQUITECTÓNICA: La autenticación e identidad está 100% delegada en el IdP OIDC (Keycloak).
-- Por ende, no existen tablas de usuarios ni hashes de credenciales en esta base de datos.
--
-- MODELO INMUTABLE (NFR #1 - Trazabilidad y Auditoría):
-- Los movimientos se registran solo con INSERT. Ninguna fila de las tablas de movimientos
-- puede modificarse ni borrarse: un trigger rechaza cualquier UPDATE o DELETE.
--   * El stock de un lote es la suma de sus movimientos (vista v_stock_lotes).
--   * El estado de una entrega es el último registro de su historial (vista v_estado_entregas).
--
-- IMPORTANTE: Este script solo se ejecuta cuando la base se crea por primera vez.
-- Si la base fue creada con el esquema anterior (con la columna lotes.stock), hay que
-- recrearla con: docker compose down -v && docker compose up -d --build

-- Configurar huso horario oficial UTC-3 (Argentina)
SET timezone = 'America/Argentina/Buenos_Aires';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Corta la ejecución con un mensaje claro si la base tiene el esquema anterior (mutable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lotes' AND column_name = 'stock'
  ) THEN
    RAISE EXCEPTION 'La base de datos tiene el esquema anterior (lotes.stock). Recreala con: docker compose down -v && docker compose up -d --build';
  END IF;
END $$;

-- 1. Tabla Donadores
CREATE TABLE IF NOT EXISTS donadores (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Depósitos Regionales
CREATE TABLE IF NOT EXISTS depositos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    capacidad_total INT NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Comedores Comunitarios (Caché / Registro local del padrón)
CREATE TABLE IF NOT EXISTS comedores (
    id VARCHAR(100) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    responsable VARCHAR(100) NOT NULL,
    partido VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    capacidad_personas INT NOT NULL DEFAULT 50,
    habilitado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla Ingresos de Alimentos (donaciones)
CREATE TABLE IF NOT EXISTS ingresos (
    id VARCHAR(50) PRIMARY KEY,
    id_donador VARCHAR(50) REFERENCES donadores(id),
    fecha TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Lotes (datos fijos del lote; el stock NO se guarda acá)
CREATE TABLE IF NOT EXISTS lotes (
    id VARCHAR(50) PRIMARY KEY,
    id_ingreso VARCHAR(50) REFERENCES ingresos(id),
    id_deposito VARCHAR(50) NOT NULL REFERENCES depositos(id),
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    alimento_nombre VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidades',
    cantidad_inicial INT NOT NULL CHECK (cantidad_inicial > 0),
    fecha_vencimiento DATE NOT NULL,
    donante_origen VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla Entregas (cabecera del despacho; solo INSERT)
CREATE TABLE IF NOT EXISTS entregas (
    id VARCHAR(50) PRIMARY KEY,
    id_deposito VARCHAR(50) NOT NULL REFERENCES depositos(id),
    id_comedor VARCHAR(100) NOT NULL,
    observaciones TEXT NULL,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por_usuario_id VARCHAR(100) NOT NULL,
    creado_por_nombre VARCHAR(150) NOT NULL
);

-- 7. Tabla LotesEntregados (renglones de la entrega: qué lote y cuánto; solo INSERT)
CREATE TABLE IF NOT EXISTS lotes_entregados (
    id VARCHAR(50) PRIMARY KEY,
    id_entrega VARCHAR(50) NOT NULL REFERENCES entregas(id),
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla HistorialEstadoEntrega (cada cambio de estado es una fila nueva; solo INSERT)
CREATE TABLE IF NOT EXISTS historial_estado_entrega (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_entrega VARCHAR(50) NOT NULL REFERENCES entregas(id),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO')),
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(100) NOT NULL,
    usuario_nombre VARCHAR(150) NOT NULL,
    observaciones TEXT NULL
);

-- Una entrega pasa por cada estado una sola vez (evita confirmar dos veces la misma entrega)
CREATE UNIQUE INDEX IF NOT EXISTS ux_historial_estado_entrega
    ON historial_estado_entrega (id_entrega, estado);

-- 9. Tabla MovimientoStock (stock actual = SUM(cantidad) por lote; solo INSERT)
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    id_entrega VARCHAR(50) NULL REFERENCES entregas(id),
    tipo_movimiento VARCHAR(30) NOT NULL CHECK (tipo_movimiento IN ('INGRESO', 'ENTREGA_RESERVADA')),
    cantidad INT NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(100) NOT NULL,
    usuario_nombre VARCHAR(150) NOT NULL,
    CHECK (
      (tipo_movimiento = 'INGRESO' AND cantidad > 0 AND id_entrega IS NULL) OR
      (tipo_movimiento = 'ENTREGA_RESERVADA' AND cantidad < 0 AND id_entrega IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS ix_movimientos_stock_lote ON movimientos_stock (id_lote, fecha_hora);
CREATE INDEX IF NOT EXISTS ix_lotes_entregados_entrega ON lotes_entregados (id_entrega);
CREATE INDEX IF NOT EXISTS ix_historial_estado_entrega ON historial_estado_entrega (id_entrega, fecha_hora);

-- Inmutabilidad garantizada por la base de datos: rechaza UPDATE y DELETE
CREATE OR REPLACE FUNCTION rechazar_modificacion() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es inmutable: no se permite % (NFR Trazabilidad y Auditoría)', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_inmutable_lotes
    BEFORE UPDATE OR DELETE ON lotes
    FOR EACH ROW EXECUTE FUNCTION rechazar_modificacion();

CREATE OR REPLACE TRIGGER trg_inmutable_entregas
    BEFORE UPDATE OR DELETE ON entregas
    FOR EACH ROW EXECUTE FUNCTION rechazar_modificacion();

CREATE OR REPLACE TRIGGER trg_inmutable_lotes_entregados
    BEFORE UPDATE OR DELETE ON lotes_entregados
    FOR EACH ROW EXECUTE FUNCTION rechazar_modificacion();

CREATE OR REPLACE TRIGGER trg_inmutable_historial_estado_entrega
    BEFORE UPDATE OR DELETE ON historial_estado_entrega
    FOR EACH ROW EXECUTE FUNCTION rechazar_modificacion();

CREATE OR REPLACE TRIGGER trg_inmutable_movimientos_stock
    BEFORE UPDATE OR DELETE ON movimientos_stock
    FOR EACH ROW EXECUTE FUNCTION rechazar_modificacion();

-- Vista: stock actual de cada lote (suma de sus movimientos)
CREATE OR REPLACE VIEW v_stock_lotes AS
SELECT l.id AS id_lote,
       COALESCE(SUM(m.cantidad), 0)::INT AS stock
FROM lotes l
LEFT JOIN movimientos_stock m ON m.id_lote = l.id
GROUP BY l.id;

-- Vista: estado actual de cada entrega (último registro de su historial)
CREATE OR REPLACE VIEW v_estado_entregas AS
SELECT DISTINCT ON (h.id_entrega)
       h.id_entrega,
       h.estado,
       h.fecha_hora,
       h.usuario_id,
       h.usuario_nombre,
       h.observaciones
FROM historial_estado_entrega h
ORDER BY h.id_entrega, h.fecha_hora DESC, h.id DESC;

-- Seeds
INSERT INTO depositos (id, nombre, direccion, localidad, capacidad_total) VALUES
('dep-hurlingham', 'Depósito Regional N° 1 - Hurlingham', 'Av. Vergara 2222', 'Hurlingham', 15000),
('dep-moron', 'Depósito Regional N° 2 - Morón', 'Rivadavia 14200', 'Morón', 12000),
('d3b07384-d113-40e4-a123-167162354a01', 'Depósito Central Provincial', 'Calle 12 N° 550', 'La Plata', 25000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO donadores (id, nombre, direccion) VALUES
('11111111-1111-1111-1111-111111111111', 'Supermercado Coto', 'Av. Vergara 1234, Morón'),
('don-serenisima', 'Lácteos La Serenísima', 'Ruta 5 Km 75, Gral. Rodríguez'),
('don-molinos', 'Molinos Río de la Plata', 'Av. Belgrano 400, CABA'),
('don-arcor', 'Grupo Arcor', 'Av. Rivadavia 200, Morón')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ingresos (id, id_donador, fecha) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2026-10-01 09:00:00-03'),
('ing-001', 'don-serenisima', '2026-10-01 09:00:00-03'),
('ing-002', 'don-molinos', '2026-10-01 09:00:00-03')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lotes (id, id_ingreso, id_deposito, codigo_lote, alimento_nombre, unidad_medida, cantidad_inicial, fecha_vencimiento, donante_origen, created_at) VALUES
('a1b2c3d4-e5f6-4890-b234-567890abcdef', '22222222-2222-2222-2222-222222222222', 'd3b07384-d113-40e4-a123-167162354a01', 'LOT-2026-0915', 'Leche Larga Vida 1L', 'litros', 100, '2030-12-31', 'Supermercado Coto', '2026-10-01 09:00:00-03'),
('lote-1', 'ing-001', 'dep-hurlingham', 'LP-2026-901', 'Leche en Polvo Entera 1kg', 'cajas', 250, '2027-04-15', 'Lácteos La Serenísima', '2026-10-01 09:00:00-03'),
('lote-2', 'ing-002', 'dep-hurlingham', 'FS-2026-302', 'Fideos Secos Guiseros 500g', 'paquetes', 400, '2027-08-30', 'Molinos Río de la Plata', '2026-10-01 09:00:00-03'),
('lote-3', 'ing-002', 'dep-hurlingham', 'AR-2026-118', 'Arroz Largo Fino 1kg', 'bolsas', 300, '2027-11-20', 'Distribuidora Central S.A.', '2026-10-01 09:00:00-03'),
('lote-4', 'ing-001', 'dep-hurlingham', 'AC-2026-554', 'Aceite de Girasol 900ml', 'botellas', 120, '2027-02-10', 'Aceitera General Deheza', '2026-10-01 09:00:00-03'),
('lote-5', 'ing-002', 'dep-hurlingham', 'LT-2026-009', 'Lentejas Secas Seleccionadas 500g', 'paquetes', 180, '2027-09-05', 'Legumbres del Plata', '2026-10-01 09:00:00-03'),
('lote-6', 'ing-001', 'dep-moron', 'LE-2026-110', 'Leche Entera Tetra 1L', 'litros', 500, '2027-06-20', 'Lácteos La Serenísima', '2026-10-01 09:00:00-03'),
('lote-7', 'ing-002', 'dep-moron', 'HR-2026-044', 'Harina de Trigo 000 1kg', 'paquetes', 350, '2027-05-18', 'Molinos Río de la Plata', '2026-10-01 09:00:00-03')
ON CONFLICT (id) DO NOTHING;

-- Movimiento de INGRESO de cada lote (origen de su stock)
INSERT INTO movimientos_stock (id, id_lote, id_entrega, tipo_movimiento, cantidad, fecha_hora, usuario_id, usuario_nombre) VALUES
('mov-ing-lote-0', 'a1b2c3d4-e5f6-4890-b234-567890abcdef', NULL, 'INGRESO', 100, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-1', 'lote-1', NULL, 'INGRESO', 250, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-2', 'lote-2', NULL, 'INGRESO', 400, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-3', 'lote-3', NULL, 'INGRESO', 300, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-4', 'lote-4', NULL, 'INGRESO', 120, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-5', 'lote-5', NULL, 'INGRESO', 180, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-6', 'lote-6', NULL, 'INGRESO', 500, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema'),
('mov-ing-lote-7', 'lote-7', NULL, 'INGRESO', 350, '2026-10-01 09:00:00-03', 'seed', 'Carga inicial del sistema')
ON CONFLICT (id) DO NOTHING;

INSERT INTO comedores (id, nombre, responsable, partido, direccion, telefono, capacidad_personas, habilitado) VALUES
('1', 'Comedor Los Pibes', 'Marta Gómez', 'Morón', 'Av. Rivadavia 18450, Moron', '11-4455-6677', 150, true),
('2', 'Comedor Esperanza', 'Jorge López', 'La Plata', 'Calle 12 N 1450, La Plata', '221-5544-332', 120, true),
('3', 'Merendero Manos Solidarias', 'Laura Díaz', 'Merlo', 'Mitre 345, Merlo', '11-3322-1144', 90, true),
('4', 'Comedor Barrio Unido', 'Carlos Pérez', 'Quilmes', 'Av. Mosconi 2780, Quilmes', '11-9988-7766', 110, true),
('5', 'Comedor Santa Rita', 'Ana Fernández', 'Mar del Plata', 'San Martin 1020, Mar del Plata', '223-4455-889', 140, true),
('6', 'Comedor Corazon Abierto', 'Santiago Silva', 'Bahía Blanca', 'Belgrano 560, Bahia Blanca', '291-4556-789', 130, true),
('7', 'Olla Popular El Hornito', 'Mónica Rivas', 'Luján', 'Ruta 5 Km 98, Lujan', '2323-421-456', 90, true),
('8', 'Comedor Nuestra Señora de Luján', 'Graciela Benítez', 'Lomas de Zamora', 'Alsina 870, Lomas de Zamora', '11-4244-8899', 160, true),
('9', 'Comedor Los Ceibos', 'Pedro Morales', 'Lanús', 'Av. Hipolito Yrigoyen 3200, Lanus', '11-4241-1122', 140, true),
('10', 'Comedor Sol de Mayo', 'Mariana Rossi', 'Tandil', '25 de Mayo 410, Tandil', '249-442-8877', 100, true),
('com-el-sol', 'Comedor Comunitario Rayito de Sol', 'Refe Rente', 'Hurlingham', 'Calle Falsa 123', '11-4567-8901', 120, true),
('com-esperanza', 'Comedor La Esperanza', 'Jorge López', 'Morón', 'Av. Libertador 450', '11-4567-8902', 80, true),
('com-inhabilitado', 'Merendero Sin Certificado (Bloqueado)', 'Carlos Gómez', 'Ituzaingó', 'Los Olivos 999', '11-4567-8903', 50, false),
('c8e12345-e89b-42d3-a456-426614174000', 'Comedor Central Test Habilitado', 'Admin Comedor', 'Hurlingham', 'Calle 1 100', '11-0000-0001', 100, true),
('c8e12345-e89b-42d3-a456-426614174001', 'Comedor Test Inhabilitado', 'Admin Bloqueado', 'Hurlingham', 'Calle 2 200', '11-0000-0002', 50, false)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  direccion = EXCLUDED.direccion,
  habilitado = EXCLUDED.habilitado;

INSERT INTO entregas (id, id_deposito, id_comedor, observaciones, fecha_creacion, creado_por_usuario_id, creado_por_nombre) VALUES
('ent-000', 'dep-hurlingham', 'com-esperanza', 'Entregado con acta de conformidad firmada', '2026-10-25 10:00:00-03', 'u-voluntario-1', 'Vol Untario'),
('ent-001', 'dep-hurlingham', 'com-el-sol', 'Despacho matutino en camioneta provincial #4', '2026-10-26 14:30:00-03', 'u-voluntario-1', 'Vol Untario')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lotes_entregados (id, id_entrega, id_lote, cantidad, created_at) VALUES
('le-001', 'ent-000', 'lote-3', 40, '2026-10-25 10:00:00-03'),
('le-002', 'ent-001', 'lote-1', 30, '2026-10-26 14:30:00-03'),
('le-003', 'ent-001', 'lote-2', 50, '2026-10-26 14:30:00-03')
ON CONFLICT (id) DO NOTHING;

INSERT INTO movimientos_stock (id, id_lote, id_entrega, tipo_movimiento, cantidad, fecha_hora, usuario_id, usuario_nombre) VALUES
('mov-le-001', 'lote-3', 'ent-000', 'ENTREGA_RESERVADA', -40, '2026-10-25 10:00:00-03', 'u-voluntario-1', 'Vol Untario'),
('mov-le-002', 'lote-1', 'ent-001', 'ENTREGA_RESERVADA', -30, '2026-10-26 14:30:00-03', 'u-voluntario-1', 'Vol Untario'),
('mov-le-003', 'lote-2', 'ent-001', 'ENTREGA_RESERVADA', -50, '2026-10-26 14:30:00-03', 'u-voluntario-1', 'Vol Untario')
ON CONFLICT (id) DO NOTHING;

INSERT INTO historial_estado_entrega (id, id_entrega, estado, fecha_hora, usuario_id, usuario_nombre, observaciones) VALUES
('hist-000-1', 'ent-000', 'PENDIENTE', '2026-10-25 10:00:00-03', 'u-voluntario-1', 'Vol Untario', NULL),
('hist-000-2', 'ent-000', 'CONFIRMADO', '2026-10-25 16:45:00-03', 'u-referente-1', 'Referente Comedor La Esperanza', 'Entregado con acta de conformidad firmada'),
('hist-001-1', 'ent-001', 'PENDIENTE', '2026-10-26 14:30:00-03', 'u-voluntario-1', 'Vol Untario', NULL)
ON CONFLICT (id) DO NOTHING;
`;
