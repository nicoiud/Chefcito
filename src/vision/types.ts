/**
 * Contrato de detección de ingredientes (Fase 2).
 *
 * La app depende únicamente de esta interfaz, nunca del modelo concreto.
 * Eso permite reemplazar el backend de visión (TFLite, Core ML, otro
 * checkpoint) sin tocar la UI ni la lógica de comparación.
 */

/** Un frame capturado por la cámara, listo para inferencia. */
export interface DetectionFrame {
  uri: string;
  width: number;
  height: number;
  /** JPEG en base64, disponible según cómo se capture el frame. */
  base64?: string;
}

export interface DetectedIngredient {
  /** Id del catálogo (coincide con los ids usados en las recetas). */
  ingredientId: string;
  /** Etiqueta cruda devuelta por el modelo, útil para debug. */
  rawLabel: string;
  /** Confianza entre 0 y 1. */
  confidence: number;
}

export interface IngredientDetector {
  /** Nombre legible del backend, se muestra en la UI para transparencia. */
  readonly name: string;
  /** true si este backend puede ejecutarse en el entorno actual. */
  isAvailable(): boolean;
  /** Ejecuta inferencia sobre un frame y devuelve los ingredientes detectados. */
  detect(frame: DetectionFrame): Promise<DetectedIngredient[]>;
}
