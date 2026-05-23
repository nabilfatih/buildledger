import { useMutation } from "@confect/react";
import { Add01Icon, File02Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import { Button } from "@repo/design-system/components/ui/button";
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
import { type FormEvent, useState } from "react";

import {
  meetingTypeItems,
  meetingValidationMessages,
  optionalText,
  todayDate,
} from "@/components/meeting-workspace-utils";
import { getErrorMessage } from "@/lib/errors";

/** Collects meeting metadata before creating a new draft meeting. */
export function NewMeetingSheet({
  disabled,
  onCreated,
  selectedProjectId,
}: {
  readonly disabled: boolean;
  readonly onCreated: (meetingId: GenericId<"meetings">) => void;
  readonly selectedProjectId: GenericId<"projects"> | null;
}) {
  const createDraft = useMutation(refs.public.meetings.createDraft);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      agenda: "",
      date: todayDate(),
      title: "",
      type: meetingTypeItems[0].value,
    },
    onSubmit: async ({ value }) => {
      if (!selectedProjectId) {
        return;
      }

      try {
        const result = await createDraft({
          projectId: selectedProjectId,
          title: value.title.trim(),
          meetingType: value.type,
          meetingDate: value.date,
          agenda: optionalText(value.agenda),
        });

        if (result._tag === "Left") {
          toastManager.add({
            title: "Meeting was not created",
            description: result.left.message,
            type: "error",
          });
          return;
        }

        onCreated(result.right);
        setIsOpen(false);
        form.reset(defaultMeetingFormValues());
        toastManager.add({
          title: "Meeting created",
          description: "Add notes, then generate minutes.",
          type: "success",
        });
      } catch (error) {
        toastManager.add({
          title: "Meeting was not created",
          description: getErrorMessage(error),
          type: "error",
        });
      }
    },
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Meeting details required",
        description: "Add a title, date, and meeting type.",
        type: "warning",
      });
    },
  });

  /** Keeps the sheet form fresh whenever users open it. */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(defaultMeetingFormValues());
    }

    setIsOpen(nextOpen);
  }

  /** Submits the TanStack-managed meeting form. */
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    await form.handleSubmit();
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger
        render={<Button disabled={disabled} size="sm" type="button" />}
      >
        <HugeIcons icon={File02Icon} />
        <span>New Meeting</span>
      </SheetTrigger>
      <SheetPopup
        portalProps={{ keepMounted: true }}
        side="right"
        variant="inset"
      >
        <SheetHeader>
          <SheetTitle>New Meeting</SheetTitle>
          <SheetDescription>
            Create a meeting record before adding notes.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <Form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <Fieldset className="grid gap-4">
              <FieldsetLegend className="sr-only">
                Meeting Details
              </FieldsetLegend>
              <form.Field
                name="title"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : meetingValidationMessages.title,
                }}
              >
                {(field) => {
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : meetingValidationMessages.title);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Meeting Title</FieldLabel>
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
                name="date"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : meetingValidationMessages.date,
                }}
              >
                {(field) => {
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : meetingValidationMessages.date);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Date</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="date"
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
                name="type"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : meetingValidationMessages.type,
                }}
              >
                {(field) => {
                  const selected =
                    meetingTypeItems.find(
                      (item) => item.value === field.state.value
                    ) ?? meetingTypeItems[0];
                  const error =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : meetingValidationMessages.type);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Type</FieldLabel>
                      <Select
                        items={meetingTypeItems}
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
                          <SelectValue placeholder="Meeting type" />
                        </SelectTrigger>
                        <SelectPopup alignItemWithTrigger={false}>
                          {meetingTypeItems.map((item) => (
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
            </Fieldset>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button loading={isSubmitting} type="submit">
                  <HugeIcons icon={Add01Icon} /> Create Meeting
                </Button>
              )}
            </form.Subscribe>
          </Form>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

/** Returns fresh default values for the new meeting form. */
function defaultMeetingFormValues() {
  return {
    agenda: "",
    date: todayDate(),
    title: "",
    type: meetingTypeItems[0].value,
  };
}
