/** Returns a non-null value or fails the test with a clear message. */
export function expectDefined<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("Expected value to be defined");
  }

  return value;
}
