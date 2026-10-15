import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  X,
  Layers,
  Calculator,
  TrendingDown,
  Tag,
  Package,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  ArrowRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { MaterialItem, MaterialVendorQuote, VolumePriceTier } from '../types';

export interface VendorLatestRangesModalProps {
  vendor: MaterialVendorQuote;
  material: MaterialItem;
  onClose: () => void;
  onConfigureRanges?: (vendor: MaterialVendorQuote) => void;
  onCommitPriceChange?: (vendor: MaterialVendorQuote) => void;
}

export const VendorLatestRangesModal: React.FC<VendorLatestRangesModalProps> = ({
  vendor,
  material,
  onClose,
  onConfigureRanges,
  onCommitPriceChange
}) => {
  // Extract or fallback volume tiers
  const tiers: VolumePriceTier[] = useMemo(() => {
    if (vendor.volumePricing && vendor.volumePricing.length > 0) {
      return vendor.volumePricing;
    }
    const base = vendor.currentPrice || material.retailPrice || 420;
    const moq = vendor.moq || 1;
    return [
      { minQty: moq, maxQty: moq * 4, unitPrice: base, discountPct: 0, label: `${moq}–${moq * 4} (Base MOQ)` },
      { minQty: moq * 4 + 1, maxQty: moq * 15, unitPrice: Number((base * 0.92).toFixed(2)), discountPct: 8.0, label: `${moq * 4 + 1}–${moq * 15} (-8%)` },
      { minQty: moq * 15 + 1, unitPrice: Number((base * 0.85).toFixed(2)), discountPct: 15.0, label: `${moq * 15 + 1}+ (-15%)` }
    ];
  }, [vendor, material]);

  // Order Volume Simulator State
  const initialQty = vendor.moq ? Math.max(vendor.moq, 25) : 25;
  const [simQty, setSimQty] = useState<number>(initialQty);

  // Determine active tier based on simQty
  const activeTier = useMemo(() => {
    if (tiers.length === 0) return null;
    const matched = tiers.find((t) => {
      const min = t.minQty;
      const max = t.maxQty !== undefined ? t.maxQty : Infinity;
      return simQty >= min && simQty <= max;
    });
    return matched || (simQty < tiers[0].minQty ? tiers[0] : tiers[tiers.length - 1]);
  }, [tiers, simQty]);

  // Next tier incentive
  const nextTier = useMemo(() => {
    if (!activeTier) return null;
    const currentIndex = tiers.indexOf(activeTier);
    if (currentIndex >= 0 && currentIndex < tiers.length - 1) {
      return tiers[currentIndex + 1];
    }
    return null;
  }, [tiers, activeTier]);

  // Calculation figures
  const baseRate = vendor.currentPrice;
  const activeRate = activeTier ? activeTier.unitPrice : baseRate;
  const totalCost = simQty * activeRate;
  const unDiscountedCost = simQty * baseRate;
  const totalSaved = Math.max(0, unDiscountedCost - totalCost);
  const activeDiscountPct = activeTier ? activeTier.discountPct : 0;

  // Next tier potential savings
  const nextTierShortfall = nextTier ? Math.max(1, nextTier.minQty - simQty) : 0;
  const nextTierRate = nextTier ? nextTier.unitPrice : 0;
  const nextTierTotalAtMin = nextTier ? nextTier.minQty * nextTierRate : 0;
  const nextTierSavings = nextTier ? (nextTier.minQty * baseRate) - nextTierTotalAtMin : 0;

  // Latest revision records that touched tiers
  const latestTierRevision = useMemo(() => {
    return (vendor.priceHistory || []).find(
      (h) => (h.tierChanges && h.tierChanges.length > 0) || (h.changedTiers && h.changedTiers.length > 0) || h.appliedChangesSummary
    );
  }, [vendor]);

  // Max discount available
  const maxDiscountPct = useMemo(() => {
    return Math.max(...tiers.map((t) => t.discountPct || 0), 0);
  }, [tiers]);

  const lowestTierPrice = useMemo(() => {
    const prices = tiers.map((t) => t.unitPrice).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : vendor.currentPrice;
  }, [tiers, vendor.currentPrice]);

  return (
    <div
      id="modal-vendor-latest-ranges"
      className="fixed inset-0 z-60 bg-slate-100 flex flex-col overflow-hidden animate-in fade-in duration-150"
    >
      {/* 1. REFINED TOP BAR (Clean, High-Contrast Enterprise Header) */}
      <header className="h-12 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded text-xs transition-colors font-medium cursor-pointer"
            title="Back to Price Comparison Matrix"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Close</span>
          </button>

          <div className="h-4 w-px bg-slate-200" />

          {/* Vendor Details */}
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-[#003049] shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {vendor.vendorName}
            </h2>
            {vendor.isPreferred && (
              <span className="text-[10px] font-bold uppercase bg-[#003049] text-white px-1.5 py-0.2 rounded shrink-0">
                Primary
              </span>
            )}
            <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
              {vendor.country === 'United States' ? 'USA' : vendor.country || 'Global'} • {vendor.leadTimeDays}d SLA • MOQ {vendor.moq || 1} {material.unit}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          {/* Material Context */}
          <div className="hidden md:flex items-center space-x-1.5 min-w-0">
            <span className="font-mono text-xs font-semibold text-[#003049] bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {material.code}
            </span>
            <span className="text-xs text-slate-600 truncate max-w-xs lg:max-w-md" title={material.name}>
              {material.name}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {onConfigureRanges && (
            <button
              type="button"
              onClick={() => onConfigureRanges(vendor)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Edit or add bulk quantity tiers for this vendor"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Configure Ranges</span>
              <span className="sm:hidden">Ranges</span>
            </button>
          )}

          {onCommitPriceChange && (
            <button
              type="button"
              onClick={() => onCommitPriceChange(vendor)}
              className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              title="Commit a new price or range revision"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>+ Commit Revision</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. REFINED SUMMARY METRICS BAR (Crisp, High-Contrast Light Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-200 bg-white border-b border-slate-200 text-xs shrink-0 px-4 sm:px-6 py-2.5">
        <div className="px-3 py-1">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center space-x-1">
            <DollarSign className="w-3 h-3 text-[#003049]" />
            <span>Base Quoted Price</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 font-mono">
            ${baseRate.toFixed(2)}{' '}
            <span className="text-[11px] font-normal text-slate-500">/ {material.unit}</span>
          </div>
          <div className="text-[10px] text-slate-400">Baseline 1-unit rate</div>
        </div>

        <div className="px-3 py-1">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center space-x-1">
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            <span>Lowest Bulk Rate</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5 font-mono">
            ${lowestTierPrice.toFixed(2)}{' '}
            <span className="text-[11px] font-normal text-slate-500">/ {material.unit}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            Up to {maxDiscountPct.toFixed(1)}% savings
          </div>
        </div>

        <div className="px-3 py-1">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center space-x-1">
            <Layers className="w-3 h-3 text-[#003049]" />
            <span>Active Ranges</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
            {tiers.length} Tier{tiers.length === 1 ? '' : 's'}
          </div>
          <div className="text-[10px] text-slate-400">Configured volume breaks</div>
        </div>

        <div className="px-3 py-1">
          <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-blue-600" />
            <span>Quote Effective</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-0.5 font-mono truncate">
            {vendor.lastUpdated || vendor.priceHistory?.[0]?.date || 'Current'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {vendor.priceHistory?.[0]?.quoteRef || 'Active Mill Accord'}
          </div>
        </div>
      </div>

      {/* 3. FULL-SCREEN CONTENT WORKSPACE */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full space-y-6">
          {/* 2-Column Responsive Layout on Large Screens */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT / MAIN COLUMN: ALL LATEST BULK PRICE RANGES TABLE */}
            <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-md bg-slate-100 text-[#003049]">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Latest Active Range Tiers & Quantity Discounts
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Contracted volume brackets applied during purchase order issuance
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {tiers.length} Tiers
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3">Quantity Range</th>
                      <th className="py-2.5 px-3 text-right">Latest Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Unit Savings</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-3 text-right">Min Batch Cost</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tiers.map((tier, idx) => {
                      const isCurrentActive = activeTier === tier;
                      const unitSaving = Math.max(0, baseRate - tier.unitPrice);
                      const minLotCost = tier.minQty * tier.unitPrice;

                      return (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            isCurrentActive
                              ? 'bg-sky-50/70 font-medium'
                              : 'hover:bg-slate-50/60'
                          }`}
                        >
                          {/* Tier Label */}
                          <td className="py-2.5 px-3 text-slate-800">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  isCurrentActive
                                    ? 'bg-[#003049] text-white'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {tier.label || `Tier ${idx + 1}`}
                              </span>
                            </div>
                          </td>

                          {/* Quantity Range */}
                          <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{tier.minQty}</span>
                            {tier.maxQty ? (
                              <span>
                                {' '}to <span className="font-bold text-slate-900">{tier.maxQty}</span> {material.unit}s
                              </span>
                            ) : (
                              <span>+ {material.unit}s & up</span>
                            )}
                          </td>

                          {/* Unit Price */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-[13px] whitespace-nowrap">
                            ${tier.unitPrice.toFixed(2)}
                            <span className="text-[10px] font-normal text-slate-400"> / {material.unit}</span>
                          </td>

                          {/* Unit Savings */}
                          <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap">
                            {unitSaving > 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                -${unitSaving.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Discount Rate */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {tier.discountPct > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                -{tier.discountPct.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                0.0% (Base)
                              </span>
                            )}
                          </td>

                          {/* Min Order Lot Cost */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            ${minLotCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Status Indicator */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isCurrentActive ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                                <CheckCircle2 className="w-3 h-3 text-sky-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Available</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT COLUMN: SIMULATOR & REVISION HISTORY */}
            <div className="lg:col-span-5 space-y-4">
              {/* INTERACTIVE ORDER VOLUME CALCULATOR */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-md bg-[#003049] text-white">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Order Volume Simulator
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Simulate order sizes to preview active discounts
                      </p>
                    </div>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex items-center space-x-1 text-xs">
                    {[10, 25, 50, 100, 250].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSimQty(preset)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer ${
                          simQty === preset
                            ? 'bg-[#003049] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Qty Row */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Planned Order Quantity ({material.unit}s)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={simQty}
                      onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-sm font-bold font-mono text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#003049]"
                    />
                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      {material.unit}s
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Supplier MOQ: {vendor.moq || 1} {material.unit} • Active Target: <strong className="text-slate-700">{activeTier?.label}</strong>
                  </div>
                </div>

                {/* Calculation Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Unit Rate</div>
                    <div className="text-sm font-bold text-[#003049] font-mono mt-0.5">
                      ${activeRate.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      {activeDiscountPct > 0 ? `-${activeDiscountPct.toFixed(1)}% bulk off` : 'Base MOQ rate'}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Cost</div>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      For {simQty} {material.unit}s
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Savings</div>
                    <div className="text-sm font-bold text-emerald-700 font-mono mt-0.5">
                      ${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      {totalSaved > 0 ? 'Saved vs base' : 'Standard tier'}
                    </div>
                  </div>
                </div>

                {/* Next Tier Upgrade Incentive Banner */}
                {nextTier && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-start space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-amber-900 text-[11px] leading-snug">
                        <strong>Upgrade Incentive:</strong> Add <strong>{nextTierShortfall}</strong> more {material.unit}s to unlock{' '}
                        <strong>{nextTier.label}</strong> at <strong>${nextTier.unitPrice.toFixed(2)}/{material.unit}</strong> (-{nextTier.discountPct.toFixed(1)}%).
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSimQty(nextTier.minQty)}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Set to {nextTier.minQty}
                    </button>
                  </div>
                )}
              </div>

              {/* REVISION CONTEXT & REASON LOG */}
              {latestTierRevision && (
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-2">
                  <div className="flex items-center space-x-1.5 text-slate-800 font-semibold text-xs pb-1 border-b border-slate-100">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Last Volume Revision Context</span>
                    <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 ml-auto">
                      {latestTierRevision.date}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed italic">
                    "{latestTierRevision.reason}"
                  </p>
                  {latestTierRevision.appliedChangesSummary && latestTierRevision.appliedChangesSummary.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        Recorded Modifications:
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5 pl-1">
                        {latestTierRevision.appliedChangesSummary.map((sum, i) => (
                          <li key={i}>{sum}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CLEAN FULL-SCREEN STATUS FOOTER */}
      <footer className="h-10 px-4 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="text-[11px] flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Displaying all <strong className="text-slate-700">{tiers.length}</strong> latest bulk ranges and discount brackets for <strong className="text-slate-700">{vendor.vendorName}</strong>.
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </footer>
    </div>
  );
};
