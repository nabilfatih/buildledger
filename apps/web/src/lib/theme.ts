export const themeStorageKey = "buildledger-theme";

export const themePreferences = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof themePreferences)[number];

/** Parses persisted theme values into the app's supported theme preferences. */
export function parseThemePreference(value: string | undefined) {
  switch (value) {
    case "dark":
      return "dark";
    case "light":
      return "light";
    case "system":
      return "system";
    default:
      return "system";
  }
}

/** Resolves a theme preference to the concrete light or dark theme. */
export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: "dark" | "light"
) {
  if (preference !== "system") {
    return preference;
  }

  return systemTheme;
}

/** Applies the concrete theme class used by shadcn/COSS token theming. */
export function applyThemePreference(theme: "dark" | "light") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
