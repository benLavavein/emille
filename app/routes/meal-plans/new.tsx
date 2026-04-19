import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { X, Check } from "lucide-react";

export function meta() {
  return [
    { title: "New Meal Plan - Emille" },
    { name: "description", content: "Create a new meal plan" },
  ];
}

export default function NewMealPlanPage() {
  const navigate = useNavigate();
  const meals = useQuery(api.meals.list);
  const createMealPlan = useMutation(api.mealPlans.create);

  const [name, setName] = useState("");
  const [selectedMealIds, setSelectedMealIds] = useState<string[]>([]);
  const [setAsActive, setSetAsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMeal = (mealId: string) => {
    setSelectedMealIds((prev) =>
      prev.includes(mealId)
        ? prev.filter((id) => id !== mealId)
        : [...prev, mealId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedMealIds.length === 0) return;

    setIsSubmitting(true);
    try {
      await createMealPlan({
        name: name.trim(),
        mealIds: selectedMealIds as any,
        setActive: setAsActive,
      });
      navigate("/meal-plans");
    } catch (error) {
      console.error("Failed to create meal plan:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/meal-plans"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to meal plans
        </Link>
        <h1 className="text-3xl font-bold text-plum">Create a Meal Plan</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., This Week's Meals"
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            required
          />
        </div>

        {/* Set as Active */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSetAsActive(!setAsActive)}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              setAsActive
                ? "bg-plum border-plum text-white"
                : "border-blush/50 bg-white/60"
            }`}
          >
            {setAsActive && <Check className="w-3 h-3" />}
          </button>
          <label
            className="text-sm text-plum cursor-pointer"
            onClick={() => setSetAsActive(!setAsActive)}
          >
            Set as active meal plan (shows on home page)
          </label>
        </div>

        {/* Select Meals */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Select Meals
          </label>

          {meals === undefined ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
            </div>
          ) : meals.length === 0 ? (
            <div className="text-center py-8 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50">
              <p className="text-mauve mb-4">No meals yet</p>
              <Link
                to="/meals/add"
                className="text-plum hover:underline font-medium"
              >
                Create a meal first
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto rounded-xl border border-blush/50 bg-white/60 p-3">
              {meals.map((meal) => {
                const isSelected = selectedMealIds.includes(meal._id);
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
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-plum">{meal.name}</span>
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
                  </button>
                );
              })}
            </div>
          )}

          {selectedMealIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedMealIds.map((id) => {
                const meal = meals?.find((m) => m._id === id);
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

        {/* Submit */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" asChild>
            <Link to="/meal-plans">Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || !name.trim() || selectedMealIds.length === 0}
          >
            {isSubmitting ? "Creating..." : "Create Meal Plan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
