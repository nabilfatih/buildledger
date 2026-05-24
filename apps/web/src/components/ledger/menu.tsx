import { TableColumnsSplitIcon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuTrigger,
} from "@repo/design-system/components/ui/menu";

import type { LedgerTable } from "@/components/ledger/types";

/** Toggles optional table columns from one compact COSS menu. */
export function ColumnMenu({ table }: { readonly table: LedgerTable }) {
  const optionalColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.id !== "select" && column.id !== "kind" && column.id !== "title"
    );

  return (
    <Menu>
      <MenuTrigger
        render={<Button size="sm" type="button" variant="outline" />}
      >
        <HugeIcons icon={TableColumnsSplitIcon} /> Columns
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuGroup>
          <MenuGroupLabel>Visible Columns</MenuGroupLabel>
          {optionalColumns.map((column) => (
            <MenuCheckboxItem
              checked={column.getIsVisible()}
              key={column.id}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {typeof column.columnDef.header === "string"
                ? column.columnDef.header
                : column.id}
            </MenuCheckboxItem>
          ))}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
