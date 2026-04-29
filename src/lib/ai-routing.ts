import OpenAI from "openai";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import { ISSUE_CATEGORIES } from "@/lib/issue-types";
import {
  type Agency,
  type IssueReport,
  type ManagedRoutingRule,
  addAiSuggestion,
  getIssueReportById,
  getManagedRoutingRule,
  listAgencies,
  listManagedRoutingRules,
} from "@/lib/issues-repository";

type RawAiSuggestion = {
  summary: string;
  suggestedCategory: string;
  suggestedUrgency: "low" | "medium" | "high" | "emergency_redirect";
  suggestedAgencyId: string | "none";
  suggestedResponsibleParty: string;
  confidence: "low" | "medium" | "high";
  explanation: string;
  recommendedNextStep: string;
  missingInformation: string[];
  draftResponse: string;
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function getRoutingModel() {
  return process.env.OPENAI_ROUTING_MODEL || "gpt-5-mini";
}

function getResponseSchema(agencyIds: string[]) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      suggestedCategory: {
        type: "string",
        enum: [...ISSUE_CATEGORIES],
      },
      suggestedUrgency: {
        type: "string",
        enum: ["low", "medium", "high", "emergency_redirect"],
      },
      suggestedAgencyId: {
        type: "string",
        enum: [...agencyIds, "none"],
      },
      suggestedResponsibleParty: { type: "string" },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      explanation: { type: "string" },
      recommendedNextStep: { type: "string" },
      missingInformation: {
        type: "array",
        items: { type: "string" },
      },
      draftResponse: { type: "string" },
    },
    required: [
      "summary",
      "suggestedCategory",
      "suggestedUrgency",
      "suggestedAgencyId",
      "suggestedResponsibleParty",
      "confidence",
      "explanation",
      "recommendedNextStep",
      "missingInformation",
      "draftResponse",
    ],
  };
}

function buildPrompt(input: {
  report: IssueReport;
  currentRule: ManagedRoutingRule | null;
  agencies: Agency[];
  routingRules: ManagedRoutingRule[];
}) {
  return [
    "Report:",
    JSON.stringify(
      {
        category: input.report.category,
        description: input.report.description,
        addressText: input.report.addressText,
        preferredLanguage: input.report.preferredLanguage,
      },
      null,
      2,
    ),
    "",
    "Current routing rule for the report category:",
    JSON.stringify(input.currentRule, null, 2),
    "",
    "Available active agencies:",
    JSON.stringify(
      input.agencies.map((agency) => ({
        id: agency.id,
        name: agency.name,
        contactName: agency.contactName,
        contactEmail: agency.contactEmail,
        contactPhone: agency.contactPhone,
        defaultReferralMethod: agency.defaultReferralMethod,
        escalationNotes: agency.escalationNotes,
      })),
      null,
      2,
    ),
    "",
    "Routing rules for all categories:",
    JSON.stringify(
      input.routingRules.map((rule) => ({
        category: rule.category,
        agencyId: rule.agencyId,
        ownerLabel: rule.ownerLabel,
        staffGuidance: rule.staffGuidance,
        residentExplanation: rule.residentExplanation,
        escalationNotes: rule.escalationNotes,
      })),
      null,
      2,
    ),
    "",
    "Choose the best category and agency only from the provided data. If nothing clearly fits, return suggestedAgencyId as 'none' and keep confidence low. Do not invent a new agency. Draft a resident response that is factual, brief, and does not overpromise.",
  ].join("\n");
}

function extractResponseText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text;
  }

  const outputItem = response.output?.find(
    (item) => item.type === "message",
  );
  const textItem = outputItem && "content" in outputItem
    ? outputItem.content.find((item) => item.type === "output_text")
    : null;

  if (textItem && "text" in textItem) {
    return textItem.text;
  }

  throw new Error("OpenAI did not return structured output text.");
}

export async function generateAiRoutingSuggestion(reportId: string) {
  const report = getIssueReportById(reportId);
  if (!report) {
    throw new Error("Report not found.");
  }

  const currentRule = getManagedRoutingRule(report.category);
  const agencies = listAgencies().filter((agency) => agency.isActive);
  const routingRules = listManagedRoutingRules();
  const client = getOpenAIClient();

  const response = (await client.responses.create({
    model: getRoutingModel(),
    input: [
      {
        role: "system",
        content:
          "You assist District 7 staff with issue-routing suggestions. Use only the provided routing rules and agencies. Never invent a department or agency. Prefer caution when confidence is low.",
      },
      {
        role: "user",
        content: buildPrompt({ report, currentRule, agencies, routingRules }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "routing_suggestion",
        strict: true,
        schema: getResponseSchema(agencies.map((agency) => agency.id)),
      },
    },
  })) as OpenAIResponse;

  const parsed = JSON.parse(extractResponseText(response)) as RawAiSuggestion;
  const agencyId =
    parsed.suggestedAgencyId !== "none" ? parsed.suggestedAgencyId : null;
  const agency = agencyId
    ? agencies.find((candidate) => candidate.id === agencyId) ?? null
    : null;

  return addAiSuggestion({
    reportId,
    summary: parsed.summary,
    suggestedCategory: parsed.suggestedCategory,
    suggestedUrgency: parsed.suggestedUrgency,
    suggestedResponsibleParty:
      agency?.name || parsed.suggestedResponsibleParty,
    suggestedAgencyId: agency?.id ?? null,
    confidence: parsed.confidence,
    explanation: parsed.explanation,
    recommendedNextStep: parsed.recommendedNextStep,
    missingInformation: parsed.missingInformation,
    draftResponse: parsed.draftResponse,
  });
}
