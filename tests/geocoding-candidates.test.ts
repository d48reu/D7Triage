import assert from "node:assert/strict";
import test from "node:test";
import { getAddressCandidates } from "../src/lib/geocoding";

test("adds geocodable candidates for cross streets and corridors", () => {
  assert.deepEqual(
    getAddressCandidates("corner of SW 137 Avenue and SW 112 Street"),
    [
      "corner of SW 137 Avenue and SW 112 Street",
      "SW 137 Avenue and SW 112 Street, Miami, FL",
    ],
  );

  assert.deepEqual(
    getAddressCandidates("Coral Way, between SW 32 Ave. and SW 37 Ave."),
    [
      "Coral Way, between SW 32 Ave. and SW 37 Ave.",
      "SW 22nd St and SW 37 Ave, Miami, FL",
      "Coral Way and SW 37 Ave, Miami, FL",
      "SW 22nd St and SW 32 Ave, Miami, FL",
      "Coral Way and SW 32 Ave, Miami, FL",
    ],
  );
});

test("tries each semicolon-delimited location as its own geocoding candidate", () => {
  assert.deepEqual(
    getAddressCandidates(
      "11200 SW 107 Court, Miami, FL 33176; 11201 SW 108 Avenue, Miami, FL 33176",
    ),
    [
      "11200 SW 107 Court, Miami, FL 33176; 11201 SW 108 Avenue, Miami, FL 33176",
      "11200 SW 107 Court, Miami, FL 33176",
      "11201 SW 108 Avenue, Miami, FL 33176",
    ],
  );
});
