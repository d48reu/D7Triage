"use server";

import { revalidatePath } from "next/cache";
import { fetchOfficialMiamiDadeMunicipalityBoundaries } from "@/lib/location-intelligence";
import {
  getJurisdictionConfig,
  saveJurisdictionConfig,
  upsertAgency,
  upsertRoutingRule,
  upsertStaffMember,
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

export async function saveStaffMemberAction(formData: FormData) {
  const name = readRequiredText(formData, "name");
  upsertStaffMember({
    id: String(formData.get("staffMemberId") ?? "").trim() || undefined,
    name,
    email: String(formData.get("email") ?? "").trim(),
    roleLabel: String(formData.get("roleLabel") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
}

export async function saveRoutingRuleAction(formData: FormData) {
  const category = readRequiredText(formData, "category");
  upsertRoutingRule({
    category,
    municipalityName: String(formData.get("municipalityName") ?? "").trim(),
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
    stateKeywords: String(formData.get("stateKeywords") ?? "").trim(),
    countyKeywords: String(formData.get("countyKeywords") ?? "").trim(),
    utilityKeywords: String(formData.get("utilityKeywords") ?? "").trim(),
    privatePropertyKeywords: String(
      formData.get("privatePropertyKeywords") ?? "",
    ).trim(),
    schoolKeywords: String(formData.get("schoolKeywords") ?? "").trim(),
    transitKeywords: String(formData.get("transitKeywords") ?? "").trim(),
    parksKeywords: String(formData.get("parksKeywords") ?? "").trim(),
    districtBoundaryName: String(
      formData.get("districtBoundaryName") ?? "",
    ).trim(),
    districtBoundaryGeoJson: String(
      formData.get("districtBoundaryGeoJson") ?? "",
    ).trim(),
    municipalityBoundaryName: String(
      formData.get("municipalityBoundaryName") ?? "",
    ).trim(),
    municipalityBoundaryGeoJson: String(
      formData.get("municipalityBoundaryGeoJson") ?? "",
    ).trim(),
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
}

export async function loadOfficialMunicipalitiesAction() {
  const dataset = await fetchOfficialMiamiDadeMunicipalityBoundaries();
  const current = getJurisdictionConfig();
  saveJurisdictionConfig({
    districtMatchKeywords: current.districtMatchKeywords.join("\n"),
    districtOutsideKeywords: current.districtOutsideKeywords.join("\n"),
    stateKeywords: current.stateKeywords.join("\n"),
    countyKeywords: current.countyKeywords.join("\n"),
    utilityKeywords: current.utilityKeywords.join("\n"),
    privatePropertyKeywords: current.privatePropertyKeywords.join("\n"),
    schoolKeywords: current.schoolKeywords.join("\n"),
    transitKeywords: current.transitKeywords.join("\n"),
    parksKeywords: current.parksKeywords.join("\n"),
    districtBoundaryName: current.districtBoundaryName ?? "",
    districtBoundaryGeoJson: current.districtBoundaryGeoJson ?? "",
    municipalityBoundaryName: dataset.datasetName,
    municipalityBoundaryGeoJson: dataset.geoJson,
  });

  revalidatePath("/staff/routing");
  revalidatePath("/staff");
  revalidatePath("/staff/analytics");
}
