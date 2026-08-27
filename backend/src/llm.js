import Anthropic from '@anthropic-ai/sdk';

/**
 * Llamada al LLM.
 *
 * Se usa Claude Haiku 4.5 (`claude-haiku-4-5`), el modelo más barato de la
 * familia, porque las respuestas son cortas y de dominio acotado. La API key
 * vive solo acá, nunca en la app.
 *
 * `max_tokens` es bajo a propósito: las respuestas se leen en voz alta
 * mientras el usuario cocina, así que conviene que sean breves, y los tokens
 * de salida son la parte más cara de la factura.
 */

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 400;

const SYSTEM_PROMPT = [
  'Sos el asistente de cocina de la app Chefcito.',
  'Respondés en español rioplatense, en tono claro y amable.',
  'La persona está cocinando con las manos ocupadas y tu respuesta se lee en voz alta:',
  'contestá en 3 oraciones como máximo, sin listas ni markdown.',
  'Si la pregunta no tiene que ver con cocina, decilo brevemente y volvé a la receta.',
].join(' ');

function buildContextBlock(context) {
  const lines = [`Receta actual: ${context.title}.`];

  if (context.ingredients.length > 0) {
    const list = context.ingredients
      .map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name))
      .join(', ');
    lines.push(`Ingredientes: ${list}.`);
  }

  if (context.currentStep) {
    const position =
      context.stepNumber && context.totalSteps
        ? ` (paso ${context.stepNumber} de ${context.totalSteps})`
        : '';
    lines.push(`Paso actual${position}: ${context.currentStep}`);
  }

  return lines.join('\n');
}

export function createLlmClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Sin API key el servidor sigue levantando, para poder probar el límite
  // diario y el contrato HTTP sin gastar dinero.
  if (!apiKey) {
    return {
      isConfigured: false,
      async ask({ question }) {
        return (
          'El backend está corriendo en modo demo, sin API key configurada. ' +
          `Tu pregunta fue: "${question}".`
        );
      },
    };
  }

  const client = new Anthropic({ apiKey });

  return {
    isConfigured: true,
    async ask({ question, context }) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${buildContextBlock(context)}\n\nPregunta: ${question}`,
          },
        ],
      });

      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
    },
  };
}
