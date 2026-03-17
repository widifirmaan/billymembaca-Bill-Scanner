// Receipt parser - extracts structured data from raw OCR text

export function parseReceiptText(rawText) {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const storeName = extractStoreName(lines);
  const date = extractDate(rawText);
  const items = extractItems(lines);
  const total = extractTotal(lines) || items.reduce((s, i) => s + i.price * i.qty, 0);

  return {
    store_name: storeName,
    date,
    items,
    total,
    method: 'ocr',
  };
}

function extractStoreName(lines) {
  // Usually the first 1-2 non-empty, non-date lines
  for (const line of lines.slice(0, 3)) {
    // Skip lines that are just numbers, dates, or addresses
    if (/^\d+[\/\-]\d+[\/\-]\d+/.test(line)) continue;
    if (/^(jl\.|jalan|telp|hp|no\.|alamat)/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.length > 3) return line;
  }
  return 'Tidak Diketahui';
}

function extractDate(text) {
  // Try various date formats
  const patterns = [
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, // DD/MM/YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, // DD/MM/YY
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match) {
      let [, a, b, c] = match;
      // Determine format
      if (a.length === 4) {
        return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      } else if (c.length === 4) {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else {
        const year = parseInt(c) + 2000;
        return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function extractItems(lines) {
  const items = [];

  // Common receipt patterns:
  // "Item Name    Rp 10.000" 
  // "Item Name  2 x 5.000  10.000"
  // "2 Item Name  10,000"

  const pricePattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/i;
  const qtyPricePattern = /(\d+)\s*[x×@]\s*(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*)/i;

  for (const line of lines) {
    // Skip header/footer lines
    if (/^(total|subtotal|grand|tunai|cash|kembali|kembalian|change|tax|pajak|ppn|disc|diskon)/i.test(line)) continue;
    if (/^[\-=\*\.]+$/.test(line)) continue;
    if (/^(jl\.|jalan|telp|hp|no\.|alamat|terima|kasih|thank)/i.test(line)) continue;
    if (line.length < 3) continue;

    const priceMatch = line.match(pricePattern);
    if (!priceMatch) continue;

    const price = parsePrice(priceMatch[1]);
    if (price <= 0) continue;

    // Try to extract qty
    const qtyMatch = line.match(qtyPricePattern);
    let qty = 1;
    let unitPrice = price;
    let name = '';

    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]) || 1;
      unitPrice = parsePrice(qtyMatch[2]);
      name = line
        .substring(0, line.indexOf(qtyMatch[0]))
        .replace(/^\d+\s*/, '')
        .trim();
    } else {
      // Extract name (everything before the price)
      name = line.substring(0, priceMatch.index).trim();
      // Remove leading numbers that might be item numbers
      name = name.replace(/^\d{1,2}[\.\)\s]+/, '').trim();
      // Remove trailing qty indicators
      name = name.replace(/\s+\d+\s*$/, '').trim();
    }

    if (name.length < 1) continue;

    items.push({
      name,
      qty,
      price: qtyMatch ? unitPrice : price,
    });
  }

  return items;
}

function extractTotal(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/^(total|grand\s*total)/i.test(line)) {
      const match = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/);
      if (match) return parsePrice(match[1]);
    }
  }
  return null;
}

function parsePrice(str) {
  // Handle Indonesian format: 10.000 or 10,000
  let cleaned = str.replace(/\s/g, '');

  // If ends with .XX or ,XX where XX is 1-2 digits, treat as decimal
  if (/[.,]\d{1,2}$/.test(cleaned) && !/[.,]\d{3}/.test(cleaned)) {
    cleaned = cleaned.replace(',', '.');
  } else {
    // Remove thousand separators
    cleaned = cleaned.replace(/[.,]/g, '');
  }

  return Math.round(parseFloat(cleaned) || 0);
}
