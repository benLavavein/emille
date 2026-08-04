"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const KNOWN_UNITS = new Set([
  "cup", "cups",
  "tbsp", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters",
  "quart", "quarts", "qt",
  "pint", "pints", "pt",
  "gallon", "gallons", "gal",
  "dash", "dashes",
  "pinch", "pinches",
  "bunch", "bunches",
  "can", "cans",
  "clove", "cloves",
  "sprig", "sprigs",
  "head", "heads",
  "stalk", "stalks",
  "stick", "sticks",
  "slice", "slices",
  "piece", "pieces",
  "package", "packages", "pkg",
  "bag", "bags",
  "bottle", "bottles",
  "large", "medium", "small",
]);

const UNIT_ABBREVIATIONS: Record<string, string> = {
  tablespoon: "tbsp", tablespoons: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  gram: "g", grams: "g",
  kilogram: "kg", kilograms: "kg",
  milliliter: "ml", milliliters: "ml",
  liter: "l", liters: "l",
  quart: "qt", quarts: "qt",
  pint: "pt", pints: "pt",
  gallon: "gal", gallons: "gal",
  package: "pkg", packages: "pkg",
  cup: "cup", cups: "cups",
};

function normalizeUnit(unit: string): string {
  return UNIT_ABBREVIATIONS[unit] ?? unit;
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
  "&nbsp;": " ",
  "&frac12;": "½", "&frac13;": "⅓", "&frac23;": "⅔",
  "&frac14;": "¼", "&frac34;": "¾",
  "&frac15;": "⅕", "&frac25;": "⅖", "&frac35;": "⅗", "&frac45;": "⅘",
  "&frac16;": "⅙", "&frac56;": "⅚",
  "&frac18;": "⅛", "&frac38;": "⅜", "&frac58;": "⅝", "&frac78;": "⅞",
};

function decodeHtmlEntities(s: string): string {
  let result = s.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    if (HTML_ENTITIES[entity.toLowerCase()]) return HTML_ENTITIES[entity.toLowerCase()];
    // Numeric entities: &#188; (¼) etc.
    const numMatch = entity.match(/^&#(\d+);$/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1]));
    const hexMatch = entity.match(/^&#x([0-9a-fA-F]+);$/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return entity;
  });
  return result;
}

function parseIsoDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return undefined;
  const hours = parseInt(m[1] || "0");
  const mins = parseInt(m[2] || "0");
  const secs = parseInt(m[3] || "0");
  const total = hours * 3600 + mins * 60 + secs;
  return total > 0 ? total : undefined;
}

function parseFraction(s: string): number | null {
  // Unicode fractions
  const unicodeFractions: Record<string, number> = {
    "½": 0.5, "⅓": 1/3, "⅔": 2/3, "¼": 0.25, "¾": 0.75,
    "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
    "⅙": 1/6, "⅚": 5/6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  };
  if (unicodeFractions[s]) return unicodeFractions[s];

  const fractionMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const den = parseInt(fractionMatch[2]);
    return den !== 0 ? num / den : null;
  }
  return null;
}

function parseAmount(text: string): { amount: number | undefined; rest: string } {
  let s = text.trim();

  const pattern = /^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+\.?\d*)\s*/;
  const unicodeFractionPattern = /^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/;

  function consumeRange(amount: number, rest: string): { amount: number; rest: string } {
    // Handle "1 to 2", "½ to 1", "1-2" range patterns — keep first value, skip second
    const rangePattern = /^(?:to|-)\s*(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+\.?\d*|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/;
    const rm = rest.match(rangePattern);
    if (rm) return { amount, rest: rest.slice(rm[0].length) };
    return { amount, rest };
  }

  const m = s.match(pattern);
  if (m) {
    const matched = m[0].trim();
    s = s.slice(m[0].length);

    const trailingUnicode = s.match(unicodeFractionPattern);
    if (trailingUnicode) {
      const unicodeVal = parseFraction(trailingUnicode[1]) ?? 0;
      s = s.slice(trailingUnicode[0].length);
      const baseVal = parseFloat(matched) || 0;
      const result = consumeRange(baseVal + unicodeVal, s);
      return { amount: result.amount, rest: result.rest };
    }

    if (matched.includes("/")) {
      const parts = matched.split(/\s+/);
      let amount: number;
      if (parts.length === 2) {
        amount = parseInt(parts[0]) + (parseFraction(parts[1]) ?? 0);
      } else {
        amount = parseFraction(matched) ?? 0;
      }
      const result = consumeRange(amount, s);
      return { amount: result.amount, rest: result.rest };
    }

    const result = consumeRange(parseFloat(matched), s);
    return { amount: result.amount, rest: result.rest };
  }

  const um = s.match(unicodeFractionPattern);
  if (um) {
    s = s.slice(um[0].length);
    const amount = parseFraction(um[1]) ?? 0;
    const result = consumeRange(amount, s);
    return { amount: result.amount, rest: result.rest };
  }

  return { amount: undefined, rest: s };
}

