import type { Detection, DetectionBox } from './detectionAnchors';

/**
 * Cajas de detección en vivo, dibujadas sobre la cámara.
 *
 * Los marcadores 3D dependen de que el hit test encuentre dónde apoyarse,
 * y eso tarda: mientras ARCore no reconstruye la mesada no aparece nada, y
 * el usuario siente que la cámara "no ve". Las cajas en pantalla, en
 * cambio, salen directo del detector y marcan el ingrediente en el mismo
 * cuadro en que se reconoce.
 *
 * El detector entrega cajas que tiemblan y parpadean cuadro a cuadro. Esta
 * clase las empareja con las del cuadro anterior (misma etiqueta, mayor
 * solapamiento), suaviza la posición y deja vivir una caja un rato después
 * de perderla, para que no titile.
 */

export interface TrackedBox {
  /** Estable entre cuadros: sirve de `key` en React. */
  key: string;
  ingredientId: string;
  box: DetectionBox;
  confidence: number;
  lastSeenAt: number;
}

/** Cuánto sobrevive una caja sin volver a verse. */
export const VIDA_CAJA_MS = 700;
/** Peso de la posición nueva en el promedio exponencial. */
const SUAVIZADO = 0.45;
/** Solapamiento mínimo para considerar que es la misma cosa. */
const IOU_MINIMO = 0.2;

export function iou(a: DetectionBox, b: DetectionBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function mezclar(viejo: DetectionBox, nuevo: DetectionBox): DetectionBox {
  const m = (a: number, b: number) => a + (b - a) * SUAVIZADO;
  return {
    x: m(viejo.x, nuevo.x),
    y: m(viejo.y, nuevo.y),
    width: m(viejo.width, nuevo.width),
    height: m(viejo.height, nuevo.height),
  };
}

export class LiveBoxTracker {
  private cajas: TrackedBox[] = [];
  private siguiente = 0;

  /**
   * Incorpora un cuadro. `detections` ya viene con el id de ingrediente
   * resuelto; lo que no es un ingrediente no llega hasta acá.
   */
  actualizar(detections: (Detection & { ingredientId: string })[], ahora: number): TrackedBox[] {
    const libres = new Set(this.cajas);
    for (const d of detections) {
      let mejor: TrackedBox | null = null;
      let mejorIou = IOU_MINIMO;
      for (const c of libres) {
        if (c.ingredientId !== d.ingredientId) continue;
        const v = iou(c.box, d.box);
        if (v >= mejorIou) {
          mejor = c;
          mejorIou = v;
        }
      }
      if (mejor) {
        libres.delete(mejor);
        mejor.box = mezclar(mejor.box, d.box);
        mejor.confidence = d.confidence;
        mejor.lastSeenAt = ahora;
      } else {
        this.cajas.push({
          key: `caja-${this.siguiente++}`,
          ingredientId: d.ingredientId,
          box: { ...d.box },
          confidence: d.confidence,
          lastSeenAt: ahora,
        });
      }
    }
    return this.vigentes(ahora);
  }

  vigentes(ahora: number): TrackedBox[] {
    this.cajas = this.cajas.filter((c) => ahora - c.lastSeenAt <= VIDA_CAJA_MS);
    return this.cajas.map((c) => ({ ...c, box: { ...c.box } }));
  }

  reset(): void {
    this.cajas = [];
  }
}

/** Cuántas piezas de cada ingrediente hay en pantalla. */
export function contarPorIngrediente(cajas: TrackedBox[]): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const c of cajas) cuenta.set(c.ingredientId, (cuenta.get(c.ingredientId) ?? 0) + 1);
  return cuenta;
}
