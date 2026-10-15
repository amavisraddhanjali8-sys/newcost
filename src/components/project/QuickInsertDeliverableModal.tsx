import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Package,
  Wrench,
  CheckCircle2,
  DollarSign,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  Maximize2,
  Minimize2,
  Boxes,
  Truck,
  Check,
  TrendingUp,
  Tag
} from 'lucide-react';
import {
  ProduceItem,
  ProjectDeliverableItem,
  MaterialItem,
  SubcontractorRateItem,
  OutsourcedService,
  ProjectCostItem,
  Project
} from '../../types';
import {
  SUPPORTED_CURRENCIES,
  getStoredCurrency,
  getCurrencyInfo,
  formatCurrency,
  convertCurrency
} from '../../utils/currency';

interface QuickInsertDeliverableModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  produceItems?: ProduceItem[];
  materials?: MaterialItem[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  onAddDeliverable: (deliverable: ProjectDeliverableItem) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
  onAddCostItem?: (item: ProjectCostItem) => void;
  projectCurrency?: string;
}

export const QuickInsertDeliverableModal: React.FC<QuickInsertDeliverableModalProps> = ({
  isOpen,
  onClose,
  project,
  produceItems = [],
  materials = [],
  subcontractors = [],
  outsourcedServices = [],
  onAddDeliverable,
  onAddProduceItem,
  onAddCostItem,
  projectCurrency
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'product' | 'service' | 'material' | 'scratch'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<'product' | 'service' | 'material'>('product');
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Multi-Currency selection before adding any item
  const [currency, setCurrency] = useState<string>(() => projectCurrency || getStoredCurrency());
  const currInfo = getCurrencyInfo(currency);

  // Selected item customization
  const [quantity, setQuantity] = useState<number>(1);
  const [customQuotedPrice, setCustomQuotedPrice] = useState<number>(0);
  const [customCostPrice, setCustomCostPrice] = useState<number>(0);
  const [status, setStatus] = useState<'Planned' | 'In Assembly' | 'Completed'>('Planned');

  // Scratch / Custom item form
  const [scratchName, setScratchName] = useState('');
  const [scratchCode, setScratchCode] = useState('');
  const [scratchType, setScratchType] = useState<'product' | 'service' | 'material'>('product');
  const [scratchCategory, setScratchCategory] = useState('Industrial Automation & Machinery');
  const [scratchSubCategory, setScratchSubCategory] = useState('Custom Engineering');
  const [scratchDescription, setScratchDescription] = useState('');
  const [scratchUnit, setScratchUnit] = useState('unit');
  const [scratchCostPrice, setScratchCostPrice] = useState<number>(50000);
  const [scratchQuotedPrice, setScratchQuotedPrice] = useState<number>(75000);
  const [scratchLeadTime, setScratchLeadTime] = useState<number>(30);
  const [saveToMasterCatalog, setSaveToMasterCatalog] = useState(true);

  // Unified items list from database for the FXTT Table
  const unifiedDatabaseItems = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      name: string;
      type: 'product' | 'service' | 'material';
      category: string;
      subCategory?: string;
      description?: string;
      unit: string;
      costPrice: number; // in USD
      retailPrice: number; // in USD
      leadTimeDays?: number;
      inStock?: number;
      supplierOrProvider?: string;
      raw: any;
    }> = [];

    // Products and Services from Master Produce Catalog
    produceItems.forEach((p) => {
      list.push({
        id: p.id,
        code: p.code,
        name: p.name,
        type: p.type,
        category: p.category || 'Machinery',
        subCategory: p.subCategory,
        description: p.description,
        unit: p.unit || 'unit',
        costPrice: p.costPrice || 0,
        retailPrice: p.retailPrice || 0,
        leadTimeDays: p.leadTimeDays || 14,
        inStock: undefined,
        raw: p
      });
    });

    // Materials from Master Materials Catalog
    materials.forEach((m) => {
      list.push({
        id: m.id,
        code: m.code,
        name: m.name,
        type: 'material',
        category: m.category || 'Raw Materials',
        subCategory: m.subCategory,
        description: `${m.itemClassification || 'Material'} supplied by ${m.supplierName || 'Vendor'}`,
        unit: m.unit || 'kg',
        costPrice: m.retailPrice * (1 - (m.defaultDiscountPct || 0) / 100),
        retailPrice: m.retailPrice || 0,
        leadTimeDays: m.leadTimeDays || 7,
        inStock: m.inStock,
        supplierOrProvider: m.supplierName,
        raw: m
      });
    });

    // Subcontractors & Labor from Master Subcontractors Catalog
    subcontractors.forEach((s) => {
      list.push({
        id: s.id,
        code: s.code || `SUB-${s.id}`,
        name: s.name,
        type: 'service',
        category: s.category || 'Specialized Labor & Trades',
        subCategory: s.subCategory,
        description: `${s.serviceType || s.name} (${s.skillLevel || 'Specialist'}) supplied by ${s.subcontractorName || 'Contractor'}`,
        unit: s.unit || 'per_hour',
        costPrice: s.baseRate || s.rate || 0,
        retailPrice: s.retailRate || (s.baseRate ? s.baseRate * 1.3 : 0),
        leadTimeDays: 2,
        supplierOrProvider: s.subcontractorName,
        raw: s
      });
    });

    // Outsourced Services from Master Outsourced Catalog
    outsourcedServices.forEach((o) => {
      list.push({
        id: o.id,
        code: o.code || `SRV-${o.id}`,
        name: o.name,
        type: 'service',
        category: o.category || 'Outsourced Logistics & Services',
        subCategory: o.subCategory,
        description: `${o.name} (${o.slaLevel || 'Standard SLA'}) provided by ${o.providerName || 'Provider'}`,
        unit: o.baseUnitType || 'per_job',
        costPrice: o.rate || 0,
        retailPrice: o.retailPrice || (o.rate ? o.rate * 1.25 : 0),
        leadTimeDays: 4,
        supplierOrProvider: o.providerName,
        raw: o
      });
    });

    return list;
  }, [produceItems, materials, subcontractors, outsourcedServices]);

  // Unique categories for filtering
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    unifiedDatabaseItems.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats);
  }, [unifiedDatabaseItems]);

  // Filtered items based on tab, category, and search query
  const filteredItems = useMemo(() => {
    return unifiedDatabaseItems.filter((item) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'product' && item.type === 'product') ||
        (activeTab === 'service' && item.type === 'service') ||
        (activeTab === 'material' && item.type === 'material');

      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchTab && matchCat && matchSearch;
    });
  }, [unifiedDatabaseItems, activeTab, selectedCategory, searchQuery]);

  // Handle row selection
  const handleSelectItem = (item: (typeof unifiedDatabaseItems)[0]) => {
    setSelectedItemId(item.id);
    setSelectedItemType(item.type);

    // Convert prices to selected currency
    const costInCurrency = convertCurrency(item.costPrice, 'USD', currency);
    const priceInCurrency = convertCurrency(item.retailPrice, 'USD', currency);

    setCustomCostPrice(Number(costInCurrency.toFixed(2)));
    setCustomQuotedPrice(Number(priceInCurrency.toFixed(2)));
    setQuantity(1);
  };

  const selectedItem = useMemo(() => {
    return unifiedDatabaseItems.find((i) => i.id === selectedItemId) || null;
  }, [unifiedDatabaseItems, selectedItemId]);

  // Live margin calculation
  const liveMarginPct = useMemo(() => {
    if (customQuotedPrice <= 0) return 0;
    return ((customQuotedPrice - customCostPrice) / customQuotedPrice) * 100;
  }, [customQuotedPrice, customCostPrice]);

  const scratchMarginPct = useMemo(() => {
    if (scratchQuotedPrice <= 0) return 0;
    return ((scratchQuotedPrice - scratchCostPrice) / scratchQuotedPrice) * 100;
  }, [scratchQuotedPrice, scratchCostPrice]);

  // Insert from Database into Project
  const handleInsertSelected = () => {
    if (!selectedItem) return;

    const unitRev = customQuotedPrice;
    const unitCost = customCostPrice;
    const totRev = unitRev * quantity;
    const totCost = unitCost * quantity;
    const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;

    if (onAddCostItem && project && (selectedItem.type === 'material' || selectedItem.raw?.subcontractorName || selectedItem.raw?.providerName)) {
      const isSub = Boolean(selectedItem.raw?.subcontractorName || selectedItem.category.toLowerCase().includes('labor') || selectedItem.category.toLowerCase().includes('trade'));
      const isOut = Boolean(selectedItem.raw?.providerName || selectedItem.category.toLowerCase().includes('logistics') || selectedItem.category.toLowerCase().includes('outsourced'));
      const costType: 'material' | 'subcontractor' | 'outsourced' = isSub ? 'subcontractor' : isOut ? 'outsourced' : 'material';

      // Add as cost item to active budget plan
      const costItem: ProjectCostItem = {
        id: `cost-${Date.now()}`,
        phaseId: project.phases?.[0]?.id || 'ph-01',
        type: costType,
        itemId: selectedItem.id,
        name: selectedItem.name,
        category: selectedItem.category,
        supplierOrProvider: selectedItem.supplierOrProvider || (isSub ? 'Certified Contractor' : isOut ? 'Service Provider' : 'Approved Vendor'),
        quantity,
        unit: selectedItem.unit,
        unitCost,
        discountPct: 0,
        totalCost: totCost,
        totalRevenue: totRev,
        billableRate: unitRev
      };
      onAddCostItem(costItem);
    } else {
      // Add as deliverable (product or service)
      const newDeliverable: ProjectDeliverableItem = {
        id: `deliv-${Date.now()}`,
        code: selectedItem.code,
        name: selectedItem.name,
        type: selectedItem.type === 'material' ? 'product' : selectedItem.type,
        category: selectedItem.category,
        subCategory: selectedItem.subCategory,
        description: selectedItem.description,
        quantity,
        unit: selectedItem.unit,
        costPrice: unitCost,
        quotedPrice: unitRev,
        totalRevenue: totRev,
        totalCost: totCost,
        marginPct: Number(margin.toFixed(1)),
        leadTimeDays: selectedItem.leadTimeDays,
        status,
        currency
      };
      onAddDeliverable(newDeliverable);
    }

    onClose();
  };

  // Insert custom scratch item into Project & Database
  const handleInsertFromScratch = () => {
    if (!scratchName) return;

    const code =
      scratchCode ||
      (scratchType === 'product'
        ? `PRD-${Date.now().toString().slice(-4)}`
        : scratchType === 'service'
        ? `SRV-${Date.now().toString().slice(-4)}`
        : `MAT-${Date.now().toString().slice(-4)}`);

    const totRev = scratchQuotedPrice * quantity;
    const totCost = scratchCostPrice * quantity;
    const margin = totRev > 0 ? ((totRev - totCost) / totRev) * 100 : 0;

    const newDeliverable: ProjectDeliverableItem = {
      id: `deliv-${Date.now()}`,
      code,
      name: scratchName,
      type: scratchType === 'material' ? 'product' : scratchType,
      category: scratchCategory,
      subCategory: scratchSubCategory,
      description: scratchDescription,
      quantity,
      unit: scratchUnit,
      costPrice: scratchCostPrice,
      quotedPrice: scratchQuotedPrice,
      totalRevenue: totRev,
      totalCost: totCost,
      marginPct: Number(margin.toFixed(1)),
      leadTimeDays: scratchLeadTime,
      status,
      currency
    };

    if (saveToMasterCatalog && onAddProduceItem && scratchType !== 'material') {
      const catalogItem: ProduceItem = {
        id: `prod-${Date.now()}`,
        code,
        name: scratchName,
        type: scratchType as 'product' | 'service',
        category: scratchCategory,
        subCategory: scratchSubCategory,
        moreSubCategory: scratchSubCategory || scratchCategory,
        description: scratchDescription,
        unit: scratchUnit,
        costPrice: convertCurrency(scratchCostPrice, currency, 'USD'),
        retailPrice: convertCurrency(scratchQuotedPrice, currency, 'USD'),
        defaultDiscountPct: 0,
        priceHistory: [],
        currency,
        leadTimeDays: scratchLeadTime,
        status: 'Active',
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      onAddProduceItem(catalogItem);
    }

    onAddDeliverable(newDeliverable);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'w-full h-full max-w-7xl max-h-[96vh]' : 'w-full max-w-4xl max-h-[85vh]'
        }`}
      >
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Item</h3>
            {project && (
              <span className="font-mono text-xs text-[#0078d4] bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {project.code}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
              <span className="text-slate-500 text-xs">Currency:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TOOLBAR: Filter Tabs & Search */}
        <div className="bg-[#fdf0d5]/40 dark:bg-slate-900/40 border-b border-[#ecd5a8] dark:border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Simple Tab Pills */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'product', label: 'Products' },
                { id: 'service', label: 'Services' },
                { id: 'material', label: 'Materials' },
                { id: 'scratch', label: 'Custom' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#003049] dark:bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          {activeTab !== 'scratch' && (
            <div className="flex items-center space-x-2 flex-1 max-w-xl justify-end">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search code, name, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-8 pr-7 py-1.5 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#003049]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none cursor-pointer max-w-[180px]"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <span className="text-slate-400 text-xs hidden md:inline">
                {filteredItems.length} items
              </span>
            </div>
          )}
        </div>

        {/* MAIN BODY: Full-Screen FXTT Table or Custom Form */}
        <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-50/50 dark:bg-slate-950/40">
          {activeTab !== 'scratch' ? (
            /* FXTT TABLE VIEW */
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0f172a] shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#003049]/5 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Code</th>
                    <th className="py-2.5 px-3 font-bold">Name & Description</th>
                    <th className="py-2.5 px-2 font-bold">Type</th>
                    <th className="py-2.5 px-3 font-bold">Category</th>
                    <th className="py-2.5 px-2 font-bold">Unit</th>
                    <th className="py-2.5 px-2 font-bold">Stock / Lead</th>
                    <th className="py-2.5 px-3 font-bold text-right">Cost ({currInfo.symbol})</th>
                    <th className="py-2.5 px-3 font-bold text-right">Price ({currInfo.symbol})</th>
                    <th className="py-2.5 px-2 font-bold text-center">Margin</th>
                    <th className="py-2.5 px-3 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs">No matching items found in central catalog database.</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('scratch')}
                          className="mt-2 text-xs font-semibold text-[#0078d4] hover:underline cursor-pointer"
                        >
                          + Create Custom Item
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      const costConv = convertCurrency(item.costPrice, 'USD', currency);
                      const priceConv = convertCurrency(item.retailPrice, 'USD', currency);
                      const marginPct =
                        priceConv > 0 ? ((priceConv - costConv) / priceConv) * 100 : 0;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-sky-950/40 border-l-4 border-[#003049] dark:border-sky-500'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          }`}
                        >
                          {/* Code */}
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[11px] font-bold text-[#003049] dark:text-sky-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {item.code}
                            </span>
                          </td>

                          {/* Name & Description */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {item.description}
                              </div>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.type === 'product'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-[#0078d4] dark:text-sky-300'
                                  : item.type === 'service'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            <div>{item.category}</div>
                            {item.subCategory && (
                              <div className="text-[10px] text-slate-400">{item.subCategory}</div>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-2 text-slate-500 dark:text-slate-400">
                            {item.unit}
                          </td>

                          {/* Stock / Lead */}
                          <td className="py-2.5 px-2 text-[11px] text-slate-600 dark:text-slate-400">
                            {item.inStock !== undefined ? `${item.inStock} in stock` : `${item.leadTimeDays}d lead`}
                          </td>

                          {/* Cost */}
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrency(costConv, currency)}
                          </td>

                          {/* Quoted Price */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(priceConv, currency)}
                          </td>

                          {/* Margin % */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                marginPct >= 30
                                  ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : marginPct >= 15
                                  ? 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {marginPct.toFixed(1)}%
                            </span>
                          </td>

                          {/* Action */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectItem(item);
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#003049] text-white shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {isSelected ? 'Configured' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* CREATE CUSTOM ITEM FORM */
            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Create Custom Item
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Define custom scope and add directly to project plan.
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToMasterCatalog}
                      onChange={(e) => setSaveToMasterCatalog(e.target.checked)}
                      className="rounded border-slate-300 text-[#003049]"
                    />
                    <span>Save to Master Catalog Database</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={scratchName}
                    onChange={(e) => setScratchName(e.target.value)}
                    placeholder="e.g. 5-Axis CNC Fixture Assembly"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code / SKU
                  </label>
                  <input
                    type="text"
                    value={scratchCode}
                    onChange={(e) => setScratchCode(e.target.value)}
                    placeholder="e.g. PRD-AUTO-501"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Item Type
                  </label>
                  <select
                    value={scratchType}
                    onChange={(e) => setScratchType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  >
                    <option value="product">Product (Manufactured Good)</option>
                    <option value="service">Service (Delivered Scope)</option>
                    <option value="material">Material (Raw Spec)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={scratchCategory}
                    onChange={(e) => setScratchCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={scratchSubCategory}
                    onChange={(e) => setScratchSubCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={scratchUnit}
                    onChange={(e) => setScratchUnit(e.target.value)}
                    placeholder="unit, system, hr, assembly"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit Cost ({currInfo.symbol})
                  </label>
                  <input
                    type="number"
                    value={scratchCostPrice}
                    onChange={(e) => setScratchCostPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quoted Price ({currInfo.symbol})
                  </label>
                  <input
                    type="number"
                    value={scratchQuotedPrice}
                    onChange={(e) => setScratchQuotedPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    value={scratchLeadTime}
                    onChange={(e) => setScratchLeadTime(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                  Scope Description & Technical Specs
                </label>
                <textarea
                  rows={2}
                  value={scratchDescription}
                  onChange={(e) => setScratchDescription(e.target.value)}
                  placeholder="Detailed technical specifications, tolerance, certification..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#003049]"
                />
              </div>

              {/* Financial summary for custom item */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-4">
                  <span>
                    Revenue: <strong>{formatCurrency(scratchQuotedPrice * quantity, currency)}</strong>
                  </span>
                  <span>
                    Cost: <strong>{formatCurrency(scratchCostPrice * quantity, currency)}</strong>
                  </span>
                  <span>
                    Est. Margin:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {scratchMarginPct.toFixed(1)}%
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInsertFromScratch}
                  disabled={!scratchName}
                  className="px-4 py-2 bg-[#003049] hover:bg-[#002235] text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Insert Custom Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM QUICK-CONFIG TRAY: Appears when an item is selected */}
        {activeTab !== 'scratch' && selectedItem && (
          <div className="bg-white dark:bg-[#0b101b] border-t border-slate-200 dark:border-slate-800 p-3 sm:p-4 shrink-0 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left Item Summary */}
              <div className="min-w-[220px]">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-[#003049] dark:text-sky-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {selectedItem.code}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs">
                    {selectedItem.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Unit: {selectedItem.unit} • Category: {selectedItem.category}
                </div>
              </div>

              {/* Center Configuration Inputs: Simple words */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-500 text-[11px] font-semibold">Qty:</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 text-center"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-slate-500 text-[11px] font-semibold">
                    Cost ({currInfo.symbol}):
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={customCostPrice}
                    onChange={(e) => setCustomCostPrice(Number(e.target.value) || 0)}
                    className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-slate-500 text-[11px] font-semibold">
                    Price ({currInfo.symbol}):
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={customQuotedPrice}
                    onChange={(e) => setCustomQuotedPrice(Number(e.target.value) || 0)}
                    className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-slate-500 text-[11px] font-semibold">Status:</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Assembly">In Assembly</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Right: Real-time Totals & Insert Button */}
              <div className="flex items-center space-x-3">
                <div className="text-right text-xs">
                  <div className="font-bold text-[#003049] dark:text-sky-300">
                    Total: {formatCurrency(customQuotedPrice * quantity, currency)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Margin:{' '}
                    <span
                      className={`font-bold ${
                        liveMarginPct >= 20 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {liveMarginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInsertSelected}
                  className="px-4 py-2 bg-[#003049] hover:bg-[#002235] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Item</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
