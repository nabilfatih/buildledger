"use client";

import { useCallback, useSyncExternalStore } from "react";

const BREAKPOINTS = {
  "2xl": 1536,
  "3xl": 1600,
  "4xl": 2000,
  lg: 1024,
  md: 800,
  sm: 640,
  xl: 1280,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

type BreakpointQuery =
  | Breakpoint
  | `max-${Breakpoint}`
  | `${Breakpoint}:max-${Breakpoint}`;

/** Checks whether a route/query segment names a configured breakpoint. */
function isBreakpoint(value: string): value is Breakpoint {
  return value in BREAKPOINTS;
}

/** Formats a lower-bound media query for a breakpoint or pixel value. */
function resolveMin(value: Breakpoint | number): string {
  const px = typeof value === "number" ? value : BREAKPOINTS[value];
  return `(min-width: ${px}px)`;
}

/** Formats an upper-bound media query for a breakpoint or pixel value. */
function resolveMax(value: Breakpoint | number): string {
  const px = typeof value === "number" ? value : BREAKPOINTS[value];
  return `(max-width: ${px - 1}px)`;
}

/** Converts object media-query input into a browser media query string. */
function parseObjectQuery(query: MediaQueryInput): string {
  const parts: string[] = [];

  if (query.min != null) {
    parts.push(resolveMin(query.min));
  }

  if (query.max != null) {
    parts.push(resolveMax(query.max));
  }

  if (query.pointer === "coarse") {
    parts.push("(pointer: coarse)");
  }

  if (query.pointer === "fine") {
    parts.push("(pointer: fine)");
  }

  if (parts.length === 0) {
    return "(min-width: 0px)";
  }

  return parts.join(" and ");
}

/** Converts breakpoint shorthand into a browser media query string. */
function parseStringQuery(query: BreakpointQuery | (string & {})): string {
  if (query.startsWith("(")) {
    return query;
  }

  const parts: string[] = [];
  for (const segment of query.split(":")) {
    if (segment.startsWith("max-")) {
      const bp = segment.slice(4);
      if (isBreakpoint(bp)) {
        parts.push(resolveMax(bp));
      }
    } else if (isBreakpoint(segment)) {
      parts.push(resolveMin(segment));
    }
  }

  return parts.length > 0 ? parts.join(" and ") : query;
}

/** Normalizes every supported media query input format. */
function parseQuery(
  query: BreakpointQuery | MediaQueryInput | (string & {})
): string {
  if (typeof query !== "string") {
    return parseObjectQuery(query);
  }

  return parseStringQuery(query);
}

/** Keeps server rendering deterministic before the browser exists. */
function getServerSnapshot(): boolean {
  return false;
}

export interface MediaQueryInput {
  max?: Breakpoint | number;
  min?: Breakpoint | number;
  /** Touch-like input (finger). Use "fine" for mouse/trackpad. */
  pointer?: "coarse" | "fine";
}

/** Stable cleanup function for server-side subscriptions. */
function noop() {
  return;
}

/** Subscribes to a browser media query with SSR-safe defaults. */
export function useMediaQuery(
  query: BreakpointQuery | MediaQueryInput | (string & {})
): boolean {
  const mediaQuery = parseQuery(query);

  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === "undefined") {
        return noop;
      }
      const mql = window.matchMedia(mediaQuery);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [mediaQuery]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(mediaQuery).matches;
  }, [mediaQuery]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Tracks the app's mobile breakpoint. */
export function useIsMobile(): boolean {
  return useMediaQuery("max-md");
}
