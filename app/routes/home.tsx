import type { Route } from "./+types/home";
import { Link } from "react-router";
import { HeroGreeting } from "~/components/dashboard/greeting";
import { CookingCard } from "~/components/dashboard/cooking-card";
import { CurrentMealPlan } from "~/components/dashboard/currentMealPlan";
import { BookHeart, ShoppingCart } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Emille - Your Meal Helper" },
    {
      name: "description",
      content:
        "Plan meals, manage ingredients, and organize your grocery shopping",
    },
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
    mauve:
      "bg-mauve/10 border-mauve/30 hover:bg-mauve/20 hover:border-mauve/50",
    peach:
      "bg-peach/30 border-peach/50 hover:bg-peach/50 hover:border-peach/70",
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
      <div className="flex items-center gap-2">
        <div className={`mb-4 ${iconColorClasses[color]}`}>{icon}</div>
        <h3 className="text-xl font-semibold text-plum mb-2">{title}</h3>
      </div>

      <p className="text-mauve">{description}</p>
    </Link>
  );
}

function HomeDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <CookingCard />

      <div className="mb-8">
        <CurrentMealPlan />
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <FeatureCard
          title="Meals"
          description="Create and organize your favorite recipes with ingredients and step-by-step instructions."
          href="/meals"
          color="plum"
          icon={
            <BookHeart
              className="size-10"
              stroke="currentColor"
              strokeWidth={1.5}
            />
          }
        />
        <FeatureCard
          title="Grocery Stores"
          description="Set up your stores with aisles in your preferred shopping order."
          href="/stores"
          color="peach"
          icon={
            <ShoppingCart
              className="size-10"
              stroke="currentColor"
              strokeWidth={1.5}
            />
          }
        />
      </div>

      {/* Getting Started */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-blush/50">
        <h2 className="text-lg font-semibold text-plum mb-4">
          Getting Started
        </h2>
        <ul className="space-y-3 text-mauve">
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              1
            </span>
            Create meals with recipes or import from a URL
          </li>
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              2
            </span>
            Build a meal plan for the week
          </li>
          <li className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-plum/20 text-plum flex items-center justify-center text-sm font-medium">
              3
            </span>
            Generate a shopping list from your meal plan
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <HeroGreeting />

      <HomeDashboard />
    </div>
  );
}
