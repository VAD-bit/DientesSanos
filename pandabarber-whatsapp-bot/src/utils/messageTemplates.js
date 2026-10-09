export function renderTemplate(template, vars = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  if (cleaned.length === 10 && cleaned.startsWith('0')) cleaned = '58' + cleaned.slice(1);
  if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '58' + cleaned.slice(1);
  if (cleaned.length === 12 && cleaned.startsWith('058')) cleaned = '58' + cleaned.slice(3);
  return cleaned;
}
