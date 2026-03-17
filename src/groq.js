// Groq AI module - alternative receipt analysis engine using Llama 3.2 Vision

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT = `Kamu adalah asisten yang ahli membaca nota/struk/bill belanja. 
Analisis foto nota belanja ini dan ekstrak data dalam format JSON berikut:

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

export async function analyzeWithGroq(base64Image, onStatus) {
  const apiKey = localStorage.getItem('groqApiKey');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY_MISSING');
  }

  const timeout = parseInt(localStorage.getItem('aiTimeout') || '60') * 1000;

  onStatus?.('Mengirim foto ke Groq AI...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error('RATE_LIMITED (Groq)');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Groq API Error details:', errData);
      throw new Error(errData?.error?.message || `HTTP ${response.status}`);
    }

    onStatus?.('Membaca respons Groq...');

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;

    if (!result) {
      throw new Error('EMPTY_RESPONSE (Groq)');
    }

    const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      store_name: parsedResult.store_name || 'Tidak Diketahui',
      date: parsedResult.date || null,
      items: (parsedResult.items || []).map((item, i) => ({
        name: item.name || `Item ${i + 1}`,
        qty: Math.max(1, parseInt(item.qty) || 1),
        price: Math.max(0, parseFloat(item.price) || 0),
      })),
      total:
        parsedResult.total ||
        (parsedResult.items || []).reduce(
          (sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.qty) || 1),
          0
        ),
      method: 'ai',
      engine: 'groq'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Groq analysis failed:', err);

    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT (Groq)');
    }

    throw err;
  }
}
