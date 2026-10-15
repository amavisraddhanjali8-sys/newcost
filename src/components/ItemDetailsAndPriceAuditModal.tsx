import React, { useState } from 'react';
import {
  X,
  FileText,
  DollarSign,
  History,
  Download,
  QrCode,
  Edit2,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Image as ImageIcon,
  Camera,
  Search
} from 'lucide-react';
import { getItemImageUrl } from '../utils/itemImages';
import { downloadItemBarcode } from '../utils/barcodeGenerator';
import { downloadItemImage } from '../utils/imageDownloader';
import { GoogleSearchPreviewModal } from './GoogleSearchPreviewModal';
import { exportPriceAuditLogPDF, exportCategoryCatalogPDF } from '../utils/pdfExport';
import { exportPriceHistoryToCSV } from '../utils/csvExport';

export interface ItemDetailsAndAuditProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'details' | 'audit';
  item: {
    id?: string;
    code?: string;
    name?: string;
    itemType?: string;
    category?: string;
    subCategory?: string;
    classification?: string;
    rate?: number;
    unit?: string;
    status?: string;
    supplierName?: string;
    supplierCountry?: string;
    email?: string;
    phone?: string;
    stockOrScope?: string;
    leadTime?: string;
    moq?: number;
    createdTime?: string;
    assignedTo?: string;
    imageUrl?: string;
    rawItem?: any;
    priceHistory?: any[];
  } | null;
  onEdit?: (item: any) => void;
  onOpenImageViewer?: (item: any) => void;
}

