import { recipes } from '../data/recipes';
import { getSupportedIngredientIds } from '../vision/ingredientCatalog';

/**
 * Integridad del recetario.
 *
 * Con decenas de recetas escritas a mano, una errata en un id no rompe el
 * build ni ningún test de lógica: simplemente hace que la cámara nunca
 * verifique ese ingrediente, y eso se descubre recién cocinando. Estos
 * tests son la red que atrapa ese tipo de error.
 */
describe('recetario', () => {
  it('tiene una cantidad razonable de recetas', () => {
    expect(recipes.length).toBeGreaterThanOrEqual(25);
  });

  it('no repite ids de receta', () => {
    const ids = recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas tienen título, descripción y emoji', () => {
    for (const r of recipes) {
      expect(r.title.trim()).not.toBe('');
      expect(r.description.trim()).not.toBe('');
      expect(r.imageEmoji.trim()).not.toBe('');
    }
  });

  it('los tiempos y porciones son positivos', () => {
    for (const r of recipes) {
      expect(r.servings).toBeGreaterThan(0);
      expect(r.totalTimeMinutes).toBeGreaterThan(0);
    }
  });

  it('todas tienen al menos un ingrediente y un paso', () => {
    for (const r of recipes) {
      expect(r.ingredients.length).toBeGreaterThan(0);
      expect(r.steps.length).toBeGreaterThan(0);
    }
  });

  it('los pasos están numerados de forma correlativa desde 1', () => {
    for (const r of recipes) {
      expect(r.steps.map((s) => s.order)).toEqual(
        r.steps.map((_, i) => i + 1)
      );
    }
  });

  it('no repite ids de paso dentro de una receta', () => {
    for (const r of recipes) {
      const ids = r.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('no repite ids de ingrediente dentro de una receta', () => {
    for (const r of recipes) {
      const ids = r.ingredients.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('cada ingredientId de un paso está declarado en la receta', () => {
    for (const r of recipes) {
      const declarados = new Set(r.ingredients.map((i) => i.id));
      for (const step of r.steps) {
        for (const id of step.ingredientIds ?? []) {
          expect({ receta: r.id, paso: step.order, id, declarado: declarados.has(id) })
            .toEqual({ receta: r.id, paso: step.order, id, declarado: true });
        }
      }
    }
  });

  it('los timers, cuando existen, son positivos', () => {
    for (const r of recipes) {
      for (const step of r.steps) {
        if (step.timerSeconds !== undefined) {
          expect(step.timerSeconds).toBeGreaterThan(0);
        }
      }
    }
  });

  it('cubre varias categorías', () => {
    expect(new Set(recipes.map((r) => r.category)).size).toBeGreaterThanOrEqual(4);
  });

  it('la mayoría de los ingredientes usados son reconocibles por el catálogo', () => {
    // No hace falta que TODOS lo sean (sal, aceite y caldo nunca lo van a
    // ser), pero si la proporción cae mucho es señal de ids mal escritos.
    const catalogo = new Set(getSupportedIngredientIds());
    const usados = new Set(recipes.flatMap((r) => r.ingredients.map((i) => i.id)));
    const reconocidos = [...usados].filter((id) => catalogo.has(id));
    expect(reconocidos.length / usados.size).toBeGreaterThan(0.6);
  });
});
