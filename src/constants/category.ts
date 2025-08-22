export type Category =
  | "blog"
  | "codes"
  | "guides"
  | "resources"
  | "reference"
  | "sdk"
  | "legacy";

export const categories: Category[] = [
  "blog",
  "codes",
  "guides",
  "resources",
  "reference",
  "sdk",
  "legacy",
] as const;

export function isCategory(value: string): value is Category {
  return categories.includes(value as Category);
}
