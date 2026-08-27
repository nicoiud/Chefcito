/**
 * Configuración de entorno.
 *
 * La URL del backend se toma de una variable EXPO_PUBLIC_*, que Expo inyecta
 * en tiempo de build. Nunca se guarda acá la API key del LLM: esa vive
 * únicamente en el servidor (ver backend/), porque cualquier cosa que se
 * incluya en el bundle de la app es legible por quien la descargue.
 */
export const ASSISTANT_API_URL = process.env.EXPO_PUBLIC_ASSISTANT_API_URL ?? '';

export function isAssistantBackendConfigured(): boolean {
  return ASSISTANT_API_URL.length > 0;
}
