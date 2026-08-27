import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';
import { preprocessToTensor } from './preprocess';
import { COCO_MODEL_INPUT_SIZE } from './cocoLabels';

/**
 * Convierte la foto que devuelve `expo-camera` en el tensor que espera el
 * modelo.
 *
 * El orden importa por rendimiento: primero se **redimensiona** el JPEG a
 * 320x320 con el redimensionador nativo, y recién entonces se decodifica a
 * píxeles en JavaScript. Decodificar la foto a resolución completa y
 * después achicarla haría el trabajo pesado en JS y tardaría cientos de
 * milisegundos por frame.
 *
 * `jpeg-js` es JavaScript puro, así que este paso no agrega ninguna
 * dependencia nativa: lo único que necesita development build es la
 * inferencia con TFLite.
 */

/** Convierte base64 a bytes sin depender de Buffer ni de atob del navegador. */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  let buffer = 0;
  let bitsCollected = 0;

  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64_CHARS.indexOf(clean[i]);
    if (value === -1) continue;

    buffer = (buffer << 6) | value;
    bitsCollected += 6;

    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes[byteIndex] = (buffer >> bitsCollected) & 0xff;
      byteIndex += 1;
    }
  }

  return byteIndex === bytes.length ? bytes : bytes.subarray(0, byteIndex);
}

/**
 * Redimensiona, decodifica y normaliza la foto de la cámara.
 * Devuelve el tensor NCHW [1,3,320,320] listo para el modelo.
 */
export async function frameToTensor(
  uri: string,
  size: number = COCO_MODEL_INPUT_SIZE
): Promise<Float32Array> {
  const resized = await manipulateAsync(uri, [{ resize: { width: size, height: size } }], {
    base64: true,
    compress: 0.9,
    format: SaveFormat.JPEG,
  });

  if (!resized.base64) {
    throw new Error('No se pudo redimensionar el frame de la cámara.');
  }

  const { data, width, height } = decodeJpeg(base64ToBytes(resized.base64), {
    useTArray: true,
  });

  return preprocessToTensor(data, width, height, size);
}
