// Camera module - handles camera access, photo capture, and image compression

let stream = null;
let facingMode = 'environment';

export function getSettings() {
  return {
    quality: parseInt(localStorage.getItem('imageQuality') || '60') / 100,
    maxResolution: parseInt(localStorage.getItem('maxResolution') || '1920'),
  };
}

export async function startCamera(videoEl) {
  try {
    if (stream) stopCamera();

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 2560 },
      },
      audio: false,
    });

    videoEl.srcObject = stream;
    await videoEl.play();
    return true;
  } catch (err) {
    console.error('Camera error:', err);
    return false;
  }
}

export function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

export function flipCamera(videoEl) {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  return startCamera(videoEl);
}

export function capturePhoto(videoEl, canvasEl) {
  const { maxResolution, quality } = getSettings();

  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;

  // Scale down if needed
  let w = vw;
  let h = vh;
  const maxDim = Math.max(w, h);
  if (maxDim > maxResolution) {
    const scale = maxResolution / maxDim;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvasEl.width = w;
  canvasEl.height = h;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, w, h);

  // Return compressed JPEG as base64
  return canvasEl.toDataURL('image/jpeg', quality);
}

export async function compressFileImage(file) {
  const { maxResolution, quality } = getSettings();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const maxDim = Math.max(w, h);
      if (maxDim > maxResolution) {
        const scale = maxResolution / maxDim;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const b64 = atob(parts[1]);
  const arr = new Uint8Array(b64.length);
  for (let i = 0; i < b64.length; i++) arr[i] = b64.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function getBase64Data(dataURL) {
  return dataURL.split(',')[1];
}

export function getFileSizeKB(dataURL) {
  const base64 = dataURL.split(',')[1];
  return Math.round((base64.length * 3) / 4 / 1024);
}
