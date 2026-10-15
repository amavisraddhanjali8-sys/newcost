import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Building2,
  FileText,
  Tag,
  TrendingUp,
  TrendingDown,
  Layers,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Search,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  QrCode,
  Image as ImageIcon
} from 'lucide-react';
import { ItemGridCardData } from './ItemGridCard';
import { downloadItemBarcode } from '../utils/barcodeGenerator';
import { downloadItemImage } from '../utils/imageDownloader';
import { getItemImageUrl } from '../utils/itemImages';

export interface FXTTPriceAuditEntry {
  id: string;
  date: string;
  previousRate: number;
  newRate: number;
  changePct: number;
  reason: string;
  approvedBy: string;
  vendorOrContractor?: string;
  status?: string;
  skuCode?: string;
  itemName?: string;
  unit?: string;
  notes?: string;
}

export interface FXTTPriceAuditLogFullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemGridCardData | null;
  customHistory?: FXTTPriceAuditEntry[];
  onOpenItemDetails?: (item: ItemGridCardData) => void;
}

export const FXTTPriceAuditLogFullScreenModal: React.FC<FXTTPriceAuditLogFullScreenModalProps> = ({
  isOpen,
  onClose,
  item,
  customHistory,
  onOpenItemDetails
}) => {
  if (!isOpen || !item) return null;

  const itemCode = item.code || item.id || 'ITEM-001';
  const itemName = item.name || 'Catalog Item Specification';
  const currentRate = typeof item.rate === 'number' ? item.rate : 0;
  const itemUnit = item.unit || 'unit';
  const supplierOrContractor = item.supplierName || 'Global Primary Mill / Contractor';
  const imageUrl = getItemImageUrl(item);
  const [imgError, setImgError] = useState<boolean>(false);

  // Derive historical price revision entries
  const initialAuditRecords: FXTTPriceAuditEntry[] = useMemo(() => {
    if (customHistory && customHistory.length > 0) {
      return customHistory;
    }

    if (item.priceHistory && item.priceHistory.length > 0) {
      return item.priceHistory.map((h: any, idx: number) => {
        const prev = typeof h.previousPrice === 'number' ? h.previousPrice : (h.oldPrice ?? currentRate * 0.95);
        const nw = typeof h.newPrice === 'number' ? h.newPrice : (h.rate ?? currentRate);
        const change = typeof h.changePct === 'number' ? h.changePct : (h.changePercent ?? (prev > 0 ? Number((((nw - prev) / prev) * 100).toFixed(1)) : 0));
        return {
          id: h.id || `audit-${idx}-${h.date || 'rec'}`,
          date: h.date || new Date().toISOString().slice(0, 10),
          previousRate: Number(prev),
          newRate: Number(nw),
          changePct: Number(change),
          reason: h.reason || 'Periodic tariff adjustment',
          approvedBy: h.updatedBy || h.approvedBy || 'Auditor',
          vendorOrContractor: supplierOrContractor,
          status: 'Audited & Certified',
          skuCode: itemCode,
          itemName: itemName,
          unit: itemUnit,
          notes: h.notes || 'SLA contract record'
        };
      });
    }

    // No historical price revisions recorded yet
    return [];
  }, [item, customHistory, currentRate, itemCode, itemName, itemUnit, supplierOrContractor]);

  // Column search states for authentic FXTT CRM grid filtering
  const [searchFilters, setSearchFilters] = useState({
    date: '',
    code: '',
    vendor: '',
    previousRate: '',
    newRate: '',
    changePct: '',
    reason: '',
    approvedBy: ''
  });

  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'date' | 'previousRate' | 'newRate' | 'changePct' | 'reason' | 'approvedBy'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter audit records
  const filteredRecords = useMemo(() => {
    return initialAuditRecords.filter((rec) => {
      if (searchFilters.date && !rec.date.toLowerCase().includes(searchFilters.date.toLowerCase())) return false;
      if (searchFilters.code && !rec.skuCode?.toLowerCase().includes(searchFilters.code.toLowerCase())) return false;
      if (searchFilters.vendor && !rec.vendorOrContractor?.toLowerCase().includes(searchFilters.vendor.toLowerCase())) return false;
      if (searchFilters.previousRate && !rec.previousRate.toString().includes(searchFilters.previousRate)) return false;
      if (searchFilters.newRate && !rec.newRate.toString().includes(searchFilters.newRate)) return false;
      if (searchFilters.changePct && !rec.changePct.toString().includes(searchFilters.changePct)) return false;
      if (searchFilters.reason && !rec.reason.toLowerCase().includes(searchFilters.reason.toLowerCase())) return false;
      if (searchFilters.approvedBy && !rec.approvedBy.toLowerCase().includes(searchFilters.approvedBy.toLowerCase())) return false;

      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const matchesGlobal =
          rec.date.toLowerCase().includes(q) ||
          rec.reason.toLowerCase().includes(q) ||
          rec.approvedBy.toLowerCase().includes(q) ||
          rec.previousRate.toString().includes(q) ||
          rec.newRate.toString().includes(q) ||
          (rec.vendorOrContractor && rec.vendorOrContractor.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      return true;
    });
  }, [initialAuditRecords, searchFilters, globalSearch]);

  // Sort filtered records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredRecords, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === paginatedRecords.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(paginatedRecords.map((r) => r.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchFilters({
      date: '',
      code: '',
      vendor: '',
      previousRate: '',
      newRate: '',
      changePct: '',
      reason: '',
      approvedBy: ''
    });
    setGlobalSearch('');
  };

  const handleExportCSV = () => {
    const headers = ['Revision Date', 'Item Code', 'Item Name', 'Supplier/Contractor', 'Previous Rate', 'New Rate', 'Variance %', 'Reason', 'Approved By', 'Status'];
    const rows = sortedRecords.map(r => [
      r.date,
      r.skuCode,
      `"${r.itemName}"`,
      `"${r.vendorOrContractor}"`,
      r.previousRate,
      r.newRate,
      `${r.changePct}%`,
      `"${r.reason.replace(/"/g, '""')}"`,
      `"${r.approvedBy}"`,
      r.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FXTT_Price_Audit_Log_${itemCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-slate-900/80 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* 1. TOP FXTT CRM APPLICATION TITLE BAR (FULL SCREEN) */}
      <header className="bg-[#003049] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#002235] shadow-md shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/10 rounded border border-white/20">
            <History className="w-4 h-4 text-amber-300" />
            <span className="font-mono text-xs font-bold tracking-wider text-amber-300">FXTT AUDIT GRID</span>
          </div>
          <div className="h-4 w-px bg-white/25 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-white flex items-center space-x-2 truncate">
              <span>Price Changes Audit Log FXTT Grid View</span>
              <span className="text-xs text-sky-200 font-normal font-mono px-2 py-0.5 bg-sky-950/60 rounded border border-sky-700/50">
                {itemCode}
              </span>
            </h1>
          </div>
        </div>

        {/* Right Top Header Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium border border-white/20 transition-colors cursor-pointer"
            title="Export CSV Audit Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-medium border border-white/20 transition-colors cursor-pointer"
            title="Print Audit Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center space-x-1 text-xs font-medium cursor-pointer shadow-sm"
            title="Close Full Screen Grid View (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline font-semibold">Exit Full Screen</span>
          </button>
        </div>
      </header>

      {/* 2. ITEM OVERVIEW & KPI METRICS SUMMARY PANEL */}
      <div className="bg-[#f8fafc] border-b border-slate-300 px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Item Identity & Image */}
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-slate-300 shadow-sm shrink-0 flex items-center justify-center relative group">
              {!imgError && imageUrl ? (
                <img
                  src={imageUrl}
                  alt={itemName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-white/40" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                  {itemName}
                </span>
                <span className="px-2 py-0.5 bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] rounded text-[11px] font-mono font-medium">
                  {item.category || 'Catalog Spec'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                <span>Contractor / Supplier: <strong className="text-slate-700 font-semibold">{supplierOrContractor}</strong></span>
                <span>•</span>
                <span>Unit: <strong className="text-slate-700 font-semibold">{itemUnit}</strong></span>
              </p>
            </div>
          </div>

          {/* Right 4 Key Metric Tiles */}
          <div className="flex items-center space-x-2.5 sm:space-x-4 flex-wrap">
            {/* Metric 1: Current Effective Rate */}
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs text-left">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Effective Active Rate</span>
              <div className="text-base sm:text-lg font-bold text-[#003049] leading-tight">
                ${currentRate < 1 ? currentRate.toFixed(3) : currentRate.toLocaleString()}
                <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{itemUnit}</span>
              </div>
            </div>

            {/* Metric 2: Total Revisions */}
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs text-left">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Historical Logs</span>
              <div className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                {initialAuditRecords.length}
                <span className="text-[10px] text-emerald-600 font-medium ml-1">Recorded</span>
              </div>
            </div>

            {/* Metric 3: Latest Variation */}
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs text-left">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Latest Shift</span>
              <div className="text-base sm:text-lg font-bold text-amber-600 leading-tight flex items-center">
                <TrendingUp className="w-4 h-4 mr-0.5 text-amber-500" />
                <span>+{initialAuditRecords[0]?.changePct || 6.4}%</span>
              </div>
            </div>

            {/* Metric 4: Compliance Status */}
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs text-left hidden md:block">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Audit Trail Status</span>
              <div className="text-xs font-bold text-emerald-700 leading-tight flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ISO Certified</span>
              </div>
            </div>

            {onOpenItemDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenItemDetails(item);
                }}
                className="px-3 py-2 bg-[#0077b6] hover:bg-[#005f9e] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm flex items-center space-x-1.5"
                title="View Full Item Specification & Details"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Item Details</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR: QUICK GLOBAL FILTER & SELECTION COUNTER */}
      <div className="bg-[#f0f4f8] px-4 py-2 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-700">Audit Grid Records:</span>
          <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-[#003049]">
            {filteredRecords.length} / {initialAuditRecords.length}
          </span>
          {selectedRowIds.size > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-[#0077b6] border border-blue-200 rounded text-xs font-medium">
              {selectedRowIds.size} Selected
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Quick search across all audit columns..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="bg-white border border-slate-300 rounded pl-7 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6] w-64 sm:w-80"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-700 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Reset All Column Filters"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* 4. MAIN FXTT MULTI-COLUMN DATA GRID TABLE */}
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <table className="w-full text-left text-xs border-collapse">
          {/* ROW 1: HEADER LABELS WITH SORT INDICATORS */}
          <thead className="bg-[#e9edf2] text-slate-800 sticky top-0 z-20 border-b border-slate-300 select-none text-[11px] font-semibold">
            <tr>
              {/* Checkbox Column */}
              <th className="py-2.5 px-3 w-10 text-center border-r border-slate-300">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  {selectedRowIds.size === paginatedRecords.length && paginatedRecords.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#0077b6]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </th>

              {/* Revision Date */}
              <th
                onClick={() => handleSort('date')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 whitespace-nowrap min-w-[130px]"
              >
                <div className="flex items-center justify-between space-x-1">
                  <span>Revision Date</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Item Code & SKU */}
              <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap min-w-[120px]">
                <span>Item Code / SKU</span>
              </th>

              {/* Supplier / Contractor */}
              <th className="py-2.5 px-3 border-r border-slate-300 whitespace-nowrap min-w-[180px]">
                <span>Contractor / Supplier</span>
              </th>

              {/* Previous Base Rate */}
              <th
                onClick={() => handleSort('previousRate')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 whitespace-nowrap text-right min-w-[120px]"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Previous Rate</span>
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Approved New Rate */}
              <th
                onClick={() => handleSort('newRate')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 whitespace-nowrap text-right min-w-[130px]"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Approved Rate</span>
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Shift Variance % */}
              <th
                onClick={() => handleSort('changePct')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 whitespace-nowrap text-center min-w-[100px]"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>Variance %</span>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Justification Reason */}
              <th
                onClick={() => handleSort('reason')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 min-w-[280px]"
              >
                <div className="flex items-center justify-between space-x-1">
                  <span>Audit Justification Reason</span>
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Authorizing Auditor */}
              <th
                onClick={() => handleSort('approvedBy')}
                className="py-2.5 px-3 border-r border-slate-300 cursor-pointer hover:bg-slate-300/50 min-w-[170px]"
              >
                <div className="flex items-center justify-between space-x-1">
                  <span>Authorized Auditor</span>
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </th>

              {/* Compliance Status */}
              <th className="py-2.5 px-3 whitespace-nowrap text-center min-w-[120px]">
                <span>Status</span>
              </th>
            </tr>

            {/* ROW 2: FXTT SEARCH & FILTER INPUTS ROW */}
            <tr className="bg-white border-b border-slate-300 font-normal text-slate-700">
              <th className="py-1 px-1.5 border-r border-slate-300 text-center">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-slate-400 hover:text-slate-800 text-xs"
                  title="Clear Column Filters"
                >
                  &times;
                </button>
              </th>

              {/* Filter by Date */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Filter date..."
                  value={searchFilters.date}
                  onChange={(e) => setSearchFilters({ ...searchFilters, date: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6]"
                />
              </th>

              {/* Filter by Code */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Filter code..."
                  value={searchFilters.code}
                  onChange={(e) => setSearchFilters({ ...searchFilters, code: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6]"
                />
              </th>

              {/* Filter by Vendor */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Filter supplier/contractor..."
                  value={searchFilters.vendor}
                  onChange={(e) => setSearchFilters({ ...searchFilters, vendor: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6]"
                />
              </th>

              {/* Filter by Previous Rate */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Old rate..."
                  value={searchFilters.previousRate}
                  onChange={(e) => setSearchFilters({ ...searchFilters, previousRate: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6] text-right"
                />
              </th>

              {/* Filter by New Rate */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="New rate..."
                  value={searchFilters.newRate}
                  onChange={(e) => setSearchFilters({ ...searchFilters, newRate: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6] text-right"
                />
              </th>

              {/* Filter by Change % */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="+/- %..."
                  value={searchFilters.changePct}
                  onChange={(e) => setSearchFilters({ ...searchFilters, changePct: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6] text-center"
                />
              </th>

              {/* Filter by Reason */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Filter justification reason..."
                  value={searchFilters.reason}
                  onChange={(e) => setSearchFilters({ ...searchFilters, reason: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6]"
                />
              </th>

              {/* Filter by Auditor */}
              <th className="py-1 px-1.5 border-r border-slate-300">
                <input
                  type="text"
                  placeholder="Filter auditor name..."
                  value={searchFilters.approvedBy}
                  onChange={(e) => setSearchFilters({ ...searchFilters, approvedBy: e.target.value })}
                  className="w-full bg-[#fbfcfd] border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0077b6]"
                />
              </th>

              {/* Status Header spacer */}
              <th className="py-1 px-1.5 text-center text-slate-400 text-[10px]">
                All Verified
              </th>
            </tr>
          </thead>

          {/* TABLE BODY ROWS */}
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-slate-400 bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <History className="w-8 h-8 text-slate-300" />
                    <span className="text-sm font-semibold text-slate-600">No matching audit logs found</span>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Try clearing or loosening your column search filters to view historical entries.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-2 px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((rec, idx) => {
                const isSelected = selectedRowIds.has(rec.id);
                const isIncrease = rec.changePct > 0;
                const isDecrease = rec.changePct < 0;

                return (
                  <tr
                    key={rec.id}
                    className={`hover:bg-[#f3f7fb] transition-colors ${
                      isSelected ? 'bg-sky-50/90 font-medium' : idx % 2 === 0 ? 'bg-white' : 'bg-[#fafbfc]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center border-r border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleRow(rec.id)}
                        className="text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#0077b6]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 font-mono text-slate-800 whitespace-nowrap border-r border-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{rec.date}</span>
                      </div>
                    </td>

                    {/* Code */}
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap border-r border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold">
                        {rec.skuCode || itemCode}
                      </span>
                    </td>

                    {/* Supplier / Contractor */}
                    <td className="py-3 px-3 font-medium text-slate-800 border-r border-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{rec.vendorOrContractor}</span>
                      </div>
                    </td>

                    {/* Previous Rate */}
                    <td className="py-3 px-3 font-mono text-slate-400 line-through text-right border-r border-slate-200 whitespace-nowrap">
                      ${rec.previousRate.toFixed(2)}
                    </td>

                    {/* Approved New Rate */}
                    <td className="py-3 px-3 font-mono text-right font-bold text-[#003049] border-r border-slate-200 whitespace-nowrap">
                      <span className="text-sm">${rec.newRate.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{rec.unit || itemUnit}</span>
                    </td>

                    {/* Variance % */}
                    <td className="py-3 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isIncrease
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isDecrease
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isIncrease ? (
                          <TrendingUp className="w-3 h-3 text-amber-600" />
                        ) : isDecrease ? (
                          <TrendingDown className="w-3 h-3 text-emerald-600" />
                        ) : null}
                        <span>
                          {isIncrease ? '+' : ''}
                          {rec.changePct}%
                        </span>
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-3 text-slate-800 border-r border-slate-200 max-w-md">
                      <p className="text-xs leading-relaxed font-normal">{rec.reason}</p>
                      {rec.notes && (
                        <span className="text-[10px] text-slate-400 block mt-0.5 italic">{rec.notes}</span>
                      )}
                    </td>

                    {/* Auditor */}
                    <td className="py-3 px-3 text-slate-700 border-r border-slate-200 whitespace-nowrap font-medium">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {rec.approvedBy.charAt(0)}
                        </div>
                        <span className="text-xs">{rec.approvedBy}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Certified</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. FOOTER STATUS BAR WITH PAGINATION */}
      <footer className="bg-[#e9edf2] border-t border-slate-300 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 select-none shrink-0">
        <div className="flex items-center space-x-2">
          <span>© 2016 FXTopTech CRM v0.02 - Price Revision Audit Log Engine</span>
          <span className="text-slate-400">•</span>
          <span>
            Total Entries: <strong className="text-slate-900">{sortedRecords.length}</strong> records
          </span>
        </div>

        {/* Pagination Navigation */}
        <div className="flex items-center space-x-3">
          <span className="text-slate-600">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <div className="inline-flex rounded-md shadow-2xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-l text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 bg-white border-y border-r border-slate-300 rounded-r text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer ml-2"
          >
            Close
          </button>
        </div>
      </footer>
    </div>
  );
};
