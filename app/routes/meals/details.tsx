import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { Pencil, Trash2, Timer } from "lucide-react";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";

const FRACTION_MAP: [number, string][] = [
  [0.125, "⅛"], [0.25, "¼"], [0.333, "⅓"], [0.375, "⅜"],
  [0.5, "½"], [0.625, "⅝"], [0.667, "⅔"], [0.75, "¾"], [0.875, "⅞"],
];

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "";
  if (Number.isInteger(amount)) return String(amount);

  const whole = Math.floor(amount);
  const frac = amount - whole;

  const closest = FRACTION_MAP.reduce((best, [val, sym]) =>
    Math.abs(frac - val) < Math.abs(frac - best[0]) ? [val, sym] : best
  );

  if (Math.abs(frac - (closest[0] as number)) < 0.05) {
    return whole > 0 ? `${whole}${closest[1]}` : (closest[1] as string);
  }

  // Fall back to a clean decimal if no fraction is close enough
  return String(parseFloat(amount.toFixed(2)));
}

export function meta() {
  return [
    { title: "Meal Details - Emille" },
    { name: "description", content: "View meal details" },
  ];
}

export default function MealDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const mealId = params.id as string;

  const meal = useQuery(api.meals.get, { id: mealId as any });
  const deleteMeal = useMutation(api.meals.remove);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMeal({ id: mealId as any });
      navigate("/meals");
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };

  if (meal === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meal...</p>
        </div>
      </div>
    );
  }

  if (meal === null) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            Meal not found
          </h2>
          <p className="text-mauve mb-6">
            This meal doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/meals"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Back to meals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/meals"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to meals
        </Link>

        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-plum">{meal.name}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/meals/${mealId}/edit`}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Meal Times Icons */}
        <div className="flex items-end gap-2 mt-4">
          {MEAL_TIMES.map((time, index) => {
            const Icon = MEAL_TIME_ICONS[time];
            const isActive = meal.mealTimes?.includes(time);
            const arcOffset =
              index === 1 ? "-translate-y-2" : "translate-y-0";
            return (
              <Tooltip key={time}>
                <TooltipTrigger asChild>
                  <span className={arcOffset}>
                    <Icon
                      className={`size-7 transition-colors ${
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

        {/* Tags */}
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {meal.tags.map((tag: any) => (
              <Badge key={tag._id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <p className="text-sm text-destructive mb-3">
            Are you sure you want to delete this meal? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Ingredients Section */}
        <div>
          <h2 className="text-lg font-semibold text-plum mb-3">Ingredients</h2>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 divide-y divide-blush/30">
            {meal.ingredientsWithDetails.map((ing: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-4">
                <span className="text-mauve min-w-20">
                  {[formatAmount(ing.amount), ing.unit].filter(Boolean).join(" ") || "—"}
                </span>
                <span className="font-medium text-plum">
                  {ing.name || ing.ingredient?.name || "Unknown ingredient"}
                </span>
                {ing.notes && (
                  <span className="text-mauve/70 text-sm">({ing.notes})</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recipe Steps */}
        {meal.steps && meal.steps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-plum mb-3">
              Recipe Steps
            </h2>
            <div className="space-y-3">
              {meal.steps.map((step: any, index: number) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50"
                >
                  <span className="w-8 h-8 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-semibold shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 pt-1">
                    <p className="text-plum">{step.text}</p>
                    {step.timerSeconds && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-mauve">
                        <Timer className="h-3 w-3" />
                        {step.timerSeconds >= 60
                          ? `${Math.floor(step.timerSeconds / 60)} min`
                          : `${step.timerSeconds}s`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
