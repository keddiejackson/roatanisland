# Admin Logo Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins upload and replace the site logo, choose a safe display size and shape, and use the saved logo as the favicon.

**Architecture:** Store logo URL and display preferences inside the existing `site_settings` JSON record. A small shared branding model and client provider expose normalized branding to the shared `SiteLogo` component, the existing admin Settings page saves the choices and uploads images through a new admin-only route, and a dynamic Next app icon route reads the same saved logo for the browser tab.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase Auth, Supabase Storage, Supabase `site_settings`.

---

## File Map

- Create `lib/site-branding.ts` for branding types, defaults, normalization, and CSS class maps.
- Create `app/SiteBrandingProvider.tsx` to fetch public branding settings once on the client and expose them to shared logo surfaces.
- Modify `app/layout.tsx` to wrap pages with the branding provider and let the dynamic app icon route own favicon metadata.
- Modify `app/SiteLogo.tsx` to render the custom uploaded logo with selected size and shape while preserving the built-in fallback.
- Create `app/api/admin/branding-logo/route.ts` for admin-only logo uploads into Supabase Storage.
- Modify `app/admin/settings/page.tsx` to add upload, preview, size, and shape controls to Settings.
- Create `app/icon.tsx` to generate a square browser icon from the saved logo or the built-in mark.

## Task 1: Add Shared Branding State And Logo Rendering

**Files:**
- Create: `lib/site-branding.ts`
- Create: `app/SiteBrandingProvider.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/SiteLogo.tsx`

- [ ] **Step 1: Add the shared branding model**

Create `lib/site-branding.ts` with the values that both Settings and logo rendering will use:

```ts
export const logoSizes = ["small", "medium", "large"] as const;
export const logoShapes = ["original", "rounded", "circle", "square"] as const;

export type LogoSize = (typeof logoSizes)[number];
export type LogoShape = (typeof logoShapes)[number];

export type SiteBranding = {
  logoUrl: string;
  logoSize: LogoSize;
  logoShape: LogoShape;
};

export const defaultSiteBranding: SiteBranding = {
  logoUrl: "",
  logoSize: "medium",
  logoShape: "original",
};

function isLogoSize(value: unknown): value is LogoSize {
  return typeof value === "string" && logoSizes.includes(value as LogoSize);
}

function isLogoShape(value: unknown): value is LogoShape {
  return typeof value === "string" && logoShapes.includes(value as LogoShape);
}

export function normalizeSiteBranding(value: unknown): SiteBranding {
  if (!value || typeof value !== "object") {
    return defaultSiteBranding;
  }

  const settings = value as Record<string, unknown>;

  return {
    logoUrl: typeof settings.logoUrl === "string" ? settings.logoUrl.trim() : "",
    logoSize: isLogoSize(settings.logoSize)
      ? settings.logoSize
      : defaultSiteBranding.logoSize,
    logoShape: isLogoShape(settings.logoShape)
      ? settings.logoShape
      : defaultSiteBranding.logoShape,
  };
}

export const logoSizeClasses: Record<LogoSize, string> = {
  small: "h-10 max-w-[180px]",
  medium: "h-14 max-w-[260px]",
  large: "h-20 max-w-[360px]",
};

export const logoShapeClasses: Record<LogoShape, string> = {
  original: "w-auto object-contain",
  rounded: "w-auto rounded-xl object-contain",
  circle: "aspect-square w-auto rounded-full object-cover",
  square: "aspect-square w-auto rounded-lg bg-white object-contain",
};
```

- [ ] **Step 2: Add the root branding provider**

Create `app/SiteBrandingProvider.tsx` so pages using `SiteLogo` share one public settings fetch:

```tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  defaultSiteBranding,
  normalizeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding";
import { supabase } from "@/lib/supabase";

const SiteBrandingContext = createContext<SiteBranding>(defaultSiteBranding);

export function useSiteBranding() {
  return useContext(SiteBrandingContext);
}

export default function SiteBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState(defaultSiteBranding);

  useEffect(() => {
    async function fetchBranding() {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();

      setBranding(normalizeSiteBranding(data?.value));
    }

    fetchBranding();
  }, []);

  return (
    <SiteBrandingContext.Provider value={branding}>
      {children}
    </SiteBrandingContext.Provider>
  );
}
```

