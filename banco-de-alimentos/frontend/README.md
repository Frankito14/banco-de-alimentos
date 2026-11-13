# Frontend SPA · Banco de Alimentos Provincial

Aplicación web Single Page Application (SPA) desarrollada con **React 18**, **TypeScript**, **Vite** y **Tailwind CSS**. Implementa el flujo de trabajo operativo según los roles del dominio, el control de acceso basado en rutas y la visualización de auditoría para el Tribunal de Cuentas.

---

## 🎨 Características Principales

* **Inicio Limpio y Seguro:** La aplicación arranca siempre en la pantalla de inicio de sesión (`/login`).
* **Validación Proactiva de Sesión OIDC:** Al iniciar, [AuthContext.tsx](src/context/AuthContext.tsx) verifica la validez del token JWT contra el backend. Si el token expiró o los contenedores se reiniciaron, purga el almacenamiento y evita errores 401 en cascada.
* **Interceptor Automático de Errores 401:** Si cualquier petición a la API es rechazada por credenciales inválidas, el cliente cierra la sesión y redirige inmediatamente al login.
* **Acceso Rápido para Demostración (1 Clic):** Botones en el login para alternar instantáneamente entre los roles evaluados por la cátedra (Voluntario, Referente de Comedor y Coordinador).
* **Módulo de Auditoría y Trazabilidad:** Modal interactivo para que el Tribunal de Cuentas reconstruya el saldo de un lote a cualquier fecha del pasado.
* **Exportación de Reportes:** Descarga con 1 clic de archivos CSV formateados para Excel en español con BOM UTF-8.

---

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── guards/
│   │   └── ProtectedRoute.tsx   # Guard de rutas protegidas por rol (RBAC / RFC 7807 403 Forbidden)
│   ├── layout/
│   │   └── Navbar.tsx           # Barra de navegación adaptativa según el rol activo
│   └── ui/
│       └── ProblemAlert.tsx     # Renderizado estándar de errores RFC 7807 (ProblemDetails)
│
├── context/
│   └── AuthContext.tsx          # Gestión de sesión, estado de autenticación y auto-logout
│
├── pages/
│   ├── LoginPage.tsx            # Pantalla de acceso OIDC y botones de demo rápido
│   ├── InicioPage.tsx           # Dashboard operativo con métricas clave y accesos directos
│   ├── RegistrarEntregaPage.tsx # Caso de uso: Voluntario registra despacho y descuenta stock
│   ├── PedidosPage.tsx          # Caso de uso: Referente confirma recepción física (Multi-tenant)
│   └── EntregasPage.tsx         # Historial, Exportación CSV y Reconstrucción Histórica
│
├── services/
│   └── api.ts                  # Cliente HTTP directo al backend (sin mocks ni fallbacks locales)
│
└── types/
    └── index.ts                 # Definición de interfaces TypeScript del dominio
```

---

## 🗺️ Vistas y Permisos por Rol

| Ruta | Nombre de la Vista | Roles Permitidos | Funcionalidad |
| :--- | :--- | :---: | :--- |
| `/login` | Iniciar Sesión | Público | Autenticación delegada en Keycloak con selección rápida. |
| `/inicio` | Tablero Principal | Todos los roles | Resumen de actividad y estado operativo. |
| `/registrar-entrega` | Despacho de Lotes | `Voluntario` | Selección de comedor habilitado y lotes para despacho. |
| `/pedidos` | Recepción de Alimentos | `ReferenteComedor` | Confirmación conforme de pedidos de su comedor asignado. |
| `/entregas` | Historial Consolidado | `Voluntario`, `Coordinador` | Listado auditable, exportación CSV y reconstrucción de lotes. |

---

## ⚙️ Configuración y Variables de Entorno

Crear un archivo `.env` en la raíz de `frontend/` (o configurado vía Docker Compose):

```ini
# URL base de la API REST del Backend
VITE_API_URL=http://localhost:3000
```

---

## 🛠️ Comandos de Desarrollo Local (sin Docker)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo con Vite (HMR)
npm run dev

# 3. Compilar para producción (typecheck + bundle optimizado)
npm run build

# 4. Previsualizar el build de producción localmente
npm run preview
```
El servidor de desarrollo iniciará por defecto en [http://localhost:5173](http://localhost:5173).
