const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Copia el modelo .onnx a los assets nativos de Android.
 *
 * ViroObjectDetector carga el modelo por nombre desde el bundle **nativo**,
 * no desde Metro, así que no alcanza con tenerlo en assets/ y requerirlo.
 * Tiene que estar en android/app/src/main/assets/.
 *
 * Y no se puede copiar a mano: `android/` lo regenera `expo prebuild`, que
 * en EAS corre en sus servidores, donde no hay forma de meter un paso
 * manual. Por eso es un config plugin — corre como parte del prebuild, acá
 * y allá igual.
 *
 * Si el modelo no está, el build sigue: la app arranca y la AR funciona,
 * solo que sin reconocer ingredientes. Es mejor que romper el build de todo
 * el mundo por un archivo que se genera aparte con una GPU.
 */
const NOMBRE_MODELO = 'chefcito-ingredientes.onnx';

module.exports = function withOnnxModel(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const raiz = cfg.modRequest.projectRoot;
      const origen = path.join(raiz, 'assets', 'models', NOMBRE_MODELO);

      if (!fs.existsSync(origen)) {
        console.warn(
          `[chefcito] No encontré assets/models/${NOMBRE_MODELO}. ` +
            'La app se compila igual, pero el reconocimiento de ingredientes ' +
            'va a quedar apagado. Generalo con: python ml/export_yoloe.py'
        );
        return cfg;
      }

      const destinoDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      fs.mkdirSync(destinoDir, { recursive: true });
      fs.copyFileSync(origen, path.join(destinoDir, NOMBRE_MODELO));
      console.log(`[chefcito] modelo copiado a android/app/src/main/assets/${NOMBRE_MODELO}`);
      return cfg;
    },
  ]);
};
