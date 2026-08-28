import type { DetectedIngredient } from './types';

/**
 * Correcciones del usuario sobre lo que ve la cámara (Fase 2).
 *
 * Ningún modelo de visión reconoce todos los ingredientes: el catálogo se
 * limita a lo que hay anotado en datasets públicos, y cosas como la sal o
 * el caldo no son detectables ni en principio. En vez de dejar al usuario
 * trabado cuando el modelo falla, se le da la última palabra.
 *
 * Hay dos mecanismos, que resuelven problemas distintos:
 *
 * 1. **Confirmación manual** — "esto ya lo tengo". El usuario marca a mano
 *    un ingrediente que el modelo no ve. Desbloquea el paso al instante y
 *    no depende de la cobertura del modelo.
 *
 * 2. **Corrección de etiqueta** — "esto no es una manzana, es un tomate".
 *    Cuando el modelo detecta mal, el usuario corrige. La corrección se
 *    guarda y se vuelve a aplicar cada vez que el modelo emita esa misma
 *    etiqueta, así el error no se repite. Además queda registrada para
 *    poder reentrenar con esos casos (ver `ml/README.md`).
 */

export interface LabelCorrection {
  /** Etiqueta cruda que emitió el modelo (por ejemplo "apple"). */
  rawLabel: string;
  /** Id del ingrediente que el usuario dice que realmente es. */
  ingredientId: string;
  /** Cuándo se corrigió, para poder priorizar las más recientes. */
  correctedAt: string;
}

/** Estado de las correcciones que la app tiene guardadas. */
export interface CorrectionsState {
  /** Correcciones de etiqueta, indexadas por la etiqueta cruda del modelo. */
  byRawLabel: Record<string, string>;
  /** Historial completo, para poder exportarlo y reentrenar. */
  history: LabelCorrection[];
}

export const EMPTY_CORRECTIONS: CorrectionsState = { byRawLabel: {}, history: [] };

function normalizeLabel(rawLabel: string): string {
  return rawLabel.trim().toLowerCase();
}

/**
 * Registra que `rawLabel` en realidad era `ingredientId`.
 * Si ya existía una corrección para esa etiqueta, la más nueva la reemplaza:
 * el usuario siempre tiene la última palabra.
 */
export function addCorrection(
  state: CorrectionsState,
  rawLabel: string,
  ingredientId: string,
  now: Date = new Date()
): CorrectionsState {
  const key = normalizeLabel(rawLabel);
  if (!key || !ingredientId) return state;

  return {
    byRawLabel: { ...state.byRawLabel, [key]: ingredientId },
    history: [
      ...state.history,
      { rawLabel: key, ingredientId, correctedAt: now.toISOString() },
    ],
  };
}

/** Olvida la corrección de una etiqueta (por si el usuario se equivocó). */
export function removeCorrection(
  state: CorrectionsState,
  rawLabel: string
): CorrectionsState {
  const key = normalizeLabel(rawLabel);
  if (!(key in state.byRawLabel)) return state;

  const byRawLabel = { ...state.byRawLabel };
  delete byRawLabel[key];
  return { ...state, byRawLabel };
}

/**
 * Reemplaza el ingrediente de las detecciones cuyo `rawLabel` fue corregido.
 *
 * Si dos detecciones distintas terminan apuntando al mismo ingrediente
 * (porque el usuario corrigió una hacia algo que el modelo ya detectaba),
 * se conserva la de mayor confianza para no duplicar.
 */
export function applyCorrections(
  detections: DetectedIngredient[],
  state: CorrectionsState
): DetectedIngredient[] {
  const bestByIngredient = new Map<string, DetectedIngredient>();

  for (const detection of detections) {
    const corrected = state.byRawLabel[normalizeLabel(detection.rawLabel)];
    const ingredientId = corrected ?? detection.ingredientId;
    const result = { ...detection, ingredientId };

    const existing = bestByIngredient.get(ingredientId);
    if (existing && existing.confidence >= result.confidence) continue;
    bestByIngredient.set(ingredientId, result);
  }

  return [...bestByIngredient.values()].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Combina lo que detectó la cámara con lo que el usuario confirmó a mano.
 * Las confirmaciones manuales valen siempre: son la última palabra.
 */
export function mergeWithManualConfirmations(
  detectedIngredientIds: string[],
  manuallyConfirmedIds: string[]
): string[] {
  return [...new Set([...detectedIngredientIds, ...manuallyConfirmedIds])];
}
