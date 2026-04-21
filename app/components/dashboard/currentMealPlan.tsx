import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, Check } from "lucide-react";
import { CookButton } from "~/routes/meals/components/cook-button";
import type { Id } from "convex/_generated/dataModel";

const SLOTS = [
  { key: "breakfast" as const, label: "Breakfast", emptyLine: "You've got breakfast handled." },
  { key: "lunch" as const, label: "Lunch", emptyLine: "You've got lunch handled." },
  { key: "dinner" as const, label: "Dinner", emptyLine: "You've got dinner handled." },
];

type SlotKey = (typeof SLOTS)[number]["key"];

type MealRow = {
  _id: Id<"meals">;
  name: string;
};

export function CurrentMealPlan() {
  const activeMealPlan = useQuery(api.mealPlans.getActive);

  if (activeMealPlan === undefined) return null;

  if (activeMealPlan === null) {
    return (
      <Link
        to="/meal-plan"
        className="block bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-blush/50 hover:border-plum/30 transition-all"
      >
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-6 h-6 text-plum shrink-0" />
          <h2 className="text-lg font-semibold text-plum">This week&apos;s plan</h2>
        </div>
        <p className="text-mauve text-sm">
          No active plan yet — tap to choose meals for the week.
        </p>
      </Link>
    );
  }

  const cooked = new Set(activeMealPlan.cookedMealIds ?? []);

  const mealsBySlot: Record<SlotKey, MealRow | null> = {
    breakfast: activeMealPlan.breakfastMeals[0] ?? null,
    lunch: activeMealPlan.lunchMeals[0] ?? null,
    dinner: activeMealPlan.dinnerMeals[0] ?? null,
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-plum/30">
      <Link
        to="/meal-plan"
        className="flex items-center gap-3 mb-4 rounded-lg -m-1 p-1 hover:opacity-90 transition-opacity"
      >
        <Calendar className="w-6 h-6 text-plum shrink-0" />
        <h2 className="text-lg font-semibold text-plum">This week&apos;s plan</h2>
      </Link>

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
                  <span className="font-medium text-plum min-w-0 truncate">{meal.name}</span>
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
    </div>
  );
}
