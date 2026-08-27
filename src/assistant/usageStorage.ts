import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { UsageRecord } from './dailyLimit';

const USAGE_KEY = 'chefcito:llmUsage';
const USER_ID_KEY = 'chefcito:userId';

export async function loadUsage(): Promise<UsageRecord | null> {
  const raw = await AsyncStorage.getItem(USAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.date === 'string' && typeof parsed?.count === 'number') {
      return parsed as UsageRecord;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveUsage(record: UsageRecord): Promise<void> {
  await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(record));
}

/**
 * Id anónimo y estable del dispositivo, usado por el backend para llevar el
 * contador diario. No identifica a la persona: es un UUID aleatorio que se
 * genera una sola vez y queda guardado localmente.
 */
export async function getOrCreateUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(USER_ID_KEY);
  if (existing) return existing;

  const userId = Crypto.randomUUID();
  await AsyncStorage.setItem(USER_ID_KEY, userId);
  return userId;
}
