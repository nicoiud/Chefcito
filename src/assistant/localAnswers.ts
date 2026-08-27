import type { Recipe } from '../types/recipe';

/**
 * Resolutor local de preguntas frecuentes (Fase 3).
 *
 * Muchas de las preguntas que se hacen mientras se cocina ("¿qué lleva?",
 * "¿cuál era el paso?", "¿para cuántos es?") se pueden responder con los
 * datos de la receta que ya están en el dispositivo. Resolverlas acá evita
 * llamadas al LLM, que es el único componente con costo por uso del
 * proyecto: cada pregunta respondida localmente es una que no se cobra y
 * que además no consume el cupo diario del usuario.
 *
 * Devuelve null cuando la pregunta es abierta y sí requiere el LLM.
 */

export interface AssistantContext {
  recipe: Recipe;
  stepIndex: number;
}

/** Normaliza para comparar sin acentos ni mayúsculas. */
export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function formatIngredients(recipe: Recipe): string {
  const list = recipe.ingredients
    .map((i) => (i.quantity ? `${i.name}, ${i.quantity}` : i.name))
    .join('; ');
  return `${recipe.title} lleva: ${list}.`;
}

function formatStep(recipe: Recipe, stepIndex: number): string {
  const step = recipe.steps[stepIndex];
  if (!step) return 'Ya terminaste todos los pasos de esta receta.';
  return `Paso ${step.order} de ${recipe.steps.length}: ${step.instruction}`;
}

export function answerLocally(
  question: string,
  { recipe, stepIndex }: AssistantContext
): string | null {
  const q = normalizeQuestion(question);
  if (!q) return null;

  if (includesAny(q, ['ingrediente', 'que lleva', 'que necesito', 'que compro'])) {
    return formatIngredients(recipe);
  }

  if (includesAny(q, ['repeti', 'repite', 'cual era el paso', 'que paso', 'paso actual'])) {
    return formatStep(recipe, stepIndex);
  }

  if (includesAny(q, ['siguiente paso', 'que sigue', 'proximo paso'])) {
    const next = recipe.steps[stepIndex + 1];
    return next
      ? `El siguiente es el paso ${next.order}: ${next.instruction}`
      : 'Este es el último paso de la receta.';
  }

  if (includesAny(q, ['cuantas porciones', 'para cuantos', 'rinde'])) {
    return `Esta receta rinde ${recipe.servings} porciones.`;
  }

  if (includesAny(q, ['cuanto tarda', 'cuanto tiempo', 'cuanto demora'])) {
    return `${recipe.title} lleva unos ${recipe.totalTimeMinutes} minutos en total.`;
  }

  if (includesAny(q, ['cuantos pasos', 'cuanto falta'])) {
    const remaining = recipe.steps.length - stepIndex - 1;
    if (remaining <= 0) return 'Estás en el último paso.';
    return `Te ${remaining === 1 ? 'queda 1 paso' : `quedan ${remaining} pasos`}.`;
  }

  return null;
}
