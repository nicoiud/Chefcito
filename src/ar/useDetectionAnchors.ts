import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  resolveIngredientId,
  getDisplayName,
  getSupportedIngredientIds,
} from '../vision/ingredientCatalog';
import { EMPTY_CORRECTIONS, applyCorrections, type CorrectionsState } from '../vision/corrections';
import { loadCorrections } from '../vision/correctionsStorage';
import { DetectionAnchorStore, boxCenter, pickBestHit } from './detectionAnchors';
import type { Detection } from './detectionAnchors';
import { LiveBoxTracker, type TrackedBox } from './liveDetections';
import type { HitTestFn } from './ArMarkersScene';
import type { IngredientMarker } from './types';

/**
 * Une las tres piezas de la guía AR: lo que la cámara ve, dónde está eso
 * en el mundo real, y qué marcadores hay que dibujar.
 *
 * El ciclo por cada tanda de detecciones:
 *   1. Traducir la etiqueta del modelo al id del catálogo (y aplicar las
 *      correcciones que el usuario haya hecho antes).
 *   2. Quedarse solo con los ingredientes que este paso necesita.
 *   3. Si el ingrediente se movió lo suficiente, disparar un hit test
 *      contra el mundo para saber a qué distancia está.
 *   4. Guardar la posición suavizada y dibujar el marcador ahí.
 *
 * El paso 3 es asíncrono y es el caro: por eso el registro decide cuándo
 * vale la pena, en vez de pedirlo en cada cuadro.
 */
/** Cómo se rotula un ingrediente en el marcador. */
export interface EtiquetaIngrediente {
  label: string;
  detail?: string;
}

export function useDetectionAnchors(
  expectedIngredientIds: string[],
  /**
   * De dónde salen el nombre y la cantidad. La receta manda: dice "3
   * unidades" y usa sus propios nombres ("Mozzarella" y no "queso").
   */
  describir?: (ingredientId: string) => EtiquetaIngrediente
) {
  const store = useMemo(() => new DetectionAnchorStore(), []);
  const tracker = useMemo(() => new LiveBoxTracker(), []);
  const catalogo = useMemo(() => new Set(getSupportedIngredientIds()), []);
  const hitTestRef = useRef<HitTestFn | null>(null);
  // Las correcciones que el usuario hizo antes valen también acá: si dijo
  // que eso no era una manzana, no queremos volver a marcársela.
  const correcciones = useRef<CorrectionsState>(EMPTY_CORRECTIONS);
  const [markers, setMarkers] = useState<IngredientMarker[]>([]);
  const [vistos, setVistos] = useState<string[]>([]);
  // Todo lo que la cámara reconoce, sea o no de este paso: se marca en
  // pantalla al instante, sin esperar a que el hit test encuentre la mesada.
  const [cajas, setCajas] = useState<TrackedBox[]>([]);

  const esperados = useMemo(() => new Set(expectedIngredientIds), [expectedIngredientIds]);

  // Al cambiar de paso, lo anclado deja de tener sentido.
  useEffect(() => {
    store.reset();
    tracker.reset();
    setMarkers([]);
    setVistos([]);
    setCajas([]);
  }, [store, tracker, expectedIngredientIds]);

  useEffect(() => {
    let vigente = true;
    loadCorrections().then((c) => {
      if (vigente) correcciones.current = c;
    });
    return () => {
      vigente = false;
    };
  }, []);

  const onHitTestReady = useCallback((fn: HitTestFn | null) => {
    hitTestRef.current = fn;
  }, []);

  const redibujar = useCallback(
    (ahora: number) => {
      const vigentes = store.vigentes(ahora);
      setMarkers(
        vigentes.map((a) => {
          const etiqueta = describir?.(a.ingredientId) ?? {
            label: getDisplayName(a.ingredientId),
          };
          return {
            ingredientId: a.ingredientId,
            label: etiqueta.label,
            detail: etiqueta.detail,
            position: a.position,
            // Verlo con la cámara ES la confirmación: para eso existía el
            // estado, y hasta ahora no se activaba nunca.
            state: 'confirmado' as const,
          };
        })
      );
      setVistos(vigentes.map((a) => a.ingredientId));
    },
    [describir, store]
  );

  const onDetections = useCallback(
    async (detections: Detection[]) => {
      const ahora = Date.now();
      const hitTest = hitTestRef.current;

      // Las etiquetas crudas pasan por las correcciones del usuario antes
      // de resolverse, igual que en la pantalla de verificación.
      //
      // applyCorrections deduplica y se queda con la detección más
      // confiable de cada ingrediente, así que su índice NO se corresponde
      // con el de `detections`: hay que cruzar por etiqueta, no por
      // posición, o los marcadores salen cruzados entre sí.
      const corregidas = applyCorrections(
        detections.map((d) => ({
          rawLabel: d.label,
          ingredientId: resolveIngredientId(d.label) ?? d.label,
          confidence: d.confidence,
        })),
        correcciones.current
      );
      const idPorEtiqueta = new Map(corregidas.map((c) => [c.rawLabel, c.ingredientId]));
      const yaProcesados = new Set<string>();

      // Las cajas en pantalla van primero y sin esperar a nadie: el hit
      // test de abajo es asíncrono y no tiene por qué demorar lo que se ve.
      const reconocidas = detections.flatMap((d) => {
        const ingredientId = idPorEtiqueta.get(d.label);
        return ingredientId && catalogo.has(ingredientId) ? [{ ...d, ingredientId }] : [];
      });
      setCajas(tracker.actualizar(reconocidas, ahora));

      for (let i = 0; i < detections.length; i++) {
        const ingredientId = idPorEtiqueta.get(detections[i].label);
        if (!ingredientId || !esperados.has(ingredientId)) continue;
        // Dos cajas del mismo ingrediente: alcanza con anclar una.
        if (yaProcesados.has(ingredientId)) continue;
        yaProcesados.add(ingredientId);

        const centro = boxCenter(detections[i].box);
        const confianza = detections[i].confidence;

        if (!hitTest || !store.necesitaReproyeccion(ingredientId, centro)) {
          store.tocar(ingredientId, confianza, ahora);
          continue;
        }

        store.marcarReproyeccion(ingredientId, centro);
        const posicion = pickBestHit(await hitTest(centro.x, centro.y));
        if (posicion) store.actualizar(ingredientId, posicion, confianza, ahora);
        else store.tocar(ingredientId, confianza, ahora);
      }

      store.purgar(ahora);
      redibujar(ahora);
    },
    [catalogo, esperados, redibujar, store, tracker]
  );

  // Un ingrediente que se dejó de ver tiene que desaparecer aunque no
  // lleguen detecciones nuevas: sin este latido, el último marcador se
  // quedaría clavado en pantalla para siempre.
  useEffect(() => {
    const t = setInterval(() => redibujar(Date.now()), 1000);
    // Lo mismo para las cajas, con un latido más corto porque viven menos.
    const u = setInterval(() => setCajas(tracker.vigentes(Date.now())), 300);
    return () => {
      clearInterval(t);
      clearInterval(u);
    };
  }, [redibujar, tracker]);

  return { markers, vistos, cajas, onDetections, onHitTestReady };
}
