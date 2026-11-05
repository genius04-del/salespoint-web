import { redirect } from "next/navigation";

// Recipes now have their own page in the sidebar.
export default function RecipesMoved() {
  redirect("/dashboard/recipes");
}
