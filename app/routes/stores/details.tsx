import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useSetBackUrl } from "~/lib/back-button";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Trash2 } from "lucide-react";

export function meta() {
  return [
    { title: "Store Details - Emille" },
    { name: "description", content: "View store details and sections" },
  ];
}

export default function StoreDetailsPage() {
  useSetBackUrl("/stores");
  const params = useParams();
  const navigate = useNavigate();
  const storeId = params.id as string;

  const store = useQuery(api.groceryStores.get, {
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

  if (store === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading store...</p>
        </div>
      </div>
    );
  }

  if (store === null) {
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

  const { sections } = store;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/stores"
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          &larr; Back to stores
        </Link>

        <div className="flex items-start justify-between">
          <h1 className="text-3xl font-bold text-plum">{store.name}</h1>
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

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.name}
            className="bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-plum">{section.name}</h3>
              <span className="text-sm text-mauve/70">
                Stop #{section.order}
              </span>
            </div>
          </div>
        ))}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            No sections yet
          </h2>
          <p className="text-mauve mb-4">
            Add sections to organize your store by aisle
          </p>
        </div>
      )}
    </div>
  );
}
