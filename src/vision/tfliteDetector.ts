import type { DetectedIngredient, DetectionFrame, IngredientDetector } from './types';
import { mapModelOutputToIngredients, type RawDetection } from './postprocess';
import { loadModelAsset } from './modelAsset';

/**
 * Detector on-device respaldado por TensorFlow Lite / Core ML.
 *
 * Requiere un development build: `react-native-fast-tflite` es un módulo
 * nativo y no está incluido en Expo Go. Por eso el módulo se carga de forma
 * opcional — si no está instalado, este detector se reporta como no
 * disponible y la app cae al detector simulado sin romperse.
 *
 * Los pasos para activarlo están en src/vision/modelAsset.ts.
 *
 * El modelo esperado es un detector de objetos liviano (YOLOv8n o
 * MobileNet SSD) afinado sobre el catálogo de src/vision/ingredientCatalog.ts.
 * Ver docs/ARCHITECTURE.md para la justificación de esa elección.
 */

interface TfliteModule {
  loadTensorflowModel: (source: unknown) => Promise<TfliteModel>;
}

interface TfliteModel {
  run: (inputs: unknown[]) => Promise<unknown[]>;
}

function loadTfliteModule(): TfliteModule | null {
  try {
    // El require es dinámico a propósito: el paquete es opcional.
    return require('react-native-fast-tflite') as TfliteModule;
  } catch {
    return null;
  }
}

export class TfliteIngredientDetector implements IngredientDetector {
  readonly name = 'TensorFlow Lite (on-device)';

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
          'con react-native-fast-tflite y el archivo del modelo (ver src/vision/modelAsset.ts).'
      );
    }

    if (!this.model) {
      this.model = await this.module.loadTensorflowModel(this.modelAsset);
    }

    const outputs = await this.model.run([frame]);
    return mapModelOutputToIngredients(parseModelOutput(outputs));
  }
}

/**
 * Traduce la salida del modelo al formato intermedio `RawDetection`.
 * La forma exacta depende del checkpoint exportado, por eso queda aislada
 * acá: cambiar de modelo solo debería requerir cambiar esta función.
 */
function parseModelOutput(outputs: unknown[]): RawDetection[] {
  const [detections] = outputs;
  if (!Array.isArray(detections)) return [];

  return detections
    .filter(
      (d): d is { label: string; confidence: number } =>
        typeof d === 'object' &&
        d !== null &&
        typeof (d as { label?: unknown }).label === 'string' &&
        typeof (d as { confidence?: unknown }).confidence === 'number'
    )
    .map((d) => ({ label: d.label, confidence: d.confidence }));
}
