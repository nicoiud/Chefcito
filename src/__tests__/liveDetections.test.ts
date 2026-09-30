import { LiveBoxTracker, VIDA_CAJA_MS, contarPorIngrediente, iou } from '../ar/liveDetections';
import { estimarPeso, formatearPeso, PESO_UNIDAD_G } from '../vision/ingredientWeights';
import { getSupportedIngredientIds } from '../vision/ingredientCatalog';

const det = (ingredientId: string, x: number, y = 100) => ({
  label: ingredientId,
  ingredientId,
  confidence: 0.8,
  box: { x, y, width: 100, height: 100 },
});

describe('LiveBoxTracker', () => {
  it('mantiene la misma caja entre cuadros y suaviza el salto', () => {
    const t = new LiveBoxTracker();
    const [a] = t.actualizar([det('tomate', 100)], 0);
    const [b] = t.actualizar([det('tomate', 120)], 100);
    expect(b.key).toBe(a.key);
    expect(b.box.x).toBeGreaterThan(100);
    expect(b.box.x).toBeLessThan(120);
  });

  it('dos tomates separados son dos cajas', () => {
    const t = new LiveBoxTracker();
    const cajas = t.actualizar([det('tomate', 0), det('tomate', 400)], 0);
    expect(cajas).toHaveLength(2);
    expect(contarPorIngrediente(cajas).get('tomate')).toBe(2);
  });

  it('no confunde ingredientes distintos en el mismo lugar', () => {
    const t = new LiveBoxTracker();
    const [a] = t.actualizar([det('tomate', 100)], 0);
    const cajas = t.actualizar([det('papa', 100)], 50);
    expect(cajas.find((c) => c.ingredientId === 'papa')!.key).not.toBe(a.key);
  });

  it('una caja perdida sobrevive un rato y después desaparece', () => {
    const t = new LiveBoxTracker();
    t.actualizar([det('tomate', 100)], 0);
    expect(t.actualizar([], VIDA_CAJA_MS - 1)).toHaveLength(1);
    expect(t.vigentes(VIDA_CAJA_MS + 1)).toHaveLength(0);
  });

  it('iou de cajas disjuntas es cero', () => {
    expect(iou({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 })).toBe(0);
  });
});

describe('pesos estimados', () => {
  it('todo el catálogo tiene peso típico', () => {
    for (const id of getSupportedIngredientIds()) expect(PESO_UNIDAD_G[id]).toBeGreaterThan(0);
  });

  it('multiplica por unidades y formatea', () => {
    expect(estimarPeso('huevo', 3)).toEqual({ gramos: 165, unidades: 3 });
    expect(formatearPeso(165)).toBe('≈ 165 g');
    expect(formatearPeso(1250)).toBe('≈ 1,3 kg');
    expect(estimarPeso('desconocido', 1)).toBeNull();
  });
});
