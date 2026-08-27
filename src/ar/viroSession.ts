import { NativeModules, Platform } from 'react-native';
import type { ArSession } from './types';

/**
 * Backend de AR sobre ViroReact (ARKit en iOS, ARCore en Android).
 *
 * Se eligió Viro por sobre Unity + AR Foundation; el razonamiento está en
 * docs/AR.md. En resumen: el puente `react-native-unity` está sin
 * mantenimiento desde 2022, Viro soporta nuestras versiones exactas de
 * Expo y React Native, y los marcadores que pide la especificación son
 * geometría simple más texto.
 *
 * Detección de disponibilidad: NO alcanza con que el import del paquete
 * funcione. En Expo Go el JavaScript de Viro carga igual, pero el módulo
 * nativo no está registrado, así que la escena AR crashearía al montarse.
 * Por eso se verifica el módulo nativo concreto.
 */

const VIRO_NATIVE_MODULE = 'VRTARSceneNavigatorModule';

function hasViroNativeModule(): boolean {
  // Web no tiene NativeModules en el sentido de RN.
  if (Platform.OS === 'web') return false;
  return Boolean(NativeModules?.[VIRO_NATIVE_MODULE]);
}

export class ViroArSession implements ArSession {
  readonly name = 'ViroReact (ARKit / ARCore)';

  isAvailable(): boolean {
    return hasViroNativeModule();
  }
}
