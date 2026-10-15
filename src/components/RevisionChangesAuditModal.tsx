import React, { useState } from 'react';
import {
  X,
  Calendar,
  Building2,
  FileText,
  Tag,
  TrendingUp,
  TrendingDown,
  Layers,
  Percent,
  DollarSign,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter
} from 'lucide-react';
import { MaterialVendorQuote, VendorPriceChangeRecord, VolumePriceTier, TierChangeDetail } from '../types';

export interface RevisionChangesAuditModalProps {
  date: string; // Specific date (e.g. '2026-03-01') or 'all'
  materialCode: string;
  materialName: string;
  materialUnit?: string;
  vendorQuotes: MaterialVendorQuote[];
  initialVendorId?: string | null;
  onClose: () => void;
  onOpenCommitForVendor?: (vendor: MaterialVendorQuote) => void;
}

export const RevisionChangesAuditModal: React.FC<RevisionChangesAuditModalProps> = ({
  date,
  materialCode,
  materialName,
  materialUnit = 'unit',
  vendorQuotes,
  initialVendorId = null,
  onClose,
  onOpenCommitForVendor
}) => {
  const isSingleDateMode = Boolean(date && date !== 'all');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string | null>(initialVendorId);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(date || 'all');

  // Keep state in sync if initialVendorId or date prop changes
  React.useEffect(() => {
    setSelectedVendorFilter(initialVendorId);
  }, [initialVendorId]);

  React.useEffect(() => {
    setSelectedDateFilter(date || 'all');
  }, [date]);

  // When a specific date is passed, strictly enforce viewing that date only
  const effectiveDateFilter = isSingleDateMode ? date : selectedDateFilter;

  // Extract all unique dates from all vendors' price histories
  const allHistoricalDates = React.useMemo(() => {
    const set = new Set<string>();
    vendorQuotes.forEach((v) => {
      (v.priceHistory || []).forEach((h) => {
        if (h.date) set.add(h.date);
      });
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [vendorQuotes]);

  // Find all vendor records matching the active date filter
  const allAuditEntries = React.useMemo(() => {
    const list: { vendor: MaterialVendorQuote; record: VendorPriceChangeRecord }[] = [];
    vendorQuotes.forEach((vendor) => {
      (vendor.priceHistory || []).forEach((h) => {
        if (effectiveDateFilter === 'all' || h.date === effectiveDateFilter) {
          list.push({ vendor, record: h });
        }
      });
    });
    // Sort descending by date
    return list.sort((a, b) => b.record.date.localeCompare(a.record.date));
  }, [vendorQuotes, effectiveDateFilter]);

  // Active entries to display based on vendor filter
  const displayedEntries = selectedVendorFilter
    ? allAuditEntries.filter((e) => e.vendor.vendorId === selectedVendorFilter)
    : allAuditEntries;

  // Vendors that have entries in the current view
  const availableVendors = React.useMemo(() => {
    const map = new Map<string, MaterialVendorQuote>();
    allAuditEntries.forEach((e) => {
      if (!map.has(e.vendor.vendorId)) {
        map.set(e.vendor.vendorId, e.vendor);
      }
    });
    return Array.from(map.values());
  }, [allAuditEntries]);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Clean minimal top bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs font-semibold text-slate-900">Changes</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-600">{materialCode}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-600 truncate">{materialName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-2 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Date & Vendor Toolbar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px]">Date:</span>
            {isSingleDateMode ? (
              <span className="font-mono text-xs font-medium text-slate-800">{date}</span>
            ) : (
              <div className="flex items-center space-x-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter('all')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                    selectedDateFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {allHistoricalDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDateFilter(d)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
                      selectedDateFilter === d
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1 text-xs overflow-x-auto">
            <span className="text-slate-500 text-[11px] mr-1">Vendor:</span>
            <button
              type="button"
              onClick={() => setSelectedVendorFilter(null)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                selectedVendorFilter === null
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {availableVendors.map((vendor) => (
              <button
                key={vendor.vendorId}
                type="button"
                onClick={() => setSelectedVendorFilter(vendor.vendorId)}
                className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  selectedVendorFilter === vendor.vendorId
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {vendor.vendorName.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60">
          {displayedEntries.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No changes found.
            </div>
          ) : (
            displayedEntries.map(({ vendor, record }) => {
              const prevPrice = record.previousPrice ?? record.price;
              const hasBaseChange = prevPrice !== record.price;
              const changePct = record.changePct ?? (prevPrice > 0 ? Number((((record.price - prevPrice) / prevPrice) * 100).toFixed(2)) : 0);
              const isIncrease = changePct > 0;

              return (
                <div
                  key={`${vendor.vendorId}-${record.id || record.date}`}
                  className="bg-white rounded-lg border border-slate-200 p-3 space-y-2.5 text-xs shadow-2xs"
                >
                  {/* Vendor row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">
                        {vendor.vendorName}
                      </div>
                      {record.reason && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          "{record.reason}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="text-right font-mono font-bold text-slate-900 text-xs">
                        ${record.price.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/{materialUnit}</span>
                      </div>
                      {onOpenCommitForVendor && (
                        <button
                          type="button"
                          onClick={() => onOpenCommitForVendor(vendor)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] rounded transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-1 px-2 font-medium">Item</th>
                          <th className="py-1 px-2 font-medium">Old</th>
                          <th className="py-1 px-2 font-medium">New</th>
                          <th className="py-1 px-2 font-medium text-right">Diff</th>
                          <th className="py-1 px-2 font-medium text-right">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {/* Base Price Row */}
                        <tr className={hasBaseChange ? 'bg-amber-50/20' : ''}>
                          <td className="py-1 px-2 text-slate-800">Base Price</td>
                          <td className="py-1 px-2 font-mono text-slate-500">${prevPrice.toFixed(2)}</td>
                          <td className="py-1 px-2 font-mono font-semibold text-slate-900">${record.price.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right font-mono">
                            {hasBaseChange ? (
                              <span className={isIncrease ? 'text-rose-600' : 'text-emerald-600'}>
                                {isIncrease ? `+$${(record.price - prevPrice).toFixed(2)}` : `-$${(prevPrice - record.price).toFixed(2)}`} ({changePct > 0 ? `+${changePct}%` : `${changePct}%`})
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-500">Base</td>
                        </tr>

                        {/* Tiers */}
                        {record.tierChanges && record.tierChanges.length > 0 ? (
                          record.tierChanges.map((tc, tcIdx) => (
                            <tr key={tcIdx}>
                              <td className="py-1 px-2 text-slate-800">{tc.tierLabel}</td>
                              <td className="py-1 px-2 text-slate-500">
                                {tc.previousPrice !== undefined ? `$${tc.previousPrice.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-1 px-2 font-semibold text-slate-900">
                                {tc.newPrice !== undefined ? `$${tc.newPrice.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-1 px-2 text-right font-mono text-emerald-600">
                                {tc.newDiscountPct !== undefined ? `-${tc.newDiscountPct}%` : '—'}
                              </td>
                              <td className="py-1 px-2 text-right text-slate-500">Tier</td>
                            </tr>
                          ))
                        ) : record.changedTiers && record.changedTiers.length > 0 ? (
                          record.changedTiers.map((ct, ctIdx) => (
                            <tr key={ctIdx}>
                              <td className="py-1 px-2 text-slate-800">{ct.label || `Qty ${ct.minQty}+`}</td>
                              <td className="py-1 px-2 text-slate-400">—</td>
                              <td className="py-1 px-2 font-semibold text-slate-900">${ct.unitPrice.toFixed(2)}</td>
                              <td className="py-1 px-2 text-right font-mono text-emerald-600">-{ct.discountPct}%</td>
                              <td className="py-1 px-2 text-right text-slate-500">Tier</td>
                            </tr>
                          ))
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clean simple footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
