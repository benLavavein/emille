import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowRight, Calendar, Check } from "lucide-react";
import { CookButton } from "~/routes/meals/components/cook-button";
import type { Id } from "convex/_generated/dataModel";

const SLOTS = [
  {
    key: "breakfast" as const,
    label: "Breakfast",
    emptyLine: "You've got breakfast handled.",
  },
  {
    key: "lunch" as const,
    label: "Lunch",
    emptyLine: "You've got lunch handled.",
  },
  {
    key: "dinner" as const,
    label: "Dinner",
    emptyLine: "You've got dinner handled.",
  },
];

type SlotKey = (typeof SLOTS)[number]["key"];

type MealRow = {
  _id: Id<"meals">;
  name: string;
};

export function CurrentMealPlan() {
  const activeMealPlan = useQuery(api.mealPlans.getActive);

  let content: React.ReactNode = null;

  if (!activeMealPlan) {
    content = (
      <div className="text-mauve text-sm grid place-items-center h-75">
        <div className="flex flex-col items-center gap-2 text-lg">
          No active plan yet — want to get started?.
          <Link
            to="/meal-plan"
            className="text-plum hover:underline font-medium inline-flex items-center gap-1"
          >
            Lets go <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  } else {
    const cooked = new Set(activeMealPlan.cookedMealIds ?? []);

    const mealsBySlot: Record<SlotKey, MealRow | null> = {
      breakfast: activeMealPlan.breakfastMeals[0] ?? null,
      lunch: activeMealPlan.lunchMeals[0] ?? null,
      dinner: activeMealPlan.dinnerMeals[0] ?? null,
    };

    content = (
      <div className="space-y-5 text-left">
        {SLOTS.map(({ key, label, emptyLine }) => {
          const meal = mealsBySlot[key];
          return (
            <div key={key}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-mauve mb-2">
                {label}
              </h3>
              {meal ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-blush/20 rounded-lg">
                  <span className="font-medium text-plum min-w-0 truncate">
                    {meal.name}
                  </span>
                  {cooked.has(meal._id) ? (
                    <span className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-plum">
                      <Check className="size-4 text-plum" aria-hidden />
                      All set
                    </span>
                  ) : (
                    <CookButton mealId={meal._id} className="shrink-0" />
                  )}
                </div>
              ) : (
                <p className="text-mauve text-sm py-1">{emptyLine}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-plum/30">
      {content}
    </div>
  );
}
