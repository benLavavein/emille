import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../users";
import { AI_MODELS } from "./models";

const cleanupResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          timerSeconds: { type: ["integer", "null"] },
        },
        required: ["text", "timerSeconds"],
      },
    },
  },
  required: ["steps"],
} as const;

const reviewResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    needsCleanup: { type: "boolean" },
    reason: { type: "string" },
    isRecipeConsistent: { type: "boolean" },
    consistencyReason: { type: "string" },
  },
  required: [
    "needsCleanup",
    "reason",
    "isRecipeConsistent",
    "consistencyReason",
  ],
} as const;

async function requestStructuredOutput(
  apiKey: string,
  body: Record<string, unknown>,
  failureMessage: string,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(error?.error?.message ?? failureMessage);
  }

  const result = (await response.json()) as {
    status?: string;
    incomplete_details?: { reason?: string };
    output?: Array<{
      content?: Array<{ type: string; text?: string; refusal?: string }>;
    }>;
  };
  const outputText = result.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "output_text")?.text;

  if (outputText) return outputText;

  const refusal = result.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === "refusal")?.refusal;
  const incompleteReason = result.incomplete_details?.reason;
  throw new Error(
    refusal
      ? `${failureMessage} ${refusal}`
      : incompleteReason
        ? `${failureMessage} Response incomplete: ${incompleteReason}.`
        : failureMessage,
  );
}

/** Fetches only a Pro user's own meal for the cleanup action. */
export const getRecipeForCleanup = internalQuery({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }) => {
    const user = await requireUser(ctx);
    if (user.pro !== true) {
      throw new Error("Recipe cleanup requires Pro.");
    }

    const meal = await ctx.db.get(mealId);
    if (!meal || meal.userId !== user._id) {
      throw new Error("Meal not found.");
    }

    return {
      ingredients: meal.ingredients,
      steps: meal.steps.map((step) =>
        typeof step === "string" ? { text: step } : step,
      ),
    };
  },
});

/** Uses a low-cost model to decide whether a cleanup preview is worthwhile. */
export const review = action({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }) => {
    const recipe = await ctx.runQuery(
      internal.ai.recipeCleanup.getRecipeForCleanup,
      { mealId },
    );
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("AI features are not configured yet.");

    const outputText = await requestStructuredOutput(
      apiKey,
      {
        model: AI_MODELS.recipeReview,
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "recipe_cleanup_review",
            strict: true,
            schema: reviewResponseSchema,
          },
        },
        input: [
          {
            role: "system",
            content:
              "Review these recipe instructions without rewriting them. First compare the steps with the ingredient list. Set isRecipeConsistent=false when they materially conflict, such as when the instructions clearly describe making a different dish or rely on key ingredients that are absent. Do not treat common pantry staples or optional garnish as a conflict. Explain any conflict concisely in consistencyReason. Only assess needsCleanup when isRecipeConsistent=true. Treat the atomic-step requirement strictly: a step should contain one primary cooking action. Return needsCleanup=true if any step chains distinct sequential actions a cook performs separately, such as preheating, chopping, mixing, adding, cooking, resting, or serving, even if that step is logical and accurate. Also return true for filler, conversational language, repetition, unnecessary story-like phrasing, or avoidably wordy instructions. Return needsCleanup=false only when every step is already one atomic action (or a genuinely simultaneous action), concise, clear, and correctly ordered. Do not judge recipe quality or add facts.",
          },
          { role: "user", content: JSON.stringify(recipe) },
        ],
      },
      "The AI could not review these instructions.",
    );

    return JSON.parse(outputText) as {
      needsCleanup: boolean;
      reason: string;
      isRecipeConsistent: boolean;
      consistencyReason: string;
    };
  },
});

/** Returns a cleanup preview. The client chooses whether to save it. */
export const preview = action({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }) => {
    const recipe = await ctx.runQuery(
      internal.ai.recipeCleanup.getRecipeForCleanup,
      { mealId },
    );
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("AI features are not configured yet.");
    }

    const outputText = await requestStructuredOutput(
      apiKey,
      {
        model: AI_MODELS.recipeCleanup,
        max_output_tokens: 2000,
        text: {
          format: {
            type: "json_schema",
            name: "cleaned_recipe_steps",
            strict: true,
            schema: cleanupResponseSchema,
          },
        },
        input: [
          {
            role: "system",
            content:
              "Rewrite recipe instructions into concise cooking steps. Split a step into multiple steps whenever it contains distinct sequential operations that a cook would perform separately (for example: preheat, chop, add, stir, bake, or rest). Keep related actions together only when they are performed simultaneously. Remove conversational fluff and repetition. Preserve all temperatures, timings, quantities, and important food-safety details. Do not add ingredients, techniques, or facts that are not in the recipe. Use timerSeconds only when a step gives a clear duration; otherwise return null.",
          },
          {
            role: "user",
            content: JSON.stringify(recipe),
          },
        ],
      },
      "The AI did not return cleaned instructions.",
    );

    const parsed = JSON.parse(outputText) as {
      steps: Array<{ text: string; timerSeconds: number | null }>;
    };
    const steps = parsed.steps
      .map((step) => ({
        text: step.text.trim(),
        timerSeconds: step.timerSeconds ?? undefined,
      }))
      .filter((step) => step.text.length > 0);

    if (steps.length === 0) {
      throw new Error("The AI did not return any usable instructions.");
    }

    return { steps };
  },
});
