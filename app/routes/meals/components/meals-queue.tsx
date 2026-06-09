import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc } from "convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { Heart } from "lucide-react";
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

type MealWithType = Doc<"meals"> & {
  type?: "meal" | "side";
  isFromSoulmate?: boolean;
  soulmateOwnerName?: string | null;
};

function MealQueueItem({ meal }: { meal: MealWithType }) {
  const isSide = meal.type === "side";
  return (
    <>
      <div className="min-w-0 flex-1 flex flex-col">
        <span className="truncate">{meal.name}</span>
        {meal.isFromSoulmate && meal.soulmateOwnerName && (
          <span className="flex items-center gap-1 text-[10px] text-plum/50 font-normal">
            <Heart className="size-2.5 fill-current" />
            {meal.soulmateOwnerName}
          </span>
        )}
      </div>
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

  const tabSelector = (
    <div className="flex rounded-lg overflow-hidden ring-1 ring-blush/40 bg-blush/10 text-sm mx-1">
      <button
        type="button"
        onClick={() => setActiveTab("meal")}
        className={`flex-1 px-3 py-1.5 font-medium transition-colors rounded-l-lg ${
          activeTab === "meal"
            ? "bg-white shadow-sm text-plum"
            : "text-mauve/70 hover:text-plum"
        }`}
      >
        Meals
      </button>
      <button
        type="button"
        onClick={() => setActiveTab("side")}
        className={`flex-1 px-3 py-1.5 font-medium transition-colors rounded-r-lg ${
          activeTab === "side"
            ? "bg-white shadow-sm text-plum"
            : "text-mauve/70 hover:text-plum"
        }`}
      >
        Pairings
      </button>
    </div>
  );

  return (
    <Queue>
      <QueueHeader
        title={tabSelector}
        addTo="/meals/add"
        addLabel={activeTab === "side" ? "Add pairing" : "Add meal"}
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
        }}
      />

      <QueueBody>
        <QueueItems
          listDataState={listState}
          getItemKey={(meal) => meal._id}
          itemTo={(meal) => `/meals/${meal._id}`}
          renderItem={(meal) => <MealQueueItem meal={meal as MealWithType} />}
          emptyText={
            activeTab === "side" ? "No pairings yet." : "No meals yet."
          }
        />
      </QueueBody>
    </Queue>
  );
}
