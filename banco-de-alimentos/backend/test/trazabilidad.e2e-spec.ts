/**
 * Fitness function del NFR #1: Trazabilidad y Auditoría.
 *
 * Test de integración contra el sistema levantado con `docker compose up`.
 * Registra entregas reales de un lote y verifica que cada operación deje
 * registro y que el estado del lote pueda reconstruirse en una fecha pasada.
 *
 * Variables de entorno:
 *   E2E_PASSWORD   (obligatoria) contraseña de los usuarios de prueba de Keycloak
 *   E2E_API_URL    (opcional)    por defecto http://localhost:3000
 *   E2E_LOTE_ID    (opcional)    por defecto lote-5 (sin entregas en el seed)
 *   E2E_DB_URL     (opcional)    por defecto postgres://postgres:postgres@localhost:5432/banco_alimentos_db
 *
 * Cómo se corre (desde la carpeta backend):
 *   npm run test:e2e
 */
import { Client } from 'pg';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

const API = process.env.E2E_API_URL || 'http://localhost:3000';
const DB_URL = process.env.E2E_DB_URL || 'postgres://postgres:postgres@localhost:5432/banco_alimentos_db';
const PASSWORD = process.env.E2E_PASSWORD;
const LOTE_ID = process.env.E2E_LOTE_ID || 'lote-5';
const DEPOSITO_ID = 'dep-hurlingham'; // depósito del lote-5 y del voluntario de prueba
const COMEDOR_ID = '1'; // Comedor Los Pibes: figura en el padrón provincial (mock)
const VOLUNTARIO = 'voluntario@bancodealimentos.gob.ar';
const COORDINADOR = 'coordinador@ministerio.gob.ar';
const TIEMPO_MAXIMO_MS = 5000; // medida del NFR #1

const ZONA = 'America/Argentina/Buenos_Aires';

interface Movimiento {
  tipo: string;
  fecha: string;
  cantidad: number;
  saldoResultante: number;
  referenciaId: string;
  destinoUOrigen: string;
  responsable: string;
}

