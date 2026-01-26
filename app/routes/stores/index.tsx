import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function meta() {
  return [
    { title: "My Grocery Stores - Emille" },
    { name: "description", content: "View and manage your grocery stores" },
  ];
}

export default function StoresPage() {
  const stores = useQuery(api.groceryStores.list);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            to="/"
            className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
          >
            ← Back to home
          </Link>
          <h1 className="text-3xl font-bold text-plum">My Grocery Stores</h1>
        </div>
        <Link
          to="/stores/new"
          className="px-4 py-2 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
        >
          Add store
        </Link>
      </div>

      {stores === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading stores...</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <svg
            className="w-16 h-16 mx-auto text-blush mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-plum mb-2">
            No stores yet
          </h2>
          <p className="text-mauve mb-6">
            Add your grocery stores to organize ingredients by aisle!
          </p>
          <Link
            to="/stores/new"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Add your first store
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {stores.map((store) => (
            <div
              key={store._id}
              className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50 hover:border-plum/30 hover:bg-white/80 transition-all"
            >
              <h2 className="text-xl font-semibold text-plum mb-3">
                {store.name}
              </h2>
              {store.sections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {store.sections
                    .sort((a, b) => a.order - b.order)
                    .map((section, index) => (
                      <span
                        key={section.name}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-peach/30 text-plum rounded-full text-sm"
                      >
                        <span className="w-5 h-5 bg-plum/20 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        {section.name}
                      </span>
                    ))}
                </div>
              ) : (
                <p className="text-mauve/60 text-sm">No sections added yet</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
