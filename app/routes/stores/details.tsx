import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Pencil, Trash2, Package } from "lucide-react";

export function meta() {
  return [
    { title: "Store Details - Emille" },
    { name: "description", content: "View store details and ingredients" },
  ];
}

export default function StoreDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const storeId = params.id as string;

  const storeWithIngredients = useQuery(api.groceryStores.getWithIngredients, {
    id: storeId as any,
  });
  const deleteStore = useMutation(api.groceryStores.remove);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteStore({ id: storeId as any });
      navigate("/stores");
    } catch (error) {
      console.error("Failed to delete store:", error);
    }
  };

  if (storeWithIngredients === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading store...</p>
        </div>
      </div>
    );
  }

  if (storeWithIngredients === null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            Store not found
          </h2>
          <p className="text-mauve mb-6">
            This store doesn't exist or you don't have access to it.
          </p>
          <Link
            to="/stores"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Back to stores
          </Link>
        </div>
      </div>
    );
  }

  const { sections, unassignedIngredients } = storeWithIngredients;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/stores"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to stores
        </Link>

        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-plum">
            {storeWithIngredients.name}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-mauve mt-2">
          {sections.length} section{sections.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
          <p className="text-sm text-destructive mb-3">
            Are you sure you want to delete this store? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Yes, delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Unassigned Ingredients Accordion */}
      {unassignedIngredients.length > 0 && (
        <div className="mb-6">
          <Accordion type="single" collapsible>
            <AccordionItem
              value="unassigned"
              className="bg-mauve/10 rounded-xl border border-mauve/30 px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-mauve" />
                  <span className="text-mauve font-medium">
                    Unassigned ingredients ({unassignedIngredients.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-mauve/70 mb-3">
                  These ingredients are not assigned to this store or don't have
                  a section set.
                </p>
                <div className="space-y-1">
                  {unassignedIngredients.map((ingredient) => (
                    <Link
                      key={ingredient._id}
                      to={`/ingredients`}
                      className="block p-2 rounded-lg hover:bg-white/50 transition-colors"
                    >
                      <span className="text-plum">{ingredient.name}</span>
                      {ingredient.storeId && ingredient.storeId !== storeId && (
                        <span className="ml-2 text-xs text-mauve/70">
                          (different store)
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.name}
            className="bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 overflow-hidden"
          >
            <div className="p-4 border-b border-blush/30 bg-blush/10">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-plum">{section.name}</h3>
                <span className="text-sm text-mauve">
                  {section.ingredients.length} ingredient
                  {section.ingredients.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            {section.ingredients.length === 0 ? (
              <div className="p-4 text-center text-mauve/70 text-sm">
                No ingredients in this section
              </div>
            ) : (
              <div className="divide-y divide-blush/30">
                {section.ingredients.map((ingredient) => (
                  <div
                    key={ingredient._id}
                    className="p-3 hover:bg-white/50 transition-colors"
                  >
                    <span className="text-plum">{ingredient.name}</span>
                    {ingredient.defaultQuantityType && (
                      <span className="ml-2 text-xs text-mauve/70">
                        ({ingredient.defaultQuantityType})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {sections.length === 0 && unassignedIngredients.length === 0 && (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            No sections yet
          </h2>
          <p className="text-mauve mb-4">
            Add sections to organize ingredients by aisle
          </p>
        </div>
      )}
    </div>
  );
}
