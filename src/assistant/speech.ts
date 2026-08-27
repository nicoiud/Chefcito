import * as Speech from 'expo-speech';

/**
 * Texto → voz usando el motor nativo del sistema operativo
 * (AVSpeechSynthesizer en iOS, TextToSpeech en Android).
 * Corre 100% en el dispositivo: es gratis, sin límite y sin conexión.
 */

const SPEECH_LANGUAGE = 'es-ES';

export function speak(text: string, onDone?: () => void): void {
  Speech.speak(text, {
    language: SPEECH_LANGUAGE,
    rate: 1.0,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}
