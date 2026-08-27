# Arquitectura de Chefcito

Este documento resume las decisiones técnicas del proyecto y el rol de cada
fase. Se actualiza a medida que se implementa cada una.

## Principios

- Todo lo que se pueda correr **on-device** (visión, voz→texto, texto→voz) se
  corre on-device, para mantener el costo operativo en cero por usuario.
- El único componente con costo variable por uso es el LLM de preguntas
  abiertas (Fase 3), limitado a N mensajes/día por usuario.
- El backend es mínimo: solo recetas, progreso de usuario y contador de uso
  del LLM, sobre un tier gratuito (Firebase o Supabase).

## Stack base

- **Framework**: React Native con Expo (TypeScript). Elegido por sobre
  Flutter para tener un único lenguaje (TS) en toda la app y facilitar la
  futura integración de módulos nativos (cámara, voz) sin salir del
  ecosistema JS/Expo.
- **Navegación**: `@react-navigation/native` + `native-stack`.
- **Almacenamiento local**: `@react-native-async-storage/async-storage`
  (favoritos en Fase 1; candidato natural para cachear progreso/receta
  actual en fases posteriores).
- **Tests**: Jest (`jest-expo` preset).

## Feature flags por fase

Definidos en `src/config/featureFlags.ts`. Cada fase se puede activar o
desactivar sin romper las anteriores:

| Flag | Fase | Estado |
|---|---|---|
| `cameraIngredientDetection` | Fase 2 — visión on-device | activo |
| `voiceAssistant` | Fase 3 — asistente de voz + LLM | activo |
| `arGuidance` | Fase 4 — AR con Unity | apagado |

Apagar un flag saca la pantalla del stack de navegación y esconde su botón de
acceso, sin romper las fases anteriores.

## Fase 1 — App base de recetas (implementada)

- Recetas embebidas localmente en `src/data/recipes.ts` (sin backend).
- Pantallas: `RecipeListScreen` (listado + filtro de favoritos),
  `RecipeDetailScreen` (ingredientes y pasos), `CookModeScreen` (paso a
  paso con navegación Anterior/Siguiente).
- Favoritos persistidos con AsyncStorage vía `FavoritesContext`.
- Timer por paso (`StepTimer`) para pasos que declaran `timerSeconds`.
- Costo: **$0**, no depende de ningún servicio externo.

## Fase 2 — Reconocimiento de ingredientes por cámara (implementada)

Cámara con `expo-camera`: la pantalla `IngredientCheckScreen` captura un
frame cada 1,5 s, lo pasa por el detector y compara lo reconocido contra
los ingredientes del paso actual, con feedback de check verde / pendiente.

**Detector pluggable.** La app no depende de ningún modelo concreto, solo
de la interfaz `IngredientDetector` (`src/vision/types.ts`). Hay dos
implementaciones y `getIngredientDetector()` elige la mejor disponible:

| Backend | Cuándo se usa | Qué hace |
|---|---|---|
| `TfliteIngredientDetector` | Development build con el módulo nativo y el modelo presentes | Inferencia real on-device |
| `SimulatedIngredientDetector` | Expo Go y web, donde no hay runtime nativo | Simula el reconocimiento para mantener el flujo usable |

La UI muestra siempre qué motor está activo, para no dar por real una
detección simulada.

**Modelo de visión elegido**: YOLOv8n o MobileNet SSD pre-entrenado,
convertido a TensorFlow Lite (Android) y Core ML (iOS), con fine-tuning
sobre los ~18 ingredientes de `src/vision/ingredientCatalog.ts` usando un
dataset chico (100-300 imágenes por clase, partiendo de Food-101 /
Open Images filtrado). Se elige por:
- Correr 100% on-device → costo $0 por inferencia, funciona sin conexión.
- Tener conversión directa y madura a TFLite/Core ML.
- Tamaño de modelo chico (nano/mobile), apto para apps móviles.

**Cómo activar el modelo real**: los pasos están en
`src/vision/modelAsset.ts`. Requiere un development build; el modelo no
puede correr en Expo Go porque necesita runtime nativo.

