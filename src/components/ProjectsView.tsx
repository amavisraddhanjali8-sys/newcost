import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  PlusCircle,
  Search,
  Lock,
  Unlock,
  FileDown,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Layers,
  CheckCircle,
  Sliders,
  Sparkles,
  AlertCircle,
  Percent,
  Calendar,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Filter,
  Check,
  X,
  RotateCcw,
  HelpCircle,
  Tag,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CheckCircle2,
  Users,
  AlertTriangle
} from 'lucide-react';
import { calculateProjectProfitability, getMarginThreshold } from '../utils/profitabilityMonitor';
import { Project, ProjectItem, MaterialItem, SubcontractorRateItem, OutsourcedService, AlternativeOption } from '../types';
import { ModernTileCard } from './ModernTileCard';
import { ColorGradientPicker } from './ColorGradientPicker';
import { getRandomThemeIndex, getThemeById } from '../data/tileThemes';
import { parseSmartSearch, evaluateSmartSearch, SearchableField } from '../utils/smartSearch';
import { formatCurrency, SUPPORTED_CURRENCIES, getStoredCurrency } from '../utils/currency';

interface ProjectsViewProps {
  projects: Project[];
  selectedProject: Project | null;
  materials: MaterialItem[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  onSelectProject: (proj: Project) => void;
  onCreateProject: (proj: Partial<Project>) => void;
  onUpdateProject: (proj: Project) => void;
  onExportPDF: (proj: Project) => void;
  onViewCostAnalysis: (proj: Project) => void;
  onNavigateToProjectHome?: (proj: Project) => void;
  onViewTimelines?: (proj: Project) => void;
  onViewResources?: (proj: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  selectedProject,
  materials,
  subcontractors,
  outsourcedServices,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onExportPDF,
  onViewCostAnalysis,
  onNavigateToProjectHome,
  onViewTimelines,
  onViewResources
}) => {
  // Smart Search & Multiple Filtering Options State
  const [search, setSearch] = useState('');
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('ALL');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Granular Filter Settings
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [minMargin, setMinMargin] = useState<number | null>(null);
  const [contractLock, setContractLock] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [minPhases, setMinPhases] = useState<number | null>(null);

  // Sorting Settings
  const [sortField, setSortField] = useState<'default' | 'quotedPrice' | 'targetMarginPct' | 'name' | 'code' | 'clientName' | 'phases'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tiles' | 'compact'>('tiles');
  const [marginThreshold, setMarginThresholdState] = useState<number>(() => getMarginThreshold());

  React.useEffect(() => {
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
  const [cardThemes, setCardThemes] = useState<Record<string, { themeId: string; customGradient?: string }>>(() => {
    try {
      const saved = localStorage.getItem('fxtt_tile_theme_overrides');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'proj-01': { themeId: 'airbus-cobalt' },
      'proj-02': { themeId: 'pacific-sky' }
    };
  });

  // Extract unique facets from projects
  const uniqueClients = useMemo(() => {
    const clients = new Map<string, number>();
    projects.forEach(p => {
      if (p.clientName) {
        clients.set(p.clientName, (clients.get(p.clientName) || 0) + 1);
      }
    });
    return Array.from(clients.entries()).map(([client, count]) => ({ client, count }));
  }, [projects]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    projects.forEach(p => {
      if (p.productCategory) cats.add(p.productCategory);
    });
    return Array.from(cats);
  }, [projects]);

  const allStatuses = ['Proposal', 'In Progress', 'Contract Signed & Locked', 'Completed', 'Under Review'];

  // Count active filter settings (excluding quick search text)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activePreset !== 'ALL') count++;
    if (selectedStatuses.length > 0) count++;
    if (selectedClients.length > 0) count++;
    if (selectedCategory !== 'all') count++;
    if (priceMin || priceMax) count++;
    if (minMargin !== null) count++;
    if (contractLock !== 'all') count++;
    if (minPhases !== null) count++;
    if (sortField !== 'default') count++;
    return count;
  }, [activePreset, selectedStatuses, selectedClients, selectedCategory, priceMin, priceMax, minMargin, contractLock, minPhases, sortField]);

  const handleResetAllFilters = () => {
    setSearch('');
    setActivePreset('ALL');
    setSelectedStatuses([]);
    setSelectedClients([]);
    setSelectedCategory('all');
    setPriceMin('');
    setPriceMax('');
    setMinMargin(null);
    setContractLock('all');
    setMinPhases(null);
    setSortField('default');
    setSortOrder('desc');
  };

