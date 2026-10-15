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
  Table as TableIcon,
  LayoutGrid,
  TrendingUp,
  ArrowUpDown,
  ChevronRight,
  Clock,
  Minus,
  Maximize2,
  Columns,
  Globe,
  Zap,
  Award,
  FileCheck
} from 'lucide-react';
import { OutsourcedService, ProjectCostItem, ProjectPhase } from '../../types';
import { formatLKR } from '../../utils/currency';

interface ProviderQuoteOption {
  id: string;
  providerName: string;
  location: string;
  rating: number;
  slaLevel: string;
  unitRate: number;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  badge?: string;
  notes?: string;
}

interface QuickInsertOutsourcedModalProps {
  isOpen: boolean;
  onClose: () => void;
  outsourcedServices: OutsourcedService[];
  phases: ProjectPhase[];
  onAddCostItem: (item: ProjectCostItem, syncRevenue?: boolean) => void;
  initialService?: OutsourcedService | null;
}

export const QuickInsertOutsourcedModal: React.FC<QuickInsertOutsourcedModalProps> = ({
  isOpen,
  onClose,
  outsourcedServices,
  phases,
  onAddCostItem,
  initialService
}) => {
  const [selectedService, setSelectedService] = useState<OutsourcedService | null>(initialService || null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [catalogViewMode, setCatalogViewMode] = useState<'fxtt_table' | 'grid'>('fxtt_table');
  const [tableLayoutMode, setTableLayoutMode] = useState<'split' | 'full'>('full');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'rate_asc' | 'rate_desc' | 'sla'>('name');

  // Provider quote selection
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('quote-1');

  // Volume & bulk configuration
  const [volume, setVolume] = useState<number>(100);
  const [selectedVolumeTier, setSelectedVolumeTier] = useState<string>('mid');
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(5);

  // Profit & Revenue configuration
  const [markupPct, setMarkupPct] = useState<number>(30);
  const [customBillableRate, setCustomBillableRate] = useState<number | null>(null);
  const [syncRevenueWithProject, setSyncRevenueWithProject] = useState<boolean>(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(phases[0]?.id || 'phase-01');

  // Add custom provider quote inline
  const [isAddingCustomQuote, setIsAddingCustomQuote] = useState(false);
  const [customProviderName, setCustomProviderName] = useState('');
  const [customLocation, setCustomLocation] = useState('Houston Port Authority');
  const [customRate, setCustomRate] = useState<number>(250);
  const [customSla, setCustomSla] = useState('Mission Critical 24/7 SLA');
  const [customQuotesList, setCustomQuotesList] = useState<ProviderQuoteOption[]>([]);

  // Create custom service spec
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [newServiceCode, setNewServiceCode] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState('Heavy Transportation & Logistics');
  const [newServiceUnit, setNewServiceUnit] = useState('km');
  const [newServiceRate, setNewServiceRate] = useState<number>(45);
  const [newServiceProvider, setNewServiceProvider] = useState('National Intermodal Freight & Rail');
  const [newServiceSla, setNewServiceSla] = useState('Premium 99.9%');

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    outsourcedServices.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [outsourcedServices]);

  // Filtered & sorted outsourced services
  const filteredServices = useMemo(() => {
    return outsourcedServices
      .filter(s => {
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const name = s.name || '';
        const code = s.code || '';
        const provider = s.providerName || '';
        const sla = s.slaLevel || '';
        const subCat = s.subCategory || '';

        const matchesSearch =
          !search ||
          name.toLowerCase().includes(search.toLowerCase()) ||
          code.toLowerCase().includes(search.toLowerCase()) ||
          provider.toLowerCase().includes(search.toLowerCase()) ||
          sla.toLowerCase().includes(search.toLowerCase()) ||
          subCat.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const rateA = a.rate ?? 0;
        const rateB = b.rate ?? 0;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
        if (sortBy === 'rate_asc') return rateA - rateB;
        if (sortBy === 'rate_desc') return rateB - rateA;
        if (sortBy === 'sla') return (a.slaLevel || '').localeCompare(b.slaLevel || '');
        return 0;
      });
  }, [outsourcedServices, selectedCategory, search, sortBy]);

  // Dynamic provider quote options for selected service
  const quotes: ProviderQuoteOption[] = useMemo(() => {
    if (!selectedService) return [];

    const baseRate = selectedService.rate ?? 50;
    const provider = selectedService.providerName || 'Certified Prime Logistics Carrier';

    const list: ProviderQuoteOption[] = [
      {
        id: 'quote-1',
        providerName: provider,
        location: 'National Industrial Network',
        rating: 4.9,
        slaLevel: selectedService.slaLevel || 'Mission Critical 24/7',
        unitRate: baseRate,
        currency: 'LKR',
        leadTimeDays: 3,
        paymentTerms: 'Net 30 Commercial',
        badge: 'Primary Certified Provider',
        notes: 'Guaranteed scheduled transport with active GPS telematics & temperature escrow.'
      },
      {
        id: 'quote-2',
        providerName: 'Consolidated Logistics & Utility Alliance',
        location: 'Regional Terminal Hub',
        rating: 4.7,
        slaLevel: 'Standard SLA (3-Day Transit)',
        unitRate: Number((baseRate * 0.90).toFixed(2)), // 10% cheaper
        currency: 'LKR',
        leadTimeDays: 6,
        paymentTerms: 'Net 45 Enterprise',
        badge: 'Volume Fleet Tariff (-10%)',
        notes: 'High-volume consolidated freight tariff for scheduled industrial batch runs.'
      },
      {
        id: 'quote-3',
        providerName: 'Apex Rush Intermodal Logistics',
        location: 'Rapid Hub Express',
        rating: 4.95,
        slaLevel: 'Mission Critical 24/7 (Priority Dispatch)',
        unitRate: Number((baseRate * 1.15).toFixed(2)), // 15% premium
        currency: 'LKR',
        leadTimeDays: 1,
        paymentTerms: 'Net 15 / Direct Debit',
        badge: 'Fast-Track 24/7 Priority (+15%)',
        notes: 'Dedicated chartered escort vehicles, priority terminal passage, and 24/7 dispatch.'
      },
      {
        id: 'quote-4',
        providerName: 'State Regulatory Escrow & Infrastructure Agency',
        location: 'National Infrastructure Registry',
        rating: 4.8,
        slaLevel: 'Regulatory Certified Compliance',
        unitRate: Number((baseRate * 0.94).toFixed(2)), // 6% discount
        currency: 'LKR',
        leadTimeDays: 10,
        paymentTerms: 'Government Escrow Net 60',
        badge: 'Government Escrow (-6%)',
        notes: 'Official state agency accredited certification, certified test bench report included.'
      }
    ];

    return [...list, ...customQuotesList];
  }, [selectedService, customQuotesList]);

  const selectedQuote = useMemo(() => {
    return quotes.find(q => q.id === selectedQuoteId) || quotes[0];
  }, [quotes, selectedQuoteId]);

  // Volume Presets
  const volumeTierOptions = [
    { id: 'low', label: 'Pilot / Batch', range: '25 - 50 units', defaultVolume: 25, discountPct: 0, desc: 'Initial trial or spot requirement' },
    { id: 'mid', label: 'Standard Run', range: '100 units', defaultVolume: 100, discountPct: 5, desc: 'Standard project milestone run' },
    { id: 'high', label: 'Volume Fleet', range: '500 units', defaultVolume: 500, discountPct: 10, desc: 'Full batch transportation / utility load' },
    { id: 'enterprise', label: 'Enterprise Contract', range: '1,500+ units', defaultVolume: 1500, discountPct: 18, desc: 'Annual multi-site infrastructure contract' }
  ];

  const handleSelectVolumeTier = (tier: typeof volumeTierOptions[0]) => {
    setSelectedVolumeTier(tier.id);
    setVolume(tier.defaultVolume);
    setCustomDiscountPct(tier.discountPct);
  };

  // Cost & Profit Calculations
  const providerBaseRate = selectedQuote?.unitRate || (selectedService?.rate ?? 50);
  const effectiveDiscountRate = (customDiscountPct || 0) / 100;
  const netUnitCost = Number((providerBaseRate * (1 - effectiveDiscountRate)).toFixed(2));
  const totalCost = Number((netUnitCost * volume).toFixed(2));

  // Billable Revenue calculations
  const calculatedBillableRate = useMemo(() => {
    if (customBillableRate !== null && customBillableRate > 0) {
      return customBillableRate;
    }
    return Number((netUnitCost * (1 + markupPct / 100)).toFixed(2));
  }, [customBillableRate, netUnitCost, markupPct]);

  const totalRevenue = Number((calculatedBillableRate * volume).toFixed(2));
  const grossProfit = Number((totalRevenue - totalCost).toFixed(2));
  const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

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

  const handleSaveCustomQuote = () => {
    if (!customProviderName || customRate <= 0) return;
    const newQuote: ProviderQuoteOption = {
      id: `custom-provider-${Date.now()}`,
      providerName: customProviderName,
      location: customLocation || 'Direct Carrier Hub',
      rating: 5.0,
      slaLevel: customSla,
      unitRate: customRate,
      currency: 'LKR',
      leadTimeDays: 2,
      paymentTerms: 'Direct Carrier Agreement',
      badge: 'Direct Carrier Quote',
      notes: 'Direct carrier or utility quote entered manually by procurement.'
    };
    setCustomQuotesList(prev => [...prev, newQuote]);
    setSelectedQuoteId(newQuote.id);
    setIsAddingCustomQuote(false);
    setCustomProviderName('');
  };

  const handleCreateService = () => {
    if (!newServiceName) return;
    const created: OutsourcedService = {
      id: `out-custom-${Date.now()}`,
      code: newServiceCode || `OUT-CUS-${Date.now().toString().slice(-4)}`,
      name: newServiceName,
      providerId: `prov-${Date.now()}`,
      providerName: newServiceProvider || 'Direct Utility / Escrow Firm',
      category: newServiceCategory,
      subCategory: 'Custom Logistics & Utility',
      baseUnitType: newServiceUnit,
      rate: newServiceRate,
      retailPrice: Number((newServiceRate * 1.3).toFixed(2)),
      tierRates: [],
      slaLevel: newServiceSla || 'Premium 99.9%',
      priceHistory: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setSelectedService(created);
    setTableLayoutMode('split');
    setIsCreatingService(false);
  };

  const handleConfirmAndAdd = () => {
    if (!selectedService) return;

    const unitLabel = selectedService.baseUnitType.replace('per_', '');
    const providerTitle = selectedQuote?.providerName || selectedService.providerName;

    const newItem: ProjectCostItem = {
      id: `out-cost-${Date.now()}`,
      phaseId: selectedPhaseId,
      type: 'outsourced',
      itemId: selectedService.id,
      name: `${selectedService.name} (${selectedQuote?.slaLevel || selectedService.slaLevel})`,
      category: selectedService.category || 'Outsourced Services',
      supplierOrProvider: providerTitle,
      quantity: volume,
      unit: unitLabel,
      unitCost: netUnitCost,
      billableRate: calculatedBillableRate,
      markupPct,
      discountPct: customDiscountPct,
      totalCost,
      totalRevenue: syncRevenueWithProject ? totalRevenue : undefined,
      selectedOptionIndex: 0,
      alternativeOptions: quotes
        .filter(q => q.id !== selectedQuote.id)
        .map(q => ({
          provider: q.providerName,
          unitCost: q.unitRate,
          savingsDiff: Number(((q.unitRate - selectedQuote.unitRate) * volume).toFixed(2)),
          notes: q.notes || `${q.leadTimeDays}d lead time (${q.paymentTerms})`
        })),
      bulkTierLabel: volumeTierOptions.find(t => t.id === selectedVolumeTier)?.label
    };

    onAddCostItem(newItem, syncRevenueWithProject);
    onClose();
  };

  // 1-Click Direct Quick Insert for Full-Screen Table View
  const handleQuickInsertDirectly = (srv: OutsourcedService) => {
    const rateVal = srv.rate || 150;
    const unitLabel = srv.baseUnitType ? srv.baseUnitType.replace('per_', '') : 'unit';
    const srvName = srv.name || 'Outsourced Utility Service';
    const newItem: ProjectCostItem = {
      id: `cost-out-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      phaseId: selectedPhaseId || phases[0]?.id || 'phase-01',
      type: 'outsourced',
      itemId: srv.id,
      name: `${srvName} [${srv.providerName || 'Certified External Partner'}]`,
      category: srv.category || 'Outsourced Logistics & Services',
      supplierOrProvider: srv.providerName || 'Certified External Partner',
      quantity: 1,
      unit: unitLabel,
      unitCost: rateVal,
      discountPct: 0,
      totalCost: rateVal,
      selectedOptionIndex: 0,
      billableRate: Number((rateVal * 1.30).toFixed(2)),
      totalRevenue: Number((rateVal * 1.30).toFixed(2)),
      grossProfit: Number((rateVal * 0.30).toFixed(2)),
      markupPct: 30
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
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Outsourced Services</h3>
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

          {/* Create Service */}
          <button
            onClick={() => setIsCreatingService(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Service</span>
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
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-2xl scrollbar-thin">
          {categories.map(cat => {
            const count =
              cat === 'All'
                ? outsourcedServices.length
                : outsourcedServices.filter(s => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#003049] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">Sort:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#003049]"
          >
            <option value="name">Service Name (A-Z)</option>
            <option value="code">Service Code</option>
            <option value="rate_asc">Tariff: Low to High</option>
            <option value="rate_desc">Tariff: High to Low</option>
            <option value="sla">SLA Level</option>
          </select>
        </div>
      </div>

      {/* MAIN BODY: SPLIT VIEW LAYOUT */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT PANE: OUTSOURCED SERVICES CATALOG (FXTT TABLE OR GRID) */}
        <div
          className={`flex flex-col h-full overflow-hidden transition-all ${
            selectedService && tableLayoutMode === 'split'
              ? 'w-full lg:w-7/12 2xl:w-3/5 border-b lg:border-b-0 lg:border-r border-slate-200'
              : 'w-full'
          }`}
        >
          {/* Catalog Info Strip */}
          <div className="bg-white px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-800">{filteredServices.length}</span>
              <span>outsourced services &amp; utilities matched</span>
              {selectedCategory !== 'All' && (
                <span className="text-[11px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                  {selectedCategory}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 italic">
              {selectedService ? 'Click another service to switch' : 'Select a service to compare certified utility tariffs, volume tiers & calculate margin'}
            </span>
          </div>

          {/* Create Service Modal Sub-screen */}
          {isCreatingService && (
            <div className="m-3 p-4 bg-[#fdf0d5]/40 border border-[#ecd5a8] rounded-xl space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-[#ecd5a8] pb-2">
                <h4 className="text-xs font-semibold text-[#003049] flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#c1121f]" />
                  <span>Create Custom Outsourced Service / Utility Tariff Specification</span>
                </h4>
                <button onClick={() => setIsCreatingService(false)} className="text-xs text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Service Code</label>
                  <input
                    type="text"
                    placeholder="e.g. OUT-LOG-05A"
                    value={newServiceCode}
                    onChange={e => setNewServiceCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Specialized Oversize Flatbed Transport &amp; Police Escort"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newServiceCategory}
                    onChange={e => setNewServiceCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Base Unit (e.g. km, kwh, month)</label>
                  <input
                    type="text"
                    value={newServiceUnit}
                    onChange={e => setNewServiceUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Base Tariff / Rate ($) *</label>
                  <input
                    type="number"
                    value={newServiceRate}
                    onChange={e => setNewServiceRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Primary Carrier / Agency Firm</label>
                  <input
                    type="text"
                    value={newServiceProvider}
                    onChange={e => setNewServiceProvider(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">SLA Agreement Level</label>
                  <input
                    type="text"
                    value={newServiceSla}
                    onChange={e => setNewServiceSla(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCreateService}
                  className="px-4 py-1.5 bg-[#003049] text-white text-xs font-semibold rounded-lg hover:bg-[#002235] transition-colors"
                >
                  Save &amp; Compare Tariffs &rarr;
                </button>
              </div>
            </div>
          )}

          {/* VIEW MODE 1: FXTT TABLE LIST VIEW */}
          {catalogViewMode === 'fxtt_table' ? (
            <div className="flex-1 overflow-y-auto overflow-x-auto w-full">
              <table className="w-full min-w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px] sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">Service Code</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Outsourced Service Specification</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Unit</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Base Tariff</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Provider / Escrow Agency</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">SLA Level</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Truck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No outsourced services match your search criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try changing category or clearing your query</p>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map(s => {
                      const isCurrent = selectedService?.id === s.id;
                      const unitLabel = s.baseUnitType ? s.baseUnitType.replace('per_', '') : 'unit';
                      const codeVal = s.code || `OUT-${s.id.slice(-4).toUpperCase()}`;

                      return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedService(s);
                            setTableLayoutMode('split');
                          }}
                          className={`cursor-pointer transition-colors group ${
                            isCurrent
                              ? 'bg-[#003049]/10 font-medium'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-[#003049]/40">
                              {codeVal}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900 group-hover:text-[#003049]">
                              {s.name}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {s.subCategory || 'Accredited External Service'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {s.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[10px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                              /{unitLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-semibold text-[#003049]">
                              {formatLKR(s.rate)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">/{unitLabel}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-800 flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{s.providerName || 'Certified Carrier'}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700">4 Certified Tariffs</span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                            <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                              {s.slaLevel || 'Standard SLA'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleQuickInsertDirectly(s);
                                }}
                                className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                                title="Quick Insert 1 operation directly into phase"
                              >
                                <span>⚡ Quick Insert</span>
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedService(s);
                                  setTableLayoutMode('split');
                                }}
                                className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                                  isCurrent
                                    ? 'bg-[#003049] text-white'
                                    : 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] hover:bg-[#ecd5a8]'
                                }`}
                                title="Configure provider tariffs & volume"
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
              <div className={`grid gap-3 ${selectedService ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filteredServices.map(s => {
                  const isCurrent = selectedService?.id === s.id;
                  const unitLabel = s.baseUnitType ? s.baseUnitType.replace('per_', '') : 'unit';
                  const codeVal = s.code || `OUT-${s.id.slice(-4).toUpperCase()}`;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedService(s);
                        setTableLayoutMode('split');
                      }}
                      className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${
                        isCurrent
                          ? 'border-[#003049] bg-[#003049]/5 ring-2 ring-[#003049]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-mono bg-slate-100 px-1 rounded">{codeVal}</span>
                          <span className="bg-[#fdf0d5] text-[#003049] px-1.5 py-0.2 rounded font-medium">{unitLabel}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-[#003049] line-clamp-2">
                          {s.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {s.providerName || 'Certified Prime Logistics'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[#003049]">
                            ${s.rate.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal">/{unitLabel}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 flex items-center space-x-1">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>{s.slaLevel || 'Standard SLA'}</span>
                          </span>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-1 rounded ${
                          isCurrent ? 'bg-[#003049] text-white' : 'bg-slate-100 text-slate-700'
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
          {tableLayoutMode === 'full' && selectedService && (
            <div className="bg-[#003049] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-[#002235] shadow-lg">
              <div className="flex items-center space-x-3 flex-wrap">
                <span className="font-mono text-xs text-[#fdf0d5] bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {selectedService.code || 'OUT-SPEC'}
                </span>
                <span className="text-xs font-semibold">{selectedService.name}</span>
                <span className="text-xs text-slate-300">
                  Base: {formatLKR(selectedService.rate)}/{selectedService.baseUnitType.replace('per_', '')}
                </span>
                <span className="text-xs text-emerald-400 font-medium">4 Certified Tariffs Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickInsertDirectly(selectedService)}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>⚡ Quick Insert Service ({formatLKR(selectedService.rate)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableLayoutMode('split')}
                  className="px-3 py-1.5 bg-[#fdf0d5] hover:bg-[#ecd5a8] text-[#003049] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Open Multi-Provider &amp; Profit Engine &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: PROVIDER SELECTION, VOLUME, REVENUE & PROFIT ENGINE */}
        {selectedService && tableLayoutMode === 'split' ? (
          <div className="w-full lg:w-5/12 2xl:w-2/5 flex flex-col h-full overflow-y-auto bg-slate-50/70 p-4 space-y-4 shrink-0">
            {/* SERVICE SUMMARY HEADER CARD */}
            <div className="bg-[#fdf0d5]/60 border border-[#ecd5a8] rounded-xl p-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-600">
                    <span className="font-mono text-[#003049] font-semibold uppercase">{selectedService.code || 'OUT-SPEC'}</span>
                    <span>•</span>
                    <span>{selectedService.category}</span>
                    <span>•</span>
                    <span className="bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-300 font-medium">
                      SLA: {selectedService.slaLevel}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#003049] mt-1">{selectedService.name}</h4>
                </div>
                <button
                  onClick={() => setSelectedService(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline whitespace-nowrap"
                >
                  Change Service
                </button>
              </div>
            </div>

            {/* STEP 1: CHOOSE CERTIFIED PROVIDER TARIFF */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                  <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                    1. Choose Certified Provider Tariff
                  </span>
                </div>
                <button
                  onClick={() => setIsAddingCustomQuote(true)}
                  className="text-[11px] text-[#003049] hover:underline flex items-center space-x-1 font-medium"
                >
                  <Plus className="w-3 h-3 text-[#c1121f]" />
                  <span>+ Custom Carrier</span>
                </button>
              </div>

              {/* Add custom quote inline */}
              {isAddingCustomQuote && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Add Direct Carrier / Escrow Tariff</span>
                    <button onClick={() => setIsAddingCustomQuote(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600">Carrier / Provider Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Heavy Intermodal Logistics"
                        value={customProviderName}
                        onChange={e => setCustomProviderName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600">Rate ($/{selectedService.baseUnitType.replace('per_', '')})</label>
                      <input
                        type="number"
                        value={customRate}
                        onChange={e => setCustomRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-600">SLA / Transit Agreement</label>
                      <input
                        type="text"
                        value={customSla}
                        onChange={e => setCustomSla(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCustomQuote}
                    className="w-full py-1 bg-[#003049] text-white text-xs rounded font-medium hover:bg-[#002235]"
                  >
                    Save &amp; Select Provider Tariff
                  </button>
                </div>
              )}

              {/* Quotes List */}
              <div className="space-y-2">
                {quotes.map(q => {
                  const isSelected = q.id === selectedQuoteId;
                  const isLowest = q.badge?.includes('Tariff (-10%)') || q.badge?.includes('Escrow');
                  const isRush = q.badge?.includes('Fast-Track') || q.badge?.includes('Priority');
                  const unitLabel = selectedService.baseUnitType.replace('per_', '');

                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuoteId(q.id)}
                      className={`border rounded-xl p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#003049] bg-[#003049]/5 shadow-xs ring-1 ring-[#003049]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2">
                          <input
                            type="radio"
                            name="provider_quote"
                            checked={isSelected}
                            onChange={() => setSelectedQuoteId(q.id)}
                            className="mt-0.5 text-[#003049] focus:ring-[#003049]"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-xs text-slate-900">{q.providerName}</span>
                              {q.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                                    isLowest
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isRush
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-[#fdf0d5] text-[#003049]'
                                  }`}
                                >
                                  {q.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                              <span>{q.location}</span>
                              <span>•</span>
                              <span className="flex items-center text-amber-700">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 mr-0.5" />
                                {q.rating}
                              </span>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">Terms: {q.paymentTerms}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-[#003049]">
                            ${q.unitRate.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal">/{unitLabel}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">Lead: {q.leadTimeDays}d setup</span>
                        </div>
                      </div>

                      {isSelected && q.notes && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center justify-between">
                          <span>{q.notes}</span>
                          <span className="text-blue-700 font-medium ml-2 shrink-0">{q.slaLevel}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: CHOOSE VOLUME & BULK DISCOUNT */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs">
              <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#003049]" />
                <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                  2. Choose Volume ({selectedService.baseUnitType.replace('per_', '')}) &amp; Bulk Discount
                </span>
              </div>

              {/* Volume Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {volumeTierOptions.map(tier => {
                  const isSelected = selectedVolumeTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleSelectVolumeTier(tier)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-800">{tier.label}</span>
                        {tier.discountPct > 0 && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                            -{tier.discountPct}%
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-[#003049] mt-0.5">{tier.range}</div>
                    </button>
                  );
                })}
              </div>

              {/* Volume Stepper & Custom Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-medium text-xs mb-1">
                    Project Volume Quantity ({selectedService.baseUnitType.replace('per_', '')})
                  </label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setVolume(Math.max(1, volume - 25))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border-r border-slate-300"
                    >
                      -25
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolume(Math.max(1, volume - 5))}
                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border-r border-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={volume}
                      onChange={e => setVolume(Math.max(1, Number(e.target.value)))}
                      className="w-full text-center py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVolume(volume + 5)}
                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border-l border-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVolume(volume + 25)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border-l border-slate-300"
                    >
                      +25
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-medium text-xs">Volume Discount</label>
                    <span className="text-xs font-semibold text-emerald-700">{customDiscountPct}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={customDiscountPct}
                      onChange={e => setCustomDiscountPct(Number(e.target.value))}
                      className="w-full accent-[#003049]"
                    />
                    <span className="text-xs text-slate-500 w-10 text-right">{customDiscountPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: PROFIT & REVENUE CONFIGURATION */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#003049]" />
                  <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                    3. Project Phase &amp; Profit Margin Engine
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Live Bid Calculation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Assign to Project Phase</label>
                  <select
                    value={selectedPhaseId}
                    onChange={e => setSelectedPhaseId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#003049]"
                  >
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-medium">Target Markup %</label>
                    <span className="font-semibold text-[#003049]">{markupPct}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={markupPct}
                      onChange={e => handleMarkupChange(Number(e.target.value))}
                      className="w-full accent-[#003049]"
                    />
                    <input
                      type="number"
                      value={markupPct}
                      onChange={e => handleMarkupChange(Number(e.target.value))}
                      className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-right font-medium"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-1 border-t border-slate-100 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      Direct Provider Tariff Cost
                    </label>
                    <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-sm">
                      ${netUnitCost.toFixed(2)}
                      <span className="text-[10px] text-slate-500 font-normal"> /{selectedService.baseUnitType.replace('per_', '')}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-medium">Client Billable Rate</label>
                      <span className="text-[10px] text-[#003049] font-medium">Quoted To Client</span>
                    </div>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="number"
                        step="0.5"
                        value={calculatedBillableRate}
                        onChange={e => handleBillablePriceChange(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-xs font-bold text-[#003049] focus:outline-none focus:border-[#003049]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center pt-1 sm:col-span-2">
                  <label className="flex items-center space-x-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncRevenueWithProject}
                      onChange={e => setSyncRevenueWithProject(e.target.checked)}
                      className="rounded border-slate-300 text-[#003049] focus:ring-[#003049]"
                    />
                    <span>Sync Client Billable Total with Project Plan Revenue</span>
                  </label>
                </div>
              </div>
            </div>

            {/* STEP 4: LIVE FINANCIAL SUMMARY CARD */}
            <div className="bg-[#003049] text-white rounded-xl p-3.5 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-semibold text-[#fdf0d5] uppercase tracking-wider">
                  Live Project Financial Impact
                </span>
                <span className="text-[11px] text-slate-300 font-mono">
                  {volume} {selectedService.baseUnitType.replace('per_', '')} × ${netUnitCost.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300">Total Service Cost</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300">Client Revenue</div>
                  <div className="text-sm font-bold text-[#fdf0d5] mt-0.5">
                    ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="text-[10px] text-emerald-300">Projected Profit</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    +${grossProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="text-[10px] text-emerald-300">Margin %</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">
                    {grossMarginPct}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs rounded-lg font-medium transition-colors"
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
          /* NO SERVICE SELECTED BANNER */
          <div className="hidden lg:flex w-5/12 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400 border-l border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-[#003049]/5 flex items-center justify-center text-[#003049] mb-3">
              <Truck className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Select an Outsourced Service from the Catalog</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Choose any logistics or outsourced utility service on the left in either <strong>FXTT Table View</strong> or <strong>Grid View</strong> to compare provider tariffs, configure volume runs, and calculate live profit margins in real time.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
