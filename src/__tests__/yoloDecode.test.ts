import { decodeYoloOutput, YOLO_BOX_CHANNELS } from '../vision/yoloDecode';
import { preprocessToTensor } from '../vision/preprocess';
import { COCO_LABELS, COCO_MODEL_NUM_ANCHORS } from '../vision/cocoLabels';
import { getIngredientsCoveredByLabels } from '../vision/ingredientCatalog';

/** Arma una salida YOLO sintética [4+C, A] con los scores indicados. */
function buildOutput(
  labels: string[],
  numAnchors: number,
  scores: Record<number, Record<number, number>>
): Float32Array {
  const out = new Float32Array((YOLO_BOX_CHANNELS + labels.length) * numAnchors);
  for (const [classIndex, perAnchor] of Object.entries(scores)) {
    for (const [anchor, value] of Object.entries(perAnchor)) {
      out[(YOLO_BOX_CHANNELS + Number(classIndex)) * numAnchors + Number(anchor)] = value;
    }
  }
  return out;
}

describe('decodeYoloOutput', () => {
  const labels = ['tomato', 'onion', 'carrot'];

  it('toma el score máximo de cada clase entre todos los anchors', () => {
    const output = buildOutput(labels, 4, { 0: { 0: 0.3, 2: 0.91, 3: 0.5 } });
    const result = decodeYoloOutput(output, { labels, numAnchors: 4 });
    expect(result).toEqual([{ label: 'tomato', confidence: expect.closeTo(0.91, 5) }]);
  });

  it('descarta las clases que no superan el umbral', () => {
    const output = buildOutput(labels, 4, { 0: { 0: 0.9 }, 1: { 1: 0.1 } });
    const result = decodeYoloOutput(output, { labels, numAnchors: 4, minScore: 0.25 });
    expect(result.map((d) => d.label)).toEqual(['tomato']);
  });

  it('devuelve varias clases cuando todas superan el umbral', () => {
    const output = buildOutput(labels, 4, { 0: { 0: 0.8 }, 2: { 3: 0.7 } });
    const result = decodeYoloOutput(output, { labels, numAnchors: 4 });
    expect(result.map((d) => d.label).sort()).toEqual(['carrot', 'tomato']);
  });

  it('ignora los cuatro canales de la caja al leer los scores', () => {
    // Valores altos en cx/cy/w/h no deben interpretarse como clases.
    const output = new Float32Array((YOLO_BOX_CHANNELS + labels.length) * 4);
    for (let i = 0; i < YOLO_BOX_CHANNELS * 4; i += 1) output[i] = 0.99;
    const result = decodeYoloOutput(output, { labels, numAnchors: 4 });
    expect(result).toEqual([]);
  });

  it('falla con un mensaje claro si la salida es más chica de lo esperado', () => {
    expect(() =>
      decodeYoloOutput(new Float32Array(10), { labels, numAnchors: 4 })
    ).toThrow(/se esperaban al menos/);
  });

  it('devuelve vacío si no hay clases o anchors', () => {
    expect(decodeYoloOutput(new Float32Array(0), { labels: [], numAnchors: 0 })).toEqual([]);
  });

  it('funciona con la geometría real del modelo distribuido', () => {
    const carrot = COCO_LABELS.indexOf('carrot');
    const output = buildOutput(COCO_LABELS, COCO_MODEL_NUM_ANCHORS, {
      [carrot]: { 1500: 0.77 },
    });
    const result = decodeYoloOutput(output, {
      labels: COCO_LABELS,
      numAnchors: COCO_MODEL_NUM_ANCHORS,
    });
    expect(result).toEqual([{ label: 'carrot', confidence: expect.closeTo(0.77, 5) }]);
  });
});

describe('cobertura real del modelo distribuido', () => {
  it('cubre solo los ingredientes que COCO sabe reconocer', () => {
    expect(getIngredientsCoveredByLabels(COCO_LABELS).sort()).toEqual([
      'banana',
      'brocoli',
      'manzana',
      'naranja',
      'zanahoria',
    ]);
  });

  it('no cubre los ingredientes centrales de las recetas', () => {
    const covered = getIngredientsCoveredByLabels(COCO_LABELS);
    for (const id of ['tomate', 'cebolla', 'papa', 'huevo', 'ajo']) {
      expect(covered).not.toContain(id);
    }
  });
});

describe('preprocessToTensor', () => {
  /** Imagen 2x2 con un color plano por píxel. */
  const rgba2x2 = new Uint8Array([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]);

  it('produce un tensor NCHW del tamaño correcto', () => {
    const tensor = preprocessToTensor(rgba2x2, 2, 2, 2);
    expect(tensor.length).toBe(3 * 2 * 2);
  });

  it('separa los canales en planos y normaliza a 0..1', () => {
    const tensor = preprocessToTensor(rgba2x2, 2, 2, 2);
    const plane = 4;
    // Primer píxel es rojo puro: R=1, G=0, B=0 en sus planos respectivos.
    expect(tensor[0]).toBeCloseTo(1);
    expect(tensor[plane]).toBeCloseTo(0);
    expect(tensor[2 * plane]).toBeCloseTo(0);
    // Segundo píxel es verde puro.
    expect(tensor[1]).toBeCloseTo(0);
    expect(tensor[plane + 1]).toBeCloseTo(1);
  });

  it('descarta el canal alfa', () => {
    const opaque = preprocessToTensor(rgba2x2, 2, 2, 2);
    const transparent = new Uint8Array(rgba2x2);
    for (let i = 3; i < transparent.length; i += 4) transparent[i] = 0;
    expect(Array.from(preprocessToTensor(transparent, 2, 2, 2))).toEqual(
      Array.from(opaque)
    );
  });

  it('redimensiona a la resolución que pide el modelo', () => {
    const tensor = preprocessToTensor(rgba2x2, 2, 2, 320);
    expect(tensor.length).toBe(3 * 320 * 320);
  });

  it('rechaza un buffer RGBA incompleto', () => {
    expect(() => preprocessToTensor(new Uint8Array(4), 2, 2, 2)).toThrow(/incompleto/);
  });

  it('rechaza dimensiones inválidas', () => {
    expect(() => preprocessToTensor(rgba2x2, 0, 2, 2)).toThrow(/Dimensiones inválidas/);
  });
});
