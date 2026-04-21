export function meta() {
  return [
    { title: "My Ingredients - Emille" },
    { name: "description", content: "View and manage your ingredients" },
  ];
}

export default function IngredientsIndexOutlet() {
  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <p className="max-w-xs text-center text-sm text-mauve">
        Select an ingredient from the list to view details.
      </p>
    </div>
  );
}
