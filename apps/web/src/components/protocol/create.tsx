import { useMutation } from "@confect/react";
import {
  Add01Icon,
  Calendar03Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import { Form } from "@repo/design-system/components/ui/form";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
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
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { useForm } from "@tanstack/react-form";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useState } from "react";

import {
  optionalText,
  parseProtocolPeople,
  protocolTypeItems,
  protocolValidationMessages,
  todayDate,
} from "@/components/protocol/utils";
import {
  formatDateInput,
  formatDisplayDate,
  parseDateInput,
} from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";

/** Collects protocol metadata before creating a new draft protocol. */
export function NewProtocolSheet({
  disabled,
  onCreated,
  selectedProjectId,
}: {
  readonly disabled: boolean;
  readonly onCreated: (protocolId: GenericId<"protocols">) => void;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const createDraft = useMutation(refs.public.protocols.createDraft);
  const [isOpen, setIsOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      agenda: "",
      attendees: "",
      date: todayDate(),
      distribution: "",
      location: "",
      number: "",
      title: "",
      type: protocolTypeItems[0].value,
    },
    onSubmit: ({ value }) => {
      if (!selectedProjectId) {
        return;
      }

      return Effect.runPromise(
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise({
            try: () =>
              createDraft({
                projectId: selectedProjectId,
                title: value.title.trim(),
                protocolNumber: value.number.trim(),
                protocolType: value.type,
                protocolDate: value.date,
                agenda: optionalText(value.agenda),
                attendees: parseProtocolPeople(value.attendees),
                distribution: parseProtocolPeople(value.distribution),
                location: optionalText(value.location),
              }),
            catch: getErrorMessage,
          });
          const protocolId = yield* Either.match(result, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: Effect.succeed,
          });

          yield* Effect.sync(() => {
            onCreated(protocolId);
            setIsOpen(false);
            form.reset(defaultProtocolFormValues());
            toastManager.add({
              title: "Protocol created",
              description: "Add sources, then generate the protocol.",
              type: "success",
            });
          });
        }).pipe(
          Effect.catchAll((description) =>
            Effect.sync(() =>
              toastManager.add({
                title: "Protocol was not created",
                description,
                type: "error",
              })
            )
          )
        )
      );
    },
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Protocol details required",
        description: "Add a title, number, date, and protocol type.",
        type: "warning",
      });
    },
  });

  /** Keeps the sheet form fresh whenever users open it. */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(defaultProtocolFormValues());
      setIsDateOpen(false);
    }

    setIsOpen(nextOpen);
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger
        render={<Button disabled={disabled} size="sm" type="button" />}
      >
        <HugeIcons icon={File02Icon} />
        <span>New Protocol</span>
      </SheetTrigger>
      <SheetPopup
        portalProps={{ keepMounted: true }}
        side="right"
        variant="inset"
      >
        <SheetHeader>
          <SheetTitle>New Protocol</SheetTitle>
          <SheetDescription>
            Create a protocol record before adding sources.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <Form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              return form.handleSubmit();
            }}
          >
            <Fieldset className="grid gap-4">
              <FieldsetLegend className="sr-only">
                Protocol Details
              </FieldsetLegend>
              <form.Field
                name="title"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : protocolValidationMessages.title,
                }}
              >
                {(field) => {
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : protocolValidationMessages.title);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Protocol Title</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        value={field.state.value}
                      />
                      {error ? (
                        <FieldError match={true}>{error}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field
                name="number"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim()
                      ? undefined
                      : protocolValidationMessages.number,
                }}
              >
                {(field) => {
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : protocolValidationMessages.number);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Protocol Number</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="BP-001"
                        value={field.state.value}
                      />
                      {error ? (
                        <FieldError match={true}>{error}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field
                name="date"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : protocolValidationMessages.date,
                }}
              >
                {(field) => {
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : protocolValidationMessages.date);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Date</FieldLabel>
                      <Popover onOpenChange={setIsDateOpen} open={isDateOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              aria-invalid={!field.state.meta.isValid}
                              className="w-full justify-between"
                              name={field.name}
                              onBlur={field.handleBlur}
                              type="button"
                              variant="outline"
                            />
                          }
                        >
                          <span>{formatDisplayDate(field.state.value)}</span>
                          <HugeIcons icon={Calendar03Icon} />
                        </PopoverTrigger>
                        <PopoverPopup align="start">
                          <Calendar
                            mode="single"
                            onSelect={(date) => {
                              if (!date) {
                                return;
                              }

                              field.handleChange(formatDateInput(date));
                              setIsDateOpen(false);
                            }}
                            selected={parseDateInput(field.state.value)}
                          />
                        </PopoverPopup>
                      </Popover>
                      {error ? (
                        <FieldError match={true}>{error}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field
                name="type"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : protocolValidationMessages.type,
                }}
              >
                {(field) => {
                  const selected =
                    protocolTypeItems.find(
                      (item) => item.value === field.state.value
                    ) ?? protocolTypeItems[0];
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : protocolValidationMessages.type);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Type</FieldLabel>
                      <Select
                        items={protocolTypeItems}
                        itemToStringValue={(item) => item.value}
                        onValueChange={(item) => {
                          if (!item) {
                            return;
                          }

                          field.handleChange(item.value);
                        }}
                        value={selected}
                      >
                        <SelectTrigger aria-invalid={!field.state.meta.isValid}>
                          <SelectValue placeholder="Protocol type" />
                        </SelectTrigger>
                        <SelectPopup alignItemWithTrigger={false}>
                          {protocolTypeItems.map((item) => (
                            <SelectItem key={item.value} value={item}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                      {error ? (
                        <FieldError match={true}>{error}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="location">
                {(field) => (
                  <Field>
                    <FieldLabel>Location</FieldLabel>
                    <Input
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Site office, level 12"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="agenda">
                {(field) => (
                  <Field>
                    <FieldLabel>Agenda</FieldLabel>
                    <Textarea
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Safety, schedule, blockers, decisions..."
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="attendees">
                {(field) => (
                  <Field>
                    <FieldLabel>Attendees</FieldLabel>
                    <Textarea
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nabil Akbar, Owner, Project Lead, nabil@example.com"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
              <form.Field name="distribution">
                {(field) => (
                  <Field>
                    <FieldLabel>Distribution List</FieldLabel>
                    <Textarea
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Architect Team, Design Office, Reviewer, architect@example.com"
                      value={field.state.value}
                    />
                  </Field>
                )}
              </form.Field>
            </Fieldset>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button loading={isSubmitting} type="submit">
                  <HugeIcons icon={Add01Icon} /> Create Protocol
                </Button>
              )}
            </form.Subscribe>
          </Form>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

/** Returns fresh default values for the new protocol form. */
function defaultProtocolFormValues() {
  return {
    agenda: "",
    attendees: "",
    date: todayDate(),
    distribution: "",
    location: "",
    number: "",
    title: "",
    type: protocolTypeItems[0].value,
  };
}
