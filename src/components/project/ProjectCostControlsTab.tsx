import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Wrench,
  Truck,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  Copy,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  FolderInput,
  Search,
  Upload,
  AlertTriangle,
  Globe2,
  Flame
} from 'lucide-react';
import {
  Project,
  ProjectCostItem,
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  BudgetaryPlan,
  ProduceItem
} from '../../types';
import { GoogleSearchPreviewModal, GoogleSearchPreviewItem } from '../GoogleSearchPreviewModal';
import { SupplierRatesComparisonModal } from './SupplierRatesComparisonModal';
import { QuickInsertSubcontractorModal } from './QuickInsertSubcontractorModal';
import { QuickInsertOutsourcedModal } from './QuickInsertOutsourcedModal';
import { CreateBudgetPlanModal } from './CreateBudgetPlanModal';
import { ImportPlanFromOtherProjectModal } from './ImportPlanFromOtherProjectModal';
import { PlanTemplatesLibraryModal } from './PlanTemplatesLibraryModal';
import { SavePlanAsTemplateModal } from './SavePlanAsTemplateModal';
import { QuickInsertDeliverableModal } from './QuickInsertDeliverableModal';
import { DataImportExportModal } from '../DataImportExportModal';
import { calculateProjectMetrics } from '../../utils/costCalculations';
import { analyzeProjectBudgetWarnings, ItemWarningAnalysis } from '../../utils/budgetWarningEngine';
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  convertItemRate,
  convertCurrency,
  getCurrencyInfo
} from '../../utils/currency';

interface ProjectCostControlsTabProps {
  project: Project;
  allProjects?: Project[];
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  produceItems?: ProduceItem[];
  onUpdateProject: (updatedProject: Project) => void;
  onAddMaterial?: (mat: MaterialItem) => void;
}

