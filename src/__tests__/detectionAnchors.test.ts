import {
  DetectionAnchorStore,
  MS_ANTES_DE_OLVIDAR,
  UMBRAL_REPROYECCION_PX,
  boxCenter,
  mezclarPosiciones,
  pickBestHit,
  seMovioLoSuficiente,
} from '../ar/detectionAnchors';

describe('centro de la caja', () => {
  it('es el punto medio', () => {
    expect(boxCenter({ x: 10, y: 20, width: 100, height: 50 })).toEqual({ x: 60, y: 45 });
  });
});

describe('cuándo reproyectar', () => {
  it('ignora el temblor de la caja entre cuadros', () => {
    expect(seMovioLoSuficiente({ x: 100, y: 100 }, { x: 105, y: 103 })).toBe(false);
  });

  it('reacciona cuando el ingrediente se movió de verdad', () => {
    expect(seMovioLoSuficiente({ x: 100, y: 100 }, { x: 160, y: 100 })).toBe(true);
  });

  it('mide en diagonal, no por eje', () => {
    // 18 y 18 dan 25.4 de distancia: pasa el umbral aunque ningún eje solo lo haga.
    expect(UMBRAL_REPROYECCION_PX).toBe(24);
    expect(seMovioLoSuficiente({ x: 0, y: 0 }, { x: 18, y: 18 })).toBe(true);
    expect(seMovioLoSuficiente({ x: 0, y: 0 }, { x: 23, y: 0 })).toBe(false);
  });
});

describe('suavizado de posiciones', () => {
  it('se mueve hacia la nueva sin saltar', () => {
    const p = mezclarPosiciones({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 0.35);
    expect(p.x).toBeCloseTo(0.35, 5);
  });

  it('converge si la posición nueva se repite', () => {
    let p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 30; i++) p = mezclarPosiciones(p, { x: 1, y: 0, z: 0 }, 0.35);
    expect(p.x).toBeCloseTo(1, 3);
  });
});

describe('registro de anclas', () => {
  it('pide reproyección la primera vez que ve algo', () => {
    const s = new DetectionAnchorStore();
    expect(s.necesitaReproyeccion('tomate', { x: 10, y: 10 })).toBe(true);
  });

  it('deja de pedirla mientras el ingrediente no se mueva', () => {
    const s = new DetectionAnchorStore();
    s.marcarReproyeccion('tomate', { x: 10, y: 10 });
    expect(s.necesitaReproyeccion('tomate', { x: 14, y: 12 })).toBe(false);
    expect(s.necesitaReproyeccion('tomate', { x: 90, y: 90 })).toBe(true);
  });

  it('mezcla en vez de reemplazar cuando ya había un ancla', () => {
    const s = new DetectionAnchorStore();
    s.actualizar('tomate', { x: 0, y: 0, z: 0 }, 0.9, 1000);
    s.actualizar('tomate', { x: 1, y: 0, z: 0 }, 0.9, 1100);
    expect(s.vigentes(1100)[0].position.x).toBeCloseTo(0.35, 5);
  });

  it('mantiene el marcador si el ingrediente se tapa un momento', () => {
    const s = new DetectionAnchorStore();
    s.actualizar('tomate', { x: 0, y: 0, z: 0 }, 0.9, 1000);
    expect(s.vigentes(1000 + MS_ANTES_DE_OLVIDAR - 1)).toHaveLength(1);
  });

  it('lo olvida cuando pasó demasiado tiempo', () => {
    const s = new DetectionAnchorStore();
    s.actualizar('tomate', { x: 0, y: 0, z: 0 }, 0.9, 1000);
    const despues = 1000 + MS_ANTES_DE_OLVIDAR + 1;
    expect(s.vigentes(despues)).toHaveLength(0);
    s.purgar(despues);
    expect(s.tieneAncla('tomate')).toBe(false);
  });

  it('ordena por confianza', () => {
    const s = new DetectionAnchorStore();
    s.actualizar('tomate', { x: 0, y: 0, z: 0 }, 0.5, 1000);
    s.actualizar('cebolla', { x: 1, y: 0, z: 0 }, 0.95, 1000);
    expect(s.vigentes(1000).map((a) => a.ingredientId)).toEqual(['cebolla', 'tomate']);
  });

  it('tocar refresca el tiempo sin mover el ancla', () => {
    const s = new DetectionAnchorStore();
    s.actualizar('tomate', { x: 2, y: 0, z: 0 }, 0.9, 1000);
    s.tocar('tomate', 0.4, 3000);
    const [a] = s.vigentes(3000);
    expect(a.position.x).toBe(2);
    expect(a.lastSeenAt).toBe(3000);
    expect(a.confidence).toBe(0.4);
  });
});

describe('elegir el mejor impacto del hit test', () => {
  const hit = (type: string, x: number) => ({
    type,
    transform: { position: [x, 0, 0] as [number, number, number] },
  });

  it('prefiere un plano real antes que un punto suelto de la nube', () => {
    const p = pickBestHit([hit('FeaturePoint', 1), hit('ExistingPlaneUsingExtent', 2)]);
    expect(p?.x).toBe(2);
  });

  it('respeta el orden entre tipos de plano', () => {
    expect(pickBestHit([hit('EstimatedHorizontalPlane', 1), hit('ExistingPlane', 2)])?.x).toBe(2);
  });

  it('usa el punto suelto si no hay nada mejor', () => {
    expect(pickBestHit([hit('FeaturePoint', 7)])?.x).toBe(7);
  });

  it('no rompe cuando no hubo impactos', () => {
    expect(pickBestHit([])).toBeNull();
    expect(pickBestHit(null)).toBeNull();
    expect(pickBestHit(undefined)).toBeNull();
  });

  it('descarta posiciones inválidas en vez de anclar en NaN', () => {
    expect(
      pickBestHit([{ type: 'ExistingPlane', transform: { position: [NaN, 0, 0] } }])
    ).toBeNull();
  });
});
