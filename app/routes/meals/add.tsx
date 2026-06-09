import { useState } from "react";
import { useNavigate } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useAction, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { MealForm, type MealFormData } from "~/forms/meal";
import { Button } from "~/components/ui/button";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { Input } from "~/components/ui/input";

export function meta() {
  return [
    { title: "New Meal - Emille" },
    { name: "description", content: "Create a new meal" },
  ];
}

export default function AddMealPage() {
  useSetBackUrl("/meals");
  const navigate = useNavigate();
  const createMeal = useMutation(api.meals.create);
  const importRecipe = useAction(api.importRecipe.importFromUrl);

  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const mealId = await importRecipe({ url: importUrl.trim() });
      navigate(`/meals/${mealId}`);
    } catch (err: any) {
      setImportError(err.message || "Failed to import recipe");
      setIsImporting(false);
    }
  };

  const handleSubmit = async (data: MealFormData) => {
    const mealId = await createMeal({
      name: data.name,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      mealTimes: data.mealTimes,
      tagIds: data.tagIds as any,
      type: data.type,
      sideAttachments: data.sideAttachments as any,
      ingredients: data.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        notes: ing.notes,
      })),
      steps: data.steps,
    });
    navigate(`/meals/${mealId}`);
  };

  const header = (
    <>
      <h1 className="text-3xl font-bold text-plum mb-6">Create a meal</h1>

      <form onSubmit={handleImport} className="flex gap-2">
        <Input
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder="Import via URL"
          disabled={isImporting}
        />

        <Button
          type="submit"
          disabled={isImporting || !importUrl.trim()}
          size="icon"
        >
          {isImporting ? <Loader2 className="animate-spin" /> : <LinkIcon />}
        </Button>
      </form>

      {importError && (
        <p className="mt-2 text-sm text-destructive">{importError}</p>
      )}

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-blush/40" />
        <span className="text-xs font-medium tracking-widest text-mauve/50 uppercase">
          or
        </span>
        <div className="flex-1 h-px bg-blush/40" />
      </div>
    </>
  );

  return (
    <MealForm
      headerSlot={header}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/meals")}
      submitLabel="Create Meal"
      submittingLabel="Creating..."
    />
  );
}
