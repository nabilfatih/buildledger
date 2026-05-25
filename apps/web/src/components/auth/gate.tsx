import { Key01Icon } from "@hugeicons/core-free-icons";
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
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@repo/design-system/components/ui/frame";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { useForm } from "@tanstack/react-form";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  showAuthError,
  signInWithEmail,
  signUpWithEmail,
} from "@/components/auth/actions";
import { authClient } from "@/lib/auth-client";
import { getPublicAuthRequired } from "@/lib/public-config";

const authValidationMessages = {
  email: "Email is required.",
  name: "Name is required.",
  password: "Password is required.",
} as const;

/** Protects the app when production auth is explicitly required. */
export function AuthGate({ children }: { readonly children: ReactNode }) {
  const session = authClient.useSession();
  const authRequired = getPublicAuthRequired();

  if (!(authRequired && !session.data?.session)) {
    return children;
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <AuthPanel isCheckingSession={session.isPending} />
    </main>
  );
}

function AuthPanel({
  isCheckingSession,
}: {
  readonly isCheckingSession: boolean;
}) {
  const [mode, setMode] = useState("sign-in");
  const form = useForm({
    defaultValues: defaultAuthValues(),
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const email = value.email.trim();
          const password = value.password.trim();
          const name = value.name.trim();

          if (mode === "sign-up") {
            yield* signUpWithEmail({ email, name, password });
          } else {
            yield* signInWithEmail({ email, password });
          }

          yield* Effect.sync(() =>
            toastManager.add({
              title: "Signed in",
              description: "BuildLedger is ready.",
              type: "success",
            })
          );
        }).pipe(
          Effect.catchAll((description) =>
            Effect.sync(() => showAuthError(description))
          )
        )
      ),
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Authentication details required",
        description: "Enter the required fields before continuing.",
        type: "warning",
      });
    },
  });

  return (
    <Frame className="w-full max-w-md">
      <FrameHeader>
        <FrameTitle>Sign In</FrameTitle>
        <FrameDescription>
          Access the production protocol workspace.
        </FrameDescription>
      </FrameHeader>
      <FramePanel>
        <Tabs onValueChange={setMode} value={mode}>
          <TabsList>
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Create Account</TabsTrigger>
          </TabsList>
        </Tabs>
        <Form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            return form.handleSubmit();
          }}
        >
          <Fieldset className="grid gap-4">
            <FieldsetLegend className="sr-only">
              Authentication Details
            </FieldsetLegend>
            {mode === "sign-up" ? (
              <form.Field
                name="name"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : authValidationMessages.name,
                }}
              >
                {(field) => {
                  const fieldError =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : authValidationMessages.name);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Name</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="text"
                        value={field.state.value}
                      />
                      {fieldError ? (
                        <FieldError match={true}>{fieldError}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
            ) : null}
            <form.Field
              name="email"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : authValidationMessages.email,
              }}
            >
              {(field) => {
                const fieldError =
                  field.state.meta.errors[0] ??
                  (field.state.meta.isValid
                    ? ""
                    : authValidationMessages.email);

                return (
                  <Field invalid={!field.state.meta.isValid}>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      aria-invalid={!field.state.meta.isValid}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      type="email"
                      value={field.state.value}
                    />
                    {fieldError ? (
                      <FieldError match={true}>{fieldError}</FieldError>
                    ) : null}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field
              name="password"
              validators={{
                onSubmit: ({ value }) =>
                  value.trim() ? undefined : authValidationMessages.password,
              }}
            >
              {(field) => {
                const fieldError =
                  field.state.meta.errors[0] ??
                  (field.state.meta.isValid
                    ? ""
                    : authValidationMessages.password);

                return (
                  <Field invalid={!field.state.meta.isValid}>
                    <FieldLabel>Password</FieldLabel>
                    <Input
                      aria-invalid={!field.state.meta.isValid}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      type="password"
                      value={field.state.value}
                    />
                    <FieldDescription>
                      Use the account configured for this deployment.
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
              <Button loading={isSubmitting || isCheckingSession} type="submit">
                <HugeIcons icon={Key01Icon} />
                {mode === "sign-up" ? "Create Account" : "Sign In"}
              </Button>
            )}
          </form.Subscribe>
        </Form>
      </FramePanel>
    </Frame>
  );
}

function defaultAuthValues() {
  return {
    email: "",
    name: "",
    password: "",
  };
}
