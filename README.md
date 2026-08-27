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
- ✅ **Fase 4 — Guía de mesada**: muestra dónde va cada ingrediente del
  paso, con recalibración manual y marcado en verde de lo que la cámara ya
  reconoció. La vista 2D funciona en todos lados; el passthrough AR sobre
  la cámara requiere un development build.

  Se eligió **ViroReact en lugar de Unity**: el plugin que haría falta para
  embeber Unity (`react-native-unity`) está sin mantenimiento desde 2022,
  y Viro soporta nuestras versiones exactas de Expo y React Native. El
  razonamiento completo está en [`docs/AR.md`](docs/AR.md).

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
| Guía de mesada 2D + recalibración | ✅ funciona | ✅ funciona |
| Marcadores anclados sobre la cámara | ❌ cae a la guía 2D | ⏳ falta integrar Viro |

El detector simulado no hace visión por computadora: recorre los
ingredientes esperados del paso para que el flujo sea usable sin modelo.
La pantalla siempre muestra qué motor está activo.

**Sobre el modelo de visión**: el que se distribuye reconoce de verdad 5
ingredientes (banana, manzana, naranja, brócoli, zanahoria), pero **no**
los centrales de las recetas —tomate, cebolla, papa, huevo— porque no
están en COCO. Para eso hace falta fine-tuning: el toolchain está en
[`ml/`](ml/) y el detalle en [`docs/VISION_MODEL.md`](docs/VISION_MODEL.md).

## Probar cámara y AR en un celular

La detección real y la AR necesitan módulos nativos, así que **no corren en
Expo Go**. Hay que compilar un APK:

```bash
npm install -g eas-cli && eas login
eas build --platform android --profile development
```

Guía completa, qué esperar y cómo reportar problemas:
[`docs/BUILD_ANDROID.md`](docs/BUILD_ANDROID.md).

Dentro de la app, **🩺 Diagnóstico** (arriba a la derecha en la lista) dice
qué módulos nativos encontró y qué motor está usando cada fase.

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
  ar/          # Fase 4: marcadores, proyección cenital, backend de AR
  utils/       # lógica pura (matching de ingredientes)
  __tests__/   # tests unitarios
backend/       # Fase 3: endpoint que controla el costo del LLM
ml/            # Fase 2: entrenamiento y exportación del modelo de visión
assets/models/ # el modelo .tflite que usa la app
docs/
  ARCHITECTURE.md  # decisiones técnicas por fase
  VISION_MODEL.md  # qué reconoce el modelo, qué no, y cómo reentrenarlo
  AR.md            # por qué Viro y no Unity, y cómo está armada la guía
```
