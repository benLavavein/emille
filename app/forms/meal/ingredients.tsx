import { useEffect, useRef, useState } from "react";
import { customAlphabet } from "nanoid";
import { Plus, ChevronUp, ChevronDown, ArrowUpDown, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { QuantityInput, DisplayFraction } from "~/components/ui/quantity-input";
import type { MealFormApi, MealFormValues } from "./index";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

type Props = {
  form: MealFormApi;
};

const UNIT_MAP: Record<string, string> = {
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

function normalizeUnit(raw: string): string {
  return UNIT_MAP[raw.trim().toLowerCase()] ?? raw;
}

export function IngredientsSection({ form }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-plum shrink-0">
          Ingredients
        </label>
        <form.Field name="ingredients" mode="array">
          {(ingredientsField) =>
            ingredientsField.state.value.length > 1 ? (
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
            ) : null
          }
        </form.Field>
      </div>

      <form.Field name="ingredients" mode="array">
        {(ingredientsField) => (
          <>
          <LayoutGroup>
          <div className="flex flex-col gap-1.5">
            {ingredientsField.state.value.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                No ingredients added yet.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {ingredientsField.state.value.map((ing, index) => (
                  <motion.div
                    key={ing._id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 35,
                    }}
                    className="flex items-center gap-1 rounded-xl bg-white/50 border border-blush/30 p-2"
                  >
                    {expandedIndex === index ? (
                      <ExpandedIngredient
                        form={form}
                        index={index}
                        onCollapse={() => setExpandedIndex(null)}
                      />
                    ) : (
                      <CollapsedIngredient
                        ingredient={ing}
                        onClick={() => setExpandedIndex(index)}
                      />
                    )}

                    {isReordering ? (
                      <div className="flex flex-col items-center justify-center shrink-0 w-9">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            ingredientsField.moveValue(index, index - 1);
                            if (expandedIndex === index)
                              setExpandedIndex(index - 1);
                            else if (expandedIndex === index - 1)
                              setExpandedIndex(index);
                          }}
                          disabled={index === 0}
                        >
                          <ChevronUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            ingredientsField.moveValue(index, index + 1);
                            if (expandedIndex === index)
                              setExpandedIndex(index + 1);
                            else if (expandedIndex === index + 1)
                              setExpandedIndex(index);
                          }}
                          disabled={
                            index === ingredientsField.state.value.length - 1
                          }
                        >
                          <ChevronDown />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          ingredientsField.removeValue(index);
                          if (expandedIndex === index) setExpandedIndex(null);
                          else if (
                            expandedIndex !== null &&
                            expandedIndex > index
                          )
                            setExpandedIndex(expandedIndex - 1);
                        }}
                        className="shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-transparent"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          </LayoutGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newIndex = ingredientsField.state.value.length;
              ingredientsField.pushValue({
                _id: nanoid(),
                name: "",
                amount: undefined,
                unit: "",
                notes: undefined,
              });
              setExpandedIndex(newIndex);
            }}
            className="w-full mt-1"
          >
            <Plus />
            Add Ingredient
          </Button>
          </>
        )}
      </form.Field>
    </div>
  );
}

function CollapsedIngredient({
  ingredient,
  onClick,
}: {
  ingredient: MealFormValues["ingredients"][number];
  onClick: () => void;
}) {
  const hasContent = ingredient.name || ingredient.amount != null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 text-left py-3 px-3 cursor-pointer"
    >
      <div className="flex items-baseline gap-1.5 text-sm font-medium text-plum truncate">
        {ingredient.amount != null && (
          <DisplayFraction value={ingredient.amount} />
        )}
        {ingredient.unit && (
          <span className="text-mauve/70">{ingredient.unit}</span>
        )}
        <span>{ingredient.name || (!hasContent && "Untitled ingredient")}</span>
      </div>
      {ingredient.notes && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {ingredient.notes}
        </p>
      )}
    </button>
  );
}

function ExpandedIngredient({
  form,
  index,
  onCollapse,
}: {
  form: MealFormApi;
  index: number;
  onCollapse: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const handleBlur = (e: React.FocusEvent) => {
    if (
      containerRef.current &&
      e.relatedTarget instanceof Node &&
      containerRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    onCollapse();
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col py-3 gap-1.5 grow min-w-0"
      onBlur={handleBlur}
    >
      <form.Field name={`ingredients[${index}].name`}>
        {(field) => (
          <Textarea
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            onBlur={field.handleBlur}
            maxLength={100}
            placeholder="Ingredient name..."
            autoFocus
            textareaClassName="px-3 py-2 text-sm font-medium"
          />
        )}
      </form.Field>

      <div className="flex items-center gap-2">
        <form.Field name={`ingredients[${index}].amount`}>
          {(field) => (
            <QuantityInput
              value={field.state.value}
              onChange={(val) => field.handleChange(val)}
            />
          )}
        </form.Field>

        <form.Field name={`ingredients[${index}].unit`}>
          {(field) => (
            <Input
              type="text"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={() => {
                const normalized = normalizeUnit(field.state.value);
                if (normalized !== field.state.value) {
                  field.handleChange(normalized);
                }
                field.handleBlur();
              }}
              placeholder="cups, oz..."
            />
          )}
        </form.Field>
      </div>

      <form.Field name={`ingredients[${index}].notes`}>
        {(field) => (
          <Input
            type="text"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
            onBlur={field.handleBlur}
            inputClassName="text-xs"
            placeholder="Notes (optional)..."
          />
        )}
      </form.Field>
    </div>
  );
}
