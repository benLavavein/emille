import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Check, Pencil, ShoppingCart, X } from "lucide-react";
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

export function meta() {
  return [
    { title: "Meal plan - Emille" },
    { name: "description", content: "Your active meal plan" },
  ];
}

export default function MealPlanPage() {
  const navigate = useNavigate();
  const plan = useQuery(api.mealPlans.getActive);
  const allMeals = useQuery(api.meals.list);
  const ensureActive = useMutation(api.mealPlans.ensureActiveMealPlan);
  const updatePlan = useMutation(api.mealPlans.update);
  const deactivate = useMutation(api.mealPlans.deactivate);
  const addToShoppingList = useMutation(api.shoppingList.addFromMealPlan);

  const [isEditing, setIsEditing] = useState(false);
  const [editBreakfast, setEditBreakfast] = useState<string | null>(null);
  const [editLunch, setEditLunch] = useState<string | null>(null);
  const [editDinner, setEditDinner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const enterEditMode = () => {
    if (!plan) return;
    setEditBreakfast(plan.breakfastMealIds[0] ?? null);
    setEditLunch(plan.lunchMealIds[0] ?? null);
    setEditDinner(plan.dinnerMealIds[0] ?? null);
    setIsEditing(true);
  };

  const toggleSlot = (slot: SlotKey, mealId: string) => {
    const setter =
      slot === "breakfast"
        ? setEditBreakfast
        : slot === "lunch"
          ? setEditLunch
          : setEditDinner;
    setter((prev) => (prev === mealId ? null : mealId));
  };

  const selectedForSlot = (slot: SlotKey): string | null => {
    if (slot === "breakfast") return editBreakfast;
    if (slot === "lunch") return editLunch;
    return editDinner;
  };

  const handleSave = async () => {
    if (!plan) return;
    setIsSubmitting(true);
    try {
      await updatePlan({
        id: plan._id,
        breakfastMealIds: editBreakfast
          ? [editBreakfast as Id<"meals">]
          : [],
        lunchMealIds: editLunch ? [editLunch as Id<"meals">] : [],
        dinnerMealIds: editDinner ? [editDinner as Id<"meals">] : [],
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPlan = async () => {
    setIsCreating(true);
    try {
      await ensureActive();
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!plan) return;
    await deactivate({ id: plan._id });
    navigate("/");
  };

  const handleAddToShoppingList = async () => {
    if (!plan) return;
    try {
      await addToShoppingList({ mealPlanId: plan._id });
      navigate("/shopping-list");
    } catch (e) {
      console.error(e);
    }
  };

  if (plan === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto" />
          <p className="text-mauve mt-4">Loading…</p>
        </div>
      </div>
    );
  }

  if (plan === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="text-mauve hover:text-plum transition-colors text-sm mb-6 inline-block"
        >
          ← Home
        </Link>
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h1 className="text-xl font-semibold text-plum mb-2">No meal plan yet</h1>
          <p className="text-mauve mb-6 max-w-sm mx-auto">
            Create an active meal plan to pick which meals you&apos;re cooking this week.
          </p>
          <Button onClick={handleStartPlan} disabled={isCreating}>
            {isCreating ? "Starting…" : "Start meal plan"}
          </Button>
        </div>
      </div>
    );
  }

  const totalTracked =
    plan.breakfastMealIds.length +
    plan.lunchMealIds.length +
    plan.dinnerMealIds.length;

  const mealsBySlot: Record<
    SlotKey,
    (typeof plan.breakfastMeals)[0] | null
  > = {
    breakfast: plan.breakfastMeals[0] ?? null,
    lunch: plan.lunchMeals[0] ?? null,
    dinner: plan.dinnerMeals[0] ?? null,
  };

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-mauve hover:text-plum transition-colors text-sm mb-6"
        >
          ← Cancel
        </button>
        <h1 className="text-3xl font-bold text-plum mb-8">Edit meals</h1>

        <div className="space-y-8 mb-6">
          {SLOTS.map(({ key, label }) => (
            <div key={key}>
              <h2 className="text-sm font-semibold text-plum mb-2">{label}</h2>
              <div className="space-y-2 max-h-56 overflow-y-auto rounded-xl border border-blush/50 bg-white/60 p-3">
                {allMeals?.map((meal) => {
                  const selected = selectedForSlot(key) === meal._id;
                  return (
                    <button
                      key={meal._id}
                      type="button"
                      onClick={() => toggleSlot(key, meal._id)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                        selected
                          ? "border-plum bg-plum/10"
                          : "border-transparent hover:bg-white/80"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          selected
                            ? "bg-plum border-plum text-white"
                            : "border-blush/50 bg-white/60"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                      </div>
                      <span className="font-medium text-plum">{meal.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {(editBreakfast || editLunch || editDinner) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {editBreakfast && (
              <Badge key="b" variant="secondary" className="gap-1">
                Breakfast:{" "}
                {allMeals?.find((m) => m._id === editBreakfast)?.name}
                <button
                  type="button"
                  onClick={() => setEditBreakfast(null)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {editLunch && (
              <Badge key="l" variant="secondary" className="gap-1">
                Lunch: {allMeals?.find((m) => m._id === editLunch)?.name}
                <button
                  type="button"
                  onClick={() => setEditLunch(null)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {editDinner && (
              <Badge key="d" variant="secondary" className="gap-1">
                Dinner: {allMeals?.find((m) => m._id === editDinner)?.name}
                <button
                  type="button"
                  onClick={() => setEditDinner(null)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        <Button
          className="w-full"
          disabled={isSubmitting}
          onClick={handleSave}
        >
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/"
          className="text-mauve hover:text-plum transition-colors text-sm mb-4 inline-block"
        >
          ← Home
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-plum">This week&apos;s plan</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={enterEditMode}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeactivate}>
              Clear active
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Button onClick={handleAddToShoppingList} className="w-full">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add ingredients to shopping list
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-plum mb-3">
          Meals ({totalTracked})
        </h2>
        {totalTracked === 0 ? (
          <p className="text-mauve text-sm mb-4">
            No meals yet — use Edit to add some.
          </p>
        ) : (
          <div className="space-y-6">
            {SLOTS.map(({ key, label, emptyLine }) => {
              const meal = mealsBySlot[key];
              return (
                <div key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-mauve mb-2">
                    {label}
                  </h3>
                  {meal ? (
                    <Link
                      to={`/meals/${meal._id}`}
                      className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 hover:border-plum/30 transition-all"
                    >
                      <div>
                        <h3 className="font-medium text-plum">{meal.name}</h3>
                        {meal.tags && meal.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {meal.tags.map((tag) => {
                              if (!tag) return null;
                              return (
                                <span
                                  key={tag._id}
                                  className="px-2 py-0.5 bg-peach/40 text-plum text-xs rounded-full"
                                >
                                  {tag.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <p className="text-mauve text-sm">{emptyLine}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
