import { QueryResult, useMutation } from "@confect/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import refs from "@repo/backend/confect/_generated/refs";
import {
  Badge,
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Field,
  FieldDescription,
  FieldLabel,
  Form,
  HugeIcons,
  Input,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system";
import type { GenericId } from "convex/values";
import { type FormEvent, useState } from "react";

import type { ProjectsResult } from "@/lib/confect-results";

/** Creates projects and lists the current user's accessible projects. */
export function ProjectRail({
  notice,
  projects,
  selectedProjectId,
  setNotice,
  setSelectedProjectId,
}: {
  readonly notice: string | null;
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
  const [isSaving, setIsSaving] = useState(false);
  const canCreateProject = projects._tag === "Success";

  /** Creates a demo organization and project for the signed-in user. */
  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateProject) {
      setNotice("Sign in before creating projects.");
      return;
    }

    setIsSaving(true);
    setNotice(null);

    const result = await createProject({
      organizationName: "BuildLedger Demo",
      name,
      code,
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
    <aside className="flex flex-col gap-5">
      <Form className="flex flex-col gap-4" onSubmit={handleCreateProject}>
        <Field>
          <FieldLabel>Organization project</FieldLabel>
          <Input
            disabled={!canCreateProject}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <FieldDescription>
            Create the project, then every workspace panel updates live.
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
        <Button disabled={!canCreateProject} loading={isSaving} type="submit">
          <HugeIcons icon={Add01Icon} /> Create project
        </Button>
      </Form>

      {notice ? <Badge variant="warning">{notice}</Badge> : null}

      {QueryResult.match(projects, {
        onLoading: () => <Progress value={40} />,
        onFailure: (error) => (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>Sign in required</EmptyTitle>
              <EmptyDescription>{error.message}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ),
        onSuccess: (items) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((project) => (
                <TableRow
                  key={project._id}
                  onClick={() => setSelectedProjectId(project._id)}
                >
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        project._id === selectedProjectId
                          ? "success"
                          : "outline"
                      }
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
      })}
    </aside>
  );
}
