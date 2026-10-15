import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  FolderGit2,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  Percent,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Building2,
  Calendar,
  FileSpreadsheet,
  Search,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Scale,
  Plus,
  Upload,
  Database,
  Save,
  Check,
  Box,
  Trash2,
  X
} from 'lucide-react';
import {
  Project,
  BudgetaryPlan,
  MaterialItem,
  ProduceItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProjectCostItem
} from '../../types';
import { GoogleSearchPreviewModal, GoogleSearchPreviewItem } from '../GoogleSearchPreviewModal';
import { CreateBudgetPlanModal } from './CreateBudgetPlanModal';
import { DataImportExportModal } from '../DataImportExportModal';
import {
  formatCurrency,
  SUPPORTED_CURRENCIES,
  getCurrencyInfo,
  getStoredCurrency
} from '../../utils/currency';
import { getMarginThreshold } from '../../utils/profitabilityMonitor';
import { HistoricalMarginTrendChart } from './HistoricalMarginTrendChart';

interface MarginalProfitAnalysisPortalProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  produceItems?: ProduceItem[];
  materials?: MaterialItem[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  suppliers?: Supplier[];
}

export const MarginalProfitAnalysisPortal: React.FC<MarginalProfitAnalysisPortalProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onUpdateProject,
  produceItems = [],
  materials = [],
  subcontractors = [],
  outsourcedServices = [],
  suppliers = []
}) => {
  // Current active project
  const activeProject = selectedProject || projects[0] || null;
  const activeCurrency = activeProject?.currency || getStoredCurrency();
  const currInfo = getCurrencyInfo(activeCurrency);
  const currSymbol = currInfo.symbol;

  // Selected Budgetary Plan ID
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
    return activeProject?.activePlanId || activeProject?.budgetaryPlans?.[0]?.id || 'plan-baseline';
  });

  const [marginThreshold, setMarginThresholdState] = useState<number>(() => getMarginThreshold());

  useEffect(() => {
    const handleThresholdChange = (e: any) => {
      if (e.detail?.threshold !== undefined) {
        setMarginThresholdState(e.detail.threshold);
      }
    };
    window.addEventListener('margin-threshold-changed', handleThresholdChange);
    return () => {
      window.removeEventListener('margin-threshold-changed', handleThresholdChange);
    };
  }, []);

  // Whenever active project changes, sync the plan id
  useEffect(() => {
    if (activeProject) {
      const exists = activeProject.budgetaryPlans?.some(p => p.id === selectedPlanId);
      if (!exists && activeProject.budgetaryPlans && activeProject.budgetaryPlans.length > 0) {
        setSelectedPlanId(activeProject.budgetaryPlans[0].id);
      }
    }
  }, [activeProject?.id]);

  // Real budgetary plans - Strictly derived from actual project records without mock dummy costs
  const allPlans: BudgetaryPlan[] = useMemo(() => {
    if (activeProject?.budgetaryPlans && activeProject.budgetaryPlans.length > 0) {
      return activeProject.budgetaryPlans;
    }
    const baseItems = activeProject?.selectedItems || [];
    const directTotal = baseItems.reduce((acc, it) => acc + (it.totalCost || 0), 0);
    return [
      {
        id: 'plan-baseline',
        name: 'Plan A (Baseline Engineering)',
        description: 'Baseline scenario based on verified project cost records.',
        isBaseline: true,
        targetMarginPct: activeProject?.targetMarginPct || 35,
        overheadPct: activeProject?.overheadPct || 8.5,
        contingencyPct: activeProject?.contingencyPct || 5.0,
        selectedItems: baseItems,
        totalDirectCost: directTotal,
        totalEstimatedCost: directTotal,
        totalProjectCost: Math.round(directTotal * (1 + (activeProject?.overheadPct || 8.5) / 100 + (activeProject?.contingencyPct || 5.0) / 100)),
        createdAt: activeProject?.startDate || new Date().toISOString().split('T')[0]
      }
    ];
  }, [activeProject]);

  // Current Plan - Guaranteed non-null from allPlans
  const activePlan: BudgetaryPlan = useMemo(() => {
    return allPlans.find(p => p.id === selectedPlanId) || allPlans[0];
  }, [allPlans, selectedPlanId]);

  // Setup Parameters (Deterministic Financial Variables - No AI)
  const defaultSellingPrice = activeProject?.quotedPrice || 0;
  const [targetSellingPrice, setTargetSellingPrice] = useState<number>(defaultSellingPrice);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(activePlan?.targetMarginPct || activeProject?.targetMarginPct || 35);
  const [overheadPct, setOverheadPct] = useState<number>(activePlan?.overheadPct || activeProject?.overheadPct || 10);
  const [contingencyPct, setContingencyPct] = useState<number>(activePlan?.contingencyPct || activeProject?.contingencyPct || 5);
  const [laborBurdenPct, setLaborBurdenPct] = useState<number>(0);
  const [volumeUnits, setVolumeUnits] = useState<number>(1);
  const [taxBufferPct, setTaxBufferPct] = useState<number>(0);

  // Analysis State
  const [hasLaunched, setHasLaunched] = useState<boolean>(true);
  const [activeAnalysisRunDate, setActiveAnalysisRunDate] = useState<string>(() => new Date().toLocaleTimeString());

  // Search & Modals
  const [searchModalItem, setSearchModalItem] = useState<GoogleSearchPreviewItem | null>(null);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isLinkDatabaseModalOpen, setIsLinkDatabaseModalOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Sync parameters when plan or project changes
  useEffect(() => {
    if (activePlan) {
      if (activePlan.targetMarginPct !== undefined) setTargetMarginPct(activePlan.targetMarginPct);
      if (activePlan.overheadPct !== undefined) setOverheadPct(activePlan.overheadPct);
      if (activePlan.contingencyPct !== undefined) setContingencyPct(activePlan.contingencyPct);
    }
  }, [activePlan?.id]);

  useEffect(() => {
    if (activeProject) {
      setTargetSellingPrice(activeProject.quotedPrice || 0);
    }
  }, [activeProject?.id]);

  // Direct Cost Calculation from ACTUAL items - ZERO default fake data
  const directCostCalculations = useMemo(() => {
    if (!activeProject) {
      return {
        materialCost: 0,
        subcontractorCost: 0,
        outsourcedCost: 0,
        directCost: 0,
        itemsCount: 0,
        items: [] as ProjectCostItem[]
      };
    }

    // Use active plan's items if populated; otherwise fall back to project's selected items
    const items = (activePlan?.selectedItems && activePlan.selectedItems.length > 0)
      ? activePlan.selectedItems
      : (activeProject.selectedItems || []);

    let mat = 0;
    let sub = 0;
    let out = 0;

    items.forEach((it) => {
      const cost = typeof it.totalCost === 'number' ? it.totalCost : ((it.quantity || 1) * (it.unitCost || 0));
      if (it.type === 'material') mat += cost;
      else if (it.type === 'subcontractor') sub += cost;
      else out += cost;
    });

    const totalDirect = mat + sub + out;

    return {
      materialCost: mat,
      subcontractorCost: sub,
      outsourcedCost: out,
      directCost: totalDirect,
      itemsCount: items.length,
      items
    };
  }, [activeProject, activePlan]);

  // Mathematical Marginal Profit Analysis Results (Deterministic pure formulas - No AI)
  const analysisMetrics = useMemo(() => {
    const baseDirectCost = directCostCalculations.directCost * volumeUnits;
    const laborBurden = Math.round(baseDirectCost * (laborBurdenPct / 100));
    const effectiveDirectCost = baseDirectCost + laborBurden;

    const overheadCost = Math.round(effectiveDirectCost * (overheadPct / 100));
    const contingencyCost = Math.round(effectiveDirectCost * (contingencyPct / 100));
    const taxBufferCost = Math.round(effectiveDirectCost * (taxBufferPct / 100));
    const totalProjectCost = effectiveDirectCost + overheadCost + contingencyCost + taxBufferCost;

    const totalRevenue = targetSellingPrice * volumeUnits;

    // Gross Marginal Profit (Revenue - Direct Variable Costs)
    const grossProfit = totalRevenue - effectiveDirectCost;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Net Marginal Profit (Revenue - Total Full Cost including Overhead, Contingency, Tax)
    const netProfit = totalRevenue - totalProjectCost;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Contribution Margin
    const contributionMargin = grossProfit;
    const contributionMarginRatio = totalRevenue > 0 ? (contributionMargin / totalRevenue) : 0;

    // Fixed Costs = Overhead + Contingency
    const fixedCosts = overheadCost + contingencyCost;
    const hasViableContribution = contributionMarginRatio > 0 && targetSellingPrice > 0;
    const breakEvenRevenue = hasViableContribution
      ? Math.round(fixedCosts / contributionMarginRatio)
      : 0;
    const breakEvenUnits = (hasViableContribution && targetSellingPrice > 0 && breakEvenRevenue > 0)
      ? Math.ceil(breakEvenRevenue / targetSellingPrice)
      : 0;

    // Status evaluation
    const isHealthy = netMarginPct >= targetMarginPct * 0.9 && netMarginPct > 0;
    const isWarning = netMarginPct < targetMarginPct * 0.9 && netMarginPct > 0;
    const isNegative = netMarginPct <= 0;

    return {
      effectiveDirectCost,
      laborBurden,
      overheadCost,
      contingencyCost,
      taxBufferCost,
      totalProjectCost,
      totalRevenue,
      grossProfit,
      grossMarginPct: Number(grossMarginPct.toFixed(2)),
      netProfit,
      netMarginPct: Number(netMarginPct.toFixed(2)),
      contributionMargin,
      contributionMarginRatio: Number((contributionMarginRatio * 100).toFixed(2)),
      breakEvenRevenue,
      breakEvenUnits,
      hasViableContribution,
      isHealthy,
      isWarning,
      isNegative
    };
  }, [
    directCostCalculations,
    targetSellingPrice,
    targetMarginPct,
    overheadPct,
    contingencyPct,
    laborBurdenPct,
    volumeUnits,
    taxBufferPct
  ]);

  // Sensitivity Matrix (-10%, -5%, Baseline, +5%, +10%, +15% Cost Fluctuations)
  const sensitivityScenarios = useMemo(() => {
    const varianceLevels = [-10, -5, 0, 5, 10, 15];
    return varianceLevels.map((varPct) => {
      const factor = 1 + varPct / 100;
      const simCost = Math.round(analysisMetrics.totalProjectCost * factor);
      const simNetProfit = analysisMetrics.totalRevenue - simCost;
      const simNetMargin = analysisMetrics.totalRevenue > 0 ? (simNetProfit / analysisMetrics.totalRevenue) * 100 : 0;
      return {
        label: varPct === 0 ? 'Baseline (0%)' : `${varPct > 0 ? '+' : ''}${varPct}% Cost Variance`,
        varPct,
        simCost,
        simNetProfit,
        simNetMargin: Number(simNetMargin.toFixed(1)),
        isPositive: simNetProfit > 0
      };
    });
  }, [analysisMetrics]);

  const handleLaunchAnalysis = () => {
    setHasLaunched(true);
    setActiveAnalysisRunDate(new Date().toLocaleTimeString());
  };

  const handleResetDefaults = () => {
    if (activeProject) {
      setTargetSellingPrice(activeProject.quotedPrice || 0);
      setTargetMarginPct(activeProject.targetMarginPct || 35);
      setOverheadPct(10);
      setContingencyPct(5);
      setLaborBurdenPct(0);
      setVolumeUnits(1);
      setTaxBufferPct(0);
    }
  };

  // Save current financial parameters back into active project & plan
  const handleSaveParameters = () => {
    if (!activeProject || !onUpdateProject) return;

    const updatedPlans = allPlans.map((p) => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          targetMarginPct,
          overheadPct,
          contingencyPct,
          totalDirectCost: directCostCalculations.directCost,
          totalProjectCost: analysisMetrics.totalProjectCost,
          quotedRevenue: targetSellingPrice * volumeUnits,
          grossMarginPct: analysisMetrics.grossMarginPct
        };
      }
      return p;
    });

    const updatedProj: Project = {
      ...activeProject,
      quotedPrice: targetSellingPrice,
      targetMarginPct,
      overheadPct,
      contingencyPct,
      budgetaryPlans: updatedPlans,
      activePlanId: activePlan.id
    };

    onUpdateProject(updatedProj);
    setSaveSuccessMessage(`Parameters saved to ${activePlan.name} and project ${activeProject.code}`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Bulk import cost items directly into current active plan
  const handleBulkImportToActivePlan = (items: ProjectCostItem[]) => {
    if (!activeProject || !onUpdateProject || items.length === 0) return;

    const currentItems = activePlan.selectedItems || [];
    const newItems = [...items, ...currentItems];

    const updatedPlans = allPlans.map((p) => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          selectedItems: newItems,
          itemsCount: newItems.length
        };
      }
      return p;
    });

    const updatedProj: Project = {
      ...activeProject,
      selectedItems: activePlan.isBaseline ? newItems : activeProject.selectedItems,
      budgetaryPlans: updatedPlans
    };

    onUpdateProject(updatedProj);
    setSaveSuccessMessage(`Imported ${items.length} items into ${activePlan.name}`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Create new plan and set active
  const handleCreateNewPlan = (newPlan: BudgetaryPlan) => {
    if (!activeProject || !onUpdateProject) return;
    const updatedPlans = [...allPlans.filter(p => p.id !== newPlan.id), newPlan];
    const updatedProj: Project = {
      ...activeProject,
      budgetaryPlans: updatedPlans,
      activePlanId: newPlan.id
    };
    onUpdateProject(updatedProj);
    setSelectedPlanId(newPlan.id);
    setSaveSuccessMessage(`Plan "${newPlan.name}" created and set as active.`);
    setTimeout(() => setSaveSuccessMessage(null), 3500);
  };

  // Remove single line item from active plan
  const handleRemoveItemFromPlan = (itemId: string) => {
    if (!activeProject || !onUpdateProject) return;
    const updatedItems = (activePlan.selectedItems || []).filter(i => i.id !== itemId);
    const updatedPlans = allPlans.map(p => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          selectedItems: updatedItems,
          itemsCount: updatedItems.length
        };
      }
      return p;
    });

    onUpdateProject({
      ...activeProject,
      selectedItems: activePlan.isBaseline ? updatedItems : activeProject.selectedItems,
      budgetaryPlans: updatedPlans
    });
  };

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 m-4 shadow-xs">
        <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No project available</h3>
        <p className="text-slate-500 text-xs mt-1">Please create a project first to analyze marginal profits.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Toast Notification */}
      {saveSuccessMessage && (
        <div className="bg-[#0077b6] text-white px-4 py-2 text-xs flex items-center justify-between rounded-xl shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span className="font-semibold">{saveSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMessage(null)}
            className="text-white/80 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* 1. SELECTION & CONFIGURATION CONTROL PANEL - Simple UI like Home tab */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#0078d4]/10 text-[#0078d4]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Marginal Profit
                </h2>
                <span className="text-[10px] font-bold uppercase text-[#0078d4] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveParameters}
              className="px-3 py-1.5 rounded-lg bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleLaunchAnalysis}
              className="px-3.5 py-1.5 rounded-lg bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Calculate</span>
            </button>
          </div>
        </div>

        {/* PROJECT & PLAN SELECTORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Project Selector */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>Project:</span>
              </span>
            </label>
            <select
              value={activeProject.id}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer focus:ring-1 focus:ring-[#0078d4]"
            >
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  [{proj.code}] {proj.name} ({proj.clientName || 'Commercial'})
                </option>
              ))}
            </select>
          </div>

          {/* Plan Selector */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Plan:</span>
              </label>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-slate-400">
                  {allPlans.length} Plans Defined
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatePlanModalOpen(true)}
                  className="text-xs text-[#0078d4] hover:underline font-bold flex items-center space-x-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Plan</span>
                </button>
              </div>
            </div>

            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-[#0078d4]"
            >
              {allPlans.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} — Direct Cost: {formatCurrency(pl.totalDirectCost ?? pl.totalEstimatedCost ?? 0, activeCurrency)} ({(pl.selectedItems || []).length} items)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STEP 2: MARGIN & COST PARAMETERS SETUP */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Parameters</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            {/* Selling Price */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Selling Price ({currSymbol})
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={targetSellingPrice}
                onChange={(e) => setTargetSellingPrice(Math.max(0, Number(e.target.value)))}
                className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Target Gross Margin % */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Target Margin %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={targetMarginPct}
                  onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                  className="w-full p-1.5 pr-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Overhead % */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Overhead %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(Number(e.target.value))}
                  className="w-full p-1.5 pr-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Contingency % */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Contingency %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={contingencyPct}
                  onChange={(e) => setContingencyPct(Number(e.target.value))}
                  className="w-full p-1.5 pr-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            {/* Scale Units */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Volume
              </label>
              <input
                type="number"
                min={1}
                value={volumeUnits}
                onChange={(e) => setVolumeUnits(Math.max(1, Number(e.target.value)))}
                className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Labor Multiplier / Buffer */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Labor Burden %
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={laborBurdenPct}
                  onChange={(e) => setLaborBurdenPct(Number(e.target.value))}
                  className="w-full p-1.5 pr-6 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-800 dark:text-slate-200"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LAUNCHED MARGINAL PROFIT DASHBOARD */}
      {hasLaunched && (
        <div className="space-y-4">
          {/* Top KPI Cards Grid - Simple UI like Home Tab */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Total Revenue */}
            <div className="p-3 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Revenue</div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(analysisMetrics.totalRevenue, activeCurrency)}
              </div>
            </div>

            {/* Direct Cost */}
            <div className="p-3 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Cost</div>
              <div className="text-base font-bold font-mono text-[#0078d4] dark:text-sky-400 mt-0.5">
                {formatCurrency(analysisMetrics.effectiveDirectCost, activeCurrency)}
              </div>
            </div>

            {/* Total Full Cost */}
            <div className="p-3 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cost</div>
              <div className="text-base font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                {formatCurrency(analysisMetrics.totalProjectCost, activeCurrency)}
              </div>
            </div>

            {/* Gross Marginal Profit */}
            <div className="p-3 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Margin</div>
              <div className={`text-base font-bold font-mono mt-0.5 ${analysisMetrics.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {analysisMetrics.grossMarginPct}%
              </div>
            </div>

            {/* Net Marginal Profit */}
            <div className={`p-3 bg-white dark:bg-[#0b101b] rounded-xl border shadow-2xs ${
              analysisMetrics.netMarginPct < marginThreshold
                ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Net Margin</div>
                {analysisMetrics.netMarginPct < marginThreshold && (
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Below {marginThreshold}%</span>
                  </span>
                )}
              </div>
              <div className={`text-base font-bold font-mono mt-0.5 ${
                analysisMetrics.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
              }`}>
                {analysisMetrics.netMarginPct}%
              </div>
            </div>

            {/* Break-even Sales */}
            <div className="p-3 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Breakeven</div>
              <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
                {analysisMetrics.hasViableContribution
                  ? formatCurrency(analysisMetrics.breakevenSales, activeCurrency)
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Historical Margin Trend Recharts Line Chart over Recorded Phases */}
          <HistoricalMarginTrendChart
            project={selectedProject}
            currency={activeCurrency}
          />

          {/* Detailed Cost Allocation Breakdown & Sensitivity Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Detailed Cost Structure */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-[#0078d4]" />
                  <span>Cost Structure</span>
                </h3>
              </div>

              {/* EMPTY ITEMS WARNING & QUICK ACTION BANNER */}
              {directCostCalculations.itemsCount === 0 ? (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      No cost items linked to this plan yet.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsLinkDatabaseModalOpen(true)}
                      className="px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link Items</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkImportModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatePlanModalOpen(true)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 cursor-pointer hover:bg-slate-100"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Create Plan with Form</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {/* Direct Materials */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Direct Materials</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(directCostCalculations.materialCost * volumeUnits, activeCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {((directCostCalculations.materialCost / (directCostCalculations.directCost || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Direct Subcontractors */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Subcontractors</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(directCostCalculations.subcontractorCost * volumeUnits, activeCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {((directCostCalculations.subcontractorCost / (directCostCalculations.directCost || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Outsourced Services */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Outsourced Services</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatCurrency(directCostCalculations.outsourcedCost * volumeUnits, activeCurrency)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {((directCostCalculations.outsourcedCost / (directCostCalculations.directCost || 1)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Overhead & Contingency */}
                  <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-blue-900 dark:text-sky-200">
                        Overhead &amp; Contingency ({overheadPct + contingencyPct}%)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-blue-900 dark:text-sky-200">
                        {formatCurrency(analysisMetrics.overheadCost + analysisMetrics.contingencyCost, activeCurrency)}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-sky-400">
                        {(overheadPct + contingencyPct)}% add-on
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Marginal Sensitivity Matrix */}
            <div className="lg:col-span-6 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span>Sensitivity</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-500">
                  Target: {targetMarginPct}%
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2 px-2.5 font-semibold">Cost Scenario</th>
                      <th className="py-2 px-2 font-semibold text-right">Simulated Cost</th>
                      <th className="py-2 px-2 font-semibold text-right">Net Profit</th>
                      <th className="py-2 px-2.5 font-semibold text-right">Net Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sensitivityScenarios.map((sc, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${
                          sc.varPct === 0 ? 'bg-blue-50/40 dark:bg-blue-950/30 font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-2.5">
                          <span className={sc.varPct === 0 ? 'text-[#0078d4] font-bold' : 'text-slate-800 dark:text-slate-200'}>
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(sc.simCost, activeCurrency)}
                        </td>
                        <td className={`py-2 px-2 text-right font-mono font-semibold ${
                          sc.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                        }`}>
                          {sc.isPositive ? '+' : ''}{formatCurrency(sc.simNetProfit, activeCurrency)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            sc.simNetMargin >= targetMarginPct
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : sc.simNetMargin > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {sc.simNetMargin}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Multi-Plan Comparison Table */}
          <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Plans</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatePlanModalOpen(true)}
                className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>New Plan</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Plan</th>
                    <th className="py-2.5 px-2.5 font-semibold">Status</th>
                    <th className="py-2.5 px-2.5 font-semibold text-right">Cost</th>
                    <th className="py-2.5 px-2.5 font-semibold text-right">Selling Price</th>
                    <th className="py-2.5 px-2.5 font-semibold text-right">Margin %</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allPlans.map((pl) => {
                    const isSelected = pl.id === activePlan.id;
                    const plDirectCost = pl.totalDirectCost ?? pl.totalEstimatedCost ?? (pl.selectedItems || []).reduce((acc, i) => acc + (i.totalCost || 0), 0);
                    const plQuoted = pl.quotedRevenue || targetSellingPrice || activeProject.quotedPrice || 0;
                    const plGrossProfit = plQuoted - plDirectCost;
                    const plGrossMargin = plQuoted > 0 ? (plGrossProfit / plQuoted) * 100 : 0;

                    return (
                      <tr
                        key={pl.id}
                        onClick={() => setSelectedPlanId(pl.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-950/40 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0078d4]" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600" />
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {pl.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {(pl.selectedItems || []).length} items • Target {pl.targetMarginPct}%
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              isSelected
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Scenario'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          {formatCurrency(plDirectCost, activeCurrency)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 dark:text-slate-200">
                          {formatCurrency(plQuoted, activeCurrency)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-semibold">
                          <span
                            className={
                              plGrossMargin >= 30
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : plGrossMargin > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {plGrossMargin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(pl.id);
                              handleLaunchAnalysis();
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#0078d4] text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {isSelected ? 'Active Plan' : 'Select Plan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actual Plan Item Cost Ledger */}
          <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#0078d4]" />
                <span>Cost Items ({directCostCalculations.itemsCount})</span>
              </h3>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLinkDatabaseModalOpen(true)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Link Items</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBulkImportModalOpen(true)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import</span>
                </button>
              </div>
            </div>

            {directCostCalculations.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Item</th>
                      <th className="py-2 px-2.5 font-semibold">Type</th>
                      <th className="py-2 px-2.5 font-semibold">Phase</th>
                      <th className="py-2 px-2.5 font-semibold">Vendor</th>
                      <th className="py-2 px-2 font-semibold text-center">Qty</th>
                      <th className="py-2 px-2.5 font-semibold text-right">Rate</th>
                      <th className="py-2 px-2.5 font-semibold text-right">Total</th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {directCostCalculations.items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{it.name}</span>
                            <button
                              type="button"
                              onClick={() => setSearchModalItem({
                                id: it.id,
                                name: it.name,
                                code: it.itemId || `ITEM-PRJ-${idx + 1}`,
                                category: it.type,
                                supplierName: it.supplierOrProvider,
                                rate: it.unitCost,
                                unit: it.unit || 'unit'
                              })}
                              className="p-1 text-slate-400 hover:text-[#0078d4] hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer inline-flex items-center"
                              title={`Search Google & Lens for "${it.name}"`}
                            >
                              <Search className="w-3 h-3 text-[#0078d4]" />
                            </button>
                          </div>
                          {it.itemId && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Code: {it.itemId}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            it.type === 'material'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-sky-300'
                              : it.type === 'subcontractor'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {it.type}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 dark:text-slate-400">
                          {it.phaseId || 'General'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-800 dark:text-slate-200">
                          {it.supplierOrProvider || 'Direct Partner'}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(it.unitCost || 0, activeCurrency)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(it.totalCost || 0, activeCurrency)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromPlan(it.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove from plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                <Box className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                  No line items currently attached to {activePlan.name}
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Populate this scenario by linking items directly from the catalog or uploading bulk rows from an Excel or CSV file.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsLinkDatabaseModalOpen(true)}
                    className="px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Link Database Items</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBulkImportModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Spreadsheet</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create Budget Plan Modal (State of the art form) */}
      <CreateBudgetPlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        currentPlanItems={activePlan?.selectedItems || activeProject.selectedItems || []}
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        produceItems={produceItems}
        projectCurrency={activeCurrency}
        defaultSellingPrice={targetSellingPrice}
        onCreatePlan={handleCreateNewPlan}
      />

      {/* MODAL 2: Bulk Import Modal for Project Cost Items */}
      <DataImportExportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        defaultEntity="project_cost_items"
        targetType="project_cost_items"
        materials={materials}
        produceItems={produceItems}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        onImportProjectCostItems={handleBulkImportToActivePlan}
        onNotification={(msg) => {
          setSaveSuccessMessage(msg);
          setTimeout(() => setSaveSuccessMessage(null), 3500);
        }}
      />

      {/* MODAL 3: Direct Link Items from Database Modal */}
      {isLinkDatabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0b101b] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#003049] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-[#fdf0d5]" />
                <h3 className="text-sm font-bold text-[#fdf0d5]">Link Item to {activePlan.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkDatabaseModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs max-h-[70vh] overflow-y-auto">
              <p className="text-slate-500 text-[11px]">
                Select any verified record from your materials, subcontractor labor, or outsourced tariff master datasets.
              </p>

              {/* Items List */}
              <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                {/* Materials */}
                {materials.slice(0, 15).map((mat) => (
                  <div key={mat.id} className="pt-2 pb-1 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{mat.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {mat.code} • Material • {mat.supplierName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(mat.retailPrice || 0, activeCurrency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newItem: ProjectCostItem = {
                            id: `cost-db-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            phaseId: 'phase-01',
                            type: 'material',
                            itemId: mat.code,
                            name: mat.name,
                            category: `${mat.category} — ${mat.subCategory}`,
                            supplierOrProvider: mat.supplierName,
                            quantity: 1,
                            unit: mat.unit,
                            unitCost: mat.retailPrice || 0,
                            discountPct: 0,
                            totalCost: mat.retailPrice || 0
                          };
                          handleBulkImportToActivePlan([newItem]);
                        }}
                        className="px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold rounded-md cursor-pointer"
                      >
                        + Add (1 {mat.unit})
                      </button>
                    </div>
                  </div>
                ))}

                {/* Subcontractors */}
                {subcontractors.slice(0, 10).map((sub) => (
                  <div key={sub.id} className="pt-2 pb-1 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {sub.nicheServiceName || sub.name || sub.serviceType}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sub.code} • Subcontractor • {sub.subcontractorName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(sub.rate ?? sub.baseRate ?? 0, activeCurrency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const rate = sub.rate ?? sub.baseRate ?? 0;
                          const newItem: ProjectCostItem = {
                            id: `cost-db-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            phaseId: 'phase-01',
                            type: 'subcontractor',
                            itemId: sub.code,
                            name: sub.nicheServiceName || sub.name || sub.serviceType,
                            category: `${sub.serviceCategory || sub.category} — ${sub.serviceSubCategory || sub.subCategory}`,
                            supplierOrProvider: sub.subcontractorName,
                            quantity: 8,
                            unit: 'hr',
                            unitCost: rate,
                            discountPct: 0,
                            totalCost: rate * 8
                          };
                          handleBulkImportToActivePlan([newItem]);
                        }}
                        className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-md cursor-pointer"
                      >
                        + Add (8 hr)
                      </button>
                    </div>
                  </div>
                ))}

                {/* Outsourced */}
                {outsourcedServices.slice(0, 10).map((out) => (
                  <div key={out.id} className="pt-2 pb-1 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{out.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {out.serviceCode || out.id} • Outsourced • {out.providerName}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(out.rate || 0, activeCurrency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const rate = out.rate || 0;
                          const newItem: ProjectCostItem = {
                            id: `cost-db-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            phaseId: 'phase-01',
                            type: 'outsourced',
                            itemId: out.serviceCode || out.id,
                            name: out.name,
                            category: `${out.category} — ${out.subCategory}`,
                            supplierOrProvider: out.providerName,
                            quantity: 1,
                            unit: (out.baseUnitType || 'pcs').replace('per_', ''),
                            unitCost: rate,
                            discountPct: 0,
                            totalCost: rate
                          };
                          handleBulkImportToActivePlan([newItem]);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md cursor-pointer"
                      >
                        + Add (1 {out.baseUnitType})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLinkDatabaseModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google & Google Lens Search Preview Modal */}
      <GoogleSearchPreviewModal
        isOpen={Boolean(searchModalItem)}
        onClose={() => setSearchModalItem(null)}
        item={searchModalItem}
      />
    </div>
  );
};
