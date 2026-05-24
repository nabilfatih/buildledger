import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { useColorScheme, useLocalStorage } from "@mantine/hooks";
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
import {
  SidebarMenuButton,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { useEffect } from "react";

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
    getInitialValueInEffect: true,
    key: themeStorageKey,
    serialize: (value) => value,
  });
  const systemTheme = useColorScheme("light");
  const activeThemePreference = parseThemePreference(themePreference);

  useEffect(() => {
    applyThemePreference(
      resolveThemePreference(activeThemePreference, systemTheme)
    );
  }, [activeThemePreference, systemTheme]);

  return (
    <Menu>
      <MenuTrigger render={<SidebarMenuButton size="sm" type="button" />}>
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
                {option.value === "system" ? (
                  <HugeIcons icon={ComputerIcon} />
                ) : null}
                {option.value === "light" ? (
                  <HugeIcons icon={Sun03Icon} />
                ) : null}
                {option.value === "dark" ? (
                  <HugeIcons icon={Moon02Icon} />
                ) : null}
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
