import Anthropic from '@anthropic-ai/sdk';

/**
 * Proveedores de LLM para el asistente.
 *
 * Hay tres, con la misma interfaz `{ isConfigured, name, ask }`:
 *
 *   - `ollama`    — modelo local, gratis. Para desarrollo y pruebas: no
 *                   gasta un peso y funciona sin conexión a internet.
 *   - `anthropic` — Claude Haiku 4.5, el más económico de la familia. Es el
 *                   proveedor de producción: los usuarios no tienen Ollama
 *                   corriendo en su casa.
 *   - `demo`      — respuesta fija, sin llamar a nada. Sirve para probar el
 *                   contrato HTTP y el límite diario sin depender de nada.
 *
 * El proveedor se elige con LLM_PROVIDER; si no se define, se detecta solo:
 * Anthropic si hay API key, y demo si no.
 *
 * `max_tokens` es bajo a propósito: las respuestas se leen en voz alta
 * mientras se cocina, así que conviene que sean breves, y los tokens de
 * salida son la parte más cara de la factura.
 */

const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 400;

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'llama3.2';

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

function buildPrompt(question, context) {
  return `${buildContextBlock(context)}\n\nPregunta: ${question}`;
}

/** Modelo local vía Ollama. Gratis, sin API key y sin salir de la red local. */
export function createOllamaClient({
  baseUrl = process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL,
  model = process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
  fetchImpl = fetch,
} = {}) {
  return {
    isConfigured: true,
    name: `ollama:${model}`,

    async ask({ question, context }) {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildPrompt(question, context) },
          ],
          // num_predict es el equivalente de max_tokens en Ollama.
          options: { num_predict: MAX_TOKENS },
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama respondió ${response.status}. ¿Está corriendo en ${baseUrl}?`
        );
      }

      const data = await response.json();
      const answer = data?.message?.content?.trim();
      if (!answer) {
        throw new Error('Ollama devolvió una respuesta vacía.');
      }
      return answer;
    },
  };
}

/** Claude Haiku. Es el proveedor pensado para producción. */
export function createAnthropicClient({ apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  const client = new Anthropic({ apiKey });

  return {
    isConfigured: true,
    name: `anthropic:${ANTHROPIC_MODEL}`,

    async ask({ question, context }) {
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(question, context) }],
      });

      return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();
    },
  };
}

/** Sin proveedor configurado: responde algo fijo, no llama a nada. */
export function createDemoClient() {
  return {
    isConfigured: false,
    name: 'demo',
    async ask({ question }) {
      return (
        'El backend está corriendo en modo demo, sin proveedor de LLM configurado. ' +
        `Tu pregunta fue: "${question}".`
      );
    },
  };
}

export function createLlmClient({ provider = process.env.LLM_PROVIDER } = {}) {
  const chosen = provider ?? (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'demo');

  switch (chosen) {
    case 'ollama':
      return createOllamaClient();
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('LLM_PROVIDER=anthropic pero falta ANTHROPIC_API_KEY: uso modo demo.');
        return createDemoClient();
      }
      return createAnthropicClient();
    case 'demo':
      return createDemoClient();
    default:
      console.warn(`LLM_PROVIDER desconocido: "${chosen}". Uso modo demo.`);
      return createDemoClient();
  }
}
