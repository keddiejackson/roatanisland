import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return null;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

async function refreshListingRating(listingId: string) {
  const { data: approvedReviews } = await supabaseServer
    .from("listing_reviews")
    .select("rating")
    .eq("listing_id", listingId)
    .eq("is_approved", true);

  const ratings =
    ((approvedReviews as { rating: number }[] | null) || []).map(
      (review) => review.rating,
    );
  const reviewsCount = ratings.length;
  const rating =
    reviewsCount > 0
      ? Number(
          (
            ratings.reduce((total, currentRating) => total + currentRating, 0) /
            reviewsCount
          ).toFixed(1),
        )
      : 5;

  await supabaseServer
    .from("listings")
    .update({
      rating,
      reviews_count: reviewsCount,
    })
    .eq("id", listingId);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { isApproved?: boolean };

  const { data: review, error } = await supabaseServer
    .from("listing_reviews")
    .update({ is_approved: Boolean(body.isApproved) })
    .eq("id", id)
    .select("id, listing_id, reviewer_name, rating, is_approved")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await refreshListingRating(review.listing_id);

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: review.is_approved ? "review_approved" : "review_hidden",
    targetType: "review",
    targetId: review.id,
    targetLabel: review.reviewer_name,
    metadata: {
      listing_id: review.listing_id,
      rating: review.rating,
    },
  });

  return NextResponse.json({ review });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: review } = await supabaseServer
    .from("listing_reviews")
    .select("id, listing_id, reviewer_name, rating")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseServer
    .from("listing_reviews")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (review?.listing_id) {
    await refreshListingRating(review.listing_id);
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "review_deleted",
    targetType: "review",
    targetId: id,
    targetLabel: review?.reviewer_name || "Deleted review",
    metadata: {
      listing_id: review?.listing_id || null,
      rating: review?.rating || null,
    },
  });

  return NextResponse.json({ deleted: true });
}
