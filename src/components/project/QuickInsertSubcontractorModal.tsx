import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Building2,
  DollarSign,
  Wrench,
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
  Clock,
  ArrowUpRight,
  Minus,
  RefreshCw,
  Maximize2,
  Columns,
  UserCheck,
  Award
} from 'lucide-react';
import { SubcontractorRateItem, ProjectCostItem, ProjectPhase } from '../../types';
import { formatLKR } from '../../utils/currency';

interface ContractorQuoteOption {
  id: string;
  contractorName: string;
  city: string;
  rating: number;
  certifications: string[];
  hourlyRate: number;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  badge?: string;
  notes?: string;
  skillBadge?: string;
}

interface QuickInsertSubcontractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subcontractors: SubcontractorRateItem[];
  phases: ProjectPhase[];
  onAddCostItem: (item: ProjectCostItem, syncRevenue?: boolean) => void;
  initialSubcontractor?: SubcontractorRateItem | null;
}

export const QuickInsertSubcontractorModal: React.FC<QuickInsertSubcontractorModalProps> = ({
  isOpen,
  onClose,
  subcontractors,
  phases,
  onAddCostItem,
  initialSubcontractor
}) => {
  const [selectedSub, setSelectedSub] = useState<SubcontractorRateItem | null>(initialSubcontractor || null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [catalogViewMode, setCatalogViewMode] = useState<'fxtt_table' | 'grid'>('fxtt_table');
  const [tableLayoutMode, setTableLayoutMode] = useState<'split' | 'full'>('full');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'rate_asc' | 'rate_desc' | 'skill'>('name');

  // Contractor quote selection
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('quote-1');

  // Hours & bulk shift configuration
  const [hours, setHours] = useState<number>(40);
  const [selectedShiftTier, setSelectedShiftTier] = useState<string>('week');
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(5);

  // Profit & Revenue configuration
  const [markupPct, setMarkupPct] = useState<number>(35);
  const [customBillableRate, setCustomBillableRate] = useState<number | null>(null);
  const [syncRevenueWithProject, setSyncRevenueWithProject] = useState<boolean>(true);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(phases[1]?.id || phases[0]?.id || 'phase-02');

  // Add custom contractor quote modal
  const [isAddingCustomQuote, setIsAddingCustomQuote] = useState(false);
  const [customContractorName, setCustomContractorName] = useState('');
  const [customContractorCity, setCustomContractorCity] = useState('Chicago, IL');
  const [customRate, setCustomRate] = useState<number>(115);
  const [customSkill, setCustomSkill] = useState('Master Journeyman Fabricator');
  const [customQuotesList, setCustomQuotesList] = useState<ContractorQuoteOption[]>([]);

  // Create custom trade spec
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const [newTradeCode, setNewTradeCode] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeCategory, setNewTradeCategory] = useState('Heavy Structural Fabrication');
  const [newTradeUnit, setNewTradeUnit] = useState('hours');
  const [newTradeRate, setNewTradeRate] = useState<number>(125);
  const [newTradeContractor, setNewTradeContractor] = useState('Titan Precision Fabrication Group');
  const [newTradeSkill, setNewTradeSkill] = useState('ASME Section IX Welder');

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    subcontractors.forEach(s => {
      const cat = s.category || s.serviceCategory;
      if (cat) set.add(cat);
    });
    return ['All', ...Array.from(set)];
  }, [subcontractors]);

  // Filtered & sorted subcontractor list
  const filteredSubcontractors = useMemo(() => {
    return subcontractors
      .filter(s => {
        const matchesCategory =
          selectedCategory === 'All' ||
          (s.category && s.category === selectedCategory) ||
          (s.serviceCategory && s.serviceCategory === selectedCategory);

        const name = s.name || s.serviceType || '';
        const code = s.code || '';
        const provider = s.subcontractorName || '';
        const skill = s.skillLevel || '';
        const subCat = s.serviceSubCategory || s.subCategory || '';

        const matchesSearch =
          !search ||
          name.toLowerCase().includes(search.toLowerCase()) ||
          code.toLowerCase().includes(search.toLowerCase()) ||
          provider.toLowerCase().includes(search.toLowerCase()) ||
          skill.toLowerCase().includes(search.toLowerCase()) ||
          subCat.toLowerCase().includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const rateA = a.baseRate ?? a.rate ?? 0;
        const rateB = b.baseRate ?? b.rate ?? 0;
        const nameA = a.name || a.serviceType || '';
        const nameB = b.name || b.serviceType || '';
        const codeA = a.code || '';
        const codeB = b.code || '';

        if (sortBy === 'name') return nameA.localeCompare(nameB);
        if (sortBy === 'code') return codeA.localeCompare(codeB);
        if (sortBy === 'rate_asc') return rateA - rateB;
        if (sortBy === 'rate_desc') return rateB - rateA;
        if (sortBy === 'skill') return (a.skillLevel || '').localeCompare(b.skillLevel || '');
        return 0;
      });
  }, [subcontractors, selectedCategory, search, sortBy]);

  // Dynamic contractor quote options for selected trade
  const quotes: ContractorQuoteOption[] = useMemo(() => {
    if (!selectedSub) return [];

    const baseRate = selectedSub.baseRate ?? selectedSub.rate ?? 110;
    const firm = selectedSub.subcontractorName || 'Titan Certified Heavy Fabrication';

    const list: ContractorQuoteOption[] = [
      {
        id: 'quote-1',
        contractorName: firm,
        city: 'Houston, TX',
        rating: 4.9,
        certifications: ['ISO 9001:2015', 'ASME Section IX', 'OSHA 30 Certified'],
        hourlyRate: baseRate,
        currency: 'LKR',
        leadTimeDays: 2,
        paymentTerms: 'Net 30 Progress',
        badge: 'Primary Certified Firm',
        skillBadge: selectedSub.skillLevel || 'Senior Master Specialist',
        notes: 'Dedicated project union crew with full safety escrow and tool transport.'
      },
      {
        id: 'quote-2',
        contractorName: 'Continental Guild & Union Tradesmen',
        city: 'Cleveland, OH',
        rating: 4.8,
        certifications: ['AISC Certified Fabricator', 'AWS D1.1 Structural'],
        hourlyRate: Number((baseRate * 0.92).toFixed(2)), // 8% cheaper
        currency: 'LKR',
        leadTimeDays: 5,
        paymentTerms: 'Net 45 Commercial',
        badge: 'Lowest Rate Guarantee (-8%)',
        skillBadge: 'Journeyman Trades Guild',
        notes: 'Verified competitive rate for high-volume shift mobilization.'
      },
      {
        id: 'quote-3',
        contractorName: 'RapidResponse 24/7 Industrial Trades Fleet',
        city: 'Detroit, MI',
        rating: 4.95,
        certifications: ['Emergency Dispatch SLA', 'ISO 45001 Safety'],
        hourlyRate: Number((baseRate * 1.12).toFixed(2)), // 12% premium
        currency: 'LKR',
        leadTimeDays: 1,
        paymentTerms: 'Net 15 / Advance 30%',
        badge: 'Fast-Track 24/7 Weekend Crew (+12%)',
        skillBadge: 'Emergency Specialized Crew',
        notes: 'Guaranteed 24-hour crew mobilization for accelerated turnarounds.'
      },
      {
        id: 'quote-4',
        contractorName: 'Allied Engineering & Escrow Contractors',
        city: 'Denver, CO',
        rating: 4.6,
        certifications: ['ASME Boiler Code', 'API 650 Certified'],
        hourlyRate: Number((baseRate * 0.95).toFixed(2)), // 5% cheaper
        currency: 'LKR',
        leadTimeDays: 7,
        paymentTerms: 'Milestone Escrow Net 60',
        badge: 'Long-Term Escrow (-5%)',
        skillBadge: 'Certified Journeyman',
        notes: 'Escrow-managed billing tied to FAT / SAT project inspection releases.'
      }
    ];

    return [...list, ...customQuotesList];
  }, [selectedSub, customQuotesList]);

  const selectedQuote = useMemo(() => {
    return quotes.find(q => q.id === selectedQuoteId) || quotes[0];
  }, [quotes, selectedQuoteId]);

  // Shift & Hours Presets
  const shiftTierOptions = [
    { id: 'sprint', label: 'Short Sprint', range: '8 - 24 hrs', defaultHours: 16, discountPct: 0, desc: 'Single shift emergency task' },
    { id: 'week', label: 'Full Workweek', range: '40 hrs', defaultHours: 40, discountPct: 5, desc: 'Standard 40-hr crew allocation' },
    { id: 'multiweek', label: 'Multi-Week Crew', range: '80 - 160 hrs', defaultHours: 120, discountPct: 8, desc: 'Multi-week continuous project shift' },
    { id: 'master', label: 'Master Agreement', range: '200+ hrs', defaultHours: 240, discountPct: 15, desc: 'Enterprise contractor bulk agreement' }
  ];

  const handleSelectShiftTier = (tier: typeof shiftTierOptions[0]) => {
    setSelectedShiftTier(tier.id);
    setHours(tier.defaultHours);
    setCustomDiscountPct(tier.discountPct);
  };

  // Cost & Profit Calculations
  const contractorBaseRate = selectedQuote?.hourlyRate || (selectedSub?.baseRate ?? selectedSub?.rate ?? 100);
  const effectiveDiscountRate = (customDiscountPct || 0) / 100;
  const netHourlyCost = Number((contractorBaseRate * (1 - effectiveDiscountRate)).toFixed(2));
  const totalCost = Number((netHourlyCost * hours).toFixed(2));

  // Billable Revenue calculations
  const calculatedBillableRate = useMemo(() => {
    if (customBillableRate !== null && customBillableRate > 0) {
      return customBillableRate;
    }
    return Number((netHourlyCost * (1 + markupPct / 100)).toFixed(2));
  }, [customBillableRate, netHourlyCost, markupPct]);

  const totalRevenue = Number((calculatedBillableRate * hours).toFixed(2));
  const grossProfit = Number((totalRevenue - totalCost).toFixed(2));
  const grossMarginPct = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const handleBillablePriceChange = (val: number) => {
    setCustomBillableRate(val);
    if (netHourlyCost > 0) {
      const derivedMarkup = ((val - netHourlyCost) / netHourlyCost) * 100;
      setMarkupPct(Number(Math.max(0, derivedMarkup).toFixed(1)));
    }
  };

  const handleMarkupChange = (val: number) => {
    setMarkupPct(val);
    setCustomBillableRate(null);
  };

  const handleSaveCustomQuote = () => {
    if (!customContractorName || customRate <= 0) return;
    const newQuote: ContractorQuoteOption = {
      id: `custom-quote-${Date.now()}`,
      contractorName: customContractorName,
      city: customContractorCity || 'Direct Contractor',
      rating: 5.0,
      certifications: ['Verified Direct Contractor'],
      hourlyRate: customRate,
      currency: 'LKR',
      leadTimeDays: 2,
      paymentTerms: 'Direct Agreement',
      badge: 'Custom Trade Quote',
      skillBadge: customSkill,
      notes: 'Direct agreement entered manually by project cost manager.'
    };
    setCustomQuotesList(prev => [...prev, newQuote]);
    setSelectedQuoteId(newQuote.id);
    setIsAddingCustomQuote(false);
    setCustomContractorName('');
  };

  const handleCreateTrade = () => {
    if (!newTradeName) return;
    const created: SubcontractorRateItem = {
      id: `sub-custom-${Date.now()}`,
      code: newTradeCode || `SUB-CUS-${Date.now().toString().slice(-4)}`,
      name: newTradeName,
      subcontractorId: `sub-firm-${Date.now()}`,
      subcontractorName: newTradeContractor || 'Direct Industrial Subcontractor',
      serviceType: newTradeName,
      category: newTradeCategory,
      serviceCategory: newTradeCategory,
      serviceSubCategory: 'Custom Engineering Trade',
      unit: newTradeUnit || 'hours',
      baseRate: newTradeRate,
      rate: newTradeRate,
      skillLevel: newTradeSkill || 'Master Craftsman',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setSelectedSub(created);
    setTableLayoutMode('split');
    setIsCreatingTrade(false);
  };

  const handleConfirmAndAdd = () => {
    if (!selectedSub) return;

    const tradeName = selectedSub.name || selectedSub.serviceType || 'Subcontractor Labour';
    const firmName = selectedQuote?.contractorName || selectedSub.subcontractorName;
    const unitLabel = selectedSub.unit || 'hours';

    const newItem: ProjectCostItem = {
      id: `sub-cost-${Date.now()}`,
      phaseId: selectedPhaseId,
      type: 'subcontractor',
      itemId: selectedSub.id,
      name: `${tradeName} (${selectedQuote?.skillBadge || selectedSub.skillLevel || 'Senior Specialist'})`,
      category: selectedSub.category || selectedSub.serviceCategory || 'Subcontractor Services',
      supplierOrProvider: firmName,
      quantity: hours,
      unit: unitLabel,
      unitCost: netHourlyCost,
      billableRate: calculatedBillableRate,
      markupPct,
      discountPct: customDiscountPct,
      totalCost,
      totalRevenue: syncRevenueWithProject ? totalRevenue : undefined,
      selectedOptionIndex: 0,
      alternativeOptions: quotes
        .filter(q => q.id !== selectedQuote.id)
        .map(q => ({
          provider: q.contractorName,
          unitCost: q.hourlyRate,
          savingsDiff: Number(((q.hourlyRate - selectedQuote.hourlyRate) * hours).toFixed(2)),
          notes: q.notes || `${q.leadTimeDays}d mobilization (${q.paymentTerms})`
        })),
      bulkTierLabel: shiftTierOptions.find(t => t.id === selectedShiftTier)?.label
    };

    onAddCostItem(newItem, syncRevenueWithProject);
    onClose();
  };

  // 1-Click Direct Quick Insert for Full-Screen Table View
  const handleQuickInsertDirectly = (sub: SubcontractorRateItem) => {
    const rateVal = sub.baseRate ?? sub.rate ?? 100;
    const unitVal = sub.unit || 'hr';
    const subName = sub.name || sub.serviceType || 'Specialist Contractor';
    const newItem: ProjectCostItem = {
      id: `cost-sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      phaseId: selectedPhaseId || phases[0]?.id || 'phase-01',
      type: 'subcontractor',
      itemId: sub.id,
      name: `${subName} [${sub.subcontractorName || 'Certified Trade Guild'}]`,
      category: sub.category || sub.serviceCategory || 'Subcontractor Services',
      supplierOrProvider: sub.subcontractorName || 'Certified Trade Guild',
      quantity: 8, // 1 standard shift day
      unit: unitVal,
      unitCost: rateVal,
      discountPct: 0,
      totalCost: rateVal * 8,
      selectedOptionIndex: 0,
      billableRate: Number((rateVal * 1.35).toFixed(2)),
      totalRevenue: Number((rateVal * 8 * 1.35).toFixed(2)),
      grossProfit: Number((rateVal * 8 * 0.35).toFixed(2)),
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
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Subcontractors</h3>
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

          {/* View Mode Toggle: FXTT Table vs Cards Grid */}
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

          {/* Create Trade Scratch */}
          <button
            onClick={() => setIsCreatingTrade(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Trade</span>
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
            placeholder="Search trades, ASME welders, CNC machinists, union firms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049] focus:ring-1 focus:ring-[#003049]"
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
                ? subcontractors.length
                : subcontractors.filter(s => (s.category || s.serviceCategory) === cat).length;
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
            <option value="name">Trade Name (A-Z)</option>
            <option value="code">Trade Code</option>
            <option value="rate_asc">Rate: Low to High</option>
            <option value="rate_desc">Rate: High to Low</option>
            <option value="skill">Skill Level</option>
          </select>
        </div>
      </div>

      {/* MAIN BODY: SPLIT VIEW LAYOUT */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* LEFT PANE: SUBCONTRACTOR CATALOG (FXTT TABLE OR GRID) */}
        <div
          className={`flex flex-col h-full overflow-hidden transition-all ${
            selectedSub && tableLayoutMode === 'split'
              ? 'w-full lg:w-7/12 2xl:w-3/5 border-b lg:border-b-0 lg:border-r border-slate-200'
              : 'w-full'
          }`}
        >
          {/* Catalog Info Strip */}
          <div className="bg-white px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-800">{filteredSubcontractors.length}</span>
              <span>specialized trade rates matched</span>
              {selectedCategory !== 'All' && (
                <span className="text-[11px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                  {selectedCategory}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 italic">
              {selectedSub ? 'Click another trade to switch' : 'Select a trade to compare contractor quotes, crew shift hours & calculate margin'}
            </span>
          </div>

          {/* Create Trade Modal Sub-screen */}
          {isCreatingTrade && (
            <div className="m-3 p-4 bg-[#fdf0d5]/40 border border-[#ecd5a8] rounded-xl space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-[#ecd5a8] pb-2">
                <h4 className="text-xs font-semibold text-[#003049] flex items-center space-x-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#c1121f]" />
                  <span>Create Custom Trade &amp; Labour Rate Specification</span>
                </h4>
                <button onClick={() => setIsCreatingTrade(false)} className="text-xs text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Trade Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SUB-CNC-09B"
                    value={newTradeCode}
                    onChange={e => setNewTradeCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Trade / Service Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 5-Axis Inconel Machining &amp; Wire EDM"
                    value={newTradeName}
                    onChange={e => setNewTradeName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newTradeCategory}
                    onChange={e => setNewTradeCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Unit</label>
                  <input
                    type="text"
                    value={newTradeUnit}
                    onChange={e => setNewTradeUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Base Contractor Rate ($/hr) *</label>
                  <input
                    type="number"
                    value={newTradeRate}
                    onChange={e => setNewTradeRate(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Primary Contractor Firm</label>
                  <input
                    type="text"
                    value={newTradeContractor}
                    onChange={e => setNewTradeContractor(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Skill / Certification</label>
                  <input
                    type="text"
                    value={newTradeSkill}
                    onChange={e => setNewTradeSkill(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleCreateTrade}
                  className="px-4 py-1.5 bg-[#003049] text-white text-xs font-semibold rounded-lg hover:bg-[#002235] transition-colors"
                >
                  Save &amp; Compare Contractor Rates &rarr;
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
                    <th className="py-2.5 px-3 whitespace-nowrap">Trade Code</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Trade &amp; Labour Specification</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Unit</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Base Contractor Rate</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Primary Contractor / Union Firm</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Skill Level</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubcontractors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Wrench className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium">No specialized trades match your search criteria</p>
                        <p className="text-xs text-slate-400 mt-1">Try changing category or clearing your query</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubcontractors.map(s => {
                      const isCurrent = selectedSub?.id === s.id;
                      const rateVal = s.baseRate ?? s.rate ?? 95;
                      const codeVal = s.code || `SUB-${s.id.slice(-4).toUpperCase()}`;
                      const nameVal = s.name || s.serviceType;
                      const unitVal = s.unit || 'hr';
                      const subCatVal = s.serviceSubCategory || s.subCategory || s.nicheServiceName || 'Specialized Engineering Trade';

                      return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            setSelectedSub(s);
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
                              {nameVal}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">
                              {subCatVal}
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              {s.category || s.serviceCategory || 'Subcontractor'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="text-[10px] text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded font-medium border border-[#ecd5a8]">
                              /{unitVal}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-semibold text-[#003049]">
                              {formatLKR(rateVal)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">/{unitVal}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-[11px] text-slate-800 flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[140px]">{s.subcontractorName || 'Certified Trade Contractor'}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700">4 Certified Quotes</span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                              {s.skillLevel || 'Journeyman'}
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
                                title="Quick Insert 1 shift (8 hrs) directly into phase"
                              >
                                <span>⚡ Quick Insert</span>
                              </button>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedSub(s);
                                  setTableLayoutMode('split');
                                }}
                                className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                                  isCurrent
                                    ? 'bg-[#003049] text-white'
                                    : 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8] hover:bg-[#ecd5a8]'
                                }`}
                                title="Configure shift hours & rates"
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
              <div className={`grid gap-3 ${selectedSub ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {filteredSubcontractors.map(s => {
                  const isCurrent = selectedSub?.id === s.id;
                  const rateVal = s.baseRate ?? s.rate ?? 95;
                  const codeVal = s.code || `SUB-${s.id.slice(-4).toUpperCase()}`;
                  const nameVal = s.name || s.serviceType;
                  const unitVal = s.unit || 'hr';

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSub(s);
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
                          <span className="bg-[#fdf0d5] text-[#003049] px-1.5 py-0.2 rounded font-medium">{unitVal}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-[#003049] line-clamp-2">
                          {nameVal}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {s.subcontractorName || 'Union Specialized Firm'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[#003049]">
                            ${rateVal.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal">/{unitVal}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 flex items-center space-x-1">
                            <Award className="w-2.5 h-2.5" />
                            <span>{s.skillLevel || 'Senior Specialist'}</span>
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
          {tableLayoutMode === 'full' && selectedSub && (
            <div className="bg-[#003049] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-[#002235] shadow-lg">
              <div className="flex items-center space-x-3 flex-wrap">
                <span className="font-mono text-xs text-[#fdf0d5] bg-white/10 px-2 py-0.5 rounded border border-white/20">
                  {selectedSub.code || 'SUB-SPEC'}
                </span>
                <span className="text-xs font-semibold">{selectedSub.name || selectedSub.serviceType}</span>
                <span className="text-xs text-slate-300">
                  Base: {formatLKR(selectedSub.baseRate ?? selectedSub.rate ?? 100)}/{selectedSub.unit || 'hr'}
                </span>
                <span className="text-xs text-emerald-400 font-medium">4 Certified Quotes Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleQuickInsertDirectly(selectedSub)}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>⚡ Quick Insert Trade ({formatLKR((selectedSub.baseRate ?? selectedSub.rate ?? 100) * 8)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTableLayoutMode('split')}
                  className="px-3 py-1.5 bg-[#fdf0d5] hover:bg-[#ecd5a8] text-[#003049] rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Open Multi-Contractor &amp; Profit Engine &rarr;</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: CONTRACTOR SELECTION, SHIFT HOURS, REVENUE & PROFIT ENGINE */}
        {selectedSub && tableLayoutMode === 'split' ? (
          <div className="w-full lg:w-5/12 2xl:w-2/5 flex flex-col h-full overflow-y-auto bg-slate-50/70 p-4 space-y-4 shrink-0">
            {/* TRADE SUMMARY HEADER CARD */}
            <div className="bg-[#fdf0d5]/60 border border-[#ecd5a8] rounded-xl p-3 shadow-2xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-600">
                    <span className="font-mono text-[#003049] font-semibold uppercase">{selectedSub.code || 'SUB-SPEC'}</span>
                    <span>•</span>
                    <span>{selectedSub.category || selectedSub.serviceCategory || 'Subcontractor Labour'}</span>
                    <span>•</span>
                    <span className="bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-300 font-medium">
                      Skill: {selectedSub.skillLevel || 'Senior Specialist'}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#003049] mt-1">{selectedSub.name || selectedSub.serviceType}</h4>
                </div>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="text-xs text-slate-600 hover:text-slate-900 underline whitespace-nowrap"
                >
                  Change Trade
                </button>
              </div>
            </div>

            {/* STEP 1: CHOOSE CERTIFIED CONTRACTOR RATE */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                  <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                    1. Choose Certified Contractor Rate
                  </span>
                </div>
                <button
                  onClick={() => setIsAddingCustomQuote(true)}
                  className="text-[11px] text-[#003049] hover:underline flex items-center space-x-1 font-medium"
                >
                  <Plus className="w-3 h-3 text-[#c1121f]" />
                  <span>+ Custom Contractor</span>
                </button>
              </div>

              {/* Add custom quote modal inline */}
              {isAddingCustomQuote && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Add Direct Contractor Quote</span>
                    <button onClick={() => setIsAddingCustomQuote(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-600">Contractor / Firm Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ironclad Tradesmen Group"
                        value={customContractorName}
                        onChange={e => setCustomContractorName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-600">Hourly Rate ($/hr)</label>
                      <input
                        type="number"
                        value={customRate}
                        onChange={e => setCustomRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-600">Skill Level / Crew Certification</label>
                      <input
                        type="text"
                        value={customSkill}
                        onChange={e => setCustomSkill(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveCustomQuote}
                    className="w-full py-1 bg-[#003049] text-white text-xs rounded font-medium hover:bg-[#002235]"
                  >
                    Save &amp; Select Contractor Rate
                  </button>
                </div>
              )}

              {/* Quotes List */}
              <div className="space-y-2">
                {quotes.map(q => {
                  const isSelected = q.id === selectedQuoteId;
                  const isLowest = q.badge?.includes('Lowest');
                  const isRush = q.badge?.includes('Fast-Track') || q.badge?.includes('Weekend');

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
                            name="contractor_quote"
                            checked={isSelected}
                            onChange={() => setSelectedQuoteId(q.id)}
                            className="mt-0.5 text-[#003049] focus:ring-[#003049]"
                          />
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-xs text-slate-900">{q.contractorName}</span>
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
                              <span>{q.city}</span>
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
                            ${q.hourlyRate.toFixed(2)}
                            <span className="text-[10px] text-slate-500 font-normal">/{selectedSub.unit || 'hr'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">Lead: {q.leadTimeDays}d mobilization</span>
                        </div>
                      </div>

                      {isSelected && q.notes && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center justify-between">
                          <span>{q.notes}</span>
                          <span className="text-emerald-700 font-medium ml-2 shrink-0">{q.skillBadge}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: CHOOSE SHIFT HOURS & VOLUME / CREW DISCOUNT */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-2xs">
              <div className="flex items-center space-x-1.5 border-b border-slate-100 pb-1.5">
                <Clock className="w-3.5 h-3.5 text-[#003049]" />
                <span className="text-xs font-semibold text-[#003049] uppercase tracking-wide">
                  2. Choose Shift Hours &amp; Crew Discount
                </span>
              </div>

              {/* Shift Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {shiftTierOptions.map(tier => {
                  const isSelected = selectedShiftTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleSelectShiftTier(tier)}
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

              {/* Quantity Hours Input & Stepper */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-slate-700 font-medium text-xs mb-1">
                    Direct Project Hours ({selectedSub.unit || 'hours'})
                  </label>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setHours(Math.max(1, hours - 8))}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border-r border-slate-300"
                    >
                      -8
                    </button>
                    <button
                      type="button"
                      onClick={() => setHours(Math.max(1, hours - 1))}
                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border-r border-slate-300"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={hours}
                      onChange={e => setHours(Math.max(1, Number(e.target.value)))}
                      className="w-full text-center py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setHours(hours + 1)}
                      className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border-l border-slate-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHours(hours + 8)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border-l border-slate-300"
                    >
                      +8
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
                      Direct Contractor Rate ($/hr)
                    </label>
                    <div className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-sm">
                      ${netHourlyCost.toFixed(2)}
                      <span className="text-[10px] text-slate-500 font-normal"> /{selectedSub.unit || 'hr'}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-medium">Client Billable Rate ($/hr)</label>
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
                  {hours} {selectedSub.unit || 'hrs'} × ${netHourlyCost.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300">Total Labour Cost</div>
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
          /* NO TRADE SELECTED BANNER */
          <div className="hidden lg:flex w-5/12 flex-col items-center justify-center bg-slate-50/50 p-8 text-center text-slate-400 border-l border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-[#003049]/5 flex items-center justify-center text-[#003049] mb-3">
              <Wrench className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Select a Specialized Trade from the Catalog</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Choose any subcontractor trade on the left in either <strong>FXTT Table View</strong> or <strong>Grid View</strong> to compare contractor quotes, configure crew shift hours, and calculate live profit margins in real time.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
