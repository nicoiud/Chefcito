import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ViroARSceneNavigator, ViroObjectDetector } from '@reactvision/react-viro';
import { ArMarkersScene, type ArMarkersSceneProps } from './ArMarkersScene';
import type { Detection } from './detectionAnchors';

/**
 * Contenedor de la escena AR y del detector de objetos.
 *
 * Igual que `ArMarkersScene`, importa Viro en el nivel superior y por lo
 * tanto solo puede cargarse cuando el módulo nativo existe. `ArGuideScreen`
 * lo trae con un require dinámico detrás de `isArAvailable()`.
 *
 * `ViroObjectDetector` va como hermano del navegador de escenas y comparte
 * su cámara: no abre una segunda sesión, que es exactamente el motivo por
 * el que esto se puede hacer con Viro y no con una librería de cámara
 * aparte. Android no permite dos sesiones de cámara a la vez.
 */

/**
 * Nombre del modelo, resuelto de forma nativa como `<nombre>.onnx` en los
 * assets de la app. Se exporta con nuestras clases horneadas adentro; ver
 * `ml/README_YOLOE.md`.
 */
export const MODELO_YOLOE = 'chefcito-ingredientes';

/**
 * Tope de inferencias por segundo. La cámara sigue dibujando a su ritmo;
 * esto solo limita cuántas veces corre el modelo, para no comerse la CPU
 * mientras el motor de AR renderiza en paralelo.
 */
const MAX_FPS_DETECCION = 10;

/** Por debajo de esto la detección es más ruido que señal. */
const CONFIANZA_MINIMA = 0.4;

export interface ArSceneViewProps extends ArMarkersSceneProps {
  onDetections?: (detections: Detection[]) => void;
  onDetectorError?: (mensaje: string) => void;
  onDetectorReady?: () => void;
}

export function ArSceneView({
  onDetections,
  onDetectorError,
  onDetectorReady,
  ...sceneProps
}: ArSceneViewProps) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <ViroARSceneNavigator
        style={StyleSheet.absoluteFill}
        autofocus
        initialScene={{ scene: ArMarkersScene }}
        viroAppProps={sceneProps}
      />

      {/* No dibuja nada: es solo el enganche del detector a la cámara. */}
      <ViroObjectDetector
        style={{ position: 'absolute', width: 0, height: 0 }}
        model={MODELO_YOLOE}
        mode="prompt-free"
        confidenceThreshold={CONFIANZA_MINIMA}
        maxFPS={MAX_FPS_DETECCION}
        onReady={() => onDetectorReady?.()}
        onError={({ error }) => onDetectorError?.(error)}
        onDetection={({ detections }) => {
          onDetections?.(
            detections
              // Sin caja en pantalla no hay nada que proyectar al mundo.
              .filter((d) => d.screenBoundingBox != null)
              .map((d) => ({
                label: d.label,
                confidence: d.confidence,
                box: d.screenBoundingBox!,
              }))
          );
        }}
      />
    </View>
  );
}
