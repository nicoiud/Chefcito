import React, { useCallback, useEffect, useRef } from 'react';
import {
  ViroARScene,
  ViroAmbientLight,
  ViroARTrackingReasonConstants,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroText,
  ViroTrackingStateConstants,
  type ViroTrackingReason,
  type ViroTrackingState,
} from '@reactvision/react-viro';
import type { ArTrackingState, IngredientMarker } from './types';
import type { HitTestResult } from './detectionAnchors';

/**
 * Escena AR: marcadores apoyados sobre los ingredientes que la cámara ve.
 *
 * IMPORTANTE: este archivo importa Viro en el nivel superior, así que solo
 * debe cargarse cuando el módulo nativo existe (development build). Quien
 * lo carga es `ArGuideScreen`, con un require dinámico detrás de
 * `isArAvailable()`.
 *
 * Ya no hay paso de calibración. Antes el usuario tenía que encontrar un
 * plano y tocarlo para anclar un arco de marcadores inventado; ahora
 * `ViroObjectDetector` reconoce los ingredientes sobre la misma cámara de
 * la AR, y cada detección se dispara contra el mundo con un hit test para
 * saber dónde está de verdad. El marcador va ahí.
 *
 * La escena no decide nada de eso: solo dibuja las posiciones que le
 * llegan y le presta el hit test a quien recibe las detecciones, porque
 * `performARHitTestWithPoint` vive en la referencia de la escena.
 */

ViroMaterials.createMaterials({
  // Mismos colores que el sistema de diseño: el marcador en AR y el de la
  // guía 2D tienen que verse como la misma cosa.
  chefcitoPendiente: { diffuseColor: '#E2551E' },
  chefcitoConfirmado: { diffuseColor: '#2F7D4F' },
});

export type HitTestFn = (x: number, y: number) => Promise<HitTestResult[]>;

export interface ArMarkersSceneProps {
  markers: IngredientMarker[];
  onTrackingChange?: (state: ArTrackingState) => void;
  /** La escena entrega su hit test apenas está montada. */
  onHitTestReady?: (hitTest: HitTestFn | null) => void;
}

export function ArMarkersScene(
  // Viro tipa la escena como `() => Element` pero en runtime le inyecta
  // `sceneNavigator`. El valor por defecto hace compatibles ambas firmas.
  props: { sceneNavigator?: { viroAppProps?: ArMarkersSceneProps } } = {}
) {
  const appProps = props.sceneNavigator?.viroAppProps;
  const markers = appProps?.markers ?? [];
  const sceneRef = useRef<any>(null);

  const hitTest = useCallback<HitTestFn>(async (x, y) => {
    const escena = sceneRef.current;
    if (!escena?.performARHitTestWithPoint) return [];
    try {
      return (await escena.performARHitTestWithPoint(x, y)) ?? [];
    } catch {
      // Un hit test puede fallar mientras el seguimiento está perdido. No
      // es un error de la app: simplemente todavía no hay dónde anclar.
      return [];
    }
  }, []);

  const entregarHitTest = appProps?.onHitTestReady;
  useEffect(() => {
    entregarHitTest?.(hitTest);
    return () => entregarHitTest?.(null);
  }, [entregarHitTest, hitTest]);

  const onTrackingUpdated = (state: ViroTrackingState, reason: ViroTrackingReason) => {
    if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
      appProps?.onTrackingChange?.(markers.length > 0 ? 'anclado' : 'buscando-superficie');
      return;
    }

    // El motivo importa: cada uno se arregla con una acción distinta del
    // usuario, y decirle "se perdió el seguimiento" no le sirve de nada.
    if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_INSUFFICIENT_FEATURES) {
      appProps?.onTrackingChange?.('poca-textura');
    } else if (reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION) {
      appProps?.onTrackingChange?.('mucho-movimiento');
    } else {
      appProps?.onTrackingChange?.('perdido');
    }
  };

  return (
    <ViroARScene
      ref={sceneRef}
      onTrackingUpdated={onTrackingUpdated}
      // Los hit tests apoyan mucho mejor cuando ARCore ya tiene planos
      // horizontales detectados, aunque nadie los toque.
      anchorDetectionTypes={['PlanesHorizontal']}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={220} />

      {/* Las posiciones son del mundo: vienen del hit test, no de un arco
          calculado, así que van directo en la raíz de la escena. */}
      {markers.map((marker) => (
        <ViroNode
          key={marker.ingredientId}
          position={[marker.position.x, marker.position.y, marker.position.z]}
        >
          <ViroQuad
            rotation={[-90, 0, 0]}
            width={0.12}
            height={0.12}
            materials={[
              marker.state === 'confirmado' ? 'chefcitoConfirmado' : 'chefcitoPendiente',
            ]}
          />
          <ViroText
            text={marker.label}
            position={[0, 0.09, 0]}
            scale={[0.14, 0.14, 0.14]}
            style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center' }}
            outerStroke={{ type: 'Outline', width: 3, color: '#000000' }}
            // Que el texto siempre mire al usuario, se mueva por donde se mueva.
            transformBehaviors={['billboardY']}
          />

          {/* La cantidad, más chica y debajo: reconocer el ingrediente sin
              decir cuánto va deja al usuario yendo a buscar la receta. */}
          {marker.detail ? (
            <ViroText
              text={marker.detail}
              position={[0, 0.055, 0]}
              scale={[0.14, 0.14, 0.14]}
              style={{ fontSize: 19, color: '#FFD9C7', textAlign: 'center' }}
              outerStroke={{ type: 'Outline', width: 3, color: '#000000' }}
              transformBehaviors={['billboardY']}
            />
          ) : null}
        </ViroNode>
      ))}
    </ViroARScene>
  );
}
