export const themeStorageKey = "buildledger-theme";

export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

/** Reads the saved app theme preference from browser storage. */
export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  const storedPreference = window.localStorage.getItem(themeStorageKey);

  switch (storedPreference) {
    case "dark":
    case "light":
    case "system":
      return storedPreference;
    default:
      return "system";
  }
}

/** Resolves a theme preference to the concrete light or dark theme. */
export function resolveThemePreference(preference: ThemePreference) {
  if (preference !== "system") {
    return preference;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Applies the concrete theme class used by shadcn/COSS token theming. */
export function applyThemePreference(preference: ThemePreference) {
  document.documentElement.classList.toggle(
    "dark",
    resolveThemePreference(preference) === "dark"
  );
}
