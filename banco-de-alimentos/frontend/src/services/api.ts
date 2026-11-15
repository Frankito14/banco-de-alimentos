import {
  LoginResponse,
  Usuario,
  UsuarioDemo,
  Deposito,
  Comedor,
  Lote,
  Entrega,
  ItemEntregaRequest,
  ProblemDetails
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

function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

export const api = {
  /**
   * POST /api/v1/auth/login
   * Autenticación delegada contra Keycloak a través del backend API.
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: email, password })
    });

    if (!res.ok) {
      handleUnauthorized(res);
      const errorJson = await res.json().catch(() => ({}));
      throw new ApiError(errorJson as ProblemDetails);
    }
    return res.json();
  },

  /**
   * GET /api/v1/auth/usuarios-demo
   * Lista los usuarios disponibles desde el backend (Keycloak + PostgreSQL).
   */
  async getUsuariosDemo(): Promise<UsuarioDemo[]> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/usuarios-demo`);
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new ApiError(errorJson as ProblemDetails);
    }
    return res.json();
  },

  /**
   * POST /api/v1/auth/login-demo
   * Autenticación de acceso rápido delegada al backend sin exponer contraseñas en el frontend.
   */
  async loginDemo(email: string): Promise<LoginResponse> {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      handleUnauthorized(res);
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
      handleUnauthorized(res);
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
      handleUnauthorized(res);
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
      handleUnauthorized(res);
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
      handleUnauthorized(res);
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
      handleUnauthorized(res);
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
      handleUnauthorized(res);
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * GET /api/v1/auditoria/reportes/entregas/csv (Exportar reporte para Tribunal de Cuentas)
   */
  async descargarReporteCsv(): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/v1/auditoria/reportes/entregas/csv`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      handleUnauthorized(res);
      throw new ApiError(await res.json().catch(() => ({})));
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_entregas_tribunal_cuentas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * GET /api/v1/auditoria/lotes
   */
  async getLotesAuditoria(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/api/v1/auditoria/lotes`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      handleUnauthorized(res);
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  },

  /**
   * GET /api/v1/auditoria/lotes/{loteId}/trazabilidad
   * Reconstrucción histórica inmutable exigida por el Tribunal de Cuentas
   */
  async reconstruirEstadoLote(loteId: string, fecha?: string): Promise<any> {
    const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    const res = await fetch(`${BASE_URL}/api/v1/auditoria/lotes/${loteId}/trazabilidad${qs}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      handleUnauthorized(res);
      throw new ApiError(await res.json().catch(() => ({})));
    }
    return res.json();
  }
};
