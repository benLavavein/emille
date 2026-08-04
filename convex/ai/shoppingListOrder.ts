import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../users";
import { getMySoulmateRow } from "../soulmates";
import { AI_MODELS } from "./models";

const orderResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          sectionIndex: { type: "integer", minimum: 0 },
        },
        required: ["id", "sectionIndex"],
      },
    },
  },
  required: ["assignments"],
} as const;

async function requestStructuredOutput(apiKey: string, body: Record<string, unknown>) {
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
    throw new Error(error?.error?.message ?? "The AI could not organize this list.");
  }

  const result = (await response.json()) as {
    incomplete_details?: { reason?: string };
    output?: Array<{ content?: Array<{ type: string; text?: string; refusal?: string }> }>;
  };
  const content = result.output?.flatMap((item) => item.content ?? []);
  const outputText = content?.find((part) => part.type === "output_text")?.text;
  if (outputText) return outputText;

  const refusal = content?.find((part) => part.type === "refusal")?.refusal;
  const incompleteReason = result.incomplete_details?.reason;
  throw new Error(
    refusal
      ? `The AI could not organize this list. ${refusal}`
      : incompleteReason
        ? `The AI could not organize this list. Response incomplete: ${incompleteReason}.`
        : "The AI could not organize this list.",
  );
}

/** Loads the caller's layout and the shopping list they are allowed to organize. */
export const getListForOrdering = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.pro !== true) throw new Error("Shopping list organization requires Pro.");
    if (!user.storeLayout || user.storeLayout.length === 0) {
      throw new Error("Add your store layout in Settings before organizing your list.");
    }

    const soulmate = await getMySoulmateRow(ctx, user._id);
    const listOwner = soulmate?.row.sharing.shoppingList ? soulmate.row.user1Id : user._id;
    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    return {
      storeLayout: user.storeLayout,
      items: (shoppingList?.items ?? [])
        .filter((item) => !item.checked)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ id: item.id, name: item.name })),
    };
  },
});

/** Organizes unchecked items by the current Pro user's saved store layout. */
export const organize = action({
  args: {},
  handler: async (ctx) => {
    const list = await ctx.runQuery(internal.ai.shoppingListOrder.getListForOrdering, {});
    if (list.items.length < 2) return { itemIds: list.items.map((item) => item.id) };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("AI features are not configured yet.");

    const outputText = await requestStructuredOutput(apiKey, {
      model: AI_MODELS.shoppingListOrder,
      max_output_tokens: 500,
      text: {
        format: {
          type: "json_schema",
            name: "shopping_list_section_assignments",
          strict: true,
          schema: orderResponseSchema,
        },
      },
      input: [
        {
          role: "system",
          content:
            "Assign every shopping-list item to exactly one numbered store section. sectionIndex must be the index of the best matching section from the supplied sections array. Use the special sectionIndex equal to the number of supplied sections only for an item whose location is unclear. Do not use any other sectionIndex. Do not omit, duplicate, rename, or invent items. The server will enforce the final order from the section indexes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            sections: list.storeLayout.map((section, index) => ({
              index,
              name: section.name,
            })),
            items: list.items,
          }),
        },
      ],
    });

    const parsed = JSON.parse(outputText) as {
      assignments: Array<{ id: string; sectionIndex: number }>;
    };
    const expectedIds = new Set(list.items.map((item) => item.id));
    const returnedIds = new Set(parsed.assignments.map((assignment) => assignment.id));
    if (
      parsed.assignments.length !== list.items.length ||
      returnedIds.size !== expectedIds.size ||
      [...expectedIds].some((id) => !returnedIds.has(id)) ||
      parsed.assignments.some(
        (assignment) =>
          !Number.isInteger(assignment.sectionIndex) ||
          assignment.sectionIndex < 0 ||
          assignment.sectionIndex > list.storeLayout.length,
      )
    ) {
      throw new Error("The AI returned an incomplete shopping-list order. Please try again.");
    }

    const sourceOrder = new Map(list.items.map((item, index) => [item.id, index]));
    const itemIds = [...parsed.assignments]
      .sort(
        (a, b) =>
          a.sectionIndex - b.sectionIndex ||
          (sourceOrder.get(a.id) ?? 0) - (sourceOrder.get(b.id) ?? 0),
      )
      .map((assignment) => assignment.id);

    return { itemIds };
  },
});
