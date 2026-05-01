import { supabaseServer } from "@/lib/supabase-server";

type LogAppErrorInput = {
  source: string;
  message: string;
  details?: Record<string, unknown>;
  severity?: "error" | "warning" | "info";
};

export async function logAppError({
  source,
  message,
  details = {},
  severity = "error",
}: LogAppErrorInput) {
  try {
    const { error } = await supabaseServer.from("app_errors").insert([
      {
        source,
        message,
        details,
        severity,
      },
    ]);

    if (error) {
      console.error("Unable to save app error:", error.message);
    }
  } catch (error) {
    console.error("Unable to save app error:", error);
  }
}
