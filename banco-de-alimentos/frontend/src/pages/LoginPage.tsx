import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rol, ProblemDetails } from '../types';
import { ProblemAlert } from '../components/ui/ProblemAlert';
import { ApiError } from '../services/api';
import { ShieldCheck, ArrowRight, UserCheck, KeyRound, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('voluntario@bancodealimentos.gob.ar');
  const [password, setPassword] = useState('PasswordSegura123!');
  const [isLoading, setIsLoading] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProblem(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/inicio');
    } catch (err) {
      if (err instanceof ApiError) {
        setProblem(err.problem);
      } else {
        setProblem({
          status: 500,
          title: 'Error de conexión',
          detail: 'No se pudo comunicar con el proveedor de identidad OIDC.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: Rol) => {
    setProblem(null);
    setIsLoading(true);
    try {
      await login('', '', role);
      navigate('/inicio');
    } catch (err) {
      if (err instanceof ApiError) setProblem(err.problem);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white shadow-lg mb-4">
          <Building2 className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Banco de Alimentos
        </h2>
        <p className="mt-2 text-sm text-emerald-200">
          Red Provincial de Distribución · Escenario 1B
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Autenticación OIDC / OAuth 2.0 (RFC 7807)
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Acceso federado por roles según padrón provincial.
            </p>
          </div>

          <ProblemAlert problem={problem} onDismiss={() => setProblem(null)} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Correo Electrónico (Identidad OIDC)
              </label>
              <div className="mt-1 relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  placeholder="usuario@gob.ar"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Selector Rápido para la Exposición y Demo con el Jurado */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-3">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Acceso Rápido para Demo (1 Clic):</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Voluntario')}
                className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Vol Untario (Voluntario)</p>
                  <p className="text-[11px] text-slate-500">Depósito N° 1 Hurlingham · Registra entregas</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ReferenteComedor')}
                className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Refe Rente (Referente)</p>
                  <p className="text-[11px] text-slate-500">Comedor Rayito de Sol · Confirma recepción física</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Coordinador')}
                className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">Cor Dinador (Coordinador)</p>
                  <p className="text-[11px] text-slate-500">Ministerio · Supervisión provincial</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
