import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Building2,
  DollarSign,
  Truck,
  ShieldCheck,
  Star,
  Plus,
  Layers,
  Percent,
  Check,
  Table as TableIcon,
  LayoutGrid,
  TrendingUp,
  ArrowUpDown,
  Filter,
  Sliders,
  ChevronRight,
  Info,
  Package,
  Boxes,
  Sparkles,
  Award,
  Clock,
  ArrowUpRight,
  Minus,
  RefreshCw,
  Maximize2,
  Columns
} from 'lucide-react';
import { MaterialItem, Supplier, ProjectCostItem, ProjectPhase } from '../../types';
import { formatLKR } from '../../utils/currency';

interface SupplierQuoteOption {
  id: string;
  supplierName: string;
  supplierId?: string;
  city?: string;
  country?: string;
  rating: number;
  onTimeDeliveryPct: number;
  qualityScorePct: number;
  certifications?: string[];
  unitRate: number;
  currency?: string;
  volumeTiers?: { minQty: number; unitPrice: number; discountPct: number; label: string }[];
  leadTimeDays: number;
  paymentTerms: string;
  badge?: string;
  notes?: string;
  isCustom?: boolean;
}

interface SupplierRatesComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  suppliers: Supplier[];
  phases: ProjectPhase[];
  onAddCostItem: (item: ProjectCostItem, syncRevenue?: boolean) => void;
  onAddMaterial?: (mat: MaterialItem) => void;
  initialMaterial?: MaterialItem | null;
}

