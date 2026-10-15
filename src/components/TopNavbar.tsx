import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Shield,
  Briefcase,
  LogOut,
  Building2,
  X,
  Sun,
  Moon,
  Barcode,
  Database,
  Download,
  Search,
  ChevronDown,
  Layers,
  Package,
  Boxes,
  Sliders,
  Users,
  FolderGit2,
  TrendingUp,
  Calendar,
  Activity,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Command,
  HelpCircle,
  Check,
  AlertTriangle
} from 'lucide-react';
import { NotificationCenterDropdown } from './NotificationCenterDropdown';
import { calculateProjectProfitability, getMarginThreshold } from '../utils/profitabilityMonitor';
import {
  AppUser,
  CompanyDetails,
  MaterialItem,
  ProduceItem,
  SubcontractorRateItem,
  OutsourcedService,
  Supplier,
  Project,
  InventoryItem
} from '../types';
import {
  getStoredThemeMode,
  setStoredThemeMode,
  isDarkEffective,
  ThemeMode,
  THEME_OPTIONS
} from '../services/themeService';
import { persistentDatabase } from '../services/persistentDatabase';
import {
  searchAllSystemRecords,
  GlobalSearchResult,
  SearchItemType
} from '../utils/systemGlobalSearch';
import {
  SUPPORTED_CURRENCIES,
  getStoredCurrency,
  setStoredCurrency,
  getCurrencyInfo
} from '../utils/currency';

