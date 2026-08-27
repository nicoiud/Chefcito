/**
 * Catálogo acotado de ingredientes que el modelo de visión debe reconocer
 * (Fase 2). Se arranca con ~18 ítems comunes en lugar de intentar cubrir
 * todo, según la especificación.
 *
 * Cada entrada mapea el id usado en las recetas (`src/data/recipes.ts`) a
 * las etiquetas que devuelven los modelos pre-entrenados. Los modelos
 * públicos (COCO, Open Images, Food-101) etiquetan en inglés, por eso se
 * incluyen alias en ambos idiomas: así se puede cambiar de modelo sin
 * tocar las recetas.
 */

export interface CatalogEntry {
  /** Id canónico, el mismo que usan las recetas. */
  id: string;
  /** Nombre para mostrar al usuario. */
  displayName: string;
  /** Etiquetas del modelo que se resuelven a este ingrediente. */
  aliases: string[];
}

export const ingredientCatalog: CatalogEntry[] = [
  { id: 'tomate', displayName: 'Tomate', aliases: ['tomato', 'tomate'] },
  { id: 'cebolla', displayName: 'Cebolla', aliases: ['onion', 'cebolla'] },
  { id: 'ajo', displayName: 'Ajo', aliases: ['garlic', 'ajo'] },
  { id: 'zanahoria', displayName: 'Zanahoria', aliases: ['carrot', 'zanahoria'] },
  { id: 'papa', displayName: 'Papa', aliases: ['potato', 'papa', 'patata'] },
  { id: 'huevo', displayName: 'Huevo', aliases: ['egg', 'huevo'] },
  { id: 'morron', displayName: 'Morrón', aliases: ['bell pepper', 'pepper', 'morron', 'pimiento'] },
  { id: 'zapallo', displayName: 'Zapallo', aliases: ['pumpkin', 'squash', 'zapallo'] },
  { id: 'limon', displayName: 'Limón', aliases: ['lemon', 'limon'] },
  { id: 'manzana', displayName: 'Manzana', aliases: ['apple', 'manzana'] },
  { id: 'banana', displayName: 'Banana', aliases: ['banana', 'plantano', 'platano'] },
  { id: 'queso', displayName: 'Queso', aliases: ['cheese', 'queso'] },
  { id: 'mozzarella', displayName: 'Mozzarella', aliases: ['mozzarella'] },
  { id: 'leche', displayName: 'Leche', aliases: ['milk', 'leche'] },
  { id: 'manteca', displayName: 'Manteca', aliases: ['butter', 'manteca', 'mantequilla'] },
  { id: 'harina', displayName: 'Harina', aliases: ['flour', 'harina'] },
  { id: 'lentejas', displayName: 'Lentejas', aliases: ['lentils', 'lentejas'] },
  { id: 'albahaca', displayName: 'Albahaca', aliases: ['basil', 'albahaca'] },
];

/** Confianza mínima para considerar válida una detección. */
export const DETECTION_CONFIDENCE_THRESHOLD = 0.5;

const aliasToId = new Map<string, string>();
for (const entry of ingredientCatalog) {
  aliasToId.set(entry.id.toLowerCase(), entry.id);
  for (const alias of entry.aliases) {
    aliasToId.set(alias.toLowerCase(), entry.id);
  }
}

/**
 * Traduce una etiqueta cruda del modelo al id de ingrediente del catálogo.
 * Devuelve null si la etiqueta no corresponde a ningún ingrediente conocido
 * (por ejemplo "person" o "dining table" en modelos COCO).
 */
export function resolveIngredientId(rawLabel: string): string | null {
  return aliasToId.get(rawLabel.trim().toLowerCase()) ?? null;
}

export function getDisplayName(ingredientId: string): string {
  const entry = ingredientCatalog.find((e) => e.id === ingredientId);
  return entry ? entry.displayName : ingredientId;
}

/** Ids que el modelo de visión es capaz de reconocer. */
export function getSupportedIngredientIds(): string[] {
  return ingredientCatalog.map((entry) => entry.id);
}
