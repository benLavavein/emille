import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useAction, useQuery, useMutation } from "convex/react";
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
  CookingPot,
  X,
  Users,
  Share2,
  Heart,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
import { CookButton } from "./components/cook-button";
import { SideCard } from "./components/side-card";
import { ShareMealDialog } from "./components/share-meal-dialog";
import type { Id } from "convex/_generated/dataModel";

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
  const cookingSessions = useQuery(api.meals.getCooking);
  const clearOneCooking = useMutation(api.users.clearOneCooking);
  const deleteMeal = useMutation(api.meals.remove);
  const updateMeal = useMutation(api.meals.update);
  const reviewRecipe = useAction(api.ai.recipeCleanup.review);
  const cleanupRecipe = useAction(api.ai.recipeCleanup.preview);
  const currentUser = useQuery(api.users.getMe);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [cleanedSteps, setCleanedSteps] = useState<
    Array<{ text: string; timerSeconds?: number }> | null
  >(null);
  const [cleanupStatus, setCleanupStatus] = useState<"reviewing" | "cleaning" | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupNotice, setCleanupNotice] = useState<string | null>(null);

  // React Router reuses this route component when only the meal ID changes.
  // A cleanup preview belongs to one meal only, so discard it on navigation.
  useEffect(() => {
    setCleanedSteps(null);
    setCleanupError(null);
    setCleanupNotice(null);
    setCleanupStatus(null);
  }, [mealId]);

  const cookingSession = (cookingSessions ?? []).filter(Boolean).find(
    (s) => s!.mealId === mealId,
  );
  const isCookingThisMeal = !!cookingSession;

  const handleDelete = async () => {
    try {
      await deleteMeal({ id: mealId as any });
      navigate("/meals");
    } catch (error) {
      console.error("Failed to delete meal:", error);
    }
  };

  const handleRecipeCleanup = async () => {
    setCleanupStatus("reviewing");
    setCleanupError(null);
    setCleanupNotice(null);
    try {
      const review = await reviewRecipe({ mealId });
      if (!review.isRecipeConsistent) {
        setCleanupError(
          `Can't clean up these instructions because they don't match the ingredient list. ${review.consistencyReason}`,
        );
        return;
      }
      if (!review.needsCleanup) {
        setCleanupNotice(review.reason);
        return;
      }

      setCleanupStatus("cleaning");
      const result = await cleanupRecipe({ mealId });
      setCleanedSteps(result.steps);
    } catch (error) {
      setCleanupError(
        error instanceof Error
          ? error.message
          : "Could not clean up the recipe instructions.",
      );
    } finally {
      setCleanupStatus(null);
    }
  };

  const applyCleanedSteps = async () => {
    if (!cleanedSteps) return;
    await updateMeal({ id: mealId, steps: cleanedSteps });
    setCleanedSteps(null);
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

  const sideAttachments = (meal.sideAttachments ?? []).filter(Boolean) as {
    sideId: Id<"meals">;
    name: string;
    cookTime?: number;
    alwaysInclude: boolean;
  }[];

  return (
    <Tabs defaultValue="info" className="flex flex-col h-full">
      {isCookingThisMeal && (
        <div className="flex gap-4 bg-peach p-6 items-center shadow-md shrink-0">
          <CookingPot className="size-8 text-plum" />
          <div className="grow flex flex-col">
            <h1 className="text-lg text-plum text-center">
              Currently cooking!
            </h1>
            <p className="text-mauve text-sm text-center">
              Step {(cookingSession?.stepIndex ?? 0) + 1} of{" "}
              {cookingSession?.totalSteps}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={() => clearOneCooking({ mealId })}
          >
            I'm done
          </Button>
        </div>
      )}

      <div className="shrink-0 max-w-5xl mx-auto w-full p-4 pt-2 md:px-8 md:pt-8">
        <div className="mb-6 md:mb-8">
          {/* Mobile header */}
          <div className="md:hidden">
            <div className="flex items-center justify-end gap-0.5">
              {!meal.isFromSoulmate && (
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
                    <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                      <Share2 className="size-5 mr-2" />
                      Share
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
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/meals")}
              >
                <X className="size-5" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight line-clamp-3 text-plum mb-3">
              {meal.name}
            </h1>
            {meal.isFromSoulmate && meal.soulmateOwnerName && (
              <p className="flex items-center gap-1.5 text-xs text-plum/50 mb-3 -mt-1">
                <Heart className="size-3 fill-current" />
                From {meal.soulmateOwnerName}
              </p>
            )}
          </div>

          {/* Desktop header */}
          <div className="hidden md:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-plum">{meal.name}</h1>
                {meal.isFromSoulmate && meal.soulmateOwnerName && (
                  <p className="flex items-center gap-1.5 text-xs text-plum/50 mt-1">
                    <Heart className="size-3 fill-current" />
                    From {meal.soulmateOwnerName}
                  </p>
                )}
              </div>
              {!meal.isFromSoulmate && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
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
                      <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                        <Share2 className="size-5 mr-2" />
                        Share
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
              )}
            </div>
          </div>
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

        <TabsList className="w-full">
          <TabsTrigger value="info" className="flex-1">
            Info
          </TabsTrigger>
          <TabsTrigger value="ingredients" className="flex-1">
            Ingredients
          </TabsTrigger>
          <TabsTrigger value="recipe" className="flex-1">
            Recipe
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto w-full px-4 pb-6 md:px-8 md:pb-8">
          <TabsContent value="info">
            <div className="space-y-6 py-2">
              {/* Tags */}
              {meal.tags && meal.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meal.tags.map((tag: any) => (
                    <Badge key={tag._id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Meal time icons */}
              <div className="flex items-end justify-around">
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

              {/* Timing & servings */}
              {(meal.prepTime || meal.cookTime || meal.servings) && (
                <div
                  className={`flex items-center ${meal.servings ? "gap-6" : "justify-around"}`}
                >
                  {meal.prepTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="size-5 text-plum/60" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mauve/60 font-medium">
                          Prep
                        </p>
                        <p className="text-sm font-medium text-plum">
                          {formatDuration(meal.prepTime)}
                        </p>
                      </div>
                    </div>
                  )}
                  {meal.cookTime && (
                    <div className="flex items-center gap-2">
                      <Timer className="size-5 text-plum/60" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mauve/60 font-medium">
                          Cook
                        </p>
                        <p className="text-sm font-medium text-plum">
                          {formatDuration(meal.cookTime)}
                        </p>
                      </div>
                    </div>
                  )}
                  {meal.servings && (
                    <div className="flex items-center gap-2">
                      <Users className="size-5 text-plum/60" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-mauve/60 font-medium">
                          Servings
                        </p>
                        <p className="text-sm font-medium text-plum">
                          {meal.servings}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {meal.description && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 p-4">
                  <p className="text-sm text-mauve leading-relaxed">
                    {meal.description}
                  </p>
                </div>
              )}

              {/* Side dishes */}
              {sideAttachments.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-mauve/60 font-medium mb-2">
                    Pairings
                  </p>
                  <div className="flex flex-col gap-2">
                    {sideAttachments.map((att) => (
                      <SideCard
                        key={att.sideId}
                        sideId={att.sideId}
                        name={att.name}
                        cookTime={att.cookTime}
                        alwaysInclude={att.alwaysInclude}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Cook button */}
              {!isCookingThisMeal && (
                <CookButton
                  mealId={mealId}
                  size="lg"
                  sideAttachments={sideAttachments}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="ingredients">
            <div className="bg-white/60 backdrop-blur-sm rounded-md border border-blush/50 divide-y divide-blush/30">
              {meal.ingredients.map((ing, index: number) => (
                <div key={index} className="flex gap-3 px-4 py-2 items-center">
                  <span className="text-mauve w-24 shrink-0 text-sm">
                    {[formatAmount(ing.amount), ing.unit]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium text-plum">{ing.name}</span>
                    {ing.notes && (
                      <span className="text-mauve/70 text-xs">
                        ({ing.notes})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="recipe">
            {!meal.isFromSoulmate && currentUser?.pro === true && (
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-plum/20 bg-plum/5 p-3">
                <p className="text-sm text-mauve">
                  Turn long recipe instructions into clean cooking steps.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={cleanupStatus !== null || !meal.steps?.length}
                  onClick={handleRecipeCleanup}
                >
                  {cleanupStatus ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  {cleanupStatus === "reviewing"
                    ? "Checking instructions..."
                    : cleanupStatus === "cleaning"
                      ? "Preparing preview..."
                      : "Clean up instructions"}
                </Button>
              </div>
            )}
            {cleanupNotice && (
              <p className="mb-4 rounded-xl border border-plum/20 bg-plum/5 p-3 text-sm text-mauve">
                These instructions already look good. {cleanupNotice}
              </p>
            )}
            {cleanupError && (
              <p className="mb-4 text-sm text-destructive">{cleanupError}</p>
            )}
            {cleanedSteps && (
              <div className="mb-4 rounded-xl border border-plum/30 bg-white/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-plum">Cleaned instructions</h2>
                    <p className="text-sm text-mauve">Review before replacing your current steps.</p>
                  </div>
                  <Sparkles className="size-5 shrink-0 text-plum" />
                </div>
                <ol className="mb-4 space-y-2 text-sm text-plum">
                  {cleanedSteps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="font-medium text-mauve">{index + 1}.</span>
                      <span>{step.text}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyCleanedSteps}>Apply instructions</Button>
                  <Button size="sm" variant="outline" onClick={() => setCleanedSteps(null)}>
                    Keep current steps
                  </Button>
                </div>
              </div>
            )}
            {meal.steps && meal.steps.length > 0 ? (
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
            ) : (
              <p className="text-mauve text-sm py-4">No recipe steps yet.</p>
            )}
          </TabsContent>
        </div>
      </div>

      {!meal.isFromSoulmate && (
        <ShareMealDialog
          mealId={mealId}
          mealName={meal.name}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
        />
      )}
    </Tabs>
  );
}
