import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("admin reminder center and cron route are wired into the app", () => {
  assert.match(read("app/admin/AdminNav.tsx"), /\/admin\/reminders/);
  assert.match(read("app/admin/reminders/page.tsx"), /Reminder Center/);
  assert.match(read("app/admin/reminders/page.tsx"), /Reminder settings/);
  assert.match(read("app/admin/reminders/page.tsx"), /Send now/);
  assert.match(read("app/api/admin/reminders/route.ts"), /sendBookingReminder/);
  assert.match(read("app/api/cron/reminders/route.ts"), /runDueBookingReminders/);
  assert.match(read("vercel.json"), /\/api\/cron\/reminders/);
});

test("guest trip packet is available from guest booking surfaces", () => {
  assert.match(read("app/book/trip/[id]/page.tsx"), /Trip Packet/);
  assert.match(read("app/book/trip/[id]/page.tsx"), /What to bring/);
  assert.match(read("app/book/trip/[id]/page.tsx"), /Open chat/);
  assert.match(read("app/account/page.tsx"), /\/book\/trip\//);
  assert.match(read("app/book/status/[id]/page.tsx"), /\/book\/trip\//);
});
