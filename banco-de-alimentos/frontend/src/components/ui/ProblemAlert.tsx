import React from 'react';
import { ProblemDetails } from '../../types';
import { AlertTriangle, X } from 'lucide-react';

interface ProblemAlertProps {
  problem: ProblemDetails | null;
  onDismiss?: () => void;
}

export const ProblemAlert: React.FC<ProblemAlertProps> = ({ problem, onDismiss }) => {
  if (!problem) return null;

  const title = problem.title || 'No se pudo completar la acción';
  const detail =
    problem.detail || 'Ocurrió un inconveniente al procesar tu solicitud. Intentá nuevamente.';

  return (
    <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm relative animate-fadeIn">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-rose-900 mb-0.5">{title}</h4>
          <p className="text-xs text-rose-800 leading-relaxed">{detail}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-700 p-1 rounded transition"
            aria-label="Cerrar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