- [ ] **Step 3: Wrap the app with the branding provider**

Update `app/layout.tsx` so `AnalyticsTracker` and the page tree sit inside the provider:

```tsx
import AnalyticsTracker from "./AnalyticsTracker";
import SiteBrandingProvider from "./SiteBrandingProvider";
import "./globals.css";
```

Replace the body content with:

```tsx
<body className="min-h-full flex flex-col">
  <SiteBrandingProvider>
    <AnalyticsTracker />
    {children}
  </SiteBrandingProvider>
</body>
```

- [ ] **Step 4: Render uploaded logos through the shared logo component**

Change `app/SiteLogo.tsx` into a client component, keep the existing built-in fallback, and show the uploaded image when it is healthy:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSiteBranding } from "@/app/SiteBrandingProvider";
import { logoShapeClasses, logoSizeClasses } from "@/lib/site-branding";
```

Inside `SiteLogo`, add:

```tsx
const branding = useSiteBranding();
const [customLogoFailed, setCustomLogoFailed] = useState(false);

useEffect(() => {
  setCustomLogoFailed(false);
}, [branding.logoUrl]);

const showCustomLogo = Boolean(branding.logoUrl) && !customLogoFailed;
```

Replace the current image/text block with:

```tsx
{showCustomLogo ? (
  <img
    src={branding.logoUrl}
    alt="Roatan Island Life"
    className={`${logoSizeClasses[branding.logoSize]} ${logoShapeClasses[branding.logoShape]}`}
    onError={() => setCustomLogoFailed(true)}
  />
) : (
  <>
    <Image
      src="/images/roatan-island-life-mark.svg"
      alt="Roatan Island Life"
      width={48}
      height={48}
      priority={priority}
      className={markClass}
    />
    {!compact && (
      <span className="leading-none">
        <span className={`block text-lg font-black tracking-tight ${textClass}`}>
          Roatan
        </span>
        <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.28em] text-[#C29414]">
          Island Life
        </span>
      </span>
    )}
  </>
)}
```

Keep the existing `compact` fallback behavior for the built-in mark. Custom logos can render as a single uploaded asset.

- [ ] **Step 5: Run the type and lint checks**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit**

```powershell
git add app/layout.tsx app/SiteBrandingProvider.tsx app/SiteLogo.tsx lib/site-branding.ts
git commit -m "Add shared site branding state"
```

## Task 2: Add The Admin Logo Upload Route

**Files:**
- Create: `app/api/admin/branding-logo/route.ts`

- [ ] **Step 1: Add admin authorization and upload validation**

Create `app/api/admin/branding-logo/route.ts`:

```ts
import { NextResponse } from "next/server";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

