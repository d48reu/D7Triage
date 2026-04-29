"use client";

import { useActionState, type ReactNode } from "react";
import { formatStatus } from "@/lib/issue-types";
import {
  generateAiRoutingSuggestionAction,
  type GenerateAiSuggestionState,
} from "@/server-actions/issues";

type Suggestion = NonNullable<GenerateAiSuggestionState["suggestion"]>;

export function AiSuggestionPanel({
  reportId,
  initialSuggestion,
  isEnabled,
  availabilityMessage,
  modelName,
  maxGenerationsPerDay,
}: {
  reportId: string;
  initialSuggestion: Suggestion | null;
  isEnabled: boolean;
  availabilityMessage: string;
  modelName: string;
  maxGenerationsPerDay: number;
}) {
  const initialState: GenerateAiSuggestionState = {
    status: "idle",
    message: initialSuggestion
      ? "Latest saved suggestion shown below."
      : availabilityMessage,
    suggestion: initialSuggestion,
  };

  const [state, formAction, isPending] = useActionState(
    generateAiRoutingSuggestionAction,
    initialState,
  );

  const suggestion = state.suggestion;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AI routing suggestion</h2>
          <p className="mt-1 text-sm text-slate-600">
            Generated from the report, active agencies, and managed routing rules.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Model: {modelName} | Limit: {maxGenerationsPerDay} runs per report per
            day
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="reportId" value={reportId} />
          <button
            type="submit"
            disabled={isPending || !isEnabled}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {isPending
              ? "Generating..."
              : suggestion
                ? "Regenerate"
                : "Generate"}
          </button>
        </form>
      </div>

      <div
        className={`mt-4 rounded-md px-3 py-2 text-sm ${
          state.status === "error"
            ? "bg-rose-50 text-rose-800"
            : state.status === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-slate-50 text-slate-600"
        }`}
      >
        {state.message}
      </div>

      {suggestion ? (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Suggested category"
              value={suggestion.suggestedCategory}
            />
            <Detail
              label="Suggested urgency"
              value={formatStatus(suggestion.suggestedUrgency)}
            />
            <Detail
              label="Responsible party"
              value={suggestion.suggestedResponsibleParty}
            />
            <Detail label="Confidence" value={formatStatus(suggestion.confidence)} />
          </div>

          <Block title="Summary">{suggestion.summary}</Block>
          <Block title="Why">{suggestion.explanation}</Block>
          <Block title="Recommended next step">
            {suggestion.recommendedNextStep}
          </Block>
          <Block title="Draft resident response">
            {suggestion.draftResponse}
          </Block>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail label="Model" value={suggestion.model || modelName} />
            <Detail
              label="Token usage"
              value={
                suggestion.totalTokens !== null
                  ? `${suggestion.totalTokens} total (${suggestion.inputTokens ?? 0} in / ${suggestion.outputTokens ?? 0} out)`
                  : "Not captured"
              }
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Missing information
            </h3>
            {suggestion.missingInformation.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {suggestion.missingInformation.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded-md bg-slate-50 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                No major missing information flagged.
              </p>
            )}
          </div>

          <div className="text-xs text-slate-500">
            Generated {new Date(suggestion.createdAt).toLocaleString()}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {children}
      </p>
    </div>
  );
}
