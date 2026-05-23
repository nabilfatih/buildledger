import { QueryResult } from "@confect/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Field, FieldLabel } from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import { Form } from "@repo/design-system/components/ui/form";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { GenericId } from "convex/values";

import {
  type ReviewDraft,
  reviewKindItems,
  severityItems,
} from "@/components/meeting-workspace-utils";
import { WorkflowPanelSkeleton } from "@/components/workflow-panel-skeleton";
import type { ReviewResult } from "@/lib/confect-results";

/** Displays generated minute items as editable review fields. */
export function ReviewEditor({
  drafts,
  onDraftChange,
  review,
}: {
  readonly drafts: readonly ReviewDraft[];
  readonly onDraftChange: (
    itemId: GenericId<"minuteItems">,
    patch: Partial<ReviewDraft>
  ) => void;
  readonly review: ReviewResult;
}) {
  return QueryResult.match(review, {
    onLoading: () => <WorkflowPanelSkeleton />,
    onFailure: (error) => (
      <Empty className="min-h-56">
        <EmptyHeader>
          <EmptyTitle>Review unavailable</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    ),
    onSuccess: (state) =>
      state.items.length === 0 ? (
        <Empty className="min-h-56">
          <EmptyHeader>
            <EmptyTitle>No generated minutes yet</EmptyTitle>
            <EmptyDescription>
              Generate minutes from the Input tab to create review items.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Form className="grid min-w-0 gap-5">
          {drafts.map((draft, index) => (
            <ReviewItemEditor
              draft={draft}
              index={index}
              key={draft.itemId}
              onDraftChange={onDraftChange}
            />
          ))}
        </Form>
      ),
  });
}

/** Edits one generated minutes item with COSS form primitives. */
function ReviewItemEditor({
  draft,
  index,
  onDraftChange,
}: {
  readonly draft: ReviewDraft;
  readonly index: number;
  readonly onDraftChange: (
    itemId: GenericId<"minuteItems">,
    patch: Partial<ReviewDraft>
  ) => void;
}) {
  const selectedKind =
    reviewKindItems.find((item) => item.value === draft.kind) ??
    reviewKindItems[0];
  const selectedSeverity =
    severityItems.find((item) => item.value === draft.severity) ??
    severityItems[1];

  return (
    <Fieldset className="grid gap-3 border-border border-t pt-5 first:border-t-0 first:pt-0">
      <FieldsetLegend>Item {index + 1}</FieldsetLegend>
      <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
        <Field>
          <FieldLabel>Kind</FieldLabel>
          <Select
            items={reviewKindItems}
            itemToStringValue={(item) => item.value}
            onValueChange={(item) => {
              if (!item) {
                return;
              }

              onDraftChange(draft.itemId, { kind: item.value });
            }}
            value={selectedKind}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kind" />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {reviewKindItems.map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Title</FieldLabel>
          <Input
            onChange={(event) =>
              onDraftChange(draft.itemId, { title: event.target.value })
            }
            value={draft.title}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Body</FieldLabel>
        <Textarea
          onChange={(event) =>
            onDraftChange(draft.itemId, { body: event.target.value })
          }
          value={draft.body}
        />
      </Field>
      {draft.kind === "action" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>Owner</FieldLabel>
            <Input
              onChange={(event) =>
                onDraftChange(draft.itemId, { ownerName: event.target.value })
              }
              placeholder="Owner"
              value={draft.ownerName}
            />
          </Field>
          <Field>
            <FieldLabel>Due Date</FieldLabel>
            <Input
              onChange={(event) =>
                onDraftChange(draft.itemId, { dueDate: event.target.value })
              }
              type="date"
              value={draft.dueDate}
            />
          </Field>
        </div>
      ) : null}
      {draft.kind === "risk" ? (
        <Field>
          <FieldLabel>Severity</FieldLabel>
          <Select
            items={severityItems}
            itemToStringValue={(item) => item.value}
            onValueChange={(item) => {
              if (!item) {
                return;
              }

              onDraftChange(draft.itemId, { severity: item.value });
            }}
            value={selectedSeverity}
          >
            <SelectTrigger>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {severityItems.map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
      ) : null}
    </Fieldset>
  );
}
