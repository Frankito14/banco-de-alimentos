import React, { useEffect, useState } from 'react';
import { Entrega } from '../types';
import { api } from '../services/api';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Search
} from 'lucide-react';

export const EntregasPage: React.FC = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'PENDIENTE' | 'ENTREGADO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getEntregas();
        setEntregas(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredEntregas = entregas.filter((e) => {
    const matchesEstado = filterEstado === 'TODOS' || e.estado === filterEstado;
    const matchesSearch =
      e.comedorNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEstado && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            Control de Movimientos e Historial
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Historial Consolidado de Entregas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro auditable e inmutable para el Tribunal de Cuentas y Ministerio Provincial.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por comedor, ID o voluntario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600 font-semibold">Estado:</span>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
          >
            <option value="TODOS">Todos ({entregas.length})</option>
            <option value="PENDIENTE">
              Pendientes ({entregas.filter((e) => e.estado === 'PENDIENTE').length})
            </option>
            <option value="ENTREGADO">
              Entregados ({entregas.filter((e) => e.estado === 'ENTREGADO').length})
            </option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Cargando registros...</div>
      ) : filteredEntregas.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No se encontraron entregas con el criterio seleccionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntregas.map((entrega) => (
            <div
              key={entrega.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      entrega.estado === 'ENTREGADO'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {entrega.estado === 'ENTREGADO' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-600">
                        #{entrega.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          entrega.estado === 'ENTREGADO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entrega.estado}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {entrega.comedorNombre}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{entrega.depositoNombre}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(entrega.fechaCreacion).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Lotes Despachados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {entrega.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                    >
                      <span>{it.alimento}:</span>
                      <strong className="text-emerald-700">
                        {it.cantidad} {it.unidadMedida}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({it.codigoLote})
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
                <span>Registrado por: <strong>{entrega.createdBy}</strong></span>
                {entrega.estado === 'ENTREGADO' && (
                  <span className="text-emerald-700 font-semibold">
                    ✅ Recepción confirmada el {entrega.fechaRecepcion} {entrega.horarioRecepcion}hs
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
