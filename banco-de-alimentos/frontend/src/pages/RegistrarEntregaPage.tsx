import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Comedor, Lote, ProblemDetails, ItemEntregaRequest } from '../types';
import { api, ApiError } from '../services/api';
import { ProblemAlert } from '../components/ui/ProblemAlert';
import {
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';

export const RegistrarEntregaPage: React.FC = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [comedores, setComedores] = useState<Comedor[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedComedorId, setSelectedComedorId] = useState<string>('');
  const [cartItems, setCartItems] = useState<{ loteId: string; cantidad: number }[]>([]);
  const [observaciones, setObservaciones] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadFormDependencies() {
      try {
        const [comedoresData, lotesData] = await Promise.all([
          api.getComedores(),
          api.getStock(usuario?.depositoAsignadoId || 'dep-hurlingham')
        ]);
        setComedores(comedoresData);
        setLotes(lotesData);

        // Preseleccionar el primer comedor habilitado
        const firstEnabled = comedoresData.find((c) => c.habilitado);
        if (firstEnabled) setSelectedComedorId(firstEnabled.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFormDependencies();
  }, [usuario]);

  const selectedComedor = comedores.find((c) => c.id === selectedComedorId);

  // Manejo del carrito de lotes
  const handleAddOrIncrement = (lote: Lote) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.loteId === lote.id);
      if (existing) {
        if (existing.cantidad >= lote.stockDisponible) return prev;
        return prev.map((i) =>
          i.loteId === lote.id ? { ...i, cantidad: i.cantidad + 10 } : i
        );
      }
      return [...prev, { loteId: lote.id, cantidad: Math.min(10, lote.stockDisponible) }];
    });
  };

  const handleDecrement = (loteId: string) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.loteId === loteId ? { ...i, cantidad: i.cantidad - 10 } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const handleRemove = (loteId: string) => {
    setCartItems((prev) => prev.filter((i) => i.loteId !== loteId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;
    setProblem(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const itemsPayload: ItemEntregaRequest[] = cartItems.map((ci) => ({
        loteId: ci.loteId,
        cantidad: ci.cantidad
      }));

      await api.registrarEntrega({
        depositoId: usuario.depositoAsignadoId || 'dep-hurlingham',
        comedorId: selectedComedorId,
        items: itemsPayload,
        observaciones,
        currentUser: usuario
      });

      setSuccessMsg('¡Entrega registrada con éxito! El estado inicial es PENDIENTE.');
      setCartItems([]);
      setTimeout(() => {
        navigate('/entregas');
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        setProblem(err.problem);
      } else {
        setProblem({
          status: 500,
          title: 'Error Inesperado',
          detail: 'No se pudo completar el registro de la entrega.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500">
        Cargando catálogo de lotes y padrón provincial...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
          <Truck className="w-4 h-4" />
          Operaciones de Depósito · Despacho de Lotes
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Registrar Nueva Entrega a Comedor
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Asigna alimentos descontando stock por lote y verifica la habilitación en el padrón provincial.
        </p>
      </div>

      <ProblemAlert problem={problem} onDismiss={() => setProblem(null)} />

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Selección de Comedor y Catálogo de Lotes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Paso 1: Selección de Comedor */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                1
              </span>
              Comedor Destino (Padrón Provincial)
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seleccionar Comedor Habilitado:
              </label>
              <select
                value={selectedComedorId}
                onChange={(e) => setSelectedComedorId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              >
                {comedores.map((comedor) => (
                  <option key={comedor.id} value={comedor.id}>
                    {comedor.nombre} ({comedor.partido}) - {comedor.habilitado ? '✅ Habilitado' : '❌ Inhabilitado'}
                  </option>
                ))}
              </select>

              {selectedComedor && (
                <div
                  className={`mt-3 p-3 rounded-lg border text-xs flex items-center justify-between ${
                    selectedComedor.habilitado
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">{selectedComedor.nombre}</p>
                      <p className="text-[11px] opacity-80">
                        Responsable: {selectedComedor.responsable} · {selectedComedor.direccion}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedComedor.habilitado
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-rose-200 text-rose-800'
                    }`}
                  >
                    {selectedComedor.habilitado ? 'PADRÓN VERIFICADO' : 'INHABILITADO'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Paso 2: Catálogo de Alimentos / Lotes ("Tipo McDonald's") */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                2
              </span>
              Selección de Alimentos por Lote (Stock Disponible)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lotes.map((lote) => {
                const inCart = cartItems.find((i) => i.loteId === lote.id);
                const isOutOfStock = lote.stockDisponible <= 0;

                return (
                  <div
                    key={lote.id}
                    className={`p-4 rounded-xl border transition ${
                      inCart
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : isOutOfStock
                        ? 'border-slate-200 bg-slate-100 opacity-60'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {lote.codigoLote}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          isOutOfStock ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        Stock: {lote.stockDisponible} {lote.unidadMedida}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {lote.alimento}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Vence: {lote.fechaVencimiento}
                    </p>
                    <p className="text-[10px] text-slate-400">Origen: {lote.donanteOrigen}</p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {inCart ? (
                        <div className="flex items-center gap-2 w-full justify-between">
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleDecrement(lote.id)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-900">
                              {inCart.cantidad}
                            </span>
                            <button
                              type="button"
                              disabled={inCart.cantidad >= lote.stockDisponible}
                              onClick={() => handleAddOrIncrement(lote)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(lote.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddOrIncrement(lote)}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {isOutOfStock ? 'Sin Stock' : 'Agregar al Despacho'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Resumen del Pedido / Carrito y Confirmación */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs sticky top-24">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              Resumen del Despacho
            </h2>

            {cartItems.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No agregaste ningún alimento todavía.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hacé clic en los lotes disponibles para sumar al envío.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => {
                  const lote = lotes.find((l) => l.id === item.loteId);
                  if (!lote) return null;
                  return (
                    <div
                      key={item.loteId}
                      className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{lote.alimento}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Lote: {lote.codigoLote}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-700">
                          {item.cantidad} {lote.unidadMedida}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observaciones / N° Camión:
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Despacho matutino, chofer Juan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirmar y Enviar Entrega</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Genera registro con estado <strong className="text-amber-600">PENDIENTE</strong> y descuenta stock inmediatamente.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
