// ─── Centralized contact source options ───
// Used in both Contact and Prospect forms

export const CONTACT_SOURCE_OPTIONS = [
  { value: "google_ads", label: "Google Ads" },
  { value: "google_seo", label: "Google Search / SEO" },
  { value: "site_internet", label: "Site internet" },
  { value: "appel_entrant", label: "Appel entrant" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "recommandation", label: "Recommandation / bouche-à-oreille" },
  { value: "partenaire", label: "Partenaire" },
  { value: "centre_partenaire", label: "Centre de formation partenaire" },
  { value: "relance_ancien", label: "Relance ancien prospect" },
  { value: "passage_sur_place", label: "Passage sur place" },
  { value: "leboncoin", label: "Leboncoin" },
  { value: "emailing", label: "Emailing" },
  { value: "campagne_sms", label: "Campagne SMS" },
  { value: "autre", label: "Autre" },
] as const;

export type ContactSourceValue = typeof CONTACT_SOURCE_OPTIONS[number]["value"];

/**
 * Try to normalize a legacy free-text source to a known value.
 * Returns the matched value or null if no match.
 */
export function normalizeSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  
  const mappings: Record<string, ContactSourceValue> = {
    "google": "google_seo",
    "google ads": "google_ads",
    "google search": "google_seo",
    "seo": "google_seo",
    "site web": "site_internet",
    "site internet": "site_internet",
    "appel": "appel_entrant",
    "appel entrant": "appel_entrant",
    "whatsapp": "whatsapp",
    "facebook": "facebook",
    "instagram": "instagram",
    "tiktok": "tiktok",
    "bouche à oreille": "recommandation",
    "bouche-à-oreille": "recommandation",
    "recommandation": "recommandation",
    "parrainage": "recommandation",
    "partenaire": "partenaire",
    "relance": "relance_ancien",
    "passage": "passage_sur_place",
    "passage sur place": "passage_sur_place",
    "leboncoin": "leboncoin",
    "emailing": "emailing",
    "sms": "campagne_sms",
    "campagne sms": "campagne_sms",
    "publicité": "google_ads",
    "réseaux sociaux": "facebook",
    "salon": "autre",
  };

  // Exact match first
  if (mappings[lower]) return mappings[lower];

  // Partial match
  for (const [key, val] of Object.entries(mappings)) {
    if (lower.includes(key)) return val;
  }

  return null;
}

/**
 * Get label for a source value (or return raw value if not found).
 */
export function getSourceLabel(value: string | null | undefined): string {
  if (!value) return "";
  const option = CONTACT_SOURCE_OPTIONS.find(o => o.value === value);
  return option?.label || value;
}
