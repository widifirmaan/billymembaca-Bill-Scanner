// Receipt parser - extracts structured data from raw OCR text
import { parsePrice } from './utils.js';

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
  for (const line of lines.slice(0, 5)) {
    // Skip lines that are just numbers, dates, or addresses
    if (/^\d+[\/\-]\d+[\/\-]\d+/.test(line)) continue;
    if (/^(jl\.|jalan|telp|hp|no\.|alamat|komp\.)/i.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    
    // If it contains bank names, it's likely the store
    if (/(mandiri|bri|bca|bni|cimb|danamon|bank)/i.test(line)) return line;
    
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

  // Common receipt patterns
  const pricePattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/i;
  const qtyPricePattern = /(\d+)\s*[x×@]\s*(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*)/i;
  
  // Bank transaction pattern: "TARIK TUNAI AGEN"
  const bankTransactionPattern = /^(tarik tunai|transfer|pembayaran|setoran|mutasi|isi ulang|top up)/i;

  for (const line of lines) {
    // Skip header/footer lines but allow some bank keywords
    if (/^(total|subtotal|grand|tunai|cash|kembali|kembalian|change|tax|pajak|ppn|disc|diskon|adm|admin)/i.test(line) && !bankTransactionPattern.test(line)) continue;
    
    if (/^[\-=\*\.]+$/.test(line)) continue;
    if (/^(jl\.|jalan|telp|hp|no\.|alamat|terima|kasih|thank|notifikasi|tanda|terima|pelanggan)/i.test(line)) continue;
    if (line.length < 3) continue;

    const priceMatch = line.match(pricePattern);
    
    // If it matches a bank transaction type but no price on the same line, it might be a header for the price on next line
    // But usually bank receipts have "TOTAL : Rp 25.000"
    // So if it's a bank transaction line, we might want to capture it as the item name if it's prominent
    if (bankTransactionPattern.test(line) && !priceMatch) {
        // Special case: "TARIK TUNAI AGEN"
        // We'll search for the price in the next few lines or "TOTAL" lines
        continue; 
    }

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
      // Remove leading numbers/symbols
      name = name.replace(/^[\s:;.,rpRp]+/, '').trim();
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
    // Mandiri/EDC style: "TOTAL : Rp 25.000" or just "TOTAL 25.000"
    if (/^(total|grand\s*total|tarik\s*tunai|jumlah)/i.test(line)) {
      const match = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*$/);
      if (match) return parsePrice(match[1]);
    }
  }
  return null;
}

// parsePrice moved to utils.js
