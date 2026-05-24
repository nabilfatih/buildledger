import { Calendar03Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import {
  Popover,
  PopoverPopup,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

import {
  kindFilters,
  severityFilters,
  statusFilters,
} from "@/components/ledger/options";
import {
  formatDateInput,
  formatDisplayDate,
  parseDateInput,
} from "@/lib/dates";

/** Renders the ledger filter controls without adding horizontal overflow. */
export function LedgerFilters({
  endDate,
  kind,
  owner,
  search,
  setEndDate,
  setKind,
  setOwner,
  setSearch,
  setSeverity,
  setSource,
  setStartDate,
  setStatus,
  severity,
  source,
  startDate,
  status,
}: {
  readonly endDate: string;
  readonly kind: string;
  readonly owner: string;
  readonly search: string;
  readonly setEndDate: (value: string) => void;
  readonly setKind: (value: string) => void;
  readonly setOwner: (value: string) => void;
  readonly setSearch: (value: string) => void;
  readonly setSeverity: (value: string) => void;
  readonly setSource: (value: string) => void;
  readonly setStartDate: (value: string) => void;
  readonly setStatus: (value: string) => void;
  readonly severity: string;
  readonly source: string;
  readonly startDate: string;
  readonly status: string;
}) {
  return (
    <Fieldset className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <FieldsetLegend className="sr-only">Ledger Filters</FieldsetLegend>
      <Field className="min-w-0 xl:col-span-2">
        <FieldLabel>Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Description or source"
            type="search"
            value={search}
          />
          <InputGroupAddon>
            <InputGroupText>
              <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <FilterSelect
        label="Type"
        onChange={setKind}
        options={kindFilters}
        value={kind}
      />
      <FilterSelect
        label="Status"
        onChange={setStatus}
        options={statusFilters}
        value={status}
      />
      <FilterSelect
        label="Severity"
        onChange={setSeverity}
        options={severityFilters}
        value={severity}
      />
      <Field className="min-w-0">
        <FieldLabel>Owner</FieldLabel>
        <Input
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Owner"
          type="text"
          value={owner}
        />
      </Field>
      <Field className="min-w-0">
        <FieldLabel>Source Meeting</FieldLabel>
        <Input
          onChange={(event) => setSource(event.target.value)}
          placeholder="Meeting title"
          type="text"
          value={source}
        />
      </Field>
      <DateFilter label="From" onChange={setStartDate} value={startDate} />
      <DateFilter label="To" onChange={setEndDate} value={endDate} />
    </Fieldset>
  );
}

/** Shows a COSS select filter bound to a string value. */
function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly value: string;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={options}
        itemToStringValue={(item) => item.value}
        onValueChange={(item) => {
          if (!item) {
            return;
          }

          onChange(item.value);
        }}
        value={selected}
      >
        <SelectTrigger>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectPopup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}

/** Provides a COSS calendar-backed date filter instead of a native date popup. */
function DateFilter({
  label,
  onChange,
  value,
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  return (
    <Field className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              className="w-full justify-between"
              type="button"
              variant="outline"
            />
          }
        >
          <span>{value ? formatDisplayDate(value) : "Any Date"}</span>
          <HugeIcons icon={Calendar03Icon} />
        </PopoverTrigger>
        <PopoverPopup align="start">
          <Calendar
            mode="single"
            onSelect={(date) => onChange(date ? formatDateInput(date) : "")}
            selected={parseDateInput(value)}
          />
        </PopoverPopup>
      </Popover>
      <FieldDescription className="sr-only">
        Filters ledger rows by meeting date.
      </FieldDescription>
    </Field>
  );
}
