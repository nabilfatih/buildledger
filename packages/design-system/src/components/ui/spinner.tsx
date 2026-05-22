import { Loading03Icon } from "@hugeicons/core-free-icons";
import type React from "react";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { cn } from "@repo/design-system/lib/utils";

type SpinnerProps = Omit<React.ComponentProps<typeof HugeIcons>, "icon">;

/** Shows the shared loading indicator. */
export function Spinner({
  className,
  ...props
}: SpinnerProps): React.ReactElement {
  return (
    <HugeIcons
      aria-label="Loading"
      className={cn("animate-spin", className)}
      icon={Loading03Icon}
      role="status"
      {...props}
    />
  );
}
