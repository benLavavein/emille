import { useForm } from "@tanstack/react-form";
import { customAlphabet } from "nanoid";
import { Button } from "~/components/ui/button";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);
import { MealDetailsSection } from "./details";
import { IngredientsSection } from "./ingredients";
import { StepsSection } from "./steps";

export type MealFormValues = {
  name: string;
  description: string;
  prepTimeMin: string;
  cookTimeMin: string;
  servings: string;
  mealTimes: string[];
  tags: { id: string; name: string }[];
  type: "meal" | "side";
  sideAttachments: { sideId: string; name: string; alwaysInclude: boolean }[];
  ingredients: {
    _id: string;
    name: string;
    amount: number | undefined;
    unit: string;
    notes: string | undefined;
  }[];
  steps: {
    _id: string;
    text: string;
    timerMinutes: string;
  }[];
};

function _useFormType() {
  return useForm({ defaultValues: {} as MealFormValues });
}
export type MealFormApi = ReturnType<typeof _useFormType>;

export type MealFormData = {
  name: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  mealTimes: string[];
  tagIds: string[];
  type: "meal" | "side";
  sideAttachments: { sideId: string; alwaysInclude: boolean }[];
  ingredients: {
    name: string;
    amount: number | undefined;
    unit: string | undefined;
    notes: string | undefined;
  }[];
  steps: { text: string; timerSeconds?: number }[];
};

type MealFormProps = {
  initialData?: {
    name: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    mealTimes: string[];
    type?: "meal" | "side";
    sideAttachments?: { sideId: string; name: string; alwaysInclude: boolean }[];
    ingredients: {
      name: string;
      amount: number | undefined;
      unit: string;
      notes?: string;
    }[];
    tags: { id: string; name: string }[];
    steps: { text: string; timerSeconds?: number }[];
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
  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      prepTimeMin: initialData?.prepTime
        ? String(Math.round(initialData.prepTime / 60))
        : "",
      cookTimeMin: initialData?.cookTime
        ? String(Math.round(initialData.cookTime / 60))
        : "",
      servings: initialData?.servings ? String(initialData.servings) : "",
      mealTimes: initialData?.mealTimes ?? [],
      tags: initialData?.tags ?? [],
      type: initialData?.type ?? "meal",
      sideAttachments: initialData?.sideAttachments ?? [],
      ingredients: (initialData?.ingredients ?? []).map((ing) => ({
        _id: nanoid(),
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit ?? "",
        notes: ing.notes,
      })),
      steps: (initialData?.steps ?? []).map((s) => ({
        _id: nanoid(),
        text: s.text,
        timerMinutes: s.timerSeconds ? String(s.timerSeconds / 60) : "",
      })),
    } satisfies MealFormValues,
    onSubmit: async ({ value }) => {
      const prepSecs =
        parseFloat(value.prepTimeMin) > 0
          ? Math.round(parseFloat(value.prepTimeMin) * 60)
          : undefined;
      const cookSecs =
        parseFloat(value.cookTimeMin) > 0
          ? Math.round(parseFloat(value.cookTimeMin) * 60)
          : undefined;
      const servingsInt = parseInt(value.servings, 10);
      await onSubmit({
        name: value.name.trim(),
        description: value.description.trim() || undefined,
        prepTime: prepSecs,
        cookTime: cookSecs,
        servings: servingsInt > 0 ? servingsInt : undefined,
        mealTimes: value.mealTimes,
        tagIds: value.tags.map((t) => t.id),
        type: value.type,
        sideAttachments: value.sideAttachments.map(({ sideId, alwaysInclude }) => ({
          sideId,
          alwaysInclude,
        })),
        ingredients: value.ingredients
          .filter((ing) => ing.name.trim())
          .map(({ _id: _, ...ing }) => ({
            name: ing.name.trim(),
            amount: ing.amount,
            unit: ing.unit.trim() || undefined,
            notes: ing.notes,
          })),
        steps: value.steps.map(({ _id: _, ...s }) => {
          const mins = parseFloat(s.timerMinutes);
          return {
            text: s.text,
            timerSeconds: mins > 0 ? Math.round(mins * 60) : undefined,
          };
        }),
      });
    },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-8 flex flex-col min-h-[calc(100vh-6rem)]">
      <h1 className="text-3xl font-bold text-plum mb-8">{title}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-8 flex-1 flex flex-col"
      >
        <MealDetailsSection form={form} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <IngredientsSection form={form} />
          <StepsSection form={form} />
        </div>

        <div className="flex gap-4 pt-4 mt-auto md:static fixed bottom-0 left-0 right-0 md:bg-transparent md:border-0 md:shadow-none bg-white/80 backdrop-blur-sm border-t border-blush/50 p-4 md:p-0">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="flex-1"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? submittingLabel : submitLabel}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
