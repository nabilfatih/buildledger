import { QueryResult, useAction, useMutation, useQuery } from "@confect/react";
import { AiSettingIcon, Key01Icon } from "@hugeicons/core-free-icons";
import { openRouterModelOptions } from "@repo/ai/schemas";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Field,
  FieldDescription,
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
import { SidebarMenuButton } from "@repo/design-system/components/ui/sidebar";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { useForm } from "@tanstack/react-form";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errors";

const modelItems = openRouterModelOptions.map((model) => ({
  label: model,
  value: model,
}));

const validationMessages = {
  apiKey: "Enter an OpenRouter key before saving.",
  model: "Choose a supported OpenRouter model.",
} as const;

/** Lets users save, clear, and inspect their active BYOK AI provider. */
export function AiSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const settings = useQuery(refs.public.aiSettings.getCurrent, {});
  const saveKey = useAction(refs.public.aiSettings.saveOpenRouterKey);
  const clearKey = useMutation(refs.public.aiSettings.clearCurrent);
  const currentSettings =
    settings._tag === "Success" ? settings.value : undefined;
  const [isClearing, setIsClearing] = useState(false);
  const form = useForm({
    defaultValues: {
      apiKey: "",
      model: currentSettings?.model ?? openRouterModelOptions[0],
    },
    onSubmit: async ({ value }) => {
      try {
        const apiKey = value.apiKey.trim();
        const supportedModel = openRouterModelOptions.find(
          (option) => option === value.model
        );

        if (!supportedModel) {
          toastManager.add({
            title: "Choose a supported model",
            type: "warning",
          });
          return;
        }

        const result = await saveKey({
          apiKey,
          model: supportedModel,
        });

        if (result._tag === "Left") {
          toastManager.add({
            title: "Key was not saved",
            description: result.left.message,
            type: "error",
          });
          return;
        }

        form.reset({
          apiKey: "",
          model: supportedModel,
        });
        toastManager.add({
          title: "OpenRouter key saved",
          description:
            "BuildLedger will use the saved provider for AI actions.",
          type: "success",
        });
      } catch (error) {
        toastManager.add({
          title: "Key was not saved",
          description: getErrorMessage(error),
          type: "error",
        });
      }
    },
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Check AI settings",
        description: "Fix the highlighted fields before saving.",
        type: "warning",
      });
    },
  });

  /** Tracks sheet visibility so provider settings load only when needed. */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset({
        apiKey: "",
        model: currentSettings?.model ?? openRouterModelOptions[0],
      });
    }

    setIsOpen(nextOpen);
  }

  /** Submits the TanStack-managed provider settings form. */
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    await form.handleSubmit();
  }

  /** Clears the encrypted user key and falls back to managed settings. */
  async function handleClear() {
    setIsClearing(true);

    const result = await clearKey({});

    setIsClearing(false);

    if (result._tag === "Left") {
      toastManager.add({
        title: "Key was not cleared",
        description: result.left.message,
        type: "error",
      });
      return;
    }

    form.reset({
      apiKey: "",
      model: currentSettings?.model ?? form.state.values.model,
    });
    toastManager.add({
      title: "Saved key cleared",
      description: "BuildLedger will use the managed provider.",
      type: "success",
    });
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger render={<SidebarMenuButton size="sm" type="button" />}>
        <HugeIcons icon={AiSettingIcon} />
        <span>AI Settings</span>
      </SheetTrigger>
      <SheetPopup
        portalProps={{ keepMounted: true }}
        side="right"
        variant="inset"
      >
        <SheetHeader>
          <SheetTitle>AI Settings</SheetTitle>
          <SheetDescription>
            Bring your own OpenRouter key or use the built-in provider.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {QueryResult.match(settings, {
            onLoading: () => <Skeleton className="h-24" />,
            onFailure: (error) => (
              <Alert variant="warning">
                <AlertTitle>Provider unavailable</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ),
            onSuccess: (value) => (
              <Alert variant={value.hasKey ? "success" : "info"}>
                <HugeIcons icon={Key01Icon} />
                <AlertTitle>
                  {value.source === "demo" ? "Built-in Provider" : "OpenRouter"}
                </AlertTitle>
                <AlertDescription>
                  Model: {value.model}
                  {value.keyLast4 ? `, key ending ${value.keyLast4}` : ""}
                </AlertDescription>
              </Alert>
            ),
          })}

          <Form className="flex flex-col gap-4" onSubmit={handleSave}>
            <Fieldset className="grid gap-4">
              <FieldsetLegend className="sr-only">
                OpenRouter Provider Settings
              </FieldsetLegend>
              <Field>
                <FieldLabel>Provider</FieldLabel>
                <Input disabled type="text" value="OpenRouter" />
                <FieldDescription>
                  OpenRouter keeps BuildLedger provider-neutral for
                  self-hosting.
                </FieldDescription>
              </Field>
              <form.Field
                name="model"
                validators={{
                  onSubmit: ({ value }) =>
                    openRouterModelOptions.some((option) => option === value)
                      ? undefined
                      : validationMessages.model,
                }}
              >
                {(field) => {
                  const fieldError =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid ? "" : validationMessages.model);
                  const selectedModelItem =
                    modelItems.find(
                      (item) => item.value === field.state.value
                    ) ?? null;

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Model</FieldLabel>
                      <Select
                        items={modelItems}
                        itemToStringValue={(item) => item.value}
                        onValueChange={(item) => {
                          if (!item) {
                            return;
                          }

                          field.handleChange(item.value);
                        }}
                        value={selectedModelItem}
                      >
                        <SelectTrigger aria-invalid={!field.state.meta.isValid}>
                          <SelectValue placeholder="Model" />
                        </SelectTrigger>
                        <SelectPopup alignItemWithTrigger={false}>
                          {modelItems.map((option) => (
                            <SelectItem key={option.value} value={option}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>
                      {fieldError ? (
                        <FieldError match={true}>{fieldError}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field
                name="apiKey"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : validationMessages.apiKey,
                }}
              >
                {(field) => {
                  const fieldError =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid ? "" : validationMessages.apiKey);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>API Key</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        autoComplete="off"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="sk-or-..."
                        type="password"
                        value={field.state.value}
                      />
                      <FieldDescription>
                        Keys are encrypted before storage and are never returned
                        to the browser.
                      </FieldDescription>
                      {fieldError ? (
                        <FieldError match={true}>{fieldError}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            </Fieldset>

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  disabled={isClearing}
                  loading={isSubmitting}
                  type="submit"
                >
                  Save Key
                </Button>
              )}
            </form.Subscribe>
          </Form>
          <Button
            disabled={isClearing}
            loading={isClearing}
            onClick={handleClear}
            type="button"
            variant="destructive-outline"
          >
            Clear Saved Key
          </Button>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
