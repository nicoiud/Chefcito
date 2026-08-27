/**
 * Preparación del frame para el modelo.
 *
 * YOLOv8n exportado espera un tensor NCHW [1, 3, S, S] con los canales RGB
 * normalizados a 0..1. La cámara entrega píxeles RGBA en orden HWC, así que
 * hay que reordenar, redimensionar y normalizar.
 *
 * Es la parte del pipeline donde se esconden los bugs difíciles (canales
 * permutados, alto/ancho invertidos, normalización olvidada), y ninguno de
 * esos se ve a simple vista: el modelo no falla, simplemente detecta mal.
 * Por eso es una función pura y testeada, separada de la cámara.
 */

/** Redimensionado por vecino más cercano: barato y suficiente para 320x320. */
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

  for (let y = 0; y < targetSize; y += 1) {
    const sourceY = Math.min(
      sourceHeight - 1,
      Math.floor((y * sourceHeight) / targetSize)
    );

    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = Math.min(
        sourceWidth - 1,
        Math.floor((x * sourceWidth) / targetSize)
      );

      const source = (sourceY * sourceWidth + sourceX) * 4;
      const target = y * targetSize + x;

      // NCHW: los tres canales van en planos separados, no intercalados.
      tensor[target] = rgba[source] / 255;
      tensor[plane + target] = rgba[source + 1] / 255;
      tensor[2 * plane + target] = rgba[source + 2] / 255;
    }
  }

  return tensor;
}
