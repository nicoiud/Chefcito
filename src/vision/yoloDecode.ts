import type { RawDetection } from './postprocess';

/**
 * Decodificación de la salida cruda de YOLOv8.
 *
 * El modelo devuelve un tensor [1, 4 + numClasses, numAnchors] aplanado en
 * orden row-major: primero las 4 filas de la caja (cx, cy, w, h) y después
 * una fila por clase, cada una con un score por anchor.
 *
 *   índice(canal, anchor) = canal * numAnchors + anchor
 *
 * La app solo necesita saber **si** un ingrediente está presente, no dónde
 * está. Eso permite quedarse con el score máximo de cada clase entre todos
 * los anchors y saltear por completo el NMS (Non-Maximum Suppression), que
 * es la parte cara de un post-procesado de detección. Si en el futuro hay
 * que dibujar cajas (por ejemplo para la Fase 4), acá es donde hay que
 * agregar la decodificación de coordenadas y el NMS.
 */

export const YOLO_BOX_CHANNELS = 4;

export interface YoloDecodeOptions {
  /** Etiquetas del modelo, en el orden de sus índices de clase. */
  labels: string[];
  /** Cantidad de anchors (por ejemplo 2100 para imgsz=320). */
  numAnchors: number;
  /** Score mínimo para incluir una clase en el resultado. */
  minScore?: number;
}

/**
 * Devuelve, por cada clase que supere el umbral, su score máximo.
 * El resultado va al mapeo del catálogo (`mapModelOutputToIngredients`).
 */
export function decodeYoloOutput(
  output: ArrayLike<number>,
  { labels, numAnchors, minScore = 0.25 }: YoloDecodeOptions
): RawDetection[] {
  if (numAnchors <= 0 || labels.length === 0) return [];

  const expectedLength = (YOLO_BOX_CHANNELS + labels.length) * numAnchors;
  if (output.length < expectedLength) {
    throw new Error(
      `Salida del modelo inesperada: ${output.length} valores, ` +
        `se esperaban al menos ${expectedLength}.`
    );
  }

  const detections: RawDetection[] = [];

  for (let classIndex = 0; classIndex < labels.length; classIndex += 1) {
    const rowStart = (YOLO_BOX_CHANNELS + classIndex) * numAnchors;

    let best = 0;
    for (let anchor = 0; anchor < numAnchors; anchor += 1) {
      const score = output[rowStart + anchor];
      if (score > best) best = score;
    }

    if (best >= minScore) {
      detections.push({ label: labels[classIndex], confidence: best });
    }
  }

  return detections;
}
