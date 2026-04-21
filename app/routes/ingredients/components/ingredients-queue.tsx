import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc, Id } from "convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import {
  Queue,
  QueueBody,
  QueueHeader,
  QueueItems,
  queueListStateFromConvex,
} from "~/components/ui/queue";

type IngredientRow = Doc<"ingredients"> & {
  store: { _id: Id<"groceryStores">; name: string } | null;
  usedInCount: number;
};

function IngredientQueueItem({ ingredient }: { ingredient: IngredientRow }) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{ingredient.name}</span>
      <span className="shrink-0 text-xs text-mauve tabular-nums">
        {ingredient.usedInCount}{" "}
        {ingredient.usedInCount === 1 ? "meal" : "meals"}
      </span>
    </>
  );
}

export function IngredientsQueue() {
  const ingredients = useQuery(api.ingredients.list);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    if (!searchQuery.trim()) return ingredients;
    const q = searchQuery.toLowerCase();
    return ingredients.filter((ing) => ing.name.toLowerCase().includes(q));
  }, [ingredients, searchQuery]);

  const listState = queueListStateFromConvex(ingredients, filtered);

  return (
    <Queue>
      <QueueHeader
        title="Ingredients"
        mobileBackUrl="/"
        addTo="/ingredients/new"
        addLabel="Add ingredient"
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
        }}
      />
      <QueueBody>
        <QueueItems
          listDataState={listState}
          getItemKey={(ing) => ing._id}
          itemTo={(ing) => `/ingredients/${ing._id}`}
          renderItem={(ing) => <IngredientQueueItem ingredient={ing} />}
          emptyText="No ingredients yet."
        />
      </QueueBody>
    </Queue>
  );
}
