"use server";

import { revalidatePath } from "next/cache";
import {
  saveJurisdictionConfig,
  upsertAgency,
  upsertRoutingRule,
} from "@/lib/issues-repository";

function readRequiredText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function saveAgencyAction(formData: FormData) {
  const name = readRequiredText(formData, "name");
  upsertAgency({
    id: String(formData.get("agencyId") ?? "").trim() || undefined,
    name,
    contactName: String(formData.get("contactName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim(),
    contactUrl: String(formData.get("contactUrl") ?? "").trim(),
    defaultReferralMethod: String(
      formData.get("defaultReferralMethod") ?? "",
    ).trim(),
    escalationNotes: String(formData.get("escalationNotes") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
}

export async function saveRoutingRuleAction(formData: FormData) {
  const category = readRequiredText(formData, "category");
  upsertRoutingRule({
    category,
    agencyId: String(formData.get("agencyId") ?? "").trim() || undefined,
    ownerLabel: String(formData.get("ownerLabel") ?? "").trim(),
    staffGuidance: readRequiredText(formData, "staffGuidance"),
    residentExplanation: readRequiredText(formData, "residentExplanation"),
    escalationNotes: readRequiredText(formData, "escalationNotes"),
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
}

export async function saveJurisdictionConfigAction(formData: FormData) {
  saveJurisdictionConfig({
    districtMatchKeywords: String(
      formData.get("districtMatchKeywords") ?? "",
    ).trim(),
    districtOutsideKeywords: String(
      formData.get("districtOutsideKeywords") ?? "",
    ).trim(),
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
}
