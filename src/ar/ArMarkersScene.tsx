import React, { useState } from 'react';
import {
  ViroARPlaneSelector,
  ViroARScene,
  ViroAmbientLight,
  ViroMaterials,
  ViroNode,
  ViroQuad,
  ViroText,
  ViroTrackingStateConstants,
  type ViroTrackingReason,
  type ViroTrackingState,
} from '@reactvision/react-viro';
import type { IngredientMarker } from './types';

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
  chefcitoPendiente: { diffuseColor: '#FB8C00' },
  chefcitoConfirmado: { diffuseColor: '#43A047' },
});

export interface ArMarkersSceneProps {
  markers: IngredientMarker[];
  onTrackingChange?: (state: 'buscando-superficie' | 'anclado' | 'perdido') => void;
  onPlaneSelected?: () => void;
}

/**
 * Viro instancia la escena por sí mismo y le pasa `sceneNavigator.viroAppProps`,
 * así que los datos llegan por ahí y no por props directas.
 */
export function ArMarkersScene(
  // Viro tipa la escena como `() => Element` pero en runtime le inyecta
  // `sceneNavigator`. El valor por defecto hace compatibles ambas firmas.
  props: { sceneNavigator?: { viroAppProps?: ArMarkersSceneProps } } = {}
) {
  const appProps = props.sceneNavigator?.viroAppProps;
  const markers = appProps?.markers ?? [];
  const [anchored, setAnchored] = useState(false);

  const onTrackingUpdated = (state: ViroTrackingState, _reason: ViroTrackingReason) => {
    if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
      appProps?.onTrackingChange?.(anchored ? 'anclado' : 'buscando-superficie');
    } else {
      // LIMITED o UNAVAILABLE: la pantalla ofrece recalibrar.
      appProps?.onTrackingChange?.('perdido');
    }
  };

  return (
    <ViroARScene onTrackingUpdated={onTrackingUpdated}>
      <ViroAmbientLight color="#FFFFFF" intensity={220} />

      <ViroARPlaneSelector
        // Solo mesadas y mesas: no tiene sentido anclar en una pared.
        alignment="HorizontalUpward"
        // Descarta superficies demasiado chicas para apoyar ingredientes.
        minWidth={0.25}
        minHeight={0.25}
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
