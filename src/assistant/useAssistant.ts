import { useCallback, useEffect, useState } from 'react';
import { answerLocally, type AssistantContext } from './localAnswers';
import { DailyLimitReachedError, askAssistant } from './llmClient';
import {
  DAILY_MESSAGE_LIMIT,
  canSendMessage,
  recordMessage,
  remainingMessages,
  type UsageRecord,
} from './dailyLimit';
import { getOrCreateUserId, loadUsage, saveUsage } from './usageStorage';
import { isAssistantBackendConfigured } from '../config/env';
import { speak, stopSpeaking } from './speech';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** true si se respondió sin gastar cupo ni llamada paga al LLM. */
  answeredLocally?: boolean;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg-${messageCounter}`;
}

export function useAssistant(context: AssistantContext) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsage().then(setUsage);
    return () => stopSpeaking();
  }, []);

  const remaining = remainingMessages(usage, new Date());

  const pushMessage = useCallback((message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const respond = useCallback(
    (text: string, answeredLocally: boolean) => {
      pushMessage({ id: nextMessageId(), role: 'assistant', text, answeredLocally });
      speak(text);
    },
    [pushMessage]
  );

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      stopSpeaking();
      pushMessage({ id: nextMessageId(), role: 'user', text: trimmed });

      // 1. Lo que se pueda contestar con los datos de la receta no gasta cupo.
      const local = answerLocally(trimmed, context);
      if (local) {
        respond(local, true);
        return;
      }

      // 2. Pregunta abierta: requiere el LLM, que sí tiene costo por uso.
      const now = new Date();
      if (!canSendMessage(usage, now)) {
        setError(
          `Llegaste a las ${DAILY_MESSAGE_LIMIT} preguntas de hoy. Mañana se renueva.`
        );
        return;
      }

      if (!isAssistantBackendConfigured()) {
        setError(
          'El asistente de preguntas abiertas necesita el backend configurado ' +
            '(EXPO_PUBLIC_ASSISTANT_API_URL). Las preguntas sobre la receta funcionan sin él.'
        );
        return;
      }

      setIsLoading(true);
      try {
        const userId = await getOrCreateUserId();
        const reply = await askAssistant(trimmed, context, userId);

        const updatedUsage = recordMessage(usage, now);
        setUsage(updatedUsage);
        await saveUsage(updatedUsage);

        respond(reply.answer, false);
      } catch (e) {
        if (e instanceof DailyLimitReachedError) {
          const exhausted = { date: recordMessage(usage, now).date, count: DAILY_MESSAGE_LIMIT };
          setUsage(exhausted);
          await saveUsage(exhausted);
          setError(e.message);
        } else {
          setError(e instanceof Error ? e.message : 'No pude responder tu pregunta.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [context, isLoading, pushMessage, respond, usage]
  );

  return { messages, ask, isLoading, error, remaining, limit: DAILY_MESSAGE_LIMIT };
}
