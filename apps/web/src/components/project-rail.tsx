"use client";

import { QueryResult, useMutation } from "@confect/react";
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  HugeIcons,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Progress,
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  toastManager,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { type FormEvent, useMemo, useState } from "react";

import { AiSettingsSheet } from "@/components/ai-settings-sheet";
import type { ProjectsResult } from "@/lib/confect-results";
import { getErrorMessage } from "@/lib/errors";

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
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader>
        <div className="grid min-w-0 gap-1 px-2 py-1">
          <p className="font-medium text-muted-foreground text-xs">
            Open-source construction intelligence
          </p>
          <h1 className="truncate font-heading text-lg">BuildLedger</h1>
        </div>
        <NewProjectSheet
          canCreateProject={projects._tag === "Success"}
          onCreated={setSelectedProjectId}
        />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent className="grid gap-2">
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>
                  <HugeIcons icon={Search01Icon} />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects"
                value={search}
              />
            </InputGroup>
            {QueryResult.match(projects, {
              onLoading: () => <Progress value={40} />,
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
                        <SidebarMenuBadge>Now</SidebarMenuBadge>
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
  const [name, setName] = useState("Harbor Tower Phase 2");
  const [code, setCode] = useState("HT-02");
  const [isSaving, setIsSaving] = useState(false);

  /** Creates a demo-ready project for the current user. */
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateProject) {
      toastManager.add({
        title: "Sign in required",
        description: "Sign in before creating projects.",
        type: "warning",
      });
      return;
    }

    const projectName = name.trim();
    const projectCode = code.trim();

    if (!(projectName && projectCode)) {
      toastManager.add({
        title: "Project details required",
        description: "Project name and code are required.",
        type: "warning",
      });
      return;
    }

    try {
      setIsSaving(true);

      const result = await createProject({
        organizationName: "BuildLedger Demo",
        name: projectName,
        code: projectCode,
        description: "Demo project for construction meeting memory.",
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
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger render={<Button className="w-full" size="sm" />}>
        <HugeIcons icon={Add01Icon} /> New project
      </SheetTrigger>
      <SheetPopup side="left" variant="inset">
        <SheetHeader>
          <SheetTitle>New project</SheetTitle>
          <SheetDescription>
            Keep the demo clean by creating one focused project workspace.
          </SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <Form className="flex flex-col gap-4" onSubmit={handleCreateProject}>
            <Field>
              <FieldLabel>Project name</FieldLabel>
              <Input
                disabled={!canCreateProject}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
              <FieldDescription>
                Shown in the sidebar and ledger source records.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Project code</FieldLabel>
              <Input
                disabled={!canCreateProject}
                onChange={(event) => setCode(event.target.value)}
                value={code}
              />
            </Field>
            <Button
              disabled={!canCreateProject}
              loading={isSaving}
              type="submit"
            >
              <HugeIcons icon={Add01Icon} /> Create project
            </Button>
          </Form>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
