import { Search01Icon } from "@hugeicons/core-free-icons";
import { Field, FieldLabel } from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

import { documentStatusOptions } from "@/components/documents/options";

export function DocumentFilters({
  search,
  setSearch,
  setStatus,
  status,
}: {
  readonly search: string;
  readonly setSearch: (value: string) => void;
  readonly setStatus: (value: string) => void;
  readonly status: string;
}) {
  const selectedStatus =
    documentStatusOptions.find((option) => option.value === status) ??
    documentStatusOptions[0];

  return (
    <Fieldset className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)]">
      <FieldsetLegend className="sr-only">Document Filters</FieldsetLegend>
      <Field>
        <FieldLabel>Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Document name or status"
            type="text"
            value={search}
          />
          <InputGroupAddon>
            <InputGroupText>
              <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel>Status</FieldLabel>
        <Select
          items={documentStatusOptions}
          itemToStringValue={(item) => item.label}
          onValueChange={(item) => {
            if (!item) {
              return;
            }

            setStatus(item.value);
          }}
          value={selectedStatus}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectPopup>
            {documentStatusOptions.map((option) => (
              <SelectItem key={option.value} value={option}>
                {option.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>
    </Fieldset>
  );
}
