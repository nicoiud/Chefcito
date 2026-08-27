/**
 * Punto único de activación del modelo de visión.
 *
 * Metro resuelve los `require` literales al armar el bundle, incluso los que
 * están detrás de un `if`. Por eso el require del `.tflite` no puede vivir en
 * el detector: haría fallar la compilación en cualquier checkout que no tenga
 * el modelo. Queda aislado acá, en una sola función.
 *
 * Para activar el modelo en un development build:
 *   1. npx expo install react-native-fast-tflite
 *   2. Copiar el modelo a assets/models/ingredients.tflite
 *   3. Agregar 'tflite' a `resolver.assetExts` en metro.config.js
 *   4. Reemplazar el cuerpo de esta función por:
 *        return require('../../assets/models/ingredients.tflite');
 *   5. npx expo prebuild && npx expo run:android
 */
export function loadModelAsset(): unknown | null {
  return null;
}
