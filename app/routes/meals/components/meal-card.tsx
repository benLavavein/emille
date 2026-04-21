import { Link } from "react-router";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
import { CookButton } from "./cook-button";

type MealCardProps = {
  meal: {
    _id: string;
    name: string;
    steps: unknown[];
    mealTimes?: string[];
    tags?: ({ _id: string; name: string } | null)[];
  };
};

export function MealCard({ meal }: MealCardProps) {
  return (
    <Link
      to={`/meals/${meal._id}`}
      className="flex items-center justify-between p-4 bg-white rounded-2xl border border-blush/50 hover:border-plum/30 transition-all"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-plum">{meal.name}</h2>
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {meal.tags.map((tag: any) => (
              <span
                key={tag._id}
                className="px-2 py-0.5 bg-peach/40 text-plum text-xs rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        <div className="flex items-end gap-1">
          {MEAL_TIMES.map((time, index) => {
            const Icon = MEAL_TIME_ICONS[time];
            const isActive = meal.mealTimes?.includes(time);
            const arcOffset = index === 1 ? "-translate-y-1" : "translate-y-0";
            return (
              <Tooltip key={time}>
                <TooltipTrigger asChild>
                  <span className={arcOffset}>
                    <Icon
                      className={`size-4 transition-colors ${
                        isActive ? "text-plum" : "text-plum/20"
                      }`}
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="capitalize">{time}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {meal.steps.length > 0 && <CookButton mealId={meal._id} />}
      </div>
    </Link>
  );
}
