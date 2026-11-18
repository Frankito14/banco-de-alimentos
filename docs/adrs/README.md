# Sistema Provincial Banco de Alimentos - Registro de Decisiones Arquitectónicas (ADRs)

## Índice

- [ADR-001: Selección de Estilo Arquitectónico](#adr-001-selección-de-estilo-arquitectónico)
- [ADR-002: Adopción del Patrón Domain-Driven Design (DDD)](#adr-002-adopción-del-patrón-domain-driven-design-ddd)
- [ADR-003: Portabilidad, Contenerización y Entorno de Despliegue](#adr-003-portabilidad-contenerización-y-entorno-de-despliegue)
- [ADR-004: Elección de Interfaz de Usuario (UI)](#adr-004-elección-de-interfaz-de-usuario-ui)
- [ADR-005: Estrategia de Persistencia y Consistencia de Datos](#adr-005-estrategia-de-persistencia-y-consistencia-de-datos)
- [ADR-006: Diseño de API REST con OpenAPI](#adr-006-diseño-de-api-rest-con-openapi)
- [ADR-007: Autenticación, Autorización y Seguridad (OIDC / OAuth2)](#adr-007-autenticación-autorización-y-seguridad-oidc--oauth2)
- [ADR-008: Estrategia de Integración con API REST del Padrón Provincial](#adr-008-estrategia-de-integración-con-api-rest-del-padrón-provincial)
- [ADR-009: Estrategia de Integración con Sistema de Rendición de Cuentas del Ministerio](#adr-009-estrategia-de-integración-con-sistema-de-rendición-de-cuentas-del-ministerio)

---

## ADR-001: Selección de Estilo Arquitectónico

**Estado:** Aceptada

### Contexto

El Sistema Provincial Banco de Alimentos (Escenario 1B) debe articular la operación logística de 15 depósitos regionales con 900 comedores comunitarios a través de interfaces web para tres perfiles de usuario (Voluntarios, Referentes de Comedor y Coordinadores). La plataforma procesa aproximadamente 40.000 movimientos mensuales (~2,7 transacciones por minuto en horario operativo) y debe integrarse con dos sistemas externos preexistentes: la API REST del Padrón Provincial (caracterizada por alta latencia y fallas intermitentes) y el Sistema de Rendición de Cuentas del Ministerio (que procesa datos exclusivamente en lotes nocturnos).

### Decisión

Selección de Monolito Modular como estilo arquitectónico, siguiendo las filosofías de Clean Architecture y DDD para proteger el dominio. Esta elección responde a que la carga del sistema (~40.000 movimientos mensuales o ~2,7 transacciones por minuto) y la cantidad de usuarios no justifican la sobrecarga de microservicios ni el uso de Database-per-service, permitiéndonos resolver la asignación y descuento de stock mediante transacciones ACID locales sin consistencia eventual. Aunque no escala sus partes por separado, su diseño modular lo hace mucho más fácil de evolucionar y escalar que otras opciones monolíticas, facilitando a su vez que los 3 equipos trabajen en paralelo en sus respectivos módulos, asumiendo como compromiso la coordinación necesaria al compartir un único artefacto de despliegue.

### Alternativas

- **Arquitectura de Microservicios (Database-per-service+ API Gateway):** Se evaluó porque brindaba autonomía total de despliegue a los 3 equipos (Ley de Conway), repositorios independientes y la ventaja de escalar elásticamente un único servicio si fuese necesario. Se descartó porque, al tratarse de un sistema interno con un volumen bajo de ~2,7 transacciones por minuto, introducir múltiples bases de datos y servicios independientes significaba sobrecomplejizar innecesariamente la solución con una sobrecarga operativa y transaccional que el negocio hoy no requiere.
- **Monolito Tradicional en Capas (Layered Architecture):** Se descartó porque centralizar todo el sistema sin límites estrictos de dominio generaba un alto acoplamiento entre módulos, provocando colisiones continuas entre los 3 equipos y degradando la mantenibilidad y desarrollo a mediano plazo.

### Consecuencias

- **Ganancia:**
  - **Bajo costo de infraestructura:** Requiere un único servidor y una base de datos centralizada.
  - **Menor complejidad operativa:** Todo el sistema se compila y despliega en un único artefacto, simplificando pruebas y mantenimiento.
  - **Time-to-market alto/medio:** Al no gestionar contratos distribuidos ni múltiples repositorios, el desarrollo inicial es más rápido.
  - **Capacidad evolutiva:** Si a futuro un módulo requiere escalar por separado, la separación con DDD permite extraerlo sin rediseñar el negocio.
- **Resigna:**
  - **Escalabilidad granular:** Ante picos de demanda en un módulo, se debe duplicar el sistema completo en lugar de solo esa parte.
  - **Despliegues independientes entre equipos:** Los 3 equipos comparten un único artefacto desplegable, obligando a coordinar integraciones y salidas a producción.
  - **Tolerancia a fallos:** Un fallo crítico o bloqueo en un módulo puede comprometer la disponibilidad de toda la aplicación (SPOF)

### NFRs

- **Favorece:**
  - **NFR #1: Trazabilidad y Auditoría:** Al persistir en una única base de datos relacional, los movimientos de lotes y entregas se guardan con transacciones ACID locales inmediatas, garantizando inmutabilidad y consultas históricas rápidas sin lidiar con consistencia eventual ni transacciones distribuidas.
  - **NFR #3: Seguridad y Control de Acceso:** Simplifica la validación de tokens y roles (RBAC) en un único punto centralizado (middleware/guard), evitando tener que propagar, revalidar o sincronizar credenciales entre múltiples servicios independientes.
  - **NFR #7: Mantenibilidad y Modularidad:** La estructura interna en módulos por área de negocio (Bounded Contexts) con interfaces explícitas permite que los 3 equipos trabajen en paralelo en sus respectivos dominios, aislando el impacto de los cambios sin la complejidad de contratos de red distribuidos.
  - **NFR #8: Portabilidad y Despliegue:** Al ser un único artefacto, levantar todo el sistema con contenedores y variables de entorno es simple, reproducible y
- **Perjudica:**
  - **NFR #5: Disponibilidad y Recuperación ante Fallos:** Al ser un único desplegable, si un fallo crítico o saturación de memoria hace caer algún componente, se podría llegar a interrumpir la disponibilidad de todos los componentes a la vez.

### Confirmación
Prueba de arquitectura estática sobre la estructura de módulos: 0 acoplamientos o llamadas directas no autorizadas entre los Bounded Contexts.

---

## ADR-002: Adopción del Patrón Domain-Driven Design (DDD)

**Estado:** Aceptada

### Contexto

El sistema tiene que implementar reglas de negocio que exige el control externo, esas reglas sostienen la trazabilidad que pide el Tribunal de Cuentas, así que tienen que estar expresadas de forma clara y en un único lugar, sin depender de la base de datos ni de los sistemas externos. Además, el sistema es mantenido por 3 equipos del Ministerio trabajando en paralelo, por lo que se requiere una estructura que divida el trabajo por área del negocio y fije convenciones comunes para todos.

### Decisión

Vamos a organizar el sistema en módulos funcionales por área del negocio. En los módulos con reglas de negocio se adopta un enfoque basado en Domain-Driven Design para modelar el dominio mediante entidades, reglas de negocio y excepciones específicas, utilizando un lenguaje común que refleje los conceptos del negocio. Estos módulos se dividen en capas con casos de uso que coordinan las operaciones e interfaces de repositorios que permiten desacoplar la lógica del negocio de las implementaciones de infraestructura. Los módulos de solo consulta acceden a los datos directamente desde un servicio, ya que no contienen reglas de negocio que encapsular.

### Alternativas

- **Anemic Domain Model (Modelo Anémico) con lógica en Servicios de Aplicación:** Se descartó como enfoque general porque puede dispersar las reglas de negocio, dificultando su encapsulación, reutilización y mantenimiento.
- **Transaction Script (lógica procedimental):** Se descartó porque, a medida que aumenta la complejidad del negocio, puede generar duplicación de validaciones y mayor acoplamiento entre las operaciones y los mecanismos de persistencia.

### Consecuencias

- **Ganancia:**
  - **Claridad y alineación con el negocio:** Concentra las reglas de auditoría en el núcleo del dominio utilizando un lenguaje ubicuo común para los equipos.
  - **Aislamiento de infraestructura:** Permite modificar la base de datos o frameworks externos sin alterar la lógica de negocio.
  - **Alta testabilidad:** Facilita la ejecución de pruebas unitarias rápidas sobre el dominio sin depender de bases de datos ni servicios externos.
  - **Trabajo en paralelo (Ley de Conway):** La división modular por contexto permite que los 3 equipos desarrollen independientemente en sus áreas.
- **Resigna:**
  - **Mayor esfuerzo inicial de diseño:** Exige más tiempo de modelado previo y aumenta la cantidad de clases e interfaces.
  - **Sobrecarga de mapeo de datos:** Requiere transformar constantemente objetos entre el modelo de dominio, la persistencia y los DTOs.
  - **Disciplina de capas:** Obliga a vigilar estrictamente las reglas de dependencia para evitar que la infraestructura contamine el dominio.

### NFRs

- **Favorece:**
  - **NFR #1: Trazabilidad y Auditoría:** El registro y la confirmación de entregas se realizan a través de casos de uso, lo que da un punto único donde controlar cómo se registra cada operación, en lugar de dispersar esa lógica en distintas partes del sistema.
  - **NFR #2: Integridad de los Datos:** Las reglas que protegen la consistencia de los datos se implementan en los casos de uso con excepciones de dominio específicas, como primera barrera antes de las restricciones de la base de datos. Al depender de interfaces de repositorio, pueden verificarse con pruebas unitarias sin base de datos.
  - **NFR #7: Mantenibilidad y Modularidad:** La organización en módulos por área del negocio permite que los 3 equipos trabajen en paralelo sobre su propio módulo. Los casos de uso dependen de interfaces de repositorio, por lo que un cambio en la persistencia no obliga a modificar las reglas del negocio.
- **Perjudica:** Ninguno

### Confirmación
Reglas de negocio verificadas con tests unitarios en memoria sin base de datos: 100% de test aprobados.

---

## ADR-003: Portabilidad, Contenerización y Entorno de Despliegue

**Estado:** Aceptada

### Contexto

El sistema será alojado en el Data Center del Estado provincial, el cual cuenta con soporte nativo para contenedores y es mantenido por el área de sistemas del Ministerio. Además, los 3 equipos de desarrollo necesitan levantar localmente el sistema completo sin discrepancias de librerías ni configuraciones manuales.

### Decisión

Vamos a empaquetar todos los componentes de la solución en imágenes estandarizadas bajo la especificación OCI y orquestar el entorno completo mediante un manifiesto declarativo de contenedores. Toda la configuración dependiente del entorno (credenciales, puertos, URLs de red) se inyecta exclusivamente mediante variables de entorno. La persistencia de datos se desacopla utilizando volúmenes gestionados por el motor de contenedores, mientras que la orquestación define políticas de reinicio automático y comprobaciones de salud para controlar el orden de arranque de los servicios.

### Alternativas

- **Instalación directa en el sistema operativo del servidor (VM clásica):** Se descartó porque reintroduce el problema de "en mi máquina anda", obligando a instalar y mantener manualmente versiones de las tecnologías usadas en el servidor.
- **Orquestador avanzado (Kubernetes / Red Hat OpenShift):** Se descartó porque añade una sobrecarga operativa y de configuración desmedida para un sistema monolítico modular con tráfico moderado (~2,7 transacciones/min).

### Consecuencias

- **Ganancia:**
  - **Entornos idénticos y reproducibles:** Con un mismo comando podemos levantar la solución exacta en las máquinas de los 3 equipos y en el Data Center provincial.
  - **Configuración desacoplada:** El código es inmutable; cambiar de entorno requiere únicamente modificar el archivo de variables sin recompilar imágenes.
  - **Recuperación automatizada:** Los contenedores caídos se reinician de inmediato sin intervención humana y sin perder información gracias a los volúmenes nombrados.
- **Resigna:**
  - **Aislamiento no absoluto:** Los contenedores comparten el kernel del host a diferencia de las máquinas virtuales completas

### NFRs

- **Favorece:**
  - **NFR #6: Portabilidad y Despliegue:** Se despliega con un solo comando en cualquier servidor con soporte para contenedores sin instalación manual de dependencias.
  - **NFR #5: Disponibilidad y Recuperación ante Fallos:** Garantiza persistencia mediante volúmenes, reinicio automático y orden de arranque verificado por healthchecks
- **Perjudica:** Ninguno

### Confirmación
Despliegue con la ejecución de un solo comando en un servidor limpio: 100% de los contenedores en estado healthy en menos de 5 minutos.

---

## ADR-004: Elección de Interfaz de Usuario (UI)

**Estado:** Aceptada

### Contexto

El Sistema Provincial Banco de Alimentos cuenta con 3 roles de usuario (Voluntario, Referente de Comedor y Coordinador) que operan desde 15 depósitos y 900 comedores comunitarios. Se requiere una interfaz que permita a los usuarios interactuar con el sistema y definir cómo va a ser su comunicación con los demás componentes del sistema.

### Decisión

Selección de Web App SPA (Single Page Application) con vistas diferenciadas por rol de usuario. Esta elección responde al hecho de que al tratarse de un sistema administrativo de uso interno y cerrado, no se requiere indexación en motores de búsqueda (SEO-friendly). La SPA permite desacoplar completamente la interfaz de usuario de la capa de persistencia mediante consumo exclusivo de una API REST, evitando la sobrecarga y complejidad operativa de una PWA o una aplicación híbrida con capacidades móviles u offline que el negocio hoy no necesita.

### Alternativas

- **MPA (Multi Page Application):** Se evaluó por su bajo consumo inicial en el cliente, pero se descartó porque acopla fuertemente las vistas al ciclo de vida del backend y su ventaja principal (SEO) es irrelevante para un sistema interno con login obligatorio
- **PWA (Progressive Web App):** Se evaluó por su capacidad de instalación en dispositivos móviles, pero se descartó porque introduce complejidad innecesaria (service workers, sincronización offline y notificaciones push) para puestos de trabajo con conectividad estándar.

### Consecuencias

- **Ganancia:**
  - **Desacoplamiento total:** La interfaz de usuario evoluciona y se prueba de forma independiente a la persistencia del sistema, comunicándose únicamente a través del contrato HTTP/JSON.
  - **Experiencia de usuario fluida:** Navegación dinámica y transiciones rápidas sin recarga completa de página al operar formularios de entregas o tablas de stock.
  - **Simplicidad de desarrollo y depuración:** Facilita el desarrollo paralelo del equipo utilizando herramientas estándar de SPA.
- **Resigna:**
  - **Carencia de SEO:** La indexación web es nula o deficiente (irrelevante para el caso).
  - **Dependencia de conectividad:** Requiere conexión activa con la API REST (sin soporte offline).
  - **Mayor tiempo de carga inicial:** El navegador debe descargar el paquete JavaScript inicial antes de renderizar la aplicación.

### NFRs

- **Favorece:**
  - **NFR #7: Mantenibilidad y Modularidad:** Desacopla completamente la interfaz de la lógica de negocio y persistencia mediante contratos de API
- **Perjudica:** Ninguno

### Confirmación
Auditoría desde consola en navegador: 0 renderizados de páginas desde el servidor y 100% de la comunicación realizada mediante llamadas asincrónicas a la API REST.

---

## ADR-005: Estrategia de Persistencia y Consistencia de Datos

**Estado:** Aceptada

### Contexto

El sistema del Banco de Alimentos requiere gestionar el inventario, los ingresos y las entregas de alimentos a comedores comunitarios. Estas operaciones deben mantener la consistencia e integridad de los datos, incluso ante accesos concurrentes. Además, el Tribunal de Cuentas exige conservar la trazabilidad de los movimientos para permitir su reconstrucción histórica durante las auditorías.

### Decisión

Vamos a adoptar un motor de base de datos relacional para la persistencia centralizada del sistema. Esta elección se fundamenta en que el modelo de dominio presenta un alto grado de relacionamiento entre sus entidades (lotes, depósitos, comedores y entregas) y exige priorizar la integridad de los datos y la trazabilidad inmutable requerida por el Tribunal de Cuentas. Se utilizarán identificadores UUID, claves foráneas y restricciones de integridad para garantizar directamente a nivel de persistencia que no existan registros huérfanos ni valores inconsistentes como stock negativo. Asimismo, las transacciones ACID locales del motor relacional aseguran el procesamiento atómico e inmediato de cada movimiento sobre el inventario, evitando los riesgos de la consistencia eventual.

### Alternativas

- **Base de datos NoSQL (Documental / Clave-Valor):** Se descartó porque el dominio exige alta integridad referencial y transacciones ACID sobre datos fuertemente relacionados (lotes, depósitos, comedores y entregas). Las alternativas documentales trasladan la responsabilidad de la consistencia a la aplicación y dificultan las validaciones cruzadas necesarias para la auditoría.
- **Persistencia en archivos planos o almacenamiento en disco:** Se descartó porque carece de soporte nativo para transacciones atómicas, control de concurrencia y consultas relacionales, lo que impediría la reconstrucción rápida de saldos históricos y generaría condiciones de carrera sobre el stock.

### Consecuencias

- **Ganancia:**
  - **Transacciones ACID e integridad referencial:** Garantiza operaciones atómicas e inmediatas sobre el inventario, impidiendo registros huérfanos o inconsistencias a nivel de motor.
  - **Trazabilidad y auditoría simplificada:** Facilita la realización de consultas complejas sobre relaciones entre movimientos para reconstruir el historial de cualquier lote.
  - **Control de concurrencia sólido:** Maneja operaciones de escritura simultáneas desde múltiples depósitos sin riesgo de corrupción de datos.
- **Resigna:**
  - **Rigidez de esquema:** Exige un modelo estructurado y formal, requiriendo un proceso controlado de migraciones ante cambios en la estructura de los datos.
  - **Escalabilidad horizontal limitada:** El escalado se gestiona principalmente de forma vertical o mediante réplicas de lectura, en lugar del particionado elástico propio de esquemas NoSQL.

### NFRs

- **Favorece:**
  - **NFR #1: Trazabilidad y Auditoría:** Permite realizar consultas relacionales complejas sobre el historial de lotes para responder a la exigencia de reconstrucción inmutable de saldos impuesta por el Tribunal de Cuentas.
  - **NFR #2: Integridad de los Datos:** Garantiza transacciones ACID locales y restricciones a nivel de motor, impidiendo stock negativo o registros huérfanos.
  - **NFR #7: Mantenibilidad y Modularidad:** Mantiene una estructura de datos normalizada y predecible que aísla la capa de persistencia del resto de la aplicación.
- **Perjudica:**
  - **NFR #8: Portabilidad y Despliegue:** Al tener una estructura fuertemente tipada y rígida, obliga a ejecutar scripts de migración ordenados y versionados ante cualquier cambio estructural

### Confirmación
Fitness function automatizada y triggers en base de datos que rechazan con excepción cualquier sentencia UPDATE o DELETE: 0 registros alterados o borrados y reconstrucción del saldo de un lote a una fecha pasada en menos de 5 segundos.REST.

---

## ADR-006: Diseño de API REST con OpenAPI

**Estado:** Aceptada

### Contexto

El sistema del Banco de Alimentos debe comunicarse con interfaces de usuario SPA, herramientas de auditoría y sistemas externos. Para garantizar que los 3 equipos de desarrollo trabajen sin ambigüedades y que el manejo de errores sea uniforme, se requiere definir un contrato de interfaz formal y estandarizado.

### Decisión

Vamos a diseñar la API bajo el Nivel 2 del Modelo de Madurez de Richardson utilizando OpenAPI 3.0 como contrato explícito, versionado explícito en la URL ( /api/v1/... ) y la especificación RFC 7807 (Problem Details) para la estructura de todos los errores HTTP.

### Alternativas

- **Versionado por Headers/QueryParams:** Se descartó porque dificulta las pruebas manuales en herramientas como Swagger UI y entorpece la configuración de reglas en proxies/gateways.
- **Respuestas de error ad-hoc o con código 200 OK con flag de error:** Se descartó porque incumple los estándares REST y fuerza al cliente a parsear el cuerpo para adivinar el resultado de la operación.

### Consecuencias

- **Ganancia:**
  - **Estandarización total de endpoints:** Establece contratos de comunicación unificados y predecibles mediante la especificación OpenAPI 3.0.
  - **Desacoplamiento claro entre cliente y servidor:** Permite que la interfaz SPA y los 3 equipos de backend desarrollen en paralelo sin ambigüedades.
  - **Manejo predictivo de excepciones:** Unifica la estructura de errores bajo el estándar RFC 7807 (Problem Details), facilitando la interpretación de fallos en el frontend.
- **Resigna:**
  - **Sobrecarga de mantenimiento documental:** Obliga a actualizar y sincronizar el archivo de especificación de forma previa a cualquier cambio en los endpoints.

### NFRs

- **Favorece:**
  - **NFR #7: Mantenibilidad y Modularidad:** Establece un contrato explícito e inmutable entre el frontend y el backend, permitiendo que los 3 equipos desarrollen en paralelo sin acoplamiento ni ambigüedades.
  - **NFR #2: Integridad de los Datos:** Al definir estrictamente el esquema de entrada con OpenAPI, el backend válida y rechaza con cualquier campo no contemplado en el contrato antes de tocar la lógica de negocio.
  - **NFR #3: Seguridad y Control de Acceso:** La especificación OpenAPI tipifica formalmente los esquemas de autenticación y documenta de forma predecible las respuestas según el rol.
- **Perjudica:** Ninguno

### Confirmación
Test de contrato automatizado contra la especificación: 100% de las peticiones con estructuras o tipos inválidos rechazadas con código HTTP 400 y cuerpo normalizado bajo RFC 7807.

---

## ADR-007: Autenticación, Autorización y Seguridad (OIDC / OAuth2)

**Estado:** Aceptada

### Contexto

El Sistema Provincial Banco de Alimentos cuenta con 3 roles con permisos diferenciados (Voluntario, Referente de Comedor y Coordinador) que operan desde 15 depósitos y 900 comedores. Se debe implementar un esquema de autenticación y autorización que garantice el control de acceso al sistema.

### Decisión

Vamos a delegar la gestión de identidades y la autenticación en un Proveedor de Identidad (IdP) externo bajo el estándar OpenID Connect (OIDC), utilizando el flujo de Código de Autorización con PKCE para la aplicación cliente (SPA) y validación local de tokens de acceso firmados asimétricamente en el backend. El IdP administra centralizadamente los usuarios y emite los tokens de seguridad, mientras que la API REST verifica de manera independiente en cada solicitud la firma criptográfica (mediante la clave pública del IdP), la vigencia y los roles del token a través de un componente transversal de seguridad.

### Alternativas

- **Manejo de usuarios propio en la base de datos:** Se descartó porque tratar la autenticación como código a medida reinventa un problema genérico ya resuelto, introduce altos riesgos de seguridad (gestión de contraseñas, fuerza bruta) y acopla las credenciales al modelo transaccional.
- **SAML 2.0:** Se descartó porque está basado en aserciones XML pesadas orientadas a aplicaciones tradicionales con renderizado en servidor, siendo innecesariamente complejo para la arquitectura del sistema.

### Consecuencias

- **Ganancia:**
  - **Seguridad robusta y separación de responsabilidades:** La aplicación no almacena contraseñas ni maneja hashes; delega esa responsabilidad en un producto especializado.
  - **Control de acceso basado en roles (RBAC):** Facilita la asignación estricta de permisos para Voluntarios, Referentes y Coordinadores.
- **Resigna:**
  - **Complejidad operativa adicional:** Requiere desplegar, configurar y respaldar un contenedor más en el entorno de ejecución.

### NFRs

- **Favorece:**
  - **NFR #3: Seguridad y Control de Acceso:** Cumple estrictamente la exigencia de tokens emitidos por IdP, firma asimétrica, respuestas 401/403 y asociación de cada movimiento a un usuario.
  - **NFR #1: Trazabilidad y Auditoría:** Permite extraer el identificador y rol del usuario auditado en cada registro inmutable de lote o entrega
- **Perjudica:**
  - **NFR #6: Portabilidad y Despliegue:** Incorpora un servicio adicional con su propio volumen de persistencia y parámetros de entorno en el despliegue del sistema.

### Confirmación
Pruebas de integración de seguridad: rechazo HTTP 401 sin token, rechazo HTTP 403 al invocar creación de entregas con rol de referente, y éxito HTTP 201 con rol de voluntario.

---

## ADR-008: Estrategia de Integración con API REST del Padrón Provincial

**Estado:** Aceptada

### Contexto

El sistema debe verificar en tiempo real si un comedor está habilitado antes de registrar una entrega. El Padrón Provincial expone una API REST síncrona que presenta alta latencia y fallas intermitentes. Es necesario consultar este servicio sin degradar la operatoria en los 15 depósitos ni permitir entregas a comedores no autorizados.

### Decisión

Vamos a implementar una integración síncrona protegida mediante una Capa Anti-Corrupción (ACL) junto con una memoria caché. La ACL traduce el contrato externo al modelo de dominio interno, evitando que cambios ajenos ensucien nuestras entidades. La caché almacena el listado de comedores habilitados con refresco programado cada 1 hora y tolerancia máxima de hasta 24 horas ante caídas del servicio externo. Hacer esto nos evita consultar a la API REST externa porque consultamos a nuestra memoria caché.

### Alternativas

- **Comunicación con API REST sin caché:** Reduce la complejidad de la implementación, pero es poco fiable, además de que sería necesario establecer una comunicación sincrónica con dicha API al momento de preparar los pedidos.
- **Persistencia en tablas intermedias de la base de datos (tabla espejo):** Se descartó porque sobrecargaba la base de datos transaccional con datos volátiles externos y aumentaba la complejidad de sincronización y limpieza periódica.

### Consecuencias

- **Ganancia:**
  - **Alta resiliencia:** Tolerancia a caídas del Padrón
  - **Protección al dominio:** Al usar un ACL, protegemos el dominio de cualquier nomenclatura externa proveniente de los sistemas externos.
  - **Baja latencia:** Al no tener que esperar por la respuesta de un sistema en tiempo real, el sistema responde de forma mas rapida y eficiente
- **Resigna:**
  - **Complejidad operativa adicional:** Requiere levantar, configurar y monitorear la caché dentro del sistema.
  - **Eventual desfase de datos:** Durante la ventana de refresco (1 h), las inhabilitaciones recientes de comedores demoran hasta una hora en reflejarse.

### NFRs

- **Favorece:**
  - **NFR #4: Resiliencia Ante Caída Del Padrón Provincial:** Si la API REST del padrón no responde, el sistema puede seguir funcionando.
  - **NFR #7: Mantenibilidad y Modularidad:** La interacción con el sistema externo tiene su propio servicio dentro del backend.
- **Perjudica:**
  - **NFR #6: Portabilidad y Despliegue:** Añade una dependencia de infraestructura en el sistema.
  - **NFR #5: Disponibilidad y Recuperación ante Fallos de Infraestructura:** La caché es un contenedor más que tiene que monitorearse.

### Confirmación
Chaos test deteniendo el servicio que simula el Padrón Provincial:  Respuesta exitosa (200) en menos de 60 ms por parte del sistema.

---

## ADR-009: Estrategia de Integración con Sistema de Rendición de Cuentas del Ministerio

**Estado:** Aceptada

### Contexto

Cada entrega confirmada en el Banco de Alimentos debe informarse al Sistema de Rendición de Cuentas del Ministerio. Este sistema externo procesa la información exclusivamente por la noche en lotes (batch) a las 02:00. Se debe garantizar la integración sin bloquear a los usuarios durante la operación diurna y asegurar que ninguna entrega confirmada se pierda si el servicio ministerial falla o está inaccesible.

### Decisión

Vamos a implementar una integración asincrónica utilizando una cola de mensajes punto a punto (Point-to-Point) y un proceso por lotes (worker/cron) programado. Al confirmarse una entrega, el sistema publica el evento en la cola y responde de inmediato al usuario. Los mensajes se acumulan de forma persistente durante el día en el broker, y a las 02:00 un worker los consume y envía consolidados al Ministerio.

### Alternativas

- **Persistencia en tablas intermedias (sin cola de mensajes):** Se descartó porque usar la base de datos transaccional como gestor de colas sobrecarga el motor relacional y complica la gestión nativa de reintentos, fallos y acuses de recibo (acks)
- **Comunicación síncrona directa HTTP (en tiempo real):** Se descartó porque introducía un acoplamiento temporal inviable: el sistema ministerial no atiende transacciones en horario diurno y cualquier caída externa bloquearía la confirmación de entregas

### Consecuencias

- **Ganancia:**
  - **Desacoplamiento temporal y baja latencia:** La confirmación de entregas es instantánea; el voluntario o referente nunca espera al sistema ministerial
  - **Alta resiliencia y persistencia:** Si el sistema del Ministerio falla a la madrugada, las entregas permanecen seguras en la cola para reintentarse en el siguiente envío.
  - **Consumo eficiente:** Agrupa los movimientos en un único despacho masivo según la ventana operativa del Ministerio.
- **Resigna:**
  - **Complejidad operativa adicional:** Requiere desplegar y mantener un broker de mensajería en el entorno de contenedores.
  - **Consistencia eventual en el reporte ministerial:** El Ministerio no dispone de los datos en tiempo real, sino tras la ejecución del lote nocturno.

### NFRs

- **Favorece:**
  - **NFR #6: Integración:** Procesamiento nocturno desacoplado con reintentos sin pérdida de datos.
  - **NFR #7: Mantenibilidad y Modularidad:** La interacción con el sistema externo tiene su propio servicio dentro del backend.
- **Perjudica:**
  - **NFR #6: Portabilidad y Despliegue:** Incorpora un componente más que monitorear en el sistema.
  - **NFR #5: Disponibilidad y Recuperación ante Fallos de Infraestructura:** La cola de mensajes es un componente más que tiene que monitorearse.

### Confirmación
Prueba de re-ejecución del proceso batch nocturno ante fallos de red: 0 registros duplicados por clave de idempotencia y 100% de la cola vaciada tras el procesamiento exitoso. Si el sistema del Ministerio está caído, las entregas permanecen en la cola y se envían en el siguiente lote.
