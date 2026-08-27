# Chefcito 🍳

Asistente de cocina: recetas paso a paso, con reconocimiento de
ingredientes por cámara, asistente de voz y guía en Realidad Aumentada
como fases futuras. Ver la especificación completa y las decisiones de
arquitectura en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Estado actual

- ✅ **Fase 1 — App base de recetas**: implementada. Listado de recetas,
  detalle con ingredientes y pasos, modo "cocinar" paso a paso, favoritos
  persistentes y timer por paso.
- ⏳ **Fase 2 — Cámara (visión on-device)**: pendiente. La lógica de
  comparación ingrediente-detectado/esperado ya está lista y testeada en
  `src/utils/ingredientMatch.ts`.
- ⏳ **Fase 3 — Asistente de voz**: pendiente.
- ⏳ **Fase 4 — Realidad Aumentada**: pendiente.

Cada fase se activa/desactiva mediante flags en
`src/config/featureFlags.ts`, sin afectar las fases ya construidas.

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

## Tests y typecheck

```bash
npm test          # tests unitarios (Jest)
npm run typecheck # chequeo de tipos con tsc
```

## Estructura del proyecto

```
src/
  types/       # tipos compartidos (Recipe, RecipeStep, Ingredient)
  data/        # recetas embebidas localmente (Fase 1, sin backend)
  config/      # feature flags por fase
  storage/     # persistencia local (favoritos vía AsyncStorage)
  navigation/  # stack de navegación
  screens/     # pantallas (listado, detalle, modo cocinar)
  components/  # componentes reutilizables (RecipeCard, StepTimer)
  utils/       # lógica pura (ej. matching de ingredientes de Fase 2)
  __tests__/   # tests unitarios
docs/
  ARCHITECTURE.md  # decisiones técnicas y modelos de IA/visión por fase
```
