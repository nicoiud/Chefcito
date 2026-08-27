import { resolveIngredientId, getDisplayName } from '../vision/ingredientCatalog';
import { mapModelOutputToIngredients } from '../vision/postprocess';
import { SimulatedIngredientDetector } from '../vision/simulatedDetector';

describe('resolveIngredientId', () => {
  it('resuelve etiquetas en inglés del modelo al id del catálogo', () => {
    expect(resolveIngredientId('tomato')).toBe('tomate');
    expect(resolveIngredientId('onion')).toBe('cebolla');
    expect(resolveIngredientId('potato')).toBe('papa');
  });

  it('resuelve etiquetas en español y sinónimos regionales', () => {
    expect(resolveIngredientId('papa')).toBe('papa');
    expect(resolveIngredientId('patata')).toBe('papa');
    expect(resolveIngredientId('mantequilla')).toBe('manteca');
  });

  it('ignora mayúsculas y espacios', () => {
    expect(resolveIngredientId('  ToMaTo ')).toBe('tomate');
  });

  it('devuelve null para etiquetas que no son ingredientes', () => {
    expect(resolveIngredientId('person')).toBeNull();
    expect(resolveIngredientId('dining table')).toBeNull();
  });
});

describe('getDisplayName', () => {
  it('devuelve el nombre legible del ingrediente', () => {
    expect(getDisplayName('limon')).toBe('Limón');
  });

  it('cae al id cuando el ingrediente no está en el catálogo', () => {
    expect(getDisplayName('caldo')).toBe('caldo');
  });
});

describe('mapModelOutputToIngredients', () => {
  it('descarta detecciones por debajo del umbral de confianza', () => {
    const result = mapModelOutputToIngredients([
      { label: 'tomato', confidence: 0.9 },
      { label: 'onion', confidence: 0.2 },
    ]);
    expect(result.map((d) => d.ingredientId)).toEqual(['tomate']);
  });

  it('ignora etiquetas que no corresponden a ingredientes conocidos', () => {
    const result = mapModelOutputToIngredients([
      { label: 'person', confidence: 0.99 },
      { label: 'egg', confidence: 0.8 },
    ]);
    expect(result.map((d) => d.ingredientId)).toEqual(['huevo']);
  });

  it('ante duplicados conserva la deteccion de mayor confianza', () => {
    const result = mapModelOutputToIngredients([
      { label: 'tomato', confidence: 0.6 },
      { label: 'tomate', confidence: 0.95 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].confidence).toBe(0.95);
  });

  it('ordena los resultados de mayor a menor confianza', () => {
    const result = mapModelOutputToIngredients([
      { label: 'garlic', confidence: 0.6 },
      { label: 'carrot', confidence: 0.95 },
      { label: 'potato', confidence: 0.75 },
    ]);
    expect(result.map((d) => d.ingredientId)).toEqual(['zanahoria', 'papa', 'ajo']);
  });

  it('respeta un umbral personalizado', () => {
    const result = mapModelOutputToIngredients([{ label: 'tomato', confidence: 0.4 }], 0.3);
    expect(result).toHaveLength(1);
  });

  it('devuelve lista vacía si no hay detecciones', () => {
    expect(mapModelOutputToIngredients([])).toEqual([]);
  });
});

describe('SimulatedIngredientDetector', () => {
  it('revela los ingredientes esperados de a uno por llamada', async () => {
    const detector = new SimulatedIngredientDetector();
    detector.setExpectedIngredients(['papa', 'cebolla']);

    const first = await detector.detect();
    expect(first.map((d) => d.ingredientId)).toEqual(['papa']);

    const second = await detector.detect();
    expect(second.map((d) => d.ingredientId)).toEqual(['papa', 'cebolla']);
  });

  it('no revela más ingredientes de los esperados', async () => {
    const detector = new SimulatedIngredientDetector();
    detector.setExpectedIngredients(['huevo']);

    await detector.detect();
    const result = await detector.detect();
    expect(result.map((d) => d.ingredientId)).toEqual(['huevo']);
  });

  it('descarta ingredientes que el modelo no soporta', async () => {
    const detector = new SimulatedIngredientDetector();
    detector.setExpectedIngredients(['caldo', 'papa']);

    const result = await detector.detect();
    expect(result.map((d) => d.ingredientId)).toEqual(['papa']);
  });

  it('reinicia el progreso al cambiar de paso', async () => {
    const detector = new SimulatedIngredientDetector();
    detector.setExpectedIngredients(['papa', 'cebolla']);
    await detector.detect();

    detector.setExpectedIngredients(['huevo', 'sal']);
    const result = await detector.detect();
    expect(result.map((d) => d.ingredientId)).toEqual(['huevo']);
  });
});
