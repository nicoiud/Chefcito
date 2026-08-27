/**
 * Feature flags por fase, según la especificación del producto.
 * Cada fase debe poder activarse/desactivarse sin romper las anteriores.
 *
 * - FASE 1 (recetas): siempre activa, es la base de la app.
 * - FASE 2 (cámara/visión on-device): apagada hasta integrar el modelo TFLite/Core ML.
 * - FASE 3 (asistente de voz + LLM): apagada hasta tener backend con límite diario.
 * - FASE 4 (AR con Unity): apagada hasta resolver la integración nativa.
 */
export const featureFlags = {
  cameraIngredientDetection: false,
  voiceAssistant: false,
  arGuidance: false,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
