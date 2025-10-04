/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to slugify
 * @returns A lowercase, hyphenated slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a unique ID from a title, handling collisions with a counter
 * @param title - The title to generate an ID from
 * @param existingIds - Set of existing IDs to check for collisions
 * @returns A unique ID
 */
export function generateUniqueId(title: string, existingIds: Set<string>): string {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let counter = 1;

  while (existingIds.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  existingIds.add(slug);
  return slug;
}
