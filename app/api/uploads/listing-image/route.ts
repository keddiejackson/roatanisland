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

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");
  const vendorId = String(formData.get("vendorId") || "pending");

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

  const safeVendorId = vendorId.replace(/[^a-zA-Z0-9-]/g, "") || "pending";
  const filePath = `${safeVendorId}/${crypto.randomUUID()}-${cleanFileName(
    image.name,
  )}`;

  const { error } = await supabaseServer.storage
    .from(bucketName)
    .upload(filePath, image, {
      contentType: image.type,
      upsert: false,
    });

  if (error) {
    console.error("Listing image upload failed:", error.message);
    await logAppError({
      source: "listing_image_upload",
      message: error.message,
      details: {
        vendorId,
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
