# Sistema Provincial Banco de Alimentos (Escenario 1B)

Plataforma integral para la gestión de la red provincial de distribución de donaciones de alimentos, trazabilidad inmutable de lotes por fecha de vencimiento y rendición de cuentas ante el Tribunal de Cuentas y el Ministerio Provincial.

---

## 📌 Descripción del Dominio

El sistema coordina el flujo de alimentos desde su recepción en depósitos regionales hasta su entrega física efectiva en comedores comunitarios debidamente habilitados, garantizando:
* **Control estricto de stock por lote** y seguimiento de fechas de vencimiento.
* **Acreditación de habilitación en el Padrón Provincial** antes de despachar.
* **Trazabilidad inmutable y reconstrucción histórica temporal** exigida por el Tribunal de Cuentas.
* **Rendición de cuentas nocturna en lotes** hacia el sistema central del Ministerio.

---

## 👥 Roles del Negocio

* **Voluntario de Depósito:**
  * Consulta el stock disponible en su depósito asignado.
  * Registra despachos y entregas de lotes hacia comedores comunitarios habilitados.
* **Referente de Comedor:**
  * Posee aislamiento territorial (*multi-tenant*): solo visualiza los despachos de su institución.
  * Confirma la recepción física conforme de los alimentos recibidos.
* **Coordinador del Ministerio:**
  * Supervisa el stock consolidado entre los 15 depósitos regionales.
  * Consulta el historial inmutable de movimientos.
  * Ejecuta la **Reconstrucción Histórica de Lotes a cualquier fecha pasada** (Tribunal de Cuentas).
  * **Exporta reportes oficiales en formato CSV**.

---

## 📦 Entidades y Conceptos del Dominio

* **Depósito Regional:** Cada una de las sedes físicas autorizadas para almacenamiento y conservación.
* **Lote:** Unidad fundamental de inventario (tipo de alimento, stock, fecha de vencimiento, donante y depósito).
* **Ingreso:** Registro inmutable de donaciones o partidas recibidas en un depósito.
* **Entrega:** Operación mediante la cual se despachan unidades de uno o más lotes hacia un comedor.
* **Comedor Comunitario:** Institución de asistencia alimentaria registrada y habilitada en el Padrón Provincial.
* **Lotes Entregados (Ledger Inmutable):** Registro histórico inalterable de cada movimiento físico sobre un lote.

---

## ⚖️ Reglas e Invariantes del Negocio

1. **Habilitación de Comedores:** Únicamente se pueden autorizar y registrar entregas dirigidas a comedores habilitados en el Padrón Provincial.
2. **Disponibilidad de Stock:** No se puede despachar si la cantidad solicitada supera el stock disponible del lote.
3. **Control de Vencimientos:** Queda prohibido despachar lotes vencidos.
4. **Inmutabilidad y Reconstruibilidad Histórica (Tribunal de Cuentas):**
   * Ningún registro de entrega o movimiento histórico puede borrarse ni modificarse.
   * La fórmula inmutable calcula el saldo histórico a cualquier fecha de corte $T$:
     $$\text{Saldo al Corte } T = \text{Ingreso Inicial} - \sum_{\text{fecha} \le T} \text{Entregas Realizadas}$$
5. **Rendición Nocturna:** Toda entrega confirmada se encola y se despacha en lote al Ministerio a las 02:00 AM.

---

## 🏛️ Arquitectura del Sistema (C4 Contenedores)

El sistema está diseñado 100% contenerizado bajo infraestructura del Estado provincial sin dependencias de SaaS externos:

```
[Navegador / SPA (React + Vite)]
          │ (HTTP / JWT)
          ▼
[Backend API (NestJS Core)]
   ├── (OIDC Token / JWKS) ──> [Keycloak 24 (Proveedor de Identidad)]
   ├── (SQL Relacional) ─────> [PostgreSQL 16 (Dominio, sin usuarios)]
   ├── (ioredis / Cache) ────> [Redis 7 (Resiliencia del Padrón)]
   ├── (AMQP Eventos) ───────> [RabbitMQ (Encolado de Rendiciones)]
   │                               └── (Cron 02:00 AM) ──> [Mock Rendición (Prolog)]
   └── (HTTP Client) ────────> [Mock Padrón Provincial (Haskell)]
```

---

## 🚀 Despliegue con Docker Compose

### Prerrequisitos
* Docker y Docker Compose v2 en ejecución.
* Puertos requeridos libres en el host: `5173`, `3000`, `5432`, `8080`, `8082`, `6379`, `5672`, `15672`, `6767`, `7777`.

### Iniciar el Stack Completo
Desde la raíz del repositorio:

```bash
docker compose up -d --build
```

### URLs de Acceso a Servicios

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Aplicación SPA para usuarios y auditores |
| **Backend REST API** | [http://localhost:3000](http://localhost:3000) | Core API NestJS |
| **Keycloak IdP** | [http://localhost:8080](http://localhost:8080) | Consola de administración (`admin`/`admin`) y OIDC Discovery |
| **Swagger UI** | [http://localhost:8082](http://localhost:8082) | Documentación interactiva OpenAPI |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) | Panel de monitoreo de colas (`banco`/`cambiar`) |
| **Padrón Provincial (Haskell)** | [http://localhost:6767/comedores](http://localhost:6767/comedores) | Mock de sistema externo provincial |
| **Rendición de Cuentas (Prolog)**| [http://localhost:7777/health](http://localhost:7777/health) | Mock de sistema de rendición ministerial |
