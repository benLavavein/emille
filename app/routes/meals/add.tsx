import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { MealForm, type MealFormData } from "~/components/meal-form";

export function meta() {
  return [
    { title: "New Meal - Emille" },
    { name: "description", content: "Create a new meal" },
  ];
}

export default function AddMealPage() {
  const navigate = useNavigate();
  const createMeal = useMutation(api.meals.create);

  const handleSubmit = async (data: MealFormData) => {
    await createMeal({
      name: data.name,
      mealTimes: data.mealTimes,
      tagIds: data.tagIds as any,
      ingredients: data.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId as any,
        amount: ing.amount,
        unit: ing.unit,
        notes: ing.notes,
      })),
      steps: data.steps,
    });
    navigate("/meals");
  };

  return (
    <MealForm
      onSubmit={handleSubmit}
      onCancel={() => navigate("/meals")}
      title="Create a New Meal"
      backLabel="Back to meals"
      submitLabel="Create Meal"
      submittingLabel="Creating..."
    />
  );
}
