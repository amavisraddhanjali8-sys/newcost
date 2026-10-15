/**
 * Global Barcode Scanner Listener
 * Detects rapid sequences of keystrokes followed by an 'Enter' key,
 * representing hardware USB / Bluetooth / HID Wedge barcode scanners.
 */

export interface BarcodeScanEventDetail {
  code: string;
  timestamp: number;
  charCount: number;
  averageIntervalMs: number;
}

type BarcodeListenerCallback = (detail: BarcodeScanEventDetail) => void;

const listeners: Set<BarcodeListenerCallback> = new Set();

// Maximum time allowed between keystrokes for it to be considered a hardware scanner (in milliseconds)
const MAX_KEYSTROKE_INTERVAL_MS = 140;
// Minimum character length for a valid barcode
const MIN_BARCODE_LENGTH = 3;

interface Keystroke {
  char: string;
  time: number;
}

let keystrokeBuffer: Keystroke[] = [];
let isListening = false;

/**
 * Pleasant auditory feedback on successful hardware barcode scan
 */
export function playHardwareScanBeep(success = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(success ? 1600 : 440, ctx.currentTime);
    if (success) {
      // Crisp 2-tone enterprise scanner beep
      osc.frequency.setValueAtTime(2200, ctx.currentTime + 0.04);
    }
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.12 : 0.25));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.25));
  } catch (e) {
    // AudioContext might be restricted by browser policy before first interaction
  }
}

/**
 * Dispatches scan to all subscribers and the window
 */
function handleBarcodeDetected(scannedCode: string, avgInterval: number, count: number, originalEvent: KeyboardEvent) {
  // Prevent form submission or accidental default Enter key behaviors
  originalEvent.preventDefault();
  originalEvent.stopPropagation();

  playHardwareScanBeep(true);

  const detail: BarcodeScanEventDetail = {
    code: scannedCode,
    timestamp: Date.now(),
    charCount: count,
    averageIntervalMs: Math.round(avgInterval * 10) / 10
  };

  // Dispatch global DOM custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<BarcodeScanEventDetail>('global-barcode-scan', {
        detail
      })
    );
  }

  // Notify registered TypeScript callbacks
  listeners.forEach((cb) => {
    try {
      cb(detail);
    } catch (err) {
      console.error('Error in barcode subscriber callback:', err);
    }
  });

  // Attempt to populate any currently visible barcode / SKU search inputs in the DOM
  populateVisibleLookupFields(scannedCode);
}

/**
 * Searches the DOM for active or visible barcode/SKU search inputs and auto-fills them
 */
export function populateVisibleLookupFields(scannedCode: string) {
  if (typeof document === 'undefined') return;

  // Search targets: elements with data-barcode-input="true" or specific IDs/names
  const targets = Array.from(
    document.querySelectorAll<HTMLInputElement>(
      'input[data-barcode-input="true"], input[name="barcode"], input[name="sku"], input#barcode-search, input#manual-barcode-input, input#inventory-lookup'
    )
  );

  for (const input of targets) {
    // Fill and trigger standard React input events so bound state updates
    input.value = scannedCode;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    // Optional focus
    input.focus();
    input.select();
  }
}

/**
 * Global keydown listener capturing hardware wedge bursts
 */
function handleKeyDown(e: KeyboardEvent) {
  if (!e || typeof e.key !== 'string') {
    return;
  }

  const now = performance.now();

  // If the key is 'Enter', check if the preceding keystrokes represent a rapid barcode scan
  if (e.key === 'Enter') {
    if (keystrokeBuffer && keystrokeBuffer.length >= MIN_BARCODE_LENGTH) {
      const firstTime = keystrokeBuffer[0].time;
      const lastTime = keystrokeBuffer[keystrokeBuffer.length - 1].time;
      const totalDuration = lastTime - firstTime;
      const avgInterval = totalDuration / Math.max(1, keystrokeBuffer.length - 1);

      // Verify that this was a rapid burst from a scanner rather than deliberate human typing
      if (avgInterval <= MAX_KEYSTROKE_INTERVAL_MS) {
        const scannedCode = keystrokeBuffer.map((k) => k.char).join('');
        keystrokeBuffer = [];
        handleBarcodeDetected(scannedCode, avgInterval, scannedCode.length, e);
        return;
      }
    }
    // Reset buffer on enter if not a barcode
    keystrokeBuffer = [];
    return;
  }

  // Ignore control keys, alt, meta, caps lock, etc.
  if (!e.key || e.key.length > 1) {
    if (e.key === 'Escape') {
      keystrokeBuffer = [];
    }
    return;
  }

  // Calculate time since previous key
  if (keystrokeBuffer && keystrokeBuffer.length > 0) {
    const lastKeystroke = keystrokeBuffer[keystrokeBuffer.length - 1];
    const interval = now - lastKeystroke.time;

    // If typing was too slow (> MAX_KEYSTROKE_INTERVAL_MS), discard old buffer and start fresh
    if (interval > MAX_KEYSTROKE_INTERVAL_MS) {
      keystrokeBuffer = [];
    }
  }

  // Append key to buffer
  keystrokeBuffer.push({
    char: e.key,
    time: now
  });

  // Prevent memory accumulation: cap buffer at 128 characters
  if (keystrokeBuffer.length > 128) {
    keystrokeBuffer.shift();
  }
}

/**
 * Mount the global listener (idempotent, safe to call multiple times)
 */
export function initGlobalBarcodeScanner(): () => void {
  if (typeof window === 'undefined' || isListening) {
    return () => {};
  }

  isListening = true;
  // Use capture: true so that we intercept the barcode burst before intermediate child handlers
  window.addEventListener('keydown', handleKeyDown, { capture: true });

  return () => {
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    isListening = false;
    keystrokeBuffer = [];
  };
}

/**
 * Register a callback to be invoked whenever a barcode is scanned globally
 */
export function addBarcodeScanListener(callback: BarcodeListenerCallback): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
