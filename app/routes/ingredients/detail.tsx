import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

export function meta() {
  return [
    { title: "Ingredient - Emille" },
    { name: "description", content: "Ingredient details" },
  ];
}

export default function IngredientDetailPage() {
  useSetBackUrl("/ingredients");
  const { id } = useParams();
  const ingredients = useQuery(api.ingredients.list);

  const ingredient = useMemo(
    () =>
      ingredients?.find((i) => i._id === (id as Id<"ingredients"> | undefined)),
    [ingredients, id],
  );

  if (ingredients === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-plum/30 border-t-plum" />
      </div>
    );
  }

  if (!id || !ingredient) {
    return (
      <div className="p-6 text-center">
        <p className="text-mauve">Ingredient not found.</p>
        <Link
          to="/ingredients"
          className="mt-4 inline-block text-sm font-medium text-plum hover:underline"
        >
          Back to ingredients
        </Link>
      </div>
    );
  }

  const store = ingredient.store;
  const sectionForStore = store
    ? ingredient.storeLocations?.find((loc) => loc.storeId === store._id)
        ?.sectionName
    : undefined;

  return (
    <div className="p-6 md:p-8">
      <Link
        to="/ingredients"
        className="mb-6 inline-block text-sm text-mauve transition-colors hover:text-plum"
      >
        ← Ingredients
      </Link>

      <div className="rounded-2xl border border-blush/50 bg-white/60 p-6 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-plum">{ingredient.name}</h1>

        <div className="mt-4 space-y-3 text-sm text-mauve">
          {ingredient.store && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-plum/80">Store</span>
              <span>{ingredient.store.name}</span>
              {sectionForStore && (
                <span className="text-mauve/70">· {sectionForStore}</span>
              )}
            </div>
          )}
          {ingredient.defaultQuantityType && (
            <p>
              <span className="text-plum/80">Default unit </span>
              <span className="rounded bg-peach/30 px-2 py-0.5 text-plum text-xs">
                {ingredient.defaultQuantityType}
              </span>
            </p>
          )}
          <p>
            Used in{" "}
            <span className="font-medium text-plum">{ingredient.usedInCount}</span>{" "}
            {ingredient.usedInCount === 1 ? "recipe" : "recipes"}
          </p>
          {ingredient.notes && (
            <p className="border-t border-blush/40 pt-3 text-mauve">
              {ingredient.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
