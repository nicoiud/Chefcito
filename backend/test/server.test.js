import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, DAILY_MESSAGE_LIMIT } from '../src/server.js';
import { createInMemoryUsageStore } from '../src/usageStore.js';

let server;
let baseUrl;
let llmCallCount = 0;

const fakeLlm = {
  isConfigured: true,
  async ask({ question }) {
    llmCallCount += 1;
    return `respuesta a: ${question}`;
  },
};

function ask(body) {
  return fetch(`${baseUrl}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validPayload(overrides = {}) {
  return {
    userId: 'user-1',
    question: '¿Puedo reemplazar la manteca por aceite?',
    context: {
      title: 'Tortilla de papas',
      ingredients: [{ name: 'Papa', quantity: '4 medianas' }],
      currentStep: 'Freír las papas',
      stepNumber: 2,
      totalSteps: 4,
    },
    ...overrides,
  };
}

before(async () => {
  server = createServer({ usageStore: createInMemoryUsageStore(), llm: fakeLlm });
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe('POST /ask', () => {
  test('responde una pregunta válida y descuenta del cupo', async () => {
    const response = await ask(validPayload({ userId: 'user-basico' }));
    assert.equal(response.status, 200);

    const data = await response.json();
    assert.match(data.answer, /respuesta a:/);
    assert.equal(data.remainingToday, DAILY_MESSAGE_LIMIT - 1);
  });

  test('rechaza payloads sin userId', async () => {
    const response = await ask(validPayload({ userId: '' }));
    assert.equal(response.status, 400);
  });

  test('rechaza preguntas vacías', async () => {
    const response = await ask(validPayload({ question: '   ' }));
    assert.equal(response.status, 400);
  });

  test('rechaza preguntas excesivamente largas para acotar el costo', async () => {
    const response = await ask(validPayload({ question: 'a'.repeat(501) }));
    assert.equal(response.status, 400);
  });

  test('bloquea con 429 al superar el límite diario y no llama al LLM', async () => {
    const userId = 'user-limite';

    for (let i = 0; i < DAILY_MESSAGE_LIMIT; i += 1) {
      const response = await ask(validPayload({ userId }));
      assert.equal(response.status, 200);
    }

    const callsBeforeBlock = llmCallCount;
    const blocked = await ask(validPayload({ userId }));

    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).remainingToday, 0);
    assert.equal(llmCallCount, callsBeforeBlock, 'no debe llamar al LLM sin cupo');
  });

  test('el cupo es independiente por usuario', async () => {
    const response = await ask(validPayload({ userId: 'user-nuevo' }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).remainingToday, DAILY_MESSAGE_LIMIT - 1);
  });

  test('un fallo del LLM no consume cupo del usuario', async () => {
    const failingServer = createServer({
      usageStore: createInMemoryUsageStore(),
      llm: {
        isConfigured: true,
        async ask() {
          throw new Error('boom');
        },
      },
    });
    await new Promise((resolve) => failingServer.listen(0, resolve));
    const failingUrl = `http://127.0.0.1:${failingServer.address().port}`;

    const failed = await fetch(`${failingUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload({ userId: 'user-error' })),
    });
    assert.equal(failed.status, 500);

    const retry = await fetch(`${failingUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload({ userId: 'user-error' })),
    });
    assert.equal(retry.status, 500);

    failingServer.close();
  });
});

describe('CORS', () => {
  test('responde el preflight para que funcione el build web', async () => {
    const response = await fetch(`${baseUrl}/ask`, { method: 'OPTIONS' });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
  });

  test('incluye las cabeceras CORS en las respuestas normales', async () => {
    const response = await ask(validPayload({ userId: 'user-cors' }));
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });
});

describe('GET /health', () => {
  test('reporta el estado del servidor', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
  });
});
