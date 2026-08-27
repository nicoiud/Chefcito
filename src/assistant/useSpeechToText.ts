import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voz → texto usando el reconocimiento nativo del sistema operativo
 * (SpeechRecognizer en Android, Speech framework en iOS). Es gratis y, con
 * `requiresOnDeviceRecognition`, corre sin salir del dispositivo — por eso
 * se evita Whisper por API, que cobraría por cada minuto transcripto.
 *
 * `expo-speech-recognition` es un módulo nativo y no existe en Expo Go ni en
 * web, así que se carga de forma opcional: si no está, el hook reporta
 * `isAvailable: false` y la pantalla ofrece escribir la pregunta a mano.
 */

interface SpeechResultEvent {
  isFinal: boolean;
  results: { transcript: string }[];
}

interface SpeechErrorEvent {
  error: string;
  message?: string;
}

interface EventSubscription {
  remove: () => void;
}

interface SpeechRecognitionModule {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (event: string, listener: (payload: never) => void) => EventSubscription;
}

function loadSpeechRecognition(): SpeechRecognitionModule | null {
  try {
    // Require dinámico: el módulo nativo puede no estar presente.
    const mod = require('expo-speech-recognition');
    return (mod?.ExpoSpeechRecognitionModule as SpeechRecognitionModule) ?? null;
  } catch {
    return null;
  }
}

export function useSpeechToText() {
  const moduleRef = useRef<SpeechRecognitionModule | null | undefined>(undefined);
  if (moduleRef.current === undefined) {
    moduleRef.current = loadSpeechRecognition();
  }
  const speechModule = moduleRef.current;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speechModule) return;

    const subscriptions: EventSubscription[] = [
      speechModule.addListener('result', ((event: SpeechResultEvent) => {
        const best = event.results[0]?.transcript ?? '';
        if (best) setTranscript(best);
      }) as (payload: never) => void),
      speechModule.addListener('error', ((event: SpeechErrorEvent) => {
        setError(event.message ?? event.error);
        setIsListening(false);
      }) as (payload: never) => void),
      speechModule.addListener('end', (() => setIsListening(false)) as (payload: never) => void),
    ];

    return () => subscriptions.forEach((sub) => sub.remove());
  }, [speechModule]);

  const startListening = useCallback(async () => {
    if (!speechModule) return;
    setError(null);
    setTranscript('');

    const permission = await speechModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitamos permiso de micrófono para escucharte.');
      return;
    }

    setIsListening(true);
    speechModule.start({
      lang: 'es-ES',
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
  }, [speechModule]);

  const stopListening = useCallback(() => {
    if (!speechModule) return;
    speechModule.stop();
    setIsListening(false);
  }, [speechModule]);

  return {
    isAvailable: speechModule !== null,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript: () => setTranscript(''),
  };
}
