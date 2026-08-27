/**
 * Contador de uso diario del LLM (Fase 3).
 *
 * El LLM es el único componente con costo variable del proyecto, así que
 * el uso se limita por usuario y por día. Este contador es la copia
 * cliente: sirve para mostrar "te quedan N preguntas hoy" y para evitar
 * llamadas de más. La validación que realmente importa es la del backend
 * (ver backend/), porque el cliente es manipulable.
 */

export const DAILY_MESSAGE_LIMIT = 20;

export interface UsageRecord {
  /** Día en formato YYYY-MM-DD, para saber cuándo reiniciar. */
  date: string;
  count: number;
}

export function formatDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Devuelve el registro vigente, reiniciándolo si cambió el día. */
export function normalizeUsage(record: UsageRecord | null, now: Date): UsageRecord {
  const today = formatDay(now);
  if (!record || record.date !== today) {
    return { date: today, count: 0 };
  }
  return record;
}

export function remainingMessages(
  record: UsageRecord | null,
  now: Date,
  limit: number = DAILY_MESSAGE_LIMIT
): number {
  const usage = normalizeUsage(record, now);
  return Math.max(0, limit - usage.count);
}

export function canSendMessage(
  record: UsageRecord | null,
  now: Date,
  limit: number = DAILY_MESSAGE_LIMIT
): boolean {
  return remainingMessages(record, now, limit) > 0;
}

/** Registra un mensaje consumido y devuelve el nuevo registro. */
export function recordMessage(record: UsageRecord | null, now: Date): UsageRecord {
  const usage = normalizeUsage(record, now);
  return { date: usage.date, count: usage.count + 1 };
}
