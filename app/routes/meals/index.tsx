export function meta() {
  return [
    { title: "My Meals - Emille" },
    { name: "description", content: "View and manage your meals" },
  ];
}

export default function MealsIndexOutlet() {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <p className="text-mauve text-center text-sm max-w-xs">
        Select a meal from the list to view ingredients and steps.
      </p>
    </div>
  );
}