export function parseIngredientString(raw: string): {
  name: string;
  amount: number | undefined;
  unit: string | undefined;
  notes: string | undefined;
} {
  const decoded = decodeHtmlEntities(raw);
  const cleaned = decoded.replace(/\s+/g, " ").trim();
  const { amount, rest } = parseAmount(cleaned);

  // Extract parenthesized notes
  let main = rest;
  let notes: string | undefined;
  const parenMatch = main.match(/\(([^)]+)\)/);
  if (parenMatch) {
    notes = parenMatch[1].trim();
    main = main.replace(parenMatch[0], "").replace(/\s+/g, " ").trim();
  }

  // Strip trailing ", to taste" / ", divided" etc.
  const trailingComma = main.match(/,\s*(to taste|divided|or more|or less|optional|plus more.*)$/i);
  if (trailingComma) {
    const extra = trailingComma[1].trim();
    notes = notes ? `${notes}; ${extra}` : extra;
    main = main.slice(0, trailingComma.index).trim();
  }

  const words = main.split(/\s+/);
  if (words.length > 0 && KNOWN_UNITS.has(words[0].toLowerCase().replace(/[.,]$/, ""))) {
    const unit = words[0].replace(/[.,]$/, "");
    const name = words.slice(1).join(" ").replace(/^of\s+/i, "").trim();
    return { name: name || unit, amount, unit: normalizeUnit(unit.toLowerCase()), notes };
  }

  return { name: main.trim(), amount, unit: undefined, notes };
}

type HowToStep = { "@type": "HowToStep"; text?: string; name?: string };
type HowToSection = { "@type": "HowToSection"; itemListElement?: HowToStep[] };
type InstructionItem = string | HowToStep | HowToSection;

function parseSteps(instructions: InstructionItem[] | string | undefined): { text: string }[] {
  if (!instructions) return [];

  if (typeof instructions === "string") {
    return instructions
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
  }

  const steps: { text: string }[] = [];
  for (const item of instructions) {
    if (typeof item === "string") {
      const trimmed = decodeHtmlEntities(item).trim();
      if (trimmed) steps.push({ text: trimmed });
    } else if (item["@type"] === "HowToStep") {
      const text = decodeHtmlEntities(item.text || item.name || "").trim();
      if (text) steps.push({ text });
    } else if (item["@type"] === "HowToSection" && item.itemListElement) {
      for (const sub of item.itemListElement) {
        const text = decodeHtmlEntities(sub.text || sub.name || "").trim();
        if (text) steps.push({ text });
      }
    }
  }
  return steps;
}

function findRecipe(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }

  const obj = data as Record<string, unknown>;

  if (obj["@type"] === "Recipe") return obj;

  if (Array.isArray(obj["@type"]) && (obj["@type"] as string[]).includes("Recipe")) return obj;

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findRecipe(value);
      if (found) return found;
    }
  }

  return null;
}

export const importFromUrl = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const res = await fetch(args.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      throw new Error(
        `Failed to fetch URL: ${res.status}\nFinal URL: ${res.url}\nBody: ${body.slice(0, 1000)}`,
      );
    }

    const html = await res.text();

    // Extract all JSON-LD script tags
    const jsonLdPattern = /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
    let recipe: Record<string, unknown> | null = null;
    let match: RegExpExecArray | null;
    const jsonLdBlocks: unknown[] = [];

    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        jsonLdBlocks.push(parsed);
        recipe = findRecipe(parsed);
        if (recipe) break;
      } catch (e) {
        console.warn("Failed to parse JSON-LD block:", (e as Error).message);
        continue;
      }
    }

    if (!recipe) {
      console.log("URL fetched:", args.url);
      console.log("HTML length:", html.length);
      console.log("JSON-LD blocks found:", jsonLdBlocks.length);
      for (let i = 0; i < jsonLdBlocks.length; i++) {
        console.log(`Block ${i}:`, JSON.stringify(jsonLdBlocks[i], null, 2).slice(0, 2000));
      }
      if (jsonLdBlocks.length === 0) {
        // Show a snippet around "ld+json" to see if it exists but didn't match
        const ldIdx = html.indexOf("ld+json");
        if (ldIdx !== -1) {
          console.log("Found 'ld+json' in HTML at index", ldIdx, "— snippet:", html.slice(Math.max(0, ldIdx - 50), ldIdx + 200));
        } else {
          console.log("No 'ld+json' found in HTML at all. Page may use microdata or not have structured data.");
        }
      }
      throw new Error("No recipe data found on that page.");
    }

    const name = decodeHtmlEntities((recipe.name as string) || "Imported Recipe");
    const description = recipe.description
      ? decodeHtmlEntities(String(recipe.description)).trim()
      : undefined;
    const prepTime = parseIsoDuration(recipe.prepTime as string | undefined);
    const cookTime = parseIsoDuration(recipe.cookTime as string | undefined);

    const rawIngredients = (recipe.recipeIngredient as string[]) || [];
    const ingredients = rawIngredients.map((raw) => {
      const parsed = parseIngredientString(raw);
      return {
        name: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit,
        notes: parsed.notes,
      };
    });

    const steps = parseSteps(recipe.recipeInstructions as InstructionItem[] | string | undefined);

    const mealId = await ctx.runMutation(api.meals.create, {
      name,
      description,
      prepTime,
      cookTime,
      mealTimes: ["dinner"],
      tagIds: [],
      ingredients,
      steps,
    });

    return mealId;
  },
});
