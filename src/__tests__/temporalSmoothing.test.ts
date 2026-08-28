import { TemporalSmoother } from '../vision/temporalSmoothing';
import { preprocessToTensor, computeLetterbox, LETTERBOX_FILL } from '../vision/preprocess';
import type { DetectedIngredient } from '../vision/types';

const det = (id: string, conf = 0.8): DetectedIngredient => ({
  ingredientId: id,
  rawLabel: id,
  confidence: conf,
});

const ids = (result: DetectedIngredient[]) => result.map((d) => d.ingredientId).sort();

describe('TemporalSmoother', () => {
  it('no confirma nada con un solo cuadro', () => {
    const s = new TemporalSmoother();
    expect(s.push([det('papa')])).toEqual([]);
  });

  it('confirma cuando aparece en dos cuadros', () => {
    const s = new TemporalSmoother();
    s.push([det('papa')]);
    expect(ids(s.push([det('papa')]))).toEqual(['papa']);
  });

  it('ignora una detección espuria de un solo cuadro', () => {
    const s = new TemporalSmoother();
    s.push([det('papa')]);
    s.push([det('papa'), det('banana')]); // banana aparece una sola vez
    const out = s.push([det('papa')]);
    expect(ids(out)).toEqual(['papa']);
  });

  it('sostiene la detección cuando una mano tapa el ingrediente un cuadro', () => {
    const s = new TemporalSmoother();
    s.push([det('papa')]);
    s.push([det('papa')]);
    // Cuadro ocluido: no se ve nada, pero no debería borrarse.
    expect(ids(s.push([]))).toEqual(['papa']);
  });

  it('olvida lo que dejó de estar durante toda la ventana', () => {
    const s = new TemporalSmoother({ windowSize: 3, minHits: 2 });
    s.push([det('papa')]);
    s.push([det('papa')]);
    s.push([]);
    s.push([]);
    expect(s.push([])).toEqual([]);
  });

  it('reporta la mejor confianza vista en la ventana', () => {
    const s = new TemporalSmoother();
    s.push([det('papa', 0.4)]);
    const out = s.push([det('papa', 0.9)]);
    expect(out[0].confidence).toBeCloseTo(0.9, 5);
  });

  it('ordena por confianza', () => {
    const s = new TemporalSmoother();
    s.push([det('papa', 0.5), det('cebolla', 0.95)]);
    const out = s.push([det('papa', 0.5), det('cebolla', 0.95)]);
    expect(out.map((d) => d.ingredientId)).toEqual(['cebolla', 'papa']);
  });

  it('reset borra la historia al cambiar de paso', () => {
    const s = new TemporalSmoother();
    s.push([det('papa')]);
    s.push([det('papa')]);
    s.reset();
    expect(s.push([det('papa')])).toEqual([]);
  });

  it('respeta una ventana configurada', () => {
    const s = new TemporalSmoother({ windowSize: 5, minHits: 3 });
    s.push([det('papa')]);
    s.push([det('papa')]);
    expect(s.push([det('papa')]).length).toBe(1);
  });

  it('no permite exigir más aciertos que el tamaño de la ventana', () => {
    const s = new TemporalSmoother({ windowSize: 2, minHits: 99 });
    s.push([det('papa')]);
    expect(ids(s.push([det('papa')]))).toEqual(['papa']);
  });
});

describe('computeLetterbox', () => {
  it('no escala una imagen que ya es cuadrada', () => {
    const box = computeLetterbox(320, 320, 320);
    expect(box.scale).toBeCloseTo(1, 5);
    expect(box.offsetX).toBe(0);
    expect(box.offsetY).toBe(0);
  });

  it('centra una imagen apaisada dejando franjas arriba y abajo', () => {
    const box = computeLetterbox(640, 480, 320);
    expect(box.scaledWidth).toBe(320);
    expect(box.scaledHeight).toBe(240);
    expect(box.offsetX).toBe(0);
    expect(box.offsetY).toBe(40);
  });

  it('centra una imagen vertical dejando franjas a los costados', () => {
    const box = computeLetterbox(480, 640, 320);
    expect(box.scaledWidth).toBe(240);
    expect(box.scaledHeight).toBe(320);
    expect(box.offsetX).toBe(40);
    expect(box.offsetY).toBe(0);
  });

  it('conserva la proporción original', () => {
    const box = computeLetterbox(1920, 1080, 320);
    expect(box.scaledWidth / box.scaledHeight).toBeCloseTo(1920 / 1080, 2);
  });
});

describe('preprocessToTensor con letterbox', () => {
  /** Imagen 4x2 (apaisada) toda roja. */
  const ancha = new Uint8Array(4 * 2 * 4);
  for (let i = 0; i < 4 * 2; i += 1) {
    ancha[i * 4] = 255;
    ancha[i * 4 + 3] = 255;
  }

  it('produce el tensor del tamaño correcto', () => {
    expect(preprocessToTensor(ancha, 4, 2, 4).length).toBe(3 * 4 * 4);
  });

  it('rellena con gris las franjas que la imagen no cubre', () => {
    const t = preprocessToTensor(ancha, 4, 2, 4);
    // Una imagen 4x2 en un cuadro de 4 ocupa las filas 1 y 2; la fila 0 es relleno.
    expect(t[0]).toBeCloseTo(LETTERBOX_FILL, 5);
    expect(t[16 + 0]).toBeCloseTo(LETTERBOX_FILL, 5);
  });

  it('no deforma: la imagen ocupa solo la franja que le corresponde', () => {
    const t = preprocessToTensor(ancha, 4, 2, 4);
    const plane = 16;
    // Fila 1 (dentro de la imagen): rojo puro, verde en cero.
    expect(t[4]).toBeCloseTo(1, 5);
    expect(t[plane + 4]).toBeCloseTo(0, 5);
  });

  it('sigue rechazando dimensiones inválidas y buffers cortos', () => {
    expect(() => preprocessToTensor(ancha, 0, 2, 4)).toThrow(/Dimensiones inválidas/);
    expect(() => preprocessToTensor(new Uint8Array(4), 4, 2, 4)).toThrow(/incompleto/);
  });
});
