import type { Metadata } from "next";
import CategoryPage from "@/app/category-page";

export const metadata: Metadata = {
  title: "Roatan Hotels | RoatanIsland.life",
  description: "Browse Roatan hotels, stays, and lodging options.",
};

export default function HotelsPage() {
  return (
    <CategoryPage
      category="Hotels"
      title="Roatan hotels and stays"
      description="Find places to stay around Roatan, from island hotels to local lodging options."
    />
  );
}
