import { useState } from "react";
import { useNavigate } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useAction, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { MealForm, type MealFormData } from "~/components/meal-form";
import { Button } from "~/components/ui/button";
import { Loader2, Link as LinkIcon, PenLine } from "lucide-react";

export function meta() {
  return [
    { title: "New Meal - Emille" },
    { name: "description", content: "Create a new meal" },
  ];
}

function ImportFromUrl({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const importRecipe = useAction(api.importRecipe.importFromUrl);
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsImporting(true);
    setError(null);
    try {
      const mealId = await importRecipe({ url: url.trim() });
      navigate(`/meals/${mealId}`);
    } catch (err: any) {
      setError(err.message || "Failed to import recipe");
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={onCancel}
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to meals
        </button>
        <h1 className="text-3xl font-bold text-plum">Import from URL</h1>
        <p className="text-mauve mt-2">
          Paste a link to a recipe and we'll import the ingredients and steps for you.
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-4 max-w-xl">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.example.com/recipes/..."
          className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
          required
          disabled={isImporting}
        />

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isImporting || !url.trim()}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Recipe"
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AddMealPage() {
  useSetBackUrl("/meals");
  const navigate = useNavigate();
  const createMeal = useMutation(api.meals.create);
  const [mode, setMode] = useState<"manual" | "import">("manual");

  const handleSubmit = async (data: MealFormData) => {
    const mealId = await createMeal({
      name: data.name,
      description: data.description,
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      servings: data.servings,
      mealTimes: data.mealTimes,
      tagIds: data.tagIds as any,
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

  if (mode === "import") {
    return <ImportFromUrl onCancel={() => setMode("manual")} />;
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-8">
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("manual")}
          >
            <PenLine className="h-4 w-4 mr-1.5" />
            Create manually
          </Button>
          <Button
            variant={mode === "import" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("import")}
          >
            <LinkIcon className="h-4 w-4 mr-1.5" />
            Import from URL
          </Button>
        </div>
      </div>
      <MealForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/meals")}
        title="Create a New Meal"
        backLabel="Back to meals"
        submitLabel="Create Meal"
        submittingLabel="Creating..."
      />
    </div>
  );
}
