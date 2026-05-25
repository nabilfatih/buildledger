import {
  Building06Icon,
  Cancel01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import {
  useIntersection,
  useIsomorphicEffect,
  usePrevious,
} from "@mantine/hooks";
import { Button } from "@repo/design-system/components/ui/button";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@repo/design-system/components/ui/input-group";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@repo/design-system/components/ui/sidebar";
import type { GenericId } from "convex/values";
import { useMemo, useState } from "react";

import { AuthMenu } from "@/components/auth/menu";
import { NewProjectSheet } from "@/components/rail/create";
import { ThemeMenu } from "@/components/rail/theme";
import { AiSettingsSheet } from "@/components/settings/ai";
import type { ProjectsResult } from "@/lib/confect-results";

const projectSkeletonRows = [
  "project-1",
  "project-2",
  "project-3",
  "project-4",
  "project-5",
  "project-6",
];

const projectPageSize = 8;

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
  const { entry, ref: loadMoreRef } = useIntersection<HTMLLIElement>({
    threshold: 0.25,
  });
  const isLoadMoreVisible = entry?.isIntersecting ?? false;
  const wasLoadMoreVisible = usePrevious(isLoadMoreVisible);
  const { loadMore, status } = projects;
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects.results;
    }

    return projects.results.filter((project) =>
      `${project.name} ${project.code}`.toLowerCase().includes(query)
    );
  }, [projects.results, search]);
  const canLoadMoreProjects = status === "CanLoadMore";
  const isLoadingInitialProjects = status === "LoadingFirstPage";
  const isLoadingMoreProjects = status === "LoadingMore";
  const showEmptyProjects =
    filteredProjects.length === 0 &&
    !isLoadingInitialProjects &&
    status === "Exhausted";

  useIsomorphicEffect(() => {
    if (!(isLoadMoreVisible && canLoadMoreProjects)) {
      return;
    }

    if (wasLoadMoreVisible) {
      return;
    }

    loadMore(projectPageSize);
  }, [canLoadMoreProjects, isLoadMoreVisible, loadMore, wasLoadMoreVisible]);

  return (
    <Sidebar
      className="[&_[data-slot=sidebar-inner]]:border-0 [&_[data-slot=sidebar-inner]]:shadow-none"
      collapsible="offcanvas"
      variant="inset"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 min-w-0 items-center gap-2 rounded-lg px-2 text-sidebar-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <HugeIcons icon={Building06Icon} />
              </span>
              <div className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-heading font-medium text-sm">
                  BuildLedger
                </span>
                <span className="truncate text-sidebar-foreground/72 text-xs">
                  Project Memory
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NewProjectSheet
              canCreateProject={!isLoadingInitialProjects}
              onCreated={setSelectedProjectId}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent className="grid gap-2">
            <InputGroup>
              <InputGroupInput
                onChange={(event) => setSearch(event.target.value)}
                onInput={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search projects"
                type="text"
                value={search}
              />
              <InputGroupAddon>
                <InputGroupText>
                  <HugeIcons className="mx-0 size-4" icon={Search01Icon} />
                </InputGroupText>
              </InputGroupAddon>
              {search ? (
                <InputGroupAddon align="inline-end">
                  <Button
                    aria-label="Clear project search"
                    onClick={() => setSearch("")}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <HugeIcons icon={Cancel01Icon} />
                  </Button>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <SidebarMenu>
              {isLoadingInitialProjects
                ? projectSkeletonRows.map((row) => (
                    <SidebarMenuItem key={row}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  ))
                : filteredProjects.map((project) => (
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
                    </SidebarMenuItem>
                  ))}
              {showEmptyProjects ? (
                <SidebarMenuItem>
                  <p className="px-2 py-1 text-muted-foreground text-sm">
                    No projects found.
                  </p>
                </SidebarMenuItem>
              ) : null}
              {canLoadMoreProjects || isLoadingMoreProjects ? (
                <SidebarMenuItem ref={loadMoreRef}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <AuthMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ThemeMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AiSettingsSheet />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
