// Gemini AI module - primary receipt analysis engine

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const PROMPT = `Kamu adalah asisten yang ahli membaca nota/struk/bill belanja. 
Analisis gambar nota belanja ini dan ekstrak data dalam format JSON berikut:

{
  "store_name": "Nama Toko",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Nama barang",
      "qty": 1,
      "price": 10000
    }
  ],
  "total": 50000
}

Aturan:
- Harga dalam Rupiah (angka saja, tanpa Rp atau titik)
- Jika qty tidak terlihat, asumsikan 1
- Jika tanggal tidak terbaca, gunakan null
- Jika nama toko tidak terbaca, gunakan "Tidak Diketahui"
- Fokus hanya pada item belanja, abaikan info pajak/diskon kecuali jelas terpisah
- HANYA output JSON, tanpa teks lain`;

export async function analyzeWithGemini(base64Image, onStatus) {
  const apiKey = localStorage.getItem('geminiApiKey');
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const timeout = parseInt(localStorage.getItem('aiTimeout') || '15') * 1000;

  onStatus?.('Mengirim foto ke Gemini AI...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (response.status >= 500) {
      throw new Error('SERVER_ERROR');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    onStatus?.('Membaca respons AI...');

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('EMPTY_RESPONSE');
    }

    // Extract JSON from response (AI might wrap it in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('INVALID_JSON');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!result.items || !Array.isArray(result.items)) {
      throw new Error('INVALID_STRUCTURE');
    }

    // Normalize data
    return {
      store_name: result.store_name || 'Tidak Diketahui',
      date: result.date || null,
      items: result.items.map((item, i) => ({
        name: item.name || `Item ${i + 1}`,
        qty: Math.max(1, parseInt(item.qty) || 1),
        price: Math.max(0, parseFloat(item.price) || 0),
      })),
      total:
        result.total ||
        result.items.reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.qty) || 1),
          0
        ),
      method: 'ai',
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }

    throw err;
  }
}

export function isGeminiAvailable() {
  const mode = localStorage.getItem('analysisMode') || 'ai-first';
  const apiKey = localStorage.getItem('geminiApiKey');
  return mode === 'ai-first' && !!apiKey;
}
