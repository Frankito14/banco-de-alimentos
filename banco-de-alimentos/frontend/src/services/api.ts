import {
  LoginResponse,
  Usuario,
  Deposito,
  Comedor,
  Lote,
  Entrega,
  ItemEntregaRequest,
  ProblemDetails,
  Rol
} from '../types';
import {
  MOCK_USUARIOS,
  MOCK_DEPOSITOS,
  MOCK_COMEDORES,
  MOCK_LOTES_INITIAL,
  MOCK_ENTREGAS_INITIAL
} from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const USE_MOCK = true; // Permite operar standalone hasta que el backend esté listo

// Persistencia local para el Mock Store
const STORAGE_KEYS = {
  LOTES: 'banco_alimentos_lotes',
  ENTREGAS: 'banco_alimentos_entregas'
};

function getStoredLotes(): Lote[] {
  const data = localStorage.getItem(STORAGE_KEYS.LOTES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(MOCK_LOTES_INITIAL));
    return MOCK_LOTES_INITIAL;
  }
  return JSON.parse(data);
}

function saveLotes(lotes: Lote[]) {
  localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(lotes));
}

function getStoredEntregas(): Entrega[] {
  const data = localStorage.getItem(STORAGE_KEYS.ENTREGAS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ENTREGAS, JSON.stringify(MOCK_ENTREGAS_INITIAL));
    return MOCK_ENTREGAS_INITIAL;
  }
  return JSON.parse(data);
}

function saveEntregas(entregas: Entrega[]) {
  localStorage.setItem(STORAGE_KEYS.ENTREGAS, JSON.stringify(entregas));
}

