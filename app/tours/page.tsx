import type { Metadata } from "next";
import CategoryPage from "@/app/category-page";

export const metadata: Metadata = {
  title: "Roatan Tours | RoatanIsland.life",
  description: "Browse Roatan tours, excursions, snorkeling, cruises, and island experiences.",
};

export default function ToursPage() {
  return (
    <CategoryPage
      category="Tours"
      title="Roatan tours and experiences"
      description="Browse local tours, water activities, island trips, and memorable things to do around Roatan."
    />
  );
}
