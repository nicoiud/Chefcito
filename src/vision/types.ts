/**
 * Contrato de detección de ingredientes (Fase 2).
 *
 * La app depende únicamente de esta interfaz, nunca del modelo concreto.
 * Eso permite reemplazar el backend de visión (TFLite, Core ML, otro
 * checkpoint) sin tocar la UI ni la lógica de comparación.
 */

/** Un frame capturado por la cámara. */
export interface DetectionFrame {
  uri: string;
  width: number;
  height: number;
  /** JPEG en base64, disponible según cómo se capture el frame. */
  base64?: string;
  /**
   * Tensor de entrada ya preparado para el modelo: NCHW [1,3,S,S],
   * normalizado a 0..1. Lo produce `preprocessToTensor` a partir de los
   * píxeles RGBA del frame. Solo lo necesita el detector on-device.
   */
  pixels?: Float32Array;
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
  /**
   * true si `detect` necesita `DetectionFrame.pixels`. Preparar el tensor
   * cuesta tiempo, así que la pantalla solo lo hace si el backend lo usa.
   */
  readonly requiresPixels: boolean;
  /** Ejecuta inferencia sobre un frame y devuelve los ingredientes detectados. */
  detect(frame: DetectionFrame): Promise<DetectedIngredient[]>;
}
