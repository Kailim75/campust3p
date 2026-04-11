import { useCentreContext } from "@/contexts/CentreContext";

const DEFAULT_FROM_ADDRESS = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";
const DEFAULT_REPLY_TO = "montrouge@ecolet3p.fr";

interface CentreEmailConfig {
  fromAddress: string;
  replyTo: string;
}

/**
 * Returns the email sender config for the current centre.
 * Falls back to hardcoded defaults if not configured.
 */
export function useCentreEmailConfig(): CentreEmailConfig {
  const { currentCentre } = useCentreContext();

  const settings = currentCentre?.settings as Record<string, unknown> | null;

  const fromAddress =
    typeof settings?.email_from_address === "string" && settings.email_from_address.trim()
      ? settings.email_from_address.trim()
      : DEFAULT_FROM_ADDRESS;

  const replyTo =
    typeof settings?.email_reply_to === "string" && settings.email_reply_to.trim()
      ? settings.email_reply_to.trim()
      : DEFAULT_REPLY_TO;

  return { fromAddress, replyTo };
}
