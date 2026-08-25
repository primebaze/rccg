// Members type their number however they like ("07451 234567", "+44 7451
// 234567", "0044..."), but Twilio only accepts E.164 ("+447451234567"). Convert
// at send time so existing records work without a data migration.

const DEFAULT_COUNTRY_CODE = process.env.DEFAULT_PHONE_COUNTRY_CODE ?? "44";

export function toE164(phone: string, countryCode = DEFAULT_COUNTRY_CODE) {
  const trimmed = phone.trim();
  // Keep a leading +, drop spaces, dashes, brackets and dots.
  const cleaned = (trimmed.startsWith("+") ? "+" : "") + trimmed.replace(/[^\d]/g, "");

  if (cleaned.startsWith("+")) return cleaned;

  // International prefix written the long way, e.g. 004474...
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;

  // National trunk prefix, e.g. 07451... -> +447451...
  if (cleaned.startsWith("0")) return `+${countryCode}${cleaned.slice(1)}`;

  // Already carries the country code without a plus, e.g. 447451...
  if (cleaned.startsWith(countryCode)) return `+${cleaned}`;

  return `+${countryCode}${cleaned}`;
}
