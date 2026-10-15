import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowRight,
  FileText,
  History,
  Download,
  QrCode,
  Edit2,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Check,
  Maximize2,
  Camera,
  UploadCloud,
  Search
} from 'lucide-react';
import { getItemImageUrl, saveItemImageOverride } from '../utils/itemImages';
import { downloadItemBarcode } from '../utils/barcodeGenerator';
import { downloadItemImage } from '../utils/imageDownloader';
import { GoogleSearchPreviewModal } from './GoogleSearchPreviewModal';

export interface ItemGridCardData {
  id: string;
  code?: string;
  name?: string;
  itemType?: string;
  category?: string;
  subCategory?: string;
  classification?: string;
  rate: number;
  unit: string;
  status?: string;
  supplierName?: string;
  supplierCountry?: string;
  email?: string;
  phone?: string;
  stockOrScope?: string;
  imageUrl?: string;
  rawItem?: any;
  priceHistory?: any[];
}

export interface ItemGridCardProps {
  item: ItemGridCardData;
  isSelected?: boolean;
  onSelectToggle?: (id: string) => void;
  onViewDetailsAndAudit: (item: ItemGridCardData, initialTab?: 'details' | 'audit') => void;
  onViewAuditLogFXTT?: (item: ItemGridCardData) => void;
  onOpenImageViewer?: (item: ItemGridCardData) => void;
  onEdit?: (item: ItemGridCardData) => void;
  onDelete?: (item: ItemGridCardData) => void;
  onShowNotification?: (msg: string) => void;
}