// Helper para emular latencia de red (100ms - 300ms)
const sleep = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export class ApiError extends Error {
  public problem: ProblemDetails;
  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

export const api = {
  /**
   * POST /api/v1/auth/login
   */
  async login(email: string, _password: string, demoRole?: Rol): Promise<LoginResponse> {
    if (USE_MOCK) {
      await sleep();
      let usuario = MOCK_USUARIOS.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (demoRole) {
        usuario = MOCK_USUARIOS.find((u) => u.rol === demoRole);
      }

      if (!usuario) {
        throw new ApiError({
          status: 401,
          title: 'Credenciales inválidas',
          detail: 'El usuario o la contraseña proporcionados no son correctos en el proveedor de identidad.',
          type: 'https://bancodealimentos.gob.ar/errores/credenciales-invalidas'
        });
      }

      const dummyJwt = `mock-jwt-token-for-${usuario.rol.toLowerCase()}-${Date.now()}`;
      return {
        token: dummyJwt,
        tokenType: 'Bearer',
        expiresIn: 3600,
        usuario
      };
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: email, password: _password })
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new ApiError(errorJson as ProblemDetails);
    }
    return res.json();
  },

  /**
   * GET /api/v1/depositos
   */
  async getDepositos(): Promise<Deposito[]> {
    if (USE_MOCK) {
      await sleep(100);
      return MOCK_DEPOSITOS;
    }
    const res = await fetch(`${BASE_URL}/api/v1/depositos`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * GET /api/v1/depositos/{depositoId}/stock
   */
  async getStock(depositoId: string): Promise<Lote[]> {
    if (USE_MOCK) {
      await sleep(150);
      const lotes = getStoredLotes();
      return lotes.filter((l) => l.depositoId === depositoId);
    }
    const res = await fetch(`${BASE_URL}/api/v1/depositos/${depositoId}/stock`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * GET /api/v1/comedores (ACL Padrón Provincial)
   */
  async getComedores(): Promise<Comedor[]> {
    if (USE_MOCK) {
      await sleep(150);
      return MOCK_COMEDORES;
    }
    const res = await fetch(`${BASE_URL}/api/v1/comedores`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * POST /api/v1/entregas (Caso de uso mínimo: Voluntario)
   * Valida stock disponible y comedor habilitado
   */
  async registrarEntrega(params: {
    depositoId: string;
    comedorId: string;
    items: ItemEntregaRequest[];
    observaciones?: string;
    currentUser: Usuario;
  }): Promise<Entrega> {
    if (USE_MOCK) {
      await sleep(350);

      // Regla de Negocio 1: Comedor Habilitado
      const comedor = MOCK_COMEDORES.find((c) => c.id === params.comedorId);
      if (!comedor || !comedor.habilitado) {
        throw new ApiError({
          status: 409,
          title: 'Comedor no habilitado',
          detail: `El comedor seleccionado no cuenta con habilitación vigente en el Padrón Provincial.`,
          type: 'https://bancodealimentos.gob.ar/errores/comedor-no-habilitado'
        });
      }

      if (!params.items || params.items.length === 0) {
        throw new ApiError({
          status: 400,
          title: 'Solicitud Inválida',
          detail: 'Debe seleccionar al menos un lote de alimentos para despachar.',
          type: 'https://bancodealimentos.gob.ar/errores/solicitud-invalida'
        });
      }

      // Regla de Negocio 2: Stock disponible suficiente
      const currentLotes = getStoredLotes();
      const itemsProcesados: Entrega['items'] = [];

      for (const reqItem of params.items) {
        const lote = currentLotes.find((l) => l.id === reqItem.loteId);
        if (!lote) {
          throw new ApiError({
            status: 404,
            title: 'Lote no encontrado',
            detail: `El lote con ID ${reqItem.loteId} no existe en el inventario.`,
            type: 'https://bancodealimentos.gob.ar/errores/lote-inexistente'
          });
        }

        if (reqItem.cantidad <= 0) {
          throw new ApiError({
            status: 400,
            title: 'Cantidad inválida',
            detail: `La cantidad solicitada para "${lote.alimento}" debe ser mayor a 0.`,
            type: 'https://bancodealimentos.gob.ar/errores/cantidad-invalida'
          });
        }

        if (reqItem.cantidad > lote.stockDisponible) {
          throw new ApiError({
            status: 409,
            title: 'Stock insuficiente',
            detail: `No hay stock suficiente para "${lote.alimento}" (Lote: ${lote.codigoLote}). Stock disponible: ${lote.stockDisponible}, solicitado: ${reqItem.cantidad}.`,
            type: 'https://bancodealimentos.gob.ar/errores/stock-insuficiente'
          });
        }

        // Descontar stock
        lote.stockDisponible -= reqItem.cantidad;
        itemsProcesados.push({
          loteId: lote.id,
          alimento: lote.alimento,
          codigoLote: lote.codigoLote,
          cantidad: reqItem.cantidad,
          unidadMedida: lote.unidadMedida
        });
      }

      saveLotes(currentLotes);

      // Crear registro de Entrega en estado PENDIENTE
      const deposito = MOCK_DEPOSITOS.find((d) => d.id === params.depositoId);
      const nuevaEntrega: Entrega = {
        id: `ent-${Date.now().toString().slice(-6)}`,
        depositoId: params.depositoId,
        depositoNombre: deposito ? deposito.nombre : 'Depósito Regional',
        comedorId: params.comedorId,
        comedorNombre: comedor.nombre,
        estado: 'PENDIENTE',
        fechaCreacion: new Date().toISOString(),
        fechaRecepcion: null,
        horarioRecepcion: null,
        createdBy: params.currentUser.nombre,
        items: itemsProcesados,
        observaciones: params.observaciones || 'Despacho registrado por voluntario'
      };

      const entregas = getStoredEntregas();
      entregas.unshift(nuevaEntrega);
      saveEntregas(entregas);

      return nuevaEntrega;
    }

    const res = await fetch(`${BASE_URL}/api/v1/entregas`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new ApiError(await res.json());
    }
    return res.json();
  },

  /**
   * GET /api/v1/entregas
   */
  async getEntregas(filtro?: { comedorId?: string; depositoId?: string }): Promise<Entrega[]> {
    if (USE_MOCK) {
      await sleep(200);
      let list = getStoredEntregas();
      if (filtro?.comedorId) {
        list = list.filter((e) => e.comedorId === filtro.comedorId);
      }
      if (filtro?.depositoId) {
        list = list.filter((e) => e.depositoId === filtro.depositoId);
      }
      return list;
    }
    const res = await fetch(`${BASE_URL}/api/v1/entregas`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  /**
   * PATCH /api/v1/entregas/{entregaId}/recepcion (Confirmar entrega: Referente)
   */
  async confirmarRecepcion(
    entregaId: string,
    payload: { conformidad: boolean; observaciones?: string; recibidoPor: string }
  ): Promise<Entrega> {
    if (USE_MOCK) {
      await sleep(300);
      const entregas = getStoredEntregas();
      const entrega = entregas.find((e) => e.id === entregaId);

      if (!entrega) {
        throw new ApiError({
          status: 404,
          title: 'Entrega no encontrada',
          detail: `No se encontró la entrega identificada con el ID ${entregaId}.`,
          type: 'https://bancodealimentos.gob.ar/errores/entrega-inexistente'
        });
      }

      if (entrega.estado === 'ENTREGADO') {
        throw new ApiError({
          status: 409,
          title: 'Entrega ya confirmada',
          detail: 'Esta entrega ya fue recibida y confirmada previamente.',
          type: 'https://bancodealimentos.gob.ar/errores/entrega-ya-confirmada'
        });
      }

      const now = new Date();
      entrega.estado = 'ENTREGADO';
      entrega.fechaRecepcion = now.toISOString().split('T')[0];
      entrega.horarioRecepcion = now.toTimeString().split(' ')[0].substring(0, 5);
      if (payload.observaciones) {
        entrega.observaciones = `${entrega.observaciones ? entrega.observaciones + ' | ' : ''}Recepción: ${payload.observaciones}`;
      }

      saveEntregas(entregas);
      return entrega;
    }

    const res = await fetch(`${BASE_URL}/api/v1/entregas/${entregaId}/recepcion`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new ApiError(await res.json());
    }
    return res.json();
  },

  /**
   * Reset data demo
   */
  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(MOCK_LOTES_INITIAL));
    localStorage.setItem(STORAGE_KEYS.ENTREGAS, JSON.stringify(MOCK_ENTREGAS_INITIAL));
  }
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
