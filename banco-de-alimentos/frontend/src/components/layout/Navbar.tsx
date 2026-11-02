import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Rol } from '../../types';
import {
  Package,
  Truck,
  CheckCircle2,
  LogOut,
  UserCheck,
  Building2,
  RefreshCw,
  Home
} from 'lucide-react';
import { api } from '../../services/api';

export const Navbar: React.FC = () => {
  const { usuario, logout, switchDemoRole } = useAuth();
  const location = useLocation();

  if (!usuario) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/inicio" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                BA
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-tight">Banco de Alimentos</h1>
                <p className="text-xs text-slate-500">Trazabilidad & Distribución</p>
              </div>
            </Link>

            {/* Navigation Links according to Role */}
            <nav className="hidden md:flex space-x-1">
              <Link
                to="/inicio"
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive('/inicio')
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Home className="w-4 h-4" />
                Inicio
              </Link>

              {usuario.rol === 'Voluntario' && (
                <>
                  <Link
                    to="/registrar-entrega"
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/registrar-entrega')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                    Registrar Entrega
                  </Link>
                  <Link
                    to="/entregas"
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive('/entregas')
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Historial Entregas
                  </Link>
                </>
              )}

              {usuario.rol === 'ReferenteComedor' && (
                <Link
                  to="/pedidos"
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('/pedidos')
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mis Pedidos / Recepción
                </Link>
              )}

              {usuario.rol === 'Coordinador' && (
                <Link
                  to="/entregas"
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive('/entregas')
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Consolidado Entregas
                </Link>
              )}
            </nav>
          </div>

          {/* Right side: User Profile, Role Quick Switcher & Logout */}
          <div className="flex items-center gap-4">
            {/* User Info Badge */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-900 leading-none">{usuario.nombre}</p>
                <span className="inline-block mt-0.5 text-[10px] font-medium px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {usuario.rol}
                </span>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión OIDC"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
