// Nén ảnh ngay tại trình duyệt trước khi ghi vào IndexedDB (URD 2.1)
// Ưu tiên WebP; trình duyệt không mã hoá được WebP (một số bản Safari) thì dùng JPEG.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function render(img, maxEdge, quality) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  let blob = await toBlob(canvas, 'image/webp', quality);
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality);
  return blob;
}

export async function compressPhoto(file) {
  const { img, url } = await loadImage(file);
  try {
    const imageBlob = await render(img, 1280, 0.8);
    const thumbBlob = await render(img, 360, 0.7);
    return { imageBlob, thumbBlob, mime: imageBlob.type };
  } finally {
    URL.revokeObjectURL(url);
  }
}
