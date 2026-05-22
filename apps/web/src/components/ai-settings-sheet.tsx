"use client";

import { QueryResult, useAction, useMutation, useQuery } from "@confect/react";
import { AiSettingIcon, Key01Icon } from "@hugeicons/core-free-icons";
import { openRouterModelOptions } from "@repo/ai/schemas";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  HugeIcons,
  Input,
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system";
import { type FormEvent, useState } from "react";

/** Lets users save, clear, and inspect their active BYOK AI provider. */
export function AiSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const settings = useQuery(
    refs.public.aiSettings.getCurrent,
    isOpen ? {} : "skip"
  );
  const saveKey = useAction(refs.public.aiSettings.saveOpenRouterKey);
  const clearKey = useMutation(refs.public.aiSettings.clearCurrent);
  const currentSettings =
    settings._tag === "Success" ? settings.value : undefined;
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedModel =
    model || currentSettings?.model || openRouterModelOptions[0];
  const supportedModel = openRouterModelOptions.find(
    (option) => option === selectedModel
  );

  /** Tracks sheet visibility so provider settings load only when needed. */
  function handleOpenChange(nextOpen: boolean) {
    setIsOpen(nextOpen);
  }

  /** Saves the entered OpenRouter key encrypted in the backend. */
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiKey.trim()) {
      setMessage("Enter an OpenRouter key before saving.");
      return;
    }

    if (!supportedModel) {
      setMessage("Choose a supported OpenRouter model.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await saveKey({
      apiKey,
      model: supportedModel,
    });

    setIsSaving(false);

    if (result._tag === "Left") {
      setMessage(result.left.message);
      return;
    }

    setApiKey("");
    setMessage("OpenRouter key saved.");
  }

  /** Clears the encrypted user key and falls back to env or demo settings. */
  async function handleClear() {
    setIsSaving(true);
    setMessage(null);

    const result = await clearKey({});

    setIsSaving(false);

    if (result._tag === "Left") {
      setMessage(result.left.message);
      return;
    }

    setApiKey("");
    setMessage("Saved key cleared.");
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <HugeIcons icon={AiSettingIcon} /> AI settings
      </SheetTrigger>
      <SheetPopup side="right" variant="inset">
        <SheetHeader>
          <SheetTitle>AI settings</SheetTitle>
          <SheetDescription>
            Bring your own OpenRouter key or keep the local demo provider.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {QueryResult.match(settings, {
            onLoading: () => <Badge variant="outline">Loading provider</Badge>,
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
                  {value.source === "demo" ? "Demo provider" : "OpenRouter"}
                </AlertTitle>
                <AlertDescription>
                  Model: {value.model}
                  {value.keyLast4 ? `, key ending ${value.keyLast4}` : ""}
                </AlertDescription>
              </Alert>
            ),
          })}

          <Form className="flex flex-col gap-4" onSubmit={handleSave}>
            <Field>
              <FieldLabel>Provider</FieldLabel>
              <Input disabled value="OpenRouter" />
              <FieldDescription>
                OpenRouter keeps BuildLedger provider-neutral for self-hosting.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Model</FieldLabel>
              <Input
                list="buildledger-openrouter-models"
                onChange={(event) => setModel(event.target.value)}
                value={selectedModel}
              />
              <datalist id="buildledger-openrouter-models">
                {openRouterModelOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel>API key</FieldLabel>
              <Input
                autoComplete="off"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-or-..."
                type="password"
                value={apiKey}
              />
              <FieldDescription>
                Keys are encrypted before storage and are never returned to the
                browser.
              </FieldDescription>
            </Field>

            {message ? (
              <Alert variant="info">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <Button loading={isSaving} type="submit">
              Save key
            </Button>
          </Form>
        </SheetPanel>
        <SheetFooter>
          <Button
            disabled={isSaving}
            onClick={handleClear}
            type="button"
            variant="secondary"
          >
            Clear saved key
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
