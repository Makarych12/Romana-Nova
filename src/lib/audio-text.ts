// Romanian NFC, case and spacing only. Do not remove accents or fold ș/ş,
// ț/ţ, ă/a, â/a or î/i: those may select a different spoken word.
export const audioKey = (text: string) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
export const normalizeAudioText = (text: string) => audioKey(text).toLocaleLowerCase("ro");
// Same UTF-16 FNV-1a partitioning used by CHAMELEON BG's speech.ts.
export function audioLookupPrefix(text: string) {
  let hash = 2166136261;
  const key = normalizeAudioText(text);
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0").slice(0, 2);
}