**Puntos de reemplazo si cambia el modelo**: `parseModelOutput()` en
`tfliteDetector.ts` traduce la salida cruda, y `ingredientCatalog.ts` mapea
las etiquetas del modelo (en inglés o español) a los ids de las recetas.
Cambiar de checkpoint no debería tocar nada más. La inferencia debe seguir
siendo on-device para no romper el principio de costo $0.

**Ingredientes no detectables**: la sal, el caldo o el aceite no se
reconocen visualmente, así que se separan del check y se listan aparte en
lugar de bloquear la verificación del paso.

## Fase 3 — Asistente de voz (implementada)

- **Voz → texto**: STT nativo del SO vía `expo-speech-recognition`
  (`SpeechRecognizer` en Android, `Speech` framework en iOS), con
  `requiresOnDeviceRecognition`. Gratis y sin salir del dispositivo — por
  eso se evita Whisper por API, que cobra por minuto transcripto. Es un
  módulo nativo: se carga de forma opcional y, donde no está (Expo Go,
  web), la pantalla ofrece escribir la pregunta.
- **Texto → voz**: TTS nativo del SO vía `expo-speech`. Gratis, sin límite.
- **LLM**: `claude-haiku-4-5`, el más económico de la familia, con
  `max_tokens: 400`. Es el único componente con costo variable.

### Las tres capas de control de costo

1. **Resolutor local** (`src/assistant/localAnswers.ts`). Las preguntas
   frecuentes mientras se cocina — qué ingredientes lleva, repetir el paso,
   cuánto falta, cuántas porciones — se responden con datos que ya están en
   el dispositivo. No llaman al LLM ni consumen cupo, y la UI lo marca como
   "respondido sin conexión · sin costo". Es la capa que más reduce la
   factura: saca del LLM lo que no necesita un LLM.
2. **Límite diario** (20 mensajes/usuario/día). El contador del cliente
   (`dailyLimit.ts`) es solo para mostrar el cupo; **el que manda es el
   backend**, porque el cliente es manipulable.
3. **Cotas de tamaño**. El backend rechaza preguntas de más de 500
   caracteres y acota el contexto que manda al modelo, porque los tokens de
   entrada también se pagan.

### Backend

`backend/` es un servidor Node sin framework cuya única razón de existir es
el control de costo: guarda la API key (que nunca viaja en la app), valida
el cupo **antes** de llamar al modelo y devuelve 429 si se agotó. Un fallo
del modelo no le consume cupo al usuario. Sin `ANTHROPIC_API_KEY` levanta
en modo demo, para poder probar el contrato y el límite sin gastar dinero.

El contador está en memoria (`usageStore.js`): para producción hay que
reemplazarlo por Firebase o Supabase respetando la interfaz
`getCount` / `increment`. Ver `backend/README.md`.

**Reemplazo futuro**: si el proveedor de LLM cambia de precios, el punto de
integración queda acotado a `backend/src/llm.js` — la app no necesita
cambios más allá de la URL del endpoint.

## Fase 4 — Realidad Aumentada (no implementada)

- **Motor**: Unity + AR Foundation (ARKit/ARCore con el mismo código
  base).
- **Integración con la app principal**: a evaluar al llegar a la fase,
  entre (a) Unity embebido como módulo nativo dentro de la app RN, o (b)
  app AR separada abierta por deep link, compartiendo datos de receta vía
  almacenamiento local.
- Marcadores visuales simples (formas geométricas + texto), sin modelos 3D
  complejos.

## Costos estimados

| Ítem | Costo |
|---|---|
| Cuenta Google Play Developer | USD 25 (pago único) |
| Cuenta Apple Developer | USD 99/año |
| Backend (Firebase/Supabase) | Gratis hasta cierto tráfico |
| LLM (Fase 3) | Variable, acotado por límite diario/usuario |
| Modelos de visión (Fase 2) | Gratis, corren local |
| Voz STT/TTS (Fase 3) | Gratis, corren local |
