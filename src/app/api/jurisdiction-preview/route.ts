import { NextResponse } from "next/server";
import {
  analyzeReportJurisdiction,
  formatDistrictHintStatus,
  formatOwnershipHint,
} from "@/lib/jurisdiction";
import { getJurisdictionConfig } from "@/lib/issues-repository";
import { findCountyCommissionDistrictForPoint } from "@/lib/location-intelligence";
import { resolveReportLocationIntelligence } from "@/lib/report-location-intelligence";
import { getStaffActionActor } from "@/lib/staff-action-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await getStaffActionActor())) {
    return new NextResponse("Staff sign-in required", { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      addressText?: string;
      latitude?: number | null;
      longitude?: number | null;
    };

    const addressText = String(body.addressText ?? "").trim();
    if (!addressText) {
      return NextResponse.json(
        { ok: false, message: "Address is required." },
        { status: 400 },
      );
    }

    const latitude =
      typeof body.latitude === "number" && Number.isFinite(body.latitude)
        ? body.latitude
        : null;
    const longitude =
      typeof body.longitude === "number" && Number.isFinite(body.longitude)
        ? body.longitude
        : null;

    const locationIntelligence = await resolveReportLocationIntelligence({
      addressText,
      latitude,
      longitude,
    });
    const jurisdictionConfig = getJurisdictionConfig();
    const assessment = analyzeReportJurisdiction(
      {
        category: "Other / unsure",
        description: "",
        addressText,
        ...locationIntelligence,
      },
      jurisdictionConfig,
    );
    const countyCommissionDistrict = findCountyCommissionDistrictForPoint(
      locationIntelligence.latitude,
      locationIntelligence.longitude,
      jurisdictionConfig,
    );

    return NextResponse.json({
      ok: true,
      districtHintStatus: assessment.districtHintStatus,
      districtLabel: formatDistrictHintStatus(assessment.districtHintStatus),
      ownershipLabel: formatOwnershipHint(assessment.ownershipHint),
      confidence: assessment.confidence,
      summary: assessment.summary,
      residentExplanation: assessment.residentExplanation,
      municipalityName: locationIntelligence.municipalityName,
      geocodedAddress: locationIntelligence.geocodedAddress,
      countyCommissionDistrictNumber:
        countyCommissionDistrict?.districtNumber ?? null,
      countyCommissionerName: countyCommissionDistrict?.commissionerName ?? null,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "We couldn’t preview District 7 coverage right now.",
      },
      { status: 500 },
    );
  }
}
