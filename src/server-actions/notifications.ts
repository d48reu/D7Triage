"use server";

import { revalidatePath } from "next/cache";
import type { NotificationTemplateKey } from "@/lib/notification-template-definitions";
import { upsertNotificationTemplate } from "@/lib/issues-repository";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function saveNotificationTemplateAction(formData: FormData) {
  const key = readRequiredText(
    formData,
    "templateKey",
  ) as NotificationTemplateKey;

  upsertNotificationTemplate({
    key,
    subjectTemplate: readRequiredText(formData, "subjectTemplate"),
    bodyTemplate: readRequiredText(formData, "bodyTemplate"),
  });

  revalidatePath("/staff/notifications");
}
