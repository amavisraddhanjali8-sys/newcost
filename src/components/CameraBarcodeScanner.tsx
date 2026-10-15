import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Volume2,
  VolumeX,
  Keyboard,
  UploadCloud,
  FileImage,
  SwitchCamera,
  Play,
  Square
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { MaterialItem } from '../types';

export interface CameraBarcodeScannerProps {
  onBarcodeDetected: (code: string) => void;
  materials?: MaterialItem[];
  autoStart?: boolean;
  className?: string;
  onClose?: () => void;
}

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  timestamp: number;
}

// Sound synthesizer for scan beep
function playScannerBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1480, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Ignore audio errors on un-interacted page
  }
}

const ALL_BARCODE_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC
];

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  onBarcodeDetected,
  materials = [],
  autoStart = true,
  className = '',
  onClose
}) => {
  const [scannerMode, setScannerMode] = useState<'CAMERA' | 'HARDWARE_WEDGE' | 'IMAGE_UPLOAD'>('CAMERA');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedBox, setDetectedBox] = useState<DetectedBox | null>(null);
  const [lastDetectedCode, setLastDetectedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Scanner Gun Input
  const [hardwareInput, setHardwareInput] = useState<string>('');
  const hardwareInputRef = useRef<HTMLInputElement | null>(null);

  // Image Upload State
  const [isDecodingImage, setIsDecodingImage] = useState<boolean>(false);
  const [imageDecodeError, setImageDecodeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize ZXing Multi-Format Reader
  const getZxingReader = useCallback(() => {
    if (!codeReaderRef.current) {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, ALL_BARCODE_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);
      codeReaderRef.current = new BrowserMultiFormatReader(hints);
    }
    return codeReaderRef.current;
  }, []);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevs);
      if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (e) {
      console.debug('Failed to list video devices:', e);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    updateDeviceList();
  }, [updateDeviceList]);

  // Stop camera video stream
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setTorchOn(false);
    setDetectedBox(null);
  }, []);

  // Universal Code Found Handler
  const handleCodeFound = useCallback(
    (code: string, box?: { x: number; y: number; width: number; height: number }) => {
      const clean = code.trim();
      if (!clean) return;

      const now = Date.now();
      if (lastScannedCodeRef.current === clean && now - lastScannedTimeRef.current < 1200) {
        return; // debounce
      }

      lastScannedCodeRef.current = clean;
      lastScannedTimeRef.current = now;
      setLastDetectedCode(clean);

      if (box) {
        setDetectedBox({
          ...box,
          text: clean,
          timestamp: now
        });
      }

      if (soundEnabled) {
        playScannerBeep();
      }

      onBarcodeDetected(clean);

      setTimeout(() => {
        setDetectedBox((prev) => (prev && prev.timestamp === now ? null : prev));
      }, 2000);
    },
    [soundEnabled, onBarcodeDetected]
  );

  // Start Camera Stream with resilient fallbacks
  const startCamera = useCallback(
    async (targetFacing: 'environment' | 'user' = facingMode, deviceId?: string) => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;
      setCameraError(null);

      // Stop previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported by browser. Enter code manually or use Scanner Gun.');
        isStartingRef.current = false;
        return;
      }

      try {
        await new Promise((r) => setTimeout(r, 60));

        let stream: MediaStream | null = null;

        // 1. If explicit device ID selected
        if (deviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: deviceId } }
            });
          } catch (devErr) {
            console.warn('DeviceId constraint failed, falling back:', devErr);
          }
        }

        // 2. Try facing mode constraint (without strict resolution so it doesn't fail on laptops/tablets)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: targetFacing }
              }
            });
          } catch (e1) {
            console.warn('Facing mode constraint failed, falling back to video: true', e1);
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (e2: any) {
              console.warn('Generic video constraint failed:', e2);
              if (e2.name === 'NotAllowedError' || e2.name === 'PermissionDeniedError') {
                setCameraError('Camera access was denied. Please allow camera permissions in browser settings.');
              } else if (e2.name === 'NotFoundError' || e2.name === 'DevicesNotFoundError') {
                setCameraError('No camera found on this device. You can type or scan below.');
              } else {
                setCameraError(`Camera error: ${e2.message || 'Unable to open camera'}`);
              }
              isStartingRef.current = false;
              return;
            }
          }
        }

        if (!stream) {
          throw new Error('Unable to acquire camera stream');
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('Video play error:', playErr);
          }
        }

        setIsStreaming(true);
        updateDeviceList();

        // Check torch support
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities
            ? (videoTrack.getCapabilities() as unknown as { torch?: boolean })
            : null;
          setHasTorch(Boolean(capabilities?.torch));
        }
      } catch (err: any) {
        console.error('Camera startup error:', err);
        setCameraError(err.message || 'Failed to start camera');
        setIsStreaming(false);
      } finally {
        isStartingRef.current = false;
      }
    },
    [facingMode, updateDeviceList]
  );

  // Toggle front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Switch to specific camera device
  const handleSelectDevice = (devId: string) => {
    setSelectedDeviceId(devId);
    startCamera(facingMode, devId);
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
      } catch (e) {
        console.warn('Torch error:', e);
      }
    }
  };

  // Continuous Camera Detection Loop
  useEffect(() => {
    if (scannerMode !== 'CAMERA' || !isStreaming || !videoRef.current) return;

    let isScanning = true;
    let detector: {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; boundingBox: DOMRectReadOnly }>>;
    } | null = null;

    const windowWithDetector = window as unknown as {
      BarcodeDetector?: new (options?: { formats: string[] }) => {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; boundingBox: DOMRectReadOnly }>>;
      };
    };

    if (windowWithDetector.BarcodeDetector) {
      try {
        detector = new windowWithDetector.BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'code_93',
            'codabar',
            'ean_13',
            'ean_8',
            'itf',
            'upc_a',
            'upc_e',
            'qr_code',
            'data_matrix',
            'aztec',
            'pdf417'
          ]
        });
      } catch (e) {
        console.debug('BarcodeDetector init fallback to ZXing:', e);
      }
    }

    const zxingReader = getZxingReader();
    let frameCount = 0;

    const detectFrame = async () => {
      if (!isScanning) return;
      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationFrameIdRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      frameCount++;

      if (frameCount % 2 === 0) {
        try {
          let found = false;
          // Native detector
          if (detector) {
            try {
              const barcodes = await detector.detect(video);
              if (barcodes && barcodes.length > 0) {
                const b = barcodes[0];
                const videoW = video.videoWidth || 640;
                const videoH = video.videoHeight || 480;
                const rect = video.getBoundingClientRect();
                const scaleX = rect.width / videoW;
                const scaleY = rect.height / videoH;

                handleCodeFound(b.rawValue, {
                  x: b.boundingBox.x * scaleX,
                  y: b.boundingBox.y * scaleY,
                  width: b.boundingBox.width * scaleX,
                  height: b.boundingBox.height * scaleY
                });
                found = true;
              }
            } catch (err) {
              console.debug('Native detect error:', err);
            }
          }

          // ZXing canvas decode
          if (!found && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              try {
                const result = zxingReader.decodeFromCanvas(canvas);
                if (result) {
                  const text = result.getText();
                  const rect = video.getBoundingClientRect();
                  handleCodeFound(text, {
                    x: rect.width * 0.2,
                    y: rect.height * 0.35,
                    width: rect.width * 0.6,
                    height: rect.height * 0.3
                  });
                }
              } catch {
                // Not found on current frame
              }
            }
          }
        } catch (e) {
          console.debug('Scan error:', e);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(detectFrame);
    };

    animationFrameIdRef.current = requestAnimationFrame(detectFrame);

    return () => {
      isScanning = false;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [scannerMode, isStreaming, handleCodeFound, getZxingReader]);

  // Autostart effect
  useEffect(() => {
    if (autoStart && scannerMode === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [autoStart, scannerMode, startCamera, stopCamera]);

  // Hardware Scanner keyboard listener
  useEffect(() => {
    let keyBuffer: string[] = [];
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        activeEl !== hardwareInputRef.current &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          const scanned = keyBuffer.join('').trim();
          keyBuffer = [];
          if (scanned) {
            e.preventDefault();
            handleCodeFound(scanned);
          }
        } else {
          keyBuffer = [];
        }
        return;
      }

      if (e.key.length === 1) {
        if (diff > 120) keyBuffer = [];
        keyBuffer.push(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCodeFound]);

  // Handle image file upload
  const handleImageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingImage(true);
    setImageDecodeError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const zxing = getZxingReader();
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              const res = zxing.decodeFromCanvas(canvas);
              if (res) {
                handleCodeFound(res.getText());
                setIsDecodingImage(false);
                return;
              }
            } catch {
              // try direct
            }
          }
          setImageDecodeError('No barcode found in image.');
        } catch {
          setImageDecodeError('Failed to read image file.');
        } finally {
          setIsDecodingImage(false);
        }
      };
      img.src = imgUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = hardwareInput.trim();
    if (!clean) return;
    handleCodeFound(clean);
    setHardwareInput('');
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* 1. TOP BAR - CLEAN WHITE BOX WITH SIMPLE BUTTONS */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setScannerMode('CAMERA')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'CAMERA'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerMode('HARDWARE_WEDGE');
              stopCamera();
              setTimeout(() => hardwareInputRef.current?.focus(), 80);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'HARDWARE_WEDGE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Scanner Gun</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerMode('IMAGE_UPLOAD');
              stopCamera();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              scannerMode === 'IMAGE_UPLOAD'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {lastDetectedCode && (
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Code: {lastDetectedCode}
            </span>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. MODE: CAMERA SCANNER */}
      {scannerMode === 'CAMERA' && (
        <div className="p-4 bg-white space-y-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-slate-100">
            <span className="text-slate-700 font-semibold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {isStreaming ? 'Camera Active' : 'Camera Paused'}
            </span>

            <div className="flex items-center space-x-1.5">
              {availableDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleSelectDevice(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
                >
                  {availableDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={toggleFacingMode}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center space-x-1 cursor-pointer border border-slate-200"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                <span>{facingMode === 'environment' ? 'Rear' : 'Front'}</span>
              </button>

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-1 rounded text-xs border cursor-pointer ${
                    torchOn ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="Flashlight"
                >
                  {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                </button>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start</span>
                </button>
              )}
            </div>
          </div>

          {/* Video Feed Box */}
          <div className="relative bg-slate-950 rounded-lg h-56 sm:h-64 w-full overflow-hidden flex items-center justify-center border border-slate-200">
            <canvas ref={canvasRef} className="hidden" />
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                isStreaming ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Error or Standby Notice */}
            {(!isStreaming || cameraError) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-900/90 text-white z-10 space-y-2.5">
                {cameraError ? (
                  <>
                    <AlertCircle className="w-7 h-7 text-rose-400" />
                    <p className="text-xs text-slate-200 max-w-xs">{cameraError}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerMode('HARDWARE_WEDGE');
                          stopCamera();
                        }}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Use Barcode Gun
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-7 h-7 text-slate-400" />
                    <p className="text-xs text-slate-300">Camera ready</p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Start Camera
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Scan Reticle */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-32 border border-white/30 rounded-lg">
                  <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>
                {detectedBox && (
                  <div
                    className="absolute border-2 border-emerald-400 bg-emerald-500/20 rounded transition-all duration-100"
                    style={{
                      left: `${detectedBox.x}px`,
                      top: `${detectedBox.y}px`,
                      width: `${detectedBox.width}px`,
                      height: `${detectedBox.height}px`
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Quick Test Barcode Buttons - Always available */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Quick Test:</span>
            <div className="flex flex-wrap gap-1.5">
              {materials.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleCodeFound(m.code)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-mono rounded cursor-pointer border border-slate-200"
                >
                  {m.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODE: SCANNER GUN / HARDWARE (CLEAN WHITE BOX) */}
      {scannerMode === 'HARDWARE_WEDGE' && (
        <div className="p-4 bg-white space-y-3">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Scan Barcode with Gun or Enter Code:
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <ScanLine className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  ref={hardwareInputRef}
                  type="text"
                  value={hardwareInput}
                  onChange={(e) => setHardwareInput(e.target.value)}
                  placeholder="Scan or type barcode..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                Lookup
              </button>
            </div>
          </form>

          {/* Quick Test Chips */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Quick Test:</span>
            <div className="flex flex-wrap gap-1.5">
              {materials.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleCodeFound(m.code)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-mono rounded cursor-pointer border border-slate-200"
                >
                  {m.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODE: UPLOAD PHOTO */}
      {scannerMode === 'IMAGE_UPLOAD' && (
        <div className="p-4 bg-white space-y-3 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileSelected}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors space-y-2"
          >
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-800">
              {isDecodingImage ? 'Reading image...' : 'Select barcode image'}
            </div>
            <p className="text-[11px] text-slate-500">PNG, JPG, or WEBP</p>
          </div>

          {imageDecodeError && (
            <p className="text-xs text-rose-600">{imageDecodeError}</p>
          )}
        </div>
      )}
    </div>
  );
};
