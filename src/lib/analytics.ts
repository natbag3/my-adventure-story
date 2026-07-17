// PostHog analytics wrapper.
// Reads VITE_POSTHOG_KEY at build time. If unset, all calls are no-ops
// (useful for local dev without a PostHog project).
import posthog from "posthog-js";

let initialised = false;
let enabled = false;

export function initAnalytics() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) {
    console.warn("[analytics] VITE_POSTHOG_KEY not set — analytics disabled");
    return;
  }
  posthog.init(key, {
    api_host: "https://us.i.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
  enabled = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!enabled) return;
  try {
    posthog.capture(event, properties);
  } catch (e) {
    console.error("[analytics] capture failed", e);
  }
}

export function identify(userId: string, properties?: Record<string, unknown>) {
  if (!enabled) return;
  try {
    posthog.identify(userId, properties);
  } catch (e) {
    console.error("[analytics] identify failed", e);
  }
}

export function resetAnalytics() {
  if (!enabled) return;
  try {
    posthog.reset();
  } catch (e) {
    console.error("[analytics] reset failed", e);
  }
}
