import type { DetectedIngredient, IngredientDetector } from './types';
import { getSupportedIngredientIds } from './ingredientCatalog';

/**
 * Detector de reemplazo que NO hace visión por computadora.
 *
 * Existe para que el flujo completo de la Fase 2 (cámara → detección →
 * comparación con el paso actual → feedback) sea usable y testeable en
 * Expo Go, donde no hay runtime nativo de TFLite. Va revelando de a uno
 * los ingredientes esperados del paso, simulando el reconocimiento
 * progresivo de una cámara real.
 *
 * En un development build con el modelo cargado, `getIngredientDetector()`
 * elige el detector de TFLite y este queda sin uso.
 */
export class SimulatedIngredientDetector implements IngredientDetector {
  readonly name = 'Simulado (sin modelo nativo)';

  private expectedIngredientIds: string[] = [];
  private revealedCount = 0;

  isAvailable(): boolean {
    return true;
  }

  /** Define qué ingredientes debería "ver" la cámara y reinicia el progreso. */
  setExpectedIngredients(ingredientIds: string[]): void {
    const supported = new Set(getSupportedIngredientIds());
    this.expectedIngredientIds = ingredientIds.filter((id) => supported.has(id));
    this.revealedCount = 0;
  }

  reset(): void {
    this.revealedCount = 0;
  }

  async detect(): Promise<DetectedIngredient[]> {
    if (this.revealedCount < this.expectedIngredientIds.length) {
      this.revealedCount += 1;
    }

    return this.expectedIngredientIds
      .slice(0, this.revealedCount)
      .map((ingredientId) => ({
        ingredientId,
        rawLabel: ingredientId,
        confidence: 0.9,
      }));
  }
}
