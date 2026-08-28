import type { DetectedIngredient } from './types';

/**
 * Suavizado temporal de las detecciones.
 *
 * Sin esto, cada cuadro se evalúa por separado y el resultado parpadea: un
 * ingrediente aparece y desaparece porque una mano lo tapó medio segundo, o
 * porque el modelo dudó en ese cuadro puntual. En una cocina eso se ve como
 * que la app "no se decide", que es peor que si directamente no detectara.
 *
 * La idea es simple: en vez de creerle a un cuadro, se mira una ventana de
 * los últimos cuadros y se exige que el ingrediente haya aparecido en varios.
 * Eso da dos cosas a la vez:
 *
 *  - **Estabilidad**: una oclusión breve no borra lo que ya estaba.
 *  - **Menos falsos positivos**: una detección espuria de un solo cuadro no
 *    llega a confirmarse, lo que permite bajar el umbral de confianza y
 *    ganar recall sin empezar a inventar.
 *
 * Es lógica pura para poder testear el comportamiento en el tiempo sin
 * cámara ni modelo.
 */

/** Cuántos cuadros recientes se tienen en cuenta. */
export const SMOOTHING_WINDOW = 4;
/** En cuántos de esos cuadros tiene que aparecer para darlo por presente. */
export const SMOOTHING_MIN_HITS = 2;

export interface SmoothingOptions {
  windowSize?: number;
  minHits?: number;
}

/**
 * Acumula los últimos cuadros y decide qué ingredientes están realmente
 * presentes. Es mutable a propósito: representa el estado de una sesión de
 * cámara, que avanza cuadro a cuadro.
 */
export class TemporalSmoother {
  private readonly windowSize: number;
  private readonly minHits: number;
  /** Ids detectados en cada cuadro reciente, del más viejo al más nuevo. */
  private frames: Set<string>[] = [];
  /** Mejor confianza vista por ingrediente dentro de la ventana. */
  private bestConfidence = new Map<string, number>();

  constructor({
    windowSize = SMOOTHING_WINDOW,
    minHits = SMOOTHING_MIN_HITS,
  }: SmoothingOptions = {}) {
    this.windowSize = Math.max(1, windowSize);
    this.minHits = Math.max(1, Math.min(minHits, this.windowSize));
  }

  /** Descarta la historia. Se usa al cambiar de paso. */
  reset(): void {
    this.frames = [];
    this.bestConfidence.clear();
  }

  /**
   * Suma un cuadro y devuelve los ingredientes confirmados, ordenados por
   * confianza. La confianza que se reporta es la mejor vista en la ventana:
   * es la que mejor representa "qué tan seguro está de que eso está ahí".
   */
  push(detections: DetectedIngredient[]): DetectedIngredient[] {
    const frame = new Set(detections.map((d) => d.ingredientId));
    this.frames.push(frame);
    if (this.frames.length > this.windowSize) this.frames.shift();

    for (const detection of detections) {
      const previous = this.bestConfidence.get(detection.ingredientId) ?? 0;
      if (detection.confidence > previous) {
        this.bestConfidence.set(detection.ingredientId, detection.confidence);
      }
    }

    const hits = new Map<string, number>();
    for (const past of this.frames) {
      for (const id of past) hits.set(id, (hits.get(id) ?? 0) + 1);
    }

    // Lo que ya no aparece en la ventana deja de contar, y su confianza
    // acumulada se olvida para que no reviva más adelante.
    for (const id of [...this.bestConfidence.keys()]) {
      if (!hits.has(id)) this.bestConfidence.delete(id);
    }

    const labelById = new Map(detections.map((d) => [d.ingredientId, d.rawLabel]));

    return [...hits.entries()]
      .filter(([, count]) => count >= this.minHits)
      .map(([ingredientId]) => ({
        ingredientId,
        rawLabel: labelById.get(ingredientId) ?? ingredientId,
        confidence: this.bestConfidence.get(ingredientId) ?? 0,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }
}
