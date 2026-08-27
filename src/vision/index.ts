import type { IngredientDetector } from './types';
import { TfliteIngredientDetector } from './tfliteDetector';
import { SimulatedIngredientDetector } from './simulatedDetector';

export type { DetectedIngredient, DetectionFrame, IngredientDetector } from './types';
export { getDisplayName, getSupportedIngredientIds } from './ingredientCatalog';
export { SimulatedIngredientDetector } from './simulatedDetector';

let cachedDetector: IngredientDetector | null = null;

/**
 * Elige el mejor backend de detección disponible en este entorno:
 * TFLite on-device si el módulo nativo está presente (development build),
 * y si no el detector simulado, que mantiene el flujo usable en Expo Go.
 */
export function getIngredientDetector(): IngredientDetector {
  if (cachedDetector) return cachedDetector;

  const tflite = new TfliteIngredientDetector();
  cachedDetector = tflite.isAvailable() ? tflite : new SimulatedIngredientDetector();
  return cachedDetector;
}

/** Solo para tests: descarta el detector memorizado. */
export function resetDetectorCache(): void {
  cachedDetector = null;
}
