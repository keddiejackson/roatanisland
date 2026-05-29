import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getBookingPaymentClarityCards,
  getLuxuryBookingFlowSteps,
} from "./booking-flow.ts";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("luxury booking flow explains the guided request steps", () => {
  const steps = getLuxuryBookingFlowSteps();

  assert.deepEqual(
    steps.map((step) => step.label),
    ["Trip details", "Date and time", "Guest notes", "Review request", "Send"],
  );
  assert.equal(steps[0].number, "01");
  assert.match(steps[4].text, /operator/i);
});

test("payment clarity cards explain deposit and confirmation timing", () => {
  const cards = getBookingPaymentClarityCards({
    estimatedTotalLabel: "$420",
    depositsEnabled: true,
  });

  assert.equal(cards[0].label, "Estimated total");
  assert.equal(cards[0].value, "$420");
  assert.match(cards[1].text, /deposit/i);
  assert.match(cards[2].text, /operator confirms/i);
});

test("booking pages include luxury travel marketplace sections", () => {
  const page = readProjectFile("app/book/page.tsx");
  const form = readProjectFile("app/book/BookingForm.tsx");
  const success = readProjectFile("app/book/success/page.tsx");
  const status = readProjectFile("app/book/status/[id]/page.tsx");

  assert.match(page, /Luxury booking flow/);
  assert.match(form, /Private booking request desk/);
  assert.match(form, /Date and availability/);
  assert.match(form, /Payment clarity/);
  assert.match(success, /Trip request concierge/);
  assert.match(status, /Trip command center/);
});
