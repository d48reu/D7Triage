"use server";

import { revalidatePath } from "next/cache";
import { upsertAnalyticsView } from "@/lib/issues-repository";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function saveAnalyticsViewAction(formData: FormData) {
  upsertAnalyticsView({
    name: readRequiredText(formData, "name"),
    preset: String(formData.get("preset") ?? "all").trim() || "all",
    dateFrom: String(formData.get("dateFrom") ?? "").trim() || null,
    dateTo: String(formData.get("dateTo") ?? "").trim() || null,
  });

  revalidatePath("/staff/analytics");
}
