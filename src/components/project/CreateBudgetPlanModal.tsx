import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Layers,
  CheckCircle2,
  Database,
  Upload,
  Download,
  Trash2,
  Search,
  Sliders,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Building2,
  HardHat,
  Truck,
  Box,
  TrendingUp,
  Percent,
  FileText
} from 'lucide-react';
import {
  BudgetaryPlan,
  ProjectCostItem,
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem
} from '../../types';
import {
  parseSpreadsheetFile,
  processProjectCostItemsImport,
  downloadSampleTemplate
} from '../../utils/excelImport';
import { formatCurrency, getStoredCurrency } from '../../utils/currency';

interface CreateBudgetPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanItems?: ProjectCostItem[];
  materials?: MaterialItem[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  produceItems?: ProduceItem[];
  projectCurrency?: string;
  defaultSellingPrice?: number;
  onCreatePlan: (newPlan: BudgetaryPlan) => void;
}

export const CreateBudgetPlanModal: React.FC<CreateBudgetPlanModalProps> = ({
  isOpen,
  onClose,
  currentPlanItems = [],
  materials = [],
  suppliers = [],
  subcontractors = [],
  outsourcedServices = [],
  produceItems = [],
  projectCurrency,
  defaultSellingPrice = 0,
  onCreatePlan
}) => {
  const activeCurrency = projectCurrency || getStoredCurrency();

  // Basic Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState<number>(35);
  const [overheadPct, setOverheadPct] = useState<number>(8.5);
  const [contingencyPct, setContingencyPct] = useState<number>(5.0);
  const [laborBurdenPct, setLaborBurdenPct] = useState<number>(0);

  // Sourcing Mode: 'database' | 'import' | 'blank' | 'copy'
  const [sourcingMode, setSourcingMode] = useState<'database' | 'import' | 'blank' | 'copy'>('database');

  // Staged Plan Items (strictly real items selected or imported by user)
  const [stagedItems, setStagedItems] = useState<ProjectCostItem[]>([]);

  // Database Search & Filter State
  const [dbSearch, setDbSearch] = useState('');
  const [dbTypeFilter, setDbTypeFilter] = useState<'all' | 'material' | 'subcontractor' | 'outsourced' | 'produce'>('all');

  // Excel / CSV Import State
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Unified Database Items for quick selection
  const unifiedDatabaseItems = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      name: string;
      type: 'material' | 'subcontractor' | 'outsourced' | 'produce';
      category: string;
      subCategory: string;
      supplierOrProvider: string;
      unit: string;
      unitCost: number;
    }> = [];

    // Materials
    materials.forEach((m) => {
      list.push({
        id: m.id,
        code: m.code || 'MAT',
        name: m.name,
        type: 'material',
        category: m.category,
        subCategory: m.subCategory,
        supplierOrProvider: m.supplierName || 'Approved Supplier',
        unit: m.unit || 'pcs',
        unitCost: m.retailPrice || 0
      });
    });

    // Subcontractors
    subcontractors.forEach((s) => {
      list.push({
        id: s.id,
        code: s.code || 'SUB',
        name: s.nicheServiceName || s.name || s.serviceType || 'Trade Service',
        type: 'subcontractor',
        category: s.serviceCategory || s.category || 'Specialist Fabrication',
        subCategory: s.serviceSubCategory || s.subCategory || 'Trade Labor',
        supplierOrProvider: s.subcontractorName || 'Hired Contractor',
        unit: (s.unit || 'hr').replace('per_', ''),
        unitCost: s.rate ?? s.baseRate ?? 0
      });
    });

    // Outsourced Services
    outsourcedServices.forEach((o) => {
      list.push({
        id: o.id,
        code: o.serviceCode || o.id,
        name: o.name,
        type: 'outsourced',
        category: o.category,
        subCategory: o.subCategory,
        supplierOrProvider: o.providerName || 'Contracted Provider',
        unit: (o.baseUnitType || 'pcs').replace('per_', ''),
        unitCost: o.rate || 0
      });
    });

    // Produced items / assemblies
    produceItems.forEach((p) => {
      list.push({
        id: p.id,
        code: p.code || 'PRD',
        name: p.name,
        type: 'produce',
        category: p.category,
        subCategory: p.subCategory,
        supplierOrProvider: 'Internal Production',
        unit: p.unit || 'system',
        unitCost: p.costPrice || 0
      });
    });

    return list;
  }, [materials, subcontractors, outsourcedServices, produceItems]);

  // Filtered Database Items
  const filteredDatabaseItems = useMemo(() => {
    return unifiedDatabaseItems.filter((item) => {
      if (dbTypeFilter !== 'all' && item.type !== dbTypeFilter) return false;
      if (!dbSearch.trim()) return true;
      const q = dbSearch.toLowerCase().trim();
      return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.subCategory.toLowerCase().includes(q) ||
        item.supplierOrProvider.toLowerCase().includes(q)
      );
    });
  }, [unifiedDatabaseItems, dbTypeFilter, dbSearch]);

  // Add Item from Database to Staged Plan
  const handleAddFromDatabase = (dbItem: typeof unifiedDatabaseItems[0]) => {
    // Check if already staged
    const existing = stagedItems.find((i) => i.itemId === dbItem.code && i.name === dbItem.name);
    if (existing) {
      // Increase qty
      setStagedItems((prev) =>
        prev.map((i) =>
          i.id === existing.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalCost: Number(((i.quantity + 1) * i.unitCost * (1 - i.discountPct / 100)).toFixed(2))
              }
            : i
        )
      );
      return;
    }

    const itemType: 'material' | 'subcontractor' | 'outsourced' =
      dbItem.type === 'subcontractor'
        ? 'subcontractor'
        : dbItem.type === 'outsourced'
        ? 'outsourced'
        : 'material';

    const qty = 1;
    const unitCost = dbItem.unitCost;
    const discountPct = 0;
    const totalCost = Number((qty * unitCost).toFixed(2));
    const markupPct = 30;
    const billableRate = Number((unitCost * (1 + markupPct / 100)).toFixed(2));
    const totalRevenue = Number((qty * billableRate).toFixed(2));

    const newItem: ProjectCostItem = {
      id: `cost-stage-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      phaseId: 'phase-01',
      type: itemType,
      itemId: dbItem.code,
      name: dbItem.name,
      category: `${dbItem.category} — ${dbItem.subCategory}`,
      supplierOrProvider: dbItem.supplierOrProvider,
      quantity: qty,
      unit: dbItem.unit,
      unitCost,
      discountPct,
      totalCost,
      markupPct,
      billableRate,
      totalRevenue,
      grossProfit: Number((totalRevenue - totalCost).toFixed(2))
    };

    setStagedItems((prev) => [newItem, ...prev]);
  };

  // Staged Item quantity and cost change
  const handleUpdateStagedItem = (id: string, updates: Partial<ProjectCostItem>) => {
    setStagedItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const updated = { ...i, ...updates };
          const q = Math.max(0.001, updated.quantity || 1);
          const c = Math.max(0, updated.unitCost || 0);
          const d = Math.max(0, Math.min(100, updated.discountPct || 0));
          const totalCost = Number((q * c * (1 - d / 100)).toFixed(2));
          const m = updated.markupPct || 30;
          const billableRate = Number((c * (1 + m / 100)).toFixed(2));
          const totalRevenue = Number((q * billableRate).toFixed(2));
          return {
            ...updated,
            quantity: q,
            unitCost: c,
            discountPct: d,
            totalCost,
            markupPct: m,
            billableRate,
            totalRevenue,
            grossProfit: Number((totalRevenue - totalCost).toFixed(2))
          };
        }
        return i;
      })
    );
  };

  // Remove staged item
  const handleRemoveStagedItem = (id: string) => {
    setStagedItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Clear all staged items
  const handleClearStaged = () => {
    setStagedItems([]);
  };

  // Copy items from current plan
  const handleCopyCurrentItems = () => {
    if (!currentPlanItems || currentPlanItems.length === 0) return;
    const copies = currentPlanItems.map((item, idx) => ({
      ...item,
      id: `copy-${Date.now()}-${idx}`
    }));
    setStagedItems(copies);
    setSourcingMode('database');
  };

  // Excel / CSV File Drop / Upload
  const handleSpreadsheetUpload = async (file: File) => {
    if (!file) return;
    setImportError(null);
    setImportSuccessCount(null);
    setIsProcessingFile(true);

    try {
      const { rawRows } = await parseSpreadsheetFile(file);
      if (rawRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      const res = processProjectCostItemsImport(rawRows, {
        mode: 'master',
        defaultPhaseId: 'phase-01'
      });

      if (!res.success || res.validRows.length === 0) {
        throw new Error(res.errors[0] || 'Unable to parse valid line items from file.');
      }

      setStagedItems((prev) => [...res.validRows, ...prev]);
      setImportSuccessCount(res.validRows.length);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse file. Please verify columns against template.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Live Math calculations strictly from staged items
  const liveFinancials = useMemo(() => {
    let matCost = 0;
    let subCost = 0;
    let outCost = 0;

    stagedItems.forEach((it) => {
      const cost = typeof it.totalCost === 'number' ? it.totalCost : it.quantity * it.unitCost;
      if (it.type === 'material') matCost += cost;
      else if (it.type === 'subcontractor') subCost += cost;
      else outCost += cost;
    });

    const directCost = matCost + subCost + outCost;
    const laborBurden = Math.round(directCost * (laborBurdenPct / 100));
    const effectiveDirect = directCost + laborBurden;
    const overhead = Math.round(effectiveDirect * (overheadPct / 100));
    const contingency = Math.round(effectiveDirect * (contingencyPct / 100));
    const totalProjectCost = effectiveDirect + overhead + contingency;

    // Recommended selling price at target margin: Total Cost / (1 - targetMarginPct/100)
    const targetMargin = Math.min(90, Math.max(1, targetMarginPct));
    const recommendedSellingPrice = totalProjectCost > 0
      ? Math.round(totalProjectCost / (1 - targetMargin / 100))
      : 0;

    const projectedGrossProfit = recommendedSellingPrice - effectiveDirect;
    const projectedGrossMarginPct = recommendedSellingPrice > 0
      ? Number(((projectedGrossProfit / recommendedSellingPrice) * 100).toFixed(1))
      : 0;

    return {
      matCost,
      subCost,
      outCost,
      directCost,
      laborBurden,
      effectiveDirect,
      overhead,
      contingency,
      totalProjectCost,
      recommendedSellingPrice,
      projectedGrossProfit,
      projectedGrossMarginPct
    };
  }, [stagedItems, laborBurdenPct, overheadPct, contingencyPct, targetMarginPct]);

  // Create & Save Handler
  const handleSavePlan = () => {
    if (!name.trim()) return;

    const planId = `plan-${Date.now()}`;
    const newPlan: BudgetaryPlan = {
      id: planId,
      name: name.trim(),
      description: description.trim() || 'Custom budgetary scenario with verified database records.',
      isBaseline: false,
      targetMarginPct,
      overheadPct,
      contingencyPct,
      selectedItems: stagedItems,
      totalDirectCost: liveFinancials.effectiveDirect,
      totalProjectCost: liveFinancials.totalProjectCost,
      totalEstimatedCost: liveFinancials.effectiveDirect,
      quotedRevenue: liveFinancials.recommendedSellingPrice || defaultSellingPrice,
      grossMarginPct: liveFinancials.projectedGrossMarginPct,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onCreatePlan(newPlan);
    onClose();
    setName('');
    setDescription('');
    setStagedItems([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Plan</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Plan Inputs */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Notes"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Margin %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-2 top-1 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Overhead %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={50}
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  />
                  <span className="absolute right-2 top-1 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Contingency %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={30}
                    value={contingencyPct}
                    onChange={(e) => setContingencyPct(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  />
                  <span className="absolute right-2 top-1 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Burden %
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={50}
                    value={laborBurdenPct}
                    onChange={(e) => setLaborBurdenPct(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  />
                  <span className="absolute right-2 top-1 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sourcing Tabs */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSourcingMode('database')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sourcingMode === 'database'
                    ? 'bg-[#0078d4] text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Database
              </button>

              <button
                type="button"
                onClick={() => setSourcingMode('import')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sourcingMode === 'import'
                    ? 'bg-[#0078d4] text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Import
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourcingMode('blank');
                  setStagedItems([]);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sourcingMode === 'blank'
                    ? 'bg-[#0078d4] text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                }`}
              >
                Blank
              </button>

              {currentPlanItems && currentPlanItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSourcingMode('copy');
                    handleCopyCurrentItems();
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sourcingMode === 'copy'
                      ? 'bg-[#0078d4] text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                  }`}
                >
                  Copy
                </button>
              )}
            </div>

            {/* TAB CONTENT A: DATABASE SEARCH & SELECTION */}
            {sourcingMode === 'database' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={dbSearch}
                      onChange={(e) => setDbSearch(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1 overflow-x-auto text-[11px]">
                    {[
                      { id: 'all', label: `All (${unifiedDatabaseItems.length})` },
                      { id: 'material', label: `Materials (${materials.length})` },
                      { id: 'subcontractor', label: `Trades (${subcontractors.length})` },
                      { id: 'outsourced', label: `Outsourced (${outsourcedServices.length})` },
                      { id: 'produce', label: `Assemblies (${produceItems.length})` }
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setDbTypeFilter(pill.id as any)}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                          dbTypeFilter === pill.id
                            ? 'bg-[#0078d4] text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Results Mini-Grid */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-white dark:bg-slate-950">
                  {filteredDatabaseItems.slice(0, 30).map((item) => {
                    const isStaged = stagedItems.some((s) => s.itemId === item.code && s.name === item.name);
                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-[#0078d4] uppercase">
                              {item.code}
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-[10px] text-slate-500 capitalize">
                              {item.type}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {item.supplierOrProvider}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.unitCost, activeCurrency)}
                            </div>
                            <div className="text-[10px] text-slate-400">per {item.unit}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddFromDatabase(item)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors ${
                              isStaged
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-[#0078d4] hover:bg-[#006cbd] text-white shadow-2xs'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{isStaged ? '+1' : 'Add'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredDatabaseItems.length === 0 && (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      No records found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT B: BULK IMPORT FROM EXCEL / CSV */}
            {sourcingMode === 'import' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-end space-x-1.5">
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('project_cost_items', 'xlsx')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSampleTemplate('project_cost_items', 'csv')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-blue-600" />
                    <span>CSV</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0078d4] p-5 rounded-xl text-center bg-white dark:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleSpreadsheetUpload(e.target.files[0]);
                      }
                    }}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                  />
                  <FileSpreadsheet className="w-7 h-7 text-[#0078d4] mx-auto mb-1.5" />
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {isProcessingFile ? 'Loading...' : 'Select or drop Excel / CSV file'}
                  </div>
                </div>

                {importError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccessCount !== null && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Loaded {importSuccessCount} items</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Staged Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Items ({stagedItems.length})
              </span>

              {stagedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearStaged}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {stagedItems.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 font-semibold">Item</th>
                        <th className="p-2 w-24 font-semibold">Type</th>
                        <th className="p-2 w-28 text-right font-semibold">Rate</th>
                        <th className="p-2 w-20 text-center font-semibold">Qty</th>
                        <th className="p-2 w-16 text-center font-semibold">Disc %</th>
                        <th className="p-2 w-28 text-right font-semibold">Total</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {stagedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                          <td className="p-2">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.itemId} • {item.supplierOrProvider}
                            </div>
                          </td>
                          <td className="p-2 capitalize text-slate-600 dark:text-slate-400 font-medium">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.type === 'material'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : item.type === 'subcontractor'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUpdateStagedItem(item.id, { unitCost: Number(e.target.value) })
                              }
                              className="w-20 p-1 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0.1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateStagedItem(item.id, { quantity: Number(e.target.value) })
                              }
                              className="w-14 p-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={item.discountPct}
                              onChange={(e) =>
                                handleUpdateStagedItem(item.id, { discountPct: Number(e.target.value) })
                              }
                              className="w-12 p-1 text-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.totalCost, activeCurrency)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals Footer */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>
                      Materials:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(liveFinancials.matCost, activeCurrency)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Trades:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(liveFinancials.subCost, activeCurrency)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Outsourced:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency(liveFinancials.outCost, activeCurrency)}
                      </strong>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mr-2">
                      Direct Cost:
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-sky-400 text-sm">
                      {formatCurrency(liveFinancials.directCost, activeCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                No items added.
              </div>
            )}
          </div>

          {/* Metric Summary Cards - Clean Home Tab style */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Direct Cost
              </div>
              <div className="font-mono text-sm font-bold text-[#0078d4] dark:text-sky-400 mt-0.5">
                {formatCurrency(liveFinancials.effectiveDirect, activeCurrency)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Cost
              </div>
              <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatCurrency(liveFinancials.totalProjectCost, activeCurrency)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Target Price
              </div>
              <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(liveFinancials.recommendedSellingPrice, activeCurrency)}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Margin
              </div>
              <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {liveFinancials.projectedGrossMarginPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePlan}
            disabled={!name.trim()}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
