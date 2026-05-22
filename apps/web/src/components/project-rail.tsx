import { QueryResult, useMutation } from "@confect/react";
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
  HugeIcons,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Progress,
  ScrollArea,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { type FormEvent, useMemo, useState } from "react";

import type { ProjectsResult } from "@/lib/confect-results";

/** Creates projects and lists the current user's accessible projects. */
export function ProjectRail({
  projects,
  selectedProjectId,
  setNotice,
  setSelectedProjectId,
}: {
  readonly projects: ProjectsResult;
  readonly selectedProjectId: GenericId<"projects"> | null;
  readonly setNotice: (message: string | null) => void;
  readonly setSelectedProjectId: (
    projectId: GenericId<"projects"> | null
  ) => void;
}) {
  const createProject = useMutation(refs.public.projects.create);
  const [name, setName] = useState("Harbor Tower Phase 2");
  const [code, setCode] = useState("HT-02");
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canCreateProject = projects._tag === "Success";
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

  /** Creates a demo organization and project for the signed-in user. */
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateProject) {
      setNotice("Sign in before creating projects.");
      return;
    }

    const projectName = name.trim();
    const projectCode = code.trim();

    if (!(projectName && projectCode)) {
      setNotice("Project name and code are required.");
      return;
    }

    setIsSaving(true);
    setNotice(null);

    const result = await createProject({
      organizationName: "BuildLedger Demo",
      name: projectName,
      code: projectCode,
      description: "Synthetic demo project for construction meeting memory.",
    });

    setIsSaving(false);

    if (result._tag === "Left") {
      setNotice(result.left.message);
      return;
    }

    setSelectedProjectId(result.right);
  }

  return (
    <Frame className="min-w-0 self-start">
      <FrameHeader>
        <FrameTitle>Projects</FrameTitle>
        <FrameDescription>
          Create or pick the active workspace.
        </FrameDescription>
      </FrameHeader>
      <FramePanel className="flex min-w-0 flex-col gap-4 p-4">
        <Form className="flex flex-col gap-3" onSubmit={handleCreateProject}>
          <Field>
            <FieldLabel>Project name</FieldLabel>
            <Input
              disabled={!canCreateProject}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            <FieldDescription>
              Used in meetings, memory, and reports.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Code</FieldLabel>
            <Input
              disabled={!canCreateProject}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </Field>
          <Button
            className="w-full"
            disabled={!canCreateProject}
            loading={isSaving}
            type="submit"
          >
            <HugeIcons icon={Add01Icon} /> Create project
          </Button>
        </Form>
      </FramePanel>
      <FramePanel className="flex min-w-0 flex-col gap-3 p-4">
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
            <Badge className="max-w-full whitespace-normal" variant="warning">
              {error.message}
            </Badge>
          ),
          onSuccess: () => (
            <ScrollArea className="max-h-[34rem]">
              <div className="flex min-w-0 flex-col gap-1 pr-1">
                {filteredProjects.map((project) => (
                  <button
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted data-[active=true]:bg-muted"
                    data-active={project._id === selectedProjectId}
                    key={project._id}
                    onClick={() => setSelectedProjectId(project._id)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {project.name}
                      </span>
                      <span className="block truncate text-muted-foreground text-xs">
                        {project.code}
                      </span>
                    </span>
                    <Badge
                      variant={
                        project._id === selectedProjectId
                          ? "success"
                          : "outline"
                      }
                    >
                      {project.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ),
        })}
      </FramePanel>
    </Frame>
  );
}
