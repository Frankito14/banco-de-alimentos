# Backend API · Banco de Alimentos Provincial

Núcleo de servicios REST desarrollado con **NestJS**, arquitectura hexagonal (Puertos y Adaptadores), persistencia transaccional en **PostgreSQL**, caché resiliente en **Redis**, mensajería asíncrona con **RabbitMQ** y autenticación federada en **Keycloak (OIDC)**.

---

## 🏛️ Arquitectura y Estructura de Módulos

El backend se organiza en módulos de dominio desacoplados, permitiendo el trabajo simultáneo de múltiples equipos:

```
src/
├── auth/                 # Autenticación delegada en Keycloak (OIDC / Direct Access Grants)
│   ├── dto/              # LoginRequestDto, UsuarioPerfilResponseDto
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── interfaces/       # OidcJwtPayload, Rol
│   ├── auth.service.ts   # Delegación ROPC a Keycloak IdP
│   ├── jwt.strategy.ts   # Validación RS256 con claves JWKS públicas
│   └── auth.controller.ts# POST /auth/login, GET /usuarios/me, GET /.well-known/openid-configuration
│
├── distribucion/         # Caso de uso principal: Despacho y confirmación de entregas
│   ├── application/      # Casos de uso (RegistrarEntrega, ConfirmarEntrega) y Puertos
│   ├── domain/           # Entidades (Entrega, Lote, Deposito) y Reglas de Negocio
│   ├── infrastructure/   # Adaptador PostgreSQL y publicador de eventos RabbitMQ
│   └── presentation/     # EntregasController, DepositosController
│
├── auditoria/            # Exigencia NFR: Tribunal de Cuentas e Inmutabilidad
│   ├── auditoria.service.ts    # Reconstrucción matemática de saldos pasados
│   ├── auditoria.controller.ts # GET /auditoria/lotes/:id/trazabilidad, GET /reportes/entregas/csv
│   └── auditoria.module.ts
│
├── comedores/            # Consulta de comedores consolidando base local y padrón
│   ├── comedores.service.ts
│   └── comedores.controller.ts
│
├── padron-provincial/    # Integración con sistema externo del Padrón (Haskell)
│   ├── application/      # SincronizarPadronUseCase, ConsultarComedoresHabilitadosUseCase
│   ├── domain/           # Puertos (PadronProvincialPort, PadronCachePort)
│   └── infrastructure/   # Adaptador HTTP con reintentos, Adaptador Redis y Cron horario
│
├── rendicion-cuentas/    # Rendición nocturna en lotes al Ministerio (Prolog)
│   ├── infrastructure/   # EnvioNocturnoCron (02:00 AM), RendicionCuentasHttpClient
│   └── rendicion-cuentas.service.ts # Consumo batch desde cola RabbitMQ
│
└── common/               # Módulos transversales de infraestructura
    ├── database/         # Pool PostgreSQL, migración y seeds automáticos
    ├── redis/            # Cliente global ioredis (REDIS_CLIENT)
    └── messaging/        # Conexión RabbitMQ y exchanges/colas declaradas
```

---

## 🔐 Seguridad: Autenticación y Autorización

* **Sin tablas de usuarios:** La base de datos `banco_alimentos_db` no almacena contraseñas ni usuarios.
* **Firma Asimétrica RS256:** Los tokens son emitidos por Keycloak y validados en el backend descargando las claves públicas mediante `jwks-rsa` desde:
  `http://keycloak:8080/realms/banco-de-alimentos/protocol/openid-connect/certs`.
* **Roles RBAC:**
  * `@Roles('Voluntario')`: Despacha entregas desde su depósito.
  * `@Roles('ReferenteComedor')`: Confirma la recepción física de su comedor.
  * `@Roles('Coordinador')`: Acceso a reportes CSV y auditoría de lotes.
* **Aislamiento Multi-Tenant:** El referente solo puede consultar y confirmar entregas asociadas a su `comedorAsignadoId`.

---

## 📡 Endpoints Principales

### Autenticación e Identidad
* `POST /api/v1/auth/login`: Autenticación delegada en Keycloak.
* `GET /api/v1/usuarios/me`: Perfil y atributos territoriales del usuario autenticado.
* `GET /.well-known/openid-configuration`: Metadatos OpenID Connect Discovery 1.0.

### Distribución de Alimentos
* `POST /api/v1/entregas`: Registra un despacho de alimentos descontando stock del lote.
* `GET /api/v1/entregas`: Lista entregas (con aislamiento automático para referentes).
* `GET /api/v1/entregas/:id`: Detalle y trazabilidad de una entrega.
* `PATCH /api/v1/entregas/:id/recepcion`: Confirmación física de recepción conforme.

### Depósitos e Inventario
* `GET /api/v1/depositos`: Lista de depósitos regionales.
* `GET /api/v1/depositos/:id/stock`: Stock actual de lotes por depósito con vencimientos.
* `GET /api/v1/comedores`: Lista de comedores certificados por el Padrón Provincial.

### Auditoría y Tribunal de Cuentas (NFR Estrella)
* `GET /api/v1/auditoria/lotes`: Lista de lotes para inspección y auditoría.
* `GET /api/v1/auditoria/lotes/:loteId/trazabilidad?fecha=YYYY-MM-DD`: Reconstruye el saldo exacto y la línea de tiempo inmutable del lote a una fecha de corte pasada.
* `GET /api/v1/auditoria/reportes/entregas/csv`: Exportación del libro de entregas en formato CSV para el Tribunal de Cuentas.

---

## ⚙️ Variables de Entorno

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto HTTP del backend |
| `DB_HOST` | `db` (o `localhost`) | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | `banco_alimentos_db` | Nombre de la base de datos |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `postgres` | Credenciales de base de datos |
| `KEYCLOAK_URL` | `http://localhost:8080` | URL pública de Keycloak |
| `KEYCLOAK_INTERNAL_URL` | `http://keycloak:8080` | URL interna dentro de Docker |
| `KEYCLOAK_REALM` | `banco-de-alimentos` | Realm de Keycloak |
| `KEYCLOAK_CLIENT_ID` | `banco-alimentos-client`| Cliente público OIDC |
| `REDIS_URL` | `redis://redis:6379` | URL de conexión de Redis |
| `RABBITMQ_URL` | `amqp://banco:cambiar@rabbitmq:5672` | Conexión AMQP RabbitMQ |
| `PADRON_PROVINCIAL_URL`| `http://padron-provincial:6767` | URL del mock de Padrón (Haskell) |
| `RENDICION_CUENTAS_URL`| `http://rendicion-cuentas:7777` | URL del mock de Rendición (Prolog) |

---

## 🛠️ Comandos de Desarrollo Local (sin Docker)

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar TypeScript
npm run build

# 3. Iniciar en modo desarrollo
npm run start:dev

# 4. Ejecutar pruebas unitarias
npm run test
```
