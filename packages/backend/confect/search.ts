/** Builds one normalized text field for Convex full-text search indexes. */
export function searchText(parts: readonly (string | undefined)[]) {
  return parts
    .flatMap((part) => {
      const text = part?.trim();
      return text ? [text] : [];
    })
    .join(" ");
}