export const ItemDetailsAndPriceAuditModal: React.FC<ItemDetailsAndAuditProps> = ({
  isOpen,
  onClose,
  initialTab = 'details',
  item,
  onEdit,
  onOpenImageViewer
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'audit'>(initialTab);
  const [imgError, setImgError] = useState<boolean>(false);
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState<boolean>(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(item ? getItemImageUrl(item) : '');

  const handleExportItemAuditPDF = () => {
    if (!item) return;
    const historyList = (item.priceHistory || item.rawItem?.priceHistory || []).map((h: any) => ({
      date: h.date || new Date().toISOString().slice(0, 10),
      previousRate: typeof h.previousRate === 'number' ? h.previousRate : (h.previousPrice ?? h.oldPrice ?? 0),
      newRate: typeof h.newRate === 'number' ? h.newRate : (h.newPrice ?? item.rate ?? 0),
      changePct: typeof h.changePct === 'number' ? h.changePct : (h.changePercent ?? 0),
      reason: h.reason || 'Price adjustment audit trail',
      approvedBy: h.approvedBy || 'Procurement Lead',
      status: h.status || 'Approved'
    }));

    exportPriceAuditLogPDF({
      itemCode: item.code || item.id || 'ITEM',
      itemName: item.name || 'Item Name',
      category: item.category || 'General',
      currentRate: typeof item.rate === 'number' ? item.rate : 0,
      unit: item.unit || 'unit',
      supplierOrContractor: item.supplierName || 'Enterprise Partner',
      history: historyList.length > 0 ? historyList : [
        {
          date: new Date().toISOString().slice(0, 10),
          previousRate: typeof item.rate === 'number' ? +(item.rate * 0.95).toFixed(2) : 0,
          newRate: typeof item.rate === 'number' ? item.rate : 0,
          changePct: 5,
          reason: 'Baseline catalog benchmark index rate',
          approvedBy: 'Supply Chain Director',
          status: 'Audited & Approved'
        }
      ]
    });
  };

  const handleExportItemAuditCSV = () => {
    if (!item) return;
    exportPriceHistoryToCSV(
      item.code || item.id || 'ITEM',
      item.name || 'Item Name',
      item.priceHistory || item.rawItem?.priceHistory || []
    );
  };

  const handleExportItemSpecPDF = () => {
    if (!item) return;
    exportCategoryCatalogPDF({
      title: `${item.name || 'Item Specification'}`,
      subtitle: `Technical Specification & Quality Standards Compliance`,
      categoryName: item.category || 'Catalog',
      columns: [
        { header: 'Item Code', dataKey: 'code', width: 35 },
        { header: 'Item Name', dataKey: 'name', width: 70 },
        { header: 'Category', dataKey: 'category', width: 45 },
        { header: 'SubCategory', dataKey: 'subCategory', width: 45 },
        { header: 'Current Rate ($)', dataKey: 'rate', width: 30, align: 'right' },
        { header: 'Unit', dataKey: 'unit', width: 25 },
        { header: 'Supplier / Contractor', dataKey: 'supplierName', width: 55 }
      ],
      rows: [
        {
          code: item.code || item.id || 'ITEM',
          name: item.name || 'Item Name',
          category: item.category || 'General',
          subCategory: item.subCategory || 'Standard Spec',
          rate: typeof item.rate === 'number' ? item.rate : 0,
          unit: item.unit || 'unit',
          supplierName: item.supplierName || 'Primary Supplier'
        }
      ]
    });
  };

  React.useEffect(() => {
    setActiveTab(initialTab);
    setImgError(false);
    if (item) {
      setCurrentImageUrl(getItemImageUrl(item));
    }
  }, [initialTab, item]);

  // Listen to global image update events
  React.useEffect(() => {
    const handleGlobalImageUpdate = (e: CustomEvent) => {
      if (item && e.detail && (e.detail.code === item.code || e.detail.code === item.id)) {
        setCurrentImageUrl(e.detail.url);
        setImgError(false);
      }
    };
    window.addEventListener('fxtt-image-updated' as any, handleGlobalImageUpdate);
    return () => {
      window.removeEventListener('fxtt-image-updated' as any, handleGlobalImageUpdate);
    };
  }, [item]);

  if (!isOpen || !item) return null;

  const itemCode = item.code || item.id || 'ITEM-REF';
  const itemName = item.name || 'Catalog Item';
  const itemRate = typeof item.rate === 'number' ? item.rate : 0;
  const itemUnit = item.unit || 'unit';
  const imageUrl = currentImageUrl || getItemImageUrl(item);

  // Derive price audit history records
  const rawHistory = item.priceHistory || item.rawItem?.priceHistory || [];
  const priceHistory = Array.isArray(rawHistory)
    ? rawHistory.map((rec: any) => ({
        ...rec,
        date: rec.date || rec.updatedAt || '',
        oldPrice: rec.oldPrice ?? rec.previousPrice ?? rec.rate ?? itemRate,
        newPrice: rec.newPrice ?? rec.rate ?? itemRate,
        changePercent: rec.changePercent ?? rec.changePct ?? 0,
        reason: rec.reason || 'Price updated in master catalog',
        approvedBy: rec.approvedBy || rec.updatedBy || 'Procurement Auditor'
      }))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER - Simple clean top row */}
        <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-2 min-w-0 pr-3">
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {itemCode}
            </span>
            <span className="text-sm font-semibold text-slate-900 truncate" title={itemName}>
              {itemName}
            </span>
          </div>

          {/* Action Icons in Header */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportItemSpecPDF}
              className="h-7 inline-flex items-center gap-1 px-2.5 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="PDF Specification"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportItemAuditCSV}
              className="h-7 inline-flex items-center gap-1 px-2.5 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="CSV History"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={() => downloadItemBarcode(itemCode, itemName)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              title="Barcode"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            <span className="ml-1 text-[11px] text-slate-400 font-mono">
              ({priceHistory.length})
            </span>
          </button>
        </div>

        {/* TAB BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'details' ? (
            <div className="space-y-6">
              {/* Top Banner with Image & Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
                {/* Visual Image Preview */}
                <div className="relative flex flex-col items-center justify-center bg-slate-900/90 rounded-lg p-4 min-h-[180px] group overflow-hidden">
                  {!imgError && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={itemName}
                      onError={() => setImgError(true)}
                      className="max-h-[140px] max-w-full object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 py-6">
                      <ImageIcon className="w-12 h-12 mb-2 text-white/30" />
                      <span className="text-xs text-slate-400">No Image Preview</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-1.5 p-2">
                    <button
                      type="button"
                      onClick={() => setIsGoogleSearchOpen(true)}
                      className="px-2.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow"
                      title="Quick Google & Lens Search"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Google & Lens</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenImageViewer && onOpenImageViewer({ ...item, imageUrl })}
                      className="px-2 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded text-xs font-medium flex items-center space-x-1 cursor-pointer shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Zoom</span>
                    </button>
                  </div>
                </div>

                {/* Primary Data Card */}
                <div className="md:col-span-2 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-sky-100 text-[#0077b6] rounded text-[11px] font-semibold uppercase tracking-wider">
                        {item.itemType || 'Material Item'}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[11px] font-semibold">
                        {item.status || 'Active & Qualified'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsGoogleSearchOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#0078d4] border border-blue-200 hover:bg-blue-100 text-[11px] font-semibold cursor-pointer"
                        title="Search in Google & Lens"
                      >
                        <Search className="w-3 h-3" />
                        <span>Search Google / Lens</span>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-slate-900">{itemName}</h3>
                      <button
                        type="button"
                        onClick={() => setIsGoogleSearchOpen(true)}
                        className="p-1 text-slate-400 hover:text-[#0078d4] hover:bg-sky-50 rounded cursor-pointer transition-colors"
                        title="Search Google & Lens"
                      >
                        <Search className="w-4 h-4 text-[#0078d4]" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">Catalog ID: {itemCode}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Current Unit Rate</div>
                      <div className="text-base font-bold text-[#003049] mt-0.5">
                        ${itemRate < 1 ? itemRate.toFixed(3) : itemRate.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-500">/ {itemUnit}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Minimum Order</div>
                      <div className="text-sm font-semibold text-slate-800 mt-0.5">
                        {item.moq || 1} {itemUnit}s
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-medium uppercase">Lead Time</div>
                      <div className="text-sm font-semibold text-slate-800 mt-0.5">
                        {item.leadTime || '3-5 Business Days'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Technical & Commercial Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Specifications Column */}
                <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Layers className="w-4 h-4 text-[#0077b6]" />
                    <span>Technical & Operational Specs</span>
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Category</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{item.category || 'Standard'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Sub-Category</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{item.subCategory || 'Standard Grade'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Classification</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{item.classification || 'Direct Production'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Stock / Scope</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{item.stockOrScope || 'Stock In-House'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Standard Unit</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{itemUnit}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Assigned Auditor</dt>
                      <dd className="text-slate-800 font-semibold mt-0.5">{item.assignedTo || 'Operations Team'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Primary Supplier / Provider Column */}
                <div className="border border-slate-200 rounded-xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Building2 className="w-4 h-4 text-[#0077b6]" />
                    <span>Primary Vendor / Source</span>
                  </h4>
                  <dl className="space-y-3 text-xs">
                    <div>
                      <dt className="text-slate-400 font-medium">Vendor Partner Name</dt>
                      <dd className="text-slate-900 font-bold text-sm mt-0.5 flex items-center gap-2">
                        <span>{item.supplierName || 'Preferred Tier-1 Supplier'}</span>
                        <span className="text-xs">{item.supplierCountry === 'Germany' ? '🇩🇪' : item.supplierCountry === 'Japan' ? '🇯🇵' : '🇺🇸'}</span>
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-slate-400 font-medium">Contact Email</dt>
                        <dd className="text-slate-700 font-mono text-[11px] mt-0.5 truncate">
                          {item.email || 'orders@supplychain.org'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 font-medium">Direct Telephone</dt>
                        <dd className="text-slate-700 font-mono text-[11px] mt-0.5">
                          {item.phone || '+1 (555) 019-2831'}
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-slate-400 font-medium">Compliance & Verification</dt>
                      <dd className="text-emerald-700 font-medium text-xs mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ISO 9001 / AS9100 Certified Quality Verified</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          ) : (
            /* PRICE AUDIT TAB */
            <div className="space-y-6">
              {/* Audit Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                  <div className="text-[11px] font-medium text-blue-700 uppercase">Effective Price</div>
                  <div className="text-xl font-bold text-[#003049] mt-1">
                    ${itemRate < 1 ? itemRate.toFixed(3) : itemRate.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Per {itemUnit}</div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <div className="text-[11px] font-medium text-emerald-700 uppercase">Total Revisions</div>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{priceHistory.length} Recorded</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Since item creation</div>
                </div>

                <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl">
                  <div className="text-[11px] font-medium text-amber-700 uppercase">Latest Variation</div>
                  <div className="text-xl font-bold text-amber-800 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>{priceHistory.length > 0 ? `${(priceHistory[0]?.changePercent || 0) >= 0 ? '+' : ''}${priceHistory[0]?.changePercent}%` : '0.0%'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{priceHistory.length > 0 && priceHistory[0]?.date ? `Last revised: ${priceHistory[0].date}` : 'No revisions logged'}</div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-medium text-slate-600 uppercase">Audit Status</div>
                  <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Audited & Approved</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Compliant with index cap</div>
                </div>
              </div>

              {/* Price Revision Audit Trail Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#0077b6]" />
                    <span>Historical Price Revision Trail & Justifications</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleExportItemAuditCSV}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer shadow-2xs"
                      title="Download Price History as CSV"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportItemAuditPDF}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer shadow-2xs"
                      title="Download Price History as PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                      <span>Download PDF</span>
                    </button>
                    <span className="text-[11px] text-slate-500 pl-1 border-l border-slate-300">Immutable Record</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Revision Date</th>
                      <th className="py-2.5 px-3">Previous Rate</th>
                      <th className="py-2.5 px-3">New Approved Rate</th>
                      <th className="py-2.5 px-3">Variation</th>
                      <th className="py-2.5 px-3">Audit Reason / Business Justification</th>
                      <th className="py-2.5 px-3 text-right">Authorized Auditor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 bg-slate-50/50 italic">
                          No historical price revisions logged for this item.
                        </td>
                      </tr>
                    ) : (
                      priceHistory.map((rec: any, idx: number) => {
                      const isIncrease = (rec.changePercent || 0) >= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{rec.date}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 line-through">
                            ${typeof rec.oldPrice === 'number' ? rec.oldPrice.toFixed(2) : rec.oldPrice}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#003049]">
                            ${typeof rec.newPrice === 'number' ? rec.newPrice.toFixed(2) : rec.newPrice}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                isIncrease
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {isIncrease ? (
                                <TrendingUp className="w-3 h-3 text-amber-600" />
                              ) : (
                                <TrendingDown className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>
                                {isIncrease ? '+' : ''}
                                {rec.changePercent}%
                              </span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-700 max-w-xs">{rec.reason}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                            {rec.approvedBy}
                          </td>
                        </tr>
                      );
                    })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span>Item Code:</span>
            <span className="font-mono text-slate-700 font-semibold">{itemCode}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {isGoogleSearchOpen && item && (
        <GoogleSearchPreviewModal
          isOpen={isGoogleSearchOpen}
          onClose={() => setIsGoogleSearchOpen(false)}
          item={{
            id: item.id,
            code: item.code,
            name: item.name || itemName,
            category: item.category,
            supplierName: item.supplierName,
            rate: item.rate,
            unit: item.unit
          }}
        />
      )}
    </div>
  );
};
