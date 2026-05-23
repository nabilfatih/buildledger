"use client";

import { QueryResult, useMutation } from "@confect/react";
import {
  Add01Icon,
  Building06Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@repo/design-system/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
} from "@repo/design-system/components/ui/sidebar";
import { toastManager } from "@repo/design-system/components/ui/toast";
import { useForm } from "@tanstack/react-form";
import type { GenericId } from "convex/values";
import { type FormEvent, useMemo, useState } from "react";

import { AiSettingsSheet } from "@/components/ai-settings-sheet";
import type { ProjectsResult } from "@/lib/confect-results";
import { getErrorMessage } from "@/lib/errors";

const projectSkeletonRows = [
  "project-1",
  "project-2",
  "project-3",
  "project-4",
  "project-5",
  "project-6",
];

const projectValidationMessages = {
  code: "Project code is required.",
  name: "Project name is required.",
} as const;

/** Creates projects and switches the active project from the app sidebar. */
export function ProjectRail({
  projects,
  selectedProjectId,
  setSelectedProjectId,
}: {
  readonly projects: ProjectsResult;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setSelectedProjectId: (
    projectId: GenericId<"projects"> | null
  ) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredProjects = useMemo(() => {
    if (projects._tag !== "Success") {
      return [];
    }

    const query = search.trim().toLowerCase();

    if (!query) {
      return projects.value;
    }

    return projects.value.filter((project) =>
      `${project.name} ${project.code}`.toLowerCase().includes(query)
    );
  }, [projects, search]);
  const visibleProjects =
    search.trim().length > 0 ? filteredProjects : filteredProjects.slice(0, 8);

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-2 px-2 py-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background shadow-sm/5">
            <HugeIcons className="size-4" icon={Building06Icon} />
          </span>
          <h1 className="truncate font-heading text-lg">BuildLedger</h1>
        </div>
        <NewProjectSheet
          canCreateProject={projects._tag === "Success"}
          onCreated={setSelectedProjectId}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="grid gap-2">
            <InputGroup>
              <InputGroupInput
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects"
                type="search"
                value={search}
              />
              <InputGroupAddon>
                <InputGroupText>
                  <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {QueryResult.match(projects, {
              onLoading: () => (
                <SidebarMenu>
                  {projectSkeletonRows.map((row) => (
                    <SidebarMenuItem key={row}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              ),
              onFailure: (error) => (
                <p className="break-words px-2 text-muted-foreground text-sm">
                  {error.message}
                </p>
              ),
              onSuccess: () => (
                <SidebarMenu>
                  {visibleProjects.map((project) => (
                    <SidebarMenuItem key={project._id}>
                      <SidebarMenuButton
                        aria-label={`${project.name} (${project.code})`}
                        className="h-auto min-h-11 items-start py-2"
                        isActive={project._id === selectedProjectId}
                        onClick={() => setSelectedProjectId(project._id)}
                      >
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate">{project.name}</span>
                          <span className="truncate text-muted-foreground text-xs">
                            {project.code}
                          </span>
                        </span>
                      </SidebarMenuButton>
                      {project._id === selectedProjectId ? (
                        <SidebarMenuBadge>Active</SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                  {visibleProjects.length < filteredProjects.length ? (
                    <SidebarMenuItem>
                      <p className="px-2 py-1 text-muted-foreground text-xs">
                        Search to find{" "}
                        {filteredProjects.length - visibleProjects.length} more.
                      </p>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              ),
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AiSettingsSheet />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/** Collects new project details in a sheet so the sidebar stays focused. */
function NewProjectSheet({
  canCreateProject,
  onCreated,
}: {
  readonly canCreateProject: boolean;
  readonly onCreated: (projectId: GenericId<"projects"> | null) => void;
}) {
  const createProject = useMutation(refs.public.projects.create);
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      code: "HT-02",
      name: "Harbor Tower Phase 2",
    },
    onSubmit: async ({ value }) => {
      try {
        if (!canCreateProject) {
          toastManager.add({
            title: "Sign in required",
            description: "Sign in before creating projects.",
            type: "warning",
          });
          return;
        }

        const projectName = value.name.trim();
        const projectCode = value.code.trim();

        const result = await createProject({
          organizationName: projectName,
          name: projectName,
          code: projectCode,
          description: "Project workspace for construction meeting memory.",
        });

        if (result._tag === "Left") {
          toastManager.add({
            title: "Project was not created",
            description: result.left.message,
            type: "error",
          });
          return;
        }

        onCreated(result.right);
        setIsOpen(false);
        toastManager.add({
          title: "Project created",
          description: "Create a meeting next.",
          type: "success",
        });
      } catch (error) {
        toastManager.add({
          title: "Project was not created",
          description: getErrorMessage(error),
          type: "error",
        });
      }
    },
    onSubmitInvalid: () => {
      toastManager.add({
        title: "Project details required",
        description: "Project name and code are required.",
        type: "warning",
      });
    },
  });

  /** Creates a project workspace for the current user. */
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    await form.handleSubmit();
  }

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger
        render={<Button className="w-full" size="sm" type="button" />}
      >
        <HugeIcons icon={Add01Icon} /> New Project
      </SheetTrigger>
      <SheetPopup side="left" variant="inset">
        <SheetHeader>
          <SheetTitle>New Project</SheetTitle>
          <SheetDescription>
            Create one focused project workspace for meeting memory.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <Form className="flex flex-col gap-4" onSubmit={handleCreateProject}>
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