const bucketName = "listing-images";
const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getAdminEmail(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return admin ? email : null;
}
```

- [ ] **Step 2: Store validated logos in Supabase Storage**

Add the route handler:

```ts
export async function POST(request: Request) {
  const adminEmail = await getAdminEmail(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const logo = formData.get("logo");

  if (!(logo instanceof File)) {
    return NextResponse.json({ error: "Please choose a logo image." }, { status: 400 });
  }

  if (!allowedTypes.has(logo.type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, WebP, or GIF logo." },
      { status: 400 },
    );
  }

  if (logo.size > maxFileSize) {
    return NextResponse.json(
      { error: "Please upload a logo smaller than 5 MB." },
      { status: 400 },
    );
  }

  const filePath = `site-branding/${crypto.randomUUID()}-${cleanFileName(logo.name)}`;
  const { error } = await supabaseServer.storage
    .from(bucketName)
    .upload(filePath, logo, {
      contentType: logo.type,
      upsert: false,
    });

  if (error) {
    await logAppError({
      source: "admin_branding_logo_upload",
      message: error.message,
      details: {
        actorEmail: adminEmail,
        fileName: logo.name,
        fileType: logo.type,
        fileSize: logo.size,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseServer.storage.from(bucketName).getPublicUrl(filePath);
  return NextResponse.json({ logoUrl: data.publicUrl });
}
```

- [ ] **Step 3: Verify the route compiles**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Expected: both commands exit `0`.

- [ ] **Step 4: Commit**

```powershell
git add app/api/admin/branding-logo/route.ts
git commit -m "Add admin branding logo upload"
```

## Task 3: Add Branding Controls To Admin Settings

**Files:**
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: Extend Settings state with branding values**

At the top of `app/admin/settings/page.tsx`, import the shared options:

```tsx
import {
  logoShapeClasses,
  logoShapes,
  logoSizeClasses,
  logoSizes,
  normalizeSiteBranding,
  type LogoShape,
  type LogoSize,
} from "@/lib/site-branding";
```

Add settings defaults:

```ts
logoUrl: "",
logoSize: "medium" as LogoSize,
logoShape: "original" as LogoShape,
```

Add UI state near the existing `saving` state:

```ts
const [logoUploading, setLogoUploading] = useState(false);
const [logoUploadError, setLogoUploadError] = useState("");
```

- [ ] **Step 2: Normalize branding values when Settings loads**

Replace the current Settings merge block with:

```tsx
if (data?.value && typeof data.value === "object") {
  const savedSettings = data.value as Partial<typeof defaultSettings>;

  setSettings({
    ...defaultSettings,
    ...savedSettings,
    ...normalizeSiteBranding(savedSettings),
  });
}
```

- [ ] **Step 3: Upload a logo from Settings**

Add this helper beside `saveSettings`:

```tsx
async function uploadLogo(file: File) {
  const { data: sessionData } = await supabase.auth.getSession();
  const formData = new FormData();
  formData.append("logo", file);

  setLogoUploading(true);
  setLogoUploadError("");

  const response = await fetch("/api/admin/branding-logo", {
    method: "POST",
    headers: sessionData.session?.access_token
      ? { Authorization: `Bearer ${sessionData.session.access_token}` }
      : {},
    body: formData,
  });
  const result = await response.json();
  setLogoUploading(false);

  if (!response.ok) {
    setLogoUploadError(result.error || "Unable to upload logo.");
    return;
  }

  updateSetting("logoUrl", result.logoUrl);
}
```

- [ ] **Step 4: Add the Branding form section**

Before the existing text-setting fields, add:

```tsx
<section className="grid gap-5 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-5">
  <div>
    <h2 className="text-xl font-bold text-[#0B3C5D]">Branding</h2>
    <p className="mt-1 text-sm text-gray-600">
      Upload the logo used across the website. A simple square icon works best
      in browser tabs.
    </p>
  </div>
  <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
    <div className="grid gap-4">
      <label className="grid gap-2 font-medium">
        Logo Image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadLogo(file);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
        />
      </label>
      <label className="grid gap-2 font-medium">
        Logo Size
        <select
          value={settings.logoSize}
          onChange={(e) => updateSetting("logoSize", e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          {logoSizes.map((size) => (
            <option key={size} value={size}>
              {size[0].toUpperCase() + size.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 font-medium">
        Logo Shape
        <select
          value={settings.logoShape}
          onChange={(e) => updateSetting("logoShape", e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          {logoShapes.map((shape) => (
            <option key={shape} value={shape}>
              {shape[0].toUpperCase() + shape.slice(1)}
            </option>
          ))}
        </select>
      </label>
      {logoUploading && <p className="text-sm text-[#0B3C5D]">Uploading logo...</p>}
      {logoUploadError && <p className="text-sm text-red-600">{logoUploadError}</p>}
    </div>
    <div className="rounded-2xl border border-dashed border-[#00A8A8]/35 bg-white p-5">
      <p className="text-sm font-semibold text-gray-500">Logo preview</p>
      <div className="mt-4 flex min-h-36 items-center justify-center rounded-2xl bg-[#071F2F] p-5">
        {settings.logoUrl ? (
          <img
            src={settings.logoUrl}
            alt="Uploaded Roatan logo preview"
            className={`${logoSizeClasses[settings.logoSize]} ${logoShapeClasses[settings.logoShape]}`}
          />
        ) : (
          <p className="text-center text-sm text-white/75">
            Upload a logo to preview it here.
          </p>
        )}
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 5: Verify Settings still saves the full record**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit**

```powershell
git add app/admin/settings/page.tsx
git commit -m "Add admin logo branding controls"
```

## Task 4: Generate A Dynamic Favicon From Branding

**Files:**
- Create: `app/icon.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Remove the old static icon metadata**

Delete this block from `app/layout.tsx` so the App Router icon route becomes the favicon source:

```ts
icons: {
  icon: [{ url: "/images/roatan-island-life-mark.svg", type: "image/svg+xml" }],
  shortcut: "/images/roatan-island-life-mark.svg",
},
```

- [ ] **Step 2: Create the dynamic icon route**

Create `app/icon.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { normalizeSiteBranding } from "@/lib/site-branding";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life";
const fallbackLogoSource = `${siteUrl}/images/roatan-island-life-mark.svg`;

async function toImageDataUrl(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${bytes}`;
  } catch {
    return null;
  }
}

async function getLogoSource() {
  const { data } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const branding = normalizeSiteBranding(data?.value);

  if (!branding.logoUrl) {
    return fallbackLogoSource;
  }

  return (await toImageDataUrl(branding.logoUrl)) || fallbackLogoSource;
}

export default async function Icon() {
  const logoSource = await getLogoSource();

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffffff",
          borderRadius: 16,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          width: "100%",
        }}
      >
        <img
          src={logoSource}
          alt=""
          style={{
            height: "100%",
            objectFit: "contain",
            width: "100%",
          }}
        />
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 3: Verify the favicon route compiles**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Expected: all commands exit `0`, and the build route list includes `/icon`.

- [ ] **Step 4: Commit**

```powershell
git add app/layout.tsx app/icon.tsx
git commit -m "Use site branding for favicon"
```

## Task 5: Verify The Full Admin Branding Flow

**Files:**
- Verify changed files from Tasks 1-4

- [ ] **Step 1: Start the local app**

Run:

```powershell
npm.cmd run dev
```

Expected: Next prints the local site URL.

- [ ] **Step 2: Check fallback behavior before uploading**

Open:

```text
/admin/settings
/
/map
/icon
```

Expected: Settings shows the Branding panel, pages still show the built-in logo when `logoUrl` is empty, and `/icon` returns an image.

- [ ] **Step 3: Check an authorized upload**

From Admin Settings:

1. Upload a PNG, JPG, WebP, or GIF logo under 5 MB.
2. Confirm the preview changes.
3. Pick each size once and confirm the preview size changes.
4. Pick Original, Rounded, Circle, and Square once and confirm the preview shape changes.
5. Save Settings.

Expected: upload returns a public logo URL, the save succeeds, and shared site logo surfaces switch to the uploaded logo after refresh.

- [ ] **Step 4: Check rejection behavior**

Attempt one invalid upload through the Settings UI:

1. Choose a file over 5 MB or an unsupported file type.
2. Confirm the Branding section shows the upload error and the saved logo state is not cleared.

Expected: the logo does not change after a rejected upload.

- [ ] **Step 5: Check favicon behavior**

Open `/icon` after saving the uploaded logo.

Expected: the returned icon image uses the uploaded logo inside a square icon canvas. Clearing `logoUrl` and saving Settings restores the built-in icon.

- [ ] **Step 6: Run final project checks**

Run:

```powershell
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```

Expected: all commands exit `0`.

- [ ] **Step 7: Commit the verified feature state**

```powershell
git status --short
git log --oneline -5
```

Expected: no uncommitted feature files remain after the task commits, and the new branding commits appear at the top of history.
