import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { createInMemoryUsageStore } from './usageStore.js';
import { createLlmClient } from './llm.js';
import { validateAskRequest } from './validate.js';

/**
 * Backend del asistente de voz (Fase 3).
 *
 * Su única razón de existir es que el LLM es el componente que cobra por uso:
 * acá se valida el límite diario por usuario ANTES de gastar una llamada, y
 * acá vive la API key. El contador del cliente es solo para mostrar el cupo;
 * el que manda es este.
 */

export const DAILY_MESSAGE_LIMIT = Number(process.env.DAILY_MESSAGE_LIMIT ?? 20);
const MAX_BODY_BYTES = 16 * 1024;

/**
 * Origen permitido para el build web de la app. En iOS/Android no aplica CORS,
 * pero `expo start --web` sí lo necesita. Por defecto '*', que es razonable
 * para una API pública sin cookies ni credenciales; se puede acotar por env.
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload-too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createServer({ usageStore = createInMemoryUsageStore(), llm = createLlmClient() } = {}) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, llmConfigured: llm.isConfigured });
      return;
    }

    if (req.method !== 'POST' || req.url !== '/ask') {
      sendJson(res, 404, { error: 'No encontrado.' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(await readBody(req));
    } catch (e) {
      const tooLarge = e instanceof Error && e.message === 'payload-too-large';
      sendJson(res, tooLarge ? 413 : 400, {
        error: tooLarge ? 'La petición es demasiado grande.' : 'JSON inválido.',
      });
      return;
    }

    const validation = validateAskRequest(parsed);
    if (!validation.ok) {
      sendJson(res, 400, { error: validation.error });
      return;
    }

    const { userId, question, context } = validation.value;
    const now = new Date();

    // Control de costo: se comprueba el cupo antes de llamar al modelo.
    const used = await usageStore.getCount(userId, now);
    if (used >= DAILY_MESSAGE_LIMIT) {
      sendJson(res, 429, {
        error: 'Alcanzaste el límite de preguntas por hoy.',
        remainingToday: 0,
      });
      return;
    }

    try {
      const answer = await llm.ask({ question, context });
      const newCount = await usageStore.increment(userId, now);

      sendJson(res, 200, {
        answer,
        remainingToday: Math.max(0, DAILY_MESSAGE_LIMIT - newCount),
      });
    } catch (error) {
      // Una llamada fallida no se le cobra al cupo del usuario.
      if (error instanceof Anthropic.RateLimitError) {
        sendJson(res, 503, { error: 'El asistente está saturado, probá en un momento.' });
        return;
      }
      if (error instanceof Anthropic.AuthenticationError) {
        console.error('API key inválida:', error.message);
        sendJson(res, 500, { error: 'El asistente no está configurado correctamente.' });
        return;
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`Error de la API (${error.status}):`, error.message);
        sendJson(res, 502, { error: 'El asistente no pudo responder.' });
        return;
      }
      console.error('Error inesperado:', error);
      sendJson(res, 500, { error: 'Error interno.' });
    }
  });
}

const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMainModule) {
  const port = Number(process.env.PORT ?? 3000);
  createServer().listen(port, () => {
    console.log(`Chefcito backend escuchando en http://localhost:${port}`);
    console.log(`Límite diario por usuario: ${DAILY_MESSAGE_LIMIT} mensajes`);
  });
}
