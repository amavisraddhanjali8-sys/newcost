import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Percent,
  CheckCircle2,
  DollarSign,
  Layers,
  Filter,
  Search,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Flame,
  Check,
  Building2,
  Wrench,
  Truck,
  RotateCcw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Project, ProjectPhase, ProjectCostItem, BudgetaryPlan } from '../../types';
import { analyzeProjectBudgetWarnings, PhaseWarningSummary, ItemWarningAnalysis } from '../../utils/budgetWarningEngine';
import { formatCurrency, SUPPORTED_CURRENCIES, convertItemRate, getCurrencyInfo } from '../../utils/currency';

interface VarianceHeatmapProps {
  project: Project;
  onUpdateProject?: (updatedProject: Project) => void;
  activePlanId?: string;
}

export const VarianceHeatmap: React.FC<VarianceHeatmapProps> = ({
  project,
  onUpdateProject,
  activePlanId
}) => {
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'critical' | 'caution' | 'optimal'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectingItem, setInspectingItem] = useState<ItemWarningAnalysis | null>(null);

  // Active items derived from active plan or project baseline
  const activeItems = useMemo(() => {
    if (project.budgetaryPlans && project.budgetaryPlans.length > 0) {
      const plan = project.budgetaryPlans.find((p) => p.id === activePlanId) || project.budgetaryPlans[0];
      if (plan.selectedItems && plan.selectedItems.length > 0) {
        return plan.selectedItems;
      }
    }
    return project.selectedItems || [];
  }, [project, activePlanId]);

  // Run comprehensive budget warning and projection analysis
  const warningRollup = useMemo(() => {
    return analyzeProjectBudgetWarnings(project, activeItems, project.currency || 'USD');
  }, [project, activeItems]);

  // Filtered Phases
  const filteredPhases = useMemo(() => {
    return warningRollup.phases.filter((p) => {
      if (selectedPhaseFilter !== 'all' && p.phaseId !== selectedPhaseFilter) return false;
      if (selectedRiskFilter === 'critical' && p.healthStatus !== 'critical') return false;
      if (selectedRiskFilter === 'caution' && p.healthStatus !== 'caution' && p.healthStatus !== 'high_risk') return false;
      if (selectedRiskFilter === 'optimal' && p.healthStatus !== 'optimal' && p.healthStatus !== 'on_target') return false;
      return true;
    });
  }, [warningRollup.phases, selectedPhaseFilter, selectedRiskFilter]);

  // Filtered Item Analyses
  const filteredItems = useMemo(() => {
    const list: ItemWarningAnalysis[] = Array.from(warningRollup.itemAnalyses.values());
    return list.filter((item: ItemWarningAnalysis) => {
      if (selectedPhaseFilter !== 'all' && item.phaseId !== selectedPhaseFilter) return false;
      if (selectedRiskFilter === 'critical' && !item.isOverrunWarning) return false;
      if (selectedRiskFilter === 'caution' && item.severity !== 'caution' && item.severity !== 'warning') return false;
      if (selectedRiskFilter === 'optimal' && (item.isOverrunWarning || item.consumptionRatePct > 100)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.itemName.toLowerCase().includes(q) ||
          item.phaseName.toLowerCase().includes(q) ||
          item.currency.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [warningRollup.itemAnalyses, selectedPhaseFilter, selectedRiskFilter, searchQuery]);

  // Handle adjusting consumption rate or currency for an inspected item
  const handleUpdateItemParams = (
    itemId: string,
    newConsumptionRate?: number,
    newCurrency?: string
  ) => {
    if (!onUpdateProject) return;

    const updatedItems = activeItems.map((item) => {
      if (item.id === itemId) {
        let updated = { ...item };
        if (newConsumptionRate !== undefined) {
          updated.consumptionRate = newConsumptionRate;
        }
        if (newCurrency && newCurrency !== item.currency) {
          const prevCurr = item.currency || 'USD';
          const conv = convertItemRate(item.unitCost, prevCurr, newCurrency);
          updated.currency = newCurrency;
          updated.nativeUnitCost = conv.convertedRate;
        }
        return updated;
      }
      return item;
    });

    // Update active plan and project
    if (project.budgetaryPlans && project.budgetaryPlans.length > 0) {
      const targetPlanId = activePlanId || project.budgetaryPlans[0].id;
      const updatedPlans = project.budgetaryPlans.map((p) => {
        if (p.id === targetPlanId) {
          return { ...p, selectedItems: updatedItems };
        }
        return p;
      });
      onUpdateProject({
        ...project,
        budgetaryPlans: updatedPlans,
        selectedItems: updatedItems
      });
    } else {
      onUpdateProject({
        ...project,
        selectedItems: updatedItems
      });
    }

    // Refresh inspected item
    const refreshed = warningRollup.itemAnalyses.get(itemId);
    if (refreshed) {
      setInspectingItem(refreshed);
    }
  };

  const curr = project.currency || 'USD';

  return (
    <div className="space-y-4">
      {/* 1. TOP METRIC STRIP & PROJECT HEALTH HEATMAP BANNER */}
      <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Flame className="w-5 h-5 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                Project Variance Heatmap & Consumption Burn-Rate Radar
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live color-coded visual health matrix evaluating budget ceilings vs. actual consumption trajectories.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {warningRollup.hasOverruns ? (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>{warningRollup.criticalItemCount} Budget Items Project Overrun</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Phases Operating Within Established Budget</span>
              </span>
            )}
          </div>
        </div>

        {/* 4 Summary Rollup Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Established Phase Budget
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono mt-0.5 block">
              {formatCurrency(warningRollup.totalEstablishedBudget, curr, { compact: false })}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Contractual Ceiling</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Actual Consumed to Date
            </span>
            <span className="text-lg font-bold text-[#0078d4] dark:text-sky-300 font-mono mt-0.5 block">
              {formatCurrency(warningRollup.totalActualCost, curr, { compact: false })}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Committed Procurement</span>
          </div>

          <div className={`p-3 rounded-xl border transition-colors ${
            warningRollup.hasOverruns
              ? 'bg-red-50/70 dark:bg-red-950/40 border-red-300 dark:border-red-900'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
          }`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Projected Final Cost (Run-Rate)
            </span>
            <span className={`text-lg font-bold font-mono mt-0.5 block ${
              warningRollup.hasOverruns ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
            }`}>
              {formatCurrency(warningRollup.totalProjectedCost, curr, { compact: false })}
            </span>
            <span className={`text-[10px] mt-1 font-semibold block ${warningRollup.hasOverruns ? 'text-red-600' : 'text-slate-400'}`}>
              {warningRollup.hasOverruns ? '⚠️ Exceeds Budget Ceilings' : 'Within Safety Margin'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border transition-colors ${
            warningRollup.totalVariance < 0
              ? 'bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">
              Net Projected Variance
            </span>
            <span className={`text-lg font-bold font-mono mt-0.5 block ${
              warningRollup.totalVariance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'
            }`}>
              {warningRollup.totalVariance >= 0 ? '+' : ''}{formatCurrency(warningRollup.totalVariance, curr, { compact: false })}
            </span>
            <span className="text-[10px] font-mono mt-1 block text-slate-500">
              {warningRollup.totalVariancePct.toFixed(1)}% of Established Budget
            </span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & HEATMAP COLOR LEGEND STRIP */}
      <div className="bg-white dark:bg-[#0b101b] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Health Key:</span>
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Optimal (&lt;85%)</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>On Target (85-98%)</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Near Cap (98-105%)</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/70 border border-red-400 dark:border-red-800 text-red-900 dark:text-red-200 text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>Critical Overrun (&gt;105% / Deficit)</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Phase Filter Dropdown */}
          <select
            value={selectedPhaseFilter}
            onChange={(e) => setSelectedPhaseFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Project Phases ({warningRollup.phases.length})</option>
            {warningRollup.phases.map((p) => (
              <option key={p.phaseId} value={p.phaseId}>
                {p.phaseName}
              </option>
            ))}
          </select>

          {/* Risk Level Segmented Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedRiskFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                selectedRiskFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedRiskFilter('critical')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                selectedRiskFilter === 'critical'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-600 hover:text-red-700'
              }`}
            >
              Critical ({warningRollup.criticalItemCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRiskFilter('optimal')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                selectedRiskFilter === 'optimal'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              Healthy
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items..."
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-800 dark:text-slate-200 w-32 focus:w-44 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. PHASE HEATMAP TILES GRID */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Phase-Level Budget Consumption Tiles ({filteredPhases.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredPhases.map((phase) => {
            const isOverrun = phase.isOverrun;
            return (
              <div
                key={phase.phaseId}
                className={`p-4 rounded-xl border transition-all shadow-xs relative overflow-hidden ${
                  phase.colorClass.bg
                } ${phase.colorClass.border}`}
              >
                {/* Visual Alert Ribbon if overrun */}
                {isOverrun && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-bl-lg shadow-sm flex items-center space-x-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Projected Overrun</span>
                  </div>
                )}

                {/* Phase Header */}
                <div className="flex items-start justify-between pr-14">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {phase.phaseId}
                    </span>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {phase.phaseName}
                    </h5>
                  </div>
                </div>

                {/* Financial Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-slate-500">Consumption Burn:</span>
                    <span className={`font-bold ${isOverrun ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
                      {phase.consumptionPct.toFixed(1)}% of Budget
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverrun ? 'bg-red-600' : phase.consumptionPct > 98 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, phase.consumptionPct)}%` }}
                    />
                  </div>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Phase Budget</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(phase.budget, curr, { compact: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Actual Consumed</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(phase.actualCost, curr, { compact: true })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block font-sans">Projected Cost</span>
                    <span className={`font-bold ${isOverrun ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
                      {formatCurrency(phase.projectedCost, curr, { compact: true })}
                    </span>
                  </div>
                </div>

                {/* Overrun Details or Safe Status */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    {isOverrun ? (
                      <span className="text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Deficit: -{formatCurrency(Math.abs(phase.variance), curr, { compact: true })}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Surplus: +{formatCurrency(phase.variance, curr, { compact: true })}</span>
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${phase.colorClass.badgeBg} ${phase.colorClass.badgeText}`}>
                    {phase.healthLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. GRANULAR ITEM CONSUMPTION HEATMAP TILES */}
      <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-[#0078d4]" />
              <span>Granular Item-Level Consumption Heatmap ({filteredItems.length} Items)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Highlighted in Red: Items whose projected consumption exceeds or jeopardizes the established phase budget.
            </p>
          </div>
        </div>

        {/* Item Heatmap Tiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 mt-3">
          {filteredItems.map((item) => {
            const isRedAlert = item.isOverrunWarning;
            const isElevated = item.consumptionRatePct > 100;

            return (
              <div
                key={item.itemId}
                onClick={() => setInspectingItem(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md relative text-xs ${
                  isRedAlert
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-800 ring-1 ring-red-400/30'
                    : isElevated
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Top Badge */}
                <div className="flex items-start justify-between gap-1">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate pr-1">
                    {item.itemName}
                  </span>
                  {isRedAlert ? (
                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 flex items-center space-x-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Overrun</span>
                    </span>
                  ) : (
                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0">
                      {item.currency}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  Phase: {item.phaseName.split(':')[0]}
                </div>

                {/* Consumption and Cost Metrics */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Consumption Rate</span>
                    <span className={`font-bold ${isElevated ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {item.consumptionRatePct}% pace
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-sans">Projected Cost</span>
                    <span className={`font-bold ${isRedAlert ? 'text-red-600 font-bold' : 'text-slate-900 dark:text-slate-100'}`}>
                      {formatCurrency(item.itemProjectedCost, curr, { compact: true })}
                    </span>
                  </div>
                </div>

                {/* Overrun Warning Callout */}
                {isRedAlert && (
                  <div className="mt-2 p-1.5 bg-red-100/80 dark:bg-red-900/50 rounded text-[10px] text-red-900 dark:text-red-200 leading-tight">
                    {item.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. ITEM INSPECTION & MITIGATION DRAWER / MODAL */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1424] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              inspectingItem.isOverrunWarning
                ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                {inspectingItem.isOverrunWarning ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <Layers className="w-5 h-5 text-[#0078d4]" />
                )}
                <div>
                  <h3 className="text-sm font-bold">
                    {inspectingItem.itemName}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    Phase: {inspectingItem.phaseName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="p-1 rounded-lg hover:bg-black/10 cursor-pointer text-slate-500"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
              {/* Alert Callout if Overrun */}
              {inspectingItem.isOverrunWarning && (
                <div className="p-3 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 rounded-xl text-red-900 dark:text-red-200">
                  <div className="font-bold flex items-center space-x-1.5 mb-1">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Phase Budget Exceeded Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {inspectingItem.reason}
                  </p>
                </div>
              )}

              {/* Financial Snapshot */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Phase Established Budget</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {formatCurrency(inspectingItem.phaseBudget, curr)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Total Phase Projected</span>
                  <span className={`font-bold text-sm ${inspectingItem.phaseProjectedTotal > inspectingItem.phaseBudget ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
                    {formatCurrency(inspectingItem.phaseProjectedTotal, curr)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Item Baseline Cost</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(inspectingItem.itemBaseCost, curr)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">Item Projected Run-Rate Cost</span>
                  <span className={`font-bold ${inspectingItem.isOverrunWarning ? 'text-red-600' : 'text-[#0078d4]'}`}>
                    {formatCurrency(inspectingItem.itemProjectedCost, curr)}
                  </span>
                </div>
              </div>

              {/* Currency Switching Control */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Change Item Currency (Foreign Rates Auto-Applied):
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={inspectingItem.currency}
                    onChange={(e) => handleUpdateItemParams(inspectingItem.itemId, undefined, e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-slate-100"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Mid-market: 1 USD = {getCurrencyInfo(inspectingItem.currency).rateToUSD} {inspectingItem.currency}
                  </span>
                </div>
              </div>

              {/* Consumption Rate Pace Slider */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Current Consumption Run-Rate Pace:
                  </span>
                  <span className={`font-mono font-bold text-sm ${inspectingItem.consumptionRatePct > 100 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {inspectingItem.consumptionRatePct}% of plan
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={inspectingItem.consumptionRatePct}
                  onChange={(e) => handleUpdateItemParams(inspectingItem.itemId, Number(e.target.value), undefined)}
                  className="w-full cursor-pointer accent-[#0078d4]"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>50% (Slow Burn)</span>
                  <span>100% (On Plan)</span>
                  <span>180% (Extreme Overrun)</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
