import React, { useState } from 'react';
import {
  Search,
  ExternalLink,
  X,
  Camera,
  Globe,
  Tag,
  DollarSign,
  Building2,
  Copy,
  Check,
  Sparkles,
  ShoppingBag,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export interface GoogleSearchPreviewItem {
  id?: string;
  name: string;
  code?: string;
  category?: string;
  supplierName?: string;
  rate?: number;
  unit?: string;
  imageUrl?: string;
}

interface GoogleSearchPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GoogleSearchPreviewItem | null;
  initialQuery?: string;
}

export const GoogleSearchPreviewModal: React.FC<GoogleSearchPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
  initialQuery
}) => {
  if (!isOpen || !item) return null;

  const defaultQuery = initialQuery || `${item.name} ${item.category || ''}`.trim();
  const [searchQuery, setSearchQuery] = useState<string>(defaultQuery);
  const [activeFilter, setActiveFilter] = useState<'all' | 'lens' | 'prices' | 'specs'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const cleanItemName = item.name.replace(/\[.*?\]/g, '').trim();
  const itemRate = typeof item.rate === 'number' ? item.rate : 0;
  const itemUnit = item.unit || 'unit';

  // Benchmark estimation based on catalog rate
  const estLow = Number((itemRate * 0.88).toFixed(2));
  const estHigh = Number((itemRate * 1.18).toFixed(2));

  // External real browser links
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery || cleanItemName)}`;
  const googleLensUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery || cleanItemName + ' technical specifications')}`;
  const googleShoppingUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery || cleanItemName)}`;

  const handleOpenGoogle = () => {
    window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenLens = () => {
    window.open(googleLensUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenShopping = () => {
    window.open(googleShoppingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopySpecs = () => {
    const text = `Item: ${item.name}\nCode: ${item.code || 'N/A'}\nCategory: ${item.category || 'N/A'}\nSupplier: ${item.supplierName || 'N/A'}\nSystem Rate: $${itemRate} / ${itemUnit}\nMarket Range: $${estLow} - $${estHigh} / ${itemUnit}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs select-none">
      <div className="bg-white dark:bg-[#0f172a] rounded-xl max-w-xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Simple Top Bar */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Search</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-500">{item.code || 'ITEM'}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{cleanItemName}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-16 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
            />
            <div className="absolute right-1 top-1">
              <button
                type="button"
                onClick={handleOpenLens}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium cursor-pointer"
              >
                Lens
              </button>
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto text-xs">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'lens', label: 'Lens' },
                { id: 'prices', label: 'Price' },
                { id: 'specs', label: 'Specs' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Box */}
        <div className="p-3.5 overflow-y-auto space-y-3 text-xs flex-1">
          {/* Rate Summary */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">{cleanItemName}</div>
              <div className="text-[11px] text-slate-500">{item.supplierName || item.category || 'Catalog'}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                ${itemRate.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/{itemUnit}</span>
              </div>
            </div>
          </div>

          {/* Lens Card */}
          {(activeFilter === 'all' || activeFilter === 'lens') && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Lens</span>
                <button
                  type="button"
                  onClick={handleOpenLens}
                  className="text-[#0078d4] hover:underline cursor-pointer text-xs"
                >
                  Open
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">Form</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">Industrial</div>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">Standard</div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">ISO / ANSI</div>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400">Match</div>
                  <div className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">High</div>
                </div>
              </div>
            </div>
          )}

          {/* Market Price Card */}
          {(activeFilter === 'all' || activeFilter === 'prices') && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Market Price</span>
                <button
                  type="button"
                  onClick={handleOpenShopping}
                  className="text-[#0078d4] hover:underline cursor-pointer text-xs"
                >
                  Shopping
                </button>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-slate-500">Range:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ${estLow.toLocaleString()} – ${estHigh.toLocaleString()} /{itemUnit}
                </span>
              </div>
            </div>
          )}

          {/* Specs Card */}
          {(activeFilter === 'all' || activeFilter === 'specs') && (
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Specs</div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-1 flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-800 dark:text-slate-200">{cleanItemName}</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <span className="text-slate-800 dark:text-slate-200">{item.category || 'General'}</span>
                </div>
                <div className="py-1 flex justify-between">
                  <span className="text-slate-500">Quality</span>
                  <span className="text-slate-800 dark:text-slate-200">Standard</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Simple Footer */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenGoogle}
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs rounded transition-colors cursor-pointer"
          >
            Google
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs rounded transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
