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

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user
    ? { id: data.user.id, email: data.user.email || null }
    : null;
}

export async function POST(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const safeUserId = user.id.replace(/[^a-zA-Z0-9-]/g, "") || "guest";
  const filePath = `guest-profiles/${safeUserId}/${crypto.randomUUID()}-${cleanFileName(
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
      source: "guest_profile_image_upload",
      message: error.message,
      details: {
        userId: user.id,
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