interface Reconstruccion {
  lote: { cantidadInicial: number; stockReconstruidoACorte: number; stockActualSistema: number };
  movimientosHistoricos: Movimiento[];
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fecha de ayer en Argentina, con el mismo formato que usa la pantalla de auditoría. */
function finDeAyerEnArgentina(): string {
  const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dia = new Intl.DateTimeFormat('sv-SE', { timeZone: ZONA }).format(ayer);
  return `${dia}T23:59:59`;
}

async function login(usuario: string): Promise<string> {
  const res = await request(API)
    .post('/api/v1/auth/login')
    .send({ usuario, password: PASSWORD })
    .expect(200);
  return res.body.token;
}

async function reconstruir(
  token: string,
  fecha?: string,
): Promise<{ body: Reconstruccion; ms: number }> {
  const inicio = Date.now();
  const req = request(API)
    .get(`/api/v1/auditoria/lotes/${LOTE_ID}/trazabilidad`)
    .set('Authorization', `Bearer ${token}`);
  if (fecha) req.query({ fecha });
  const res = await req.expect(200);
  return { body: res.body, ms: Date.now() - inicio };
}

async function registrarEntrega(token: string, cantidad: number): Promise<string> {
  const res = await request(API)
    .post('/api/v1/entregas')
    .set('Authorization', `Bearer ${token}`)
    .send({
      depositoId: DEPOSITO_ID,
      comedorId: COMEDOR_ID,
      lotes: [{ loteId: LOTE_ID, cantidad }],
      observaciones: 'Entrega generada por el test de trazabilidad (NFR #1)',
    })
    .expect(201);
  return res.body.id;
}

describe('NFR #1 - Trazabilidad y Auditoría', () => {
  const CANTIDAD_1 = 1;
  const CANTIDAD_2 = 2;

  let tokenVoluntario: string;
  let tokenCoordinador: string;

  let pasadoAntes: Reconstruccion; // lote a fin de ayer, antes de las entregas del test
  let actualAntes: Reconstruccion; // lote hoy, antes de las entregas del test
  let corteEntreEntregas: string; // instante entre la entrega 1 y la entrega 2

  let entrega1: string;
  let entrega2: string;

  const tiempos: number[] = [];

  beforeAll(async () => {
    if (!PASSWORD) {
      throw new Error('Falta la variable de entorno E2E_PASSWORD (contraseña de los usuarios de prueba).');
    }

    tokenVoluntario = await login(VOLUNTARIO);
    tokenCoordinador = await login(COORDINADOR);

    // Preparación: estado del lote antes de registrar nada
    const pasado = await reconstruir(tokenCoordinador, finDeAyerEnArgentina());
    const actual = await reconstruir(tokenCoordinador);
    pasadoAntes = pasado.body;
    actualAntes = actual.body;
    tiempos.push(pasado.ms, actual.ms);

    // Acción 1: dos entregas, separadas para poder cortar entre ellas
    entrega1 = await registrarEntrega(tokenVoluntario, CANTIDAD_1);
    await esperar(1500);
    corteEntreEntregas = new Date().toISOString();
    await esperar(1500);
    entrega2 = await registrarEntrega(tokenVoluntario, CANTIDAD_2);

    // Acción 2: confirmación de recepción de la entrega 1
    await request(API)
      .patch(`/api/v1/entregas/${entrega1}/recepcion`)
      .set('Authorization', `Bearer ${tokenCoordinador}`)
      .send({ recepcionConforme: true, observaciones: 'Confirmación generada por el test (NFR #1)' })
      .expect(200);
  }, 60_000);

  it('El estado del lote en una fecha pasada no cambia por entregas posteriores', async () => {
    const { body, ms } = await reconstruir(tokenCoordinador, finDeAyerEnArgentina());
    tiempos.push(ms);

    expect(body.lote.stockReconstruidoACorte).toBe(pasadoAntes.lote.stockReconstruidoACorte);
    const ids = body.movimientosHistoricos.map((m) => m.referenciaId);
    expect(ids).not.toContain(entrega1);
    expect(ids).not.toContain(entrega2);
  });

  it('El stock reconstruido a hoy descuenta exactamente las entregas registradas', async () => {
    const { body, ms } = await reconstruir(tokenCoordinador);
    tiempos.push(ms);

    const esperado = actualAntes.lote.stockReconstruidoACorte - CANTIDAD_1 - CANTIDAD_2;
    expect(body.lote.stockReconstruidoACorte).toBe(esperado);
    expect(body.lote.stockReconstruidoACorte).toBe(body.lote.stockActualSistema);
  });

  it('Cada entrega queda registrada con su fecha, comedor, cantidad y responsable', async () => {
    const { body, ms } = await reconstruir(tokenCoordinador);
    tiempos.push(ms);

    for (const [id, cantidad] of [
      [entrega1, CANTIDAD_1],
      [entrega2, CANTIDAD_2],
    ] as const) {
      const mov = body.movimientosHistoricos.find((m) => m.referenciaId === id);
      expect(mov, `la entrega ${id} no aparece en la línea de tiempo`).toBeDefined();
      expect(mov!.tipo).toBe('DESPACHO_ENTREGA');
      expect(mov!.cantidad).toBe(cantidad);
      expect(Number.isNaN(Date.parse(mov!.fecha))).toBe(false);
      expect(mov!.destinoUOrigen).toBeTruthy();
      expect(mov!.responsable).toBeTruthy();
    }
  });

  it('Reconstruye el lote en un instante exacto entre ambas entregas como fecha de corte.', async () => {
    const { body, ms } = await reconstruir(tokenCoordinador, corteEntreEntregas);
    tiempos.push(ms);

    const ids = body.movimientosHistoricos.map((m) => m.referenciaId);
    expect(ids).toContain(entrega1);
    expect(ids, 'incluye una entrega registrada después de la fecha de corte').not.toContain(entrega2);
  });

  it('La confirmación de recepción queda registrada como un movimiento nuevo', async () => {
    const { body, ms } = await reconstruir(tokenCoordinador);
    tiempos.push(ms);

    const movimientosDeLaEntrega = body.movimientosHistoricos.filter((m) => m.referenciaId === entrega1);
    const confirmacion = movimientosDeLaEntrega.find((m) => m.tipo !== 'DESPACHO_ENTREGA');
    expect(confirmacion, 'la confirmación no figura como movimiento en la línea de tiempo').toBeDefined();
    expect(confirmacion!.responsable).toBeTruthy();
  });

  it('Ninguna operación modifica un registro ya guardado', async () => {
    const db = new Client({ connectionString: DB_URL });
    await db.connect();
    try {
      // La confirmación quedó como un registro nuevo en el historial, sin tocar el anterior
      const historial = await db.query(
        'SELECT estado FROM historial_estado_entrega WHERE id_entrega = $1 ORDER BY fecha_hora',
        [entrega1],
      );
      expect(historial.rows.map((r) => r.estado)).toEqual(['PENDIENTE', 'CONFIRMADO']);

      // La base de datos rechaza modificar o borrar registros ya guardados
      await expect(
        db.query(`UPDATE historial_estado_entrega SET estado = 'CANCELADO' WHERE id_entrega = $1`, [entrega1]),
        'la base permitió modificar el historial de estados',
      ).rejects.toThrow(/inmutable/);
      await expect(
        db.query('UPDATE entregas SET observaciones = $2 WHERE id = $1', [entrega1, 'modificado']),
        'la base permitió modificar una entrega',
      ).rejects.toThrow(/inmutable/);
      await expect(
        db.query('DELETE FROM lotes_entregados WHERE id_entrega = $1', [entrega1]),
        'la base permitió borrar los lotes de una entrega',
      ).rejects.toThrow(/inmutable/);
    } finally {
      await db.end();
    }
  });

  it(`La reconstrucción responde en menos de ${TIEMPO_MAXIMO_MS} ms`, () => {
    expect(tiempos.length).toBeGreaterThan(0);
    expect(Math.max(...tiempos)).toBeLessThan(TIEMPO_MAXIMO_MS);
  });
});
