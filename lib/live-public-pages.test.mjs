import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const livePublicPages = ["app/category-page.tsx", "app/vendors/page.tsx"];

test("public listing pages render with fresh server data", () => {
  for (const file of livePublicPages) {
    const source = readFileSync(file, "utf8");

    assert.match(source, /import \{ connection \} from "next\/server";/);
    assert.match(source, /await connection\(\);/);
  }
});
