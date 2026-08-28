# Backend del asistente (Fase 3)

Servicio mínimo cuya única responsabilidad es **controlar el costo del LLM**,
que es el único componente del proyecto que cobra por uso.

Hace tres cosas:

1. Guarda la API key del modelo, para que nunca viaje dentro de la app.
2. Valida el límite diario por usuario **antes** de llamar al modelo.
3. Acota el tamaño de la pregunta y de la respuesta, porque los tokens de
   entrada y salida son lo que se factura.

## Proveedores de LLM

Se elige con `LLM_PROVIDER`. Los tres tienen la misma interfaz, así que se
cambia de uno a otro sin tocar la app.

| Proveedor | Costo | Para qué |
|---|---|---|
| `ollama` | gratis | **Desarrollo y pruebas.** Modelo local, sin API key ni internet |
| `anthropic` | por uso | **Producción.** Los usuarios no tienen Ollama en su casa |
| `demo` | gratis | Probar el contrato HTTP y el límite sin llamar a ningún modelo |

Si no se define `LLM_PROVIDER`, se detecta solo: Anthropic si hay API key,
demo si no.

## Correr localmente

```bash
cd backend && npm install
```

### Gratis, con Ollama (recomendado para probar)

```bash
ollama pull qwen3:7b
LLM_PROVIDER=ollama OLLAMA_MODEL=qwen3:7b npm start
```

Se puede cambiar el modelo con `OLLAMA_MODEL` y la dirección con
`OLLAMA_URL`. El default es `llama3.2` (3B) porque anda en cualquier
máquina, pero si tenés GPU conviene algo mejor.

#### Qué modelo elegir

El asistente responde **tres oraciones en español rioplatense**. No
necesita razonamiento profundo ni contexto largo: necesita buen español y
velocidad, porque la persona está esperando con las manos ocupadas.

| VRAM | Modelo sugerido | Por qué |
|---|---|---|
| 4-6 GB | `llama3.2` (3B) | Es el default: entra en casi cualquier lado |
| 8-12 GB | **`qwen3:7b`** | Fuerte en idiomas no ingleses, ~7 GB, rápido |
| 8-12 GB | `mistral-nemo` (12B) | Alternativa: bueno en lenguas europeas |

Un modelo más grande no mejora nada acá y solo agrega demora. Para
respuestas de tres oraciones, 7B rinde de sobra.

### Con Claude (producción)

```bash
LLM_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-... npm start
```

### Apuntar la app al backend

```
EXPO_PUBLIC_ASSISTANT_API_URL=http://localhost:3000/ask
```

**Desde un celular** `localhost` no sirve: apunta al propio celular. Hay que
usar la IP de la computadora en la red local, por ejemplo
`http://192.168.0.10:3000/ask`. Ver `docs/TESTEO_MVP.md`.

Para verificar qué proveedor quedó activo:

```bash
curl http://localhost:3000/health
# {"ok":true,"llmConfigured":true,"provider":"ollama:llama3.2","dailyLimit":20}
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
| `LLM_PROVIDER` | autodetect | `ollama`, `anthropic` o `demo`. |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Dónde escucha Ollama. |
| `OLLAMA_MODEL` | `llama3.2` | Modelo local a usar. |
| `ANTHROPIC_API_KEY` | — | API key. Requerida por el proveedor `anthropic`. |
| `DAILY_MESSAGE_LIMIT` | `20` | Mensajes por usuario por día. |
| `ALLOWED_ORIGIN` | `*` | Origen permitido por CORS. |
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

En producción, `claude-haiku-4-5`: el más económico de la familia, con
`max_tokens: 400`. Las respuestas se leen en voz alta mientras se cocina,
así que además de barato conviene que sean breves.

Para desarrollo, cualquier modelo de Ollama. `llama3.2` alcanza de sobra
para respuestas cortas de cocina y corre en una notebook común.
