export const NOTIFICATION_TEMPLATE_DEFINITIONS = [
  {
    key: "confirmation",
    label: "Confirmation",
    subjectTemplate: "District 7 received your report",
    bodyTemplate:
      "Thanks for reporting this issue. We received your report about {{category_lower}} at {{address}}. Staff will review it and follow up if more information is needed. Your tracking token is {{trackingToken}}.",
  },
  {
    key: "needs_more_info",
    label: "Needs more info",
    subjectTemplate: "District 7 needs a bit more information",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "routed",
    label: "Routing update",
    subjectTemplate: "District 7 routed your report for review",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "awaiting_agency",
    label: "Awaiting agency",
    subjectTemplate: "District 7 is waiting on the responsible agency",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "follow_up_due",
    label: "Follow-up",
    subjectTemplate: "District 7 is following up on your report",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "resolved",
    label: "Resolution",
    subjectTemplate: "District 7 marked your report resolved",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "outside_jurisdiction",
    label: "Outside jurisdiction",
    subjectTemplate: "District 7 reviewed your report",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "duplicate_linked",
    label: "Duplicate linkage",
    subjectTemplate: "District 7 linked your report to an existing case",
    bodyTemplate: "{{publicNote_or_default}}",
  },
  {
    key: "status_update",
    label: "Generic status update",
    subjectTemplate: "District 7 update: {{status}}",
    bodyTemplate: "{{publicNote_or_default}}",
  },
] as const;

export type NotificationTemplateKey =
  (typeof NOTIFICATION_TEMPLATE_DEFINITIONS)[number]["key"];
