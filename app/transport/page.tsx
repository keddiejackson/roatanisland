import type { Metadata } from "next";
import CategoryPage from "@/app/category-page";

export const metadata: Metadata = {
  title: "Roatan Transport | RoatanIsland.life",
  description: "Browse Roatan transport, shuttles, taxis, and transfer options.",
};

export default function TransportPage() {
  return (
    <CategoryPage
      category="Transport"
      title="Roatan transport and transfers"
      description="Find airport transfers, shuttles, taxis, and transport options for getting around Roatan."
    />
  );
}
