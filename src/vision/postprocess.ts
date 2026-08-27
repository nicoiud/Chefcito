import {
  DETECTION_CONFIDENCE_THRESHOLD,
  resolveIngredientId,
} from './ingredientCatalog';
import type { DetectedIngredient } from './types';

/** Salida cruda de un modelo de detección, antes de mapear al catálogo. */
export interface RawDetection {
  label: string;
  confidence: number;
}

/**
 * Convierte la salida cruda del modelo en ingredientes del catálogo:
 * descarta lo que está por debajo del umbral, ignora etiquetas que no son
 * ingredientes conocidos y, ante duplicados, conserva la detección de mayor
 * confianza. El resultado queda ordenado de mayor a menor confianza.
 *
 * Es lógica pura para poder testearla sin cámara ni modelo cargado.
 */
export function mapModelOutputToIngredients(
  rawDetections: RawDetection[],
  threshold: number = DETECTION_CONFIDENCE_THRESHOLD
): DetectedIngredient[] {
  const bestByIngredient = new Map<string, DetectedIngredient>();

  for (const raw of rawDetections) {
    if (raw.confidence < threshold) continue;

    const ingredientId = resolveIngredientId(raw.label);
    if (!ingredientId) continue;

    const existing = bestByIngredient.get(ingredientId);
    if (existing && existing.confidence >= raw.confidence) continue;

    bestByIngredient.set(ingredientId, {
      ingredientId,
      rawLabel: raw.label,
      confidence: raw.confidence,
    });
  }

  return [...bestByIngredient.values()].sort((a, b) => b.confidence - a.confidence);
}
