import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Entrega, Lote } from '../types';
import { api } from '../services/api';
import {
  Truck,
  CheckCircle2,
  Package,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  AlertCircle
} from 'lucide-react';

export const InicioPage: React.FC = () => {
  const { usuario } = useAuth();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [allEntregas, allLotes] = await Promise.all([
          api.getEntregas(),
          api.getStock('dep-hurlingham')
        ]);
        setEntregas(allEntregas);
        setLotes(allLotes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!usuario) return null;

  const pendientes = entregas.filter((e) => e.estado === 'PENDIENTE');
  const entregadas = entregas.filter((e) => e.estado === 'ENTREGADO');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bienvenido, {usuario.nombre}
            </h1>
            <p className="text-emerald-100 text-sm mt-1">
              Plataforma Centralizada de Gestión de Donaciones y Trazabilidad de Alimentos
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-4 border border-white/15 flex items-center gap-4">
            <Building className="w-8 h-8 text-emerald-300" />
            <div className="text-sm">
              <p className="text-emerald-200 text-xs font-medium">Asignación Operativa</p>
              <p className="font-bold">
                {usuario.rol === 'Voluntario'
                  ? 'Depósito Regional N° 1 (Hurlingham)'
                  : usuario.rol === 'ReferenteComedor'
                  ? 'Comedor Rayito de Sol (Padrón #102)'
                  : 'Sede Central Ministerio'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lotes en Depósito
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{lotes.length}</p>
          <p className="text-xs text-slate-500 mt-1">Lotes auditables con stock vigente</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Entregas Pendientes
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{pendientes.length}</p>
          <p className="text-xs text-slate-500 mt-1">En viaje o aguardando recepción física</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              Entregas Confirmadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{entregadas.length}</p>
          <p className="text-xs text-slate-500 mt-1">Conformidad firmada y auditada</p>
        </div>
      </div>

      {/* Role-Specific Action Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Acciones Principales según tu Rol</span>
        </h2>

        {usuario.rol === 'Voluntario' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/registrar-entrega"
              className="p-5 rounded-xl border-2 border-emerald-500/30 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50 transition flex items-start gap-4 group"
            >
              <div className="p-3 bg-emerald-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  Registrar Nueva Entrega a Comedor
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Caso de uso principal: Seleccionar comedor del padrón habilitado y armar el lote de alimentos a despachar.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 mt-3">
                  Ir al formulario <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </span>
              </div>
            </Link>

            <Link
              to="/entregas"
              className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition flex items-start gap-4 group"
            >
              <div className="p-3 bg-slate-800 text-white rounded-lg shadow-sm group-hover:scale-105 transition">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Historial de Despachos</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Consulta las entregas registradas desde el depósito y su estado de recepción en destino.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 mt-3">
                  Ver entregas <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </span>
              </div>
            </Link>
          </div>
        )}

        {usuario.rol === 'ReferenteComedor' && (
          <div className="p-6 rounded-xl border-2 border-amber-500/40 bg-amber-50/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-lg shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmación de Recepción Física en Comedor
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Revisá la mercadería recibida por el transportista e ingresá la confirmación de conformidad para cerrar el circuito.
                </p>
                {pendientes.length > 0 && (
                  <p className="text-xs font-bold text-amber-700 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Tenés {pendientes.length} entrega(s) pendiente(s) de confirmación.
                  </p>
                )}
              </div>
            </div>
            <Link
              to="/pedidos"
              className="whitespace-nowrap px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
            >
              <span>Ir a Mis Pedidos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {usuario.rol === 'Coordinador' && (
          <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Supervisión y Rendición de Cuentas (Tribunal de Cuentas)
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Visualización consolidada de 15 depósitos y 900 comedores provinciales.
              </p>
            </div>
            <Link
              to="/entregas"
              className="whitespace-nowrap px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
              <span>Ver Consolidado</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Últimos Movimientos de Entregas</h2>
          <span className="text-xs text-slate-500">Actualizado en tiempo real</span>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500">Cargando...</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {entregas.slice(0, 4).map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">{e.comedorNombre}</p>
                  <p className="text-xs text-slate-500">
                    {e.items.map((i) => `${i.alimento} (${i.cantidad} ${i.unidadMedida})`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      e.estado === 'ENTREGADO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {e.estado}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(e.fechaCreacion).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
