import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function meta() {
  return [
    { title: "New Ingredient - Emille" },
    { name: "description", content: "Add a new ingredient" },
  ];
}

const QUANTITY_UNITS = [
  "whole",
  "cup",
  "tablespoon",
  "teaspoon",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "L",
  "pinch",
  "dash",
  "to taste",
] as const;

export default function NewIngredientPage() {
  const navigate = useNavigate();
  const stores = useQuery(api.groceryStores.list);
  const createIngredient = useMutation(api.ingredients.create);

  const [name, setName] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState("");
  const [defaultQuantityType, setDefaultQuantityType] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Get sections for the selected store
  const selectedStore = stores?.find((s) => s._id === selectedStoreId);
  const storeSections = selectedStore?.sections || [];

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    setSelectedSection(""); // Reset section when store changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      await createIngredient({
        name: name.trim(),
        storeId: selectedStoreId ? (selectedStoreId as any) : undefined,
        storeSectionName: selectedSection || undefined,
        defaultQuantityType: defaultQuantityType || undefined,
        notes: notes.trim() || undefined,
      });
      navigate("/ingredients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ingredient");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/ingredients"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to ingredients
        </Link>
        <h1 className="text-3xl font-bold text-plum">Add New Ingredient</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Ingredient Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-plum mb-2"
          >
            Ingredient Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Chicken breast, Olive oil, Garlic"
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            required
          />
        </div>

        {/* Default Quantity Type */}
        <div>
          <label
            htmlFor="quantityType"
            className="block text-sm font-medium text-plum mb-2"
          >
            Default Quantity Type
          </label>
          <select
            id="quantityType"
            value={defaultQuantityType}
            onChange={(e) => setDefaultQuantityType(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum"
          >
            <option value="">Select a default unit...</option>
            {QUANTITY_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <p className="text-sm text-mauve/60 mt-1">
            This will be pre-selected when adding this ingredient to a meal
          </p>
        </div>

        {/* Store Selection */}
        <div className="p-4 bg-white/40 rounded-xl border border-blush/30">
          <h3 className="text-sm font-medium text-plum mb-3">
            Store Location (Optional)
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="store"
                className="block text-sm text-mauve mb-2"
              >
                Store
              </label>
              {stores === undefined ? (
                <div className="text-mauve/60 text-sm">Loading stores...</div>
              ) : stores.length === 0 ? (
                <div className="text-sm">
                  <span className="text-mauve/60">No stores yet. </span>
                  <Link to="/stores/new" className="text-plum hover:underline">
                    Add a store first
                  </Link>
                </div>
              ) : (
                <select
                  id="store"
                  value={selectedStoreId}
                  onChange={(e) => handleStoreChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum"
                >
                  <option value="">Select a store...</option>
                  {stores.map((store) => (
                    <option key={store._id} value={store._id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedStoreId && storeSections.length > 0 && (
              <div>
                <label
                  htmlFor="section"
                  className="block text-sm text-mauve mb-2"
                >
                  Section
                </label>
                <select
                  id="section"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum"
                >
                  <option value="">Select a section...</option>
                  {storeSections
                    .sort((a, b) => a.order - b.order)
                    .map((section) => (
                      <option key={section.name} value={section.name}>
                        {section.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-plum mb-2"
          >
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes about this ingredient..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50 resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Link
            to="/ingredients"
            className="px-6 py-3 border border-blush/50 text-mauve rounded-xl hover:bg-white/60 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 px-6 py-3 bg-plum text-white rounded-xl hover:bg-plum/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Adding..." : "Add Ingredient"}
          </button>
        </div>
      </form>
    </div>
  );
}
