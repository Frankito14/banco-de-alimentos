import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Entrega, ProblemDetails } from '../types';
import { api, ApiError } from '../services/api';
import { ProblemAlert } from '../components/ui/ProblemAlert';
import {
  CheckCircle2,
  Clock,
  Package,
  Calendar,
  AlertCircle,
  Truck,
  FileCheck
} from 'lucide-react';

export const PedidosPage: React.FC = () => {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal de confirmación
  const [selectedForConfirm, setSelectedForConfirm] = useState<Entrega | null>(null);
  const [conformidadNotes, setConformidadNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadPedidos();
  }, [usuario]);

  async function loadPedidos() {
    setLoading(true);
    try {
      // Filtrar pedidos dirigidos a este comedor si tiene comedorAsignadoId
      const data = await api.getEntregas({
        comedorId: usuario?.comedorAsignadoId || undefined
      });
      setPedidos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleConfirmEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForConfirm || !usuario) return;

    setProblem(null);
    setActionSuccess(null);
    setConfirming(true);

    try {
      await api.confirmarRecepcion(selectedForConfirm.id, {
        conformidad: true,
        observaciones: conformidadNotes || 'Recepción conforme en comedor físico',
        recibidoPor: usuario.nombre
      });

      setActionSuccess(
        `¡Recepción de entrega #${selectedForConfirm.id} confirmada exitosamente! Se notificó al sistema de rendición.`
      );
      setSelectedForConfirm(null);
      setConformidadNotes('');
      await loadPedidos();
    } catch (err) {
      if (err instanceof ApiError) {
        setProblem(err.problem);
      } else {
        setProblem({
          status: 500,
          title: 'Error al confirmar',
          detail: 'No se pudo registrar la confirmación de la entrega.'
        });
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
          <CheckCircle2 className="w-4 h-4" />
          Recepción en Comedores Comunitarios
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Mis Pedidos y Entregas Recibidas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Confirma la recepción física de la mercadería enviada por los depósitos regionales para cerrar la trazabilidad.
        </p>
      </div>

      <ProblemAlert problem={problem} onDismiss={() => setProblem(null)} />

      {actionSuccess && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold">{actionSuccess}</p>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">Cargando pedidos del comedor...</div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No hay entregas registradas</h3>
          <p className="text-xs text-slate-500 mt-1">
            Cuando un voluntario despache un lote hacia este comedor, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((entrega) => (
            <div
              key={entrega.id}
              className={`bg-white rounded-2xl border p-6 transition shadow-xs ${
                entrega.estado === 'PENDIENTE'
                  ? 'border-amber-300 ring-2 ring-amber-500/10'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
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
                      <span className="text-xs font-mono font-bold text-slate-500">
                        ID: {entrega.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span>{entrega.depositoNombre}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(entrega.fechaCreacion).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Items Despachados */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Alimentos incluidos en el lote:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {entrega.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{item.alimento}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Lote: {item.codigoLote}
                        </p>
                      </div>
                      <span className="font-extrabold text-emerald-700 bg-white px-2 py-1 rounded-md border border-slate-200">
                        {item.cantidad} {item.unidadMedida}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observaciones y Footer */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <p className="italic">
                  {entrega.observaciones ? `“${entrega.observaciones}”` : 'Sin observaciones'}
                </p>

                {entrega.estado === 'PENDIENTE' ? (
                  <button
                    onClick={() => setSelectedForConfirm(entrega)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Entrega Física</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <FileCheck className="w-4 h-4" />
                    <span>
                      Recepcionado el {entrega.fechaRecepcion} a las {entrega.horarioRecepcion} hs
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Confirmación de Entrega */}
      {selectedForConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleIn">
            <div className="flex items-center gap-3 text-emerald-700 mb-3">
              <CheckCircle2 className="w-7 h-7" />
              <h3 className="text-lg font-bold text-slate-900">
                Confirmar Recepción Conforme
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              ¿Confirmas que la mercadería del envío <strong>#{selectedForConfirm.id}</strong> fue
              recibida íntegramente en las instalaciones del comedor?
            </p>

            <form onSubmit={handleConfirmEntrega} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas de Recepción / Firma Digital:
                </label>
                <textarea
                  rows={2}
                  value={conformidadNotes}
                  onChange={(e) => setConformidadNotes(e.target.value)}
                  placeholder="Ej: Recibido en perfecto estado, temperatura adecuada..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedForConfirm(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirming}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {confirming ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Confirmar y Notificar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
