import React from 'react';
import { StyleSheet } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import { ArMarkersScene, type ArMarkersSceneProps } from './ArMarkersScene';

/**
 * Contenedor de la escena AR.
 *
 * Igual que `ArMarkersScene`, importa Viro en el nivel superior y por lo
 * tanto solo puede cargarse cuando el módulo nativo existe. `ArGuideScreen`
 * lo trae con un require dinámico detrás de `isArAvailable()`.
 */
export function ArSceneView(props: ArMarkersSceneProps) {
  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFill}
      autofocus
      initialScene={{ scene: ArMarkersScene }}
      viroAppProps={props}
    />
  );
}
