# Backend API · Banco de Alimentos Provincial

Núcleo de servicios REST desarrollado con **NestJS**, arquitectura hexagonal (Puertos y Adaptadores), persistencia transaccional e inmutable en **PostgreSQL**, caché resiliente en **Redis**, mensajería asíncrona con **RabbitMQ** y autenticación federada en **Keycloak (OIDC)**.

---

## 🏛️ Arquitectura y Estructura de Módulos

El backend se organiza en módulos de dominio desacoplados, permitiendo el trabajo simultáneo de múltiples equipos:

```
src/
├── auth/                 # Autenticación delegada en Keycloak (OIDC / Direct Access Grants)
│   ├── dto/              # LoginRequestDto, UsuarioPerfilResponseDto
│   ├── guards/           # JwtAuthGuard, RolesGuard
│   ├── interfaces/       # OidcJwtPayload, Rol
│   ├── auth.service.ts   # Delegación del login a Keycloak y acceso de demostración
│   ├── jwt.strategy.ts   # Validación RS256 con claves JWKS públicas
│   └── auth.controller.ts# Login, login de demo, perfil y OpenID Connect Discovery
│
├── distribucion/         # Caso de uso principal: Despacho y confirmación de entregas
│   ├── application/      # Casos de uso (RegistrarEntrega, ConfirmarEntrega) y Puertos
│   ├── domain/           # Entidades (Entrega, Lote, Deposito) y errores de dominio
│   ├── infrastructure/   # Adaptador PostgreSQL, repositorios en memoria y publicador RabbitMQ
│   └── presentation/     # EntregasController, DepositosController y DTOs
│
├── auditoria/            # Exigencia NFR: Tribunal de Cuentas e Inmutabilidad
│   ├── auditoria.service.ts    # Reconstrucción del stock y de la línea de tiempo de un lote
│   ├── auditoria.controller.ts # Trazabilidad de lotes y exportación CSV
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
├── inventario/           # Módulo reservado, todavía sin funcionalidad
│
└── common/               # Módulos transversales de infraestructura
    ├── database/         # Pool PostgreSQL, transacciones y script de esquema y seeds
    ├── redis/            # Cliente global ioredis (REDIS_CLIENT)
    ├── messaging/        # Conexión RabbitMQ y exchanges/colas declaradas
    ├── filters/          # Filtros globales de errores (Problem Details, RFC 7807)
    ├── auth/             # Verificador de tokens del esquema de autenticación anterior (sin uso)
    └── demo/             # Endpoints de demostración del control de acceso por rol

test/
└── trazabilidad.e2e-spec.ts  # Test de integración del NFR de Trazabilidad y Auditoría
```

---

## 🧾 Persistencia Inmutable (NFR Trazabilidad y Auditoría)

El Tribunal de Cuentas exige reconstruir el estado de cualquier lote en cualquier fecha pasada, sin que ningún registro pueda borrarse ni modificarse. Por eso, todas las operaciones se registran **agregando filas**, nunca modificándolas.

| Tabla | Qué registra |
| :--- | :--- |
| `entregas` | Cabecera de cada despacho: depósito, comedor, fecha y quién lo registró |
| `lotes_entregados` | Qué lotes y qué cantidad lleva cada entrega |
| `movimientos_stock` | Cada ingreso (`INGRESO`, positivo) y cada entrega (`ENTREGA_RESERVADA`, negativo) de un lote, con fecha y usuario |
| `historial_estado_entrega` | Cada cambio de estado de una entrega (`PENDIENTE`, `CONFIRMADO`, `CANCELADO`), con fecha, usuario y observaciones |

* **El stock no se guarda:** se calcula como la suma de los movimientos del lote (vista `v_stock_lotes`).
* **El estado de una entrega no se guarda:** es el último registro de su historial (vista `v_estado_entregas`). En la API, el estado `CONFIRMADO` se expone como `ENTREGADO`.
* **La base de datos garantiza la inmutabilidad:** un trigger rechaza cualquier `UPDATE` o `DELETE` sobre `lotes`, `entregas`, `lotes_entregados`, `movimientos_stock` e `historial_estado_entrega`, aunque la operación no venga de la aplicación.
* **Registrar una entrega es una única transacción:**
bloquea los lotes involucrados, vuelve a calcular su stock e inserta la entrega, sus renglones, los movimientos y el estado `PENDIENTE`. Si algo falla, no queda nada registrado a medias, y dos entregas simultáneas del mismo lote no pueden dejarlo con stock negativo.
* **Una entrega se confirma una sola vez:** un índice único sobre `(id_entrega, estado)` lo impide a nivel de base de datos.
* **Fechas con zona horaria:** las columnas de fecha son `TIMESTAMPTZ`, por lo que la reconstrucción a una fecha de corte es exacta.

### Esquema y datos iniciales

El esquema y los datos iniciales están en **dos archivos con el mismo SQL**:

