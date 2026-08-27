/**
 * Lógica de comparación entre ingredientes detectados por la cámara (Fase 2)
 * e ingredientes esperados según el paso actual de la receta.
 *
 * Es una función pura, sin dependencias de cámara/modelo, para poder
 * desarrollarla y testearla antes de tener la detección on-device lista.
 * Cuando `featureFlags.cameraIngredientDetection` se active, el resultado
 * del modelo TFLite/Core ML se pasa acá como `detectedIngredientIds`.
 */

export interface IngredientMatchResult {
  /** Ingredientes esperados que sí fueron detectados. */
  matched: string[];
  /** Ingredientes esperados que todavía faltan detectar. */
  missing: string[];
  /** Ingredientes detectados que no forman parte del paso actual. */
  extra: string[];
  /** true si todos los ingredientes esperados fueron detectados. */
  isComplete: boolean;
}

function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function matchIngredients(
  expectedIngredientIds: string[],
  detectedIngredientIds: string[]
): IngredientMatchResult {
  const expected = expectedIngredientIds.map(normalizeId);
  const detected = new Set(detectedIngredientIds.map(normalizeId));
  const expectedSet = new Set(expected);

  const matched = expected.filter((id) => detected.has(id));
  const missing = expected.filter((id) => !detected.has(id));
  const extra = [...detected].filter((id) => !expectedSet.has(id));

  return {
    matched,
    missing,
    extra,
    isComplete: missing.length === 0 && expected.length > 0,
  };
}
