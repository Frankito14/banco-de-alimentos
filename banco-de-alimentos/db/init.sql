-- init.sql
-- Base de Datos: PostgreSQL 16
-- Dominio: Banco de Alimentos Provincial
-- NOTA ARQUITECTÓNICA: La autenticación e identidad está 100% delegada en el IdP OIDC (Keycloak).
-- Por ende, no existen tablas de usuarios ni hashes de credenciales en esta base de datos.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla Donadores
CREATE TABLE IF NOT EXISTS donadores (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Depósitos Regionales
CREATE TABLE IF NOT EXISTS depositos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    capacidad_total INT NOT NULL DEFAULT 10000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Comedores Comunitarios (Caché / Registro local)
CREATE TABLE IF NOT EXISTS comedores (
    id VARCHAR(100) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    responsable VARCHAR(100) NOT NULL,
    partido VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
    capacidad_personas INT NOT NULL DEFAULT 50,
    habilitado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla Ingresos de Alimentos
CREATE TABLE IF NOT EXISTS ingresos (
    id VARCHAR(50) PRIMARY KEY,
    id_donador VARCHAR(50) REFERENCES donadores(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Lotes (Stock por alimento en depósito)
CREATE TABLE IF NOT EXISTS lotes (
    id VARCHAR(50) PRIMARY KEY,
    id_ingreso VARCHAR(50) REFERENCES ingresos(id),
    id_deposito VARCHAR(50) NOT NULL REFERENCES depositos(id),
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    alimento_nombre VARCHAR(100) NOT NULL,
    unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidades',
    cantidad_inicial INT NOT NULL CHECK (cantidad_inicial > 0),
    stock INT NOT NULL CHECK (stock >= 0),
    fecha_vencimiento DATE NOT NULL,
    donante_origen VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla Entregas (Despacho / Pedido al comedor)
CREATE TABLE IF NOT EXISTS entregas (
    id VARCHAR(50) PRIMARY KEY,
    id_deposito VARCHAR(50) NOT NULL REFERENCES depositos(id),
    id_comedor VARCHAR(100) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENTREGADO', 'CANCELADO')),
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion DATE NULL,
    horario_recepcion VARCHAR(10) NULL,
    observaciones TEXT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla Intermedia LotesEntregados (Relación N:M para Trazabilidad)
CREATE TABLE IF NOT EXISTS lotes_entregados (
    id VARCHAR(50) PRIMARY KEY,
    id_entrega VARCHAR(50) NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    id_lote VARCHAR(50) NOT NULL REFERENCES lotes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

INSERT INTO ingresos (id, id_donador) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
('ing-001', 'don-serenisima'),
('ing-002', 'don-molinos')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lotes (id, id_ingreso, id_deposito, codigo_lote, alimento_nombre, unidad_medida, cantidad_inicial, stock, fecha_vencimiento, donante_origen) VALUES 
('a1b2c3d4-e5f6-4890-b234-567890abcdef', '22222222-2222-2222-2222-222222222222', 'd3b07384-d113-40e4-a123-167162354a01', 'LOT-2026-0915', 'Leche Larga Vida 1L', 'litros', 100, 100, '2030-12-31', 'Supermercado Coto'),
('lote-1', 'ing-001', 'dep-hurlingham', 'LP-2026-901', 'Leche en Polvo Entera 1kg', 'cajas', 250, 250, '2027-04-15', 'Lácteos La Serenísima'),
('lote-2', 'ing-002', 'dep-hurlingham', 'FS-2026-302', 'Fideos Secos Guiseros 500g', 'paquetes', 400, 400, '2027-08-30', 'Molinos Río de la Plata'),
('lote-3', 'ing-002', 'dep-hurlingham', 'AR-2026-118', 'Arroz Largo Fino 1kg', 'bolsas', 300, 300, '2027-11-20', 'Distribuidora Central S.A.'),
('lote-4', 'ing-001', 'dep-hurlingham', 'AC-2026-554', 'Aceite de Girasol 900ml', 'botellas', 120, 120, '2027-02-10', 'Aceitera General Deheza'),
('lote-5', 'ing-002', 'dep-hurlingham', 'LT-2026-009', 'Lentejas Secas Seleccionadas 500g', 'paquetes', 180, 180, '2027-09-05', 'Legumbres del Plata'),
('lote-6', 'ing-001', 'dep-moron', 'LE-2026-110', 'Leche Entera Tetra 1L', 'litros', 500, 500, '2027-06-20', 'Lácteos La Serenísima'),
('lote-7', 'ing-002', 'dep-moron', 'HR-2026-044', 'Harina de Trigo 000 1kg', 'paquetes', 350, 350, '2027-05-18', 'Molinos Río de la Plata')
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

INSERT INTO entregas (id, id_deposito, id_comedor, estado, fecha_entrega, fecha_recepcion, horario_recepcion, observaciones, created_by) VALUES 
('ent-000', 'dep-hurlingham', 'com-esperanza', 'ENTREGADO', '2026-10-25 10:00:00', '2026-10-25', '16:45', 'Entregado con acta de conformidad firmada', 'Vol Untario'),
('ent-001', 'dep-hurlingham', 'com-el-sol', 'PENDIENTE', '2026-10-26 14:30:00', NULL, NULL, 'Despacho matutino en camioneta provincial #4', 'Vol Untario')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lotes_entregados (id, id_entrega, id_lote, cantidad) VALUES 
('le-001', 'ent-000', 'lote-3', 40),
('le-002', 'ent-001', 'lote-1', 30),
('le-003', 'ent-001', 'lote-2', 50)
ON CONFLICT (id) DO NOTHING;
