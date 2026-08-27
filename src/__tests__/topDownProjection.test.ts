import { buildMarkers } from '../ar/markerLayout';
import { projectToTopDown } from '../ar/topDownProjection';

const AREA = { width: 300, height: 300, padding: 40 };

describe('projectToTopDown', () => {
  it('devuelve vacío si no hay marcadores', () => {
    expect(projectToTopDown([], AREA)).toEqual([]);
  });

  it('centra un marcador único', () => {
    const [p] = projectToTopDown(buildMarkers(['papa']), AREA);
    expect(p.screen.x).toBeCloseTo(150, 5);
    expect(p.screen.y).toBeCloseTo(150, 5);
  });

  it('conserva los datos del marcador al proyectarlo', () => {
    const [p] = projectToTopDown(buildMarkers(['papa'], ['papa']), AREA);
    expect(p.ingredientId).toBe('papa');
    expect(p.label).toBe('Papa');
    expect(p.state).toBe('confirmado');
  });

  it('mantiene todos los marcadores dentro del área', () => {
    const proyectados = projectToTopDown(
      buildMarkers(['papa', 'cebolla', 'huevo', 'ajo', 'tomate']),
      AREA
    );
    for (const p of proyectados) {
      expect(p.screen.x).toBeGreaterThanOrEqual(0);
      expect(p.screen.x).toBeLessThanOrEqual(AREA.width);
      expect(p.screen.y).toBeGreaterThanOrEqual(0);
      expect(p.screen.y).toBeLessThanOrEqual(AREA.height);
    }
  });

  it('respeta el orden izquierda-derecha del mundo real', () => {
    const markers = buildMarkers(['papa', 'cebolla', 'huevo']);
    const proyectados = projectToTopDown(markers, AREA);
    // El primer marcador está a la izquierda en el arco, el último a la derecha.
    expect(proyectados[0].screen.x).toBeLessThan(proyectados[2].screen.x);
  });

  it('invierte la profundidad: lo más lejano queda más arriba en pantalla', () => {
    const markers = buildMarkers(
      ['papa', 'cebolla', 'huevo', 'ajo', 'tomate'],
      [],
      { maxPerRow: 4 }
    );
    const proyectados = projectToTopDown(markers, AREA);

    const cercano = proyectados[0];   // arco cercano
    const lejano = proyectados[4];    // arco lejano (z más negativo)
    expect(lejano.screen.y).toBeLessThan(cercano.screen.y);
  });

  it('no deforma la disposición: usa la misma escala en ambos ejes', () => {
    const markers = buildMarkers(['papa', 'cebolla', 'huevo']);
    // Área muy ancha: si se escalara cada eje por separado, las distancias
    // horizontales se estirarían respecto de las verticales.
    const ancho = projectToTopDown(markers, { width: 900, height: 300, padding: 40 });

    const dxMundo = markers[2].position.x - markers[0].position.x;
    const dzMundo = markers[2].position.z - markers[0].position.z;
    const dxPantalla = ancho[2].screen.x - ancho[0].screen.x;
    const dyPantalla = ancho[2].screen.y - ancho[0].screen.y;

    if (dzMundo !== 0) {
      expect(Math.abs(dxPantalla / dxMundo)).toBeCloseTo(
        Math.abs(dyPantalla / dzMundo),
        4
      );
    }
  });

  it('centra el conjunto dentro del área', () => {
    const proyectados = projectToTopDown(
      buildMarkers(['papa', 'cebolla', 'huevo']),
      AREA
    );
    const xs = proyectados.map((p) => p.screen.x);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(AREA.width / 2, 4);
  });
});
