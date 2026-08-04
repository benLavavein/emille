export const STORE_SECTIONS = [
  { id: "produce", name: "Produce" },
  { id: "bakery", name: "Bakery" },
  { id: "pantry", name: "Grains & pantry" },
  { id: "international", name: "International foods" },
  { id: "deli-prepared", name: "Deli & prepared foods" },
  { id: "meat-seafood", name: "Meat & seafood" },
  { id: "dairy-eggs", name: "Dairy & eggs" },
  { id: "water-soda", name: "Water & soda" },
  { id: "snacks", name: "Snacks" },
  { id: "frozen", name: "Frozen" },
  { id: "household", name: "Household" },
  { id: "health-beauty", name: "Health & beauty" },
  { id: "pharmacy", name: "Pharmacy" },
  { id: "other", name: "Other" },
] as const;

export type StoreSection = (typeof STORE_SECTIONS)[number];

export const CONFIGURABLE_STORE_SECTIONS = STORE_SECTIONS.filter(
  (section) => section.id !== "other",
);

const sectionIds = new Set<string>(STORE_SECTIONS.map((section) => section.id));

export function isStoreSectionId(value: string): boolean {
  return sectionIds.has(value);
}

/** Returns a valid user order, falling back to the catalog order for old layouts. */
export function normalizeStoreLayout(
  layout: Array<{ id: string; name: string }> | undefined,
): StoreSection[] {
  const orderedSections = layout?.filter((section) => section.id !== "other");
  if (
    !orderedSections ||
    orderedSections.length !== CONFIGURABLE_STORE_SECTIONS.length ||
    new Set(orderedSections.map((section) => section.id)).size !== CONFIGURABLE_STORE_SECTIONS.length ||
    orderedSections.some((section) => !isStoreSectionId(section.id))
  ) {
    return [...STORE_SECTIONS];
  }

  return [
    ...orderedSections.map((section) => STORE_SECTIONS.find((item) => item.id === section.id)!),
    STORE_SECTIONS.find((section) => section.id === "other")!,
  ];
}
