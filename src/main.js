// Billy Membaca - Main Application Controller

import './style.css';
import { startCamera, stopCamera, flipCamera, capturePhoto, compressFileImage, getBase64Data, getFileSizeKB } from './camera.js';
import { analyzeWithGroq } from './groq.js';
import { recognizeText } from './ocr.js';
import { parseReceiptText } from './parser.js';
import { renderTable, addRow, getTableData, formatRupiah } from './table.js';
import { exportSingleReceipt, exportAllReceipts } from './export.js';
import { saveReceipt, getAllReceipts, deleteReceipt, clearAllReceipts } from './storage.js';

// ===== State =====
let currentImageData = null;
let currentReceipt = null;

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== Views =====
function showView(viewId) {
  $$('.view').forEach((v) => v.classList.remove('active'));
  $(`#view-${viewId}`).classList.add('active');

  $$('.nav-btn').forEach((b) => b.classList.remove('active'));
  const navBtn = $(`[data-view="${viewId}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Handle camera lifecycle
  if (viewId === 'camera') {
    startCameraView();
  } else {
    stopCamera();
  }

  if (viewId === 'history') {
    loadHistory();
  }
}

// ===== Toast =====
function showToast(msg, type = 'info') {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== Camera View =====
async function startCameraView() {
  const videoEl = $('#camera-preview');
  $('#captured-preview').style.display = 'none';
  $('#camera-container').style.display = 'block';

  const ok = await startCamera(videoEl);
  if (!ok) {
    showToast('Tidak bisa mengakses kamera. Gunakan tombol upload.', 'warning');
  }
}

function handleCapture() {
  const videoEl = $('#camera-preview');
  const canvasEl = $('#camera-canvas');

  currentImageData = capturePhoto(videoEl, canvasEl);
  if (currentImageData) {
    stopCamera();
    handleAnalyze();
  }
}

async function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    currentImageData = await compressFileImage(file);
    if (currentImageData) {
      handleAnalyze();
    }
  } catch (err) {
    showToast('Gagal memproses gambar', 'error');
  }
  e.target.value = '';
}

function showCapturedPreview(imageData) {
  stopCamera();
  $('#camera-container').style.display = 'none';
  $('#captured-preview').style.display = 'block';
  $('#captured-image').src = imageData;

  const sizeKB = getFileSizeKB(imageData);
  showToast(`Foto siap (${sizeKB} KB)`, 'success');
}

function handleRetake() {
  currentImageData = null;
  $('#captured-preview').style.display = 'none';
  $('#camera-container').style.display = 'block';
  startCameraView();
}

// ===== Analysis =====
async function handleAnalyze() {
  if (!currentImageData) return;

  // Show processing view
  showView('processing');
  $('#processing-image').src = currentImageData;
  $('#bottom-nav').style.display = 'none';

  const progressFill = $('#progress-fill');
  const statusEl = $('#processing-status');
  const titleEl = $('#processing-title');

  const updateStatus = (msg) => {
    statusEl.textContent = msg;
  };

  let result = null;
  const mode = localStorage.getItem('analysisMode') || 'ai-first';

  try {
    if (mode === 'ai-first') {
      // AI Mode
      titleEl.textContent = '🤖 Menganalisis dengan Groq AI...';
      progressFill.style.width = '30%';

      const base64 = getBase64Data(currentImageData);
      result = await analyzeWithGroq(base64, updateStatus);
      progressFill.style.width = '100%';
      showToast('Berhasil dianalisis oleh Groq! ✨', 'success');
    } else {
      // OCR Mode
      titleEl.textContent = '📝 Membaca dengan OCR...';
      progressFill.style.width = '50%';

      const rawText = await recognizeText(currentImageData, (msg) => {
        updateStatus(msg);
        // Approximate progress
        const match = msg.match(/(\d+)%/);
        if (match) {
          const pct = 50 + parseInt(match[1]) * 0.5;
          progressFill.style.width = `${pct}%`;
        }
      });

      progressFill.style.width = '90%';
      updateStatus('Mengekstrak data dari teks...');
      result = parseReceiptText(rawText);
      progressFill.style.width = '100%';
      showToast('Berhasil dibaca dengan OCR', 'success');
    }

    // Show result (merge if already exists)
    if (currentReceipt && currentReceipt.items && result.items) {
      result.items = [...currentReceipt.items, ...result.items];
      // Keep original store name and date if they exist
      result.store_name = currentReceipt.store_name || result.store_name;
      result.date = currentReceipt.date || result.date;
      result.method = 'mixed';
    }
    
    currentReceipt = result;
    showResult(result);
  } catch (err) {
    console.error('Analysis failed:', err);
    showToast('Gagal menganalisis nota: ' + err.message, 'error');
    showView('camera');
  } finally {
    $('#bottom-nav').style.display = 'flex';
  }
}

function showResult(receipt) {
  showView('result');

  // Method badge
  const badge = $('#result-method');
  if (receipt.method === 'ai') {
    badge.textContent = '🤖 Groq AI';
    badge.className = 'method-badge ai';
  } else {
    badge.textContent = '📝 OCR + Parser';
    badge.className = 'method-badge ocr';
  }

  // Store info
  $('#store-name').value = receipt.store_name || '';
  $('#receipt-date').value = receipt.date || new Date().toISOString().slice(0, 10);

  // Render table
  const tbodyEl = $('#items-tbody');
  const totalEl = $('#total-amount');
  renderTable(receipt.items, tbodyEl, totalEl);
}

// ===== Save & Export =====
async function handleSave() {
  const tbodyEl = $('#items-tbody');
  const items = getTableData(tbodyEl);

  const receipt = {
    store_name: $('#store-name').value || 'Tidak Diketahui',
    date: $('#receipt-date').value || null,
    items,
    method: currentReceipt?.method || 'manual',
    thumbnail: createThumbnail(currentImageData),
  };

  try {
    await saveReceipt(receipt);
    showToast('Nota berhasil disimpan! 💾', 'success');
    currentReceipt = receipt;
  } catch (err) {
    showToast('Gagal menyimpan: ' + err.message, 'error');
  }
}

function handleExportSingle() {
  const tbodyEl = $('#items-tbody');
  const items = getTableData(tbodyEl);

  const receipt = {
    store_name: $('#store-name').value || 'Tidak Diketahui',
    date: $('#receipt-date').value || null,
    items,
    method: currentReceipt?.method || 'manual',
  };

  try {
    const fileName = exportSingleReceipt(receipt);
    showToast(`Exported: ${fileName} 📥`, 'success');
  } catch (err) {
    showToast('Gagal export: ' + err.message, 'error');
  }
}

async function handleExportAll() {
  try {
    const receipts = await getAllReceipts();
    if (receipts.length === 0) {
      showToast('Belum ada nota untuk di-export', 'warning');
      return;
    }
    const fileName = exportAllReceipts(receipts);
    showToast(`Exported ${receipts.length} nota: ${fileName} 📥`, 'success');
  } catch (err) {
    showToast('Gagal export: ' + err.message, 'error');
  }
}

function createThumbnail(imageData) {
  if (!imageData) return null;
  const canvas = document.createElement('canvas');
  const img = new Image();
  img.src = imageData;

  canvas.width = 100;
  canvas.height = 130;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 100, 130);
  return canvas.toDataURL('image/jpeg', 0.5);
}

// ===== History =====
async function loadHistory() {
  const listEl = $('#history-list');
  const emptyEl = $('#history-empty');

  try {
    const receipts = await getAllReceipts();

    if (receipts.length === 0) {
      listEl.style.display = 'none';
      emptyEl.style.display = 'flex';
      return;
    }

    listEl.style.display = 'block';
    emptyEl.style.display = 'none';

    listEl.innerHTML = receipts
      .map(
        (r) => `
      <div class="history-card" data-id="${r.id}">
        <div class="history-card-header">
          <div>
            <div class="history-card-store">${escapeHtml(r.store_name || 'Tidak Diketahui')}</div>
            <div class="history-card-date">${r.date || 'Tanpa tanggal'} • ${r.method === 'ai' ? '🤖 AI' : '📝 OCR'}</div>
          </div>
          <div class="history-card-total">${formatRupiah(r.items.reduce((s, i) => s + i.qty * i.price, 0))}</div>
        </div>
        <div class="history-card-items">${r.items.length} item${r.items.length > 1 ? 's' : ''}: ${r.items.slice(0, 3).map((i) => i.name).join(', ')}${r.items.length > 3 ? '...' : ''}</div>
        <div class="history-card-actions">
          <button class="btn btn-accent btn-sm btn-export-receipt" data-id="${r.id}">📥 Export</button>
          <button class="btn btn-outline btn-sm btn-view-receipt" data-id="${r.id}">👁️ Lihat</button>
          <button class="btn btn-outline btn-sm btn-delete-receipt" data-id="${r.id}" style="color:var(--danger)">🗑️ Hapus</button>
        </div>
      </div>
    `
      )
      .join('');

    // Event listeners for history cards
    listEl.querySelectorAll('.btn-export-receipt').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const receipts = await getAllReceipts();
        const receipt = receipts.find((r) => r.id === id);
        if (receipt) {
          exportSingleReceipt(receipt);
          showToast('Exported! 📥', 'success');
        }
      });
    });

    listEl.querySelectorAll('.btn-view-receipt').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        const receipts = await getAllReceipts();
        const receipt = receipts.find((r) => r.id === id);
        if (receipt) {
          currentReceipt = receipt;
          showResult(receipt);
        }
      });
    });

    listEl.querySelectorAll('.btn-delete-receipt').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        if (confirm('Hapus nota ini?')) {
          await deleteReceipt(id);
          showToast('Nota dihapus', 'success');
          loadHistory();
        }
      });
    });
  } catch (err) {
    console.error('Failed to load history:', err);
    showToast('Gagal memuat riwayat', 'error');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===== Settings =====
function initSettings() {
  const apiKeyEl = $('#groq-api-key');
  const timeoutEl = $('#ai-timeout');
  const modeEl = $('#analysis-mode');
  const qualityEl = $('#image-quality');
  const qualityValueEl = $('#image-quality-value');
  const resolutionEl = $('#max-resolution');
  
  const toggleKeyBtn = $('#btn-toggle-groq-key');
  const clearHistoryBtn = $('#btn-clear-history');

  // Load saved values
  const defaultApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  if (!localStorage.getItem('groqApiKey') && defaultApiKey) {
    localStorage.setItem('groqApiKey', defaultApiKey);
  }

  apiKeyEl.value = localStorage.getItem('groqApiKey') || '';
  timeoutEl.value = localStorage.getItem('aiTimeout') || '60';
  modeEl.value = localStorage.getItem('analysisMode') || 'ai-first';
  qualityEl.value = localStorage.getItem('imageQuality') || '60';
  qualityValueEl.textContent = qualityEl.value + '%';
  resolutionEl.value = localStorage.getItem('maxResolution') || '1920';

  // Save on change
  apiKeyEl.addEventListener('input', () => localStorage.setItem('groqApiKey', apiKeyEl.value));
  timeoutEl.addEventListener('input', () => localStorage.setItem('aiTimeout', timeoutEl.value));
  modeEl.addEventListener('change', () => localStorage.setItem('analysisMode', modeEl.value));
  qualityEl.addEventListener('input', () => {
    localStorage.setItem('imageQuality', qualityEl.value);
    qualityValueEl.textContent = qualityEl.value + '%';
  });
  resolutionEl.addEventListener('change', () => localStorage.setItem('maxResolution', resolutionEl.value));

  // Toggle API key visibility
  toggleKeyBtn.addEventListener('click', () => {
    apiKeyEl.type = apiKeyEl.type === 'password' ? 'text' : 'password';
  });

  // Clear history
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Hapus semua riwayat nota? Tindakan ini tidak bisa dibatalkan.')) {
      await clearAllReceipts();
      showToast('Semua riwayat dihapus', 'success');
    }
  });
}

// ===== Analysis Switcher =====
function initAnalysisSwitcher() {
  const switcher = $('.analysis-switcher');
  const btns = $$('.switcher-btn');
  
  // Set initial state
  const currentMode = localStorage.getItem('analysisMode') || 'ai-first';
  setSwitcherMode(currentMode);

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      localStorage.setItem('analysisMode', mode);
      setSwitcherMode(mode);
      
      // Update the settings dropdown if it exists
      const settingsModeEl = $('#analysis-mode');
      if (settingsModeEl) settingsModeEl.value = mode;
      
      showToast(`Mode analisis: ${mode === 'ai-first' ? 'AI' : 'OCR'}`, 'info');
    });
  });
}

function setSwitcherMode(mode) {
  const switcher = $('.analysis-switcher');
  const btns = $$('.switcher-btn');
  
  switcher.setAttribute('data-selected', mode);
  btns.forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

// ===== Event Listeners =====
function initEventListeners() {
  // Navigation
  $$('.nav-btn, [data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) showView(view);
    });
  });

  // Camera
  $('#btn-capture').addEventListener('click', handleCapture);
  $('#file-input').addEventListener('change', handleFileUpload);
  $('#btn-flip').addEventListener('click', () => flipCamera($('#camera-preview')));
  $('#btn-retake').addEventListener('click', handleRetake);
  $('#btn-analyze').addEventListener('click', handleAnalyze);

  // Result actions
  $('#btn-save').addEventListener('click', handleSave);
  $('#btn-export-single').addEventListener('click', handleExportSingle);
  $('#btn-scan-again').addEventListener('click', () => {
    // Preserve currentReceipt to allow appending
    const tbodyEl = $('#items-tbody');
    if (currentReceipt) {
      currentReceipt.items = getTableData(tbodyEl);
      currentReceipt.store_name = $('#store-name').value;
      currentReceipt.date = $('#receipt-date').value;
    }
    currentImageData = null;
    showView('camera');
  });
  $('#btn-add-row').addEventListener('click', () => {
    addRow($('#items-tbody'), $('#total-amount'));
  });

  // History
  $('#btn-export-all').addEventListener('click', handleExportAll);

  // Empty state nav
  $('#history-empty')?.querySelector('[data-view]')?.addEventListener('click', () => {
    showView('camera');
  });
}

// ===== PWA Registration =====
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  }
}

// ===== Init =====
function init() {
  initEventListeners();
  initSettings();
  initAnalysisSwitcher();
  registerSW();
  showView('camera');
}

document.addEventListener('DOMContentLoaded', init);
