/** Normalizes optional free-text fields before storage. */
export function optionalText(value: string | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : undefined;
}
