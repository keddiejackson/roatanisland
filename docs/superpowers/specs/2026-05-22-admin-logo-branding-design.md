# Admin Logo Branding Design

## Goal

Let an admin upload and replace the website logo without code changes, control
how it appears on the site with a small set of safe display options, and reuse
the selected logo as the site favicon.

## Scope

The first version adds branding controls to the existing Admin Settings page.
It does not add a full crop editor, drag positioning, color editing, or a
separate branding dashboard.

## Admin Experience

The Settings page gains a Branding section with:

- A logo upload control for a single image.
- A live preview of the current or newly uploaded logo.
- A logo size choice: Small, Medium, or Large.
- A logo shape choice: Original, Rounded, Circle, or Square.
- A short note that a simple square icon works best in a browser tab.
- Save behavior that stores the chosen logo and display settings with the
  existing site settings.

Admins can upload a new logo later and save it over the previous branding
choice. The current built-in logo remains the fallback.

## Site Behavior

The shared `SiteLogo` component reads the saved branding settings and renders
the custom logo across the public and account-facing pages that already use the
shared logo component. The selected size and shape affect the visible site logo
only where the shared logo is used.

If no custom logo exists, if settings are incomplete, or if the custom image
cannot render, the site falls back to the built-in Roatan logo treatment so
navigation never becomes blank.

## Favicon Behavior

The favicon uses the saved custom logo when available and falls back to the
current built-in mark otherwise. The favicon path must be generated from the
saved branding source rather than requiring a deploy whenever the admin changes
the logo.

The admin's site-logo shape and size choices do not distort the favicon. The
favicon renderer fits the chosen image into a square icon canvas that is usable
in browser tabs.

## Data And Storage

Branding settings reuse the existing `site_settings` record for the site. The
saved settings include:

- Custom logo image URL.
- Logo size choice.
- Logo shape choice.

Logo files use an admin-only upload endpoint and the existing Supabase storage
pattern already used by listing and vendor images. The upload endpoint accepts
common web image formats, enforces a file size limit, verifies admin access, and
returns a public image URL that can be saved in settings.

## Components And Boundaries

- Admin Settings owns the Branding form, preview, and save request.
- A dedicated admin logo upload route owns validation, authorization, storage,
  and upload errors.
- Shared branding helpers normalize settings and provide fallback values.
- `SiteLogo` owns display of the saved site logo in navigation surfaces.
- The app icon route owns favicon generation from the saved branding source.

## Errors And Safety

- Non-admin upload requests are rejected.
- Unsupported or oversized logo files show a clear upload error.
- Failed saves keep the unsaved choices visible so the admin can retry.
- Missing or broken custom logos fall back to the built-in logo.
- The settings API continues logging site-setting updates through the existing
  admin activity path.

## Verification

Implementation should verify:

- Admin can upload, preview, save, and replace a logo.
- Size and shape choices change the shared site logo preview and live site
  rendering without breaking layout.
- Public pages still show the fallback logo before a custom logo is saved.
- The favicon route returns a valid icon with and without a custom logo.
- Unauthorized logo uploads fail.
- Lint, TypeScript, and the production build pass.

