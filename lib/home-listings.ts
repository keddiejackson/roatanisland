export type HomeListing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url?: string | null;
  category: string | null;
  is_active?: boolean | null;
  is_featured: boolean | null;
  rating: number | null;
  reviews_count?: number | null;
  tour_times: string[] | null;
};

export type HomeListingFilters = {
  search: string;
  category: string;
  location: string;
  maxPrice: string;
  minimumRating: string;
  sortBy: string;
};

export const homeListingFilterDefaults: HomeListingFilters = {
  search: "",
  category: "All",
  location: "All",
  maxPrice: "",
  minimumRating: "All",
  sortBy: "Featured",
};

export function filterHomeListings<Listing extends HomeListing>(
  listings: Listing[],
  filters: HomeListingFilters,
) {
  const priceLimit = filters.maxPrice ? Number(filters.maxPrice) : null;
  const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(Boolean);

  return listings
    .filter((listing) => {
      const searchBlob = [
        listing.title,
        listing.location || "",
        listing.description || "",
        ...(listing.tour_times || []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchTerms.every((term) => searchBlob.includes(term)) &&
        (filters.category === "All" || listing.category === filters.category) &&
        (filters.location === "All" || listing.location === filters.location) &&
        (!priceLimit || !listing.price || listing.price <= priceLimit) &&
        (filters.minimumRating === "All" ||
          (listing.rating ?? 5) >= Number(filters.minimumRating))
      );
    })
    .sort((first, second) => {
      if (filters.sortBy === "Price low") {
        return (first.price || 0) - (second.price || 0);
      }

      if (filters.sortBy === "Price high") {
        return (second.price || 0) - (first.price || 0);
      }

      if (filters.sortBy === "Rating") {
        return (second.rating || 5) - (first.rating || 5);
      }

      if (Boolean(first.is_featured) === Boolean(second.is_featured)) {
        return (second.rating || 5) - (first.rating || 5);
      }

      return first.is_featured ? -1 : 1;
    });
}

export function selectHomeSpotlightListings<Listing extends HomeListing>(
  listings: Listing[],
  visibleListings: Listing[],
) {
  const featured = listings.filter((listing) => listing.is_featured).slice(0, 3);
  return featured.length > 0 ? featured : visibleListings.slice(0, 3);
}
