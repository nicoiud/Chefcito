/**
 * Contador de uso diario por usuario.
 *
 * Esta implementación guarda el estado en memoria: alcanza para desarrollo y
 * para una sola instancia, pero se pierde al reiniciar y no se comparte entre
 * réplicas. Para producción hay que reemplazarla por Firebase o Supabase
 * (ambos tienen tier gratuito) manteniendo esta misma interfaz.
 */

export function formatDay(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createInMemoryUsageStore() {
  const usageByUser = new Map();

  return {
    /** Devuelve cuántos mensajes lleva usados el usuario hoy. */
    async getCount(userId, now) {
      const today = formatDay(now);
      const record = usageByUser.get(userId);
      if (!record || record.date !== today) return 0;
      return record.count;
    },

    /** Suma un mensaje al conteo del día y devuelve el nuevo total. */
    async increment(userId, now) {
      const today = formatDay(now);
      const record = usageByUser.get(userId);
      const count = record && record.date === today ? record.count + 1 : 1;
      usageByUser.set(userId, { date: today, count });
      return count;
    },
  };
}
