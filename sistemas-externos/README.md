# Sistemas Externos (Mocks)

Esta carpeta contiene los servicios simulados (mocks) de los sistemas gubernamentales/externos con los que se integra la aplicación del Banco de Alimentos.

---

## 📦 Contenido

1. **Padrón Provincial (`padron-provincial`)**
   - **Tecnología**: Haskell (Scotty).
   - **Puerto**: `6767`.
   - **Función**: Simula la consulta del padrón oficial de comedores comunitarios habilitados.
   - **Endpoints clave**:
     - `GET /health`: Estado del servicio.
     - `GET /comedores`: Lista de comedores registrados.
     - `GET /comedores/:id`: Detalle de un comedor específico.

2. **Rendición de Cuentas (`rendicion-cuentas`)**
   - **Tecnología**: Prolog (SWI-Prolog).
   - **Puerto**: `7777`.
   - **Función**: Simula la recepción de los lotes de rendición de entregas diarias enviadas al ministerio.
   - **Endpoints clave**:
     - `GET /health`: Estado del servicio.
     - `POST /api/rendicion-cuentas`: Recepción y registro en memoria de las entregas.
     - `GET /api/rendicion-cuentas`: Consulta de lotes recibidos.

---

## 🎯 ¿Por qué se hizo así?

- **Independencia y aislamiento**: Permite desarrollar, probar e integrar localmente sin depender de sistemas gubernamentales reales, redes externas o credenciales de producción.
- **Reproducibilidad**: Cualquier miembro del equipo puede levantar exactamente el mismo entorno con Docker en un solo comando.
- **Heterogeneidad realista**: Los sistemas de terceros en el mundo real suelen estar construidos sobre tecnologías y paradigmas diversos (Haskell, Prolog). Cada uno corre en su propio contenedor desacoplado.

---

## 🚀 Cómo levantar los sistemas

### 1. Iniciar ambos mocks
Desde la carpeta `sistemas-externos`:

```bash
docker compose up -d --build
```

### 2. Verificar que estén corriendo

```bash
# Padrón Provincial
curl http://localhost:6767/health

# Rendición de Cuentas
curl http://localhost:7777/health
```

### 3. Ver logs

```bash
docker compose logs -f
```

### 4. Detener los servicios

```bash
docker compose down
```

