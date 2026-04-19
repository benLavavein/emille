import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  X,
  Check,
  Pencil,
  Trash2,
  Star,
  StarOff,
  ShoppingCart,
  Sunrise,
  Sun,
  MoonStar,
} from "lucide-react";

export function meta() {
  return [
    { title: "Meal Plan - Emille" },
    { name: "description", content: "View meal plan details" },
  ];
}

const MEAL_TIME_ICONS = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: MoonStar,
} as const;

export default function MealPlanDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const planId = params.id as string;

  const plan = useQuery(api.mealPlans.get, { id: planId as any });
  const allMeals = useQuery(api.meals.list);
  const updatePlan = useMutation(api.mealPlans.update);
  const deletePlan = useMutation(api.mealPlans.remove);
  const setActive = useMutation(api.mealPlans.setActive);
  const deactivate = useMutation(api.mealPlans.deactivate);
  const addToShoppingList = useMutation(api.shoppingList.addFromMealPlan);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMealIds, setEditMealIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const enterEditMode = () => {
    if (!plan) return;
    setEditName(plan.name);
    setEditMealIds(plan.mealIds);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const toggleMeal = (mealId: string) => {
    setEditMealIds((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleSave = async () => {
    if (!editName.trim() || editMealIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await updatePlan({
        id: planId as any,
        name: editName.trim(),
        mealIds: editMealIds as any,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update meal plan:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlan({ id: planId as any });
      navigate("/meal-plans");
    } catch (error) {
      console.error("Failed to delete meal plan:", error);
    }
  };

  const handleToggleActive = async () => {
    if (!plan) return;
    if (plan.isActive) {
      await deactivate({ id: planId as any });
    } else {
      await setActive({ id: planId as any });
    }
  };

  const handleAddToShoppingList = async () => {
    try {
      await addToShoppingList({ mealPlanId: planId as any });
      navigate("/shopping-list");
    } catch (error) {
      console.error("Failed to add to shopping list:", error);
    }
  };

  if (plan === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (plan === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            Meal plan not found
          </h2>
          <p className="text-mauve mb-6">
            This meal plan doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/meal-plans"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Back to meal plans
          </Link>
        </div>
      </div>
    );
  }

  // VIEW MODE
  if (!isEditing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to="/meal-plans"
            className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
          >
            ← Back to meal plans
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-plum">{plan.name}</h1>
              {plan.isActive && (
                <Badge className="bg-peach text-plum">Active</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleActive}
                className={plan.isActive ? "text-peach" : "text-mauve/50"}
                title={plan.isActive ? "Deactivate plan" : "Set as active"}
              >
                {plan.isActive ? (
                  <Star className="w-5 h-5 fill-current" />
                ) : (
                  <StarOff className="w-5 h-5" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
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
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive mb-3">
              Are you sure you want to delete this meal plan? This cannot be
              undone.
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

        {/* Add to Shopping List */}
        <div className="mb-8">
          <Button onClick={handleAddToShoppingList} className="w-full">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Add ingredients to shopping list
          </Button>
        </div>

        {/* Meals List */}
        <div>
          <h2 className="text-lg font-semibold text-plum mb-3">
            Meals ({plan.meals.length})
          </h2>
          <div className="space-y-3">
            {plan.meals.map((meal: any) => (
              <Link
                key={meal._id}
                to={`/meals/${meal._id}`}
                className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 hover:border-plum/30 transition-all"
              >
                <div>
                  <h3 className="font-medium text-plum">{meal.name}</h3>
                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
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
                <div className="flex items-end gap-1.5">
                  {(["breakfast", "lunch", "dinner"] as const).map(
                    (time, index) => {
                      const Icon = MEAL_TIME_ICONS[time];
                      const isActive = meal.mealTimes?.includes(time);
                      const arcOffset =
                        index === 1 ? "-translate-y-1" : "translate-y-0";
                      return (
                        <Tooltip key={time}>
                          <TooltipTrigger asChild>
                            <span className={arcOffset}>
                              <Icon
                                className={`size-5 transition-colors ${
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
                    }
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={cancelEdit}
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Cancel editing
        </button>
        <h1 className="text-3xl font-bold text-plum">Edit Meal Plan</h1>
      </div>

      <div className="space-y-8">
        {/* Plan Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-plum mb-2"
          >
            Plan Name
          </label>
          <input
            id="name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g., This Week's Meals"
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            required
          />
        </div>

        {/* Select Meals */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Select Meals
          </label>

          {allMeals === undefined ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto rounded-xl border border-blush/50 bg-white/60 p-3">
              {allMeals.map((meal) => {
                const isSelected = editMealIds.includes(meal._id);
                return (
                  <button
                    key={meal._id}
                    type="button"
                    onClick={() => toggleMeal(meal._id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                      isSelected
                        ? "border-plum bg-plum/10"
                        : "border-transparent hover:bg-white/80"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-plum border-plum text-white"
                          : "border-blush/50 bg-white/60"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="font-medium text-plum">{meal.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {editMealIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {editMealIds.map((id) => {
                const meal = allMeals?.find((m) => m._id === id);
                if (!meal) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {meal.name}
                    <button
                      type="button"
                      onClick={() => toggleMeal(id)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Save/Cancel */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={cancelEdit}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={
              isSubmitting || !editName.trim() || editMealIds.length === 0
            }
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