export type ActiveTab =
  | 'home'
  | 'directory-hub'
  | 'project-home'
  | 'produce'
  | 'item-grid'
  | 'cost-analysis'
  | 'resource-allocation'
  | 'project-timelines'
  | 'materials'
  | 'suppliers'
  | 'outsourced'
  | 'subcontractors'
  | 'inventory'
  | 'projects'
  | 'audit-log'
  | 'settings';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: AppUser;
  onLogout: () => void;
  companyDetails: CompanyDetails;
  materials?: MaterialItem[];
  produceItems?: ProduceItem[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  suppliers?: Supplier[];
  projects?: Project[];
  inventory?: InventoryItem[];
  selectedProject?: Project | null;
  onSelectProject?: (project: Project) => void;
  onOpenProjectPicker?: (target?: 'margins' | 'timelines' | 'resources') => void;
  onGlobalSearchNavigate?: (tab: ActiveTab, searchResult: GlobalSearchResult) => void;
  showNotification?: (message: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  companyDetails,
  materials = [],
  produceItems = [],
  subcontractors = [],
  outsourcedServices = [],
  suppliers = [],
  projects = [],
  inventory = [],
  selectedProject,
  onSelectProject,
  onOpenProjectPicker,
  onGlobalSearchNavigate,
  showNotification
}) => {
  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const [isDark, setIsDark] = useState<boolean>(() => isDarkEffective());

  // Currency state
  const [activeCurrency, setActiveCurrency] = useState<string>(() => getStoredCurrency());
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(-1);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeMode(getStoredThemeMode());
      setIsDark(isDarkEffective());
    };
    const handleCurrencyChange = () => {
      setActiveCurrency(getStoredCurrency());
    };
    window.addEventListener('fxtt-theme-changed', handleThemeChange);
    window.addEventListener('fxtt-currency-changed', handleCurrencyChange);
    return () => {
      window.removeEventListener('fxtt-theme-changed', handleThemeChange);
      window.removeEventListener('fxtt-currency-changed', handleCurrencyChange);
    };
  }, []);

  // Margin threshold state & active project monitoring
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

  const activeProjectMarginAnalysis = useMemo(() => {
    if (!selectedProject) return null;
    return calculateProjectProfitability(selectedProject, marginThreshold);
  }, [selectedProject, marginThreshold]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    };
    if (isCurrencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCurrencyDropdownOpen]);

  // Global Keyboard shortcuts: '/' or 'Ctrl+K' / 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme dropdown state
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  // Close search dropdown and theme dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setStoredThemeMode(mode);
    setIsDark(isDarkEffective(mode));
    setIsThemeDropdownOpen(false);
  };

  // Execute global search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        results: [],
        countsByType: {
          material: 0,
          produce: 0,
          subcontractor: 0,
          outsourced: 0,
          supplier: 0,
          project: 0,
          inventory: 0
        },
        totalMatches: 0
      };
    }
    return searchAllSystemRecords({
      materials,
      produceItems,
      subcontractors,
      outsourcedServices,
      suppliers,
      projects,
      inventory,
      query: searchQuery,
      maxResults: 50
    });
  }, [
    searchQuery,
    materials,
    produceItems,
    subcontractors,
    outsourcedServices,
    suppliers,
    projects,
    inventory
  ]);

  const filteredResults = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return searchResults.results;
    }
    return searchResults.results.filter((r) => r.type === selectedCategoryFilter);
  }, [searchResults.results, selectedCategoryFilter]);

  // Handle Record Navigation & Notification
  const handleSelectRecord = (record: GlobalSearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSelectedResultIndex(-1);

    // If it's a project, activate project selection
    if (record.type === 'project' && onSelectProject && record.raw) {
      onSelectProject(record.raw);
    }

    // Call global navigation delegate if available
    if (onGlobalSearchNavigate) {
      onGlobalSearchNavigate(record.targetTab, record);
    } else {
      onSelectTab(record.targetTab);
    }

    // Notify user clearly that record was found and opened
    const notifyMsg = `Found & Opened [${record.code}] ${record.title} in ${record.typeLabel}!`;
    if (showNotification) {
      showNotification(notifyMsg);
    }
  };

  // Submit search via Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex((prev) =>
        prev < filteredResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex((prev) =>
        prev > 0 ? prev - 1 : filteredResults.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedResultIndex >= 0 && filteredResults[selectedResultIndex]) {
        handleSelectRecord(filteredResults[selectedResultIndex]);
      } else if (filteredResults.length === 1) {
        handleSelectRecord(filteredResults[0]);
      } else if (filteredResults.length > 1) {
        // Multi-match: navigate to Master Grid or first item's tab and notify
        const topItem = filteredResults[0];
        handleSelectRecord(topItem);
        if (showNotification) {
          showNotification(
            `Found ${searchResults.totalMatches} records matching "${searchQuery}". Opened top result: [${topItem.code}] ${topItem.title}.`
          );
        }
      } else {
        // Zero matches found: Notify the user explicitly
        if (showNotification) {
          showNotification(
            `No records found matching "${searchQuery}". Try searching by code, supplier, or product name.`
          );
        }
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  // Grouped Ribbon Tabs Configuration
  const isCatalogActive =
    activeTab === 'materials' ||
    activeTab === 'produce' ||
    activeTab === 'subcontractors' ||
    activeTab === 'outsourced' ||
    activeTab === 'suppliers';

  const isPlanningActive =
    activeTab === 'project-timelines' || activeTab === 'resource-allocation';

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'Home Command Hub';
      case 'directory-hub':
        return 'Directory Hub';
      case 'item-grid':
        return 'Master Data Grid';
      case 'projects':
        return 'Projects Portfolio';
      case 'cost-analysis':
        return 'Cost Analysis & Profitability';
      case 'project-home':
        return 'Project Workspace';
      case 'inventory':
        return 'Inventory & Procurement';
      case 'materials':
        return 'Materials & Parts Catalog';
      case 'produce':
        return 'Products & Assemblies (BOM)';
      case 'subcontractors':
        return 'Subcontractor Labor Rates';
      case 'outsourced':
        return 'Outsourced Finishing & Tariffs';
      case 'suppliers':
        return 'Suppliers & Vendors Directory';
      case 'project-timelines':
        return 'Project Timelines & Gantt';
      case 'resource-allocation':
        return 'Resource Allocation';
      case 'audit-log':
        return 'Enterprise Audit Trail';
      case 'settings':
        return 'System Settings';
      default:
        return 'System Portal';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 shadow-xs select-none">
      {/* =========================================================================
          TOP COMMAND & SEARCH BAR (SHAREPOINT / OFFICE RIBBON STYLE)
         ========================================================================= */}
      <div className="px-3 lg:px-6 py-2 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101b]">
        {/* Left: Brand Identity & Portal Title */}
        <div className="flex items-center space-x-3 shrink-0">
          {companyDetails.logoUrl ? (
            <img
              src={companyDetails.logoUrl}
              alt={companyDetails.name}
              className="h-8 max-h-9 w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#003049] text-white shadow-xs font-semibold text-xs tracking-tight">
              <Building2 className="w-4 h-4 text-white" />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-[#003049] dark:text-sky-400 font-bold text-sm tracking-tight whitespace-nowrap">
              {companyDetails.name || 'COST SYSTEM'}
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-semibold uppercase rounded bg-[#fdf0d5] text-[#780000] border border-[#e5d8b8] dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              Enterprise
            </span>
          </div>
        </div>

        {/* =========================================================================
            CENTER: OMNIPRESENT GLOBAL SEARCH BAR ACROSS ENTIRE SYSTEM
           ========================================================================= */}
        <div ref={searchContainerRef} className="flex-1 max-w-2xl relative mx-1 sm:mx-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              id="global-system-search-bar"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSelectedResultIndex(-1);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setIsSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search all materials, products, tariffs, suppliers, projects, inventory... (Press Enter or /)"
              className="w-full bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pl-9 pr-20 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#003049] dark:focus:border-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
            />

            {/* Right inside icons: Keyboard hint or clear button */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center space-x-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                  /
                </kbd>
              )}

              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) {
                    if (searchResults.totalMatches > 0) {
                      handleSelectRecord(searchResults.results[0]);
                      if (showNotification) {
                        showNotification(
                          `Found ${searchResults.totalMatches} records matching "${searchQuery}". Opened top result.`
                        );
                      }
                    } else {
                      if (showNotification) {
                        showNotification(`No records found matching "${searchQuery}".`);
                      }
                    }
                  }
                }}
                className="h-6 px-2 bg-[#003049] dark:bg-sky-600 hover:bg-[#002235] text-white text-[11px] font-semibold rounded flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Search Database"
              >
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              SEARCH RESULTS FLYOUT DROPDOWN (LIVE REAL-TIME MATCHES)
             ========================================================================= */}
          {isSearchOpen && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#0f172a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in-50 duration-150 max-h-[80vh] flex flex-col">
              {/* Dropdown Header with Counts */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {searchResults.totalMatches === 0
                        ? 'No Records Found'
                        : `Found ${searchResults.totalMatches} Records`}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">for "{searchQuery}"</span>
                </div>

                <div className="text-[10px] text-slate-400">
                  <span>Press </span>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    ↑
                  </kbd>
                  <kbd className="ml-0.5 px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    ↓
                  </kbd>
                  <span> to navigate, </span>
                  <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                    Enter
                  </kbd>
                  <span> to open</span>
                </div>
              </div>

              {/* Quick Type Filter Tabs */}
              {searchResults.totalMatches > 0 && (
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-1 overflow-x-auto no-scrollbar text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-[#003049] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    All ({searchResults.totalMatches})
                  </button>

                  {searchResults.countsByType.material > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('material')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'material'
                          ? 'bg-cyan-700 text-white'
                          : 'text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100/50 dark:hover:bg-cyan-950/40'
                      }`}
                    >
                      Materials ({searchResults.countsByType.material})
                    </button>
                  )}

                  {searchResults.countsByType.produce > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('produce')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'produce'
                          ? 'bg-purple-700 text-white'
                          : 'text-purple-800 dark:text-purple-300 hover:bg-purple-100/50 dark:hover:bg-purple-950/40'
                      }`}
                    >
                      Products ({searchResults.countsByType.produce})
                    </button>
                  )}

                  {searchResults.countsByType.subcontractor > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('subcontractor')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'subcontractor'
                          ? 'bg-amber-700 text-white'
                          : 'text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-950/40'
                      }`}
                    >
                      Subcontractors ({searchResults.countsByType.subcontractor})
                    </button>
                  )}

                  {searchResults.countsByType.outsourced > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('outsourced')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'outsourced'
                          ? 'bg-emerald-700 text-white'
                          : 'text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40'
                      }`}
                    >
                      Tariffs ({searchResults.countsByType.outsourced})
                    </button>
                  )}

                  {searchResults.countsByType.supplier > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('supplier')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'supplier'
                          ? 'bg-indigo-700 text-white'
                          : 'text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/40'
                      }`}
                    >
                      Suppliers ({searchResults.countsByType.supplier})
                    </button>
                  )}

                  {searchResults.countsByType.project > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('project')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'project'
                          ? 'bg-rose-700 text-white'
                          : 'text-rose-800 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      Projects ({searchResults.countsByType.project})
                    </button>
                  )}

                  {searchResults.countsByType.inventory > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('inventory')}
                      className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                        selectedCategoryFilter === 'inventory'
                          ? 'bg-teal-700 text-white'
                          : 'text-teal-800 dark:text-teal-300 hover:bg-teal-100/50 dark:hover:bg-teal-950/40'
                      }`}
                    >
                      Inventory ({searchResults.countsByType.inventory})
                    </button>
                  )}
                </div>
              )}

              {/* Results List */}
              <div className="overflow-y-auto max-h-[60vh] divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredResults.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No matching records found for "{searchQuery}"
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Try searching with keywords, item codes (e.g., MAT-ALU, PRJ-2026), vendor names, or product categories.
                    </p>
                  </div>
                ) : (
                  filteredResults.map((item, idx) => {
                    const isSelected = idx === selectedResultIndex;
                    return (
                      <div
                        key={`${item.type}-${item.id}-${idx}`}
                        onClick={() => handleSelectRecord(item)}
                        className={`p-3 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-slate-800/80 border-l-4 border-[#003049] dark:border-sky-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* Item Code & Title */}
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded border ${item.badgeBg} ${item.badgeTextCol} shrink-0 mt-0.5`}
                          >
                            {item.badgeText}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                {item.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {item.title}
                              </span>
                              {item.status && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                                  {item.status}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <span>{item.subtitle}</span>
                              <span>•</span>
                              <span className="text-slate-400">{item.details}</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Jump Action */}
                        <div className="flex items-center space-x-3 shrink-0">
                          {item.priceOrRate && (
                            <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                              {item.priceOrRate}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 font-medium group-hover:text-[#003049]">
                            <span>Jump</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              {filteredResults.length > 0 && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Click any record or press Enter to immediately navigate and inspect.
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    ESC to close
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Scanner Status, Dark Mode Toggle, Backup, User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* Global Barcode Scanner Status Pill */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-semibold shadow-2xs"
            title="Global Keyboard Wedge & Handheld Barcode Scanner active. Pull trigger or scan anytime to lookup."
          >
            <Barcode className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Scanner Ready</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>

          {/* Theme Mode Dropdown (Blue Night, Black, Red, Forest, Cream, Light) */}
          <div className="relative" ref={themeDropdownRef}>
            <button
              type="button"
              id="theme-dropdown-btn"
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs"
              title="Select Color Theme"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300 dark:border-slate-600"
                style={{
                  backgroundColor: THEME_OPTIONS.find((t) => t.id === themeMode)?.swatch || '#ffffff'
                }}
              />
              <span className="text-[11px] font-semibold hidden sm:inline">
                {THEME_OPTIONS.find((t) => t.id === themeMode)?.shortLabel || 'Theme'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isThemeDropdownOpen && (
              <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Theme
                </div>
                {THEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTheme(opt.id)}
                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      themeMode === opt.id
                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300 dark:border-slate-600 shadow-2xs"
                        style={{ backgroundColor: opt.swatch }}
                      />
                      <span>{opt.shortLabel}</span>
                    </div>
                    {themeMode === opt.id && <Check className="w-3 h-3 text-blue-600 dark:text-sky-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Currency Selector Dropdown */}
          <div className="relative" ref={currencyDropdownRef}>
            <button
              type="button"
              id="currency-dropdown-btn"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              title="Select Active Currency"
            >
              <span className="font-mono font-bold text-[#003049] dark:text-sky-400 text-xs">
                {getCurrencyInfo(activeCurrency).symbol}
              </span>
              <span className="text-[11px] font-bold">
                {activeCurrency}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in-50 duration-100 max-h-72 overflow-y-auto">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Select Currency
                </div>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setStoredCurrency(c.code);
                      setActiveCurrency(c.code);
                      setIsCurrencyDropdownOpen(false);
                      if (showNotification) {
                        showNotification(`Active currency set to ${c.code} (${c.symbol})`);
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      activeCurrency === c.code
                        ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-mono font-bold w-6 text-center text-[#003049] dark:text-sky-400 shrink-0">
                        {c.symbol}
                      </span>
                      <span className="truncate">{c.code} - {c.name}</span>
                    </div>
                    {activeCurrency === c.code && <Check className="w-3 h-3 text-blue-600 dark:text-sky-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification & Margin Alert Center */}
          <NotificationCenterDropdown
            projects={projects}
            inventory={inventory}
            selectedProject={selectedProject}
            onSelectProject={onSelectProject}
            onNavigateToTab={onSelectTab}
          />

          {/* Quick Database Backup Button */}
          <button
            type="button"
            onClick={() => {
              persistentDatabase.exportCompleteDatabase(true);
              if (showNotification) {
                showNotification('Complete database JSON backup downloaded.');
              }
            }}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs"
            title="Download complete database JSON backup"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-semibold hidden lg:inline">Backup DB</span>
          </button>

          {/* Logo in Right Corner if selected */}
          {companyDetails.logoPosition === 'right' && companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt={companyDetails.name}
              className="h-8 max-w-[140px] object-contain rounded p-0.5 border border-slate-200 dark:border-slate-700 bg-white shadow-2xs hidden md:block"
              referrerPolicy="no-referrer"
            />
          )}

          {/* Logged in User Capsule */}
          <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 sm:px-2.5 py-1 shadow-2xs">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{currentUser.employeeId}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {currentUser.role === 'ADMIN' ? 'Admin' : 'Project Mgr'}
                  </span>
                </div>
              </div>

              <div className="ml-1">
                {currentUser.role === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden md:inline">Admin</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span className="hidden md:inline">PM</span>
                  </span>
                )}
              </div>
            </div>

            {/* Logout / Switch User Button */}
            <button
              type="button"
              onClick={onLogout}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 shadow-2xs transition-colors cursor-pointer"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIBBON NAVIGATION BAR (FULL COMPREHENSIVE ENTERPRISE SYSTEM TABS)
         ========================================================================= */}
      <div className="px-3 lg:px-6 flex items-center justify-between overflow-x-auto no-scrollbar bg-slate-50/80 dark:bg-[#070b12] border-t border-slate-100 dark:border-slate-800/80">
        <nav className="flex items-center space-x-1 py-1.5 text-xs font-medium" aria-label="Ribbon Navigation">
          {/* Home Tab */}
          <button
            type="button"
            id="nav-tab-home"
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'home'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Home</span>
          </button>

          {/* Directory */}
          <button
            type="button"
            id="nav-tab-directory-hub"
            onClick={() => onSelectTab('directory-hub')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'directory-hub'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Directory</span>
          </button>

          {/* Master Grid */}
          <button
            type="button"
            id="nav-tab-item-grid"
            onClick={() => onSelectTab('item-grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'item-grid'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Master Grid</span>
          </button>

          {/* Projects Portfolio */}
          <button
            type="button"
            id="nav-tab-projects"
            onClick={() => onSelectTab('projects')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'projects' || activeTab === 'project-home'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          {/* Margins */}
          <button
            type="button"
            id="nav-tab-cost-analysis"
            onClick={() => {
              onSelectTab('cost-analysis');
              if (!selectedProject && onOpenProjectPicker) {
                onOpenProjectPicker('margins');
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'cost-analysis'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Margins</span>
          </button>

          {/* Timelines */}
          <button
            type="button"
            id="nav-tab-project-timelines"
            onClick={() => {
              onSelectTab('project-timelines');
              if (!selectedProject && onOpenProjectPicker) {
                onOpenProjectPicker('timelines');
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'project-timelines'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Timelines</span>
          </button>

          {/* Resources */}
          <button
            type="button"
            id="nav-tab-resource-allocation"
            onClick={() => {
              onSelectTab('resource-allocation');
              if (!selectedProject && onOpenProjectPicker) {
                onOpenProjectPicker('resources');
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'resource-allocation'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Resources</span>
          </button>

          {/* Inventory & Stock Movements */}
          <button
            type="button"
            id="nav-tab-inventory"
            onClick={() => onSelectTab('inventory')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'inventory'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Inventory</span>
          </button>

          {/* Audit Log (Admin Only) */}
          {currentUser.role === 'ADMIN' && (
            <button
              type="button"
              id="nav-tab-audit-log"
              onClick={() => onSelectTab('audit-log')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'audit-log'
                  ? 'bg-[#003049] text-white shadow-2xs'
                  : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Audit Log</span>
            </button>
          )}

          {/* Settings */}
          <button
            type="button"
            id="nav-tab-settings"
            onClick={() => onSelectTab('settings')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'settings'
                ? 'bg-[#003049] text-white shadow-2xs'
                : 'text-slate-700 dark:text-slate-300 hover:text-[#003049] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>Settings</span>
          </button>
        </nav>

        {/* Current Active Project & Active Section Breadcrumb pill on far right */}
        <div className="hidden lg:flex items-center space-x-2 text-xs py-1">
          {selectedProject && (
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-[#fdf0d5] dark:bg-amber-950/50 text-[#003049] dark:text-amber-200 border border-[#ecd5a8] dark:border-amber-800 text-[11px] font-semibold">
              <span className="font-mono text-[#003049] dark:text-sky-300">{selectedProject.code}</span>
              <span className="truncate max-w-[130px]">{selectedProject.name}</span>

              {activeProjectMarginAnalysis?.isMarginBelowThreshold && (
                <button
                  type="button"
                  onClick={() => onSelectTab('cost-analysis')}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-[10px] font-bold cursor-pointer hover:bg-amber-500/30 transition-colors"
                  title={`Net Margin ${activeProjectMarginAnalysis.netMarginPct.toFixed(1)}% is below ${marginThreshold}% target limit`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>Margin {activeProjectMarginAnalysis.netMarginPct.toFixed(1)}%</span>
                </button>
              )}

              {onOpenProjectPicker && (
                <button
                  type="button"
                  onClick={() => onOpenProjectPicker()}
                  className="ml-1 text-[10px] text-blue-700 dark:text-sky-300 hover:underline cursor-pointer font-bold"
                  title="Select / Change Project"
                >
                  Change
                </button>
              )}
            </div>
          )}
          <span className="text-slate-400 text-[11px]">Active View:</span>
          <span className="px-2.5 py-0.5 rounded-md bg-[#003049]/10 dark:bg-sky-950/60 text-[#003049] dark:text-sky-300 border border-[#003049]/20 font-bold text-[11px]">
            {getActiveTabTitle()}
          </span>
        </div>
      </div>
    </header>
  );
};
