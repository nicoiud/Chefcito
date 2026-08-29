import { MENSAJES } from '../screens/ArGuideScreen';
import type { ArTrackingState } from '../ar/types';

/**
 * La pantalla de AR busca el mensaje por estado. Si algún día se agrega un
 * estado y se olvida el mensaje, la pantalla queda en blanco justo cuando
 * el usuario más necesita saber qué está pasando.
 */
const TODOS_LOS_ESTADOS: ArTrackingState[] = [
  'buscando-superficie',
  'superficie-lista',
  'anclado',
  'poca-textura',
  'mucho-movimiento',
  'perdido',
];

describe('mensajes de estado de AR', () => {
  it('cubre todos los estados posibles', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(MENSAJES[estado]).toBeDefined();
    }
    expect(Object.keys(MENSAJES).sort()).toEqual([...TODOS_LOS_ESTADOS].sort());
  });

  it('cada mensaje dice qué hacer, no solo qué pasa', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      const m = MENSAJES[estado];
      expect(m.titulo.length).toBeGreaterThan(0);
      // El detalle es la instrucción accionable: sin eso el usuario queda igual.
      expect(m.detalle.length).toBeGreaterThan(20);
    }
  });

  it('solo marca en verde los estados donde de verdad va bien', () => {
    expect(MENSAJES['anclado'].ok).toBe(true);
    expect(MENSAJES['superficie-lista'].ok).toBe(true);
    expect(MENSAJES['poca-textura'].ok).toBe(false);
    expect(MENSAJES['mucho-movimiento'].ok).toBe(false);
    expect(MENSAJES['perdido'].ok).toBe(false);
    expect(MENSAJES['buscando-superficie'].ok).toBe(false);
  });
});
