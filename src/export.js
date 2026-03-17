// Excel export module using SheetJS

import * as XLSX from 'xlsx';
import { formatRupiah } from './table.js';

export function exportSingleReceipt(receipt) {
  const wb = XLSX.utils.book_new();

  // Header info
  const headerRows = [
    ['Billy Membaca - Nota Belanja'],
    [],
    ['Toko', receipt.store_name || 'Tidak Diketahui'],
    ['Tanggal', receipt.date || '-'],
    ['Metode', receipt.method === 'ai' ? 'Groq AI' : 'OCR'],
    [],
    ['No', 'Item', 'Qty', 'Harga', 'Subtotal'],
  ];

  // Item rows
  const itemRows = receipt.items.map((item, i) => [
    i + 1,
    item.name,
    item.qty,
    item.price,
    item.qty * item.price,
  ]);

  // Total row
  const totalRow = [
    '',
    '',
    '',
    'TOTAL',
    receipt.items.reduce((sum, item) => sum + item.qty * item.price, 0),
  ];

  const allRows = [...headerRows, ...itemRows, [], totalRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 30 }, // Item
    { wch: 6 },  // Qty
    { wch: 15 }, // Harga
    { wch: 15 }, // Subtotal
  ];

  const storeName = (receipt.store_name || 'Nota').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
  XLSX.utils.book_append_sheet(wb, ws, storeName);

  const fileName = `nota_${storeName}_${receipt.date || 'tanpa-tanggal'}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
}

export function exportAllReceipts(receipts) {
  if (!receipts || receipts.length === 0) return null;

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = [
    ['Billy Membaca - Ringkasan Semua Nota'],
    [],
    ['No', 'Toko', 'Tanggal', 'Jumlah Item', 'Total', 'Metode'],
    ...receipts.map((r, i) => [
      i + 1,
      r.store_name || '-',
      r.date || '-',
      r.items.length,
      r.items.reduce((sum, item) => sum + item.qty * item.price, 0),
      r.method === 'ai' ? 'AI' : 'OCR',
    ]),
    [],
    [
      '',
      '',
      '',
      'Grand Total',
      '',
      receipts.reduce(
        (sum, r) =>
          sum + r.items.reduce((s, item) => s + item.qty * item.price, 0),
        0
      ),
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 8 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // Individual sheets for each receipt
  receipts.forEach((receipt, i) => {
    const rows = [
      ['Toko', receipt.store_name || '-'],
      ['Tanggal', receipt.date || '-'],
      [],
      ['No', 'Item', 'Qty', 'Harga', 'Subtotal'],
      ...receipt.items.map((item, j) => [
        j + 1,
        item.name,
        item.qty,
        item.price,
        item.qty * item.price,
      ]),
      [],
      ['', '', '', 'TOTAL', receipt.items.reduce((s, it) => s + it.qty * it.price, 0)],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 6 },
      { wch: 15 },
      { wch: 15 },
    ];

    const name = `Nota ${i + 1}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const fileName = `nota_semua_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
}
