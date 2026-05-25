import { toastManager } from "@repo/design-system/components/ui/toast";
import { Effect } from "effect";

import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/errors";

/** Creates a Better Auth account and refreshes the current session. */
export function signUpWithEmail(value: {
  readonly email: string;
  readonly name: string;
  readonly password: string;
}) {
  return Effect.tryPromise({
    try: () =>
      authClient.signUp.email({
        email: value.email,
        name: value.name,
        password: value.password,
      }),
    catch: getErrorMessage,
  }).pipe(
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: () => authClient.getSession(),
        catch: getErrorMessage,
      })
    )
  );
}

/** Signs an existing user in and refreshes the current session. */
export function signInWithEmail(value: {
  readonly email: string;
  readonly password: string;
}) {
  return Effect.tryPromise({
    try: () =>
      authClient.signIn.email({
        email: value.email,
        password: value.password,
      }),
    catch: getErrorMessage,
  }).pipe(
    Effect.flatMap(() =>
      Effect.tryPromise({
        try: () => authClient.getSession(),
        catch: getErrorMessage,
      })
    )
  );
}

/** Shows a toast for Better Auth failures without shifting the page layout. */
export function showAuthError(description: string) {
  toastManager.add({
    title: "Authentication failed",
    description,
    type: "error",
  });
}
