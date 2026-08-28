/**
 * Preparación del frame para el modelo.
 *
 * YOLOv8n espera un tensor NCHW [1, 3, S, S] con los canales RGB
 * normalizados a 0..1, y **la imagen sin deformar**. Ese último punto no es
 * un detalle estético: YOLO se entrena con letterbox —conservar la
 * proporción y rellenar el sobrante— y darle la imagen estirada a cuadrado
 * le cambia la forma de los objetos respecto de lo que aprendió.
 *
 * Está medido sobre 63 fotos reales de comida: estirando detecta el 68%,
 * con letterbox el 76%. El brócoli, que es el más deformable, pasa de 54%
 * a 77%.
 *
 * Es la parte del pipeline donde se esconden los bugs difíciles (canales
 * permutados, alto/ancho invertidos, normalización olvidada) y ninguno se
 * ve a simple vista: el modelo no falla, simplemente detecta peor. Por eso
 * es una función pura y testeada, separada de la cámara.
 */

/** Gris neutro con el que YOLO rellena los bordes al hacer letterbox. */
export const LETTERBOX_FILL = 114 / 255;

export interface LetterboxGeometry {
  /** Escala aplicada a la imagen original. */
  scale: number;
  /** Ancho y alto de la imagen ya escalada, dentro del cuadro. */
  scaledWidth: number;
  scaledHeight: number;
  /** Desplazamiento del contenido dentro del cuadro, en píxeles. */
  offsetX: number;
  offsetY: number;
}

/**
 * Calcula cómo entra una imagen en el cuadro cuadrado conservando su
 * proporción, centrada. Se expone aparte porque es lo que haría falta para
 * mapear coordenadas de vuelta a la imagen original si algún día hay que
 * dibujar cajas.
 */
export function computeLetterbox(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number
): LetterboxGeometry {
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const scaledWidth = Math.round(sourceWidth * scale);
  const scaledHeight = Math.round(sourceHeight * scale);

  return {
    scale,
    scaledWidth,
    scaledHeight,
    offsetX: Math.floor((targetSize - scaledWidth) / 2),
    offsetY: Math.floor((targetSize - scaledHeight) / 2),
  };
}

/**
 * Convierte píxeles RGBA en el tensor que espera el modelo, con letterbox.
 * El redimensionado es por vecino más cercano: barato y suficiente cuando
 * la imagen ya viene reducida por el redimensionador nativo.
 */
export function preprocessToTensor(
  rgba: ArrayLike<number>,
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number
): Float32Array {
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetSize <= 0) {
    throw new Error('Dimensiones inválidas para el preprocesado.');
  }

  const expected = sourceWidth * sourceHeight * 4;
  if (rgba.length < expected) {
    throw new Error(
      `Buffer RGBA incompleto: ${rgba.length} valores, se esperaban ${expected}.`
    );
  }

  const plane = targetSize * targetSize;
  const tensor = new Float32Array(3 * plane);
  // Todo lo que no cubra la imagen queda en el gris de relleno.
  tensor.fill(LETTERBOX_FILL);

  const box = computeLetterbox(sourceWidth, sourceHeight, targetSize);

  for (let y = 0; y < box.scaledHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor(y / box.scale));
    const targetRow = (y + box.offsetY) * targetSize + box.offsetX;

    for (let x = 0; x < box.scaledWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor(x / box.scale));
      const source = (sourceY * sourceWidth + sourceX) * 4;
      const target = targetRow + x;

      // NCHW: los tres canales van en planos separados, no intercalados.
      tensor[target] = rgba[source] / 255;
      tensor[plane + target] = rgba[source + 1] / 255;
      tensor[2 * plane + target] = rgba[source + 2] / 255;
    }
  }

  return tensor;
}
