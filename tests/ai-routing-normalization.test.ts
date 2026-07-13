import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAiSuggestionCategory } from "../src/lib/ai-routing";

test("keeps storm-drain traffic issues out of water-meter routing", () => {
  const normalized = normalizeAiSuggestionCategory(
    {
      category: "TRAFFIC",
      description:
        "A storm drain on the northbound right lane is below street level and affecting traffic flow.",
      addressText: "6690 SW 40th St, Miami, FL 33155",
    },
    "WATER METER READING",
  );

  assert.equal(normalized, "FLOODING");
});

test("lets housing text override a legacy road category in AI suggestions", () => {
  const normalized = normalizeAiSuggestionCategory(
    {
      category: "Roads and potholes",
      description:
        "Resident needs help with HCD housing voucher renewal and possible lease termination.",
      addressText: "3150 Mundy Street, Miami, FL 33133",
    },
    "Roads and potholes",
  );

  assert.equal(normalized, "HOUSING");
});
