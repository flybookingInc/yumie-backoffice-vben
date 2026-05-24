import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

const E164_SHAPE = /^\+[1-9]\d{7,14}$/;
const DEFAULT_COUNTRY = 'TW';

export function normalizePhoneToCanonicalE164(phone: string): string {
  const raw = phone.trim();
  if (!raw) {
    throw new Error('請輸入電話號碼');
  }

  const parsed = parsePhoneNumberFromString(raw, DEFAULT_COUNTRY);
  if (!parsed || !parsed.isValid()) {
    throw new Error('請輸入有效電話號碼');
  }

  const canonical = parsed.number;
  if (!E164_SHAPE.test(canonical)) {
    throw new Error('請輸入有效電話號碼');
  }

  return canonical;
}
