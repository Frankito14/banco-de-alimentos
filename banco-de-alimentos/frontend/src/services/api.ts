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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  public problem: ProblemDetails;
  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  /**
   * POST /api/v1/auth/login
   * Autenticación delegada contra Keycloak a través del backend API.
   * Sin datos mockeados ni fallbacks: si Keycloak o el backend fallan, la petición falla.
   */
  async login(email: string, password: string, demoRole?: Rol): Promise<LoginResponse> {
    if (demoRole === 'Voluntario') {
      email = 'voluntario@bancodealimentos.gob.ar';
      password = 'PasswordSegura123!';
    } else if (demoRole === 'ReferenteComedor') {
      email = 'referente@comedor-sol.gob.ar';
      password = 'PasswordSegura123!';
    } else if (demoRole === 'Coordinador') {
      email = 'coordinador@ministerio.gob.ar';
      password = 'PasswordSegura123!';
    }

    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: email, password })
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
    const res = await fetch(`${BASE_URL}/api/v1/depositos`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * GET /api/v1/depositos/{depositoId}/stock
   */
  async getStock(depositoId: string): Promise<Lote[]> {
    const res = await fetch(`${BASE_URL}/api/v1/depositos/${depositoId}/stock`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * GET /api/v1/comedores (Padrón Provincial + PostgreSQL)
   */
  async getComedores(): Promise<Comedor[]> {
    const res = await fetch(`${BASE_URL}/api/v1/comedores`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * POST /api/v1/entregas (Voluntario)
   */
  async registrarEntrega(params: {
    depositoId: string;
    comedorId: string;
    items: ItemEntregaRequest[];
    observaciones?: string;
    currentUser: Usuario;
  }): Promise<Entrega> {
    const payload = {
      depositoId: params.depositoId,
      comedorId: params.comedorId,
      lotes: params.items.map((i) => ({ loteId: i.loteId, cantidad: i.cantidad })),
      items: params.items.map((i) => ({ loteId: i.loteId, cantidad: i.cantidad })),
      observaciones: params.observaciones,
    };

    const res = await fetch(`${BASE_URL}/api/v1/entregas`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * GET /api/v1/entregas
   */
  async getEntregas(filtro?: { comedorId?: string; depositoId?: string }): Promise<Entrega[]> {
    const query = new URLSearchParams();
    if (filtro?.comedorId) query.append('comedorId', filtro.comedorId);
    if (filtro?.depositoId) query.append('depositoId', filtro.depositoId);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await fetch(`${BASE_URL}/api/v1/entregas${qs}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * PATCH /api/v1/entregas/{entregaId}/recepcion (Confirmación física: Referente)
   */
  async confirmarRecepcion(
    entregaId: string,
    payload: { conformidad: boolean; observaciones?: string; recibidoPor: string }
  ): Promise<Entrega> {
    const res = await fetch(`${BASE_URL}/api/v1/entregas/${entregaId}/recepcion`, {
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  }
};