export const ItemGridCard: React.FC<ItemGridCardProps> = ({
  item,
  isSelected = false,
  onSelectToggle,
  onViewDetailsAndAudit,
  onViewAuditLogFXTT,
  onOpenImageViewer,
  onEdit,
  onDelete,
  onShowNotification
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState(false);
  const [isDragOverCard, setIsDragOverCard] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(getItemImageUrl(item));
  const menuRef = useRef<HTMLDivElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  const itemCode = item.code || item.id || 'ITEM';
  const itemName = item.name || 'Catalog Item';

  // Sync image URL when item changes
  useEffect(() => {
    setCurrentImageUrl(getItemImageUrl(item));
    setImageError(false);
  }, [item]);

  // Listen to global image update events for real-time reactivity across all views
  useEffect(() => {
    const handleImageUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      if (
        detail.idOrCode === item.code ||
        detail.idOrCode === item.id ||
        (item.rawItem?.code && detail.idOrCode === item.rawItem.code) ||
        (item.rawItem?.id && detail.idOrCode === item.rawItem.id)
      ) {
        setCurrentImageUrl(getItemImageUrl(item));
        setImageError(false);
      }
    };

    window.addEventListener('fxtt-image-updated', handleImageUpdated);
    return () => window.removeEventListener('fxtt-image-updated', handleImageUpdated);
  }, [item]);

  // Close command menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle direct file upload with strict 1MB restriction
  const handleProcessImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (onShowNotification) {
        onShowNotification('Invalid file. Please select an image file (PNG, JPG, WEBP, SVG).');
      }
      return;
    }

    // STRICT 1MB RESTRICTION
    const MAX_1MB = 1 * 1024 * 1024;
    if (file.size > MAX_1MB) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      if (onShowNotification) {
        onShowNotification(`Image upload restricted: file is ${sizeMb} MB. Maximum allowed is 1.00 MB.`);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (item.code) saveItemImageOverride(item.code, dataUrl);
        if (item.id) saveItemImageOverride(item.id, dataUrl);
        setCurrentImageUrl(dataUrl);
        setImageError(false);
        if (onShowNotification) {
          onShowNotification(`Image updated successfully for ${itemCode} (<1MB)`);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(true);
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
  };

  const handleCardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadBarcode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    downloadItemBarcode(itemCode, itemName);
    if (onShowNotification) {
      onShowNotification(`Barcode for ${itemCode} downloaded`);
    }
  };

  const handleDownloadImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    await downloadItemImage(currentImageUrl, itemCode, itemName);
    if (onShowNotification) {
      onShowNotification(`Image for ${itemName} downloaded`);
    }
  };

  const handleProductDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onViewDetailsAndAudit(item, 'details');
  };

  const handlePriceAuditDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onViewDetailsAndAudit(item, 'audit');
  };

  const handleFullScreenAuditLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onViewAuditLogFXTT) {
      onViewAuditLogFXTT(item);
    } else {
      onViewDetailsAndAudit(item, 'audit');
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onEdit) onEdit(item);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    if (onDelete) onDelete(item);
  };

  // Handler for arrow button and product name: opens the price changes audit log FXTT grid view (full screen)
  const handleArrowOrNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewAuditLogFXTT) {
      onViewAuditLogFXTT(item);
    } else {
      onViewDetailsAndAudit(item, 'audit');
    }
  };

  // Handler for the pill button / details action: opens the details and price audit modal
  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetailsAndAudit(item, 'details');
  };

  return (
    <>
      <div
        onDragOver={handleCardDragOver}
        onDragLeave={handleCardDragLeave}
        onDrop={handleCardDrop}
        className={`relative flex flex-col justify-between p-3 sm:p-3.5 min-h-[220px] max-h-[250px] sm:min-h-[230px] sm:max-h-[260px] rounded-2xl overflow-hidden transition-all duration-300 select-none shadow-md hover:shadow-xl group border ${
          isDragOverCard
            ? 'border-sky-400 ring-4 ring-sky-400/50 scale-[1.01]'
            : isSelected
            ? 'border-sky-400 ring-3 ring-sky-400 ring-offset-2 ring-offset-slate-900 scale-[1.01]'
            : 'border-white/20 hover:-translate-y-0.5'
        } bg-slate-900`}
      >
        {/* Hidden File Input for Card-level Image Upload */}
        <input
          ref={cardFileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleProcessImageFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {/* Drag Overlay Feedback */}
        {isDragOverCard && (
          <div className="absolute inset-0 z-30 bg-sky-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white border-2 border-dashed border-sky-400 rounded-2xl">
            <UploadCloud className="w-8 h-8 text-sky-300 mb-1 animate-bounce" />
            <span className="text-xs font-bold text-white">Drop to Upload Image</span>
            <span className="text-[10px] text-sky-200 font-mono">Max file size: 1 MB</span>
          </div>
        )}

        {/* 1. PRODUCT FULL IMAGE FITTING THE CARD BACKGROUND */}
        {!imageError && currentImageUrl ? (
          <img
            src={currentImageUrl}
            alt={itemName}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#025da4] via-[#014782] to-[#002a52] flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* 2. ATMOSPHERIC CONTRAST VIGNETTE & GRADIENT OVERLAYS */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-slate-950/70" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,transparent_30%,rgba(0,0,0,0.4)_100%)]" />

        {/* 3. TOP BAR: Code badge on left, Upload/Edit Photo & Info circle icon on right */}
        <div className="relative z-10 flex items-center justify-between w-full">
          {/* Left: Selection check & Code badge */}
          <div className="flex items-center space-x-1.5 min-w-0">
            {onSelectToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectToggle(item.id);
                }}
                className={`w-4.5 h-4.5 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-white text-[#003049] border-white font-bold'
                    : 'bg-black/40 border-white/40 hover:border-white text-transparent'
                }`}
                title="Select Item"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/25 text-white font-mono text-[10px] font-semibold tracking-wide shadow-xs truncate max-w-[130px]">
              {itemCode}
            </span>
          </div>

          {/* Right Action Icons: Upload/Edit Image + Info Menu */}
          <div className="flex items-center space-x-1.5 shrink-0" ref={menuRef}>
            {/* Quick Google & Lens Search Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsGoogleSearchOpen(true);
              }}
              className="w-7 h-7 rounded-full border border-white/80 bg-black/45 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#0078d4] hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
              title={`Quick Google & Lens Search for "${itemName}"`}
              aria-label="Google & Lens Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Info Circle Icon with Command Popover Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="w-7 h-7 rounded-full border border-white/80 bg-black/45 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all shadow-sm cursor-pointer active:scale-95"
                title="Item Commands: Search Google, Details, Barcode, Audit Log, Edit, Delete"
                aria-label="Info Menu"
              >
                <span className="font-serif font-bold text-xs leading-none italic">i</span>
              </button>

              {/* Info Popover Commands Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-9 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[11px] text-slate-400 font-semibold tracking-wide flex items-center justify-between">
                    <span>ACTIONS FOR {itemCode}</span>
                    <span className="text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]">
                      {item.category || 'Catalog'}
                    </span>
                  </div>

                  {/* Command: Google & Google Lens Search */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      setIsGoogleSearchOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#0078d4] flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-[#0078d4] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>Search Google &amp; Lens</span>
                        <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Live Lens
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">Preview search results &amp; market specs</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Command: Product Details */}
                  <button
                    type="button"
                    onClick={handleProductDetails}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-[#0077b6] flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">Product Details</div>
                      <div className="text-[10px] text-slate-400">View specifications & technical parameters</div>
                    </div>
                  </button>

                  {/* Command: Price Audit Details */}
                  <button
                    type="button"
                    onClick={handlePriceAuditDetails}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-sky-50 hover:text-[#0077b6] flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">Price Audit Details</div>
                      <div className="text-[10px] text-slate-400">View rate breakdown & revision history</div>
                    </div>
                  </button>

                  {/* Command: Price Changes Audit Log (FXTT Grid View - Full Screen) */}
                  <button
                    type="button"
                    onClick={handleFullScreenAuditLog}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800">FXTT Audit Grid (Full Screen)</div>
                      <div className="text-[10px] text-amber-600 font-medium">Price changes audit log FXTT grid</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Command: Download Image */}
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Download Image</span>
                  </button>

                  {/* Command: Download Barcode */}
                  <button
                    type="button"
                    onClick={handleDownloadBarcode}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2.5 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-slate-700 shrink-0" />
                    <span className="font-medium">Download Barcode</span>
                  </button>

                  {onOpenImageViewer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onOpenImageViewer(item);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="font-medium">Zoom Full Image</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100" />

                  {/* Command: Edit */}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-800 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-medium">Edit Item</span>
                    </button>
                  )}

                  {/* Command: Delete */}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="font-medium">Delete Item</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. CENTER AREA: Clear visual display allowing full product background to shine */}
        <div
          className="relative z-10 flex-1 flex flex-col justify-center items-center my-1.5 cursor-pointer"
          onClick={handleDetailsClick}
          title={`Click to view details for ${itemName}`}
        >
          {/* Subtle hover hint */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/45 backdrop-blur-md rounded-full px-2.5 py-0.5 text-white text-[10px] font-medium border border-white/20 shadow-sm flex items-center space-x-1">
            <FileText className="w-3 h-3 text-sky-300" />
            <span>Click for Details</span>
          </div>
        </div>

        {/* 5. BOTTOM PILL BUTTON: Compact, balanced scale */}
        {/* Left side (black arrow circle & product name) triggers Price Changes Audit Log FXTT Grid View (Full Screen) */}
        {/* Right side (Price & Unit / Details) triggers details and price audit modal */}
        <div className="relative z-10 w-full bg-white rounded-full p-1 sm:p-1.5 flex items-center justify-between gap-1.5 shadow-xl border border-white/90 hover:shadow-2xl transition-all">
          {/* Left Section: Black circle with white right arrow + Product Name */}
          <button
            type="button"
            onClick={handleArrowOrNameClick}
            className="flex-1 flex items-center space-x-2 text-left min-w-0 pr-1 cursor-pointer group/name rounded-full hover:bg-slate-100/70 p-0.5 -m-0.5 transition-colors"
            title="Click arrow or product name to view Price Changes Audit Log FXTT Grid View (Full Screen)"
          >
            {/* Black circle with white arrow */}
            <div className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-black flex items-center justify-center text-white shrink-0 shadow-sm group-hover/name:scale-105 group-hover/name:bg-[#003049] transition-all">
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>

            {/* Product Name & Subtitle */}
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight truncate group-hover/name:text-[#0077b6] transition-colors leading-tight">
                {itemName}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono truncate flex items-center space-x-1 mt-0.5">
                <span>{item.category || itemCode}</span>
                {item.supplierName && (
                  <>
                    <span>•</span>
                    <span className="truncate">{item.supplierName}</span>
                  </>
                )}
              </p>
            </div>
          </button>

          {/* Right Section: Price & Unit & Details Button */}
          <button
            type="button"
            onClick={handleDetailsClick}
            className="shrink-0 text-right pl-1.5 pr-2 py-0.5 rounded-full hover:bg-sky-50 transition-colors cursor-pointer border-l border-slate-200 group/rate"
            title="Click to view Item Details & Price Audit Details"
          >
            <div className="text-xs sm:text-[13px] font-bold text-[#003049] group-hover/rate:text-[#0077b6] transition-colors">
              ${item.rate < 1 ? item.rate.toFixed(3) : item.rate.toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 block -mt-0.5 font-medium">
              /{item.unit || 'unit'}
            </div>
          </button>
        </div>
      </div>

      {/* Google & Google Lens Quick Search Preview Modal */}
      {isGoogleSearchOpen && (
        <GoogleSearchPreviewModal
          isOpen={isGoogleSearchOpen}
          onClose={() => setIsGoogleSearchOpen(false)}
          item={{
            id: item.id,
            code: itemCode,
            name: itemName,
            category: item.category,
            supplierName: item.supplierName,
            rate: item.rate,
            unit: item.unit
          }}
        />
      )}
    </>
  );
};