export const ProjectCostControlsTab: React.FC<ProjectCostControlsTabProps> = ({
  project,
  allProjects = [],
  materials,
  suppliers,
  subcontractors,
  outsourcedServices,
  produceItems = [],
  onUpdateProject,
  onAddMaterial
}) => {
  // Modal states
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedMaterialForCompare, setSelectedMaterialForCompare] = useState<MaterialItem | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubcontractorForCompare, setSelectedSubcontractorForCompare] = useState<SubcontractorRateItem | null>(null);
  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [selectedOutsourcedForCompare, setSelectedOutsourcedForCompare] = useState<OutsourcedService | null>(null);
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isQuickInsertModalOpen, setIsQuickInsertModalOpen] = useState(false);
  const [isBulkImportPlanOpen, setIsBulkImportPlanOpen] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<'all' | 'material' | 'subcontractor' | 'outsourced'>('all');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(1);
  const [editRate, setEditRate] = useState<number>(0);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [editCurrency, setEditCurrency] = useState<string>('USD');
  const [editConsumptionRate, setEditConsumptionRate] = useState<number>(100);
  const [googleSearchItem, setGoogleSearchItem] = useState<GoogleSearchPreviewItem | null>(null);

  // Budgetary plans
  const plans: BudgetaryPlan[] = useMemo(() => {
    if (project.budgetaryPlans && project.budgetaryPlans.length > 0) {
      return project.budgetaryPlans;
    }
    // Fallback baseline plan
    return [
      {
        id: 'plan-01',
        name: 'Plan A: Certified Enterprise Sourcing (Baseline)',
        description: 'Primary baseline using AS9100D certified mills, ISO 9001 vendors and verified subcontractors.',
        isBaseline: true,
        targetMarginPct: project.targetMarginPct || 35,
        overheadPct: 8.5,
        contingencyPct: 5.0,
        selectedItems: project.selectedItems || [],
        createdAt: '2026-03-01'
      }
    ];
  }, [project.budgetaryPlans, project.selectedItems, project.targetMarginPct]);

  const activePlanId = project.activePlanId || plans[0]?.id || 'plan-01';
  const activePlan = useMemo(() => {
    return plans.find(p => p.id === activePlanId) || plans[0];
  }, [plans, activePlanId]);

  const currentItems = activePlan.selectedItems || [];

  // Filtered items
  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return currentItems;
    return currentItems.filter(item => item.type === typeFilter);
  }, [currentItems, typeFilter]);

  // Plan live metrics calculation
  const planMetrics = useMemo(() => {
    return calculateProjectMetrics(
      project.quotedPrice,
      activePlan.targetMarginPct || project.targetMarginPct,
      activePlan.overheadPct || 8.5,
      activePlan.contingencyPct || 5.0,
      currentItems,
      project.phases || []
    );
  }, [project.quotedPrice, activePlan, currentItems, project.phases]);

  // Live calculation of phase budget overruns and item risk status
  const warningRollup = useMemo(() => {
    return analyzeProjectBudgetWarnings(project, currentItems, project.currency || 'USD');
  }, [project, currentItems]);

  // Category sums
  const materialsTotal = currentItems
    .filter(i => i.type === 'material')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const subTotal = currentItems
    .filter(i => i.type === 'subcontractor')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const outTotal = currentItems
    .filter(i => i.type === 'outsourced')
    .reduce((sum, i) => sum + (i.totalCost || 0), 0);

  // Update helper that updates active plan's items and recalculates project
  const updateActivePlanItems = (newItems: ProjectCostItem[], customQuotedPrice?: number) => {
    const updatedPlans = plans.map(p => {
      if (p.id === activePlan.id) {
        return {
          ...p,
          selectedItems: newItems
        };
      }
      return p;
    });

    const targetQuoted = customQuotedPrice !== undefined ? customQuotedPrice : project.quotedPrice;

    const newMetrics = calculateProjectMetrics(
      targetQuoted,
      activePlan.targetMarginPct || project.targetMarginPct,
      activePlan.overheadPct || 8.5,
      activePlan.contingencyPct || 5.0,
      newItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      quotedPrice: targetQuoted,
      budgetaryPlans: updatedPlans,
      selectedItems: activePlan.isBaseline ? newItems : project.selectedItems,
      analytics: newMetrics
    });
  };

  // Add cost item to active plan
  const handleAddCostItem = (item: ProjectCostItem, syncRevenue = true) => {
    const newItems = [item, ...currentItems];
    const targetQuoted =
      syncRevenue && item.totalRevenue && item.totalRevenue > 0
        ? Number(((project.quotedPrice || 0) + item.totalRevenue).toFixed(2))
        : project.quotedPrice;
    updateActivePlanItems(newItems, targetQuoted);
  };

  // Remove cost item
  const handleRemoveCostItem = (id: string) => {
    const newItems = currentItems.filter(i => i.id !== id);
    updateActivePlanItems(newItems);
  };

  // Start edit
  const handleStartEdit = (item: ProjectCostItem) => {
    setEditingItemId(item.id);
    setEditQty(item.quantity);
    setEditRate(item.currency && item.currency !== (project.currency || 'USD') && item.nativeUnitCost ? item.nativeUnitCost : item.unitCost);
    setEditDiscount(item.discountPct || 0);
    setEditCurrency(item.currency || 'USD');
    setEditConsumptionRate(item.consumptionRate || 100);
  };

  // Save edit
  const handleSaveEdit = (id: string) => {
    const newItems = currentItems.map(item => {
      if (item.id === id) {
        const itemCurr = editCurrency || 'USD';
        const projectCurr = project.currency || 'USD';
        
        // If entered in foreign currency (e.g. LKR), convert to base project currency (e.g. USD)
        let unitCostInProjectCurr = editRate;
        if (itemCurr !== projectCurr) {
          unitCostInProjectCurr = convertCurrency(editRate, itemCurr, projectCurr);
        }

        const total = editQty * unitCostInProjectCurr * (1 - editDiscount / 100);
        return {
          ...item,
          quantity: editQty,
          unitCost: Number(unitCostInProjectCurr.toFixed(2)),
          nativeUnitCost: editRate,
          currency: itemCurr,
          consumptionRate: editConsumptionRate,
          discountPct: editDiscount,
          totalCost: Number(total.toFixed(2))
        };
      }
      return item;
    });
    setEditingItemId(null);
    updateActivePlanItems(newItems);
  };

  // Manual currency change per item (e.g. USD to LKR, automatic rate applied)
  const handleItemCurrencyChange = (itemId: string, newCurrency: string) => {
    const newItems = currentItems.map(item => {
      if (item.id === itemId) {
        const prevCurr = item.currency || 'USD';
        // Compute converted rate in new currency
        const conv = convertItemRate(item.unitCost, prevCurr, newCurrency);
        return {
          ...item,
          currency: newCurrency,
          nativeUnitCost: conv.convertedRate
        };
      }
      return item;
    });
    updateActivePlanItems(newItems);
  };

  // Manual consumption pace update per item
  const handleItemConsumptionChange = (itemId: string, newRate: number) => {
    const newItems = currentItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          consumptionRate: newRate
        };
      }
      return item;
    });
    updateActivePlanItems(newItems);
  };


  // Create new plan from scratch
  const handleCreatePlan = (newPlan: BudgetaryPlan) => {
    const updatedPlans = [...plans, newPlan];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      newPlan.targetMarginPct,
      newPlan.overheadPct,
      newPlan.contingencyPct,
      newPlan.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: newPlan.id,
      analytics: newMetrics
    });
  };

  // Switch active plan
  const handleSwitchPlan = (planId: string) => {
    const targetPlan = plans.find(p => p.id === planId) || plans[0];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      targetPlan.targetMarginPct,
      targetPlan.overheadPct,
      targetPlan.contingencyPct,
      targetPlan.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      activePlanId: planId,
      analytics: newMetrics
    });
  };

  // Set active plan as baseline
  const handleSetBaseline = () => {
    const updatedPlans = plans.map(p => ({
      ...p,
      isBaseline: p.id === activePlan.id
    }));

    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      selectedItems: activePlan.selectedItems
    });
  };

  const handleAddDeliverableFromFXTT = (deliv: any) => {
    const updatedDeliverables = [...(project.deliverables || []), deliv];
    onUpdateProject({
      ...project,
      deliverables: updatedDeliverables
    });
  };

  const handleAddCostItemFromFXTT = (costItem: ProjectCostItem) => {
    updateActivePlanItems([...currentItems, costItem]);
  };

  // Duplicate active plan
  const handleDuplicatePlan = () => {
    const dupId = `plan-${Date.now()}`;
    const dupPlan: BudgetaryPlan = {
      ...activePlan,
      id: dupId,
      name: `${activePlan.name} (Copy)`,
      isBaseline: false,
      selectedItems: (activePlan.selectedItems || []).map(i => ({
        ...i,
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      })),
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedPlans = [...plans, dupPlan];
    onUpdateProject({
      ...project,
      budgetaryPlans: updatedPlans,
      activePlanId: dupId
    });
  };

  // Delete active plan
  const handleDeletePlan = () => {
    if (plans.length <= 1) return;
    const remaining = plans.filter(p => p.id !== activePlan.id);
    const newActive = remaining[0];
    const newMetrics = calculateProjectMetrics(
      project.quotedPrice,
      newActive.targetMarginPct,
      newActive.overheadPct,
      newActive.contingencyPct,
      newActive.selectedItems,
      project.phases || []
    );

    onUpdateProject({
      ...project,
      budgetaryPlans: remaining,
      activePlanId: newActive.id,
      analytics: newMetrics
    });
  };

  // Open supplier comparison for an existing item
  const handleOpenComparisonForItem = (item: ProjectCostItem) => {
    const matchedMat = materials.find(m => m.id === item.itemId || m.name === item.name);
    if (matchedMat) {
      setSelectedMaterialForCompare(matchedMat);
    } else {
      // Create a temporary representation
      setSelectedMaterialForCompare({
        id: item.itemId,
        code: 'MAT-SPEC',
        name: item.name,
        category: item.category,
        subCategory: 'Procured Spec',
        moreSubCategory: 'Custom Procurement',
        itemClassification: 'raw_material',
        supplierId: 'sup-01',
        supplierName: item.supplierOrProvider,
        unit: item.unit,
        retailPrice: item.unitCost,
        defaultDiscountPct: item.discountPct || 0,
        inStock: 100,
        reorderPoint: 20,
        leadTimeDays: 7,
        lastUpdated: new Date().toISOString().split('T')[0],
        priceHistory: []
      });
    }
    setIsMaterialModalOpen(true);
  };

  // Open subcontractor comparison for an existing item
  const handleOpenSubComparisonForItem = (item: ProjectCostItem) => {
    const matchedSub = subcontractors.find(s => s.id === item.itemId || s.name === item.name);
    if (matchedSub) {
      setSelectedSubcontractorForCompare(matchedSub);
    } else {
      setSelectedSubcontractorForCompare({
        id: item.itemId,
        code: 'SUB-SPEC',
        name: item.name,
        subcontractorId: 'sub-01',
        subcontractorName: item.supplierOrProvider,
        serviceType: item.name,
        category: item.category,
        unit: item.unit,
        baseRate: item.unitCost,
        rate: item.unitCost,
        skillLevel: 'Senior Specialist',
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setIsSubModalOpen(true);
  };

  // Open outsourced service comparison for an existing item
  const handleOpenOutsourcedComparisonForItem = (item: ProjectCostItem) => {
    const matchedOut = outsourcedServices.find(s => s.id === item.itemId || s.name === item.name);
    if (matchedOut) {
      setSelectedOutsourcedForCompare(matchedOut);
    } else {
      setSelectedOutsourcedForCompare({
        id: item.itemId,
        code: 'OUT-SPEC',
        name: item.name,
        providerId: 'prov-01',
        providerName: item.supplierOrProvider,
        category: item.category,
        subCategory: 'Specialized Outsourced Service',
        baseUnitType: item.unit,
        rate: item.unitCost,
        retailPrice: item.unitCost * 1.3,
        tierRates: [],
        slaLevel: 'Standard SLA',
        priceHistory: [],
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    }
    setIsOutModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. PLAN DETAIL & FINANCIAL ROLLUP STRIP */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Active Plan Detail & Actions Strip */}
        <div className="p-3 bg-white dark:bg-[#0b101b] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center space-x-2">
              {plans.length > 1 ? (
                <div className="flex items-center space-x-1.5">
                  <select
                    value={activePlan.id}
                    onChange={(e) => handleSwitchPlan(e.target.value)}
                    className="font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isBaseline ? '(Baseline)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="font-bold text-slate-800 dark:text-slate-200">{activePlan.name}</span>
              )}

              {activePlan.isBaseline ? (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Baseline</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSetBaseline}
                  className="text-[10px] text-[#0078d4] dark:text-sky-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-semibold transition-colors cursor-pointer"
                >
                  Set Baseline
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {allProjects && allProjects.filter(p => p.id !== project.id).length > 0 && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <FolderInput className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>Import</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsTemplatesModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>Templates</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSaveTemplateModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <span>Save Template</span>
            </button>

            <button
              type="button"
              onClick={handleDuplicatePlan}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            {plans.length > 1 && (
              <button
                type="button"
                onClick={handleDeletePlan}
                className="flex items-center space-x-1 px-2.5 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCreatePlanModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Plan</span>
            </button>
          </div>
        </div>

        {/* Financial Rollup Badges */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 p-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Direct Cost</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm mt-0.5 block">
              ${planMetrics.totalDirectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Overhead ({activePlan.overheadPct || 8.5}%)</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm mt-0.5 block">
              ${planMetrics.overheadAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Contingency ({activePlan.contingencyPct || 5.0}%)</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm mt-0.5 block">
              ${planMetrics.contingencyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Cost</span>
            <span className="font-bold text-[#0078d4] dark:text-sky-300 font-mono text-sm mt-0.5 block">
              ${planMetrics.totalProjectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Gross Margin</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm mt-0.5 block">
              {planMetrics.grossMarginPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY TABS & INSERT BUTTONS */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-[#0078d4] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Items ({currentItems.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('material')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                typeFilter === 'material'
                  ? 'bg-[#0078d4] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Materials (${materialsTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('subcontractor')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                typeFilter === 'subcontractor'
                  ? 'bg-[#0078d4] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Subcontractors (${subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('outsourced')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                typeFilter === 'outsourced'
                  ? 'bg-[#0078d4] text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Tariffs (${outTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })})
            </button>
          </div>

          {/* Quick Insert Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsBulkImportPlanOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import (.xlsx / .csv)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuickInsertModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>Quick Insert (FXTT Table)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedMaterialForCompare(null);
                setIsMaterialModalOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ Material</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSubModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>+ Subcontractor</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOutModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-teal-600" />
              <span>+ Tariff</span>
            </button>
          </div>
        </div>

        {/* 3. COST ITEMS TABLE */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-bold">Item</th>
                <th className="py-2.5 px-2 font-bold">Type</th>
                <th className="py-2.5 px-2.5 font-bold">Supplier</th>
                <th className="py-2.5 px-2 font-bold">Phase</th>
                <th className="py-2.5 px-2 font-bold">Currency</th>
                <th className="py-2.5 px-2 font-bold">Qty</th>
                <th className="py-2.5 px-2.5 font-bold">Unit Rate</th>
                <th className="py-2.5 px-2 font-bold text-center">Consumption Pace</th>
                <th className="py-2.5 px-2 font-bold text-right">Projected Cost</th>
                <th className="py-2.5 px-2 font-bold text-right">Total Cost</th>
                <th className="py-2.5 px-2.5 font-bold text-center">Rates</th>
                <th className="py-2.5 px-2 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    <p className="text-xs">No cost items.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMaterialForCompare(null);
                        setIsMaterialModalOpen(true);
                      }}
                      className="mt-2 text-xs font-bold text-[#0078d4] hover:underline cursor-pointer"
                    >
                      + Add Material
                    </button>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const isEditing = editingItemId === item.id;
                  const isMaterial = item.type === 'material';
                  const phaseObj = (project.phases || []).find(p => p.id === item.phaseId);
                  const analysis = warningRollup.itemAnalyses.get(item.id);
                  const isRedAlert = Boolean(analysis?.isOverrunWarning);
                  const itemCurrency = item.currency || 'USD';
                  const isForeign = itemCurrency !== 'USD';

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isRedAlert
                          ? 'bg-red-50/90 dark:bg-red-950/40 border-l-4 border-l-red-600 text-red-950 dark:text-red-100 hover:bg-red-100/70'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Name & Category with Warning Icon */}
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1.5">
                          {isRedAlert && (
                            <span title={analysis?.reason} className="shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                            </span>
                          )}
                          <span className={`font-bold ${isRedAlert ? 'text-red-900 dark:text-red-200' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setGoogleSearchItem({
                              id: item.id,
                              name: item.name,
                              category: item.category,
                              supplierName: item.supplierOrProvider,
                              rate: item.unitCost,
                              unit: item.unit
                            })}
                            className="p-1 text-slate-400 hover:text-[#0078d4] hover:bg-sky-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors shrink-0"
                            title={`Search Google & Lens for "${item.name}"`}
                          >
                            <Search className="w-3 h-3 text-[#0078d4]" />
                          </button>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{item.category}</span>
                          {isRedAlert && (
                            <span className="text-red-600 font-bold bg-red-100 dark:bg-red-900/60 px-1 py-0.2 rounded text-[9px]">
                              ⚠️ Overrun Risk
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            item.type === 'material'
                              ? 'bg-blue-100 dark:bg-blue-950 text-[#0078d4] dark:text-sky-300'
                              : item.type === 'subcontractor'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>

                      {/* Supplier or Provider */}
                      <td className="py-2 px-2.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-1 text-[11px]">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[120px]">{item.supplierOrProvider}</span>
                        </div>
                      </td>

                      {/* Phase */}
                      <td className="py-2 px-2">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isRedAlert ? 'bg-red-200 dark:bg-red-900/80 text-red-900 dark:text-red-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                          {phaseObj ? phaseObj.name.split(':')[0] : 'Phase 1'}
                        </span>
                      </td>

                      {/* Currency Selector (Manual switch with automatic rate applied) */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <select
                            value={editCurrency}
                            onChange={(e) => setEditCurrency(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100"
                          >
                            {SUPPORTED_CURRENCIES.map(c => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.symbol})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={itemCurrency}
                            onChange={(e) => handleItemCurrencyChange(item.id, e.target.value)}
                            className={`border rounded px-1.5 py-0.5 text-[11px] font-bold font-mono cursor-pointer transition-colors ${
                              isForeign
                                ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-[#0078d4] dark:text-sky-300'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title={`Change currency (current mid-market: 1 USD = ${getCurrencyInfo(itemCurrency).rateToUSD} ${itemCurrency})`}
                          >
                            {SUPPORTED_CURRENCIES.map(c => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <input
                            type="number"
                            min={1}
                            value={editQty}
                            onChange={e => setEditQty(Math.max(1, Number(e.target.value)))}
                            className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.quantity} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* Unit Rate (Native & USD Converted) */}
                      <td className="py-2 px-2.5 font-mono">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={editRate}
                              onChange={e => setEditRate(Number(e.target.value))}
                              className="w-20 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs text-slate-900 dark:text-slate-100 font-bold"
                            />
                            <span className="text-[10px] text-slate-400">{editCurrency}</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-900 dark:text-slate-100 font-bold">
                              ${item.unitCost.toFixed(2)}
                            </span>
                            {isForeign && (
                              <div className="text-[10px] text-[#0078d4] dark:text-sky-400 font-normal">
                                {formatCurrency(item.nativeUnitCost || (item.unitCost * getCurrencyInfo(itemCurrency).rateToUSD), itemCurrency)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Consumption Pace Pace Slider / Indicator */}
                      <td className="py-2 px-2 text-center font-mono">
                        {isEditing ? (
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min={50}
                              max={200}
                              step={5}
                              value={editConsumptionRate}
                              onChange={(e) => setEditConsumptionRate(Number(e.target.value))}
                              className="w-14 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 text-xs text-center font-bold"
                            />
                            <span className="text-[10px] text-slate-400">%</span>
                          </div>
                        ) : (
                          <select
                            value={item.consumptionRate || 100}
                            onChange={(e) => handleItemConsumptionChange(item.id, Number(e.target.value))}
                            className={`border rounded px-1 py-0.5 text-[10px] font-bold font-mono cursor-pointer ${
                              (item.consumptionRate || 100) > 100
                                ? 'bg-red-50 text-red-600 border-red-300 dark:bg-red-950/70 dark:border-red-800'
                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                            title="Adjust consumption burn rate multiplier"
                          >
                            <option value={80}>80% pace</option>
                            <option value={90}>90% pace</option>
                            <option value={100}>100% (On Plan)</option>
                            <option value={110}>110% (+10%)</option>
                            <option value={125}>125% (+25%)</option>
                            <option value={150}>150% (+50%)</option>
                          </select>
                        )}
                      </td>

                      {/* Projected Cost (Highlighted Red if driving overrun) */}
                      <td className="py-2 px-2 text-right font-mono">
                        <span className={`font-bold ${isRedAlert ? 'text-red-600 dark:text-red-400 text-xs' : 'text-slate-800 dark:text-slate-200'}`}>
                          ${Math.round(analysis?.itemProjectedCost || item.totalCost).toLocaleString()}
                        </span>
                      </td>

                      {/* Total Baseline Cost */}
                      <td className="py-2 px-2 text-right font-mono text-slate-700 dark:text-slate-300">
                        ${item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>

                      {/* Rates Comparison Button */}
                      <td className="py-2 px-2 text-center">
                        {isMaterial ? (
                          <button
                            type="button"
                            onClick={() => handleOpenComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-800 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>Rates</span>
                          </button>
                        ) : item.type === 'subcontractor' ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSubComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Rates</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenOutsourcedComparisonForItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Rates</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {isEditing ? (
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id)}
                              className="px-2 py-0.5 bg-[#0078d4] text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveCostItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Multi-Supplier Rates Comparison Modal */}
      <SupplierRatesComparisonModal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setSelectedMaterialForCompare(null);
        }}
        materials={materials}
        suppliers={suppliers}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        onAddMaterial={onAddMaterial}
        initialMaterial={selectedMaterialForCompare}
      />

      {/* 2. Subcontractor Labour Quick Insert Modal */}
      <QuickInsertSubcontractorModal
        isOpen={isSubModalOpen}
        onClose={() => {
          setIsSubModalOpen(false);
          setSelectedSubcontractorForCompare(null);
        }}
        subcontractors={subcontractors}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        initialSubcontractor={selectedSubcontractorForCompare}
      />

      {/* 3. Outsourced Service Quick Insert Modal */}
      <QuickInsertOutsourcedModal
        isOpen={isOutModalOpen}
        onClose={() => {
          setIsOutModalOpen(false);
          setSelectedOutsourcedForCompare(null);
        }}
        outsourcedServices={outsourcedServices}
        phases={project.phases || []}
        onAddCostItem={handleAddCostItem}
        initialService={selectedOutsourcedForCompare}
      />

      {/* 4. Create Budgetary Plan from Scratch Modal */}
      <CreateBudgetPlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        currentPlanItems={currentItems}
        materials={materials}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        produceItems={produceItems}
        projectCurrency={project.currency}
        defaultSellingPrice={project.quotedPrice}
        onCreatePlan={handleCreatePlan}
      />

      {/* Bulk Import Line Items directly into Active Plan Modal */}
      <DataImportExportModal
        isOpen={isBulkImportPlanOpen}
        onClose={() => setIsBulkImportPlanOpen(false)}
        defaultEntity="project_cost_items"
        targetType="project_cost_items"
        materials={materials}
        produceItems={produceItems}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        onImportProjectCostItems={(importedItems) => {
          updateActivePlanItems([...importedItems, ...currentItems]);
        }}
      />

      {/* 5. Include Plan from Other Project Modal */}
      {isImportModalOpen && (
        <ImportPlanFromOtherProjectModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentProject={project}
          allProjects={allProjects}
          onImportPlan={handleCreatePlan}
        />
      )}

      {/* 6. Plan Templates Library Modal */}
      {isTemplatesModalOpen && (
        <PlanTemplatesLibraryModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          currentProject={project}
          onApplyTemplate={handleCreatePlan}
          onOpenSaveCurrentPlan={() => {
            setIsTemplatesModalOpen(false);
            setIsSaveTemplateModalOpen(true);
          }}
        />
      )}

      {/* 7. Save Active Plan as Template Modal */}
      {isSaveTemplateModalOpen && (
        <SavePlanAsTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          plan={activePlan}
          onSaved={() => setIsSaveTemplateModalOpen(false)}
        />
      )}

      {/* 8. Google & Google Lens Quick Search Preview Modal */}
      {googleSearchItem && (
        <GoogleSearchPreviewModal
          isOpen={Boolean(googleSearchItem)}
          onClose={() => setGoogleSearchItem(null)}
          item={googleSearchItem}
        />
      )}

      {/* 9. Full-Screen FXTT Quick Insert Modal */}
      <QuickInsertDeliverableModal
        isOpen={isQuickInsertModalOpen}
        onClose={() => setIsQuickInsertModalOpen(false)}
        project={project}
        produceItems={[]}
        materials={materials}
        subcontractors={subcontractors}
        outsourcedServices={outsourcedServices}
        projectCurrency={project.currency}
        onAddDeliverable={handleAddDeliverableFromFXTT}
        onAddCostItem={handleAddCostItemFromFXTT}
      />
    </div>
  );
};
