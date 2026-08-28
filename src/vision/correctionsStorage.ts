import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY_CORRECTIONS, type CorrectionsState } from './corrections';

const CORRECTIONS_KEY = 'chefcito:visionCorrections';

export async function loadCorrections(): Promise<CorrectionsState> {
  const raw = await AsyncStorage.getItem(CORRECTIONS_KEY);
  if (!raw) return EMPTY_CORRECTIONS;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.byRawLabel === 'object' && Array.isArray(parsed.history)) {
      return parsed as CorrectionsState;
    }
    return EMPTY_CORRECTIONS;
  } catch {
    return EMPTY_CORRECTIONS;
  }
}

export async function saveCorrections(state: CorrectionsState): Promise<void> {
  await AsyncStorage.setItem(CORRECTIONS_KEY, JSON.stringify(state));
}

/**
 * Exporta las correcciones como JSON.
 *
 * Cada corrección es un caso real donde el modelo falló, así que este
 * historial es material de entrenamiento valioso: son exactamente los
 * ejemplos que hay que agregar al dataset para que el error no se repita.
 */
export function exportCorrections(state: CorrectionsState): string {
  return JSON.stringify(state.history, null, 2);
}
