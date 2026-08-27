import { buildMarkers, positionInArc } from '../ar/markerLayout';

describe('positionInArc', () => {
  it('coloca un marcador único justo al frente del usuario', () => {
    const p = positionInArc(0, 1, 0.35, Math.PI / 2, 0.02);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.z).toBeCloseTo(-0.35, 5);
    expect(p.y).toBeCloseTo(0.02, 5);
  });

  it('reparte los marcadores simétricamente alrededor del centro', () => {
    const izq = positionInArc(0, 3, 0.35, Math.PI / 2, 0.02);
    const centro = positionInArc(1, 3, 0.35, Math.PI / 2, 0.02);
    const der = positionInArc(2, 3, 0.35, Math.PI / 2, 0.02);

    expect(izq.x).toBeCloseTo(-der.x, 5);
    expect(centro.x).toBeCloseTo(0, 5);
    expect(izq.z).toBeCloseTo(der.z, 5);
  });

  it('mantiene todos los marcadores sobre el radio pedido', () => {
    for (let i = 0; i < 4; i += 1) {
      const p = positionInArc(i, 4, 0.5, Math.PI / 2, 0);
      // Las posiciones se redondean a milímetros a propósito, así que la
      // tolerancia se compara a esa escala y no a la del punto flotante.
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(0.5, 2);
    }
  });

  it('siempre coloca los marcadores adelante del usuario, nunca atrás', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(positionInArc(i, 5, 0.35, (100 * Math.PI) / 180, 0.02).z).toBeLessThan(0);
    }
  });
});

describe('buildMarkers', () => {
  it('devuelve un marcador por ingrediente esperado', () => {
    const markers = buildMarkers(['papa', 'cebolla', 'huevo']);
    expect(markers).toHaveLength(3);
    expect(markers.map((m) => m.ingredientId)).toEqual(['papa', 'cebolla', 'huevo']);
  });

  it('usa el nombre legible del ingrediente como etiqueta', () => {
    expect(buildMarkers(['limon'])[0].label).toBe('Limón');
  });

  it('marca como confirmados los ingredientes que la cámara ya detectó', () => {
    const markers = buildMarkers(['papa', 'cebolla'], ['papa']);
    expect(markers.find((m) => m.ingredientId === 'papa')!.state).toBe('confirmado');
    expect(markers.find((m) => m.ingredientId === 'cebolla')!.state).toBe('pendiente');
  });

  it('deja todo pendiente si no se detectó nada', () => {
    const markers = buildMarkers(['papa', 'cebolla']);
    expect(markers.every((m) => m.state === 'pendiente')).toBe(true);
  });

  it('no repite posiciones entre marcadores', () => {
    const markers = buildMarkers(['papa', 'cebolla', 'huevo', 'ajo']);
    const posiciones = markers.map((m) => `${m.position.x},${m.position.z}`);
    expect(new Set(posiciones).size).toBe(markers.length);
  });

  it('abre un arco más lejano cuando no entran todos en el primero', () => {
    const markers = buildMarkers(
      ['papa', 'cebolla', 'huevo', 'ajo', 'tomate', 'sal'],
      [],
      { maxPerRow: 4, radius: 0.35, rowSpacing: 0.2 }
    );

    const radio = (m: (typeof markers)[number]) =>
      Math.hypot(m.position.x, m.position.z);

    // Los primeros cuatro en el arco cercano, los dos restantes más lejos.
    expect(radio(markers[0])).toBeCloseTo(0.35, 2);
    expect(radio(markers[4])).toBeCloseTo(0.55, 2);
    expect(radio(markers[5])).toBeCloseTo(0.55, 2);
  });

  it('devuelve vacío si el paso no tiene ingredientes', () => {
    expect(buildMarkers([])).toEqual([]);
  });

  it('respeta la altura configurada sobre el plano', () => {
    const markers = buildMarkers(['papa'], [], { height: 0.05 });
    expect(markers[0].position.y).toBeCloseTo(0.05, 5);
  });

  it('las posiciones son relativas al ancla, así que recalibrar no las cambia', () => {
    // Recalibrar mueve el ancla, no la disposición: para los mismos
    // ingredientes el layout debe ser idéntico entre sesiones.
    const antes = buildMarkers(['papa', 'cebolla']);
    const despues = buildMarkers(['papa', 'cebolla']);
    expect(despues).toEqual(antes);
  });
});
