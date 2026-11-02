import React from 'react';
import { ProblemDetails } from '../../types';
import { AlertTriangle, X } from 'lucide-react';

interface ProblemAlertProps {
  problem: ProblemDetails | null;
  onDismiss?: () => void;
}

export const ProblemAlert: React.FC<ProblemAlertProps> = ({ problem, onDismiss }) => {
  if (!problem) return null;

  return (
    <div className="mb-6 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 shadow-sm relative animate-fadeIn">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-200 text-rose-800">
              Error {problem.status}
            </span>
            <h4 className="font-semibold text-sm">{problem.title}</h4>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">{problem.detail}</p>
          {problem.instance && (
            <p className="text-[10px] text-rose-500 font-mono mt-1">Instance: {problem.instance}</p>
          )}
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
