/**
 * Sprint 7 — Luhn validation for French SIREN/SIRET identifiers.
 * Used by the buyer-snapshot editor to surface invalid numbers before invoice emission.
 */

function luhnCheck(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[digits.length - 1 - i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

export function isValidSiren(raw: string | null | undefined): boolean {
  const d = onlyDigits(raw ?? "");
  if (d.length !== 9) return false;
  return luhnCheck(d);
}

export function isValidSiret(raw: string | null | undefined): boolean {
  const d = onlyDigits(raw ?? "");
  if (d.length !== 14) return false;
  // La Poste exception (356 000 000): historic non-Luhn.
  if (d.startsWith("356000000")) return true;
  return luhnCheck(d);
}

/** Returns a human error or null. Empty input is considered valid (use required separately). */
export function sirenError(raw: string | null | undefined): string | null {
  if (!raw || !onlyDigits(raw)) return null;
  const d = onlyDigits(raw);
  if (d.length !== 9) return "Le SIREN doit contenir 9 chiffres";
  if (!luhnCheck(d)) return "SIREN invalide (clé de contrôle Luhn)";
  return null;
}

export function siretError(raw: string | null | undefined): string | null {
  if (!raw || !onlyDigits(raw)) return null;
  const d = onlyDigits(raw);
  if (d.length !== 14) return "Le SIRET doit contenir 14 chiffres";
  if (d.startsWith("356000000")) return null;
  if (!luhnCheck(d)) return "SIRET invalide (clé de contrôle Luhn)";
  return null;
}
