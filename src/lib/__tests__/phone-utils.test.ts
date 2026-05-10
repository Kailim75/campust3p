import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, formatPhoneForWhatsApp } from "../phone-utils";

describe("phone-utils", () => {
  it("normalise les numeros francais pour WhatsApp", () => {
    expect(formatPhoneForWhatsApp("06 12 34 56 78")).toBe("+33612345678");
    expect(formatPhoneForWhatsApp("07.12.34.56.78")).toBe("+33712345678");
    expect(formatPhoneForWhatsApp("+33 6 12 34 56 78")).toBe("+33612345678");
  });

  it("construit une URL WhatsApp avec message pre-rempli", () => {
    expect(buildWhatsAppUrl("06 12 34 56 78", "Bonjour Karim\nLigne 2")).toBe(
      "https://wa.me/33612345678?text=Bonjour%20Karim%0ALigne%202",
    );
  });

  it("retourne null sans telephone", () => {
    expect(buildWhatsAppUrl(null, "Bonjour")).toBeNull();
  });
});
