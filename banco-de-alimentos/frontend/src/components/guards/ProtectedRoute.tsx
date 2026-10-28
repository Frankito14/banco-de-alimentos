import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Rol } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Rol[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { usuario, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Verificando credenciales OIDC...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-6 bg-white border border-rose-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 text-rose-600 mb-3">
          <ShieldAlert className="w-8 h-8" />
          <h2 className="text-xl font-bold">403 Acceso Denegado (RFC 7807)</h2>
        </div>
        <p className="text-slate-600 mb-4">
          Tu rol actual (<strong>{usuario.rol}</strong>) no posee los permisos requeridos para acceder a esta funcionalidad.
        </p>
        <div className="bg-rose-50 p-4 rounded-lg text-xs font-mono text-rose-800 mb-6">
          <p><strong>title:</strong> Permisos insuficientes</p>
          <p><strong>status:</strong> 403 Forbidden</p>
          <p><strong>detail:</strong> Se requiere uno de los siguientes roles: [{allowedRoles.join(', ')}]</p>
        </div>
        <Link
          to="/inicio"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Inicio
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
