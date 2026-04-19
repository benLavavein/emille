import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Combobox, type ComboboxItem } from "~/components/ui/combobox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { X, GripVertical } from "lucide-react";
import { MEAL_TIMES } from "~/lib/constants/meals";

type IngredientId = string;
type TagId = string;

export function meta() {
  return [
    { title: "New Meal - Emille" },
    { name: "description", content: "Create a new meal" },
  ];
}

type MealIngredient = {
  ingredientId: IngredientId;
  name: string;
  amount: string;
  unit: string;
  notes?: string;
};

type MealTag = {
  id: TagId;
  name: string;
};

export default function NewMealPage() {
  const navigate = useNavigate();
  const existingIngredients = useQuery(api.ingredients.list);
  const existingTags = useQuery(api.tags.list);
  const createIngredient = useMutation(api.ingredients.create);
  const createTag = useMutation(api.tags.create);
  const createMeal = useMutation(api.meals.create);

  const [name, setName] = useState("");
  const [mealTimes, setMealTimes] = useState<string[]>([]);
  const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>([]);
  const [mealTags, setMealTags] = useState<MealTag[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  // Convert ingredients to ComboboxItem format
  const ingredientItems: ComboboxItem[] = (existingIngredients || [])
    .filter((ing) => !mealIngredients.some((mi) => mi.ingredientId === ing._id))
    .map((ing) => ({ id: ing._id, label: ing.name }));

  // Convert tags to ComboboxItem format
  const tagItems: ComboboxItem[] = (existingTags || [])
    .filter((tag) => !mealTags.some((mt) => mt.id === tag._id))
    .map((tag) => ({ id: tag._id, label: tag.name }));

  // Toggle meal time
  const toggleMealTime = (time: string) => {
    setMealTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  // Add ingredient from combobox
  const handleSelectIngredient = (item: ComboboxItem) => {
    setMealIngredients((prev) => [
      ...prev,
      { ingredientId: item.id, name: item.label, amount: "1", unit: "" },
    ]);
  };

  // Create new ingredient
  const handleCreateIngredient = useCallback(
    async (ingredientName: string) => {
      const id = await createIngredient({ name: ingredientName });
      setMealIngredients((prev) => [
        ...prev,
        {
          ingredientId: id,
          name: ingredientName,
          amount: "1",
          unit: "",
        },
      ]);
    },
    [createIngredient]
  );

  // Add tag from combobox
  const handleSelectTag = (item: ComboboxItem) => {
    setMealTags((prev) => [...prev, { id: item.id, name: item.label }]);
  };

  // Create new tag
  const handleCreateTag = useCallback(
    async (tagName: string) => {
      const id = await createTag({ name: tagName });
      setMealTags((prev) => [...prev, { id, name: tagName }]);
    },
    [createTag]
  );

  const updateIngredientAmount = (index: number, amount: string) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, amount } : ing))
    );
  };

  const updateIngredientUnit = (index: number, unit: string) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, unit } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setMealIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const removeTag = (index: number) => {
    setMealTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setSteps((prev) => [...prev, newStep.trim()]);
    setNewStep("");
  };

  const updateStep = (index: number, text: string) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? text : step)));
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;

    setSteps((prev) => {
      const newSteps = [...prev];
      const [draggedStep] = newSteps.splice(draggedStepIndex, 1);
      newSteps.splice(index, 0, draggedStep);
      return newSteps;
    });
    setDraggedStepIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedStepIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || mealIngredients.length === 0 || mealTimes.length === 0)
      return;

    setIsSubmitting(true);
    try {
      await createMeal({
        name: name.trim(),
        mealTimes,
        tagIds: mealTags.map((t) => t.id) as any,
        ingredients: mealIngredients.map((ing) => ({
          ingredientId: ing.ingredientId as any,
          amount: parseFloat(ing.amount) || undefined,
          unit: ing.unit.trim() || undefined,
          notes: ing.notes,
        })),
        steps,
      });
      navigate("/meals");
    } catch (error) {
      console.error("Failed to create meal:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/meals"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to meals
        </Link>
        <h1 className="text-3xl font-bold text-plum">Create a New Meal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Meal Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-plum mb-2"
          >
            Meal Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grandma's Chicken Soup"
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            required
          />
        </div>

        {/* Meal Times */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            When do you enjoy eating this?
          </label>
          <div className="flex gap-3">
            {MEAL_TIMES.map((time) => (
              <Button
                key={time}
                type="button"
                variant={mealTimes.includes(time) ? "default" : "outline"}
                onClick={() => toggleMealTime(time)}
                className="capitalize"
              >
                {time}
              </Button>
            ))}
          </div>
          {mealTimes.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Select at least one
            </p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Tags
          </label>
          <Combobox
            items={tagItems}
            placeholder="Add tags (e.g., healthy, quick, comfort food)"
            emptyText="No tags yet"
            onSelect={handleSelectTag}
            onCreate={handleCreateTag}
          />
          {mealTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {mealTags.map((tag, index) => (
                <Badge key={tag.id} variant="secondary" className="gap-1">
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients Section */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Ingredients
          </label>
          <Combobox
            items={ingredientItems}
            placeholder="Search or create ingredients..."
            emptyText="No ingredients yet"
            onSelect={handleSelectIngredient}
            onCreate={handleCreateIngredient}
            showOnlyWhenTyping
          />

          {/* Ingredients List */}
          <div className="mt-4 max-h-64 overflow-y-auto space-y-2 rounded-xl border border-border bg-card/50 p-3">
            {mealIngredients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No ingredients added yet. Search or create above.
              </p>
            ) : (
              mealIngredients.map((ing, index) => (
                <div
                  key={`${ing.ingredientId}-${index}`}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                >
                  <span className="font-medium text-foreground flex-1 min-w-0 truncate">
                    {ing.name}
                  </span>

                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) =>
                      updateIngredientAmount(index, e.target.value)
                    }
                    className="w-16 px-2 py-1 text-center rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    placeholder="1"
                  />

                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) =>
                      updateIngredientUnit(index, e.target.value)
                    }
                    className="w-24 px-2 py-1 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    placeholder="cups, oz..."
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recipe Steps */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Recipe Steps
          </label>

          <div className="space-y-2 mb-4">
            {steps.map((step, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-start gap-3 p-3 bg-background rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                  draggedStepIndex === index ? "opacity-50 shadow-lg" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                </div>

                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  className="flex-1 px-3 py-1 rounded-lg border border-transparent bg-transparent focus:outline-none focus:border-border focus:bg-background"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addStep();
                }
              }}
              placeholder="Add a step..."
              className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            <Button type="button" variant="secondary" onClick={addStep}>
              Add
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" asChild>
            <Link to="/meals">Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={
              isSubmitting ||
              !name.trim() ||
              mealIngredients.length === 0 ||
              mealTimes.length === 0
            }
          >
            {isSubmitting ? "Creating..." : "Create Meal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
