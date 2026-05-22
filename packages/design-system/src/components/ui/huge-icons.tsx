import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

import { cn } from "@repo/design-system/lib/utils";

/** Renders Hugeicons with the shared design-system defaults. */
export function HugeIcons({
  className,
  strokeWidth = 2,
  ...props
}: ComponentProps<typeof HugeiconsIcon>) {
  return (
    <HugeiconsIcon
      className={cn("shrink-0", className)}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
