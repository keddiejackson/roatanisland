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
  const images = formData.getAll("image");
  const image = images[0];
  const vendorId = String(formData.get("vendorId") || "pending");

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "Please choose an image file." },
      { status: 400 },
    );
  }

  for (const uploadImage of images) {
    if (!(uploadImage instanceof File)) {
      continue;
    }

    if (!allowedTypes.has(uploadImage.type)) {
      return NextResponse.json(
        { error: "Please upload JPG, PNG, WebP, or GIF images." },
        { status: 400 },
      );
    }

    if (uploadImage.size > maxFileSize) {
      return NextResponse.json(
        { error: "Please upload images smaller than 5 MB each." },
        { status: 400 },
      );
    }
  }

  const safeVendorId = vendorId.replace(/[^a-zA-Z0-9-]/g, "") || "pending";
  const imageUrls: string[] = [];

  for (const uploadImage of images) {
    if (!(uploadImage instanceof File)) {
      continue;
    }

    const filePath = `${safeVendorId}/${crypto.randomUUID()}-${cleanFileName(
      uploadImage.name,
    )}`;
    const { error } = await supabaseServer.storage
      .from(bucketName)
      .upload(filePath, uploadImage, {
        contentType: uploadImage.type,
        upsert: false,
      });

    if (error) {
      console.error("Listing image upload failed:", error.message);
      await logAppError({
        source: "listing_image_upload",
        message: error.message,
        details: {
          vendorId,
          fileName: uploadImage.name,
          fileType: uploadImage.type,
          fileSize: uploadImage.size,
        },
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabaseServer.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    imageUrls.push(data.publicUrl);
  }

  return NextResponse.json({ imageUrl: imageUrls[0], imageUrls });
}
