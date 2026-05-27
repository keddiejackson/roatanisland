import { NextResponse } from "next/server";
import {
  brandingLogoBucketName,
  brandingLogoFolder,
  brandingLogoPathFromPublicUrl,
  cleanBrandingLogoFileName,
  formatBrandingMediaItems,
  getBrandingLogoStoragePath,
  validateBrandingLogoFile,
} from "@/lib/branding-logo-upload";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;
  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

export async function POST(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const logo = formData.get("logo");

  if (!(logo instanceof File)) {
    return NextResponse.json(
      { error: "Please choose a logo image." },
      { status: 400 },
    );
  }

  const validationError = validateBrandingLogoFile(logo);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const filePath = `site-branding/${crypto.randomUUID()}-${cleanBrandingLogoFileName(
    logo.name,
  )}`;
  const { error } = await supabaseServer.storage
    .from(brandingLogoBucketName)
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

  const { data } = supabaseServer.storage
    .from(brandingLogoBucketName)
    .getPublicUrl(filePath);

  return NextResponse.json({ logoUrl: data.publicUrl });
}

export async function GET(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer.storage
    .from(brandingLogoBucketName)
    .list(brandingLogoFolder, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    await logAppError({
      source: "admin_branding_logo_list",
      message: error.message,
      details: { actorEmail: adminEmail },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const media = formatBrandingMediaItems(data || [], (path) => {
    const { data: publicData } = supabaseServer.storage
      .from(brandingLogoBucketName)
      .getPublicUrl(path);

    return publicData.publicUrl;
  });

  return NextResponse.json({ media });
}

export async function DELETE(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { path?: string; url?: string };
  const storagePath =
    (body.path ? getBrandingLogoStoragePath(body.path) : null) ||
    (body.url ? brandingLogoPathFromPublicUrl(body.url) : null);

  if (!storagePath) {
    return NextResponse.json(
      { error: "Choose a valid branding logo to delete." },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer.storage
    .from(brandingLogoBucketName)
    .remove([storagePath]);

  if (error) {
    await logAppError({
      source: "admin_branding_logo_delete",
      message: error.message,
      details: { actorEmail: adminEmail, storagePath },
    });

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
