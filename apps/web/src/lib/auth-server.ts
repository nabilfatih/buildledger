import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import {
  getPublicConvexSiteUrl,
  getPublicConvexUrl,
} from "@/lib/public-config";

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexSiteUrl: getPublicConvexSiteUrl(),
  convexUrl: getPublicConvexUrl(),
});
