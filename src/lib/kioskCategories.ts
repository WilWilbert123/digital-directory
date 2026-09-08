// Shared category group definitions for the KIOSK home screen

export type CategoryGroup = {
  id: string;
  label: string;
  /** Keywords used to match DB categoryName to this group (case-insensitive includes) */
  keywords: string[];
  /** Fallback card color if no matching DB category has a colorHex */
  defaultColor: string;
  /** Path to the decorative card image in /public/kiosk/ */
  image: string;
};

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "food",
    label: "Food",
    keywords: [
      "casual dining", "food court", "food hall", "novelty food",
      "pastries", "desserts", "beverages", "quick service",
      "dining", "restaurant", "cafe", "bakery", "food",
    ],
    defaultColor: "#c8e600",
    image: "/kiosk/food-card.jpg",
  },
  {
    id: "fashion",
    label: "Fashion",
    keywords: ["fashion", "apparel", "clothing", "shoes", "bags", "accessories", "wear", "boutique"],
    defaultColor: "#c8e600",
    image: "/kiosk/fashion-card.jpg",
  },
  {
    id: "electronics",
    label: "Consumer Electronics",
    keywords: ["electronics", "gadgets", "technology", "computer", "mobile", "appliance", "digital"],
    defaultColor: "#c8e600",
    image: "/kiosk/electronics-card.jpg",
  },
  {
    id: "services",
    label: "Services",
    keywords: ["services", "bank", "salon", "spa", "healthcare", "clinic", "financial", "travel", "service"],
    defaultColor: "#c8e600",
    image: "/kiosk/services-card.jpg",
  },
  {
    id: "essentials",
    label: "Essentials & Novelties",
    keywords: [
      "essentials", "supermarket", "pharmacy", "books", "gifts",
      "novelties", "grocery", "novelty", "stationery", "hardware",
    ],
    defaultColor: "#c8e600",
    image: "/kiosk/essentials-card.jpg",
  },
];

/** Match a DB categoryName to one of the 5 category groups */
export function getCategoryGroupId(categoryName: string): string | null {
  const lower = categoryName.toLowerCase();
  for (const g of CATEGORY_GROUPS) {
    if (g.keywords.some((k) => lower.includes(k))) return g.id;
  }
  return null;
}

/** Filter DB categories that belong to a given group */
export function getCategoriesForGroup<T extends { categoryName: string }>(
  groupId: string,
  categories: T[]
): T[] {
  const group = CATEGORY_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  return categories.filter((c) => {
    const lower = c.categoryName.toLowerCase();
    return group.keywords.some((k) => lower.includes(k));
  });
}
