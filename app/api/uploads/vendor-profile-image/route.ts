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

async function getUserId(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user?.id || null;
}

export async function POST(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ error: "Vendor account not found." }, { status: 403 });
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Please choose an image file." },
      { status: 400 },
    );
  }

  if (!allowedTypes.has(image.type)) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, WebP, or GIF image." },
      { status: 400 },
    );
  }

  if (image.size > maxFileSize) {
    return NextResponse.json(
      { error: "Please upload an image smaller than 5 MB." },
      { status: 400 },
    );
  }

  const safeVendorId =
    vendorLink.vendor_id.replace(/[^a-zA-Z0-9-]/g, "") || "pending";
  const filePath = `vendor-profiles/${safeVendorId}/${crypto.randomUUID()}-${cleanFileName(
    image.name,
  )}`;

  const { error } = await supabaseServer.storage
    .from(bucketName)
    .upload(filePath, image, {
      contentType: image.type,
      upsert: false,
    });

  if (error) {
    console.error("Vendor profile image upload failed:", error.message);
    await logAppError({
      source: "vendor_profile_image_upload",
      message: error.message,
      details: {
        vendorId: vendorLink.vendor_id,
        fileName: image.name,
        fileType: image.type,
        fileSize: image.size,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabaseServer.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return NextResponse.json({ imageUrl: data.publicUrl });
}
