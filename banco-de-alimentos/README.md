# Sistema Provincial Banco de Alimentos (Escenario 1B)

## 📌 Descripción del Dominio

El **Sistema Provincial Banco de Alimentos** es una plataforma destinada a gestionar la red provincial de distribución de donaciones de alimentos. El sistema coordina el flujo de alimentos desde su recepción en depósitos regionales hasta su entrega efectiva en comedores comunitarios debidamente habilitados, garantizando el control de stock por lotes, el seguimiento de fechas de vencimiento y la trazabilidad inmutable de cada alimento distribuidos.

---

## 👥 Roles del Negocio

* **Voluntario de Depósito:**  
  * Registra el ingreso de partidas y donaciones de alimentos asignándoles un lote.
  * Confecciona y registra las entregas de lotes dirigidas a los comedores comunitarios.
* **Referente de Comedor:**  
  * Revisa las entregas recibidas en la institución y registra la confirmación de recepción conforme de la mercadería.
* **Coordinador del Ministerio:**  
  * Supervisa el stock consolidado entre los depósitos regionales.
  * Consulta el historial inmutable de movimientos y exporta reportes de trazabilidad para las auditorías.

---

## 📦 Entidades y Conceptos del Dominio

* **Depósito Regional:** Cada una de las 15 sedes físicas autorizadas para el almacenamiento y conservación de los alimentos.
* **Lote:** Unidad fundamental de inventario. Contiene el tipo de alimento, cantidad de unidades, fecha de vencimiento, donante de origen y depósito asignado.
* **Ingreso:** Registro de recepción inicial de donaciones o partidas de alimentos en un depósito.
* **Entrega:** Operación mediante la cual se despachan unidades de uno o más lotes hacia un comedor comunitario.
* **Comedor Comunitario:** Institución de asistencia alimentaria. Debe estar registrada y con estado habilitado en el Padrón Provincial para recibir mercadería.
* **Historial de Movimiento:** Registro inmutable de cada hecho físico ocurrido sobre un lote (ingresos, entregas, ajustes).

---

## ⚖️ Reglas e Invariantes del Negocio

1. **Habilitación de Comedores:** Únicamente se pueden autorizar y registrar entregas dirigidas a comedores que figuren como **habilitados** en el Padrón Provincial.
2. **Disponibilidad de Stock:** No se puede registrar una entrega de alimentos si la cantidad solicitada supera el stock disponible en el lote seleccionado dentro del depósito.
3. **Control de Vencimientos:** Queda prohibida la entrega o despacho de lotes cuya fecha de vencimiento haya expirado.
4. **Inmutabilidad y Reconstruibilidad Histórica (Tribunal de Cuentas):**  
  * Todo movimiento o cambio en el historial de un lote queda registrado de forma inmutable e inalterable.
  * Ningún hecho o registro del pasado puede borrarse o modificarse.
  * Las correcciones por errores de registro se realizan mediante **movimientos compensatorios** (ajustes de saldo) que preservan el historial completo.

---

## 🔑 Backend en modo desarrollo (sin Firebase)

Mientras no esté conectado Firebase, el backend solo arranca en modo desarrollo, con la variable `AUTH_FAKE=true`. En ese modo acepta tokens fijos de usuarios de prueba en vez de validar contra Firebase.

**Con npm** (desde `backend/`):

| Terminal | Comando |
|---|---|
| PowerShell | `$env:AUTH_FAKE='true'; npm run start:dev` |
| Bash | `AUTH_FAKE=true npm run start:dev` |

**Con Docker Compose:** `AUTH_FAKE=true docker compose up`, o agregar `AUTH_FAKE=true` al archivo `.env`.

**Usuarios de prueba** (header `Authorization: Bearer <token>`):

| Token | Rol |
|---|---|
| `token-voluntario` | Voluntario |
| `token-referente` | ReferenteComedor |
| `token-coordinador` | Coordinador |

Sin `AUTH_FAKE=true` el modo desarrollo está apagado: el backend usa Firebase y estos tokens no funcionan.