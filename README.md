# Sistema de Gestión - Banco de Alimentos (Escenario 1B)

Este proyecto implementa el corte vertical del sistema del Banco de Alimentos: autenticación OIDC con Keycloak, caso de uso de entrega a comedor con descuento de stock por lote y mocks de sistemas externos (Padrón Provincial y Rendición de Cuentas).

## Prerrequisitos

* Docker Engine y Docker Compose v2 (o Docker Desktop) en ejecución.
* Puertos requeridos libres en el host:
  * 5173 (Frontend Web)
  * 3000 (Backend API REST)
  * 5432 (PostgreSQL)
  * 8080 (Keycloak - IdP)
  * 8082 (Swagger UI)
  * 6379 (Redis)
  * 5672 / 15672 (RabbitMQ)
  * 6767 (Mock Padrón Provincial)
  * 7777 (Mock Rendición de Cuentas)

## Cómo correr el proyecto

1. Variables de entorno:
   El archivo de configuración .env reside en la subcarpeta banco-de-alimentos/.
   Si se clona el proyecto de cero y no existe banco-de-alimentos/.env, crearlo a partir del ejemplo:

   `cp banco-de-alimentos/.env.example banco-de-alimentos/.env`

2. Levantar todos los servicios:
   Desde la raíz del repositorio, compilar e iniciar los contenedores en segundo plano:
   
   `docker compose --env-file ./banco-de-alimentos/.env up -d --build`

3. Verificar el estado del stack:
   Asegurarse de que todos los servicios se encuentren en estado Up o healthy:
   
   `docker compose ps`

## Acceso al Sistema

* Frontend Web: http://localhost:5173

### Usuarios de Prueba (Roles OIDC / Demo)
La pantalla de inicio cuenta con acceso rápido de 1 clic para cada rol de dominio, o bien pueden ingresarse manualmente:

* Voluntario de Depósito (Vol Untario): Depósito N° 1 Hurlingham — Registra entregas y descuenta stock por lote.
* Referente de Comedor (Refe Rente): Comedor Rayito de Sol — Confirma recepción física de mercadería.
* Referente de Comedor (Pedro Morales): Comedor Los Ceibos (#9) — Confirma recepción física de mercadería.
* Coordinador (Cor Dinador): Ministerio — Supervisión provincial, trazabilidad y rendiciones.

## Comandos de Operación

* Detener el sistema (conservando los datos persistidos):

  `docker compose down`

* Reiniciar desde cero (eliminando volúmenes y base de datos):
  
  `docker compose down -v --remove-orphans`

  `docker compose up -d --build`

* Ver logs en tiempo real:

  `docker compose logs -f`