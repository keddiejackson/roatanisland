import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

const bucketName = "listing-images";
const maxFileSize = 8 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cleanFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

export async function POST(request: Request) {
  const user = await getUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ error: "Vendor account not found." }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const file = formData.get("document");

  if (!title) {
    return NextResponse.json({ error: "Document title is required." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose a document." }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Please upload a PDF, JPG, PNG, or WebP file." },
      { status: 400 },
    );
  }

  if (file.size > maxFileSize) {
    return NextResponse.json(
      { error: "Please upload a document smaller than 8 MB." },
      { status: 400 },
    );
  }

  const safeVendorId = vendorLink.vendor_id.replace(/[^a-zA-Z0-9-]/g, "");
  const filePath = `vendor-documents/${safeVendorId}/${crypto.randomUUID()}-${cleanFileName(
    file.name,
  )}`;

  const { error: uploadError } = await supabaseServer.storage
    .from(bucketName)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    await logAppError({
      source: "vendor_document_upload",
      message: uploadError.message,
      details: { vendorId: vendorLink.vendor_id, fileName: file.name },
    });
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabaseServer.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  const { data: document, error } = await supabaseServer
    .from("vendor_documents")
    .insert([
      {
        vendor_id: vendorLink.vendor_id,
        title,
        file_url: publicUrl.publicUrl,
      },
    ])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: user.email,
    actorRole: "vendor",
    action: "vendor_document_uploaded",
    targetType: "vendor",
    targetId: vendorLink.vendor_id,
    targetLabel: title,
  });

  return NextResponse.json({ document });
}
