"use client";

import { useActionState, type ReactNode } from "react";
import { formatStatus } from "@/lib/issue-types";
import {
  generateAiRoutingSuggestionAction,
  type GenerateAiSuggestionState,
  reviewAiSuggestionAction,
  type ReviewAiSuggestionState,
} from "@/server-actions/issues";

type Suggestion = NonNullable<GenerateAiSuggestionState["suggestion"]>;

export function AiSuggestionPanel({
  reportId,
  initialSuggestion,
  isEnabled,
  availabilityMessage,
  modelName,
  maxGenerationsPerDay,
  allowFeedback = true,
}: {
  reportId: string;
  initialSuggestion: Suggestion | null;
  isEnabled: boolean;
  availabilityMessage: string;
  modelName: string;
  maxGenerationsPerDay: number;
  allowFeedback?: boolean;
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
  const reviewInitialState: ReviewAiSuggestionState = {
    status: "idle",
    message: initialSuggestion?.feedbackDisposition
      ? "Staff feedback has been saved for this suggestion."
      : "Mark whether this suggestion was useful after review.",
    suggestion: initialSuggestion,
  };
  const [reviewState, reviewFormAction, isReviewPending] = useActionState(
    reviewAiSuggestionAction,
    reviewInitialState,
  );

  const suggestion = reviewState.suggestion ?? state.suggestion;

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

          <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Staff feedback
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Capture whether the suggestion helped and what needed correction.
                </p>
              </div>
              {suggestion.feedbackDisposition ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700">
                  {formatDisposition(suggestion.feedbackDisposition)}
                </span>
              ) : null}
            </div>

            <div
              className={`mt-3 rounded-md px-3 py-2 text-sm ${
                reviewState.status === "error"
                  ? "bg-rose-50 text-rose-800"
                  : reviewState.status === "success"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-white text-slate-600"
              }`}
            >
              {reviewState.message}
            </div>

            {allowFeedback ? (
              <form action={reviewFormAction} className="mt-3 space-y-3">
                <input type="hidden" name="reportId" value={reportId} />
                <input type="hidden" name="suggestionId" value={suggestion.id} />
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Outcome
                  </span>
                  <select
                    name="feedbackDisposition"
                    defaultValue={suggestion.feedbackDisposition || "accepted"}
                    className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="accepted">Accepted</option>
                    <option value="accepted_with_edits">Accepted with edits</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Feedback note
                  </span>
                  <textarea
                    name="feedbackNote"
                    defaultValue={suggestion.feedbackNote || ""}
                    className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-sky-700 focus:ring-2 focus:ring-sky-100"
                    placeholder="What was right, what needed editing, or why the suggestion missed."
                  />
                </label>
                <button
                  type="submit"
                  disabled={isReviewPending}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  {isReviewPending ? "Saving..." : "Save feedback"}
                </button>
                {suggestion.feedbackCreatedAt ? (
                  <p className="text-xs text-slate-500">
                    Last reviewed {new Date(suggestion.feedbackCreatedAt).toLocaleString()}
                  </p>
                ) : null}
              </form>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-600">
                Feedback capture is disabled in the hosted demo so the live AI result stays the focus.
              </div>
            )}
          </section>

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

function formatDisposition(value: "accepted" | "accepted_with_edits" | "rejected") {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