* `db/init.sql`: lo ejecuta PostgreSQL **solo cuando la base se crea por primera vez**.
* `src/common/database/database.seed.ts`: lo ejecuta el backend **en cada arranque**. Es idempotente: crea lo que falta e inserta los datos iniciales con `ON CONFLICT DO NOTHING`.

Si se modifica uno, hay que modificar el otro.

Si la base fue creada con el esquema anterior (con la columna `lotes.stock`), el backend lo informa al arrancar y hay que recrearla desde la raíz del repositorio. Esto **borra todos los datos**:

```bash
docker compose down -v
docker compose up -d --build
```

---

## 🔐 Seguridad: Autenticación y Autorización

* **Sin tablas de usuarios:** La base de datos `banco_alimentos_db` no almacena contraseñas ni usuarios.
* **Firma Asimétrica RS256:** Los tokens son emitidos por Keycloak y validados en el backend descargando las claves públicas mediante `jwks-rsa` desde:
  `http://keycloak:8080/realms/banco-de-alimentos/protocol/openid-connect/certs`.
* **Roles RBAC:**
  * `@Roles('Voluntario')`: Despacha entregas, consulta el historial y la auditoría de lotes, y exporta reportes CSV.
  * `@Roles('ReferenteComedor')`: Confirma la recepción física de su comedor.
  * `@Roles('Coordinador')`: Confirma recepciones, consulta el historial y la auditoría de lotes, y exporta reportes CSV.
* **Aislamiento Multi-Tenant:** El referente solo puede consultar y confirmar entregas asociadas a su `comedorAsignadoId` (en caso contrario, la API responde 403).
* **Registro de quién opera:** cada entrega, movimiento de stock y cambio de estado guarda el identificador del usuario (`sub` del token) y su nombre.
* **Acceso de demostración:** los endpoints `usuarios-demo` y `login-demo` permiten ingresar con un usuario de prueba **sin contraseña**, para facilitar la demo. Están habilitados por defecto y se desactivan con `DEMO_LOGIN_ENABLED=false`. Deben desactivarse fuera de un entorno de demostración.
* **Modo de autenticación falsa:** si `AUTH_FAKE=true`, los pedidos sin token se aceptan como un Voluntario de prueba. Es solo para desarrollo y no está activo en el `docker-compose.yml` principal.

---

## 📡 Endpoints Principales

