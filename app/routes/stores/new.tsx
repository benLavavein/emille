import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function meta() {
  return [
    { title: "New Grocery Store - Emille" },
    { name: "description", content: "Add a new grocery store" },
  ];
}

type Section = {
  name: string;
  order: number;
};

export default function NewStorePage() {
  const navigate = useNavigate();
  const createStore = useMutation(api.groceryStores.create);

  const [name, setName] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addSection = () => {
    if (!newSectionName.trim()) return;

    // Check for duplicate
    if (sections.some((s) => s.name.toLowerCase() === newSectionName.trim().toLowerCase())) {
      return;
    }

    setSections((prev) => [
      ...prev,
      { name: newSectionName.trim(), order: prev.length + 1 },
    ]);
    setNewSectionName("");
  };

  const removeSection = (index: number) => {
    setSections((prev) => {
      const newSections = prev.filter((_, i) => i !== index);
      // Reorder remaining sections
      return newSections.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  // Drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setSections((prev) => {
      const newSections = [...prev];
      const [dragged] = newSections.splice(draggedIndex, 1);
      newSections.splice(index, 0, dragged);
      // Update order numbers
      return newSections.map((s, i) => ({ ...s, order: i + 1 }));
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      await createStore({
        name: name.trim(),
        sections,
      });
      navigate("/stores");
    } catch (error) {
      console.error("Failed to create store:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/stores"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to stores
        </Link>
        <h1 className="text-3xl font-bold text-plum">Add New Store</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-plum mb-2"
          >
            Store Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Costco, Trader Joe's, Whole Foods"
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            required
          />
        </div>

        {/* Sections */}
        <div>
          <label className="block text-sm font-medium text-plum mb-2">
            Store Sections
          </label>
          <p className="text-sm text-mauve/60 mb-4">
            Add sections in the order you typically shop them. Drag to reorder.
          </p>

          {/* Sections List */}
          {sections.length > 0 && (
            <div className="space-y-2 mb-4">
              {sections.map((section, index) => (
                <div
                  key={`${section.name}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-white/80 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                    draggedIndex === index
                      ? "border-plum/50 shadow-lg opacity-50"
                      : "border-blush/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-mauve">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                    <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>

                  <span className="flex-1 text-plum font-medium">
                    {section.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="p-1 text-mauve hover:text-plum hover:bg-blush/30 rounded transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Section Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSection();
                }
              }}
              placeholder="e.g., Produce, Dairy, Frozen..."
              className="flex-1 px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
            />
            <button
              type="button"
              onClick={addSection}
              className="px-4 py-3 bg-peach/50 text-plum rounded-xl hover:bg-peach/70 transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Link
            to="/stores"
            className="px-6 py-3 border border-blush/50 text-mauve rounded-xl hover:bg-white/60 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex-1 px-6 py-3 bg-plum text-white rounded-xl hover:bg-plum/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Store"}
          </button>
        </div>
      </form>
    </div>
  );
}
