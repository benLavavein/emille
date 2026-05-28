import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Combobox, type ComboboxItem } from "~/components/ui/combobox";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Timer,
  Trash,
} from "lucide-react";
import { QuantityInput } from "~/components/ui/quantity-input";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";
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
  servings?: number;
  mealTimes: string[];
  tagIds: string[];
  ingredients: {
    name: string;
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
    servings?: number;
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
  const [servings, setServings] = useState(
    initialData?.servings ? String(initialData.servings) : "",
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
    { id: number; text: string; timerMinutes: string; timerOpen: boolean }[]
  >(() =>
    (initialData?.steps ?? []).map((s, i) => ({
      id: i + 1,
      text: s.text,
      timerMinutes: s.timerSeconds ? String(s.timerSeconds / 60) : "",
      timerOpen: !!s.timerSeconds,
    })),
  );
  const [newStep, setNewStep] = useState("");
  const [isReordering, setIsReordering] = useState(false);
  const [isReorderingIngredients, setIsReorderingIngredients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tagItems: ComboboxItem[] = (existingTags || [])
    .filter((tag) => !mealTags.some((mt) => mt.id === tag._id))
    .map((tag) => ({ id: tag._id, label: tag.name }));

  const toggleMealTime = (time: string) => {
    setMealTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time],
    );
  };

  const addIngredient = () => {
    setMealIngredients((prev) => [...prev, { name: "", amount: 1, unit: "" }]);
  };

  const updateIngredientName = (index: number, name: string) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, name } : ing)),
    );
  };

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

  const normalizeUnit = (raw: string): string => {
    const map: Record<string, string> = {
      tablespoon: "tbsp",
      tablespoons: "tbsp",
      tbsp: "tbsp",
      tbs: "tbsp",
      teaspoon: "tsp",
      teaspoons: "tsp",
      tsp: "tsp",
      cup: "cup",
      cups: "cups",
      ounce: "oz",
      ounces: "oz",
      oz: "oz",
      pound: "lb",
      pounds: "lbs",
      lb: "lb",
      lbs: "lbs",
      gram: "g",
      grams: "g",
      g: "g",
      kilogram: "kg",
      kilograms: "kg",
      kg: "kg",
      milliliter: "ml",
      milliliters: "ml",
      ml: "ml",
      liter: "l",
      liters: "l",
      l: "l",
      fluid: "fl oz",
      "fluid ounce": "fl oz",
      "fluid ounces": "fl oz",
      "fl oz": "fl oz",
      pinch: "pinch",
      pinches: "pinches",
      clove: "clove",
      cloves: "cloves",
      slice: "slice",
      slices: "slices",
      piece: "piece",
      pieces: "pieces",
      can: "can",
      cans: "cans",
      package: "pkg",
      packages: "pkg",
      pkg: "pkg",
      bunch: "bunch",
      bunches: "bunches",
    };
    const normalized = map[raw.trim().toLowerCase()];
    return normalized ?? raw;
  };

  const handleUnitBlur = (index: number, raw: string) => {
    const normalized = normalizeUnit(raw);
    if (normalized !== raw) {
      updateIngredientUnit(index, normalized);
    }
  };

  const updateIngredientNotes = (index: number, notes: string) => {
    setMealIngredients((prev) =>
      prev.map((ing, i) =>
        i === index ? { ...ing, notes: notes || undefined } : ing,
      ),
    );
  };

  const removeIngredient = (index: number) => {
    setMealIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const moveIngredient = (from: number, to: number) => {
    setMealIngredients((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const removeTag = (index: number) => {
    setMealTags((prev) => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    const id = nextStepId.current++;
    setSteps((prev) => [
      ...prev,
      { id, text: newStep.trim(), timerMinutes: "", timerOpen: false },
    ]);
    setNewStep("");
  };

  const toggleStepTimer = (index: number) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index
          ? { ...step, timerOpen: !step.timerOpen, timerMinutes: !step.timerOpen ? step.timerMinutes : "" }
          : step,
      ),
    );
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
      const servingsInt = parseInt(servings, 10);
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        prepTime: prepSecs,
        cookTime: cookSecs,
        servings: servingsInt > 0 ? servingsInt : undefined,
        mealTimes,
        tagIds: mealTags.map((t) => t.id),
        ingredients: mealIngredients
          .filter((ing) => ing.name.trim())
          .map((ing) => ({
            name: ing.name.trim(),
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

        {/* Prep, Cook Time & Servings */}
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
          <div className="flex-1">
            <label
              htmlFor="servings"
              className="block text-sm font-medium text-plum mb-2"
            >
              Servings
            </label>
            <Input
              id="servings"
              type="number"
              min="1"
              step="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="4"
            />
          </div>
        </div>

        {/* Meal Times */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            When do you enjoy eating this?
          </label>
          <div className="flex gap-3">
            {MEAL_TIMES.map((time) => {
              const Icon = MEAL_TIME_ICONS[time];
              return (
                <Button
                  key={time}
                  type="button"
                  variant={mealTimes.includes(time) ? "default" : "outline"}
                  onClick={() => toggleMealTime(time)}
                  className="flex-1 gap-2"
                >
                  <Icon className="size-4 shrink-0" />
                  {time}
                </Button>
              );
            })}
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
            <div className="flex items-center gap-3 mb-2">
              <label className="block text-sm font-medium text-plum shrink-0">
                Ingredients
              </label>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={addIngredient}
                className="flex-1"
              >
                <Plus className="size-4 mr-1" />
                Add Ingredient
              </Button>
              {mealIngredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsReorderingIngredients((v) => !v)}
                  className={`flex items-center justify-center gap-1 text-xs shrink-0 w-16 transition-colors ${
                    isReorderingIngredients
                      ? "text-plum font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                  {isReorderingIngredients ? "Done" : "Reorder"}
                </button>
              )}
            </div>

            <div className="divide-y divide-border">
              {mealIngredients.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No ingredients added yet.
                </p>
              ) : (
                mealIngredients.map((ing, index) => (
                  <div className="flex items-center gap-2" key={index}>
                    <div className="flex flex-col py-2.5 gap-0.5 group grow min-w-0">
                      <AutoResizeTextarea
                        value={ing.name}
                        onChange={(e) =>
                          updateIngredientName(index, e.target.value)
                        }
                        maxLength={100}
                        rows={1}
                        className="w-full px-2 py-1 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm font-medium resize-none overflow-hidden"
                        placeholder="Ingredient name..."
                        autoFocus={!ing.name}
                      />

                      <div className="flex items-center gap-2 px-1">
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
                          onBlur={(e) => handleUnitBlur(index, e.target.value)}
                          className="w-20 px-2 py-0.5 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-sm"
                          placeholder="cups, oz..."
                        />
                      </div>

                      <input
                        type="text"
                        value={ing.notes ?? ""}
                        onChange={(e) =>
                          updateIngredientNotes(index, e.target.value)
                        }
                        className="px-2 py-0.5 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-xs text-muted-foreground"
                        placeholder="Notes (optional)..."
                      />
                    </div>

                    {isReorderingIngredients ? (
                      <div className="flex flex-col items-center justify-center shrink-0 h-9 w-9 -space-y-1">
                        <button
                          type="button"
                          onClick={() => moveIngredient(index, index - 1)}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                        >
                          <ChevronUp className="size-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveIngredient(index, index + 1)}
                          disabled={index === mealIngredients.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                        >
                          <ChevronDown className="size-5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIngredient(index)}
                        className="bg-red-600/10 hover:bg-red-600/20"
                      >
                        <Trash className="size-5 text-red-600/70" />
                      </Button>
                    )}
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
                  className={`flex items-center justify-center gap-1 text-xs w-16 transition-colors ${
                    isReordering
                      ? "text-plum font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
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
                      className="flex items-start gap-2 py-2.5 group"
                    >
                      {/* Step number + clock toggle */}
                      <div className="flex flex-col items-center shrink-0 w-5 gap-1 pt-1">
                        <span className="text-sm font-medium text-muted-foreground leading-none">
                          {index + 1}.
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleStepTimer(index)}
                          title={step.timerOpen ? "Remove timer" : "Add timer"}
                          className={`transition-colors ${
                            step.timerOpen
                              ? "text-plum"
                              : "text-muted-foreground/40 hover:text-muted-foreground"
                          }`}
                        >
                          <Timer className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Step text + optional timer */}
                      <div className="flex flex-col flex-1 min-w-0 gap-1">
                        <AutoResizeTextarea
                          value={step.text}
                          onChange={(e) => updateStep(index, e.target.value)}
                          rows={1}
                          className="w-full px-2 py-1 rounded-lg border border-transparent bg-transparent focus:outline-none focus:border-border focus:bg-background text-sm resize-none overflow-hidden"
                        />
                        {step.timerOpen && (
                          <div className="flex items-center gap-1.5 px-2">
                            <Timer className="h-3 w-3 text-muted-foreground shrink-0" />
                            <input
                              type="number"
                              value={step.timerMinutes}
                              onChange={(e) =>
                                updateStepTimer(index, e.target.value)
                              }
                              placeholder="minutes"
                              min="0"
                              step="0.5"
                              className="w-20 px-1.5 py-0.5 rounded-lg border border-transparent bg-transparent focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {/* Trash or reorder arrows */}
                      {isReordering ? (
                        <div className="flex flex-col items-center justify-center shrink-0 h-9 w-9 -space-y-1">
                          <button
                            type="button"
                            onClick={() => moveStep(index, index - 1)}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, index + 1)}
                            disabled={index === steps.length - 1}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-0.5"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(index)}
                          className="shrink-0 bg-red-600/10 hover:bg-red-600/20 h-9 w-9"
                        >
                          <Trash className="size-4 text-red-600/70" />
                        </Button>
                      )}
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
