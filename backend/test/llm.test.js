import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createLlmClient, createOllamaClient, createDemoClient } from '../src/llm.js';

const context = {
  title: 'Tortilla de papas',
  ingredients: [{ name: 'Papa', quantity: '4 medianas' }],
  currentStep: 'Freír las papas',
  stepNumber: 2,
  totalSteps: 4,
};

/** fetch falso que registra lo que se le pidió y devuelve lo que se le indique. */
function fakeFetch(response, calls = []) {
  return async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return response;
  };
}

const okResponse = (content) => ({
  ok: true,
  status: 200,
  async json() {
    return { message: { content } };
  },
});

describe('createOllamaClient', () => {
  test('llama al endpoint de chat de Ollama y devuelve la respuesta', async () => {
    const calls = [];
    const client = createOllamaClient({
      baseUrl: 'http://127.0.0.1:11434',
      model: 'llama3.2',
      fetchImpl: fakeFetch(okResponse('  Sí, podés reemplazarla.  '), calls),
    });

    const answer = await client.ask({ question: '¿Puedo cambiarla?', context });

    assert.equal(answer, 'Sí, podés reemplazarla.');
    assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(calls[0].body.model, 'llama3.2');
    assert.equal(calls[0].body.stream, false);
  });

  test('manda el contexto de la receta en el prompt', async () => {
    const calls = [];
    const client = createOllamaClient({
      fetchImpl: fakeFetch(okResponse('ok'), calls),
    });

    await client.ask({ question: '¿Y ahora?', context });

    const [system, user] = calls[0].body.messages;
    assert.equal(system.role, 'system');
    assert.match(user.content, /Tortilla de papas/);
    assert.match(user.content, /Freír las papas/);
    assert.match(user.content, /paso 2 de 4/);
    assert.match(user.content, /¿Y ahora\?/);
  });

  test('acota la longitud de la respuesta para no gastar de más', async () => {
    const calls = [];
    const client = createOllamaClient({ fetchImpl: fakeFetch(okResponse('ok'), calls) });
    await client.ask({ question: 'hola', context });
    assert.equal(calls[0].body.options.num_predict, 400);
  });

  test('normaliza la URL base con barra final', async () => {
    const calls = [];
    const client = createOllamaClient({
      baseUrl: 'http://192.168.0.10:11434/',
      fetchImpl: fakeFetch(okResponse('ok'), calls),
    });
    await client.ask({ question: 'hola', context });
    assert.equal(calls[0].url, 'http://192.168.0.10:11434/api/chat');
  });

  test('da un error claro si Ollama no está corriendo', async () => {
    const client = createOllamaClient({
      baseUrl: 'http://127.0.0.1:11434',
      fetchImpl: async () => ({ ok: false, status: 500 }),
    });

    await assert.rejects(
      () => client.ask({ question: 'hola', context }),
      /Ollama respondió 500.*11434/s
    );
  });

  test('falla si Ollama devuelve una respuesta vacía', async () => {
    const client = createOllamaClient({ fetchImpl: fakeFetch(okResponse('   ')) });
    await assert.rejects(() => client.ask({ question: 'hola', context }), /vacía/);
  });
});

describe('createLlmClient', () => {
  test('elige Ollama cuando se lo pide explícitamente', () => {
    assert.match(createLlmClient({ provider: 'ollama' }).name, /^ollama:/);
  });

  test('cae a demo si se pide anthropic sin API key', () => {
    const previous = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      assert.equal(createLlmClient({ provider: 'anthropic' }).name, 'demo');
    } finally {
      if (previous !== undefined) process.env.ANTHROPIC_API_KEY = previous;
    }
  });

  test('cae a demo ante un proveedor desconocido', () => {
    assert.equal(createLlmClient({ provider: 'gpt-casero' }).name, 'demo');
  });

  test('el modo demo no se reporta como configurado', () => {
    const demo = createDemoClient();
    assert.equal(demo.isConfigured, false);
  });

  test('el modo demo responde sin llamar a nada', async () => {
    const answer = await createDemoClient().ask({ question: '¿Cuánto falta?', context });
    assert.match(answer, /modo demo/);
    assert.match(answer, /¿Cuánto falta\?/);
  });
});
