import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function meta() {
  return [
    { title: "My Ingredients - Emille" },
    { name: "description", content: "View and manage your ingredients" },
  ];
}

export default function IngredientsPage() {
  const ingredients = useQuery(api.ingredients.list);

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
          <h1 className="text-3xl font-bold text-plum">My Ingredients</h1>
        </div>
        <Link
          to="/ingredients/new"
          className="px-4 py-2 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
        >
          Add ingredient
        </Link>
      </div>

      {ingredients === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading ingredients...</p>
        </div>
      ) : ingredients.length === 0 ? (
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
              d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 6h.008v.008H6V6z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-plum mb-2">
            No ingredients yet
          </h2>
          <p className="text-mauve mb-6">Add your first ingredient to get started!</p>
          <Link
            to="/ingredients/new"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Add your first ingredient
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {ingredients.map((ingredient) => (
            <div
              key={ingredient._id}
              className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50 hover:border-plum/30 hover:bg-white/80 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-plum">
                    {ingredient.name}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-mauve mt-1">
                    {ingredient.store && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
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
                        {ingredient.store.name}
                        {ingredient.storeSectionName && (
                          <span className="text-mauve/60">
                            • {ingredient.storeSectionName}
                          </span>
                        )}
                      </span>
                    )}
                    {ingredient.defaultQuantityType && (
                      <span className="px-2 py-0.5 bg-peach/30 rounded text-plum text-xs">
                        {ingredient.defaultQuantityType}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      {ingredient.usedInCount} {ingredient.usedInCount === 1 ? "recipe" : "recipes"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
