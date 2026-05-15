import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Combobox, type ComboboxItem } from "~/components/ui/combobox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Timer,
  Trash,
} from "lucide-react";
import { QuantityInput } from "~/components/ui/quantity-input";
import { MEAL_TIMES } from "~/lib/constants/meals";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Input } from "./ui/input";

function AutoResizeTextarea(props: React.ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(resize, [props.value]);

  return <textarea ref={ref} onInput={resize} {...props} />;
}

export type MealIngredient = {
  ingredientId?: string;
  name: string;
  amount: number | undefined;
  unit: string;
  notes?: string;
};

export type MealTag = {
  id: string;
  name: string;
};

export type MealStep = {
  text: string;
  timerSeconds?: number;
};

export type MealFormData = {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  mealTimes: string[];
  tagIds: string[];
  ingredients: {
    name: string;
    ingredientId?: string;
    amount: number | undefined;
    unit: string | undefined;
    notes: string | undefined;
  }[];
  steps: MealStep[];
};

type MealFormProps = {
  initialData?: {
    name: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    mealTimes: string[];
    ingredients: MealIngredient[];
    tags: MealTag[];
    steps: MealStep[];
  };
  onSubmit: (data: MealFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
  title: string;
};

export function MealForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
  title,
}: MealFormProps) {
  const existingIngredients = useQuery(api.ingredients.list);
  const existingTags = useQuery(api.tags.list);
  const createTag = useMutation(api.tags.create);

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [prepTimeMin, setPrepTimeMin] = useState(
    initialData?.prepTime ? String(Math.round(initialData.prepTime / 60)) : "",
  );
  const [cookTimeMin, setCookTimeMin] = useState(
    initialData?.cookTime ? String(Math.round(initialData.cookTime / 60)) : "",
  );
  const [mealTimes, setMealTimes] = useState<string[]>(
    initialData?.mealTimes ?? [],
  );
  const [mealIngredients, setMealIngredients] = useState<MealIngredient[]>(
    initialData?.ingredients ?? [],
  );
  const [mealTags, setMealTags] = useState<MealTag[]>(initialData?.tags ?? []);
  const nextStepId = useRef((initialData?.steps?.length ?? 0) + 1);
  const [steps, setSteps] = useState<
    { id: number; text: string; timerMinutes: string }[]
  >(() =>
    (initialData?.steps ?? []).map((s, i) => ({
      id: i + 1,
      text: s.text,
      timerMinutes: s.timerSeconds ? String(s.timerSeconds / 60) : "",
    })),
  );
  const [newStep, setNewStep] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ingredientItems: ComboboxItem[] = (existingIngredients || [])
    .filter(
      (ing) =>
        !mealIngredients.some(
          (mi) => mi.ingredientId === ing._id || mi.name === ing.name,
        ),
    )
    .map((ing) => ({ id: ing._id, label: ing.name }));

  const tagItems: ComboboxItem[] = (existingTags || [])
    .filter((tag) => !mealTags.some((mt) => mt.id === tag._id))
    .map((tag) => ({ id: tag._id, label: tag.name }));

  const toggleMealTime = (time: string) => {
    setMealTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  const handleSelectIngredient = (item: ComboboxItem) => {
    setMealIngredients((prev) => [
      ...prev,
      { ingredientId: item.id, name: item.label, amount: 1, unit: "" },
    ]);
  };

  const handleCreateIngredient = useCallback((ingredientName: string) => {
    setMealIngredients((prev) => [
      ...prev,
      { name: ingredientName, amount: 1, unit: "" },
    ]);
  }, []);

  const handleSelectTag = (item: ComboboxItem) => {
    setMealTags((prev) => [...prev, { id: item.id, name: item.label }]);
  };

  const handleCreateTag = useCallback(
    async (tagName: string) => {
      const id = await createTag({ name: tagName });
      setMealTags((prev) => [...prev, { id, name: tagName }]);
    },
    [createTag],
  );

  const updateIngredientAmount = (
    index: number,
    amount: number | undefined,
  ) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, amount } : ing)),
    );
  };

  const updateIngredientUnit = (index: number, unit: string) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, unit } : ing)),
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
    const id = nextStepId.current++;
    setSteps((prev) => [
      ...prev,
      { id, text: newStep.trim(), timerMinutes: "" },
    ]);
    setNewStep("");
  };

  const updateStep = (index: number, text: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, text } : step)),
    );
  };

  const updateStepTimer = (index: number, timerMinutes: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, timerMinutes } : step)),
    );
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStep = (from: number, to: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || mealTimes.length === 0) return;

    setIsSubmitting(true);
    try {
      const prepSecs =
        parseFloat(prepTimeMin) > 0
          ? Math.round(parseFloat(prepTimeMin) * 60)
          : undefined;
      const cookSecs =
        parseFloat(cookTimeMin) > 0
          ? Math.round(parseFloat(cookTimeMin) * 60)
          : undefined;
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        prepTime: prepSecs,
        cookTime: cookSecs,
        mealTimes,
        tagIds: mealTags.map((t) => t.id),
        ingredients: mealIngredients.map((ing) => ({
          name: ing.name,
          ingredientId: ing.ingredientId,
          amount: ing.amount,
          unit: ing.unit.trim() || undefined,
          notes: ing.notes,
        })),
        steps: steps.map((s) => {
          const mins = parseFloat(s.timerMinutes);
          return {
            text: s.text,
            timerSeconds: mins > 0 ? Math.round(mins * 60) : undefined,
          };
        }),
      });
    } catch (error) {
      console.error("Failed to save meal:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col min-h-[calc(100vh-6rem)]">
      <h1 className="text-3xl font-bold text-plum mb-8">{title}</h1>

      <form onSubmit={handleSubmit} className="space-y-8 flex-1 flex flex-col">
        {/* Meal Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-plum mb-2"
          >
            Meal Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Grandma's Chicken Soup"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-plum mb-2"
          >
            Description
          </label>
          <AutoResizeTextarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="A short description of this meal..."
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50 resize-none overflow-hidden"
          />
        </div>

        {/* Prep & Cook Time */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="prepTime"
              className="block text-sm font-medium text-plum mb-2"
            >
              Prep Time (min)
            </label>
            <Input
              id="prepTime"
              type="number"
              min="0"
              value={prepTimeMin}
              onChange={(e) => setPrepTimeMin(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="cookTime"
              className="block text-sm font-medium text-plum mb-2"
            >
              Cook Time (min)
            </label>
            <Input
              id="cookTime"
              type="number"
              min="0"
              value={cookTimeMin}
              onChange={(e) => setCookTimeMin(e.target.value)}
              placeholder="30"
            />
          </div>
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
            emptyText="No existing tags found."
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="mt-4 divide-y divide-border">
              {mealIngredients.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No ingredients added yet. Search or create above.
                </p>
              ) : (
                mealIngredients.map((ing, index) => (
                  <div
                    key={`${ing.ingredientId || ing.name}-${index}`}
                    className="flex items-center gap-3 py-2.5 group"
                  >
                    <span className="font-medium text-foreground flex-1 min-w-0 truncate">
                      {ing.name}
                    </span>

                    <QuantityInput
                      value={ing.amount}
                      onChange={(val) => updateIngredientAmount(index, val)}
                    />

                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) =>
                        updateIngredientUnit(index, e.target.value)
                      }
                      className="w-24 px-2 py-1 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                      placeholder="cups, oz..."
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash className="size-4 text-red-600" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recipe Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-plum">
                Recipe Steps
              </label>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsReordering((v) => !v)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    isReordering
                      ? "text-plum font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {isReordering ? "Done" : "Reorder"}
                </button>
              )}
            </div>

            <LayoutGroup>
              <div className="divide-y divide-border mb-4">
                <AnimatePresence initial={false}>
                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                      className="flex items-center gap-2 py-2.5 group"
                    >
                      {isReordering && (
                        <div className="flex flex-col shrink-0 -space-y-1">
                          <button
                            type="button"
                            onClick={() => moveStep(index, index - 1)}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                          >
                            <ChevronUp className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, index + 1)}
                            disabled={index === steps.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                          >
                            <ChevronDown className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                      <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                        {index + 1}.
                      </span>

                      <AutoResizeTextarea
                        value={step.text}
                        onChange={(e) => updateStep(index, e.target.value)}
                        rows={1}
                        className="flex-1 px-2 py-1 rounded-lg border border-transparent bg-transparent focus:outline-none focus:border-border focus:bg-background text-sm resize-none overflow-hidden"
                      />

                      <div className="flex items-center gap-1 shrink-0">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="number"
                          value={step.timerMinutes}
                          onChange={(e) =>
                            updateStepTimer(index, e.target.value)
                          }
                          placeholder="min"
                          min="0"
                          step="0.5"
                          className="w-14 px-1.5 py-1 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-xs text-center"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>

            <div className="flex gap-2 items-start">
              <AutoResizeTextarea
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addStep();
                  }
                }}
                rows={1}
                placeholder="Add a step..."
                className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground resize-none overflow-hidden"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addStep}
                className="mt-0.5"
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Submit/Cancel Buttons */}
        <div className="flex gap-4 pt-4 mt-auto">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || !name.trim() || mealTimes.length === 0}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
