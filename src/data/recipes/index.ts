import type { Recipe } from '../../types/recipe';
import { entradas } from './entradas';
import { principales } from './principales';
import { postres, panificados, bebidas } from './dulces';

/**
 * Recetario completo, embebido en la app (sin backend).
 *
 * Está separado por categoría para que los archivos sigan siendo legibles a
 * medida que crece. Los `ingredientIds` de cada paso deben coincidir con los
 * ids de `src/vision/ingredientCatalog.ts` cuando el ingrediente sea
 * detectable por cámara; si no lo es (sal, aceite, caldo), igual se listan y
 * el usuario los confirma a mano.
 */
export const recipes: Recipe[] = [
  ...entradas,
  ...principales,
  ...postres,
  ...panificados,
  ...bebidas,
];

export { entradas, principales, postres, panificados, bebidas };
