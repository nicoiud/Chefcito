import type { ArSession } from './types';
import { ViroArSession } from './viroSession';

export type {
  ArPosition,
  ArSession,
  ArTrackingState,
  IngredientMarker,
  MarkerState,
} from './types';
export { buildMarkers, positionInArc } from './markerLayout';

let cachedSession: ArSession | null = null;

/**
 * Devuelve la sesión de AR si el dispositivo puede usarla.
 *
 * Null significa que no hay AR disponible (Expo Go, web, o un dispositivo
 * sin ARKit/ARCore) y que la pantalla debe usar la guía 2D.
 */
export function getArSession(): ArSession | null {
  if (!cachedSession) {
    const viro = new ViroArSession();
    if (!viro.isAvailable()) return null;
    cachedSession = viro;
  }
  return cachedSession;
}

export function isArAvailable(): boolean {
  return getArSession() !== null;
}
