# 🧾 Billy Membaca - Scanner Nota Belanja

**Billy Membaca** is a modern, high-performance web application designed to scan, extract, and manage shopping receipt data automatically. Powered by advanced **Groq AI (Vision)** and robust **OCR (Tesseract.js)**, this tool simplifies expense tracking by converting receipt images into structured data.

![Status](https://img.shields.io/badge/Status-Active_Development-success?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=for-the-badge&logo=vite)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript)
![Groq](https://img.shields.io/badge/AI-Groq_Llama_3.2-orange?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa)

---

## 📸 Application Showcase

Experience a seamless workflow from capturing receipts to managing data.

### Core Interfaces
| | |
|:---:|:---:|
| **Camera View** | **Scan Result** |
| ![Camera](https://raw.githubusercontent.com/widifirmaan/billy-membaca/main/public/screenshots/camera.png)<br>*Manual AI/OCR Toggle & Controls* | ![Result](https://raw.githubusercontent.com/widifirmaan/billy-membaca/main/public/screenshots/result.png)<br>*Structured Data Extraction* |
| **History View** | **Settings** |
| ![History](https://raw.githubusercontent.com/widifirmaan/billy-membaca/main/public/screenshots/history.png)<br>*Manage Saved Receipts* | ![Settings](https://raw.githubusercontent.com/widifirmaan/billy-membaca/main/public/screenshots/settings.png)<br>*AI & Image Quality Config* |

---

## 🚀 Features Overview

### 🤖 Intelligent Extraction
*   **Dual Engine Support**: Choose between high-accuracy **AI Analysis (Groq Vision)** or fast **Local OCR (Tesseract.js)**.
*   **Bank Receipt Optimization**: Specially tuned to recognize bank transactions (Mandiri, BCA, etc.), including transfer types and fees.
*   **Smart Multi-Scan**: Append multiple receipt photos into a single table result to handle long receipts.

### 📊 Data Management
*   **Export to Excel**: One-click export for individual receipts or the entire history to `.xls` / `.csv` format.
*   **Persistent History**: All scans are saved locally using IndexDB/LocalStorage, ensuring data persists after page reloads.
*   **Dynamic Editing**: Manually adjust extracted items, quantities, and prices before saving.

### 📱 Modern Experience
*   **Mobile-First Design**: Premium dark-mode UI with silk animations and glassmorphic elements.
*   **PWA Ready**: Installable on Android and iOS with offline caching support.
*   **Responsive Camera**: Supports multiple camera orientations and instant camera flipping.

---

## 🛠️ Tech Stack

### Frontend & Analytics
*   **Framework**: Vite (Vanilla JavaScript)
*   **AI Engine**: Groq AI SDK (`llama-3.2-11b-vision-preview`)
*   **OCR Library**: Tesseract.js (Multi-language support)
*   **Styling**: Pure CSS3 (Custom Design System with Glassmorphism)
*   **Data Export**: SheetJS (XLSX implementation)

### Infrastructure
*   **Storage**: Browser LocalStorage & IndexedDB
*   **Offline**: Service Worker (Custom Cache implementation)
*   **Deployment**: Optimized for Vercel / Netlify / GitHub Pages

---

## 📂 Project Structure

```bash
/
├── public/            # Static assets (SW, Manifest, Icons)
├── src/               # Source code
│   ├── groq.js        # Groq Vision implementation & Prompting
│   ├── parser.js      # OCR Text parsing & Bank patterns
│   ├── main.js        # App State & View Controllers
│   ├── table.js       # Dynamic result table management
│   ├── export.js      # Excel/CSV generation logic
│   └── style.css      # Core Design System
├── index.html         # Main Application UI
├── package.json       # Project dependencies
└── vite.config.js     # Build configuration
```

---

## 📦 Getting Started

### Prerequisites
*   **Node.js 18+**
*   **Groq API Key**: Obtain one from the [Groq Console](https://console.groq.com/keys).

### Installation & Development
1.  **Clone the repository**
2.  **Install Dependencies**
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    VITE_GROQ_API_KEY=your_groq_api_key_here
    ```
4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *Open the provided local URL (usually [http://localhost:5173](http://localhost:5173)) to start scanning.*

---

## 👥 Authors

Developed by **Widi Firmaan**.
