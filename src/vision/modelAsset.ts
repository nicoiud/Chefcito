/**
 * Punto único de carga del modelo de visión.
 *
 * Metro resuelve los `require` literales al armar el bundle, incluso los que
 * están detrás de un `if`. Por eso el require del `.tflite` vive acá y no en
 * el detector: es un solo lugar que tocar al cambiar de modelo.
 *
 * El modelo que se distribuye es YOLOv8n pre-entrenado en COCO, exportado a
 * LiteRT/TFLite con cuantización INT8 dinámica (3,2 MB, entrada 320x320).
 * Reconoce de verdad 5 ingredientes del catálogo — banana, manzana, naranja,
 * brócoli y zanahoria — porque son clases de COCO. Los ingredientes centrales
 * de las recetas (tomate, cebolla, papa, huevo, ajo) NO están en COCO y
 * requieren fine-tuning: ver `docs/VISION_MODEL.md` y `ml/`.
 *
 * Para que el require funcione hay que declarar la extensión en Metro
 * (ver metro.config.js) y correr en un development build: el runtime de
 * TFLite es nativo y no existe en Expo Go.
 */
export function loadModelAsset(): unknown | null {
  try {
    return require('../../assets/models/yolov8n-coco-320-w8a32.tflite');
  } catch {
    return null;
  }
}
