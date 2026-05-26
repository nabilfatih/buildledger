import { Badge } from "@repo/design-system/components/ui/badge";

/** Shows report lifecycle status using the shared semantic badge language. */
export function ReportStatusBadge({
  status,
}: {
  readonly status: "draft" | "published";
}) {
  return (
    <Badge variant={status === "published" ? "success" : "outline"}>
      {status === "published" ? "Published" : "Draft"}
    </Badge>
  );
}
