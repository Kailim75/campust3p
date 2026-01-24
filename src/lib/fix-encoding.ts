/**
 * Utility to fix common UTF-8 encoding issues (double-encoded characters)
 * This handles text that was incorrectly interpreted as Latin-1 instead of UTF-8.
 */

// Common replacement patterns for double-encoded UTF-8 characters
const ENCODING_REPLACEMENTS: [RegExp, string][] = [
  // French accents (most common)
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ãª/g, "ê"],
  [/Ã«/g, "ë"],
  [/Ã /g, "à"],
  [/Ã¢/g, "â"],
  [/Ã¤/g, "ä"],
  [/Ã¹/g, "ù"],
  [/Ã»/g, "û"],
  [/Ã¼/g, "ü"],
  [/Ã®/g, "î"],
  [/Ã¯/g, "ï"],
  [/Ã´/g, "ô"],
  [/Ã¶/g, "ö"],
  [/Ã§/g, "ç"],
  [/Å"/g, "œ"],
  [/Ã¦/g, "æ"],
  [/Ã‰/g, "É"],
  [/Ãˆ/g, "È"],
  [/ÃŠ/g, "Ê"],
  [/Ã€/g, "À"],
  [/Ã‚/g, "Â"],
  [/Ã™/g, "Ù"],
  [/Ã›/g, "Û"],
  [/ÃŽ/g, "Î"],
  [/Ã"/g, "Ô"],
  [/Ã‡/g, "Ç"],
  // Punctuation
  [/â€™/g, "'"],
  [/â€“/g, "–"],
  [/â€”/g, "—"],
  [/â€œ/g, "\""],
  [/â€/g, "\""],
  [/â€¦/g, "…"],
  [/Â«/g, "«"],
  [/Â»/g, "»"],
  [/Â°/g, "°"],
  [/â‚¬/g, "€"],
  // Other common issues
  [/Ã¯/g, "ï"],
  [/Ãº/g, "ú"],
  [/Ã±/g, "ñ"],
  [/Ã¡/g, "á"],
  [/Ã­/g, "í"],
  [/Ã³/g, "ó"],
];

/**
 * Fix common encoding issues in a string
 * @param text The text that may contain encoding issues
 * @returns The text with encoding issues fixed
 */
export function fixEncoding(text: string | null | undefined): string {
  if (!text) return "";
  
  let result = text;
  for (const [pattern, replacement] of ENCODING_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
}

/**
 * Check if a string appears to have encoding issues
 */
export function hasEncodingIssues(text: string | null | undefined): boolean {
  if (!text) return false;
  
  // Check for common double-encoded patterns (Ã followed by specific chars)
  return /Ã[€¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿àáâãäåæçèéêëìíîï]/.test(text) || /â€/.test(text);
}
