/**
 * Formats a French phone number for WhatsApp
 * Converts local format (06..., 07...) to international format (+33...)
 * @param phone - The phone number to format
 * @returns The formatted phone number for WhatsApp, or null if invalid
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all spaces, dots, dashes, and parentheses
  let cleaned = phone.replace(/[\s.\-()]/g, "");
  
  // If already starts with +, just clean it
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  // French mobile numbers starting with 06 or 07
  if (cleaned.startsWith("06") || cleaned.startsWith("07")) {
    // Remove leading 0 and add +33
    return "+33" + cleaned.substring(1);
  }
  
  // French landlines starting with 01-05, 08, 09
  if (/^0[1-589]/.test(cleaned)) {
    return "+33" + cleaned.substring(1);
  }
  
  // If starts with 33, add +
  if (cleaned.startsWith("33")) {
    return "+" + cleaned;
  }
  
  // Return as-is if we can't determine the format
  return cleaned;
}

/**
 * Opens WhatsApp with the given phone number
 * @param phone - The phone number to open WhatsApp with
 */
export function openWhatsApp(phone: string | null | undefined): void {
  const formatted = formatPhoneForWhatsApp(phone);
  if (formatted) {
    // wa.me requires the number WITHOUT the + prefix
    const waNumber = formatted.replace(/^\+/, "");
    window.open(`https://wa.me/${waNumber}`, "_blank");
  }
}
