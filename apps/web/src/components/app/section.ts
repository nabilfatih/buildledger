import {
  AiBrain01Icon,
  Analytics01Icon,
  FileAttachmentIcon,
  TableIcon,
  TimelineListIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons";

export const workspaceSections = [
  {
    icon: WorkflowSquare01Icon,
    label: "Protocols",
    value: "protocols",
  },
  {
    icon: TableIcon,
    label: "Ledger",
    value: "ledger",
  },
  {
    icon: TimelineListIcon,
    label: "Logbook",
    value: "logbook",
  },
  {
    icon: FileAttachmentIcon,
    label: "Documents",
    value: "documents",
  },
  {
    icon: AiBrain01Icon,
    label: "Intelligence",
    value: "intelligence",
  },
  {
    icon: Analytics01Icon,
    label: "Reports",
    value: "reports",
  },
] as const;

export type WorkspaceSection = (typeof workspaceSections)[number]["value"];
