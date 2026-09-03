import { getDisplayName } from '../vision/ingredientCatalog';
import type { Ingredient } from '../types/recipe';
import type { EtiquetaIngrediente } from './useDetectionAnchors';

/**
 * Cómo se rotula un marcador: nombre y cantidad.
 *
 * La receta manda sobre el catálogo. El catálogo dice "Queso mozzarella"
 * porque es el nombre del ingrediente en general; la receta dice
 * "Mozzarella" y "250 g", que es lo que el usuario necesita leer mientras
 * cocina. Si el ingrediente no está en la receta (la cámara puede ver algo
 * que este paso no pide), se cae al nombre del catálogo.
 */
export function describirIngrediente(
  ingredientId: string,
  ingredientesDeLaReceta: Ingredient[]
): EtiquetaIngrediente {
  const deLaReceta = ingredientesDeLaReceta.find((i) => i.id === ingredientId);
  return {
    label: deLaReceta?.name ?? getDisplayName(ingredientId),
    detail: deLaReceta?.quantity,
  };
}
