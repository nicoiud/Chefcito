import { getDisplayName } from '../vision/ingredientCatalog';
import type { IngredientMarker, ArPosition } from './types';

/**
 * Disposición de los marcadores sobre la superficie detectada (Fase 4).
 *
 * Es lógica pura a propósito: la geometría es la parte que se puede razonar
 * y testear sin hardware de AR, y también donde más fácil se cuelan errores
 * (marcadores encimados, fuera de alcance, o detrás del usuario). El motor
 * de AR solo se encarga de anclar y dibujar lo que esta función decide.
 *
 * Sistema de coordenadas (el estándar de ARKit/ARCore):
 *   +x a la derecha, +y hacia arriba, -z hacia adelante (lejos del usuario).
 * El origen es el ancla, es decir el punto de la mesada que el usuario tocó.
 */

export interface MarkerLayoutOptions {
  /** Distancia del arco más cercano al ancla, en metros. */
  radius?: number;
  /** Apertura total del arco, en radianes. */
  arcSpan?: number;
  /** Altura a la que flotan los marcadores sobre el plano, en metros. */
  height?: number;
  /** Máximo de marcadores por arco antes de abrir uno más lejano. */
  maxPerRow?: number;
  /** Separación entre arcos sucesivos, en metros. */
  rowSpacing?: number;
}

const DEFAULTS = {
  // Una mesada típica es cómoda entre 30 y 60 cm del punto de referencia.
  radius: 0.35,
  // ~100 grados: ancho para separar bien, sin salirse del campo de visión.
  arcSpan: (100 * Math.PI) / 180,
  height: 0.02,
  maxPerRow: 4,
  rowSpacing: 0.22,
} as const;

/** Posición de un marcador dentro de un arco de `count` elementos. */
export function positionInArc(
  index: number,
  count: number,
  radius: number,
  arcSpan: number,
  height: number
): ArPosition {
  // Con un solo marcador va justo al frente; si no, se reparten parejo.
  const angle = count === 1 ? 0 : -arcSpan / 2 + (arcSpan * index) / (count - 1);

  return {
    x: round(radius * Math.sin(angle)),
    y: round(height),
    z: round(-radius * Math.cos(angle)),
  };
}

/** Redondeo a milímetros: evita ruido de punto flotante en las posiciones. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Arma los marcadores del paso actual.
 *
 * `detectedIngredientIds` viene de la Fase 2: los ingredientes que la cámara
 * ya reconoció se marcan como confirmados, que es el "modo verificación" que
 * pide la especificación.
 */
export function buildMarkers(
  expectedIngredientIds: string[],
  detectedIngredientIds: string[] = [],
  options: MarkerLayoutOptions = {}
): IngredientMarker[] {
  const { radius, arcSpan, height, maxPerRow, rowSpacing } = { ...DEFAULTS, ...options };

  if (expectedIngredientIds.length === 0) return [];

  const detected = new Set(detectedIngredientIds);
  const markers: IngredientMarker[] = [];

  for (let start = 0; start < expectedIngredientIds.length; start += maxPerRow) {
    const row = expectedIngredientIds.slice(start, start + maxPerRow);
    const rowIndex = Math.floor(start / maxPerRow);
    const rowRadius = radius + rowIndex * rowSpacing;

    row.forEach((ingredientId, indexInRow) => {
      markers.push({
        ingredientId,
        label: getDisplayName(ingredientId),
        position: positionInArc(indexInRow, row.length, rowRadius, arcSpan, height),
        state: detected.has(ingredientId) ? 'confirmado' : 'pendiente',
      });
    });
  }

  return markers;
}