  // Smart Search & Multi-Filter Pipeline
  const filtered = useMemo(() => {
    const parsedQuery = parseSmartSearch(search);

    const scored = projects.map(proj => {
      const analytics = proj.analytics;
      const marginPct = analytics?.grossMarginPct || proj.targetMarginPct;

      // 1. Preset filter checks
      if (activePreset === 'PROPOSAL' && proj.status !== 'Proposal') return null;
      if (activePreset === 'LOCKED' && !proj.contractLocked) return null;
      if (activePreset === 'IN_PROGRESS' && proj.status !== 'In Progress') return null;
      if (activePreset === 'HIGH_MARGIN' && marginPct < 25) return null;
      if (activePreset === 'LARGE_BUDGET' && proj.quotedPrice < 250000) return null;
      if (activePreset === 'MULTI_PHASE' && (proj.phases?.length || 0) < 3) return null;

      // 2. Status Multi-select
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(proj.status)) {
        return null;
      }

      // 3. Client Multi-select
      if (selectedClients.length > 0 && !selectedClients.includes(proj.clientName)) {
        return null;
      }

      // 4. Category Filter
      if (selectedCategory !== 'all' && proj.productCategory !== selectedCategory) {
        return null;
      }

      // 5. Price Min/Max Range
      if (priceMin && proj.quotedPrice < Number(priceMin)) return null;
      if (priceMax && proj.quotedPrice > Number(priceMax)) return null;

      // 6. Minimum Margin
      if (minMargin !== null && marginPct < minMargin) return null;

      // 7. Contract Lock
      if (contractLock === 'locked' && !proj.contractLocked) return null;
      if (contractLock === 'unlocked' && proj.contractLocked) return null;

      // 8. Phase count
      if (minPhases !== null && (proj.phases?.length || 0) < minPhases) return null;

      // 9. Smart Search Evaluation across structured fields
      if (parsedQuery.raw) {
        const searchableFields: SearchableField[] = [
          { name: 'code', value: proj.code, weight: 3 },
          { name: 'name', value: proj.name, weight: 2.5 },
          { name: 'client', value: proj.clientName, weight: 2 },
          { name: 'clientName', value: proj.clientName, weight: 2 },
          { name: 'targetProduct', value: proj.targetProduct, weight: 2 },
          { name: 'category', value: proj.productCategory, weight: 1.5 },
          { name: 'subCategory', value: proj.productSubCategory, weight: 1 },
          { name: 'moreSubCategory', value: proj.productMoreSubCategory, weight: 1 },
          { name: 'status', value: proj.status, weight: 1 },
          { name: 'notes', value: proj.notes, weight: 0.8 },
          { name: 'price', value: proj.quotedPrice, isNumeric: true },
          { name: 'quotedPrice', value: proj.quotedPrice, isNumeric: true },
          { name: 'margin', value: marginPct, isNumeric: true },
          { name: 'targetMarginPct', value: marginPct, isNumeric: true },
          { name: 'phases', value: (proj.phases || []).map(p => `${p.name} ${p.description || ''}`).join(' '), weight: 1 },
          { name: 'alternatives', value: (proj.alternativeOptions || []).map(a => `${a.title} ${a.description}`).join(' '), weight: 0.8 }
        ];

        const match = evaluateSmartSearch(parsedQuery, searchableFields);
        if (!match.matches) return null;
        return { proj, score: match.score };
      }

      return { proj, score: 1 };
    }).filter(Boolean) as Array<{ proj: Project; score: number }>;

    // Sort scored items
    scored.sort((a, b) => {
      if (sortField !== 'default') {
        let valA: any;
        let valB: any;

        if (sortField === 'quotedPrice') {
          valA = a.proj.quotedPrice;
          valB = b.proj.quotedPrice;
        } else if (sortField === 'targetMarginPct') {
          valA = a.proj.analytics?.grossMarginPct || a.proj.targetMarginPct;
          valB = b.proj.analytics?.grossMarginPct || b.proj.targetMarginPct;
        } else if (sortField === 'phases') {
          valA = a.proj.phases?.length || 0;
          valB = b.proj.phases?.length || 0;
        } else if (sortField === 'name') {
          valA = a.proj.name.toLowerCase();
          valB = b.proj.name.toLowerCase();
        } else if (sortField === 'code') {
          valA = a.proj.code.toLowerCase();
          valB = b.proj.code.toLowerCase();
        } else if (sortField === 'clientName') {
          valA = a.proj.clientName.toLowerCase();
          valB = b.proj.clientName.toLowerCase();
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
      }

      // Default to relevance score then quoted price
      if (parsedQuery.raw && b.score !== a.score) {
        return b.score - a.score;
      }
      return (b.proj.quotedPrice || 0) - (a.proj.quotedPrice || 0);
    });

    return scored.map(s => s.proj);
  }, [
    projects,
    search,
    activePreset,
    selectedStatuses,
    selectedClients,
    selectedCategory,
    priceMin,
    priceMax,
    minMargin,
    contractLock,
    minPhases,
    sortField,
    sortOrder
  ]);

