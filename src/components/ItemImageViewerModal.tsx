import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, ExternalLink, Image as ImageIcon, Check, Edit2, Camera } from 'lucide-react';
import { getItemImageUrl, saveItemImageOverride } from '../utils/itemImages';
import { ItemImageUploadModal } from './ItemImageUploadModal';

export interface ItemImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id?: string;
    code?: string;
    name?: string;
    itemType?: string;
    classification?: string;
    category?: string;
    imageUrl?: string;
    rawItem?: any;
  } | null;
  onImageUpdated?: (newUrl: string) => void;
}

export const ItemImageViewerModal: React.FC<ItemImageViewerProps> = ({
  isOpen,
  onClose,
  item,
  onImageUpdated
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const initialUrl = item ? getItemImageUrl(item) : '';
  const [customUrlInput, setCustomUrlInput] = useState<string>(initialUrl);
  const [activeUrl, setActiveUrl] = useState<string>(initialUrl);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Sync image URL when item changes
  useEffect(() => {
    if (item) {
      const url = getItemImageUrl(item);
      setActiveUrl(url);
      setCustomUrlInput(url);
      setZoomLevel(1);
      setRotation(0);
      setImgError(false);
      setIsEditingUrl(false);
    }
  }, [item]);

  // Keyboard shortcut: Escape to close
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

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1);
    setRotation(0);
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    const trimmed = customUrlInput.trim();
    setActiveUrl(trimmed);
    setImgError(false);
    setIsEditingUrl(false);
    if (item.code) {
      saveItemImageOverride(item.code, trimmed);
    } else if (item.id) {
      saveItemImageOverride(item.id, trimmed);
    }
    if (onImageUpdated) {
      onImageUpdated(trimmed);
    }
  };

  const itemCode = item.code || item.id || 'ITEM-SPEC';
  const itemName = item.name || 'Catalog Item';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none p-4 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Container - Stop propagation so clicking inside does not dismiss */}
      <div
        className="relative max-w-5xl w-full max-h-[92vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP BAR: Minimalist Item Tag + View Controls + Close Button */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/80 border-b border-white/10 text-white z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0 pr-3">
            <span className="px-2.5 py-1 bg-sky-600/90 text-white rounded font-mono text-xs font-semibold tracking-wide shrink-0">
              {itemCode}
            </span>
            <h2 className="text-sm font-medium text-slate-200 truncate" title={itemName}>
              {itemName}
            </h2>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Current Zoom Indicator */}
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Reset Zoom & Orientation"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {/* Rotate */}
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Rotate Image 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Upload / Edit Photo (1MB limit) */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-2.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="Upload New Photo or Edit (Max 1MB)"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Upload / Edit</span>
            </button>

            {/* Edit / Change Image URL toggle */}
            <button
              type="button"
              onClick={() => setIsEditingUrl(!isEditingUrl)}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isEditingUrl ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Change Image URL"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Open Original in New Tab */}
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Open Full Image in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="w-px h-5 bg-white/20 mx-1" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-white/10 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
              title="Close Image Viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* OPTIONAL: INLINE IMAGE URL EDITING BAR */}
        {isEditingUrl && (
          <form
            onSubmit={handleSaveCustomUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border-b border-white/10"
          >
            <span className="text-xs text-slate-300 whitespace-nowrap font-medium">Image URL:</span>
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Paste direct image link (https://...)"
              className="flex-1 px-3 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded transition-colors cursor-pointer"
            >
              Save Image
            </button>
            <button
              type="button"
              onClick={() => setIsEditingUrl(false)}
              className="px-2 py-1 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* MAIN VIEWER VIEWPORT - PURE IMAGE VIEWING */}
        <div className="relative flex-1 min-h-[380px] max-h-[74vh] overflow-hidden flex items-center justify-center p-6 bg-[#0b0f19]">
          {imgError || !activeUrl ? (
            <div className="text-center p-8 max-w-md">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-slate-300 text-sm font-medium mb-1">Image Preview Unavailable</p>
              <p className="text-slate-400 text-xs mb-4">
                The image link could not be loaded directly. You can update the image URL using the edit button above.
              </p>
              <button
                type="button"
                onClick={() => setIsEditingUrl(true)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded-lg transition-colors font-medium"
              >
                Set Custom Image URL
              </button>
            </div>
          ) : (
            <div className="relative flex items-center justify-center max-w-full max-h-full transition-transform duration-150 ease-out">
              <img
                src={activeUrl}
                alt={itemName}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxHeight: '68vh',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
                className="rounded-lg shadow-2xl border border-white/10 pointer-events-auto transition-transform duration-200"
              />
            </div>
          )}
        </div>

        {/* BOTTOM CAPTION BAR */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-slate-300 font-medium">{itemName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-mono text-[11px]">{itemCode}</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500 shrink-0">
            <span>Scroll/Buttons to Zoom</span>
            <span>•</span>
            <span>Click outside or press Esc to close</span>
          </div>
        </div>
      </div>

      {isUploadModalOpen && (
        <ItemImageUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          item={{
            id: item.id,
            code: item.code,
            name: item.name,
            category: item.category,
            imageUrl: activeUrl,
            rawItem: item.rawItem
          }}
          onImageUpdated={(newUrl) => {
            setActiveUrl(newUrl);
            setCustomUrlInput(newUrl);
            setImgError(false);
            if (onImageUpdated) {
              onImageUpdated(newUrl);
            }
          }}
        />
      )}
    </div>
  );
};
