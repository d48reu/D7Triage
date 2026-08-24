"use client";

import { useEffect } from "react";
import {
  recordStaffOperationalEventAction,
  type StaffOperationalEventInput,
} from "@/server-actions/operations";

let reportedUnhandledEvents = 0;

export function StaffClientMonitor() {
  useEffect(() => {
    function recordUnhandledError() {
      if (reportedUnhandledEvents >= 5) return;
      reportedUnhandledEvents += 1;
      reportStaffClientEvent({
        eventType: "client_unhandled_error",
        severity: "error",
        action: "render_or_event_handler",
        outcome: "failed",
        errorCode: "client_unhandled",
      });
    }

    window.addEventListener("error", recordUnhandledError);
    window.addEventListener("unhandledrejection", recordUnhandledError);
    return () => {
      window.removeEventListener("error", recordUnhandledError);
      window.removeEventListener("unhandledrejection", recordUnhandledError);
    };
  }, []);

  return null;
}

export function reportStaffClientEvent(
  input: Omit<
    StaffOperationalEventInput,
    "route" | "browserFamily" | "viewportWidth" | "viewportHeight"
  >,
) {
  const payload: StaffOperationalEventInput = {
    ...input,
    route: window.location.pathname,
    browserFamily: detectBrowserFamily(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
  void recordStaffOperationalEventAction(payload).catch(() => {
    // Diagnostics must never interfere with staff work.
  });
}

function detectBrowserFamily() {
  const userAgent = navigator.userAgent;
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return "Other";
}
