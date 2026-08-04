import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("cook", "routes/cook.tsx"),
  route("meals/add", "routes/meals/add.tsx"),
  route("meals/:id/edit", "routes/meals/edit.tsx"),
  route("meals/:id/cook", "routes/meals/cook.tsx"),
  route("meals", "routes/meals/layout.tsx", [
    index("routes/meals/index.tsx"),
    route(":id", "routes/meals/details.tsx"),
  ]),
  route("meal-plan", "routes/meal-plan.tsx"),
  route("shopping-list", "routes/shopping-list.tsx"),
  route("friends", "routes/friends.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;
