# Rendición de Cuentas (mock)

Mock del sistema de rendición de cuentas del ministerio, hecho en Prolog (SWI-Prolog). Simula la recepción del lote nocturno de entregas enviado desde la cola PubSub. No usa base de datos: guarda todo en memoria, así que se pierde al reiniciar.

## Correr con Docker

```bash
docker build -t rendicion-cuentas .
docker run -p 7777:7777 rendicion-cuentas
```

## Endpoints

| Método | Ruta                    | Descripción                                   |
|--------|-------------------------|-----------------------------------------------|
| POST   | `/api/rendicion-cuentas`| Recibe las entregas del día y las registra    |
| GET    | `/api/rendicion-cuentas`| Devuelve todo lo registrado hasta el momento  |
| GET    | `/health`               | Healthcheck                                   |

## Ejemplo

El body del POST puede ser un array de entregas, o un objeto `{"entregas": [...]}`. Las entregas pueden tener cualquier estructura, se guardan tal cual llegan.

```bash
curl -X POST localhost:7777/api/rendicion-cuentas \
  -H 'Content-Type: application/json' \
  -d '[{"id":1,"comedor_id":3,"fecha":"2026-10-26","raciones":120}]'
```

Respuesta (`201 Created`):

```json
{"id": 1, "recibido_en": "2026-10-26T23:00:00+00:00", "cantidad": 1}
```

Cada POST se guarda como un lote. Si el body no es válido responde `400`.

```bash
curl localhost:7777/api/rendicion-cuentas
```

```json
{
  "total_lotes": 1,
  "total_entregas": 1,
  "lotes": [
    {
      "id": 1,
      "recibido_en": "2026-10-26T23:00:00+00:00",
      "cantidad": 1,
      "entregas": [{"id": 1, "comedor_id": 3, "fecha": "2026-10-26", "raciones": 120}]
    }
  ]
}
```

## Configuración

| Variable | Default | Descripción       |
|----------|---------|-------------------|
| `PORT`   | `7777`  | Puerto de escucha |