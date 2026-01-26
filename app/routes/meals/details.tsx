import { useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Combobox, type ComboboxItem } from "~/components/ui/combobox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  X,
  GripVertical,
  Pencil,
  Trash2,
  Sunrise,
  Sun,
  MoonStar,
} from "lucide-react";

type IngredientId = string;
type TagId = string;

export function meta() {
  return [
    { title: "Meal Details - Emille" },
    { name: "description", content: "View meal details" },
  ];
}

const QUANTITY_UNITS = [
  "whole",
  "cup",
  "tablespoon",
  "teaspoon",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "L",
  "pinch",
  "dash",
  "to taste",
] as const;

const MEAL_TIMES = ["breakfast", "lunch", "dinner"] as const;

const MEAL_TIME_ICONS = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: MoonStar,
} as const;

type MealIngredient = {
  ingredientId: IngredientId;
  name: string;
  quantity: string;
  unit: string;
  notes?: string;
};

type MealTag = {
  id: TagId;
  name: string;
};

// Parse quantity string like "2 cups" into { quantity: "2", unit: "cups" }
function parseQuantity(quantityStr: string | undefined): {
  quantity: string;
  unit: string;
} {
  if (!quantityStr) return { quantity: "1", unit: "whole" };
  const parts = quantityStr.trim().split(/\s+/);
  if (parts.length === 1) {
    // Check if it's just a unit
    if (QUANTITY_UNITS.includes(parts[0] as any)) {
      return { quantity: "1", unit: parts[0] };
    }
    return { quantity: parts[0], unit: "whole" };
  }
  return { quantity: parts[0], unit: parts.slice(1).join(" ") };
}

