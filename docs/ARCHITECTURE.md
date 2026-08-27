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
| `cameraIngredientDetection` | Fase 2 — visión on-device | apagado |
| `voiceAssistant` | Fase 3 — asistente de voz + LLM | apagado |
| `arGuidance` | Fase 4 — AR con Unity | apagado |

## Fase 1 — App base de recetas (implementada)

- Recetas embebidas localmente en `src/data/recipes.ts` (sin backend).
- Pantallas: `RecipeListScreen` (listado + filtro de favoritos),
  `RecipeDetailScreen` (ingredientes y pasos), `CookModeScreen` (paso a
  paso con navegación Anterior/Siguiente).
- Favoritos persistidos con AsyncStorage vía `FavoritesContext`.
- Timer por paso (`StepTimer`) para pasos que declaran `timerSeconds`.
- Costo: **$0**, no depende de ningún servicio externo.

## Fase 2 — Reconocimiento de ingredientes por cámara (no implementada)

**Modelo de visión propuesto**: YOLOv8n o MobileNet SSD pre-entrenado,
convertido a TensorFlow Lite (Android) y Core ML (iOS), con fine-tuning
sobre 15-20 ingredientes comunes usando un dataset chico (100-300 imágenes
por clase, partiendo de Food-101 / Open Images filtrado). Se elige por:
- Correr 100% on-device → costo $0 por inferencia, funciona sin conexión.
- Tener conversión directa y madura a TFLite/Core ML.
- Tamaño de modelo chico (nano/mobile), apto para apps móviles.

La lógica de comparación entre lo detectado por la cámara y lo esperado
por el paso actual ya está implementada de forma independiente del modelo
en `src/utils/ingredientMatch.ts` (con tests en
`src/__tests__/ingredientMatch.test.ts`), para poder conectarla al modelo
real sin rediseñar la lógica de negocio. Se activa con el flag
`cameraIngredientDetection`.

**Reemplazo futuro**: si el modelo pre-entrenado no alcanza precisión
suficiente, evaluar otros checkpoints TFLite/Core ML de detección de
objetos livianos antes de escalar a un servicio pago — la inferencia debe
seguir siendo on-device para no romper el principio de costo $0.

## Fase 3 — Asistente de voz (no implementada)

- **Voz → texto**: STT nativo del SO (Android `SpeechRecognizer`, iOS
  `Speech` framework). Gratis, sin límite, no requiere red.
- **Texto → voz**: TTS nativo del SO (`TextToSpeech` en Android,
  `AVSpeechSynthesizer` en iOS). Gratis, sin límite.
- **LLM**: único componente pago del proyecto, vía API económica (ej.
  Claude Haiku o equivalente de bajo costo). Debe pasar por un backend que
  valide un límite diario por usuario (ej. 20 mensajes/día) antes de
  llamar al modelo, para que el costo no escale linealmente con usuarios
  sin control.
- **Backend**: endpoint que recibe la pregunta + contexto de receta,
  valida el contador diario en Firebase/Supabase (tier gratuito), llama al
  LLM y devuelve la respuesta.

**Reemplazo futuro**: si el proveedor de LLM cambia de precios, el punto
de integración queda acotado al endpoint del backend — la app no debería
necesitar cambios más allá de la URL/contrato del endpoint.

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
