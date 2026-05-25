import { QueryResult } from "@confect/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
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
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverClose,
  PopoverPopup,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { GenericId } from "convex/values";
import { useState } from "react";
import { WorkflowPanelSkeleton } from "@/components/protocol/skeleton";
import {
  type ReviewDraft,
  reviewKindItems,
  severityItems,
  statusItems,
} from "@/components/protocol/utils";
import type { ProtocolReviewResult } from "@/lib/confect-results";
import {
  formatDateInput,
  formatDisplayDate,
  parseDateInput,
} from "@/lib/dates";

/** Displays generated protocol items as editable review fields. */
export function ReviewEditor({
  drafts,
  onDraftChange,
  review,
}: {
  readonly drafts: readonly ReviewDraft[];
  readonly onDraftChange: (
    itemId: GenericId<"protocolItems">,
    patch: Partial<ReviewDraft>
  ) => void;
  readonly review: ProtocolReviewResult;
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
            <EmptyTitle>No generated records yet</EmptyTitle>
            <EmptyDescription>
              Generate a protocol from the Input tab to create review records.
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

/** Edits one generated protocol record with COSS form primitives. */
function ReviewItemEditor({
  draft,
  index,
  onDraftChange,
}: {
  readonly draft: ReviewDraft;
  readonly index: number;
  readonly onDraftChange: (
    itemId: GenericId<"protocolItems">,
    patch: Partial<ReviewDraft>
  ) => void;
}) {
  const selectedKind =
    reviewKindItems.find((item) => item.value === draft.kind) ??
    reviewKindItems[0];
  const selectedSeverity =
    severityItems.find((item) => item.value === draft.severity) ??
    severityItems[1];
  const selectedStatus =
    statusItems.find((item) => item.value === draft.status) ?? statusItems[0];
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);

  return (
    <Fieldset className="grid gap-3 border-border border-t pt-5 first:border-t-0 first:pt-0">
      <FieldsetLegend>Item {index + 1}</FieldsetLegend>
      <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)_12rem]">
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
        <Field>
          <FieldLabel>Status</FieldLabel>
          <Select
            items={statusItems}
            itemToStringValue={(item) => item.value}
            onValueChange={(item) => {
              if (!item) {
                return;
              }

              onDraftChange(draft.itemId, { status: item.value });
            }}
            value={selectedStatus}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
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
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <FieldLabel>Component</FieldLabel>
          <Input
            onChange={(event) =>
              onDraftChange(draft.itemId, { component: event.target.value })
            }
            placeholder="TG South"
            value={draft.component}
          />
        </Field>
        <Field>
          <FieldLabel>Object</FieldLabel>
          <Input
            onChange={(event) =>
              onDraftChange(draft.itemId, { objectName: event.target.value })
            }
            placeholder="Charging station"
            value={draft.objectName}
          />
        </Field>
        <Field>
          <FieldLabel>Trade</FieldLabel>
          <Input
            onChange={(event) =>
              onDraftChange(draft.itemId, { trade: event.target.value })
            }
            placeholder="ELT"
            value={draft.trade}
          />
        </Field>
      </div>
      {draft.kind === "task" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel>Responsible Party</FieldLabel>
            <Input
              onChange={(event) =>
                onDraftChange(draft.itemId, {
                  responsibleParty: event.target.value,
                })
              }
              placeholder="Site manager"
              value={draft.responsibleParty}
            />
          </Field>
          <Field>
            <FieldLabel>Due Date</FieldLabel>
            <Popover onOpenChange={setIsDueDateOpen} open={isDueDateOpen}>
              <PopoverTrigger
                render={
                  <Button
                    className="w-full justify-between"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <span>
                  {draft.dueDate
                    ? formatDisplayDate(draft.dueDate)
                    : "No Due Date"}
                </span>
                <HugeIcons icon={Calendar03Icon} />
              </PopoverTrigger>
              <PopoverPopup align="start">
                <Calendar
                  mode="single"
                  onSelect={(date) => {
                    if (!date) {
                      return;
                    }

                    onDraftChange(draft.itemId, {
                      dueDate: formatDateInput(date),
                    });
                    setIsDueDateOpen(false);
                  }}
                  selected={parseDateInput(draft.dueDate)}
                />
                <PopoverClose
                  render={
                    <Button
                      onClick={() =>
                        onDraftChange(draft.itemId, { dueDate: "" })
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  Clear Due Date
                </PopoverClose>
              </PopoverPopup>
            </Popover>
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
