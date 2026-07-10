import { NextResponse } from "next/server";
import { logAppError } from "@/lib/error-log";
import {
  enforceRateLimit,
  getRequestUser,
  unauthorized,
} from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

const bucketName = "listing-images";
const maxFileSize = 5 * 1024 * 1024;
const maxFiles = 6;
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
  const limited = await enforceRateLimit(request, "upload:review-image", {
    limit: 12,
    windowSeconds: 24 * 60 * 60,
  });
  if (limited) return limited;

  const user = await getRequestUser(request);
  if (!user) return unauthorized("Sign in before adding trip photos.");

  const formData = await request.formData();
  const images = formData
    .getAll("image")
    .filter((image): image is File => image instanceof File)
    .slice(0, maxFiles);
  const listingId = String(formData.get("listingId") || "general").replace(
    /[^a-zA-Z0-9-]/g,
    "",
  );

  const { data: completedBooking } = await supabaseServer
    .from("bookings")
    .select("id")
    .eq("listing_id", listingId)
    .eq("email", user.email)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();

  if (!completedBooking) {
    return NextResponse.json(
      { error: "Trip photos can be added after a completed booking." },
      { status: 403 },
    );
  }

  if (images.length === 0) {
    return NextResponse.json(
      { error: "Please choose at least one review photo." },
      { status: 400 },
    );
  }

  for (const image of images) {
    if (!allowedTypes.has(image.type)) {
      return NextResponse.json(
        { error: "Please upload JPG, PNG, WebP, or GIF photos." },
        { status: 400 },
      );
    }

    if (image.size > maxFileSize) {
      return NextResponse.json(
        { error: "Please upload photos smaller than 5 MB each." },
        { status: 400 },
      );
    }
  }

  const imageUrls: string[] = [];

  for (const image of images) {
    const filePath = `review-photos/${listingId || "general"}/${crypto.randomUUID()}-${cleanFileName(
      image.name,
    )}`;
    const { error } = await supabaseServer.storage
      .from(bucketName)
      .upload(filePath, image, {
        contentType: image.type,
        upsert: false,
      });

    if (error) {
      await logAppError({
        source: "review_image_upload",
        message: error.message,
        details: {
          listingId,
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
    imageUrls.push(data.publicUrl);
  }

  return NextResponse.json({ imageUrls });
}
