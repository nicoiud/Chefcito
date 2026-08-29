import { useCallback, useEffect, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';

/**
 * Averigua si la AR puede realmente arrancar en este dispositivo.
 *
 * Existe porque la pantalla de AR fallaba en silencio: sin permiso de
 * cámara, ARCore no recibe imagen y no detecta ninguna superficie nunca.
 * El usuario veía una pantalla negra con el cartel "Buscando la mesada"
 * para siempre, sin ninguna pista de qué faltaba.
 *
 * Los dos motivos por los que no arranca son distintos y necesitan
 * respuestas distintas: el permiso se puede pedir, la falta de ARCore no.
 */
export type ArReadiness =
  /** Todavía consultando permisos y soporte. */
  | 'verificando'
  /** Falta el permiso de cámara. Se puede pedir. */
  | 'sin-permiso'
  /** El dispositivo no soporta ARCore/ARKit, o falta instalarlo. */
  | 'sin-soporte'
  /** Todo listo: se puede montar la escena. */
  | 'listo';

/**
 * Viro solo existe en un development build. Igual que con la escena, hay
 * que traerlo con require dinámico o la pantalla revienta en Expo Go.
 */
async function consultarSoporteAr(): Promise<boolean> {
  try {
    const viro = require('@reactvision/react-viro');
    if (typeof viro.isARSupportedOnDevice !== 'function') return false;
    const respuesta = await viro.isARSupportedOnDevice();
    return respuesta?.isARSupported === true;
  } catch {
    return false;
  }
}

export function useArReadiness(): {
  readiness: ArReadiness;
  pedirPermiso: () => void;
} {
  const [permission, requestPermission] = useCameraPermissions();
  const [soportaAr, setSoportaAr] = useState<boolean | null>(null);

  useEffect(() => {
    let vigente = true;
    consultarSoporteAr().then((ok) => {
      if (vigente) setSoportaAr(ok);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const pedirPermiso = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  let readiness: ArReadiness;
  if (soportaAr === null || !permission) {
    readiness = 'verificando';
  } else if (!soportaAr) {
    readiness = 'sin-soporte';
  } else if (!permission.granted) {
    readiness = 'sin-permiso';
  } else {
    readiness = 'listo';
  }

  return { readiness, pedirPermiso };
}
