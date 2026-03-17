/**
 * Robust price parsing for Indonesian and international currency formats.
 * Handles cases like:
 * - 10.000 -> 10000
 * - 10,000 -> 10000
 * - 10.000,50 -> 10000.5
 * - Rp. 10.000 -> 10000
 */
export function parsePrice(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;

  // Remove currency symbols, spaces, and non-numeric characters except dots and commas
  let cleaned = str.replace(/[^\d.,]/g, '').trim();

  // If it's just empty now, return 0
  if (!cleaned) return 0;

  // Indonesian format check: 10.000 (dot as thousand separator)
  // Or International format: 10,000 (comma as thousand separator)
  
  // If there are multiple dots/commas, it's definitely a thousand separator
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;

  if (dotCount > 1) {
    // Multiple dots = thousand separators (e.g., 1.000.000)
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(',', '.'); // Change decimal comma to dot
  } else if (commaCount > 1) {
    // Multiple commas = thousand separators (e.g., 1,000,000)
    cleaned = cleaned.replace(/,/g, '');
  } else if (dotCount === 1 && commaCount === 1) {
    // Both exist (e.g., 1.000,50 or 1,000.50)
    const dotIndex = cleaned.indexOf('.');
    const commaIndex = cleaned.indexOf(',');
    if (dotIndex < commaIndex) {
      // 1.000,50 (ID format)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,000.50 (US format)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (dotCount === 1) {
    // Only one dot. Could be decimal (10.50) or thousand separator (10.000)
    // Receipt logic: if there are 3 digits after the dot, it's likely a thousand separator in ID
    const parts = cleaned.split('.');
    if (parts[1].length === 3) {
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (commaCount === 1) {
    // Only one comma. Typically ID decimal or US thousand separator
    const parts = cleaned.split(',');
    if (parts[1].length === 3) {
      cleaned = cleaned.replace(/,/g, '');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  return parseFloat(cleaned) || 0;
}
