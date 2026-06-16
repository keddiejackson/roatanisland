import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("Roatan Circle model supports premium community context", () => {
  const model = read("lib/community-forum.ts");

  assert.match(model, /Cruise Day Help/);
  assert.match(model, /Hotels & Stays/);
  assert.match(model, /Ask Locals/);
  assert.match(model, /communityAuthorRoles/);
  assert.match(model, /isVerifiedLocal/);
  assert.match(model, /isConciergePick/);
  assert.match(model, /verificationType/);
  assert.match(model, /isLocked/);
  assert.match(model, /normalizeCommunityIdentity/);
  assert.match(model, /buildCommunityMapHref/);
  assert.match(model, /buildCommunityRoaPrompt/);
  assert.match(model, /buildCommunityRoaSummary/);
  assert.match(model, /getCommunityThreadBadges/);
});

test("Roatan Circle public page and admin moderation are wired", () => {
  assert.equal(existsSync("app/community/page.tsx"), true);
  assert.equal(existsSync("app/community/CommunityForum.tsx"), true);
  assert.equal(existsSync("app/admin/community/page.tsx"), true);
  assert.equal(
    existsSync("app/admin/community/CommunityVerificationDesk.tsx"),
    true,
  );
  assert.equal(existsSync("app/api/admin/community/threads/[id]/route.ts"), true);
  assert.equal(existsSync("app/api/admin/community/replies/[id]/route.ts"), true);
  assert.equal(existsSync("app/api/community/verification/route.ts"), true);
  assert.equal(
    existsSync("app/api/community/verification/[id]/messages/route.ts"),
    true,
  );
  assert.equal(
    existsSync("app/api/admin/community/verification/route.ts"),
    true,
  );
  assert.equal(
    existsSync("app/api/admin/community/verification/[id]/route.ts"),
    true,
  );

  const page = read("app/community/page.tsx");
  const forum = read("app/community/CommunityForum.tsx");
  const admin = read("app/admin/community/page.tsx");
  const verificationDesk = read(
    "app/admin/community/CommunityVerificationDesk.tsx",
  );

  assert.match(page, /The Roatan Circle/);
  assert.match(forum, /Circle pulse/);
  assert.match(forum, /Ask with trip context/);
  assert.match(forum, /Roa summary/);
  assert.match(forum, /Request verification/);
  assert.match(forum, /Discussion closed/);
  assert.match(forum, /IdentityBadge/);
  assert.match(admin, /Community moderation/);
  assert.match(admin, /CommunityVerificationDesk/);
  assert.match(admin, /Close discussion/);
  assert.match(admin, /Reopen discussion/);
  assert.match(admin, /Feature/);
  assert.match(admin, /Concierge/);
  assert.match(verificationDesk, /Verification requests/);
  assert.match(verificationDesk, /Verified accounts/);
  assert.match(verificationDesk, /Verification chat/);
});

test("Roatan Circle SQL includes moderation and planning fields", () => {
  const sql = read("supabase/community-forum.sql");
  const verificationSql = read("supabase/community-verification.sql");

  assert.match(sql, /author_role/);
  assert.match(sql, /is_verified_local/);
  assert.match(sql, /trip_date/);
  assert.match(sql, /map_area/);
  assert.match(sql, /roa_summary/);
  assert.match(sql, /best_reply_id/);
  assert.match(sql, /concierge_pick_reply_id/);
  assert.match(sql, /community_threads_pinned_featured_idx/);
  assert.match(sql, /community_threads_map_area_idx/);
  assert.match(verificationSql, /community_verification_requests/);
  assert.match(verificationSql, /community_verification_messages/);
  assert.match(verificationSql, /community_verification_type/);
  assert.match(verificationSql, /is_locked/);
});
