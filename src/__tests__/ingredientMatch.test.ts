import { matchIngredients } from '../utils/ingredientMatch';

describe('matchIngredients', () => {
  it('detecta cuando todos los ingredientes esperados están presentes', () => {
    const result = matchIngredients(['papa', 'cebolla'], ['papa', 'cebolla', 'tomate']);
    expect(result.matched).toEqual(['papa', 'cebolla']);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(['tomate']);
    expect(result.isComplete).toBe(true);
  });

  it('reporta los ingredientes que faltan', () => {
    const result = matchIngredients(['papa', 'cebolla', 'ajo'], ['papa']);
    expect(result.matched).toEqual(['papa']);
    expect(result.missing).toEqual(['cebolla', 'ajo']);
    expect(result.isComplete).toBe(false);
  });

  it('no marca como completo un paso sin ingredientes esperados', () => {
    const result = matchIngredients([], ['papa']);
    expect(result.isComplete).toBe(false);
    expect(result.extra).toEqual(['papa']);
  });

  it('ignora mayúsculas y espacios al comparar', () => {
    const result = matchIngredients([' Papa '], ['papa']);
    expect(result.matched).toEqual(['papa']);
    expect(result.isComplete).toBe(true);
  });

  it('devuelve missing igual al esperado cuando no se detecta nada', () => {
    const result = matchIngredients(['huevo', 'sal'], []);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(['huevo', 'sal']);
    expect(result.extra).toEqual([]);
    expect(result.isComplete).toBe(false);
  });
});
