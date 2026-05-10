/**
 * Helpers de redaction pour les logs Edge Functions.
 *
 * Objectif : éviter de logger en clair des données sensibles
 * (emails, téléphones, tokens, clés API, URLs webhook, payloads
 * complets contenant des données client).
 *
 * Usage côté Edge Function :
 *   import { redactEmail, redactPayload } from "../_shared/redact.ts";
 *   console.log("payload:", redactPayload(body));
 */

const SENSITIVE_KEYS = new Set([
  "password", "pwd", "token", "access_token", "refresh_token",
  "api_key", "apikey", "x-api-key", "authorization", "secret",
  "service_role_key", "anon_key", "webhook_url", "webhook_secret",
]);

const PII_KEYS = new Set([
  "email", "telephone", "telephone_normalise", "phone", "tel",
  "iban", "bic", "rib", "numero_permis", "numero_carte_professionnelle",
  "date_naissance", "nom_naissance", "rue", "adresse",
]);

export function redactEmail(value: unknown): string {
  if (typeof value !== "string" || !value.includes("@")) return "[redacted]";
  const [local, domain] = value.split("@");
  const head = local.length <= 2 ? local[0] ?? "" : local.slice(0, 2);
  return `${head}***@${domain}`;
}

export function redactPhone(value: unknown): string {
  if (typeof value !== "string") return "[redacted]";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "[redacted]";
  return `***${digits.slice(-4)}`;
}

export function redactToken(value: unknown): string {
  if (typeof value !== "string" || value.length < 6) return "[redacted]";
  return `${value.slice(0, 3)}…${value.slice(-3)}`;
}

export function redactUrl(value: unknown): string {
  if (typeof value !== "string") return "[redacted]";
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}/[redacted-path]`;
  } catch {
    return "[redacted-url]";
  }
}

/**
 * Redacte récursivement un payload (objet/array). Ne mute pas l'original.
 * Limite la profondeur pour éviter les boucles infinies.
 */
export function redactPayload(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[max-depth]";
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redactPayload(v, depth + 1));
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const lk = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lk)) {
      out[key] = redactToken(raw);
    } else if (lk === "email") {
      out[key] = redactEmail(raw);
    } else if (lk.includes("phone") || lk.includes("telephone") || lk === "tel") {
      out[key] = redactPhone(raw);
    } else if (PII_KEYS.has(lk)) {
      out[key] = "[redacted-pii]";
    } else if (lk.includes("webhook") && typeof raw === "string") {
      out[key] = redactUrl(raw);
    } else if (typeof raw === "object") {
      out[key] = redactPayload(raw, depth + 1);
    } else {
      out[key] = raw;
    }
  }
  return out;
}
