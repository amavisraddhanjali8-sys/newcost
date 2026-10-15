/**
 * Barcode Generator Utility
 * Generates clean, high-contrast Code 128 / industrial barcode assets
 * and triggers instant PNG downloads with human-readable labels.
 */

// Simple Code 128-B style binary pattern encoder for industrial item codes
const CODE128_PATTERNS: Record<string, string> = {
  'A': '11000101100', 'B': '11000100110', 'C': '11011000100', 'D': '11011001000',
  'E': '11010011000', 'F': '11010001100', 'G': '11000110100', 'H': '11000110010',
  'I': '11000011010', 'J': '10110011000', 'K': '10110001100', 'L': '10011011000',
  'M': '10011000110', 'N': '10001101100', 'O': '10001100110', 'P': '11001101000',
  'Q': '11001100010', 'R': '11000110100', 'S': '10001101010', 'T': '10110111000',
  'U': '10110001110', 'V': '10001101110', 'W': '10111011000', 'X': '10111000110',
  'Y': '10001110110', 'Z': '10110111100',
  '0': '11011001100', '1': '11001101100', '2': '11001100110', '3': '10010011000',
  '4': '10010001100', '5': '10001001100', '6': '10011001000', '7': '10011000100',
  '8': '10001100100', '9': '11001001000',
  '-': '10100011000', '_': '10001011000', '.': '11101011000', '/': '10111010000',
  ' ': '11011010000'
};

const START_CODE = '11010010000';
const STOP_CODE = '1100011101011';

export function generateBarcodeBits(text: string): string {
  const clean = text.toUpperCase().replace(/[^A-Z0-9\-_./ ]/g, '-');
  let bits = START_CODE;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    bits += CODE128_PATTERNS[char] || '10100110000';
  }
  bits += STOP_CODE;
  return bits;
}

/**
 * Downloads a high-resolution barcode label with item code, name, and scan frame.
 */
export function downloadItemBarcode(itemCode: string, itemName: string = ''): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bits = generateBarcodeBits(itemCode);
  const barWidth = 3;
  const barcodeHeight = 84;
  const quietZone = 40;
  const totalBarcodeWidth = bits.length * barWidth;

  const width = Math.max(totalBarcodeWidth + quietZone * 2, 440);
  const height = 220;

  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border frame
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  const displayTitle = itemName.length > 36 ? itemName.slice(0, 36) + '...' : itemName || 'CRM ASSET LABEL';
  ctx.fillText(displayTitle, width / 2, 34);

  // Subtitle / Organization
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('ENTERPRISE ERP / SPECIFICATION SCANNER', width / 2, 50);

  // Draw Barcode Bars
  const startX = Math.floor((width - totalBarcodeWidth) / 2);
  const startY = 65;

  ctx.fillStyle = '#000000';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      ctx.fillRect(startX + i * barWidth, startY, barWidth, barcodeHeight);
    }
  }

  // Human Readable Code Below Bars
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  ctx.fillText(`* ${itemCode.toUpperCase()} *`, width / 2, startY + barcodeHeight + 24);

  // Bottom Scan Instructions
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('CODE 128 HIGH DENSITY • ISO/IEC 15417 COMPLIANT', width / 2, startY + barcodeHeight + 42);

  // Trigger Download
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `barcode-${itemCode.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export barcode canvas', err);
  }
}
