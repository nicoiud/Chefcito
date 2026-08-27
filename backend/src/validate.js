/**
 * Validación del payload que manda la app.
 *
 * Además de evitar entradas inválidas, acota el tamaño de lo que se le manda
 * al LLM: la cantidad de tokens de entrada es parte de lo que se paga, así que
 * un límite duro acá es también un control de costo.
 */

export const MAX_QUESTION_LENGTH = 500;
const MAX_TITLE_LENGTH = 120;
const MAX_STEP_LENGTH = 500;
const MAX_INGREDIENTS = 30;

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

/** Devuelve { ok: true, value } o { ok: false, error }. */
export function validateAskRequest(body) {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Cuerpo de la petición inválido.' };
  }

  if (!isNonEmptyString(body.userId, 100)) {
    return { ok: false, error: 'userId inválido.' };
  }

  if (!isNonEmptyString(body.question, MAX_QUESTION_LENGTH)) {
    return {
      ok: false,
      error: `La pregunta debe tener entre 1 y ${MAX_QUESTION_LENGTH} caracteres.`,
    };
  }

  const context = body.context ?? {};
  if (typeof context !== 'object' || context === null) {
    return { ok: false, error: 'Contexto inválido.' };
  }

  const ingredients = Array.isArray(context.ingredients)
    ? context.ingredients
        .slice(0, MAX_INGREDIENTS)
        .filter((i) => i && typeof i.name === 'string')
        .map((i) => ({
          name: String(i.name).slice(0, 80),
          quantity: typeof i.quantity === 'string' ? i.quantity.slice(0, 80) : undefined,
        }))
    : [];

  return {
    ok: true,
    value: {
      userId: body.userId.trim(),
      question: body.question.trim(),
      context: {
        title: isNonEmptyString(context.title, MAX_TITLE_LENGTH)
          ? context.title.trim()
          : 'una receta',
        ingredients,
        currentStep: isNonEmptyString(context.currentStep, MAX_STEP_LENGTH)
          ? context.currentStep.trim()
          : null,
        stepNumber: Number.isInteger(context.stepNumber) ? context.stepNumber : null,
        totalSteps: Number.isInteger(context.totalSteps) ? context.totalSteps : null,
      },
    },
  };
}
