import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);

function loadTypescriptModule(filePath, cache = new Map()) {
  const normalizedPath = path.resolve(filePath);
  if (cache.has(normalizedPath)) {
    return cache.get(normalizedPath).exports;
  }

  const source = fs.readFileSync(normalizedPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const cjsModule = { exports: {} };
  cache.set(normalizedPath, cjsModule);

  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) {
      return nodeRequire(specifier);
    }

    const basePath = path.resolve(path.dirname(normalizedPath), specifier);
    const resolvedPath = path.extname(basePath)
      ? basePath
      : fs.existsSync(`${basePath}.ts`)
        ? `${basePath}.ts`
        : `${basePath}.js`;

    return loadTypescriptModule(resolvedPath, cache);
  };

  const wrapped = vm.runInThisContext(
    `(function (exports, require, module, __filename, __dirname) {${output}\n})`,
    { filename: normalizedPath },
  );
  wrapped(
    cjsModule.exports,
    localRequire,
    cjsModule,
    normalizedPath,
    path.dirname(normalizedPath),
  );
  return cjsModule.exports;
}

const {
  defaultMobileSiteControls,
  mobileNavItemKeys,
  normalizeMobileSiteControls,
} = loadTypescriptModule(
  fileURLToPath(new URL("./mobile-site-controls.ts", import.meta.url)),
);

test("normalizes mobile control copy and toggles", () => {
  const controls = normalizeMobileSiteControls({
    mobileHeroHeadline: "  Island day  ",
    mobileNavMapLabel: "",
    showMobileHomepageSearch: false,
    showMobileFinalCta: "nope",
    useMobileLogoOverrides: true,
    mobileLogoWidthPx: "360",
    mobileLogoFit: "cover",
    mobileLogoBackgroundColor: "transparent",
  });

  assert.equal(controls.mobileHeroHeadline, "Island day");
  assert.equal(
    controls.mobileNavMapLabel,
    defaultMobileSiteControls.mobileNavMapLabel,
  );
  assert.equal(controls.showMobileHomepageSearch, false);
  assert.equal(
    controls.showMobileFinalCta,
    defaultMobileSiteControls.showMobileFinalCta,
  );
  assert.equal(controls.useMobileLogoOverrides, true);
  assert.equal(controls.mobileLogoWidthPx, 360);
  assert.equal(controls.mobileLogoFit, "cover");
  assert.equal(controls.mobileLogoBackgroundColor, "transparent");
});

test("keeps mobile nav keys stable for admin controls", () => {
  assert.deepEqual([...mobileNavItemKeys], [
    "listings",
    "map",
    "concierge",
    "signin",
    "business",
  ]);
});

test("wires mobile controls into the main guest surfaces", () => {
  const files = [
    ["app/admin/settings/page.tsx", /Mobile Site Controls/],
    ["app/admin/settings/page.tsx", /mobileTextFields/],
    ["app/page.tsx", /mobileControls\.mobileHeroHeadline/],
    ["app/listings/[id]/page.tsx", /mobileControls\.mobileListingStickyCtaLabel/],
    ["app/book/page.tsx", /mobileControls\.mobileBookingHeroTitle/],
    ["app/book/BookingForm.tsx", /mobileControls\.mobileBookingSubmitLabel/],
    ["app/account/page.tsx", /mobileControls\.mobileAccountHeadline/],
    ["app/BookingChatDrawer.tsx", /mobileControls\.mobileChatBubbleLabel/],
    ["app/SiteLogo.tsx", /mobileControls\.useMobileLogoOverrides/],
    ["app/HomeHeroHeader.tsx", /mobile-scroll-row/],
    ["app/BookingChatDrawer.tsx", /w-\[min\(12\.5rem/],
  ];

  for (const [file, pattern] of files) {
    const contents = fs.readFileSync(file, "utf8");
    assert.match(contents, pattern, file);
  }
});

test("keeps the default phone header compact", () => {
  assert.equal(defaultMobileSiteControls.useMobileLogoOverrides, true);
  assert.equal(defaultMobileSiteControls.mobileLogoWidthPx <= 180, true);
  assert.equal(defaultMobileSiteControls.mobileNavBusinessLabel, "List business");
});
