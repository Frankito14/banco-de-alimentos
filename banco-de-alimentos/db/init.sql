-- Habilitar extensión para UUIDs en PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================
-- ESTRUCTURA DE BASE DE DATOS: BANCO DE ALIMENTOS
-- ===================================================

-- 1. Tabla Donadores
CREATE TABLE IF NOT EXISTS donadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla Ingresos
CREATE TABLE IF NOT EXISTS ingresos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_donador UUID NOT NULL REFERENCES donadores(id),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Lotes (Stock por alimentos)
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_ingreso UUID NOT NULL REFERENCES ingresos(id),
    id_deposito UUID NOT NULL,
    codigo_lote VARCHAR(50) UNIQUE NOT NULL,
    alimento_nombre VARCHAR(100) NOT NULL,
    cantidad_inicial INT NOT NULL CHECK (cantidad_inicial > 0),
    stock INT NOT NULL CHECK (stock >= 0),
    fecha_vencimiento DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla Entregas (El pedido/envío al comedor)
CREATE TABLE IF NOT EXISTS entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_deposito UUID NOT NULL,
    id_comedor UUID NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENTREGADO', 'CANCELADO')),
    fecha_entrega TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla Intermedia LotesEntregados (Relación N:M para Trazabilidad)
CREATE TABLE IF NOT EXISTS lotes_entregados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_entrega UUID NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
    id_lote UUID NOT NULL REFERENCES lotes(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- SEEDS / DATOS INICIALES DE PRUEBA
-- ===================================================

-- Donador de prueba
INSERT INTO donadores (id, nombre, direccion) VALUES 
('11111111-1111-1111-1111-111111111111', 'Supermercado Coto', 'Av. Vergara 1234, Morón');

-- Ingreso de prueba
INSERT INTO ingresos (id, id_donador) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

-- Lote que coincide con LOTE_OK ('a1b2c3d4-e5f6-4890-b234-567890abcdef') y DEPOSITO_1 ('d3b07384-d113-40e4-a123-167162354a01')
INSERT INTO lotes (id, id_ingreso, id_deposito, codigo_lote, alimento_nombre, cantidad_inicial, stock, fecha_vencimiento) VALUES 
('a1b2c3d4-e5f6-4890-b234-567890abcdef', '22222222-2222-2222-2222-222222222222', 'd3b07384-d113-40e4-a123-167162354a01', 'LOT-2026-0915', 'Leche Larga Vida 1L', 100, 100, '2030-12-31');