/**
 * Feature flags por fase, según la especificación del producto.
 * Cada fase debe poder activarse/desactivarse sin romper las anteriores,
 * para poder publicar versiones incrementales en las tiendas.
 *
 * - FASE 1 (recetas): siempre activa, es la base de la app.
 * - FASE 2 (cámara/visión on-device): activa.
 * - FASE 3 (asistente de voz + LLM): activa.
 * - FASE 4 (AR con Unity): apagada hasta resolver la integración nativa.
 */
export const featureFlags = {
  cameraIngredientDetection: true,
  voiceAssistant: true,
  arGuidance: false,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;
