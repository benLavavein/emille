/**
 * Keep model selection centralized so individual AI features can be tuned
 * without scattering model IDs throughout the application.
 */
export const AI_MODELS = {
  recipeReview: "gpt-5.4-nano",
  recipeCleanup: "gpt-5.4-mini",
  shoppingListOrder: "gpt-5.4-nano",
} as const;
