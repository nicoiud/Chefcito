import {
  EMPTY_CORRECTIONS,
  addCorrection,
  applyCorrections,
  mergeWithManualConfirmations,
  removeCorrection,
} from '../vision/corrections';
import type { DetectedIngredient } from '../vision/types';

const det = (
  ingredientId: string,
  rawLabel: string,
  confidence: number
): DetectedIngredient => ({ ingredientId, rawLabel, confidence });

const AHORA = new Date('2026-08-28T12:00:00Z');

describe('addCorrection', () => {
  it('registra que una etiqueta era otro ingrediente', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    expect(s.byRawLabel.apple).toBe('tomate');
    expect(s.history).toHaveLength(1);
  });

  it('normaliza la etiqueta para que no dependa de mayúsculas', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, '  Apple ', 'tomate', AHORA);
    expect(s.byRawLabel.apple).toBe('tomate');
  });

  it('la corrección más nueva reemplaza a la anterior', () => {
    let s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    s = addCorrection(s, 'apple', 'morron', AHORA);
    expect(s.byRawLabel.apple).toBe('morron');
    expect(s.history).toHaveLength(2);
  });

  it('ignora entradas vacías', () => {
    expect(addCorrection(EMPTY_CORRECTIONS, '', 'tomate', AHORA)).toBe(EMPTY_CORRECTIONS);
    expect(addCorrection(EMPTY_CORRECTIONS, 'apple', '', AHORA)).toBe(EMPTY_CORRECTIONS);
  });

  it('no muta el estado anterior', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    expect(EMPTY_CORRECTIONS.history).toHaveLength(0);
    expect(s).not.toBe(EMPTY_CORRECTIONS);
  });
});

describe('removeCorrection', () => {
  it('olvida una corrección', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    expect(removeCorrection(s, 'apple').byRawLabel.apple).toBeUndefined();
  });

  it('no falla si la corrección no existe', () => {
    expect(removeCorrection(EMPTY_CORRECTIONS, 'apple')).toBe(EMPTY_CORRECTIONS);
  });
});

describe('applyCorrections', () => {
  it('reemplaza el ingrediente de una detección corregida', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    const out = applyCorrections([det('manzana', 'apple', 0.8)], s);
    expect(out[0].ingredientId).toBe('tomate');
    expect(out[0].rawLabel).toBe('apple');
  });

  it('deja intactas las detecciones sin corrección', () => {
    const out = applyCorrections([det('papa', 'potato', 0.9)], EMPTY_CORRECTIONS);
    expect(out[0].ingredientId).toBe('papa');
  });

  it('no duplica cuando la corrección apunta a algo ya detectado', () => {
    const s = addCorrection(EMPTY_CORRECTIONS, 'apple', 'tomate', AHORA);
    const out = applyCorrections(
      [det('manzana', 'apple', 0.6), det('tomate', 'tomato', 0.9)],
      s
    );
    expect(out).toHaveLength(1);
    expect(out[0].confidence).toBe(0.9);
  });

  it('ordena por confianza', () => {
    const out = applyCorrections(
      [det('papa', 'potato', 0.5), det('tomate', 'tomato', 0.95)],
      EMPTY_CORRECTIONS
    );
    expect(out.map((d) => d.ingredientId)).toEqual(['tomate', 'papa']);
  });

  it('devuelve vacío si no hay detecciones', () => {
    expect(applyCorrections([], EMPTY_CORRECTIONS)).toEqual([]);
  });
});

describe('mergeWithManualConfirmations', () => {
  it('suma lo confirmado a mano a lo detectado', () => {
    expect(mergeWithManualConfirmations(['papa'], ['cebolla']).sort()).toEqual([
      'cebolla',
      'papa',
    ]);
  });

  it('no duplica si el usuario confirma algo que ya se detectaba', () => {
    expect(mergeWithManualConfirmations(['papa'], ['papa'])).toEqual(['papa']);
  });

  it('permite avanzar con ingredientes que el modelo nunca detecta', () => {
    // La sal no es detectable visualmente; confirmarla a mano debe alcanzar.
    expect(mergeWithManualConfirmations([], ['sal'])).toEqual(['sal']);
  });

  it('funciona sin confirmaciones manuales', () => {
    expect(mergeWithManualConfirmations(['papa'], [])).toEqual(['papa']);
  });
});
