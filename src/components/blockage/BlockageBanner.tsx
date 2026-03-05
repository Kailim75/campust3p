import { ShieldAlert } from "lucide-react";
import { useBlockageDiagnostic } from "@/hooks/useBlockageDiagnostic";
import { useCurrentUserRole } from "@/hooks/useUsers";

interface BlockageBannerProps {
  onOpenPanel: () => void;
}

/**
 * Compact admin-only chip. Only shown to admin/staff when there are active blockages.
 * Replaces the old full-width red banner.
 */
export function BlockageBanner({ onOpenPanel }: BlockageBannerProps) {
  const { data, isLoading } = useBlockageDiagnostic();
  const { data: userRole } = useCurrentUserRole();

  const isAdminOrStaff = userRole === "admin" || userRole === "staff" || userRole === "super_admin";

  // Hide for non-admin or no data
  if (!isAdminOrStaff || isLoading || !data || data.counts.total === 0) return null;

  // The diagnostic chip is now shown inside Dashboard header, so we return null here
  // to avoid duplicate banners. The BlockagePanel can still be triggered from the dashboard chip.
  return null;
}
