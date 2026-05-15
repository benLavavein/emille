import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Timer,
  Clock,
  AlertTriangle,
  CookingPot,
} from "lucide-react";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
import { CookButton } from "./components/cook-button";
import type { Id } from "convex/_generated/dataModel";
import { CookingPotIcon } from "~/components/icons/cooking-pot";

const FRACTION_MAP: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [0.333, "⅓"],
  [0.375, "⅜"],
  [0.5, "½"],
  [0.625, "⅝"],
  [0.667, "⅔"],
  [0.75, "¾"],
  [0.875, "⅞"],
];

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "";
  if (Number.isInteger(amount)) return String(amount);
  const whole = Math.floor(amount);
  const frac = amount - whole;
  const closest = FRACTION_MAP.reduce((best, [val, sym]) =>
    Math.abs(frac - val) < Math.abs(frac - best[0]) ? [val, sym] : best,
  );
  if (Math.abs(frac - (closest[0] as number)) < 0.05) {
    return whole > 0 ? `${whole}${closest[1]}` : (closest[1] as string);
  }
  return String(parseFloat(amount.toFixed(2)));
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

export function meta() {
  return [
    { title: "Meal Details - Emille" },
    { name: "description", content: "View meal details" },
  ];
}

export default function MealDetailsPage() {
  useSetBackUrl("/meals");
  const params = useParams();
  const mealId = params.id as Id<"meals">;
  const navigate = useNavigate();

  const meal = useQuery(api.meals.get, { id: mealId });
  const currentlyCooking = useQuery(api.meals.getCooking);
  const clearCooking = useMutation(api.users.clearCooking);
  const deleteMeal = useMutation(api.meals.remove);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCookingThisMeal = currentlyCooking?.mealId === mealId;

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
    <>
      {isCookingThisMeal && (
        <div className="flex gap-4 bg-peach px-3 py-6 items-center">
          <CookingPot className="size-8 text-plum" />
          <h1 className="text-lg text-plum grow text-center">
            This meal is in the works!
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => clearCooking()}
          >
            I'm done
          </Button>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold text-plum">{meal.name}</h1>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              {!isCookingThisMeal && <CookButton mealId={mealId} />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => navigate(`/meals/${mealId}/edit`)}
                  >
                    <Pencil className="size-5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {meal.description && (
            <p className="text-mauve mt-4 text-sm line-clamp-2">
              {meal.description}
            </p>
          )}

          {(meal.prepTime || meal.cookTime) && (
            <div className="flex items-center gap-4 mt-3">
              {meal.prepTime && (
                <span className="inline-flex items-center gap-1.5 text-sm text-mauve">
                  <Clock className="size-4" />
                  Prep: {formatDuration(meal.prepTime)}
                </span>
              )}
              {meal.cookTime && (
                <span className="inline-flex items-center gap-1.5 text-sm text-mauve">
                  <Timer className="size-4" />
                  Cook: {formatDuration(meal.cookTime)}
                </span>
              )}
            </div>
          )}

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
            <h2 className="text-lg font-semibold text-plum mb-3">
              Ingredients
            </h2>
            <div className="bg-white/60 backdrop-blur-sm rounded-md border border-blush/50 divide-y divide-blush/30">
              {meal.ingredientsWithDetails.map((ing: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-4">
                  <span className="text-mauve min-w-20">
                    {[formatAmount(ing.amount), ing.unit]
                      .filter(Boolean)
                      .join(" ") || "—"}
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
    </>
  );
}
