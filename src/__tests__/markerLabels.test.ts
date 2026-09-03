import { describirIngrediente } from '../ar/markerLabels';
import type { Ingredient } from '../types/recipe';

const receta: Ingredient[] = [
  { id: 'mozzarella', name: 'Mozzarella', quantity: '250 g' },
  { id: 'sal', name: 'Sal' },
];

describe('rótulo del marcador', () => {
  it('muestra la cantidad que pide la receta', () => {
    expect(describirIngrediente('mozzarella', receta)).toEqual({
      label: 'Mozzarella',
      detail: '250 g',
    });
  });

  it('omite la cantidad cuando la receta no la especifica', () => {
    expect(describirIngrediente('sal', receta).detail).toBeUndefined();
  });

  it('el nombre de la receta gana sobre el del catálogo', () => {
    // El catálogo llama "Tomate" al ingrediente; si la receta lo llama de
    // otra forma, es esa la que el usuario está leyendo.
    const propia: Ingredient[] = [{ id: 'tomate', name: 'Tomate perita', quantity: '3' }];
    expect(describirIngrediente('tomate', propia).label).toBe('Tomate perita');
  });

  it('cae al catálogo si la cámara ve algo que la receta no pide', () => {
    expect(describirIngrediente('tomate', []).label).toBe('Tomate');
  });

  it('no rompe con un ingrediente desconocido', () => {
    expect(describirIngrediente('inventado', [])).toEqual({
      label: 'inventado',
      detail: undefined,
    });
  });
});
