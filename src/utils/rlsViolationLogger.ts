import { supabase } from "@/integrations/supabase/client";
import { getUserCentreId } from "@/utils/getCentreId";

/**
 * Logs RLS / permission violations to audit_logs.
 */
export async function logRlsViolation(context: {
  table?: string;
  operation?: string;
  route?: string;
  errorMessage?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const centreId = await getUserCentreId();

    await supabase.from("audit_logs").insert([{
      centre_id: centreId,
      table_name: context.table || "unknown",
      record_id: "00000000-0000-0000-0000-000000000000",
      action: "RLS_VIOLATION",
      user_id: user.id,
      user_email: user.email || null,
      new_data: {
        operation: context.operation,
        route: context.route || window.location.pathname,
        error: context.errorMessage,
        timestamp: new Date().toISOString(),
      } as any,
    }]);
  } catch (e) {
    console.warn("Failed to log RLS violation:", e);
  }
}

/**
 * Check if a Supabase error is an RLS / permission error.
 */
export function isRlsError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.statusCode;
  const message = error.message || "";
  return (
    code === "42501" ||
    code === 403 ||
    message.includes("row-level security") ||
    message.includes("insufficient_privilege") ||
    message.includes("new row violates row-level security")
  );
}