export const SupplierRatesComparisonModal: React.FC<SupplierRatesComparisonModalProps> = ({
  isOpen,
  onClose,
  materials,
  suppliers,
  phases,
  onAddCostItem,
  onAddMaterial,
  initialMaterial
}) => {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(initialMaterial || null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [catalogViewMode, setCatalogViewMode] = useState<'fxtt_table' | 'grid'>('fxtt_table');
  const [tableLayoutMode, setTableLayoutMode] = useState<'split' | 'full'>('full');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'price_asc' | 'price_desc' | 'lead_time'>('name');

  // Vendor quote selection
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('quote-1');

  // Bulk size & pricing configuration
  const [quantity, setQuantity] = useState<number>(50);
  const [selectedBulkTier, setSelectedBulkTier] = useState<string>('batch');
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(5);

  // Profit & Revenue configuration
  const [markupPct, setMarkupPct] = useState<number>(35);
  const [customBillableRate, setCustomBillableRate] = useState<number | null>(null);
  const [syncRevenueWithProject, setSyncRevenueWithProject] = useState<boolean>(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(phases[0]?.id || 'phase-01');

  // Custom supplier quote state
  const [isAddingCustomQuote, setIsAddingCustomQuote] = useState(false);
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [customRate, setCustomRate] = useState<number>(0);
  const [customLeadTime, setCustomLeadTime] = useState<number>(7);
  const [customPaymentTerms, setCustomPaymentTerms] = useState('Net 30');
  const [customNotes, setCustomNotes] = useState('');
  const [customQuotesList, setCustomQuotesList] = useState<SupplierQuoteOption[]>([]);

  // Create new material from scratch state
  const [isCreatingMaterial, setIsCreatingMaterial] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatCode, setNewMatCode] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('Metals & Structural Alloys');
  const [newMatUnit, setNewMatUnit] = useState('sheet');
  const [newMatBasePrice, setNewMatBasePrice] = useState<number>(150);

  // Sync initial material if provided
  React.useEffect(() => {
    if (initialMaterial) {
      setSelectedMaterial(initialMaterial);
    }
  }, [initialMaterial]);

  // Categories list with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = { All: materials.length };
    materials.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    const uniqueCats = Array.from(new Set(materials.map(m => m.category)));
    return {
      list: ['All', ...uniqueCats],
      counts
    };
  }, [materials]);

  // Filtered & sorted materials
  const filteredMaterials = useMemo(() => {
    const list = materials.filter(m => {
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      const q = materialSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        (m.supplierName && m.supplierName.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });

    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      if (sortBy === 'price_asc') return a.retailPrice - b.retailPrice;
      if (sortBy === 'price_desc') return b.retailPrice - a.retailPrice;
      if (sortBy === 'lead_time') return (a.leadTimeDays || 7) - (b.leadTimeDays || 7);
      return 0;
    });
  }, [materials, selectedCategory, materialSearch, sortBy]);

  // Generate competitive quotes for the selected material
  const quotes: SupplierQuoteOption[] = useMemo(() => {
    if (!selectedMaterial) return [];

    const basePrice = selectedMaterial.retailPrice || 100;
    const baseSupplierName = selectedMaterial.supplierName || 'Apex Precision Metallurgy Corp';
    const baseUnit = selectedMaterial.unit || 'pcs';

    const list: SupplierQuoteOption[] = [
      {
        id: 'quote-1',
        supplierName: baseSupplierName,
        city: 'Pittsburgh, PA',
        country: 'USA',
        rating: 4.8,
        onTimeDeliveryPct: 97.4,
        qualityScorePct: 99.1,
        certifications: ['ISO 9001:2015', 'AS9100D Aerospace Certified', 'NADCAP Heat Treat'],
        unitRate: basePrice,
        currency: 'LKR',
        volumeTiers: [
          { minQty: 1, unitPrice: basePrice, discountPct: 0, label: `Standard Tier (1-24 ${baseUnit})` },
          { minQty: 25, unitPrice: basePrice * 0.95, discountPct: 5, label: `Production Batch (25-99 ${baseUnit})` },
          { minQty: 100, unitPrice: basePrice * 0.90, discountPct: 10, label: `Volume Lot (100-499 ${baseUnit})` },
          { minQty: 500, unitPrice: basePrice * 0.85, discountPct: 15, label: `Enterprise Mill Run (500+ ${baseUnit})` }
        ],
        leadTimeDays: selectedMaterial.leadTimeDays || 5,
        paymentTerms: 'Net 30',
        badge: 'Primary Certified Mill (AS9100D)',
        notes: 'Guaranteed heat lot metallurgical test reports with zero defect warranty.'
      },
      {
        id: 'quote-2',
        supplierName: 'Titan Heavy Structural Fabricators',
        city: 'Detroit, MI',
        country: 'USA',
        rating: 4.6,
        onTimeDeliveryPct: 95.0,
        qualityScorePct: 98.2,
        certifications: ['ISO 9001:2015', 'ASME Section IX Certified'],
        unitRate: Number((basePrice * 0.93).toFixed(2)), // 7% cheaper
        currency: 'LKR',
        volumeTiers: [
          { minQty: 1, unitPrice: Number((basePrice * 0.93).toFixed(2)), discountPct: 0, label: `Standard Contract Tier` },
          { minQty: 50, unitPrice: Number((basePrice * 0.86).toFixed(2)), discountPct: 8, label: `High Volume Fabricator Batch` }
        ],
        leadTimeDays: (selectedMaterial.leadTimeDays || 7) + 4,
        paymentTerms: 'Net 60',
        badge: 'Lowest Rate Guarantee (-7%)',
        notes: 'Direct mill stock with standard certification and flexible 60-day terms.'
      },
      {
        id: 'quote-3',
        supplierName: 'Global Integrated Logistics & Materials Fleet',
        city: 'Chicago, IL',
        country: 'USA',
        rating: 4.9,
        onTimeDeliveryPct: 99.2,
        qualityScorePct: 99.6,
        certifications: ['C-TPAT Tier 2 Certified', 'ISO 28000 SCM'],
        unitRate: Number((basePrice * 1.05).toFixed(2)), // 5% premium
        currency: 'LKR',
        volumeTiers: [
          { minQty: 1, unitPrice: Number((basePrice * 1.05).toFixed(2)), discountPct: 0, label: `Fast-Track Dispatch` }
        ],
        leadTimeDays: Math.max(2, Math.round((selectedMaterial.leadTimeDays || 6) / 2)),
        paymentTerms: 'Net 15 / Advance 50%',
        badge: 'Fast-Track Expedited (48h)',
        notes: 'Express courier & satellite-tracked freight with guaranteed delivery dispatch.'
      },
      {
        id: 'quote-4',
        supplierName: 'Pacific Raw Metals & Industrial Alloys',
        city: 'Seattle, WA',
        country: 'USA',
        rating: 4.4,
        onTimeDeliveryPct: 92.8,
        qualityScorePct: 96.5,
        certifications: ['ISO 9001 Certified'],
        unitRate: Number((basePrice * 0.91).toFixed(2)), // 9% cheaper
        currency: 'LKR',
        leadTimeDays: (selectedMaterial.leadTimeDays || 7) + 10,
        paymentTerms: 'Commercial Escrow',
        badge: 'Budget Economy (-9%)',
        notes: 'Commercial specification with factory certificate. Ideal for cost-optimized runs.'
      }
    ];

    return [...list, ...customQuotesList];
  }, [selectedMaterial, customQuotesList]);

  // Active quote
  const selectedQuote = useMemo(() => {
    return quotes.find(q => q.id === selectedQuoteId) || quotes[0];
  }, [quotes, selectedQuoteId]);

  // Bulk Tier Presets
  const bulkTierOptions = [
    { id: 'proto', label: 'Prototype Batch', range: '1 - 24 units', defaultQty: 10, discountPct: 0, desc: 'Single unit prototyping' },
    { id: 'batch', label: 'Production Batch', range: '25 - 99 units', defaultQty: 50, discountPct: 5, desc: 'Standard production run' },
    { id: 'volume', label: 'Volume Lot', range: '100 - 499 units', defaultQty: 150, discountPct: 10, desc: 'Optimized bulk pricing' },
    { id: 'enterprise', label: 'Enterprise Mill Run', range: '500+ units', defaultQty: 500, discountPct: 15, desc: 'Maximum volume discount' }
  ];

  const handleSelectBulkTier = (tier: typeof bulkTierOptions[0]) => {
    setSelectedBulkTier(tier.id);
    setQuantity(tier.defaultQty);
    setCustomDiscountPct(tier.discountPct);
  };

  // Cost calculations
  const vendorBaseRate = selectedQuote?.unitRate || selectedMaterial?.retailPrice || 0;
  const effectiveDiscountRate = (customDiscountPct || 0) / 100;
  const netUnitCost = Number((vendorBaseRate * (1 - effectiveDiscountRate)).toFixed(2));
  const totalCost = Number((netUnitCost * quantity).toFixed(2));

  // Revenue calculations
  const calculatedBillableRate = useMemo(() => {
    if (customBillableRate !== null && customBillableRate > 0) {
      return customBillableRate;
    }
    return Number((netUnitCost * (1 + markupPct / 100)).toFixed(2));
  }, [customBillableRate, netUnitCost, markupPct]);

  const totalRevenue = Number((calculatedBillableRate * quantity).toFixed(2));
  const grossProfit = Number((totalRevenue - totalCost).toFixed(2));
  const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

  // Handlers for bidirectional pricing
  const handleBillablePriceChange = (val: number) => {
    setCustomBillableRate(val);
    if (netUnitCost > 0) {
      const derivedMarkup = ((val - netUnitCost) / netUnitCost) * 100;
      setMarkupPct(Number(Math.max(0, derivedMarkup).toFixed(1)));
    }
  };

  const handleMarkupChange = (val: number) => {
    setMarkupPct(val);
    setCustomBillableRate(null);
  };

  // Handle adding custom quote
  const handleSaveCustomQuote = () => {
    if (!customSupplierName || customRate <= 0) return;
    const newQuote: SupplierQuoteOption = {
      id: `custom-quote-${Date.now()}`,
      supplierName: customSupplierName,
      rating: 4.5,
      onTimeDeliveryPct: 95.0,
      qualityScorePct: 97.0,
      unitRate: customRate,
      leadTimeDays: customLeadTime,
      paymentTerms: customPaymentTerms,
      badge: 'Custom Sourced Rate',
      notes: customNotes || 'User-supplied vendor rate for this project requirement.',
      isCustom: true
    };
    setCustomQuotesList(prev => [...prev, newQuote]);
    setSelectedQuoteId(newQuote.id);
    setIsAddingCustomQuote(false);
    setCustomSupplierName('');
    setCustomRate(0);
    setCustomNotes('');
  };

  // Handle creating material from scratch
  const handleSaveNewMaterial = () => {
    if (!newMatName) return;
    const code = newMatCode || `MAT-${Date.now().toString().slice(-4)}`;
    const newMat: MaterialItem = {
      id: `mat-${Date.now()}`,
      code,
      name: newMatName,
      category: newMatCategory,
      subCategory: 'Custom Sourced Material',
      moreSubCategory: 'Custom Procurement Specification',
      itemClassification: 'raw_material',
      supplierId: 'sup-01',
      supplierName: 'Apex Precision Metallurgy Corp',
      unit: newMatUnit,
      retailPrice: newMatBasePrice,
      defaultDiscountPct: 5,
      volumePricing: [],
      inStock: 100,
      reorderPoint: 20,
      leadTimeDays: 7,
      lastUpdated: new Date().toISOString().split('T')[0],
      priceHistory: []
    };
    if (onAddMaterial) {
      onAddMaterial(newMat);
    }
    setSelectedMaterial(newMat);
    setIsCreatingMaterial(false);
    setNewMatName('');
    setNewMatCode('');
  };

  // Handle confirming cost item and inserting into project
  const handleConfirmAndAdd = () => {
    if (!selectedMaterial || !selectedQuote) return;

    const newItem: ProjectCostItem = {
      id: `pitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      phaseId: selectedPhaseId,
      type: 'material',
      itemId: selectedMaterial.id,
      name: `${selectedMaterial.name} [${selectedQuote.supplierName}]`,
      category: selectedMaterial.category,
      supplierOrProvider: selectedQuote.supplierName,
      quantity,
      unit: selectedMaterial.unit,
      unitCost: netUnitCost,
      discountPct: customDiscountPct,
      totalCost,
      selectedOptionIndex: 0,
      alternativeOptions: quotes
        .filter(q => q.id !== selectedQuote.id)
        .map(q => ({
          provider: q.supplierName,
          unitCost: q.unitRate,
          savingsDiff: Number(((q.unitRate - selectedQuote.unitRate) * quantity).toFixed(2)),
          notes: q.notes || `${q.leadTimeDays}d lead time (${q.paymentTerms})`
        })),
      billableRate: calculatedBillableRate,
      totalRevenue,
      grossProfit,
      markupPct,
      bulkTierLabel: bulkTierOptions.find(t => t.id === selectedBulkTier)?.label
    };

    onAddCostItem(newItem, syncRevenueWithProject);
    onClose();
  };

  // 1-Click Direct Quick Insert for Full-Screen Table View
  const handleQuickInsertDirectly = (material: MaterialItem) => {
    const basePrice = material.retailPrice || 100;
    const newItem: ProjectCostItem = {
      id: `cost-mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      phaseId: selectedPhaseId || phases[0]?.id || 'phase-01',
      type: 'material',
      itemId: material.id,
      name: `${material.name} [${material.supplierName || 'Primary Certified Vendor'}]`,
      category: material.category,
      supplierOrProvider: material.supplierName || 'Primary Certified Vendor',
      quantity: 1,
      unit: material.unit || 'pcs',
      unitCost: basePrice,
      discountPct: 0,
      totalCost: basePrice,
      selectedOptionIndex: 0,
      billableRate: Number((basePrice * 1.35).toFixed(2)),
      totalRevenue: Number((basePrice * 1.35).toFixed(2)),
      grossProfit: Number((basePrice * 0.35).toFixed(2)),
      markupPct: 35
    };
    onAddCostItem(newItem, true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-white overflow-hidden animate-in fade-in duration-150">
      {/* Simple Top Row - Header removed as requested */}
      <div className="bg-white dark:bg-[#0b101b] px-4 py-2.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Materials</h3>
        </div>

        <div className="flex items-center space-x-2">
          {/* Table Layout Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setTableLayoutMode('split')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                tableLayoutMode === 'split'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setTableLayoutMode('full')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                tableLayoutMode === 'full'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCatalogViewMode('fxtt_table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                catalogViewMode === 'fxtt_table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setCatalogViewMode('grid')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                catalogViewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {/* Create Material Scratch */}
          <button
            onClick={() => setIsCreatingMaterial(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Material</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* SUB-HEADER TOOLBAR: SEARCH, CATEGORY PILLS & SORT */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search materials..."
              value={materialSearch}
              onChange={e => setMaterialSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#003049]"
            />
            {materialSearch && (
              <button
                onClick={() => setMaterialSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-0.5 text-xs">
            {categoriesWithCounts.list.map(cat => {
              const isSelected = selectedCategory === cat;
              const count = categoriesWithCounts.counts[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-[#003049] text-white font-medium shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 shrink-0">
            <span className="text-[11px] text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#003049]"
            >
              <option value="name">Name (A-Z)</option>
              <option value="code">SKU Code</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="lead_time">Fastest Lead Time</option>
            </select>
          </div>
        </div>

        {/* MAIN BODY: SPLIT VIEW LAYOUT */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* LEFT PANE: MATERIAL CATALOG (FXTT TABLE OR GRID) */}
          <div
            className={`flex flex-col h-full overflow-hidden transition-all ${
              selectedMaterial && tableLayoutMode === 'split'
                ? 'w-full lg:w-7/12 2xl:w-3/5 border-b lg:border-b-0 lg:border-r border-slate-200'
                : 'w-full'
            }`}
          >
            {/* Catalog Info Strip */}
            <div className="bg-white px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-medium text-slate-800">{filteredMaterials.length}</span>
                <span>materials matched</span>
                {selectedCategory !== 'All' && (
                  <span className="text-[11px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                    {selectedCategory}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 italic">
                {selectedMaterial ? 'Click another item to switch' : 'Select an item to configure vendor, bulk & calculate profit'}
              </span>
            </div>

            {/* Create Material Modal Sub-screen */}
            {isCreatingMaterial && (
              <div className="m-3 p-4 bg-[#fdf0d5]/40 border border-[#ecd5a8] rounded-xl space-y-3 shrink-0">
                <div className="flex items-center justify-between border-b border-[#ecd5a8] pb-2">
                  <h4 className="text-xs font-semibold text-[#003049] flex items-center space-x-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#c1121f]" />
                    <span>Create Custom Material Specification</span>
                  </h4>
                  <button onClick={() => setIsCreatingMaterial(false)} className="text-xs text-slate-500 hover:text-slate-800">
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">Material Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Inconel 718 High-Temp Alloy Bar (45mm)"
                      value={newMatName}
                      onChange={e => setNewMatName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">Item Code / SKU</label>
                    <input
                      type="text"
                      placeholder="e.g. MAT-INC-718"
                      value={newMatCode}
                      onChange={e => setNewMatCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={newMatCategory}
                      onChange={e => setNewMatCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-700 font-medium mb-1">Unit</label>
                      <input
                        type="text"
                        value={newMatUnit}
                        onChange={e => setNewMatUnit(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-700 font-medium mb-1">Base Price ($)</label>
                      <input
                        type="number"
                        value={newMatBasePrice}
                        onChange={e => setNewMatBasePrice(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveNewMaterial}
                    disabled={!newMatName}
                    className="px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-50"
                  >
                    Save &amp; Compare Vendor Rates &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* VIEW MODE 1: FXTT TABLE LIST VIEW */}
            {catalogViewMode === 'fxtt_table' ? (
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Item Code</th>
                      <th className="py-2.5 px-3">Material Specification</th>
                      <th className="py-2.5 px-2">Category</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Base Market Rate</th>
                      <th className="py-2.5 px-3">Primary Vendor</th>
                      <th className="py-2.5 px-2 text-center">Lead Time</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="text-sm font-medium">No materials match your search criteria</p>
                          <p className="text-xs text-slate-400 mt-1">Try changing category or clearing your query</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map(m => {
                        const isCurrent = selectedMaterial?.id === m.id;
                        return (
                          <tr
                            key={m.id}
                            onClick={() => setSelectedMaterial(m)}
                            className={`cursor-pointer transition-colors group ${
                              isCurrent
                                ? 'bg-[#003049]/10 font-medium'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-[#003049]/40">
                                {m.code}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900 group-hover:text-[#003049]">
                                {m.name}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1">
                                Certified aerospace &amp; industrial grade
                              </div>
                            </td>
                            <td className="py-2.5 px-2">
                              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                {m.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="text-[10px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                                {m.unit}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-semibold text-[#003049]">
                                {formatLKR(m.retailPrice)}
                              </span>
                              <span className="text-[10px] text-slate-400 block">/{m.unit}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[11px] text-slate-800 flex items-center space-x-1">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{m.supplierName || 'Certified Mill Vendor'}</span>
                              </div>
                              <span className="text-[10px] text-emerald-700">4 Quotes Available</span>
                            </td>
                            <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                              {m.leadTimeDays || 5}d
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleQuickInsertDirectly(m);
                                  }}
                                  className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                                  title="Quick Insert directly into active phase with standard 35% margin"
                                >
                                  <span>⚡ Quick Insert</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedMaterial(m);
                                  }}
                                  className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                                    isCurrent
                                      ? 'bg-[#003049] text-white'
                                      : 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] hover:bg-[#ecd5a8]'
                                  }`}
                                  title="Select and compare supplier quotes"
                                >
                                  <span>{isCurrent ? 'Configuring' : 'Compare'}</span>
                                  <ChevronRight className="w-3 h-3" />
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
            ) : (
              /* VIEW MODE 2: GRID CARDS VIEW */
              <div className="flex-1 overflow-y-auto p-3">
                <div className={`grid gap-3 ${selectedMaterial ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                  {filteredMaterials.map(m => {
                    const isCurrent = selectedMaterial?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMaterial(m)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-[#003049]/5 border-[#003049] ring-2 ring-[#003049] shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/70 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {m.code}
                            </span>
                            <span className="text-[10px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                              {m.unit}
                            </span>
                          </div>
                          <h5 className="text-xs font-semibold text-slate-900 group-hover:text-[#003049] mt-1 line-clamp-2">
                            {m.name}
                          </h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">{m.category}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                          <div>
                            <div className="text-xs font-semibold text-[#003049]">
                              ${m.retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-slate-500 font-normal">/{m.unit}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 flex items-center space-x-1">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>4 Multi-Supplier Rates</span>
                            </span>
                          </div>
                          <span className={`text-[10px] font-medium px-2 py-1 rounded ${
                            isCurrent ? 'bg-[#003049] text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-[#003049] group-hover:text-white'
                          }`}>
                            {isCurrent ? 'Selected' : 'Compare &rarr;'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full-Table Bottom Notification Banner when Item Selected */}
            {tableLayoutMode === 'full' && selectedMaterial && (
              <div className="bg-[#003049] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-[#002235] shadow-lg">
                <div className="flex items-center space-x-3 flex-wrap">
                  <span className="font-mono text-xs text-[#fdf0d5] bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {selectedMaterial.code}
                  </span>
                  <span className="text-xs font-semibold">{selectedMaterial.name}</span>
                  <span className="text-xs text-slate-300">
                    Base: {formatLKR(selectedMaterial.retailPrice)}/{selectedMaterial.unit}
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">4 Quotes Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleQuickInsertDirectly(selectedMaterial)}
                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>⚡ Quick Insert ({formatLKR(selectedMaterial.retailPrice)})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableLayoutMode('split')}
                    className="px-3 py-1.5 bg-[#fdf0d5] hover:bg-[#ecd5a8] text-[#003049] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Open Multi-Vendor &amp; Profit Engine &rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANE: VENDOR SELECTION, BULK SIZE, REVENUE & PROFIT ENGINE */}
          {selectedMaterial && tableLayoutMode === 'split' ? (
            <div className="w-full lg:w-5/12 2xl:w-2/5 flex flex-col h-full overflow-y-auto bg-slate-50/70 p-4 space-y-4 shrink-0">
              {/* MATERIAL SUMMARY HEADER CARD */}
              <div className="bg-[#fdf0d5]/60 border border-[#ecd5a8] rounded-xl p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-600">
                      <span className="font-mono text-[#003049] font-semibold uppercase">{selectedMaterial.code}</span>
                      <span>•</span>
                      <span>{selectedMaterial.category}</span>
                      <span>•</span>
                      <span className="bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-300 font-medium">
                        Unit: {selectedMaterial.unit}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-[#003049] mt-1">{selectedMaterial.name}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedMaterial(null)}
                    className="text-xs text-slate-600 hover:text-slate-900 underline whitespace-nowrap"
                  >
                    Change Material
                  </button>
                </div>
              </div>

              {/* STEP 1: CHOOSE VENDOR & SUPPLIER RATE */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                    <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                      1. Choose Certified Supplier Rate
                    </span>
                  </div>
                  <button
                    onClick={() => setIsAddingCustomQuote(true)}
                    className="flex items-center space-x-1 text-[11px] text-[#c1121f] hover:underline font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Custom Vendor</span>
                  </button>
                </div>

                {/* Add Custom Vendor Form if Open */}
                {isAddingCustomQuote && (
                  <div className="bg-[#fdf0d5]/30 border border-[#ecd5a8] rounded-lg p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#003049] text-[11px]">Add Custom Supplier Quotation</span>
                      <button onClick={() => setIsAddingCustomQuote(false)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Supplier Name *"
                        value={customSupplierName}
                        onChange={e => setCustomSupplierName(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder={`Unit Rate ($/${selectedMaterial.unit}) *`}
                        value={customRate || ''}
                        onChange={e => setCustomRate(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Lead Time (Days)"
                        value={customLeadTime}
                        onChange={e => setCustomLeadTime(Number(e.target.value))}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Payment Terms (e.g. Net 30)"
                        value={customPaymentTerms}
                        onChange={e => setCustomPaymentTerms(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCustomQuote}
                        disabled={!customSupplierName || customRate <= 0}
                        className="px-2.5 py-1 bg-[#003049] text-white text-[11px] rounded font-medium disabled:opacity-50"
                      >
                        Apply Vendor Rate
                      </button>
                    </div>
                  </div>
                )}

                {/* Quotes Stack */}
                <div className="space-y-2">
                  {quotes.map(quote => {
                    const isSelected = selectedQuoteId === quote.id;
                    const diffPct =
                      selectedMaterial.retailPrice > 0
                        ? (((quote.unitRate - selectedMaterial.retailPrice) / selectedMaterial.retailPrice) * 100).toFixed(1)
                        : '0';
                    const isCheaper = Number(diffPct) < 0;

                    return (
                      <div
                        key={quote.id}
                        onClick={() => setSelectedQuoteId(quote.id)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#003049]/5 border-[#003049] ring-2 ring-[#003049] shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#003049] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}

                        <div className="flex items-start justify-between pr-5">
                          <div>
                            <h6 className="text-xs font-semibold text-slate-900">{quote.supplierName}</h6>
                            <p className="text-[10px] text-slate-500">
                              {quote.city ? `${quote.city}, ${quote.country}` : 'Certified Vendor'} • {quote.paymentTerms}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-semibold text-[#003049]">
                              ${quote.unitRate.toFixed(2)}
                              <span className="text-[10px] text-slate-400 font-normal">/{selectedMaterial.unit}</span>
                            </div>
                            {Number(diffPct) !== 0 && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-medium inline-block ${
                                  isCheaper ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isCheaper ? `${diffPct}% savings` : `+${diffPct}% premium`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges & Stats */}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5">
                          <span className="bg-[#fdf0d5] text-[#780000] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                            {quote.badge || 'Certified Vendor'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="flex items-center space-x-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>{quote.leadTimeDays}d lead</span>
                            </span>
                            <span className="flex items-center space-x-0.5">
                              <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                              <span>{quote.rating}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: CHOOSE BULK SIZE & VOLUME TIER */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                  <Boxes className="w-3.5 h-3.5 text-[#003049]" />
                  <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                    2. Choose Bulk Size &amp; Volume Discount
                  </span>
                </div>

                {/* Bulk Tier Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {bulkTierOptions.map(tier => {
                    const isTierActive = selectedBulkTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => handleSelectBulkTier(tier)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isTierActive
                            ? 'bg-[#003049] text-white border-[#003049] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">{tier.label}</span>
                          {tier.discountPct > 0 && (
                            <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                              isTierActive ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              -{tier.discountPct}%
                            </span>
                          )}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${isTierActive ? 'text-slate-200' : 'text-slate-500'}`}>
                          {tier.range}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Quantity & Negotiated Discount Controls */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">
                      Required Quantity ({selectedMaterial.unit})
                    </label>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 10))}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs text-slate-700"
                        title="-10 units"
                      >
                        -10
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 text-center font-medium focus:outline-none focus:border-[#003049]"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 10)}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs text-slate-700"
                        title="+10 units"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => q + 50)}
                        className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-xs text-slate-700"
                        title="+50 units"
                      >
                        +50
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">
                      Volume Discount Applied (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customDiscountPct}
                        onChange={e => setCustomDiscountPct(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900 font-medium pr-6 focus:outline-none focus:border-[#003049]"
                      />
                      <Percent className="w-3 h-3 text-slate-400 absolute right-2 top-2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: REVENUES, COSTS & PROFIT ENGINE */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs">
                <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                    3. Manage Revenues, Costs &amp; Profits
                  </span>
                </div>

                {/* Markup & Billable Rate Controls */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-700 font-medium">Target Client Markup (%)</label>
                    <div className="flex items-center space-x-1">
                      {[15, 25, 35, 50, 75].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleMarkupChange(pct)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            markupPct === pct
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          +{pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={markupPct}
                        onChange={e => handleMarkupChange(Number(e.target.value))}
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>0%</span>
                        <span className="font-semibold text-emerald-700">{markupPct}% Markup</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div>
                      <div className="relative">
                        <DollarSign className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                        <input
                          type="number"
                          step={0.01}
                          placeholder="Client Billable Rate"
                          value={customBillableRate !== null ? customBillableRate : calculatedBillableRate}
                          onChange={e => handleBillablePriceChange(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded pl-6 pr-2 py-1 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Client price / {selectedMaterial.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LIVE FINANCIAL SUMMARY DISPLAY */}
                <div className="bg-[#003049] text-white rounded-xl p-3 shadow-md space-y-2">
                  <div className="text-[10px] text-[#fdf0d5] uppercase font-semibold tracking-wider flex items-center justify-between">
                    <span>Live Profitability Breakdown</span>
                    <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      {grossMarginPct}% Margin
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/10">
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-slate-300 block">Total Direct Cost</span>
                      <span className="text-xs font-semibold text-white">
                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        ${netUnitCost.toFixed(2)}/u
                      </span>
                    </div>

                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-[#fdf0d5] block">Projected Revenue</span>
                      <span className="text-xs font-semibold text-[#fdf0d5]">
                        ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-300 block mt-0.5">
                        ${calculatedBillableRate.toFixed(2)}/u
                      </span>
                    </div>

                    <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-lg p-2">
                      <span className="text-[10px] text-emerald-300 block">Gross Profit</span>
                      <span className="text-xs font-bold text-emerald-400">
                        +${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-emerald-200 block mt-0.5">
                        {grossMarginPct}% ROI
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 4: PROJECT PHASE & CONFIRMATION ACTION */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-medium mb-1">Assign to Project Phase</label>
                    <select
                      value={selectedPhaseId}
                      onChange={e => setSelectedPhaseId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    >
                      {phases.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncRevenueWithProject}
                        onChange={e => setSyncRevenueWithProject(e.target.checked)}
                        className="rounded border-slate-300 text-[#003049] focus:ring-[#003049]"
                      />
                      <span>Sync with Project Quoted Revenue</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAndAdd}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#c1121f] hover:bg-[#a10e19] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
                    <span>
                      Insert into Project Plan (${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} Cost / +${grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} Profit)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : tableLayoutMode === 'split' ? (
            /* NO MATERIAL SELECTED BANNER */
            <div className="hidden lg:flex w-5/12 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400 border-l border-slate-200">
              <div className="w-14 h-14 rounded-2xl bg-[#003049]/5 flex items-center justify-center text-[#003049] mb-3">
                <Boxes className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">Select a Material from the Catalog</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Choose any material on the left in either <strong>FXTT Table View</strong> or <strong>Grid View</strong> to compare vendor rates, configure bulk sizes, and calculate project revenues &amp; profit margins in real time.
              </p>
            </div>
          ) : null}
        </div>
      </div>
  );
};
