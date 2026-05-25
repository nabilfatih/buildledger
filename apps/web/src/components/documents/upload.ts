import { Effect, Schema } from "effect";

import { getErrorMessage } from "@/lib/errors";

const UploadResponse = Schema.Struct({ storageId: Schema.String });

/** Uploads one file through a Convex storage upload URL. */
export const uploadFile = Effect.fn("documents.uploadFile")(function* (input: {
  readonly file: File;
  readonly uploadUrl: string;
}) {
  const response = yield* Effect.tryPromise({
    try: () =>
      fetch(input.uploadUrl, {
        body: input.file,
        headers: {
          "Content-Type": input.file.type || "application/octet-stream",
        },
        method: "POST",
      }),
    catch: getErrorMessage,
  });

  if (!response.ok) {
    return yield* Effect.fail("Document upload failed.");
  }

  const payloadText = yield* Effect.tryPromise({
    try: () => response.text(),
    catch: getErrorMessage,
  });
  const payload = yield* Effect.try({
    try: () => parseJson(payloadText),
    catch: getErrorMessage,
  });

  return yield* Schema.decodeUnknown(UploadResponse)(payload).pipe(
    Effect.mapError(() => "Upload response did not include a storage id.")
  );
});

/** Reads text-like files so the extraction field starts with useful content. */
export const readTextPreview = Effect.fn("documents.readTextPreview")(
  function* (file: File) {
    if (!isReadableText(file)) {
      return "";
    }

    return yield* Effect.tryPromise({
      try: () => file.text(),
      catch: () => "",
    });
  }
);

/** Parses browser JSON responses as unknown data for schema decoding. */
function parseJson(value: string): unknown {
  return JSON.parse(value);
}

/** Checks whether browser text extraction is appropriate for the selected file. */
function isReadableText(file: File) {
  if (file.type.startsWith("text/")) {
    return true;
  }

  return [".csv", ".md", ".txt"].some((suffix) =>
    file.name.toLowerCase().endsWith(suffix)
  );
}
