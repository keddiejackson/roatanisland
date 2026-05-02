import { supabaseServer } from "@/lib/supabase-server";

type ActivityLogInput = {
  actorEmail?: string | null;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logActivity({
  actorEmail,
  actorRole = "system",
  action,
  targetType,
  targetId,
  targetLabel,
  metadata = {},
}: ActivityLogInput) {
  const { error } = await supabaseServer.from("admin_activity_logs").insert([
    {
      actor_email: actorEmail || null,
      actor_role: actorRole,
      action,
      target_type: targetType,
      target_id: targetId || null,
      target_label: targetLabel || null,
      metadata,
    },
  ]);

  if (error) {
    console.error("Activity log failed:", error.message);
  }
}
