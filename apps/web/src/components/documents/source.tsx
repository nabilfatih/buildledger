import { Link02Icon, Upload04Icon } from "@hugeicons/core-free-icons";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@repo/design-system/components/ui/field";
import {
  Fieldset,
  FieldsetLegend,
} from "@repo/design-system/components/ui/fieldset";
import { HugeIcons } from "@repo/design-system/components/ui/huge-icons";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Toolbar,
  ToolbarGroup,
} from "@repo/design-system/components/ui/toolbar";

interface DocumentSourceControlsProps {
  readonly canAttachCurrentSource: boolean;
  readonly canSaveText: boolean;
  readonly extractedText: string;
  readonly isAttaching: boolean;
  readonly isSavingText: boolean;
  readonly isUploading: boolean;
  readonly onAttachCurrentSource: () => void;
  readonly onExtractedTextChange: (value: string) => void;
  readonly onFileChange: (file: File | undefined) => void;
  readonly onSaveText: () => void;
}

/** Renders the document source form with COSS field primitives. */
export function DocumentSourceControls({
  canAttachCurrentSource,
  canSaveText,
  extractedText,
  isAttaching,
  isSavingText,
  isUploading,
  onAttachCurrentSource,
  onExtractedTextChange,
  onFileChange,
  onSaveText,
}: DocumentSourceControlsProps) {
  return (
    <>
      <Fieldset className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <FieldsetLegend className="sr-only">
          Source Document Controls
        </FieldsetLegend>
        <Field>
          <FieldLabel>Source File</FieldLabel>
          <Input
            disabled={isUploading}
            onChange={(event) => {
              onFileChange(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
            type="file"
          />
          <FieldDescription>
            Text files prefill extraction; other files can be pasted below.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Extracted Text</FieldLabel>
          <Textarea
            className="min-h-28"
            onChange={(event) => onExtractedTextChange(event.target.value)}
            placeholder="Paste extracted document text before attaching it to a protocol."
            value={extractedText}
          />
        </Field>
      </Fieldset>

      <Toolbar className="flex-wrap">
        <ToolbarGroup className="flex-wrap">
          <Button
            disabled={!canSaveText}
            loading={isSavingText}
            onClick={onSaveText}
            size="sm"
            type="button"
            variant="secondary"
          >
            <HugeIcons icon={Upload04Icon} /> Save Text
          </Button>
          <Button
            disabled={!canAttachCurrentSource}
            loading={isAttaching}
            onClick={onAttachCurrentSource}
            size="sm"
            type="button"
          >
            <HugeIcons icon={Link02Icon} /> Attach Current Source
          </Button>
        </ToolbarGroup>
      </Toolbar>
    </>
  );
}
