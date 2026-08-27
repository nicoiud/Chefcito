import { answerLocally, normalizeQuestion } from '../assistant/localAnswers';
import { recipes } from '../data/recipes';

const recipe = recipes.find((r) => r.id === 'tortilla-de-papas')!;
const context = { recipe, stepIndex: 1 };

describe('normalizeQuestion', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizeQuestion('¿Cuántas PORCIONES?')).toBe('¿cuantas porciones?');
  });
});

describe('answerLocally', () => {
  it('responde qué ingredientes lleva la receta sin llamar al LLM', () => {
    const answer = answerLocally('¿qué ingredientes lleva?', context);
    expect(answer).toContain('Papa');
    expect(answer).toContain('Huevo');
  });

  it('repite el paso actual', () => {
    const answer = answerLocally('repetí el paso', context);
    expect(answer).toContain('Paso 2 de 4');
    expect(answer).toContain('Freír las papas');
  });

  it('describe el siguiente paso', () => {
    const answer = answerLocally('¿qué sigue?', context);
    expect(answer).toContain('paso 3');
  });

  it('avisa cuando no hay siguiente paso', () => {
    const answer = answerLocally('¿qué sigue?', { recipe, stepIndex: 3 });
    expect(answer).toBe('Este es el último paso de la receta.');
  });

  it('responde cuántas porciones rinde', () => {
    expect(answerLocally('¿para cuántos es?', context)).toContain('4 porciones');
  });

  it('responde cuánto tarda', () => {
    expect(answerLocally('¿cuánto tiempo lleva?', context)).toContain('40 minutos');
  });

  it('responde cuántos pasos faltan', () => {
    expect(answerLocally('¿cuánto falta?', context)).toBe('Te quedan 2 pasos.');
  });

  it('usa singular cuando falta un solo paso', () => {
    expect(answerLocally('¿cuánto falta?', { recipe, stepIndex: 2 })).toBe('Te queda 1 paso.');
  });

  it('devuelve null para preguntas abiertas que sí requieren el LLM', () => {
    expect(answerLocally('¿puedo reemplazar la papa por batata?', context)).toBeNull();
    expect(answerLocally('¿por qué se me quema la tortilla?', context)).toBeNull();
  });

  it('devuelve null para una pregunta vacía', () => {
    expect(answerLocally('   ', context)).toBeNull();
  });
});
