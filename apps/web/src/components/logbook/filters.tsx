import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { Field, FieldLabel } from "@repo/design-system/components/ui/field";
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
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";

import { eventFilters } from "@/components/logbook/options";

/** Renders logbook filters with the same COSS control language as the ledger. */
export function LogbookFilters({
  eventType,
  responsible,
  search,
  setEventType,
  setResponsible,
  setSearch,
  setTrade,
  trade,
}: {
  readonly eventType: string;
  readonly responsible: string;
  readonly search: string;
  readonly setEventType: (value: string) => void;
  readonly setResponsible: (value: string) => void;
  readonly setSearch: (value: string) => void;
  readonly setTrade: (value: string) => void;
  readonly trade: string;
}) {
  return (
    <Fieldset className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <FieldsetLegend className="sr-only">Logbook Filters</FieldsetLegend>
      <Field className="min-w-0 xl:col-span-2">
        <FieldLabel>Search</FieldLabel>
        <InputGroup>
          <InputGroupInput
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Event, object, trade, or responsible"
            type="text"
            value={search}
          />
          <InputGroupAddon>
            <InputGroupText>
              <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
            </InputGroupText>
          </InputGroupAddon>
          {search ? (
            <InputGroupAddon align="inline-end">
              <Button
                aria-label="Clear logbook search"
                onClick={() => setSearch("")}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <HugeIcons icon={Cancel01Icon} />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Field>
      <EventFilter onChange={setEventType} value={eventType} />
      <Field className="min-w-0">
        <FieldLabel>Trade</FieldLabel>
        <Input
          onChange={(event) => setTrade(event.target.value)}
          placeholder="Trade"
          type="text"
          value={trade}
        />
      </Field>
      <Field className="min-w-0 md:col-span-2 xl:col-span-1">
        <FieldLabel>Responsible</FieldLabel>
        <Input
          onChange={(event) => setResponsible(event.target.value)}
          placeholder="Responsible party"
          type="text"
          value={responsible}
        />
      </Field>
    </Fieldset>
  );
}

/** Shows a COSS select for logbook event filtering. */
function EventFilter({
  onChange,
  value,
}: {
  readonly onChange: (value: string) => void;
  readonly value: string;
}) {
  const selected =
    eventFilters.find((option) => option.value === value) ?? null;

  return (
    <Field className="min-w-0">
      <FieldLabel>Event</FieldLabel>
      <Select
        items={eventFilters}
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
          <SelectValue placeholder="Event" />
        </SelectTrigger>
        <SelectPopup>
          {eventFilters.map((option) => (
            <SelectItem key={option.value} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </Field>
  );
}
