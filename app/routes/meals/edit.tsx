import { Link, useNavigate, useParams } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { MealForm, type MealFormData } from "~/components/meal-form";

export function meta() {
  return [
    { title: "Edit Meal - Emille" },
    { name: "description", content: "Edit meal details" },
  ];
}

export default function EditMealPage() {
  const params = useParams();
  useSetBackUrl(`/meals/${params.id}`);
  const navigate = useNavigate();
  const mealId = params.id as string;

  const meal = useQuery(api.meals.get, { id: mealId as any });
  const updateMeal = useMutation(api.meals.update);

  if (meal === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meal...</p>
        </div>
      </div>
    );
  }

  if (meal === null) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
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

  const initialData = {
    name: meal.name,
    description: meal.description,
    prepTime: meal.prepTime,
    cookTime: meal.cookTime,
    servings: meal.servings,
    mealTimes: meal.mealTimes || [],
    ingredients: meal.ingredients.map((ing: any) => ({
      name: ing.name,
      amount: ing.amount ?? undefined,
      unit: ing.unit || "",
      notes: ing.notes,
    })),
    tags: (meal.tags || []).map((tag: any) => ({
      id: tag._id,
      name: tag.name,
    })),
    steps: meal.steps || [],
  };

  const handleSubmit = async (data: MealFormData) => {
    await updateMeal({
      id: mealId as any,
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

  return (
    <MealForm
      initialData={initialData}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/meals/${mealId}`)}
      title="Edit Meal"
      backLabel="Cancel editing"
      submitLabel="Save Changes"
      submittingLabel="Saving..."
    />
  );
}
