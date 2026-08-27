import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIngredientDetector, getSupportedIngredientIds } from './index';
import { SimulatedIngredientDetector } from './simulatedDetector';
import { matchIngredients, type IngredientMatchResult } from '../utils/ingredientMatch';
import type { DetectedIngredient, DetectionFrame } from './types';

/** Cada cuánto se corre inferencia sobre un frame nuevo. */
const DETECTION_INTERVAL_MS = 1500;

/**
 * Separa los ingredientes esperados según si el modelo puede reconocerlos.
 * Cosas como la sal o el caldo no son detectables visualmente, así que no
 * deben bloquear nunca la verificación del paso.
 */
export function partitionExpectedIngredients(expectedIngredientIds: string[]) {
  const supported = new Set(getSupportedIngredientIds());
  return {
    detectable: expectedIngredientIds.filter((id) => supported.has(id)),
    notDetectable: expectedIngredientIds.filter((id) => !supported.has(id)),
  };
}

interface UseIngredientDetectionOptions {
  expectedIngredientIds: string[];
  /** Captura el frame actual de la cámara. Null mientras la cámara no está lista. */
  captureFrame: () => Promise<DetectionFrame | null>;
  enabled: boolean;
}

export function useIngredientDetection({
  expectedIngredientIds,
  captureFrame,
  enabled,
}: UseIngredientDetectionOptions) {
  const detector = useMemo(() => getIngredientDetector(), []);
  const [detected, setDetected] = useState<DetectedIngredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isDetectingRef = useRef(false);
  const captureFrameRef = useRef(captureFrame);
  captureFrameRef.current = captureFrame;

  const { detectable, notDetectable } = useMemo(
    () => partitionExpectedIngredients(expectedIngredientIds),
    [expectedIngredientIds]
  );

  const detectableKey = detectable.join('|');

  useEffect(() => {
    setDetected([]);
    if (detector instanceof SimulatedIngredientDetector) {
      detector.setExpectedIngredients(detectable);
    }
    // detectableKey identifica el conjunto de ingredientes sin recrear el array.
  }, [detector, detectableKey]);

  const runDetection = useCallback(async () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;
    try {
      const frame = await captureFrameRef.current();
      if (!frame) return;
      setDetected(await detector.detect(frame));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al detectar ingredientes');
    } finally {
      isDetectingRef.current = false;
    }
  }, [detector]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(runDetection, DETECTION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, runDetection]);

  const match: IngredientMatchResult = useMemo(
    () => matchIngredients(detectable, detected.map((d) => d.ingredientId)),
    [detectable, detected]
  );

  return { detectorName: detector.name, detected, match, notDetectable, error };
}
