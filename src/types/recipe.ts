export interface Ingredient {
  id: string;
  name: string;
  quantity?: string;
}

export interface RecipeStep {
  id: string;
  order: number;
  instruction: string;
  /** Duration in seconds if this step needs a timer (e.g. "hervir 10 min"). */
  timerSeconds?: number;
  /** Ingredient ids relevant to this step, used by the Fase 2 camera check. */
  ingredientIds?: string[];
}

export type RecipeCategory =
  | 'entrada'
  | 'plato-principal'
  | 'postre'
  | 'panificados'
  | 'bebidas';

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: RecipeCategory;
  servings: number;
  totalTimeMinutes: number;
  imageEmoji: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}
