import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './pages/LoginPage';
import { InicioPage } from './pages/InicioPage';
import { RegistrarEntregaPage } from './pages/RegistrarEntregaPage';
import { PedidosPage } from './pages/PedidosPage';
import { EntregasPage } from './pages/EntregasPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Ruta Pública */}
              <Route path="/login" element={<LoginPage />} />

              {/* Rutas Protegidas */}
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <InicioPage />
                  </ProtectedRoute>
                }
              />

              {/* Caso de Uso: Voluntario registra entrega */}
              <Route
                path="/registrar-entrega"
                element={
                  <ProtectedRoute allowedRoles={['Voluntario']}>
                    <RegistrarEntregaPage />
                  </ProtectedRoute>
                }
              />

              {/* Caso de Uso: Referente confirma entrega */}
              <Route
                path="/pedidos"
                element={
                  <ProtectedRoute allowedRoles={['ReferenteComedor']}>
                    <PedidosPage />
                  </ProtectedRoute>
                }
              />

              {/* Historial de Entregas (Voluntario y Coordinador) */}
              <Route
                path="/entregas"
                element={
                  <ProtectedRoute allowedRoles={['Voluntario', 'Coordinador']}>
                    <EntregasPage />
                  </ProtectedRoute>
                }
              />

              {/* Redirección por defecto */}
              <Route path="/" element={<Navigate to="/inicio" replace />} />
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
