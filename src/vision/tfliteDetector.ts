import type { DetectedIngredient, DetectionFrame, IngredientDetector } from './types';
import { mapModelOutputToIngredients } from './postprocess';
import { loadModelAsset } from './modelAsset';
import { decodeYoloOutput } from './yoloDecode';
import { COCO_LABELS, COCO_MODEL_NUM_ANCHORS } from './cocoLabels';
import { getIngredientsCoveredByLabels } from './ingredientCatalog';

/**
 * Detector on-device respaldado por TensorFlow Lite / LiteRT.
 *
 * Requiere un development build: `react-native-fast-tflite` es un módulo
 * nativo y no está en Expo Go. Por eso se carga de forma opcional — si falta
 * el módulo o el modelo, el detector se reporta no disponible y la app cae al
 * detector simulado sin romperse. Los pasos de activación están en
 * `docs/VISION_MODEL.md`.
 */

interface TfliteModule {
  loadTensorflowModel: (source: unknown) => Promise<TfliteModel>;
}

interface TfliteModel {
  run: (inputs: unknown[]) => Promise<ArrayLike<number>[]>;
}

function loadTfliteModule(): TfliteModule | null {
  try {
    // Require dinámico a propósito: el paquete es opcional.
    return require('react-native-fast-tflite') as TfliteModule;
  } catch {
    return null;
  }
}

/** Ingredientes que el modelo distribuido reconoce de verdad. */
export function getModelCoveredIngredients(): string[] {
  return getIngredientsCoveredByLabels(COCO_LABELS);
}

export class TfliteIngredientDetector implements IngredientDetector {
  readonly name = 'YOLOv8n on-device (TFLite)';
  readonly requiresPixels = true;

  private module = loadTfliteModule();
  private modelAsset = loadModelAsset();
  private model: TfliteModel | null = null;

  /** Necesita las dos mitades: el runtime nativo y el archivo del modelo. */
  isAvailable(): boolean {
    return this.module !== null && this.modelAsset !== null;
  }

  async detect(frame: DetectionFrame): Promise<DetectedIngredient[]> {
    if (!this.module || !this.modelAsset) {
      throw new Error(
        'El modelo on-device no está disponible. Requiere un development build ' +
          'con react-native-fast-tflite (ver docs/VISION_MODEL.md).'
      );
    }

    if (!this.model) {
      this.model = await this.module.loadTensorflowModel(this.modelAsset);
    }

    const [output] = await this.model.run([frame.pixels]);
    const rawDetections = decodeYoloOutput(output, {
      labels: COCO_LABELS,
      numAnchors: COCO_MODEL_NUM_ANCHORS,
    });

    return mapModelOutputToIngredients(rawDetections);
  }
}
