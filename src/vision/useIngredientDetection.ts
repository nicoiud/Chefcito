import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getIngredientDetector, getSupportedIngredientIds } from './index';
import { SimulatedIngredientDetector } from './simulatedDetector';
import { matchIngredients, type IngredientMatchResult } from '../utils/ingredientMatch';
import {
  EMPTY_CORRECTIONS,
  addCorrection,
  applyCorrections,
  mergeWithManualConfirmations,
  type CorrectionsState,
} from './corrections';
import { loadCorrections, saveCorrections } from './correctionsStorage';
import { TemporalSmoother } from './temporalSmoothing';
import type { DetectedIngredient, DetectionFrame } from './types';

/** Cada cuánto se corre inferencia sobre un frame nuevo. */
const DETECTION_INTERVAL_MS = 1500;

/**
 * Separa los ingredientes esperados según si el modelo puede reconocerlos.
 * Los no detectables no bloquean el paso: se confirman a mano.
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
  // Acumula evidencia entre cuadros: evita el parpadeo y permite sostener un
  // umbral de confianza más bajo sin empezar a inventar detecciones.
  const smoother = useMemo(() => new TemporalSmoother(), []);
  const [rawDetected, setRawDetected] = useState<DetectedIngredient[]>([]);
  const [corrections, setCorrections] = useState<CorrectionsState>(EMPTY_CORRECTIONS);
  const [manuallyConfirmed, setManuallyConfirmed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isDetectingRef = useRef(false);
  const captureFrameRef = useRef(captureFrame);
  captureFrameRef.current = captureFrame;

  useEffect(() => {
    loadCorrections().then(setCorrections);
  }, []);

  const { detectable, notDetectable } = useMemo(
    () => partitionExpectedIngredients(expectedIngredientIds),
    [expectedIngredientIds]
  );

  const expectedKey = expectedIngredientIds.join('|');

  // Al cambiar de paso se reinicia todo lo que era de ese paso.
  useEffect(() => {
    setRawDetected([]);
    setManuallyConfirmed([]);
    smoother.reset();
    if (detector instanceof SimulatedIngredientDetector) {
      detector.setExpectedIngredients(detectable);
    }
    // expectedKey identifica el conjunto sin recrear el array en cada render.
  }, [detector, smoother, expectedKey]);

  const runDetection = useCallback(async () => {
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;
    try {
      const frame = await captureFrameRef.current();
      if (!frame) return;
      setRawDetected(smoother.push(await detector.detect(frame)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al detectar ingredientes');
    } finally {
      isDetectingRef.current = false;
    }
  }, [detector, smoother]);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(runDetection, DETECTION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, runDetection]);

  /** Lo que ve la cámara, ya con las correcciones del usuario aplicadas. */
  const detected = useMemo(
    () => applyCorrections(rawDetected, corrections),
    [rawDetected, corrections]
  );

  /** Lo detectado más lo que el usuario confirmó a mano. */
  const presentIngredientIds = useMemo(
    () => mergeWithManualConfirmations(detected.map((d) => d.ingredientId), manuallyConfirmed),
    [detected, manuallyConfirmed]
  );

  const match: IngredientMatchResult = useMemo(
    // Se compara contra TODO lo esperado, no solo lo detectable: con la
    // confirmación manual, un ingrediente que el modelo no ve igual puede
    // completarse, así que ya no hay razón para excluirlo del check.
    () => matchIngredients(expectedIngredientIds, presentIngredientIds),
    [expectedIngredientIds, presentIngredientIds]
  );

  /** "Esto ya lo tengo": el usuario confirma un ingrediente a mano. */
  const confirmManually = useCallback((ingredientId: string) => {
    setManuallyConfirmed((current) =>
      current.includes(ingredientId) ? current : [...current, ingredientId]
    );
  }, []);

  const undoManualConfirmation = useCallback((ingredientId: string) => {
    setManuallyConfirmed((current) => current.filter((id) => id !== ingredientId));
  }, []);

  /** "Esto no es X, es Y": corrige una detección equivocada, y la recuerda. */
  const correctDetection = useCallback(
    (rawLabel: string, ingredientId: string) => {
      setCorrections((current) => {
        const next = addCorrection(current, rawLabel, ingredientId);
        saveCorrections(next);
        return next;
      });
    },
    []
  );

  return {
    detectorName: detector.name,
    detected,
    match,
    notDetectable,
    detectable,
    manuallyConfirmed,
    error,
    confirmManually,
    undoManualConfirmation,
    correctDetection,
  };
}
