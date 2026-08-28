/**
 * Catálogo de ingredientes que el detector puede reconocer (Fase 2).
 *
 * Las entradas están alineadas con las clases de comida de **Open Images
 * que tienen bounding box**, que es el dataset con el que se entrena el
 * modelo (ver `ml/README.md`). Eso no es casual: agregar acá un ingrediente
 * para el que no existen imágenes anotadas no lo vuelve detectable, solo
 * genera una promesa que el modelo no puede cumplir.
 *
 * Cada entrada mapea el id que usan las recetas a las etiquetas que emite
 * el modelo. Los alias van en inglés (como etiquetan los datasets
 * públicos) y en español, para poder cambiar de modelo sin tocar recetas.
 *
 * **Cebolla y ajo son un caso especial**: son centrales para cocinar pero
 * no están en el subconjunto anotado de Open Images. Están en el catálogo
 * porque las recetas los usan y el usuario los puede confirmar a mano
 * (ver `corrections.ts`), pero hasta anotar fotos propias el modelo no los
 * va a detectar solo.
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
  // --- Verduras y hortalizas ---
  { id: 'tomate', displayName: 'Tomate', aliases: ['tomato', 'tomate'] },
  { id: 'papa', displayName: 'Papa', aliases: ['potato', 'papa', 'patata'] },
  { id: 'cebolla', displayName: 'Cebolla', aliases: ['onion', 'cebolla'] },
  { id: 'ajo', displayName: 'Ajo', aliases: ['garlic', 'ajo'] },
  { id: 'zanahoria', displayName: 'Zanahoria', aliases: ['carrot', 'zanahoria'] },
  { id: 'morron', displayName: 'Morrón', aliases: ['bell pepper', 'pepper', 'morron', 'pimiento'] },
  { id: 'zapallo', displayName: 'Zapallo', aliases: ['pumpkin', 'zapallo', 'calabaza'] },
  { id: 'zapallito', displayName: 'Zapallito', aliases: ['zucchini', 'squash', 'zapallito'] },
  { id: 'brocoli', displayName: 'Brócoli', aliases: ['broccoli', 'brocoli'] },
  { id: 'coliflor', displayName: 'Coliflor', aliases: ['cauliflower', 'coliflor'] },
  { id: 'repollo', displayName: 'Repollo', aliases: ['cabbage', 'repollo'] },
  { id: 'pepino', displayName: 'Pepino', aliases: ['cucumber', 'pepino'] },
  { id: 'rabanito', displayName: 'Rabanito', aliases: ['radish', 'rabanito', 'rabano'] },
  { id: 'alcaucil', displayName: 'Alcaucil', aliases: ['artichoke', 'alcaucil', 'alcachofa'] },
  { id: 'esparrago', displayName: 'Espárrago', aliases: ['asparagus', 'garden asparagus', 'esparrago'] },
  { id: 'hongos', displayName: 'Hongos', aliases: ['mushroom', 'hongos', 'champinon', 'champiñon'] },
  { id: 'choclo', displayName: 'Choclo', aliases: ['corn', 'choclo', 'maiz'] },
  { id: 'lechuga', displayName: 'Lechuga', aliases: ['lettuce', 'salad', 'lechuga'] },
  { id: 'espinaca', displayName: 'Espinaca', aliases: ['spinach', 'espinaca'] },
  { id: 'palta', displayName: 'Palta', aliases: ['avocado', 'palta', 'aguacate'] },

  // --- Frutas ---
  { id: 'manzana', displayName: 'Manzana', aliases: ['apple', 'manzana'] },
  { id: 'banana', displayName: 'Banana', aliases: ['banana', 'platano'] },
  { id: 'naranja', displayName: 'Naranja', aliases: ['orange', 'naranja'] },
  { id: 'limon', displayName: 'Limón', aliases: ['lemon', 'limon'] },
  { id: 'pomelo', displayName: 'Pomelo', aliases: ['grapefruit', 'pomelo'] },
  { id: 'frutilla', displayName: 'Frutilla', aliases: ['strawberry', 'frutilla', 'fresa'] },
  { id: 'uva', displayName: 'Uva', aliases: ['grape', 'uva'] },
  { id: 'durazno', displayName: 'Durazno', aliases: ['peach', 'durazno'] },
  { id: 'pera', displayName: 'Pera', aliases: ['pear', 'pera'] },
  { id: 'ananá', displayName: 'Ananá', aliases: ['pineapple', 'anana', 'piña'] },
  { id: 'mango', displayName: 'Mango', aliases: ['mango'] },
  { id: 'sandia', displayName: 'Sandía', aliases: ['watermelon', 'sandia'] },
  { id: 'melon', displayName: 'Melón', aliases: ['cantaloupe', 'winter melon', 'melon'] },
  { id: 'granada', displayName: 'Granada', aliases: ['pomegranate', 'granada'] },
  { id: 'higo', displayName: 'Higo', aliases: ['common fig', 'fig', 'higo'] },
  { id: 'coco', displayName: 'Coco', aliases: ['coconut', 'coco'] },

  // --- Proteínas ---
  { id: 'huevo', displayName: 'Huevo', aliases: ['egg', 'egg (food)', 'huevo'] },
  { id: 'pollo', displayName: 'Pollo', aliases: ['chicken', 'pollo'] },
  { id: 'carne', displayName: 'Carne', aliases: ['meat', 'carne'] },
  { id: 'pescado', displayName: 'Pescado', aliases: ['fish', 'pescado'] },
  { id: 'camaron', displayName: 'Camarón', aliases: ['shrimp', 'camaron'] },
  { id: 'mariscos', displayName: 'Mariscos', aliases: ['shellfish', 'seafood', 'mariscos'] },

  // --- Lácteos y despensa ---
  { id: 'queso', displayName: 'Queso', aliases: ['cheese', 'queso'] },
  { id: 'mozzarella', displayName: 'Mozzarella', aliases: ['mozzarella'] },
  { id: 'leche', displayName: 'Leche', aliases: ['milk', 'leche'] },
  { id: 'crema', displayName: 'Crema', aliases: ['cream', 'crema'] },
  { id: 'manteca', displayName: 'Manteca', aliases: ['butter', 'manteca', 'mantequilla'] },
  { id: 'yogur', displayName: 'Yogur', aliases: ['yogurt', 'yogur'] },
  { id: 'pan', displayName: 'Pan', aliases: ['bread', 'pan'] },
  { id: 'pasta', displayName: 'Pasta', aliases: ['pasta', 'fideos'] },
  { id: 'arroz', displayName: 'Arroz', aliases: ['rice', 'arroz'] },
  { id: 'harina', displayName: 'Harina', aliases: ['flour', 'harina'] },
  { id: 'lentejas', displayName: 'Lentejas', aliases: ['lentils', 'lentejas'] },
  { id: 'porotos', displayName: 'Porotos', aliases: ['bean', 'porotos', 'frijoles'] },
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

/** Todos los ingredientes del catálogo (el objetivo del modelo entrenado). */
export function getSupportedIngredientIds(): string[] {
  return ingredientCatalog.map((entry) => entry.id);
}

/**
 * Qué ingredientes del catálogo cubre realmente un modelo, derivado de las
 * etiquetas que ese modelo sabe emitir.
 *
 * Se calcula en vez de escribirse a mano para que no se desincronice al
 * cambiar de modelo: el modelo COCO que se distribuye hoy cubre solo una
 * parte del catálogo, y la app necesita saber cuál para no prometer
 * detecciones que no puede hacer.
 */
export function getIngredientsCoveredByLabels(labels: string[]): string[] {
  const covered = new Set<string>();
  for (const label of labels) {
    const id = resolveIngredientId(label);
    if (id) covered.add(id);
  }
  return [...covered];
}
