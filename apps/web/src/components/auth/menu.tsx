import { Logout03Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from "@repo/design-system/components/ui/menu";
import {
  SidebarMenuButton,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { Effect } from "effect";

import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/errors";
import { getPublicAuthRequired } from "@/lib/public-config";

/** Lets authenticated deployments inspect and end the active session. */
export function AuthMenu() {
  const { isMobile } = useSidebar();
  const session = authClient.useSession();

  if (!getPublicAuthRequired()) {
    return null;
  }

  return (
    <Menu>
      <MenuTrigger render={<SidebarMenuButton size="sm" type="button" />}>
        <HugeIcons icon={UserIcon} />
        <span>{session.data?.user?.email ?? "Account"}</span>
      </MenuTrigger>
      <MenuPopup align="start" side={isMobile ? "bottom" : "right"}>
        <MenuGroup>
          <MenuGroupLabel>
            {session.data?.user?.email ?? "Account"}
          </MenuGroupLabel>
          <MenuItem onClick={handleSignOut}>
            <HugeIcons icon={Logout03Icon} />
            Sign Out
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function handleSignOut() {
  return Effect.runPromise(
    Effect.tryPromise({
      try: () => authClient.signOut(),
      catch: getErrorMessage,
    }).pipe(
      Effect.match({
        onFailure: (description) =>
          toastManager.add({
            title: "Sign out failed",
            description,
            type: "error",
          }),
        onSuccess: () =>
          toastManager.add({
            title: "Signed out",
            description: "The session has ended.",
            type: "success",
          }),
      })
    )
  );
}
