/**
 * Contrato de la sesión de AR (Fase 4).
 *
 * La app depende de esta interfaz, no del motor de AR. Eso permite cambiar
 * de backend (Viro, Unity, o lo que venga) sin tocar la UI ni la lógica de
 * marcadores, igual que en la Fase 2 con el detector de visión.
 */

/** Posición en metros, relativa al ancla en la superficie detectada. */
export interface ArPosition {
  x: number;
  /** Altura sobre el plano. Los marcadores flotan apenas por encima. */
  y: number;
  z: number;
}

export type MarkerState = 'pendiente' | 'confirmado';

export interface IngredientMarker {
  ingredientId: string;
  /** Texto que se muestra en el marcador. */
  label: string;
  position: ArPosition;
  state: MarkerState;
}

export type ArTrackingState =
  /** Todavía no se detectó ninguna superficie. */
  | 'buscando-superficie'
  /** Se detectó una superficie y falta que el usuario la toque. */
  | 'superficie-lista'
  /** Hay superficie y los marcadores están anclados. */
  | 'anclado'
  /** Hay poca luz o poca textura: ARCore no consigue puntos de referencia. */
  | 'poca-textura'
  /** El celular se mueve demasiado rápido para seguir el entorno. */
  | 'mucho-movimiento'
  /** Se perdió el seguimiento: conviene ofrecer recalibrar. */
  | 'perdido';

export interface ArSession {
  /** Nombre legible del backend, se muestra en la UI para transparencia. */
  readonly name: string;
  /** true si este backend puede ejecutarse en el dispositivo actual. */
  isAvailable(): boolean;
}
