import type { Route } from "./+types/home";
import { SignedIn, SignedOut } from "@clerk/react-router";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import { ShoppingCart, Calendar } from "lucide-react";
import { MEAL_TIMES, MEAL_TIME_ICONS } from "~/lib/constants/meals";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Emille - Your Meal Helper" },
    { name: "description", content: "Plan meals, manage ingredients, and organize your grocery shopping" },
  ];
}

function FeatureCard({
  title,
  description,
  icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: "plum" | "mauve" | "peach";
}) {
  const colorClasses = {
    plum: "bg-plum/10 border-plum/30 hover:bg-plum/20 hover:border-plum/50",
    mauve: "bg-mauve/10 border-mauve/30 hover:bg-mauve/20 hover:border-mauve/50",
    peach: "bg-peach/30 border-peach/50 hover:bg-peach/50 hover:border-peach/70",
  };

  const iconColorClasses = {
    plum: "text-plum",
    mauve: "text-mauve",
    peach: "text-plum",
  };

  return (
    <Link
      to={href}
      className={`block p-6 rounded-2xl border-2 transition-all duration-200 ${colorClasses[color]}`}
    >
      <div className={`mb-4 ${iconColorClasses[color]}`}>{icon}</div>
      <h3 className="text-xl font-semibold text-plum mb-2">{title}</h3>
      <p className="text-mauve">{description}</p>
    </Link>
  );
}

function HomeDashboard() {
  const activeMealPlan = useQuery(api.mealPlans.getActive);

  return (
    <>
      {/* Active Meal Plan Card */}
      {activeMealPlan && (
        <div className="mb-8">
          <Link
            to={`/meal-plans/${activeMealPlan._id}`}
            className="block bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-plum/30 hover:border-plum/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-plum" />
              <h2 className="text-lg font-semibold text-plum">
                Your Meal Plan
              </h2>
              <span className="px-2 py-0.5 bg-peach text-plum text-xs rounded-full font-medium">
                Active
              </span>
            </div>
            <p className="text-mauve mb-4">{activeMealPlan.name}</p>
            <div className="space-y-2">
              {activeMealPlan.meals.slice(0, 4).map((meal: any) => (
                <div
                  key={meal._id}
                  className="flex items-center justify-between p-3 bg-blush/20 rounded-lg"
                >
                  <span className="font-medium text-plum">{meal.name}</span>
                  <div className="flex items-end gap-1">
                    {MEAL_TIMES.map(
                      (time, index) => {
                        const Icon = MEAL_TIME_ICONS[time];
                        const isActive = meal.mealTimes?.includes(time);
                        const arcOffset =
                          index === 1 ? "-translate-y-0.5" : "translate-y-0";
                        return (
                          <Tooltip key={time}>
                            <TooltipTrigger asChild>
                              <span className={arcOffset}>
                                <Icon
                                  className={`size-4 transition-colors ${
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
                      }
                    )}
                  </div>
                </div>
              ))}
              {activeMealPlan.meals.length > 4 && (
                <p className="text-sm text-mauve text-center pt-1">
                  +{activeMealPlan.meals.length - 4} more meals
                </p>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link
          to="/shopping-list"
          className="flex items-center gap-3 p-4 bg-peach/40 rounded-xl border border-peach/60 hover:bg-peach/60 transition-all"
        >
          <ShoppingCart className="w-6 h-6 text-plum" />
          <span className="font-medium text-plum">Shopping List</span>
        </Link>
        <Link
          to="/meal-plans"
          className="flex items-center gap-3 p-4 bg-plum/10 rounded-xl border border-plum/30 hover:bg-plum/20 transition-all"
        >
          <Calendar className="w-6 h-6 text-plum" />
          <span className="font-medium text-plum">Meal Plans</span>
        </Link>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <FeatureCard
          title="Meals"
          description="Create and organize your favorite recipes with ingredients and step-by-step instructions."
          href="/meals"
          color="plum"
          icon={
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          }
        />
        <FeatureCard
          title="Ingredients"
          description="Keep track of all your ingredients and organize them by grocery store sections."
          href="/ingredients"
          color="mauve"
          icon={
            <svg
              className="w-10 h-10"
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
          }
        />
        <FeatureCard
          title="Grocery Stores"
          description="Set up your stores with aisles in your preferred shopping order."
          href="/stores"
          color="peach"
          icon={
            <svg
              className="w-10 h-10"
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
          }
        />
      </div>

      {/* Getting Started */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-blush/50">
        <h2 className="text-lg font-semibold text-plum mb-4">Getting Started</h2>
        <ul className="space-y-3 text-mauve">
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              1
            </span>
            Add your favorite ingredients
          </li>
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              2
            </span>
            Create meals with recipes
          </li>
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              3
            </span>
            Set up your grocery stores for easy shopping lists
          </li>
        </ul>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <p className="text-xl text-mauve max-w-2xl mx-auto">
          Your personal meal planning companion. Create recipes, track ingredients, 
          and make grocery shopping a breeze.
        </p>
      </div>

      <SignedIn>
        <HomeDashboard />
      </SignedIn>

      <SignedOut>
        {/* Signed out view */}
        <div className="text-center">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-blush/50 max-w-md mx-auto">
            <p className="text-mauve mb-6">
              Sign in to start planning your meals and organizing your kitchen.
            </p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-plum/10 border border-plum/20">
                  <svg className="w-8 h-8 mx-auto text-plum mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <span className="text-sm text-plum font-medium">Recipes</span>
                </div>
                <div className="p-4 rounded-xl bg-mauve/10 border border-mauve/20">
                  <svg className="w-8 h-8 mx-auto text-mauve mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
                  </svg>
                  <span className="text-sm text-mauve font-medium">Ingredients</span>
                </div>
                <div className="p-4 rounded-xl bg-peach/30 border border-peach/50">
                  <svg className="w-8 h-8 mx-auto text-plum mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  <span className="text-sm text-plum font-medium">Shopping</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
