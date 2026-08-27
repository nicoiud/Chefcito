# Backend del asistente (Fase 3)

Servicio mínimo cuya única responsabilidad es **controlar el costo del LLM**,
que es el único componente del proyecto que cobra por uso.

Hace tres cosas:

1. Guarda la API key del modelo, para que nunca viaje dentro de la app.
2. Valida el límite diario por usuario **antes** de llamar al modelo.
3. Acota el tamaño de la pregunta y de la respuesta, porque los tokens de
   entrada y salida son lo que se factura.

## Correr localmente

```bash
cd backend
npm install
npm start
```

Sin `ANTHROPIC_API_KEY` el servidor levanta igual, en modo demo: responde con
un texto fijo en lugar de llamar al modelo. Sirve para probar el contrato HTTP
y el límite diario sin gastar dinero.

Con API key real:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Después hay que apuntar la app al backend, en un `.env` en la raíz del repo:

```
EXPO_PUBLIC_ASSISTANT_API_URL=http://localhost:3000/ask
```

## Tests

```bash
npm test
```

Cubren lo que importa: que al llegar al límite se devuelva 429 **sin llamar al
LLM**, que el cupo sea independiente por usuario, que se rechacen preguntas
demasiado largas y que un error del modelo no le consuma cupo al usuario.

## Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | API key del modelo. Sin ella corre en modo demo. |
| `DAILY_MESSAGE_LIMIT` | `20` | Mensajes por usuario por día. |
| `PORT` | `3000` | Puerto HTTP. |

## Endpoints

### `POST /ask`

```json
{
  "userId": "uuid-anonimo-del-dispositivo",
  "question": "¿Puedo reemplazar la manteca por aceite?",
  "context": {
    "title": "Tortilla de papas",
    "ingredients": [{ "name": "Papa", "quantity": "4 medianas" }],
    "currentStep": "Freír las papas",
    "stepNumber": 2,
    "totalSteps": 4
  }
}
```

Respuestas: `200` con `{ answer, remainingToday }`, `429` si el usuario agotó
el cupo del día, `400` si el payload es inválido.

### `GET /health`

Devuelve `{ ok: true, llmConfigured }`.

## Antes de producción

El contador de uso está en memoria (`src/usageStore.js`): se pierde al
reiniciar y no se comparte entre réplicas. Para producción hay que
reemplazarlo por Firebase o Supabase (ambos con tier gratuito) respetando la
misma interfaz `getCount` / `increment`.

El `userId` es un UUID anónimo que genera la app y guarda localmente; no
identifica a la persona. Como el cliente puede manipularlo, sirve para separar
cupos entre usuarios normales, no como control de abuso: si eso hace falta,
conviene sumar autenticación real (por ejemplo Firebase Anonymous Auth) y
tomar el id del token verificado en lugar del body.

## Modelo usado

`claude-haiku-4-5`, el más económico de la familia, con `max_tokens: 400`.
Las respuestas se leen en voz alta mientras se cocina, así que además de
barato conviene que sean breves. Ver `docs/ARCHITECTURE.md` para el criterio
de reemplazo si cambia la política de precios.
