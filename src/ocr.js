// OCR module - fallback engine using Tesseract.js

import Tesseract from 'tesseract.js';

let worker = null;

export async function initOCR(onStatus) {
  onStatus?.('Mempersiapkan mesin OCR...');

  worker = await Tesseract.createWorker('ind+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onStatus?.(`Membaca teks... ${Math.round(m.progress * 100)}%`);
      }
    },
  });
}

export async function recognizeText(imageDataURL, onStatus) {
  if (!worker) {
    await initOCR(onStatus);
  }

  onStatus?.('Memulai OCR...');

  const result = await worker.recognize(imageDataURL);
  return result.data.text;
}

export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
