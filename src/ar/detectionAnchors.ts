import type { ArPosition } from './types';

/**
 * Convierte detecciones de la cámara en anclas 3D estables.
 *
 * El detector devuelve una caja en coordenadas de pantalla, cuadro a
 * cuadro. Anclar el marcador directo ahí da un resultado inservible: la
 * caja tiembla, aparece y desaparece entre cuadros, y el marcador queda
 * saltando encima del ingrediente. Esta clase es la que convierte ese
 * chorro ruidoso en una posición que se queda quieta.
 *
 * Es lógica pura a propósito: la parte que se puede razonar y testear sin
 * un celular con ARCore. El hit test contra el mundo real lo hace la
 * pantalla; acá se decide *cuándo* vale la pena pedirlo y *qué* posición
 * mostrar mientras tanto.
 */

/** Caja en puntos de pantalla, tal como la devuelve ViroObjectDetector. */
export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  /** Etiqueta cruda del modelo, en inglés. */
  label: string;
  confidence: number;
  box: DetectionBox;
}

export interface AnchoredIngredient {
  ingredientId: string;
  /** Posición en el mundo, ya suavizada. */
  position: ArPosition;
  /** Última vez que la cámara lo vio, en milisegundos. */
  lastSeenAt: number;
  confidence: number;
}

/** El centro de la caja es el punto que se dispara contra el mundo real. */
export function boxCenter(box: DetectionBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Cuánto se tiene que mover una caja para que valga la pena volver a
 * preguntarle al mundo dónde está.
 *
 * El hit test es asíncrono y cuesta; hacerlo en cada cuadro para cada
 * detección satura el puente nativo sin que se note ninguna mejora. Si el
 * ingrediente se movió menos que esto, la posición vieja sigue siendo
 * buena.
 */
export const UMBRAL_REPROYECCION_PX = 24;

export function seMovioLoSuficiente(
  anterior: { x: number; y: number },
  actual: { x: number; y: number },
  umbral = UMBRAL_REPROYECCION_PX
): boolean {
  return Math.hypot(actual.x - anterior.x, actual.y - anterior.y) >= umbral;
}

/**
 * Peso del promedio exponencial al mezclar una posición nueva con la que
 * ya se estaba mostrando. Más bajo = más quieto pero más lento en
 * reaccionar; más alto = sigue mejor pero tiembla.
 */
export const SUAVIZADO = 0.35;

export function mezclarPosiciones(
  anterior: ArPosition,
  nueva: ArPosition,
  peso = SUAVIZADO
): ArPosition {
  return {
    x: anterior.x + (nueva.x - anterior.x) * peso,
    y: anterior.y + (nueva.y - anterior.y) * peso,
    z: anterior.z + (nueva.z - anterior.z) * peso,
  };
}

/**
 * Cuánto sobrevive un ancla sin que la cámara vuelva a ver el ingrediente.
 *
 * Sin esto, tapar la cebolla con la mano un segundo haría desaparecer el
 * marcador. Con un margen generoso, el marcador se queda donde estaba —
 * que es justamente lo que uno espera de algo anclado al mundo real.
 */
export const MS_ANTES_DE_OLVIDAR = 4000;

/**
 * Resultado de un hit test contra el mundo real, tal como lo devuelve Viro.
 */
export interface HitTestResult {
  type: string;
  transform: { position: [number, number, number] };
}

/**
 * Un hit test devuelve varios impactos y no todos valen lo mismo: un plano
 * ya detectado es una superficie real y estable, mientras que un
 * "FeaturePoint" es un punto suelto de la nube que baila con cada cuadro.
 * Anclar en el primero de la lista sin mirar el tipo es la diferencia entre
 * un marcador quieto y uno que tiembla.
 */
const PRIORIDAD_HIT: Record<string, number> = {
  ExistingPlaneUsingExtent: 5,
  ExistingPlane: 4,
  EstimatedHorizontalPlane: 3,
  DepthPoint: 2,
  FeaturePoint: 1,
};

export function pickBestHit(resultados: HitTestResult[] | null | undefined): ArPosition | null {
  if (!resultados || resultados.length === 0) return null;

  let mejor: HitTestResult | null = null;
  let mejorPrioridad = -1;
  for (const r of resultados) {
    const prioridad = PRIORIDAD_HIT[r.type] ?? 0;
    if (prioridad > mejorPrioridad) {
      mejorPrioridad = prioridad;
      mejor = r;
    }
  }

  if (!mejor?.transform?.position) return null;
  const [x, y, z] = mejor.transform.position;
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  return { x, y, z };
}

/**
 * Registro de ingredientes vistos por la cámara y dónde están en el mundo.
 */
export class DetectionAnchorStore {
  private anclas = new Map<string, AnchoredIngredient>();
  /** Último centro de caja por ingrediente, para decidir si reproyectar. */
  private ultimoCentro = new Map<string, { x: number; y: number }>();

  /**
   * Decide si hay que pedirle al motor de AR la posición de este punto.
   * Devuelve true la primera vez que se ve el ingrediente, y después solo
   * cuando se movió de verdad.
   */
  necesitaReproyeccion(ingredientId: string, centro: { x: number; y: number }): boolean {
    const anterior = this.ultimoCentro.get(ingredientId);
    if (!anterior) return true;
    return seMovioLoSuficiente(anterior, centro);
  }

  /** Registra el punto de pantalla que se está por reproyectar. */
  marcarReproyeccion(ingredientId: string, centro: { x: number; y: number }): void {
    this.ultimoCentro.set(ingredientId, centro);
  }

  /**
   * Guarda la posición que devolvió el hit test. Si ya había una, se
   * mezcla en vez de reemplazarse, para que el marcador no pegue saltos.
   */
  actualizar(
    ingredientId: string,
    position: ArPosition,
    confidence: number,
    ahora: number
  ): void {
    const previo = this.anclas.get(ingredientId);
    this.anclas.set(ingredientId, {
      ingredientId,
      position: previo ? mezclarPosiciones(previo.position, position) : position,
      lastSeenAt: ahora,
      confidence,
    });
  }

  /** Refresca la marca de tiempo sin mover el ancla. */
  tocar(ingredientId: string, confidence: number, ahora: number): void {
    const previo = this.anclas.get(ingredientId);
    if (previo) {
      this.anclas.set(ingredientId, { ...previo, lastSeenAt: ahora, confidence });
    }
  }

  /** Las anclas todavía vigentes, de la más confiable a la menos. */
  vigentes(ahora: number): AnchoredIngredient[] {
    const vivas: AnchoredIngredient[] = [];
    for (const ancla of this.anclas.values()) {
      if (ahora - ancla.lastSeenAt <= MS_ANTES_DE_OLVIDAR) vivas.push(ancla);
    }
    return vivas.sort((a, b) => b.confidence - a.confidence);
  }

  /** Descarta las anclas que ya caducaron. */
  purgar(ahora: number): void {
    for (const [id, ancla] of this.anclas) {
      if (ahora - ancla.lastSeenAt > MS_ANTES_DE_OLVIDAR) {
        this.anclas.delete(id);
        this.ultimoCentro.delete(id);
      }
    }
  }

  tieneAncla(ingredientId: string): boolean {
    return this.anclas.has(ingredientId);
  }

  reset(): void {
    this.anclas.clear();
    this.ultimoCentro.clear();
  }
}
