import { ASSISTANT_API_URL } from '../config/env';
import type { AssistantContext } from './localAnswers';

/**
 * Cliente del backend del asistente (Fase 3).
 *
 * La app nunca habla directo con el proveedor del LLM: siempre pasa por el
 * backend propio, que es quien guarda la API key y quien valida el límite
 * diario por usuario antes de gastar una llamada paga.
 */

export interface AssistantReply {
  answer: string;
  /** Mensajes que le quedan al usuario hoy, según el servidor. */
  remainingToday: number;
}

export class DailyLimitReachedError extends Error {
  constructor() {
    super('Alcanzaste el límite de preguntas por hoy.');
    this.name = 'DailyLimitReachedError';
  }
}

export async function askAssistant(
  question: string,
  { recipe, stepIndex }: AssistantContext,
  userId: string,
  signal?: AbortSignal
): Promise<AssistantReply> {
  const response = await fetch(ASSISTANT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      userId,
      question,
      context: {
        title: recipe.title,
        ingredients: recipe.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity,
        })),
        currentStep: recipe.steps[stepIndex]?.instruction ?? null,
        stepNumber: stepIndex + 1,
        totalSteps: recipe.steps.length,
      },
    }),
  });

  if (response.status === 429) {
    throw new DailyLimitReachedError();
  }

  if (!response.ok) {
    throw new Error(`El asistente no está disponible (código ${response.status}).`);
  }

  const data = await response.json();
  if (typeof data?.answer !== 'string') {
    throw new Error('Respuesta inválida del asistente.');
  }

  return {
    answer: data.answer,
    remainingToday: typeof data.remainingToday === 'number' ? data.remainingToday : 0,
  };
}