El contrato completo está en `open-api.yaml` y se puede consultar con Swagger UI en [http://localhost:8082](http://localhost:8082).

### Autenticación e Identidad
* `POST /api/v1/auth/login`: Autenticación delegada en Keycloak.
* `GET /api/v1/auth/usuarios-demo`: Lista de usuarios de prueba (público, solo con el acceso de demostración habilitado).
* `POST /api/v1/auth/login-demo`: Ingreso con un usuario de prueba, sin contraseña (público, solo con el acceso de demostración habilitado).
* `GET /api/v1/usuarios/me`: Perfil y atributos territoriales del usuario autenticado.
* `GET /.well-known/openid-configuration`: Metadatos OpenID Connect Discovery 1.0.

### Distribución de Alimentos
* `POST /api/v1/entregas`: Registra un despacho de alimentos. Genera un movimiento de stock negativo por cada lote y el estado inicial `PENDIENTE`.
* `GET /api/v1/entregas`: Lista entregas (con aislamiento automático para referentes).
* `GET /api/v1/entregas/:id`: Detalle de una entrega.
* `PATCH /api/v1/entregas/:id/recepcion`: Confirmación de la recepción. Agrega un registro `CONFIRMADO` al historial de estados con el usuario que confirmó; no modifica la entrega.

### Depósitos e Inventario
* `GET /api/v1/depositos`: Lista de depósitos regionales.
* `GET /api/v1/depositos/:id/stock`: Stock actual de los lotes del depósito (calculado a partir de sus movimientos), con vencimientos.
* `GET /api/v1/comedores`: Lista de comedores certificados por el Padrón Provincial.

### Auditoría y Tribunal de Cuentas (NFR Estrella)
* `GET /api/v1/auditoria/lotes`: Lista de lotes para inspección y auditoría.
* `GET /api/v1/auditoria/lotes/:loteId/trazabilidad?fecha=`: Reconstruye el stock del lote y su línea de tiempo (ingreso, despachos y confirmaciones de recepción, cada uno con su responsable) a una fecha y hora de corte. Acepta una fecha (`2026-10-25`) o una fecha y hora (`2026-10-25T12:00:00-03:00`); sin `fecha`, usa el momento actual. Responde 400 si la fecha no es válida.
* `GET /api/v1/auditoria/reportes/entregas/csv`: Exportación del libro de entregas en formato CSV para el Tribunal de Cuentas.

---

## ⚙️ Variables de Entorno

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `PORT` | `3000` | Puerto HTTP del backend |
| `TZ` | `America/Argentina/Buenos_Aires` | Zona horaria del proceso |
| `DB_HOST` | `db` (o `localhost`) | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | `banco_alimentos_db` | Nombre de la base de datos |
| `DB_USER` / `DB_PASSWORD` | `postgres` / `postgres` | Credenciales de base de datos |
| `KEYCLOAK_URL` | `http://localhost:8080` | URL pública de Keycloak |
| `KEYCLOAK_INTERNAL_URL` | `http://keycloak:8080` | URL interna dentro de Docker |
| `KEYCLOAK_REALM` | `banco-de-alimentos` | Realm de Keycloak |
| `KEYCLOAK_CLIENT_ID` | `banco-alimentos-client`| Cliente público OIDC |
| `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` | `admin` / `admin` | Credenciales de administración de Keycloak, usadas para listar los usuarios de demostración |
| `DEMO_LOGIN_ENABLED` | habilitado | Con `false`, desactiva `usuarios-demo` y `login-demo` |
| `DEMO_USER_PASSWORD` | contraseña de los usuarios de prueba | Contraseña que usa `login-demo` para ingresar con el usuario elegido |
| `AUTH_FAKE` | deshabilitado | Con `true`, acepta pedidos sin token como un Voluntario de prueba (solo desarrollo) |
| `REDIS_URL` | `redis://redis:6379` | URL de conexión de Redis |
| `RABBITMQ_URL` | `amqp://banco:cambiar@rabbitmq:5672` | Conexión AMQP RabbitMQ |
| `PADRON_PROVINCIAL_URL`| `http://padron-provincial:6767` | URL del mock de Padrón (Haskell) |
| `RENDICION_CUENTAS_URL`| `http://rendicion-cuentas:7777` | URL del mock de Rendición (Prolog) |

---

## 🐳 Ejecución con Docker (recomendado)

El backend se levanta junto con el resto del sistema desde la raíz del repositorio:

```bash
docker compose up -d --build
```

Queda disponible en [http://localhost:3000](http://localhost:3000), con la API bajo `/api/v1`.

---

## 🛠️ Comandos de Desarrollo Local (sin Docker)

Requiere Node.js 22 y los servicios de los que depende (PostgreSQL, Redis, RabbitMQ y Keycloak) en ejecución.

```bash
# 1. Instalar dependencias
npm install

# 2. Compilar TypeScript
npm run build

# 3. Iniciar en modo desarrollo
npm run start:dev
```

---

## 🧪 Pruebas

### Test de integración de trazabilidad (fitness function del NFR #1)

`test/trazabilidad.e2e-spec.ts` verifica, contra el sistema levantado, que cada operación deje registro y que el estado de un lote pueda reconstruirse en una fecha pasada. Registra entregas reales, confirma una recepción y comprueba:

1. que el estado del lote en una fecha pasada no cambia por entregas posteriores;
2. que el stock reconstruido descuenta exactamente las entregas registradas;
3. que cada entrega queda registrada con su fecha, comedor, cantidad y responsable;
4. que la reconstrucción en un instante exacto excluye los movimientos posteriores;
5. que la confirmación de recepción queda registrada como un movimiento nuevo;
6. que la base de datos rechaza modificar o borrar registros ya guardados;
7. que la reconstrucción responde en menos de 5 segundos.

**Requisitos:** el sistema levantado con `docker compose up -d --build` y la contraseña de los usuarios de prueba en la variable `E2E_PASSWORD`. Desde la carpeta `backend`, en PowerShell:

```powershell
npm install
$env:E2E_PASSWORD = "PasswordSegura123!"
npm run test:e2e
```

En Bash (Linux, macOS o Git Bash):

```bash
npm install
E2E_PASSWORD='PasswordSegura123!' npm run test:e2e
```

La contraseña es la de los usuarios de prueba definidos en `keycloak/realm-export.json`. La variable vale solo para la terminal donde se carga: si se abre otra, hay que volver a cargarla.

| Variable | Valor por Defecto | Descripción |
| :--- | :--- | :--- |
| `E2E_PASSWORD` | (obligatoria) | Contraseña de los usuarios de prueba de Keycloak |
| `E2E_API_URL` | `http://localhost:3000` | URL del backend |
| `E2E_LOTE_ID` | `lote-5` | Lote sobre el que se registran las entregas |
| `E2E_DB_URL` | `postgres://postgres:postgres@localhost:5432/banco_alimentos_db` | Conexión a la base, para verificar la inmutabilidad |

Cada ejecución registra dos entregas reales y descuenta 3 unidades del lote utilizado.


### Tests unitarios

`npm run test` ejecuta los archivos `*.spec.ts`. Por ahora no hay tests unitarios en el repositorio. Los repositorios en memoria (`distribucion/infrastructure/in-memory.repositories.ts`) permiten probar los casos de uso sin base de datos.
