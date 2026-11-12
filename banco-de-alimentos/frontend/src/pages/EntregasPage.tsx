import React, { useEffect, useState } from 'react';
import { Entrega } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  Search,
  Download,
  History,
  ShieldCheck,
  X,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  FileText
} from 'lucide-react';

export const EntregasPage: React.FC = () => {
  const { usuario } = useAuth();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'PENDIENTE' | 'ENTREGADO'>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Estado para el Modal de Reconstrucción Histórica del Tribunal de Cuentas
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [lotesAuditables, setLotesAuditables] = useState<any[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState('');
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().slice(0, 10));
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

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

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.descargarReporteCsv();
    } catch (err) {
      alert('Error al generar el reporte CSV para el Tribunal de Cuentas.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenAuditModal = async () => {
    setShowAuditModal(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const lotes = await api.getLotesAuditoria();
      setLotesAuditables(lotes);
      if (lotes.length > 0 && !selectedLoteId) {
        setSelectedLoteId(lotes[0].id);
      }
    } catch (err) {
      console.error(err);
      setAuditError('No se pudieron cargar los lotes para auditoría.');
    }
  };

  const handleRunReconstruccion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLoteId) return;

    setAuditLoading(true);
    setAuditError(null);
    try {
      // Enviar con hora 23:59:59 para incluir todo el día seleccionado
      const fechaParam = fechaCorte ? `${fechaCorte}T23:59:59` : undefined;
      const res = await api.reconstruirEstadoLote(selectedLoteId, fechaParam);
      setAuditResult(res);
    } catch (err: any) {
      setAuditError(err.message || 'Error al reconstruir el estado histórico del lote.');
    } finally {
      setAuditLoading(false);
    }
  };

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

        {/* Botones de Acción para Coordinador y Voluntarios */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenAuditModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition shadow-xs"
          >
            <History className="w-4 h-4 text-indigo-600" />
            Reconstruir Lote (Tribunal de Cuentas)
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-xs disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Exportar Reporte (CSV)
          </button>
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

      {/* Modal de Reconstrucción Histórica del Tribunal de Cuentas */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Reconstrucción Histórica de Lotes · Tribunal de Cuentas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inspección temporal de saldos inmutables y movimientos a cualquier fecha pasada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario de Consulta Temporal */}
            <form onSubmit={handleRunReconstruccion} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Lote a Auditar:
                </label>
                <select
                  value={selectedLoteId}
                  onChange={(e) => setSelectedLoteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {lotesAuditables.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.codigoLote} - {l.alimento} ({l.depositoNombre})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Fecha de Corte Histórica:
                </label>
                <input
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={auditLoading}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {auditLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <History className="w-4 h-4" />
                  )}
                  Reconstruir Estado
                </button>
              </div>
            </form>

            {auditError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 mb-4">
                {auditError}
              </div>
            )}

            {/* Resultado de la Auditoría */}
            {auditResult && (
              <div className="mt-4 space-y-4">
                {/* Cabecera del Dictamen */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase">
                        {auditResult.tribunalDeCuentas.expedienteAuditoria}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        {auditResult.lote.alimento} ({auditResult.lote.codigoLote})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Depósito: {auditResult.lote.depositoNombre} · Vence: {auditResult.lote.fechaVencimiento}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {auditResult.tribunalDeCuentas.dictamen}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Corte al: {new Date(auditResult.tribunalDeCuentas.fechaCorteHistorica).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Resumen de Stock Reconstruido */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Ingreso Inicial</p>
                      <p className="text-sm font-bold text-slate-800">
                        {auditResult.lote.cantidadInicial} {auditResult.lote.unidadMedida}
                      </p>
                    </div>
                    <div className="p-2 bg-indigo-50/70 rounded-lg border border-indigo-100">
                      <p className="text-[10px] text-indigo-700 uppercase font-bold">Saldo a la Fecha de Corte</p>
                      <p className="text-sm font-extrabold text-indigo-900">
                        {auditResult.lote.stockReconstruidoACorte} {auditResult.lote.unidadMedida}
                      </p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Stock Actual Sistema</p>
                      <p className="text-sm font-bold text-slate-800">
                        {auditResult.lote.stockActualSistema} {auditResult.lote.unidadMedida}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Línea de tiempo inmutable de movimientos */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Línea de Tiempo Inmutable de Movimientos:
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {auditResult.movimientosHistoricos.map((mov: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                              mov.tipo === 'INGRESO_DONACION'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {mov.tipo === 'INGRESO_DONACION' ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {mov.tipo === 'INGRESO_DONACION' ? 'Ingreso Donación' : 'Despacho a Comedor'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {mov.destinoUOrigen} · {new Date(mov.fecha).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`font-mono font-bold ${
                              mov.tipo === 'INGRESO_DONACION' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {mov.tipo === 'INGRESO_DONACION' ? `+${mov.cantidad}` : `-${mov.cantidad}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Saldo: {mov.saldoResultante}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
