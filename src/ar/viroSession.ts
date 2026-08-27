import type { ArSession } from './types';

/**
 * Backend de AR sobre ViroReact (ARKit en iOS, ARCore en Android).
 *
 * Se eligió Viro por sobre Unity + AR Foundation. El razonamiento completo
 * está en docs/AR.md; en resumen: `react-native-unity`, el plugin que haría
 * falta para embeber Unity, está sin mantenimiento desde 2022, mientras que
 * Viro declara soporte para nuestras versiones exactas de Expo y React
 * Native. Y los marcadores que pide la especificación son geometría simple
 * más texto, para lo cual Unity es enormemente desproporcionado.
 *
 * Requiere un development build: es un módulo nativo y no existe en Expo Go.
 * Por eso se carga de forma opcional — si no está, la pantalla usa la guía
 * 2D en lugar de romperse.
 */

function loadViro(): unknown | null {
  try {
    // Require dinámico a propósito: el paquete es opcional.
    return require('@reactvision/react-viro');
  } catch {
    return null;
  }
}

export class ViroArSession implements ArSession {
  readonly name = 'ViroReact (ARKit / ARCore)';

  private module = loadViro();

  isAvailable(): boolean {
    return this.module !== null;
  }
}
