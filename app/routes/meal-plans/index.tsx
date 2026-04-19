import { Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Star, StarOff } from "lucide-react";

export function meta() {
  return [
    { title: "Meal Plans - Emille" },
    { name: "description", content: "View and manage your meal plans" },
  ];
}

export default function MealPlansPage() {
  const mealPlans = useQuery(api.mealPlans.list);
  const setActive = useMutation(api.mealPlans.setActive);
  const deactivate = useMutation(api.mealPlans.deactivate);

  const handleToggleActive = async (planId: string, isCurrentlyActive: boolean) => {
    if (isCurrentlyActive) {
      await deactivate({ id: planId as any });
    } else {
      await setActive({ id: planId as any });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            to="/"
            className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
          >
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold text-plum">Meal Plans</h1>
        </div>
        <Link
          to="/meal-plans/new"
          className="px-4 py-2 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
        >
          Create Plan
        </Link>
      </div>

      {mealPlans === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meal plans...</p>
        </div>
      ) : mealPlans.length === 0 ? (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <svg
            className="w-16 h-16 mx-auto text-blush mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h2 className="text-xl font-semibold text-plum mb-2">
            No meal plans yet
          </h2>
          <p className="text-mauve mb-6">
            Create a meal plan to organize your weekly meals!
          </p>
          <Link
            to="/meal-plans/new"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Create your first plan
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {mealPlans.map((plan) => (
            <div
              key={plan._id}
              className="flex items-center gap-4 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50"
            >
              <Link
                to={`/meal-plans/${plan._id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-plum truncate">
                    {plan.name}
                  </h2>
                  {plan.isActive && (
                    <Badge className="bg-peach text-plum">Active</Badge>
                  )}
                </div>
                <p className="text-mauve text-sm">
                  {plan.meals.length} meal{plan.meals.length !== 1 ? "s" : ""}
                  {plan.meals.length > 0 && (
                    <span className="ml-2 text-mauve/70">
                      ({plan.meals.map((m: any) => m.name).join(", ")})
                    </span>
                  )}
                </p>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleActive(plan._id, plan.isActive)}
                className={plan.isActive ? "text-peach" : "text-mauve/50"}
                title={plan.isActive ? "Deactivate plan" : "Set as active"}
              >
                {plan.isActive ? (
                  <Star className="w-5 h-5 fill-current" />
                ) : (
                  <StarOff className="w-5 h-5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
