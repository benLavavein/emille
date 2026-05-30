import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  Queue,
  QueueBody,
  QueueHeader,
  QueueItems,
  queueListStateFromConvex,
} from "~/components/ui/queue";

type MealWithType = Doc<"meals"> & { type?: "meal" | "side" };

function MealQueueItem({ meal }: { meal: MealWithType }) {
  const isSide = meal.type === "side";
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{meal.name}</span>
      {!isSide && (
        <span className="flex shrink-0 items-end gap-0.5">
          {MEAL_TIMES.map((time, index) => {
            const Icon = MEAL_TIME_ICONS[time];
            const active = meal.mealTimes?.includes(time);
            const arc = index === 1 ? "-translate-y-0.5" : "translate-y-0";
            return (
              <Tooltip key={time}>
                <TooltipTrigger asChild>
                  <span className={arc}>
                    <Icon
                      className={`size-4 transition-colors ${
                        active ? "text-plum" : "text-plum/25"
                      }`}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="capitalize">{time}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </span>
      )}
    </>
  );
}

export function MealsQueue() {
  const meals = useQuery(api.meals.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"meal" | "side">("meal");

  const filteredMeals = useMemo(() => {
    if (!meals) return [];

    const byType = meals.filter((meal) =>
      activeTab === "meal"
        ? (meal.type ?? "meal") === "meal"
        : meal.type === "side",
    );

    if (!searchQuery.trim()) return byType;

    const q = searchQuery.toLowerCase();
    return byType.filter((meal) => {
      if (meal.name.toLowerCase().includes(q)) return true;
      if (meal.tags?.some((tag) => tag && tag.name.toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [meals, searchQuery, activeTab]);

  const listState = queueListStateFromConvex(meals, filteredMeals);

  return (
    <Queue>
      <QueueHeader
        title="Meals"
        addTo="/meals/add"
        addLabel={activeTab === "side" ? "Add side dish" : "Add meal"}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
        }}
      />

      {/* Meals / Sides tab selector */}
      <div className="flex gap-1 px-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("meal")}
          className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "meal"
              ? "bg-plum text-white"
              : "text-mauve hover:text-plum hover:bg-blush/30"
          }`}
        >
          Meals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("side")}
          className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "side"
              ? "bg-plum text-white"
              : "text-mauve hover:text-plum hover:bg-blush/30"
          }`}
        >
          Sides
        </button>
      </div>

      <QueueBody>
        <QueueItems
          listDataState={listState}
          getItemKey={(meal) => meal._id}
          itemTo={(meal) => `/meals/${meal._id}`}
          renderItem={(meal) => <MealQueueItem meal={meal as MealWithType} />}
          emptyText={
            activeTab === "side" ? "No side dishes yet." : "No meals yet."
          }
        />
      </QueueBody>
    </Queue>
  );
}
