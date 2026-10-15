import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  RotateCcw,
  Link,
  Trash2,
  FileImage
} from 'lucide-react';
import { getItemImageUrl, saveItemImageOverride, removeItemImageOverride } from '../utils/itemImages';

export interface ItemImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id?: string;
    code?: string;
    name?: string;
    category?: string;
    imageUrl?: string;
    rawItem?: any;
  } | null;
  onImageUpdated?: (newUrl: string) => void;
  onShowNotification?: (msg: string) => void;
}

const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1MB limit (1,048,576 bytes)

export const ItemImageUploadModal: React.FC<ItemImageUploadModalProps> = ({
  isOpen,
  onClose,
  item,
  onImageUpdated,
  onShowNotification
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize preview on modal open
  useEffect(() => {
    if (item && isOpen) {
      const current = getItemImageUrl(item);
      setPreviewUrl(current);
      setCustomUrlInput(current);
      setSelectedFile(null);
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [item, isOpen]);

  // Escape key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const itemCode = item.code || item.id || 'ITEM-001';
  const itemName = item.name || 'Catalog Item';

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Invalid file type. Please upload an image file (PNG, JPG, WEBP, SVG, GIF).');
      return;
    }

    // STRICT 1MB VALIDATION
    if (file.size > MAX_IMAGE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `Image exceeds 1MB limit (${sizeMb} MB). Maximum allowed upload size is 1.00 MB. Please choose a smaller or compressed image.`
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Process file to data URL for immediate persistence and offline caching
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSelectedFile(file);
        setPreviewUrl(result);
        setErrorMessage(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) {
      setErrorMessage('Please enter a valid image URL.');
      return;
    }
    setErrorMessage(null);
    setSelectedFile(null);
    setPreviewUrl(customUrlInput.trim());
  };

  const handleSave = () => {
    if (!previewUrl) {
      setErrorMessage('No image selected to save.');
      return;
    }

    setIsSaving(true);
    try {
      if (item.code) {
        saveItemImageOverride(item.code, previewUrl);
      }
      if (item.id) {
        saveItemImageOverride(item.id, previewUrl);
      }

      if (onImageUpdated) {
        onImageUpdated(previewUrl);
      }

      if (onShowNotification) {
        onShowNotification(`Image updated successfully for ${itemCode}`);
      }

      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to save image. Please try again.');
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (item.code) removeItemImageOverride(item.code);
    if (item.id) removeItemImageOverride(item.id);

    const defaultUrl = getItemImageUrl({ ...item, imageUrl: undefined });
    setPreviewUrl(defaultUrl);
    setCustomUrlInput(defaultUrl);
    setSelectedFile(null);
    setErrorMessage(null);

    if (onImageUpdated) {
      onImageUpdated(defaultUrl);
    }
    if (onShowNotification) {
      onShowNotification(`Reset to default catalog photo for ${itemCode}`);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600/30 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
              <FileImage className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate">Upload & Edit Item Image</h2>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {itemCode} • {itemName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#0077b6] text-[#0077b6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload File (Max 1MB)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#0077b6] text-[#0077b6]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Web Image URL</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Tab 1: File Upload (Drag and Drop + Click to browse) */}
          {activeTab === 'upload' && (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center group ${
                  dragActive
                    ? 'border-sky-500 bg-sky-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50 hover:bg-sky-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-sky-600 mb-2.5 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="text-xs font-semibold text-slate-800 mb-1">
                  Drag & drop image here, or <span className="text-[#0077b6] underline">browse files</span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Supports PNG, JPG, WEBP, SVG, GIF.
                </p>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-semibold">
                  Strict File Size Limit: 1 MB
                </div>
              </div>

              {selectedFile && (
                <div className="mt-3 p-2.5 bg-sky-50/60 border border-sky-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 min-w-0 pr-2">
                    <FileImage className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{selectedFile.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {(selectedFile.size / 1024).toFixed(1)} KB / 1024 KB
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Custom URL */}
          {activeTab === 'url' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Image Web Address (URL)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3.5 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                >
                  Preview
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct link to high-resolution product photography on Unsplash or company CDN.
              </p>
            </div>
          )}

          {/* Live Preview Area */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Card Background Preview</span>
              <span className="text-[10px] text-slate-400 font-normal">Scaled view inside item card</span>
            </div>

            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={itemName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 text-xs">
                  <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
                  <span>No image selected</span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

              {/* Sample Mini Badge */}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] font-mono text-white border border-white/20">
                {itemCode}
              </div>

              {/* Sample Mini Pill Preview */}
              <div className="absolute bottom-2 left-2 right-2 bg-white/95 rounded-full px-2.5 py-1 flex items-center justify-between text-[11px] shadow-md">
                <span className="font-bold text-slate-800 truncate pr-2">{itemName}</span>
                <span className="font-bold text-sky-700 shrink-0 font-mono">Sample Card</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer font-medium"
            title="Revert to system default image"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !previewUrl}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0077b6] hover:bg-[#005f92] rounded-lg shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
