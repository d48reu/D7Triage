import { expect, test, type Locator, type Page } from "@playwright/test";

const CASE_NAME = "E2E Front Desk";
const CASE_SUMMARY =
  "Front desk stabilization test for a blocked driveway and permit question.";
const CASE_ADDRESS = "111 NW 1st Street, Miami, FL 33128";

async function signIn(page: Page) {
  await page.goto("/staff/login");
  await page.locator('select[name="staffMemberId"]').selectOption({
    label: "Karl Eugene Boehm",
  });
  await page.locator('input[name="password"]').fill("e2e-staff-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/staff\/intake-board$/);
}

function caseRow(page: Page) {
  return page.getByTestId("intake-saved-row").first();
}

async function waitForAutosave(row: Locator) {
  const status = row.getByRole("status").last();
  await expect(status).toHaveText("Saved", { timeout: 30_000 });
}

test("front desk can create, edit, scroll, attach, and safely detect a stale edit", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await signIn(page);
  await page.getByRole("button", { name: "New item" }).click();

  const draft = page.getByTestId("intake-draft-row").first();
  await draft.locator('input[name="residentName"]').fill(CASE_NAME);
  await draft.locator('textarea[name="description"]').fill(CASE_SUMMARY);
  await draft
    .locator('textarea[name="resolutionNotes"]')
    .fill("Caller prefers a telephone response.");
  await draft.locator('textarea[name="addressText"]').fill(CASE_ADDRESS);
  await draft.locator('input[name="residentPhone"]').fill("3055550100");
  await expect(draft.locator('input[name="residentEmail"]')).toHaveValue("");

  await draft
    .getByRole("button", { name: /Category for E2E Front Desk\. Click to edit\./ })
    .click();
  await draft
    .getByRole("button", {
      name: /Set category for e2e front desk to PARKING ENFORCEMENT/i,
    })
    .click();
  await draft.getByRole("button", { name: "Assignment. Click to edit." }).click();
  await draft
    .getByRole("combobox", { name: "Assignment" })
    .selectOption({ label: "Karl Eugene Boehm" });

  await draft.getByRole("button", { name: "Save case" }).click();
  await expect(page.getByText("Case saved", { exact: false })).toBeVisible({
    timeout: 30_000,
  });

  let saved = caseRow(page);
  await expect(saved).toHaveCount(1);
  await expect(
    saved.getByRole("button", { name: /Category for E2E Front Desk/ }),
  ).toContainText("PARKING ENFORCEMENT");
  await expect(saved.locator('input[name="residentEmail"]')).toHaveValue("");

  // Exercise several historically troublesome categories in rapid succession.
  for (const category of ["HOUSING", "PERMITS", "TREES", "ANIMALS"]) {
    await saved
      .getByRole("button", { name: /Category for E2E Front Desk\. Click to edit\./ })
      .click();
    await saved
      .getByRole("button", {
        name: new RegExp(`Set category for e2e front desk to ${category}`, "i"),
      })
      .click();
  }

  await saved.locator('select[name="status"]').selectOption("needs_review");
  await saved.locator('input[name="createdDate"]').fill("2026-08-23");
  await saved.getByRole("button", { name: "Assignment. Click to edit." }).click();
  await saved
    .getByRole("combobox", { name: "Assignment" })
    .selectOption({ label: "Carol Gustafson" });
  await waitForAutosave(saved);

  const scroller = page.getByTestId("intake-board-scroller").first();
  await expect
    .poll(() =>
      scroller.evaluate((element) => element.scrollWidth - element.clientWidth),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: /Scroll .* cases right/ })
    .first()
    .click();
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: /Scroll .* cases left/ })
    .first()
    .click();
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBe(0);

  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await saved.locator('input[type="file"]').setInputFiles({
    name: "front-desk-test.png",
    mimeType: "image/png",
    buffer: onePixelPng,
  });
  await expect(saved.getByText("1 file", { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/staff");
  await page.goto("/staff/intake-board");
  saved = caseRow(page);
  await expect(saved).toHaveCount(1);
  await expect(
    saved.getByRole("button", { name: /Category for E2E Front Desk/ }),
  ).toContainText("ANIMALS");
  await expect(saved.locator('select[name="status"]')).toHaveValue("needs_review");
  await expect(saved.locator('input[name="createdDate"]')).toHaveValue("2026-08-23");
  await expect(saved.getByRole("button", { name: "Assignment. Click to edit." })).toContainText(
    "Carol Gustafson",
  );
  await expect(saved.getByText("1 file", { exact: true })).toBeVisible();

  const stalePage = await context.newPage();
  await stalePage.goto("/staff/intake-board");
  const staleRow = caseRow(stalePage);
  await expect(staleRow).toHaveCount(1);

  const authoritativeNote = "Primary workstation saved this note first.";
  await saved.locator('textarea[name="resolutionNotes"]').fill(authoritativeNote);
  await saved.locator('textarea[name="resolutionNotes"]').blur();
  await waitForAutosave(saved);

  await staleRow.locator('input[name="residentPhone"]').fill("3055550199");
  await staleRow.locator('input[name="residentPhone"]').blur();
  await expect(staleRow.getByRole("button", { name: "Reload latest" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(staleRow.getByRole("status").last()).toContainText(
    "Someone else changed this case",
  );

  await page.reload();
  saved = caseRow(page);
  await expect(saved.locator('textarea[name="resolutionNotes"]')).toHaveValue(
    authoritativeNote,
  );
  await expect(saved.locator('input[name="residentPhone"]')).toHaveValue("3055550100");

  await page.goto("/staff/diagnostics");
  await expect(page.getByText(/1 edit conflict recorded/)).toBeVisible();
  expect(pageErrors).toEqual([]);
});
