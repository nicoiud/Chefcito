import React, { useRef, useState } from 'react';
import {
  ViroARPlaneSelector,
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

/**
 * Escena AR: marcadores anclados sobre la mesada real.
 *
 * IMPORTANTE: este archivo importa Viro en el nivel superior, así que solo
 * debe cargarse cuando el módulo nativo existe (development build). Quien
 * lo carga es `ArGuideScreen`, con un require dinámico detrás de
 * `isArAvailable()`. Si se importara estáticamente, la app crashearía al
 * abrir la pantalla en Expo Go.
 *
 * Flujo: ARCore/ARKit detecta planos horizontales → el usuario toca la
 * mesada → `ViroARPlaneSelector` ancla ahí y coloca los marcadores en el
 * espacio local de ese plano, con las posiciones que calcula
 * `buildMarkers()`. Tocar "Recalibrar" desmonta y vuelve a montar la
 * escena, lo que reinicia la selección de plano.
 */

ViroMaterials.createMaterials({
  // Mismos colores que el sistema de diseño: el marcador en AR y el de la
  // guía 2D tienen que verse como la misma cosa.
  chefcitoPendiente: { diffuseColor: '#E2551E' },
  chefcitoConfirmado: { diffuseColor: '#2F7D4F' },
});

/**
 * Un plano recién detectado por ARCore arranca chico y va creciendo a
 * medida que el usuario mueve el celular. Con un mínimo alto, los primeros
 * segundos se descartan todos los planos y no aparece nada para tocar: el
 * usuario cree que no funciona. 12 cm entra en cualquier mesada y deja
 * afuera el ruido.
 */
const MIN_LADO_PLANO = 0.12;

export interface ArMarkersSceneProps {
  markers: IngredientMarker[];
  onTrackingChange?: (state: ArTrackingState) => void;
  onPlaneSelected?: () => void;
}

export function ArMarkersScene(
  // Viro tipa la escena como `() => Element` pero en runtime le inyecta
  // `sceneNavigator`. El valor por defecto hace compatibles ambas firmas.
  props: { sceneNavigator?: { viroAppProps?: ArMarkersSceneProps } } = {}
) {
  const appProps = props.sceneNavigator?.viroAppProps;
  const markers = appProps?.markers ?? [];
  const [anchored, setAnchored] = useState(false);
  // Ref y no estado: lo lee `onTrackingUpdated`, que Viro llama seguido, y
  // no hace falta redibujar la escena por esto.
  const hayPlano = useRef(false);

  const onTrackingUpdated = (state: ViroTrackingState, reason: ViroTrackingReason) => {
    if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
      if (anchored) appProps?.onTrackingChange?.('anclado');
      else if (hayPlano.current) appProps?.onTrackingChange?.('superficie-lista');
      else appProps?.onTrackingChange?.('buscando-superficie');
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
      onTrackingUpdated={onTrackingUpdated}
      // Explícito a propósito: sin esto dependemos del default del motor
      // para que ARCore busque planos, que es justamente lo único que esta
      // pantalla necesita.
      anchorDetectionTypes={['PlanesHorizontal']}
    >
      <ViroAmbientLight color="#FFFFFF" intensity={220} />

      <ViroARPlaneSelector
        // Solo mesadas y mesas: no tiene sentido anclar en una pared.
        alignment="HorizontalUpward"
        minWidth={MIN_LADO_PLANO}
        minHeight={MIN_LADO_PLANO}
        onPlaneDetected={() => {
          // Avisa apenas hay algo para tocar, así el cartel deja de decir
          // "buscando" cuando en realidad ya encontró.
          if (!hayPlano.current) {
            hayPlano.current = true;
            if (!anchored) appProps?.onTrackingChange?.('superficie-lista');
          }
          return true;
        }}
        onPlaneRemoved={() => {
          hayPlano.current = false;
        }}
        onPlaneSelected={() => {
          setAnchored(true);
          appProps?.onPlaneSelected?.();
          appProps?.onTrackingChange?.('anclado');
        }}
      >
        {markers.map((marker) => (
          <ViroNode
            key={marker.ingredientId}
            position={[marker.position.x, marker.position.y, marker.position.z]}
          >
            {/* Disco apoyado sobre la mesada, rotado para quedar horizontal. */}
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
              position={[0, 0.06, 0]}
              scale={[0.14, 0.14, 0.14]}
              style={{ fontSize: 26, color: '#FFFFFF', textAlign: 'center' }}
              outerStroke={{ type: 'Outline', width: 3, color: '#000000' }}
              // Que el texto siempre mire al usuario, se mueva por donde se mueva.
              transformBehaviors={['billboardY']}
            />
          </ViroNode>
        ))}
      </ViroARPlaneSelector>
    </ViroARScene>
  );
}
