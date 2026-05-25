import { ComputerIcon } from "@hugeicons/core-free-icons";
import {
  useColorScheme,
  useIsomorphicEffect,
  useLocalStorage,
} from "@mantine/hooks";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@repo/design-system/components/ui/menu";
import { useSidebar } from "@repo/design-system/components/ui/sidebar";

import {
  applyThemePreference,
  parseThemePreference,
  resolveThemePreference,
  themeStorageKey,
} from "@/lib/theme";

const themeOptions = [
  {
    label: "System",
    value: "system",
  },
  {
    label: "Light",
    value: "light",
  },
  {
    label: "Dark",
    value: "dark",
  },
] as const;

/** Lets users choose the app theme from the sidebar footer. */
export function ThemeMenu() {
  const { isMobile } = useSidebar();
  const [themePreference, setThemePreference] = useLocalStorage({
    defaultValue: "system",
    deserialize: parseThemePreference,
    getInitialValueInEffect: false,
    key: themeStorageKey,
    serialize: (value) => value,
  });
  const systemTheme = useColorScheme("light");
  const activeThemePreference = parseThemePreference(themePreference);

  useIsomorphicEffect(() => {
    applyThemePreference(
      resolveThemePreference(activeThemePreference, systemTheme)
    );
  }, [activeThemePreference, systemTheme]);

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            className="w-full justify-start"
            size="sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <HugeIcons icon={ComputerIcon} />
        <span>Theme</span>
      </MenuTrigger>
      <MenuPopup align="start" side={isMobile ? "bottom" : "right"}>
        <MenuGroup>
          <MenuGroupLabel>Theme</MenuGroupLabel>
          <MenuRadioGroup
            onValueChange={(value) => {
              if (value !== "system" && value !== "light" && value !== "dark") {
                return;
              }

              setThemePreference(value);
            }}
            value={activeThemePreference}
          >
            {themeOptions.map((option) => (
              <MenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
