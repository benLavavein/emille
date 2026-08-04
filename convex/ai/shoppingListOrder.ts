import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireUser } from "../users";
import { getMySoulmateRow } from "../soulmates";
import { AI_MODELS } from "./models";
import { isStoreSectionId, normalizeStoreLayout } from "../../shared/storeSections";

function normalizeItemName(name: string) {
  return name.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function createOrderResponseSchema(itemCount: number) {
  return {
  type: "object",
  additionalProperties: false,
  properties: {
    sectionIndexes: {
      type: "array",
      items: { type: "integer", minimum: 0 },
      minItems: itemCount,
      maxItems: itemCount,
    },
  },
  required: ["sectionIndexes"],
  } as const;
}

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
    const soulmate = await getMySoulmateRow(ctx, user._id);
    const listOwner = soulmate?.row.sharing.shoppingList ? soulmate.row.user1Id : user._id;
    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    const items = (shoppingList?.items ?? [])
        .filter((item) => !item.checked)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({ id: item.id, name: item.name, normalizedName: normalizeItemName(item.name) }));
    const normalizedNames = [...new Set(items.map((item) => item.normalizedName))];
    const cachedCategories = (await Promise.all(
      normalizedNames.map((normalizedName) =>
        ctx.db
          .query("itemSectionCache")
          .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
          .unique(),
      ),
    )).flatMap((entry) =>
      entry && isStoreSectionId(entry.sectionId)
        ? [{ normalizedName: entry.normalizedName, sectionId: entry.sectionId }]
        : [],
    );

    return {
      storeLayout: normalizeStoreLayout(user.storeLayout),
      items,
      cachedCategories,
    };
  },
});

/** Organizes unchecked items by the current Pro user's saved store layout. */
export const organize = action({
  args: {},
  handler: async (ctx): Promise<{ itemIds: string[] }> => {
    const list = await ctx.runQuery(internal.ai.shoppingListOrder.getListForOrdering, {});
    if (list.items.length < 2) return { itemIds: list.items.map((item) => item.id) };

    const sectionIndexById = new Map<string, number>(list.storeLayout.map((section, index) => [section.id, index]));
    const cachedSectionByName = new Map<string, string>(
      list.cachedCategories.map((entry) => [entry.normalizedName, entry.sectionId]),
    );
    const uncachedItems = list.items.filter((item) => !cachedSectionByName.has(item.normalizedName));
    if (uncachedItems.length === 0) {
      return {
        itemIds: [...list.items]
          .sort((a, b) =>
            (sectionIndexById.get(cachedSectionByName.get(a.normalizedName)!) ?? 0) -
            (sectionIndexById.get(cachedSectionByName.get(b.normalizedName)!) ?? 0),
          )
          .map((item) => item.id),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("AI features are not configured yet.");

    const outputText = await requestStructuredOutput(apiKey, {
      model: AI_MODELS.shoppingListOrder,
      max_output_tokens: 2000,
      text: {
        format: {
          type: "json_schema",
            name: "shopping_list_section_assignments",
          strict: true,
          schema: createOrderResponseSchema(uncachedItems.length),
        },
      },
      input: [
        {
          role: "system",
          content:
            "Assign every shopping-list item to exactly one numbered store section. Return one sectionIndexes value for each supplied item, in the exact same order as the items array. Each value must be the index of the best matching section from the supplied sections array. Use the supplied Other section for an item whose location is unclear. Do not omit, duplicate, rename, or invent items. The server will enforce the final order from the section indexes.",
        },
        {
          role: "user",
          content: JSON.stringify({
            sections: list.storeLayout.map((section, index) => ({
              index,
              name: section.name,
            })),
            items: uncachedItems.map(({ name }) => name),
          }),
        },
      ],
    });

    const parsed = JSON.parse(outputText) as {
      sectionIndexes: number[];
    };
    if (
      parsed.sectionIndexes.length !== uncachedItems.length ||
      parsed.sectionIndexes.some(
        (sectionIndex) =>
          !Number.isInteger(sectionIndex) ||
          sectionIndex < 0 ||
          sectionIndex >= list.storeLayout.length,
      )
    ) {
      throw new Error("The AI returned an incomplete shopping-list order. Please try again.");
    }

    for (const [index, item] of uncachedItems.entries()) {
      cachedSectionByName.set(
        item.normalizedName,
        list.storeLayout[parsed.sectionIndexes[index]]?.id ?? "other",
      );
    }
    await ctx.runMutation(internal.shoppingList.cacheCategories, {
      entries: [...new Map(
        uncachedItems.map((item) => [item.normalizedName, cachedSectionByName.get(item.normalizedName)!]),
      )].map(([normalizedName, sectionId]) => ({ normalizedName, sectionId })),
    });

    const sourceOrder = new Map(list.items.map((item, index) => [item.id, index]));
    const itemIds = [...list.items]
      .sort(
        (a, b) =>
          (sectionIndexById.get(cachedSectionByName.get(a.normalizedName)!) ?? 0) -
            (sectionIndexById.get(cachedSectionByName.get(b.normalizedName)!) ?? 0) ||
          (sourceOrder.get(a.id) ?? 0) - (sourceOrder.get(b.id) ?? 0),
      )
      .map((item) => item.id);

    return { itemIds };
  },
});
