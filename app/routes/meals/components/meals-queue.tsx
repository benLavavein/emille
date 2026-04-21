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

function MealQueueItem({ meal }: { meal: Doc<"meals"> }) {
  return (
    <>
      <span className="min-w-0 flex-1 truncate">{meal.name}</span>
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
                    className={`size-3.5 transition-colors ${
                      active ? "text-plum" : "text-plum/15"
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
    </>
  );
}

export function MealsQueue() {
  const meals = useQuery(api.meals.list);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMeals = useMemo(() => {
    if (!meals) return [];
    if (!searchQuery.trim()) return meals;

    const q = searchQuery.toLowerCase();
    return meals.filter((meal) => {
      if (meal.name.toLowerCase().includes(q)) return true;
      if (
        meal.tags?.some((tag) => tag && tag.name.toLowerCase().includes(q))
      )
        return true;
      return false;
    });
  }, [meals, searchQuery]);

  const listState = queueListStateFromConvex(meals, filteredMeals);

  return (
    <Queue>
      <QueueHeader
        title="Meals"
        mobileBackUrl="/"
        addTo="/meals/add"
        addLabel="Add meal"
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
          renderItem={(meal) => <MealQueueItem meal={meal} />}
          emptyText="No meals yet."
        />
      </QueueBody>
    </Queue>
  );
}
