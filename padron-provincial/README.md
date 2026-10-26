# Padron Provincial API (mock)

API REST mock del padrón provincial de comedores, hecha en Haskell (Scotty). Devuelve datos hardcodeados, todos de Buenos Aires.

## Correr con Docker

```bash
docker build -t padron-provincial .
docker run -p 6767:6767 padron-provincial
```

## Endpoints

| Método | Ruta              | Descripción                  |
|--------|-------------------|------------------------------|
| GET    | `/comedores`      | Lista de comedores           |
| GET    | `/comedores/:id`  | Un comedor (404 si no existe)|
| GET    | `/health`         | Healthcheck                  |

## Ejemplo

```bash
curl localhost:6767/comedores
```

```json
[
  {
    "id": 1,
    "nombre": "Comedor Los Pibes",
    "provincia": "Buenos Aires",
    "direccion": "Av. Rivadavia 18450, Moron"
  }
]
```

## Configuración

| Variable | Default | Descripción         |
|----------|---------|---------------------|
| `PORT`   | `6767`  | Puerto de escucha   |

## Agregar comedores

Editar la lista `comedores` en `app/Main.hs`.