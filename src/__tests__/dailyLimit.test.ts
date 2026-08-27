import {
  DAILY_MESSAGE_LIMIT,
  canSendMessage,
  formatDay,
  normalizeUsage,
  recordMessage,
  remainingMessages,
} from '../assistant/dailyLimit';

const today = new Date('2026-08-27T10:00:00');
const tomorrow = new Date('2026-08-28T09:00:00');

describe('formatDay', () => {
  it('formatea la fecha como YYYY-MM-DD', () => {
    expect(formatDay(new Date('2026-01-05T23:00:00'))).toBe('2026-01-05');
  });
});

describe('normalizeUsage', () => {
  it('arranca en cero cuando no hay registro previo', () => {
    expect(normalizeUsage(null, today)).toEqual({ date: '2026-08-27', count: 0 });
  });

  it('conserva el conteo dentro del mismo día', () => {
    const record = { date: '2026-08-27', count: 5 };
    expect(normalizeUsage(record, today)).toEqual(record);
  });

  it('reinicia el conteo cuando cambia el día', () => {
    const record = { date: '2026-08-27', count: 20 };
    expect(normalizeUsage(record, tomorrow)).toEqual({ date: '2026-08-28', count: 0 });
  });
});

describe('remainingMessages', () => {
  it('devuelve el límite completo sin uso previo', () => {
    expect(remainingMessages(null, today)).toBe(DAILY_MESSAGE_LIMIT);
  });

  it('descuenta los mensajes ya usados', () => {
    expect(remainingMessages({ date: '2026-08-27', count: 8 }, today)).toBe(
      DAILY_MESSAGE_LIMIT - 8
    );
  });

  it('nunca devuelve un número negativo', () => {
    expect(remainingMessages({ date: '2026-08-27', count: 99 }, today)).toBe(0);
  });

  it('se renueva al día siguiente', () => {
    expect(remainingMessages({ date: '2026-08-27', count: 20 }, tomorrow)).toBe(
      DAILY_MESSAGE_LIMIT
    );
  });
});

describe('canSendMessage', () => {
  it('permite enviar mientras queden mensajes', () => {
    expect(canSendMessage({ date: '2026-08-27', count: 19 }, today)).toBe(true);
  });

  it('bloquea al alcanzar el límite', () => {
    expect(canSendMessage({ date: '2026-08-27', count: 20 }, today)).toBe(false);
  });

  it('respeta un límite personalizado', () => {
    expect(canSendMessage({ date: '2026-08-27', count: 3 }, today, 3)).toBe(false);
  });
});

describe('recordMessage', () => {
  it('incrementa el conteo del día', () => {
    expect(recordMessage({ date: '2026-08-27', count: 4 }, today)).toEqual({
      date: '2026-08-27',
      count: 5,
    });
  });

  it('cuenta desde cero en un día nuevo', () => {
    expect(recordMessage({ date: '2026-08-27', count: 20 }, tomorrow)).toEqual({
      date: '2026-08-28',
      count: 1,
    });
  });
});