export default function MealDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const mealId = params.id as string;

  const meal = useQuery(api.meals.get, { id: mealId as any });
  const existingIngredients = useQuery(api.ingredients.list);
  const existingTags = useQuery(api.tags.list);
  const createIngredient = useMutation(api.ingredients.create);
  const createTag = useMutation(api.tags.create);
  const updateMeal = useMutation(api.meals.update);
  const deleteMeal = useMutation(api.meals.remove);

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editMealTimes, setEditMealTimes] = useState<string[]>([]);
  const [editIngredients, setEditIngredients] = useState<MealIngredient[]>([]);
  const [editTags, setEditTags] = useState<MealTag[]>([]);
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  // Initialize edit form when entering edit mode
  const enterEditMode = () => {
    if (!meal) return;
    setEditName(meal.name);
    setEditMealTimes(meal.mealTimes || []);
    setEditIngredients(
      meal.ingredientsWithDetails.map((ing: any) => {
        const parsed = parseQuantity(ing.quantity);
        return {
          ingredientId: ing.ingredientId,
          name: ing.ingredient?.name || "Unknown",
          quantity: parsed.quantity,
          unit: parsed.unit,
          notes: ing.notes,
        };
      })
    );
    setEditTags(
      (meal.tags || []).map((tag: any) => ({ id: tag._id, name: tag.name }))
    );
    setEditSteps(meal.steps || []);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setNewStep("");
  };

  // Combobox items
  const ingredientItems: ComboboxItem[] = (existingIngredients || [])
    .filter((ing) => !editIngredients.some((mi) => mi.ingredientId === ing._id))
    .map((ing) => ({ id: ing._id, label: ing.name }));

  const tagItems: ComboboxItem[] = (existingTags || [])
    .filter((tag) => !editTags.some((mt) => mt.id === tag._id))
    .map((tag) => ({ id: tag._id, label: tag.name }));

  // Edit handlers
  const toggleMealTime = (time: string) => {
    setEditMealTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleSelectIngredient = (item: ComboboxItem) => {
    setEditIngredients((prev) => [
      ...prev,
      { ingredientId: item.id, name: item.label, quantity: "1", unit: "whole" },
    ]);
  };

  const handleCreateIngredient = useCallback(
    async (ingredientName: string) => {
      const id = await createIngredient({ name: ingredientName });
      setEditIngredients((prev) => [
        ...prev,
        {
          ingredientId: id,
          name: ingredientName,
          quantity: "1",
          unit: "whole",
        },
      ]);
    },
    [createIngredient]
  );

  const handleSelectTag = (item: ComboboxItem) => {
    setEditTags((prev) => [...prev, { id: item.id, name: item.label }]);
  };

  const handleCreateTag = useCallback(
    async (tagName: string) => {
      const id = await createTag({ name: tagName });
      setEditTags((prev) => [...prev, { id, name: tagName }]);
    },
    [createTag]
  );

  const updateIngredientQuantity = (index: number, quantity: string) => {
    setEditIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, quantity } : ing))
    );
  };

  const updateIngredientUnit = (index: number, unit: string) => {
    setEditIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, unit } : ing))
    );
  };

  const removeIngredient = (index: number) => {
    setEditIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const removeTag = (index: number) => {
    setEditTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setEditSteps((prev) => [...prev, newStep.trim()]);
    setNewStep("");
  };

  const updateStep = (index: number, text: string) => {
    setEditSteps((prev) => prev.map((step, i) => (i === index ? text : step)));
  };

  const removeStep = (index: number) => {
    setEditSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;

    setEditSteps((prev) => {
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

  const handleSave = async () => {
    if (
      !editName.trim() ||
      editIngredients.length === 0 ||
      editMealTimes.length === 0
    )
      return;

    setIsSubmitting(true);
    try {
      await updateMeal({
        id: mealId as any,
        name: editName.trim(),
        mealTimes: editMealTimes,
        tagIds: editTags.map((t) => t.id) as any,
        ingredients: editIngredients.map((ing) => ({
          ingredientId: ing.ingredientId as any,
          quantity: `${ing.quantity} ${ing.unit}`,
          notes: ing.notes,
        })),
        steps: editSteps,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update meal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meal...</p>
        </div>
      </div>
    );
  }

  if (meal === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
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

  // VIEW MODE
  if (!isEditing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
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

          {/* Meal Times Icons */}
          <div className="flex items-end gap-2 mt-4">
            {(["breakfast", "lunch", "dinner"] as const).map((time, index) => {
              const Icon = MEAL_TIME_ICONS[time];
              const isActive = meal.mealTimes?.includes(time);
              const arcOffset = index === 1 ? "-translate-y-2" : "translate-y-0";
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
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
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

        {/* Ingredients Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-plum mb-3">Ingredients</h2>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 divide-y divide-blush/30">
            {meal.ingredientsWithDetails.map((ing: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-4">
                <span className="text-mauve min-w-20">{ing.quantity}</span>
                <span className="font-medium text-plum">
                  {ing.ingredient?.name || "Unknown ingredient"}
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
              {meal.steps.map((step: string, index: number) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50"
                >
                  <span className="w-8 h-8 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-semibold shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-plum pt-1">{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
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
        <h1 className="text-3xl font-bold text-plum">Edit Meal</h1>
      </div>

      <div className="space-y-8">
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
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
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
                variant={editMealTimes.includes(time) ? "default" : "outline"}
                onClick={() => toggleMealTime(time)}
                className="capitalize"
              >
                {time}
              </Button>
            ))}
          </div>
          {editMealTimes.length === 0 && (
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
          {editTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {editTags.map((tag, index) => (
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
            {editIngredients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No ingredients added yet. Search or create above.
              </p>
            ) : (
              editIngredients.map((ing, index) => (
                <div
                  key={`${ing.ingredientId}-${index}`}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg border"
                >
                  <span className="font-medium text-foreground flex-1 min-w-0 truncate">
                    {ing.name}
                  </span>

                  <input
                    type="text"
                    value={ing.quantity}
                    onChange={(e) =>
                      updateIngredientQuantity(index, e.target.value)
                    }
                    className="w-16 px-2 py-1 text-center rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                    placeholder="1"
                  />

                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredientUnit(index, e.target.value)}
                    className="px-2 py-1 rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                  >
                    {QUANTITY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>

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
            {editSteps.map((step, index) => (
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

        {/* Save/Cancel Buttons */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={cancelEdit}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={
              isSubmitting ||
              !editName.trim() ||
              editIngredients.length === 0 ||
              editMealTimes.length === 0
            }
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
