import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Search } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";

export function meta() {
  return [
    { title: "My Meals - Emille" },
    { name: "description", content: "View and manage your meals" },
  ];
}

export default function MealsPage() {
  const meals = useQuery(api.meals.list);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMeals = useMemo(() => {
    if (!meals) return [];
    if (!searchQuery.trim()) return meals;
    
    const query = searchQuery.toLowerCase();
    return meals.filter((meal) => {
      // Search by name
      if (meal.name.toLowerCase().includes(query)) return true;
      // Search by tags
      if (meal.tags?.some((tag: any) => tag.name.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [meals, searchQuery]);

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
          <h1 className="text-3xl font-bold text-plum">My Meals</h1>
        </div>
        <Link
          to="/meals/add"
          className="px-4 py-2 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
        >
          Add a meal
        </Link>
      </div>

      {/* Search Bar */}
      {meals && meals.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mauve/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meals by name or tag..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
          />
        </div>
      )}

      {meals === undefined ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading meals...</p>
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <svg className="w-16 h-16 mx-auto text-blush mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h2 className="text-xl font-semibold text-plum mb-2">No meals yet</h2>
          <p className="text-mauve mb-6">Create your first meal to get started!</p>
          <Link
            to="/meals/add"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium"
          >
            Add your first meal
          </Link>
        </div>
      ) : filteredMeals.length === 0 && searchQuery.trim() ? (
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <Search className="w-12 h-12 mx-auto text-blush mb-4" />
          <h2 className="text-xl font-semibold text-plum mb-2">No meals found</h2>
          <p className="text-mauve">No meals match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMeals.map((meal) => (
            <Link
              key={meal._id}
              to={`/meals/${meal._id}`}
              className="flex items-center justify-between p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50 hover:border-plum/30 hover:bg-white/80 transition-all"
            >
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-plum">{meal.name}</h2>
                {meal.tags && meal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {meal.tags.map((tag: any) => (
                    <span
                      key={tag._id}
                      className="px-2 py-0.5 bg-peach/40 text-plum text-xs rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-mauve">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  </svg>
                  {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  {meal.steps.length} step{meal.steps.length !== 1 ? 's' : ''}
                </span>
              </div>
              </div>
              
              

              <div className="flex items-end gap-1.5">
                  {MEAL_TIMES.map((time, index) => {
                    const Icon = MEAL_TIME_ICONS[time];
                    const isActive = meal.mealTimes?.includes(time);
                    // Arc effect: middle icon higher, outer icons lower
                    const arcOffset = index === 1 ? "-translate-y-2" : "translate-y-0";
                    return (
                      <Tooltip key={time}>
                        <TooltipTrigger asChild>
                          <span className={arcOffset}>
                            <Icon
                              className={`size-8 transition-colors ${
                                isActive ? "text-plum" : "text-plum/20"
                              }`}
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span className="capitalize">{time}</span>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
