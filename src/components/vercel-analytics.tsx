"use client";

import { Analytics } from "@vercel/analytics/next";

// Page-view analytics only. Resident tracking tokens, attachment ids, and
// staff record ids are replaced with placeholders before anything leaves the
// browser, and query strings are dropped entirely.
const REDACTIONS: Array<[RegExp, string]> = [
  [/^(\/report\/)(?!demo-submission(?:[/?#]|$))[^/?#]+/, "$1[trackingToken]"],
  [/^(\/(?:attachments|event-attachments|historical-attachments)\/)[^/?#]+/, "$1[id]"],
  [/^(\/staff\/history\/events\/)[^/?#]+/, "$1[id]"],
  [
    /^(\/staff\/(?:reports|events|history)\/)(?!new(?:[/?#]|$)|import(?:[/?#]|$)|events(?:[/?#]|$))[^/?#]+/,
    "$1[id]",
  ],
];

export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url);
          let path = url.pathname;
          for (const [pattern, replacement] of REDACTIONS) {
            path = path.replace(pattern, replacement);
          }
          url.pathname = path;
          url.search = "";
          url.hash = "";
          return { ...event, url: url.toString() };
        } catch {
          return null;
        }
      }}
    />
  );
}
