import { useMutation } from "@confect/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
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
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { useForm } from "@tanstack/react-form";
import type { GenericId } from "convex/values";
import { Effect, Either } from "effect";
import { useState } from "react";

import { getErrorMessage } from "@/lib/errors";

const projectValidationMessages = {
  code: "Project code is required.",
  name: "Project name is required.",
} as const;

/** Collects new project details in a sheet so the sidebar stays focused. */
export function NewProjectSheet({
  canCreateProject,
  onCreated,
}: {
  readonly canCreateProject: boolean;
  readonly onCreated: (projectId: GenericId<"projects"> | null) => void;
}) {
  const createProject = useMutation(refs.public.projects.create);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    defaultValues: defaultProjectFormValues(),
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          if (!canCreateProject) {
            return yield* Effect.sync(() =>
              toastManager.add({
                title: "Sign in required",
                description: "Sign in before creating projects.",
                type: "warning",
              })
            );
          }

          const projectName = value.name.trim();
          const projectCode = value.code.trim();

          const result = yield* Effect.tryPromise({
            try: () =>
              createProject({
                organizationName: projectName,
                name: projectName,
                code: projectCode,
                description:
                  "Project workspace for construction protocol memory.",
              }),
            catch: getErrorMessage,
          });
          const projectId = yield* Either.match(result, {
            onLeft: (error) => Effect.fail(error.message),
            onRight: Effect.succeed,
          });

          yield* Effect.sync(() => {
            onCreated(projectId);
            setIsOpen(false);
            form.reset(defaultProjectFormValues());
            toastManager.add({
              title: "Project created",
              description: "Create a protocol next.",
              type: "success",
            });
          });
        }).pipe(
          Effect.catchAll((description) =>
            Effect.sync(() =>
              toastManager.add({
                title: "Project was not created",
                description,
                type: "error",
              })
            )
          )
        )
      ),
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Project details required",
        description: "Project name and code are required.",
        type: "warning",
      });
    },
  });

  /** Keeps each new project form session empty and production-facing. */
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      form.reset(defaultProjectFormValues());
    }

    setIsOpen(nextOpen);
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetTrigger
        render={
          <Button className="w-full justify-start" size="sm" type="button" />
        }
      >
        <HugeIcons icon={Add01Icon} />
        <span>New Project</span>
      </SheetTrigger>
      <SheetPopup side="left" variant="inset">
        <SheetHeader>
          <SheetTitle>New Project</SheetTitle>
          <SheetDescription>
            Create one focused project workspace for protocol memory.
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
                New Project Details
              </FieldsetLegend>
              <form.Field
                name="name"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : projectValidationMessages.name,
                }}
              >
                {(field) => {
                  const fieldError =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : projectValidationMessages.name);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Project Name</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        disabled={!canCreateProject}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="text"
                        value={field.state.value}
                      />
                      <FieldDescription>
                        Shown in the sidebar and ledger source records.
                      </FieldDescription>
                      {fieldError ? (
                        <FieldError match={true}>{fieldError}</FieldError>
                      ) : null}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field
                name="code"
                validators={{
                  onSubmit: ({ value }) =>
                    value.trim() ? undefined : projectValidationMessages.code,
                }}
              >
                {(field) => {
                  const fieldError =
                    field.state.meta.errors[0] ??
                    (field.state.meta.isValid
                      ? ""
                      : projectValidationMessages.code);

                  return (
                    <Field invalid={!field.state.meta.isValid}>
                      <FieldLabel>Project Code</FieldLabel>
                      <Input
                        aria-invalid={!field.state.meta.isValid}
                        disabled={!canCreateProject}
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
            </Fieldset>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  disabled={!canCreateProject}
                  loading={isSubmitting}
                  type="submit"
                >
                  <HugeIcons icon={Add01Icon} /> Create Project
                </Button>
              )}
            </form.Subscribe>
          </Form>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}

/** Returns empty default values for the project creation form. */
function defaultProjectFormValues() {
  return {
    code: "",
    name: "",
  };
}
