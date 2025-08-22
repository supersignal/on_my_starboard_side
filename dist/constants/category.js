export const categories = [
    "blog",
    "codes",
    "guides",
    "resources",
    "reference",
    "sdk",
    "legacy",
];
export function isCategory(value) {
    return categories.includes(value);
}
