import type { IngredientMarker } from './types';

/**
 * Proyección cenital de los marcadores a coordenadas de pantalla.
 *
 * Es la base de la "guía de mesada": un plano visto desde arriba que muestra
 * dónde va cada ingrediente. Sirve como respaldo donde no hay AR (Expo Go,
 * web, dispositivos sin ARKit/ARCore) y también como mini-mapa dentro de la
 * vista AR.
 *
 * Se proyecta el plano horizontal del mundo (x, z) al plano de la pantalla:
 *   - el eje x del mundo va al eje horizontal de la pantalla;
 *   - el eje z del mundo (profundidad) va al eje vertical: en AR "adelante"
 *     es -z y en pantalla "arriba" es -y, así que los dos ejes ya apuntan
 *     en el mismo sentido y no hace falta invertir nada.
 * La altura (y) se ignora: los marcadores están todos sobre la mesada.
 */

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ProjectedMarker extends IngredientMarker {
  screen: ScreenPoint;
}

export interface ProjectionOptions {
  width: number;
  height: number;
  /** Margen en píxeles para que los marcadores no queden pegados al borde. */
  padding?: number;
}

/**
 * Escala los marcadores para que entren en el área disponible conservando
 * las proporciones — si se estirara cada eje por separado, la disposición
 * real de la mesada se vería deformada.
 */
export function projectToTopDown(
  markers: IngredientMarker[],
  { width, height, padding = 40 }: ProjectionOptions
): ProjectedMarker[] {
  if (markers.length === 0) return [];

  const usableWidth = Math.max(1, width - padding * 2);
  const usableHeight = Math.max(1, height - padding * 2);

  const xs = markers.map((m) => m.position.x);
  const zs = markers.map((m) => m.position.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;

  // Un solo marcador (o todos alineados) no define una escala: se centra.
  const scale =
    spanX === 0 && spanZ === 0
      ? 0
      : Math.min(
          spanX === 0 ? Infinity : usableWidth / spanX,
          spanZ === 0 ? Infinity : usableHeight / spanZ
        );

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return markers.map((marker) => ({
    ...marker,
    screen: {
      x: width / 2 + (marker.position.x - centerX) * scale,
      // Se suma, no se resta: "adelante" ya es -z en AR, y en pantalla
      // arriba también es la dirección negativa del eje. Restar acá
      // dejaría los marcadores lejanos abajo en lugar de arriba.
      y: height / 2 + (marker.position.z - centerZ) * scale,
    },
  }));
}