  const handleUpdateCardTheme = (id: string, themeId: string, customGrad?: string) => {
    setCardThemes((prev) => {
      const updated = {
        ...prev,
        [id]: { themeId, customGradient: customGrad }
      };
      try {
        localStorage.setItem('fxtt_tile_theme_overrides', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const targetProj = projects.find((p) => p.id === id);
    if (targetProj) {
      onUpdateProject({
        ...targetProj,
        themeId,
        customGradient: customGrad
      });
    }
  };

  // New Project Form
  const [form, setForm] = useState({
    code: `PRJ-2026-00${projects.length + 1}`,
    name: '',
    clientName: '',
    productCategory: 'Industrial Automation & Robotics',
    productSubCategory: 'Heavy Robotic Arms & Gantry Positioning',
    productMoreSubCategory: 'Modular Gantry & Tool Changer Platforms',
    targetProduct: '6-Axis Gantry Mill',
    currency: getStoredCurrency(),
    quotedPrice: 450000,
    targetMarginPct: 25,
    overheadPct: 6,
    contingencyPct: 4,
    status: 'Proposal' as const,
    notes: 'Configured for high precision multi-axis aerospace milling.',
    themeId: 'pacific-sky',
    customGradient: undefined as string | undefined
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({
      ...form,
      contractLocked: false,
      phases: [
        {
          id: `phase-1-${Date.now()}`,
          name: 'Phase 1: Engineering & Materials Procurement',
          budget: form.quotedPrice * 0.4,
          actualCost: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'In Progress',
          description: 'Acquisition of structural materials, raw alloy stock, and long lead components.'
        },
        {
          id: `phase-2-${Date.now()}`,
          name: 'Phase 2: Fabrication & Subcontractor Machining',
          budget: form.quotedPrice * 0.35,
          actualCost: 0,
          startDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 65 * 86400000).toISOString().split('T')[0],
          status: 'Not Started',
          description: 'Specialized 5-axis milling, certified ASME welding, and chassis build.'
        },
        {
          id: `phase-3-${Date.now()}`,
          name: 'Phase 3: Integration, Power, Testing & Delivery',
          budget: form.quotedPrice * 0.15,
          actualCost: 0,
          startDate: new Date(Date.now() + 65 * 86400000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
          status: 'Not Started',
          description: 'Outsourced freight, on-site commissioning, electrical testing, and acceptance.'
        }
      ],
      selectedItems: [
        {
          id: `item-1-${Date.now()}`,
          name: materials[0]?.name || 'Structural Titanium Plates 6Al-4V',
          type: 'material',
          category: 'Metals & Structural Alloys',
          quantity: 40,
          unit: 'sheet',
          unitCost: materials[0]?.retailPrice || 320,
          discountPct: 5,
          totalCost: (materials[0]?.retailPrice || 320) * 40 * 0.95,
          supplierOrProvider: materials[0]?.supplierName || 'Vanguard Materials'
        },
        {
          id: `item-2-${Date.now()}`,
          name: subcontractors[0]?.name || '5-Axis Precision CNC Milling',
          type: 'subcontractor',
          category: 'Precision Machining',
          quantity: 120,
          unit: 'hour',
          unitCost: subcontractors[0]?.rate || 125,
          discountPct: 0,
          totalCost: (subcontractors[0]?.rate || 125) * 120,
          supplierOrProvider: subcontractors[0]?.subcontractorName || 'Titan Heavy'
        },
        {
          id: `item-3-${Date.now()}`,
          name: outsourcedServices[0]?.name || 'Specialized Heavy Transport Flatbed',
          type: 'outsourced',
          category: 'Logistics',
          quantity: 800,
          unit: 'km',
          unitCost: outsourcedServices[0]?.rate || 4.2,
          discountPct: 0,
          totalCost: (outsourcedServices[0]?.rate || 4.2) * 800,
          supplierOrProvider: outsourcedServices[0]?.providerName || 'Global Integrated'
        }
      ],
      alternativeOptions: [
        {
          id: 'opt-base',
          title: 'Option A: Standard Commercial Spec',
          description: 'Standard certified structural stock with baseline tooling rates.',
          adjustedCost: form.quotedPrice * 0.72,
          adjustedPrice: form.quotedPrice,
          projectedMarginPct: 28.0,
          isRecommended: true
        },
        {
          id: 'opt-fast-track',
          title: 'Option B: Accelerated Delivery (+15% Premium Labour)',
          description: 'Expedited overtime subcontractor machining and priority flatbed delivery.',
          adjustedCost: form.quotedPrice * 0.81,
          adjustedPrice: form.quotedPrice * 1.15,
          projectedMarginPct: 29.5,
          isRecommended: false
        },
        {
          id: 'opt-economy',
          title: 'Option C: Value Engineering (-8% Alternative Alloy)',
          description: 'Substitute specialized titanium for Aerospace 7075 Aluminum extrusions.',
          adjustedCost: form.quotedPrice * 0.63,
          adjustedPrice: form.quotedPrice * 0.90,
          projectedMarginPct: 30.0,
          isRecommended: false
        }
      ]
    });
    setIsCreateModalOpen(false);
  };

  const toggleContractLock = (project: Project) => {
    const updated = {
      ...project,
      contractLocked: !project.contractLocked,
      status: (!project.contractLocked ? 'Contract Signed & Locked' : 'In Progress') as any
    };
    onUpdateProject(updated);
  };

  const handleApplyAlternativeOption = (project: Project, opt: AlternativeOption) => {
    const updated: Project = {
      ...project,
      quotedPrice: opt.adjustedPrice,
      notes: `${project.notes}\n[Negotiated Option Applied: ${opt.title}]`
    };
    onUpdateProject(updated);
    setIsScenarioModalOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Header Banner - Simple UI like Home tab */}
      <div className="bg-white dark:bg-[#0b101b] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-[#0078d4]/10 text-[#0078d4]">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Projects</h2>
              <span className="text-xs font-bold font-mono text-[#0078d4] dark:text-sky-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {projects.length} Total
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1 px-3 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Project</span>
        </button>
      </div>

      {/* Quick Filter Preset Tabs - Simple Words */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-white dark:bg-[#0b101b] p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'ALL', label: 'All', count: projects.length },
            { id: 'PROPOSAL', label: 'Proposals', count: projects.filter(p => p.status === 'Proposal').length },
            { id: 'IN_PROGRESS', label: 'In Progress', count: projects.filter(p => p.status === 'In Progress').length },
            { id: 'LOCKED', label: 'Locked', count: projects.filter(p => p.contractLocked).length },
            { id: 'HIGH_MARGIN', label: 'High Margin', count: projects.filter(p => (p.analytics?.grossMarginPct || p.targetMarginPct) >= 25).length },
            { id: 'LARGE_BUDGET', label: 'Enterprise', count: projects.filter(p => p.quotedPrice >= 250000).length }
          ].map((tab) => {
            const isActive = activePreset === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePreset(tab.id)}
                className={`px-3 py-1 text-xs rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer font-semibold ${
                  isActive
                    ? 'bg-[#0078d4] text-white shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={handleResetAllFilters}
            className="text-xs text-[#0078d4] hover:underline flex items-center space-x-1 px-2 py-0.5 cursor-pointer font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="bg-white dark:bg-[#0b101b] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Simple Search */}
          <div className="flex-1 min-w-[240px] relative">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>

          {/* Action Buttons: Filter Toggle, Sort Dropdown, View Mode Toggle */}
          <div className="flex items-center space-x-2">
            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer border ${
                isFilterPanelOpen || activeFiltersCount > 0
                  ? 'bg-[#0078d4] text-white border-[#0078d4] shadow-xs'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="font-semibold">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterPanelOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs">
              <ArrowUpDown className="w-3 h-3 text-slate-500" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                className="bg-transparent text-slate-700 focus:outline-none text-xs cursor-pointer"
              >
                <option value="default">Sort: Default (Relevance)</option>
                <option value="quotedPrice">Quoted Value</option>
                <option value="targetMarginPct">Target Margin %</option>
                <option value="name">Project Name (A-Z)</option>
                <option value="code">Project Code</option>
                <option value="clientName">Client Name</option>
                <option value="phases">Phase Count</option>
              </select>
              {sortField !== 'default' && (
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-slate-600 hover:text-slate-900 font-mono text-[11px] px-1"
                  title={`Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>

            {/* View Mode Toggle: Tiles vs Compact Table */}
            <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded text-xs border border-slate-200">
              <button
                onClick={() => setViewMode('tiles')}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-all cursor-pointer ${
                  viewMode === 'tiles'
                    ? 'bg-white text-[#003049] shadow-2xs font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Modern Tiles View"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>Tiles</span>
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white text-[#003049] shadow-2xs font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Detailed Rows View"
              >
                <List className="w-3 h-3" />
                <span>Detailed</span>
              </button>
            </div>
          </div>
        </div>

        {/* EXPANDABLE MULTIPLE FILTER SETTINGS PANEL */}
        {isFilterPanelOpen && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-[#003049]" />
                <span className="font-bold text-slate-900 text-xs">
                  Filters
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="text-xs text-slate-600 hover:text-red-600 underline cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Status Multi-select */}
              <div className="space-y-1.5 bg-white p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block text-[11px]">
                  Status
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {allStatuses.map((st) => {
                    const isChecked = selectedStatuses.includes(st);
                    const count = projects.filter(p => p.status === st).length;
                    return (
                      <label key={st} className="flex items-center justify-between text-xs hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedStatuses(selectedStatuses.filter(s => s !== st));
                              } else {
                                setSelectedStatuses([...selectedStatuses, st]);
                              }
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0"
                          />
                          <span className="text-slate-700">{st}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Client Multi-select */}
              <div className="space-y-1.5 bg-white p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block text-[11px]">
                  Client
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {uniqueClients.map(({ client, count }) => {
                    const isChecked = selectedClients.includes(client);
                    return (
                      <label key={client} className="flex items-center justify-between text-xs hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <div className="flex items-center space-x-1.5 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedClients(selectedClients.filter(c => c !== client));
                              } else {
                                setSelectedClients([...selectedClients, client]);
                              }
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0"
                          />
                          <span className="text-slate-700 truncate" title={client}>{client}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Budget / Quoted Price Range */}
              <div className="space-y-1.5 bg-white p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block text-[11px]">
                  Budget
                </span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    placeholder="Min $"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-1/2 p-1 border border-slate-300 rounded text-xs"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-1/2 p-1 border border-slate-300 rounded text-xs"
                  />
                </div>
                {/* Quick Budget Presets */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: '<$150k', min: '', max: '150000' },
                    { label: '$150k-$350k', min: '150000', max: '350000' },
                    { label: '>$350k', min: '350000', max: '' }
                  ].map(b => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => {
                        setPriceMin(b.min);
                        setPriceMax(b.max);
                      }}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] rounded border border-slate-200 cursor-pointer"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Target Margin, Contract Lock & Phases */}
              <div className="space-y-1.5 bg-white p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Margin, Lock & Phases:
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-xs">Min Margin:</span>
                    <div className="flex gap-1">
                      {[null, 15, 20, 25, 30].map((m) => (
                        <button
                          key={String(m)}
                          type="button"
                          onClick={() => setMinMargin(m)}
                          className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer ${
                            minMargin === m
                              ? 'bg-[#003049] text-white border-[#003049]'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {m === null ? 'Any' : `≥${m}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600 text-xs">Contract:</span>
                    <div className="flex gap-1">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'locked', label: 'Locked' },
                        { id: 'unlocked', label: 'Unlocked' }
                      ].map((lk) => (
                        <button
                          key={lk.id}
                          type="button"
                          onClick={() => setContractLock(lk.id as any)}
                          className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer ${
                            contractLock === lk.id
                              ? 'bg-[#003049] text-white border-[#003049]'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {lk.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600 text-xs">Phases:</span>
                    <div className="flex gap-1">
                      {[null, 2, 3, 4].map((ph) => (
                        <button
                          key={String(ph)}
                          type="button"
                          onClick={() => setMinPhases(ph)}
                          className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer ${
                            minPhases === ph
                              ? 'bg-[#003049] text-white border-[#003049]'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ph === null ? 'Any' : `${ph}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER BADGES ROW */}
        {(search || activeFiltersCount > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Active Criteria:</span>
            </span>

            {search && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-xs font-mono">
                <span>query: "{search}"</span>
                <button type="button" onClick={() => setSearch('')} className="text-blue-600 hover:text-blue-900 cursor-pointer">✕</button>
              </span>
            )}

            {activePreset !== 'ALL' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs font-medium">
                <span>Preset: {activePreset}</span>
                <button type="button" onClick={() => setActivePreset('ALL')} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">✕</button>
              </span>
            )}

            {selectedStatuses.map(st => (
              <span key={st} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs">
                <span>Status: {st}</span>
                <button type="button" onClick={() => setSelectedStatuses(selectedStatuses.filter(s => s !== st))} className="text-slate-500 hover:text-slate-900 cursor-pointer">✕</button>
              </span>
            ))}

            {selectedClients.map(cl => (
              <span key={cl} className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs">
                <span>Client: {cl}</span>
                <button type="button" onClick={() => setSelectedClients(selectedClients.filter(c => c !== cl))} className="text-slate-500 hover:text-slate-900 cursor-pointer">✕</button>
              </span>
            ))}

            {(priceMin || priceMax) && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs">
                <span>Budget: ${priceMin || '0'} - ${priceMax || '∞'}</span>
                <button type="button" onClick={() => { setPriceMin(''); setPriceMax(''); }} className="text-amber-700 hover:text-amber-950 cursor-pointer">✕</button>
              </span>
            )}

            {minMargin !== null && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded text-xs">
                <span>Margin ≥ {minMargin}%</span>
                <button type="button" onClick={() => setMinMargin(null)} className="text-purple-700 hover:text-purple-950 cursor-pointer">✕</button>
              </span>
            )}

            {contractLock !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs">
                <span>Lock: {contractLock}</span>
                <button type="button" onClick={() => setContractLock('all')} className="text-slate-500 hover:text-slate-900 cursor-pointer">✕</button>
              </span>
            )}

            {minPhases !== null && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs">
                <span>Phases ≥ {minPhases}</span>
                <button type="button" onClick={() => setMinPhases(null)} className="text-slate-500 hover:text-slate-900 cursor-pointer">✕</button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-xs text-red-600 hover:text-red-800 underline ml-auto cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Counter Banner */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
          <div>
            Showing <span className="text-slate-900 font-bold">{filtered.length}</span> of {projects.length} projects
            {filtered.length < projects.length && <span className="text-emerald-700 font-medium ml-1">(filtered)</span>}
          </div>
          {sortField !== 'default' && (
            <div className="text-[11px] text-slate-400">
              Sorted by: <span className="text-slate-700 font-medium">{sortField} ({sortOrder})</span>
            </div>
          )}
        </div>
      </div>

      {/* When viewMode === 'tiles', render the modern tiles matching the user's reference image */}
      {viewMode === 'tiles' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((proj, idx) => {
            const isSelected = selectedProject?.id === proj.id;
            const analytics = proj.analytics;
            const revenue = proj.quotedPrice;
            const marginPct = analytics?.grossMarginPct || proj.targetMarginPct;
            const marginAnalysis = calculateProjectProfitability(proj, marginThreshold);
            const defaultTheme = getRandomThemeIndex(idx);
            const cardTheme = cardThemes[proj.id] || (proj.themeId ? { themeId: proj.themeId, customGradient: proj.customGradient } : { themeId: defaultTheme.id });

            return (
              <ModernTileCard
                key={proj.id}
                id={proj.id}
                tag={`PROJECT • ${proj.code}`}
                title={proj.name}
                brief={`Client: ${proj.clientName} • Quoted: ${formatCurrency(revenue, proj.currency)} • ${marginPct.toFixed(1)}% Margin`}
                actionLabel="OPEN PROJECT HOME"
                actionVariant="link"
                themeId={cardTheme.themeId}
                customGradient={cardTheme.customGradient}
                selected={isSelected}
                extraMeta={
                  marginAnalysis.isMarginBelowThreshold ? (
                    <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Low Margin ({marginAnalysis.netMarginPct.toFixed(1)}%)</span>
                    </div>
                  ) : undefined
                }
                onChangeTheme={(tId, grad) => handleUpdateCardTheme(proj.id, tId, grad)}
                onViewMargins={() => {
                  onSelectProject(proj);
                  onViewCostAnalysis(proj);
                }}
                onViewTimelines={() => {
                  onSelectProject(proj);
                  if (onViewTimelines) onViewTimelines(proj);
                }}
                onViewResources={() => {
                  onSelectProject(proj);
                  if (onViewResources) onViewResources(proj);
                }}
                onClick={() => {
                  onSelectProject(proj);
                  if (onNavigateToProjectHome) {
                    onNavigateToProjectHome(proj);
                  } else {
                    onViewCostAnalysis(proj);
                  }
                }}
                onAction={() => {
                  onSelectProject(proj);
                  if (onNavigateToProjectHome) {
                    onNavigateToProjectHome(proj);
                  } else {
                    onViewCostAnalysis(proj);
                  }
                }}
              />
            );
          })}
        </div>
      ) : (
        /* Projects Detailed Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((proj) => {
          const isSelected = selectedProject?.id === proj.id;
          const analytics = proj.analytics;
          const revenue = proj.quotedPrice;
          const marginPct = analytics?.grossMarginPct || proj.targetMarginPct;
          const marginAnalysis = calculateProjectProfitability(proj, marginThreshold);

          return (
            <div
              key={proj.id}
              className={`bg-white p-3 rounded border transition-all duration-150 shadow-sm flex flex-col justify-between ${
                isSelected
                  ? 'border-[#003049] ring-1 ring-[#003049]/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-normal text-[#003049] bg-[#fdf0d5] px-1.5 py-0.2 rounded border border-[#ecd5a8]">
                        {proj.code}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-normal uppercase ${
                        proj.contractLocked
                          ? 'bg-[#fdf0d5] text-[#780000] border border-[#ecd5a8]'
                          : 'bg-[#fdf0d5] text-[#003049] border border-[#ecd5a8]'
                      }`}>
                        {proj.contractLocked ? 'Locked / Signed' : proj.status}
                      </span>
                    </div>

                    <h3
                      onClick={() => {
                        onSelectProject(proj);
                        if (onNavigateToProjectHome) {
                          onNavigateToProjectHome(proj);
                        } else {
                          onViewCostAnalysis(proj);
                        }
                      }}
                      className="text-sm font-semibold text-slate-900 mt-1 cursor-pointer hover:text-[#0078d4] hover:underline"
                    >
                      {proj.name}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Client: <span className="text-slate-900 font-normal">{proj.clientName}</span> | Product: <span className="text-[#003049] font-normal">{proj.targetProduct}</span>
                    </p>
                  </div>

                  {/* Quoted Contract Value Tile */}
                  <div className="text-right bg-[#003049] text-white p-2 rounded shadow-xs min-w-[120px]">
                    <div className="text-[9px] text-[#fdf0d5] uppercase">Quoted Value</div>
                    <div className="text-sm font-normal text-white">${revenue.toLocaleString()}</div>
                    {marginAnalysis.isMarginBelowThreshold ? (
                      <div className="text-[10px] text-amber-300 mt-0.5 font-bold flex items-center justify-end space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0" />
                        <span>Margin: {marginPct.toFixed(1)}% (Low)</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#fdf0d5] mt-0.5">
                        Margin: {marginPct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories Breadcrumbs */}
                <div className="mt-2 p-1.5 rounded bg-[#fdf0d5]/40 border border-[#ecd5a8] text-[10px] text-slate-600 flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-[#003049]" />
                  <span className="text-slate-800 font-normal">{proj.productCategory}</span>
                  <span>&gt;</span>
                  <span>{proj.productSubCategory}</span>
                  <span>&gt;</span>
                  <span className="text-[#780000] font-normal">{proj.productMoreSubCategory}</span>
                </div>

                {/* Phases Snapshot (Tiles) */}
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-xs">
                  {(proj.phases || []).map((phase, idx) => (
                    <div key={phase.id} className="bg-[#fdf0d5]/40 p-1.5 rounded border border-[#ecd5a8]">
                      <div className="text-[9px] text-slate-600 truncate">Phase {idx + 1}: {phase.name.split(':')[0]}</div>
                      <div className="font-normal text-slate-900 mt-0.5 text-xs">${(Number(phase.budget) || 0).toLocaleString()}</div>
                      <div className="text-[9px] text-[#003049] mt-0.5 capitalize">{phase.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons & Scenario Comparer */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      if (onNavigateToProjectHome) {
                        onNavigateToProjectHome(proj);
                      } else {
                        onViewCostAnalysis(proj);
                      }
                    }}
                    className="px-2 py-0.5 text-xs font-semibold rounded bg-[#0078d4] hover:bg-[#006cbd] text-white transition-colors cursor-pointer"
                    title="Open Project Workspace"
                  >
                    Open Hub
                  </button>

                  <button
                    onClick={() => onSelectProject(proj)}
                    className={`px-2 py-0.5 text-xs font-normal rounded transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#003049] text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Select'}
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      onViewCostAnalysis(proj);
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#fdf0d5] hover:bg-[#f6e5be] text-[#003049] text-xs font-normal rounded border border-[#ecd5a8] transition-colors"
                    title="Marginal Profit Analysis"
                  >
                    <TrendingUp className="w-3 h-3 text-[#003049]" />
                    <span>Margins</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      if (onViewTimelines) onViewTimelines(proj);
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-normal rounded border border-sky-200 transition-colors"
                    title="Project Timelines & Gantt"
                  >
                    <Calendar className="w-3 h-3 text-sky-600" />
                    <span>Timelines</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      if (onViewResources) onViewResources(proj);
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-normal rounded border border-purple-200 transition-colors"
                    title="Resource Allocation"
                  >
                    <Users className="w-3 h-3 text-purple-600" />
                    <span>Resources</span>
                  </button>

                  <button
                    onClick={() => {
                      onSelectProject(proj);
                      setIsScenarioModalOpen(true);
                    }}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded transition-colors"
                    title="Compare alternative material & subcontractor specs for client negotiation"
                  >
                    <Sliders className="w-3 h-3 text-[#fdf0d5]" />
                    <span>Scenarios</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => toggleContractLock(proj)}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-normal transition-colors border ${
                      proj.contractLocked
                        ? 'bg-[#fdf0d5] text-[#780000] border-[#ecd5a8]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                    title={proj.contractLocked ? 'Click to unlock contract' : 'Lock down contract before final quote'}
                  >
                    {proj.contractLocked ? (
                      <>
                        <Lock className="w-3 h-3 text-[#780000]" />
                        <span>Locked</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3 h-3 text-slate-500" />
                        <span>Lock Contract</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onExportPDF(proj)}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-[#669bbc] hover:bg-[#5282a0] text-white font-normal rounded text-xs transition-colors"
                    title="Generate Professional Executive PDF Quote"
                  >
                    <FileDown className="w-3 h-3 text-white" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Alternative Scenario Negotiation Modal */}
      {isScenarioModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white border border-slate-300 rounded max-w-2xl w-full p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-normal text-slate-900 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#003049]" />
                  <span>Alternative Options & Negotiation Trade-offs</span>
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Evaluate alternative material specs & subcontractor rates for {selectedProject.clientName}.
                </p>
              </div>
              <button
                onClick={() => setIsScenarioModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 text-sm font-normal px-2 py-0.5"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
              {(selectedProject.alternativeOptions || []).map((opt) => (
                <div
                  key={opt.id}
                  className="bg-white p-2.5 rounded border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    {opt.isRecommended && (
                      <span className="text-[9px] font-normal text-[#003049] uppercase bg-[#fdf0d5] px-1.5 py-0.2 rounded border border-[#ecd5a8] mb-1.5 inline-block">
                        Recommended Base
                      </span>
                    )}
                    <h4 className="text-xs font-normal text-slate-900">{opt.title}</h4>
                    <p className="text-[10px] text-slate-600 mt-1 leading-snug">{opt.description}</p>

                    <div className="mt-2 space-y-1 pt-2 border-t border-slate-200 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Cost:</span>
                        <span className="font-normal text-slate-900">${opt.adjustedCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Quoted Price:</span>
                        <span className="font-normal text-[#003049]">${opt.adjustedPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Est. Margin:</span>
                        <span className="font-normal text-[#780000]">{opt.projectedMarginPct.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyAlternativeOption(selectedProject, opt)}
                    className="mt-2.5 w-full py-1 bg-[#003049] hover:bg-[#002235] text-white font-normal text-xs rounded transition-colors"
                  >
                    Apply Option
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsScenarioModalOpen(false)}
                className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-normal rounded border border-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white border border-slate-300 rounded max-w-xl w-full p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Create Project</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Project Code</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Client Name</label>
                  <input
                    type="text"
                    required
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    placeholder="Client Name"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-0.5 font-medium">Project Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Project Name"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>

              {/* Category Hierarchy */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Category</label>
                  <input
                    type="text"
                    required
                    value={form.productCategory}
                    onChange={(e) => setForm({ ...form, productCategory: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Sub Category</label>
                  <input
                    type="text"
                    required
                    value={form.productSubCategory}
                    onChange={(e) => setForm({ ...form, productSubCategory: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Sub Category 2</label>
                  <input
                    type="text"
                    required
                    value={form.productMoreSubCategory}
                    onChange={(e) => setForm({ ...form, productMoreSubCategory: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Target Product</label>
                  <input
                    type="text"
                    required
                    value={form.targetProduct}
                    onChange={(e) => setForm({ ...form, targetProduct: e.target.value })}
                    placeholder="Product Name"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049] font-medium"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">
                    Quoted Price ({SUPPORTED_CURRENCIES.find((c) => c.code === form.currency)?.symbol || '$'})
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={form.quotedPrice}
                    onChange={(e) => setForm({ ...form, quotedPrice: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Target Margin %</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form.targetMarginPct}
                    onChange={(e) => setForm({ ...form, targetMarginPct: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Overhead %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.overheadPct}
                    onChange={(e) => setForm({ ...form, overheadPct: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-0.5 font-medium">Contingency %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.contingencyPct}
                    onChange={(e) => setForm({ ...form, contingencyPct: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Theme Picker */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium">Theme</label>
                <ColorGradientPicker
                  selectedThemeId={form.themeId}
                  onSelectTheme={(themeId, customGrad) => {
                    setForm({ ...form, themeId, customGradient: customGrad });
                  }}
                />
              </div>

              {/* Live Preview */}
              <div>
                <div className="text-[10px] text-slate-500 mb-1">Preview:</div>
                <ModernTileCard
                  id="preview-proj"
                  tag={`PROJECT • ${form.code}`}
                  title={form.name || 'Project Name'}
                  brief={`Client: ${form.clientName || 'Client'} • Quoted: Rs. ${(Number(form.quotedPrice) || 0).toLocaleString()}`}
                  actionLabel="SELECT"
                  actionVariant="link"
                  themeId={form.themeId}
                  customGradient={form.customGradient}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-[#003049] hover:bg-[#002235] text-white font-medium rounded transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
