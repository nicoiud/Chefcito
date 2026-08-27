# Chefcito 🍳

Asistente de cocina: recetas paso a paso, con reconocimiento de
ingredientes por cámara, asistente de voz y guía en Realidad Aumentada
como fases futuras. Ver la especificación completa y las decisiones de
arquitectura en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Estado actual

- ✅ **Fase 1 — App base de recetas**: listado, detalle con ingredientes y
  pasos, modo "cocinar" paso a paso, favoritos persistentes y timer.
- ✅ **Fase 2 — Cámara (visión on-device)**: cámara en vivo que compara lo
  que ve contra los ingredientes del paso actual, con check verde. El
  motor de visión es intercambiable; el modelo real necesita un
  development build (ver más abajo).
- ✅ **Fase 3 — Asistente de voz**: preguntas por voz o texto, respuestas
  leídas en voz alta con TTS nativo, cupo diario visible y backend propio
  que controla el costo del LLM.
- ⏳ **Fase 4 — Realidad Aumentada**: pendiente.

Cada fase se activa/desactiva mediante flags en
`src/config/featureFlags.ts`, sin afectar las fases ya construidas.

### Qué corre en Expo Go y qué necesita un development build

La app arranca y es usable en Expo Go, pero dos piezas son módulos nativos
que Expo Go no incluye. En vez de romper, la app las detecta y degrada:

| Función | Expo Go / web | Development build |
|---|---|---|
| Recetas, modo cocinar, favoritos, timer | ✅ funciona | ✅ funciona |
| Cámara y comparación de ingredientes | ✅ funciona, con detector **simulado** | ✅ modelo real on-device |
| Preguntas al asistente + respuesta hablada | ✅ funciona (escribiendo) | ✅ funciona |
| Dictado por voz (STT) | ❌ se ofrece escribir | ✅ funciona |

El detector simulado no hace visión por computadora: recorre los
ingredientes esperados del paso para que el flujo sea usable sin modelo.
La pantalla siempre muestra qué motor está activo. Para activar el modelo
real, los pasos están en `src/vision/modelAsset.ts`.

## Requisitos

- Node.js 18+
- [Expo Go](https://expo.dev/go) en el celular, o un emulador Android/iOS.

## Cómo correr la app

```bash
npm install
npm start
```

Desde ahí podés abrir la app en Expo Go escaneando el QR, o correr:

```bash
npm run android   # emulador/dispositivo Android
npm run ios       # simulador iOS (requiere macOS)
npm run web       # navegador
```

## El asistente (Fase 3)

Las preguntas sobre la receta —"¿qué ingredientes lleva?", "¿cuál era el
paso?", "¿cuánto falta?"— se responden **en el dispositivo**, sin llamar al
LLM y sin consumir cupo. Solo las preguntas abiertas van al modelo.

Para esas últimas hace falta levantar el backend:

```bash
cd backend && npm install && npm start
```

Y apuntar la app al endpoint, con un `.env` en la raíz del repo:

```
EXPO_PUBLIC_ASSISTANT_API_URL=http://localhost:3000/ask
```

Sin `ANTHROPIC_API_KEY` el backend corre en modo demo y responde con un
texto fijo, lo que permite probar todo el circuito sin gastar dinero.
Detalles en [`backend/README.md`](backend/README.md).

Si no levantás el backend, la app sigue funcionando: solo las preguntas
abiertas avisan que el asistente no está configurado.

## Tests y typecheck

```bash
npm test          # tests unitarios de la app (Jest)
npm run typecheck # chequeo de tipos con tsc

cd backend && npm test   # tests del backend (node:test)
```

## Estructura del proyecto

```
src/
  types/       # tipos compartidos (Recipe, RecipeStep, Ingredient)
  data/        # recetas embebidas localmente (Fase 1, sin backend)
  config/      # feature flags por fase y config de entorno
  storage/     # persistencia local (favoritos vía AsyncStorage)
  navigation/  # stack de navegación
  screens/     # pantallas de las tres fases
  components/  # componentes reutilizables (RecipeCard, StepTimer)
  vision/      # Fase 2: detectores, catálogo de ingredientes, hook de cámara
  assistant/   # Fase 3: resolutor local, cupo diario, STT/TTS, cliente LLM
  utils/       # lógica pura (matching de ingredientes)
  __tests__/   # tests unitarios
backend/       # Fase 3: endpoint que controla el costo del LLM
docs/
  ARCHITECTURE.md  # decisiones técnicas y modelos de IA/visión por fase
```
