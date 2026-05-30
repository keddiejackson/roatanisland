import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("chat drawer uses a safe-area mobile viewport shell", () => {
  const drawer = source("app/BookingChatDrawer.tsx");

  assert.match(drawer, /mobile-chat-shell/);
  assert.match(drawer, /mobile-chat-panel/);
  assert.match(drawer, /mobile-chat-body/);
  assert.match(drawer, /mobile-chat-header/);
  assert.match(drawer, /mobile-chat-composer/);
  assert.match(drawer, /mobile-chat-messages/);
  assert.match(drawer, /mobile-chat-thread-picker/);
  assert.match(drawer, /mobile-chat-thread-meta/);
  assert.doesNotMatch(drawer, /h-\[min\(100dvh,720px\)\]/);
  assert.doesNotMatch(drawer, /max-h-\[100dvh\]/);
});

test("chat drawer gives mobile space back to the conversation", () => {
  const drawer = source("app/BookingChatDrawer.tsx");

  assert.match(drawer, /mobile-chat-profile mt-2 hidden/);
  assert.match(drawer, /mobile-chat-composer mobile-safe-bottom/);
  assert.match(drawer, /mt-2 hidden text-\[11px\].*sm:block/);
  assert.match(drawer, /min-h-10 w-full/);
});

test("chat css reserves phone safe areas and short-screen room", () => {
  const css = source("app/globals.css");

  assert.match(css, /\.mobile-chat-shell/);
  assert.match(css, /\.mobile-chat-panel/);
  assert.match(css, /\.mobile-chat-body/);
  assert.match(css, /\.mobile-chat-composer/);
  assert.match(css, /100svh/);
  assert.match(css, /max-height: min\(42svh, 18rem\)/);
  assert.match(css, /max-height: 720px/);
});
