import type { Recipe } from '../types/recipe';

/**
 * Recetas embebidas localmente (Fase 1, sin backend).
 * En fases futuras esto puede migrar a Firebase/Supabase manteniendo
 * la misma forma de datos (ver src/types/recipe.ts).
 */
export const recipes: Recipe[] = [
  {
    id: 'tortilla-de-papas',
    title: 'Tortilla de papas',
    description: 'Clásica tortilla española de papa y huevo, jugosa por dentro.',
    category: 'plato-principal',
    servings: 4,
    totalTimeMinutes: 40,
    imageEmoji: '🍳',
    ingredients: [
      { id: 'papa', name: 'Papa', quantity: '4 medianas' },
      { id: 'huevo', name: 'Huevo', quantity: '6 unidades' },
      { id: 'cebolla', name: 'Cebolla', quantity: '1 unidad' },
      { id: 'aceite', name: 'Aceite de oliva', quantity: '200 ml' },
      { id: 'sal', name: 'Sal', quantity: 'a gusto' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Pelar y cortar las papas y la cebolla en láminas finas.',
        ingredientIds: ['papa', 'cebolla'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Freír las papas y la cebolla en el aceite a fuego medio hasta que estén tiernas.',
        timerSeconds: 15 * 60,
        ingredientIds: ['papa', 'cebolla', 'aceite'],
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Batir los huevos con sal y mezclar con las papas escurridas.',
        ingredientIds: ['huevo', 'sal'],
      },
      {
        id: 'paso-4',
        order: 4,
        instruction: 'Volcar la mezcla en la sartén y cuajar la tortilla de ambos lados.',
        timerSeconds: 6 * 60,
      },
    ],
  },
  {
    id: 'ensalada-caprese',
    title: 'Ensalada caprese',
    description: 'Tomate, mozzarella y albahaca fresca con aceite de oliva.',
    category: 'entrada',
    servings: 2,
    totalTimeMinutes: 10,
    imageEmoji: '🍅',
    ingredients: [
      { id: 'tomate', name: 'Tomate', quantity: '3 unidades' },
      { id: 'mozzarella', name: 'Mozzarella', quantity: '250 g' },
      { id: 'albahaca', name: 'Albahaca fresca', quantity: 'un puñado' },
      { id: 'aceite', name: 'Aceite de oliva', quantity: 'a gusto' },
      { id: 'sal', name: 'Sal', quantity: 'a gusto' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Cortar el tomate y la mozzarella en rodajas parejas.',
        ingredientIds: ['tomate', 'mozzarella'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Intercalar las rodajas de tomate y mozzarella en un plato.',
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Agregar hojas de albahaca, aceite de oliva y sal a gusto.',
        ingredientIds: ['albahaca', 'aceite', 'sal'],
      },
    ],
  },
  {
    id: 'guiso-de-lentejas',
    title: 'Guiso de lentejas',
    description: 'Guiso abundante con lentejas, verduras y chorizo.',
    category: 'plato-principal',
    servings: 6,
    totalTimeMinutes: 60,
    imageEmoji: '🍲',
    ingredients: [
      { id: 'lentejas', name: 'Lentejas', quantity: '400 g' },
      { id: 'zanahoria', name: 'Zanahoria', quantity: '2 unidades' },
      { id: 'cebolla', name: 'Cebolla', quantity: '1 unidad' },
      { id: 'ajo', name: 'Ajo', quantity: '2 dientes' },
      { id: 'chorizo', name: 'Chorizo colorado', quantity: '2 unidades' },
      { id: 'caldo', name: 'Caldo de verduras', quantity: '1.5 l' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Remojar las lentejas 20 minutos y escurrir.',
        timerSeconds: 20 * 60,
        ingredientIds: ['lentejas'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Picar cebolla, ajo y zanahoria, y rehogar en una olla.',
        ingredientIds: ['cebolla', 'ajo', 'zanahoria'],
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Agregar el chorizo cortado en rodajas y dorar unos minutos.',
        ingredientIds: ['chorizo'],
      },
      {
        id: 'paso-4',
        order: 4,
        instruction: 'Incorporar las lentejas y el caldo, y cocinar hasta que estén tiernas.',
        timerSeconds: 30 * 60,
        ingredientIds: ['lentejas', 'caldo'],
      },
    ],
  },
  {
    id: 'panqueques',
    title: 'Panqueques',
    description: 'Masa básica de panqueques para rellenar dulce o salado.',
    category: 'postre',
    servings: 4,
    totalTimeMinutes: 25,
    imageEmoji: '🥞',
    ingredients: [
      { id: 'harina', name: 'Harina', quantity: '200 g' },
      { id: 'huevo', name: 'Huevo', quantity: '2 unidades' },
      { id: 'leche', name: 'Leche', quantity: '400 ml' },
      { id: 'manteca', name: 'Manteca', quantity: '30 g' },
      { id: 'sal', name: 'Sal', quantity: 'una pizca' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Mezclar la harina, los huevos, la leche y la sal hasta obtener una masa lisa.',
        ingredientIds: ['harina', 'huevo', 'leche', 'sal'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Dejar reposar la masa 10 minutos.',
        timerSeconds: 10 * 60,
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Cocinar cada panqueque en sartén con un poco de manteca, dorando ambos lados.',
        ingredientIds: ['manteca'],
      },
    ],
  },
  {
    id: 'pure-de-papas',
    title: 'Puré de papas',
    description: 'Puré cremoso, guarnición clásica para acompañar cualquier plato.',
    category: 'plato-principal',
    servings: 4,
    totalTimeMinutes: 30,
    imageEmoji: '🥔',
    ingredients: [
      { id: 'papa', name: 'Papa', quantity: '1 kg' },
      { id: 'leche', name: 'Leche', quantity: '150 ml' },
      { id: 'manteca', name: 'Manteca', quantity: '50 g' },
      { id: 'sal', name: 'Sal', quantity: 'a gusto' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Pelar y cortar las papas en trozos parejos.',
        ingredientIds: ['papa'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Hervir las papas en agua con sal hasta que estén tiernas.',
        timerSeconds: 20 * 60,
        ingredientIds: ['papa', 'sal'],
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Escurrir y pisar las papas, agregando leche y manteca hasta lograr una textura cremosa.',
        ingredientIds: ['leche', 'manteca'],
      },
    ],
  },
  {
    id: 'huevos-revueltos',
    title: 'Huevos revueltos',
    description: 'Desayuno rápido y proteico, listo en minutos.',
    category: 'entrada',
    servings: 1,
    totalTimeMinutes: 8,
    imageEmoji: '🍳',
    ingredients: [
      { id: 'huevo', name: 'Huevo', quantity: '3 unidades' },
      { id: 'manteca', name: 'Manteca', quantity: '10 g' },
      { id: 'sal', name: 'Sal', quantity: 'a gusto' },
    ],
    steps: [
      {
        id: 'paso-1',
        order: 1,
        instruction: 'Batir los huevos con sal en un bowl.',
        ingredientIds: ['huevo', 'sal'],
      },
      {
        id: 'paso-2',
        order: 2,
        instruction: 'Derretir la manteca en una sartén a fuego bajo.',
        ingredientIds: ['manteca'],
      },
      {
        id: 'paso-3',
        order: 3,
        instruction: 'Volcar los huevos y revolver constantemente hasta la cocción deseada.',
        timerSeconds: 3 * 60,
      },
    ],
  },
];
