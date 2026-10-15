/**
 * Image Downloader Utility
 * Fetches or downloads high-resolution item images directly with clean naming
 */

export async function downloadItemImage(imageUrl: string, itemCode: string, itemName: string = ''): Promise<boolean> {
  if (!imageUrl) return false;

  const safeName = (itemCode || itemName || 'item-asset')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const filename = `${safeName}-photo.jpg`;

  try {
    // Attempt direct blob download via fetch
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      return true;
    }
  } catch {
    // If CORS prevents direct blob fetch, fallback to canvas or opening direct image
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      // timeout after 2.5s
      setTimeout(() => reject(new Error('timeout')), 2500);
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 800;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
  } catch {
    // Ultimate fallback: open image in new tab with instructions or trigger link download
    const a = document.createElement('a');
    a.href = imageUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  return false;
}
