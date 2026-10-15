import React, { useState, useMemo, useEffect } from 'react';
import {
  Grid,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MapPin,
  ArrowRight,
  ShieldCheck,
  LayoutGrid,
  Boxes,
  Barcode,
  Sliders,
  TrendingUp,
  FileText,
  FolderGit2,
  Package,
  Activity,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  FileSpreadsheet,
  Trash2,
  Bell,
  Target,
  Flag
} from 'lucide-react';
import {
  Project,
  MaterialItem,
  Supplier,
  SupplierContract,
  OutsourcedService,
  SubcontractorRateItem,
  ProduceItem,
  InventoryItem,
  CompanyDetails,
  AppUser,
  CalendarEvent
} from '../types';
import { ActiveTab } from './TopNavbar';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { persistentDatabase } from '../services/persistentDatabase';
import {
  exportAllPriceHistoriesToCSV,
  exportSubcontractorsToCSV,
  exportInventoryToCSV,
  exportMaterialsToCSV
} from '../utils/csvExport';

interface HomeCommandViewProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
  materials: MaterialItem[];
  suppliers: Supplier[];
  outsourcedServices: OutsourcedService[];
  subcontractors: SubcontractorRateItem[];
  produceItems: ProduceItem[];
  inventory: InventoryItem[];
  onNavigateTab: (tabId: ActiveTab) => void;
  onAddMaterial: (mat: Partial<MaterialItem>) => void;
  onAddSupplier: (sup: Partial<Supplier>) => void;
  onAddSubcontractor: (sub: Partial<SubcontractorRateItem>) => void;
  onAddOutsourcedService: (srv: Partial<OutsourcedService>) => void;
  onAddProduceItem: (prd: Partial<ProduceItem>) => void;
  onAddInventory: (inv: Partial<InventoryItem>) => void;
  onAddProject: (proj: Partial<Project>) => void;
  onUpdateProject: (proj: Project) => void;
  onAddSupplierContract?: (supplierId: string, contract: Partial<SupplierContract>) => void;
  onRefreshAnalytics: () => void;
  onExportPDF: (project?: Project) => void;
  showToast: (msg: string) => void;
  companyDetails?: CompanyDetails;
  currentUser?: AppUser | null;
}

interface NewsAndAlertItem {
  id: string;
  title: string;
  tag: string;
  date: string;
  metric: string;
}


export const HomeCommandView: React.FC<HomeCommandViewProps> = ({
  projects = [],
  selectedProject,
  onSelectProject,
  materials = [],
  suppliers = [],
  outsourcedServices = [],
  subcontractors = [],
  produceItems = [],
  inventory = [],
  onNavigateTab,
  onAddMaterial,
  onAddSupplier,
  onAddSubcontractor,
  onAddOutsourcedService,
  onAddProduceItem,
  onAddInventory,
  onAddProject,
  onUpdateProject,
  onExportPDF,
  showToast,
  companyDetails,
  currentUser
}) => {
  // Navigation & Interactive States
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState(false);
  const [isPortfoliosMenuOpen, setIsPortfoliosMenuOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Modals
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<NewsAndAlertItem | null>(null);

  // Direct Creation Portal / Modal State for "New" action buttons
  const [creationPortalType, setCreationPortalType] = useState<
    'project' | 'material' | 'supplier' | 'subcontractor' | 'tariff' | 'produce' | null
  >(null);

  // Creation Form Fields
  // Project
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjPrice, setNewProjPrice] = useState(350000);
  const [newProjMargin, setNewProjMargin] = useState(35);

  // Material
  const [newMatName, setNewMatName] = useState('');
  const [newMatCode, setNewMatCode] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('Raw Materials');
  const [newMatUnit, setNewMatUnit] = useState('kg');
  const [newMatCost, setNewMatCost] = useState(1500);
  const [newMatSupplierId, setNewMatSupplierId] = useState('');

  // Supplier
  const [newSupName, setNewSupName] = useState('');
  const [newSupCategory, setNewSupCategory] = useState('Raw Materials');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupCity, setNewSupCity] = useState('');

  // Subcontractor
  const [newSubName, setNewSubName] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('Precision CNC Machining');
  const [newSubRate, setNewSubRate] = useState(3800);
  const [newSubUnit, setNewSubUnit] = useState('hr');
  const [newSubSkill, setNewSubSkill] = useState('Certified Master Specialist');

  // Tariff (Outsourced)
  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffProvider, setNewTariffProvider] = useState('');
  const [newTariffCategory, setNewTariffCategory] = useState('Surface Treatment & Coating');
  const [newTariffRate, setNewTariffRate] = useState(1250);
  const [newTariffUnit, setNewTariffUnit] = useState('sq ft');

  // Product
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Precision Sub-Assemblies');
  const [newProdPrice, setNewProdPrice] = useState(48500);

  // Dynamic Calendar State (October 15, 2026 local system time)
  const [calYear, setCalYear] = useState<number>(2026);
  const [calMonth, setCalMonth] = useState<number>(9); // 0-based: 9 = October
  const [selectedDay, setSelectedDay] = useState<number>(15);
  const [isCalendarListView, setIsCalendarListView] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [calendarSourceFilter, setCalendarSourceFilter] = useState<'all' | 'milestones' | 'events'>('all');

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');
  const [newEventCategory, setNewEventCategory] = useState<'Audit' | 'Review' | 'Phase' | 'Stock' | 'Tariff'>('Audit');
  const [newEventLocation, setNewEventLocation] = useState('Room 101');

  // Interactive Calendar Events List persisted in persistentDatabase
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => persistentDatabase.getCalendarEvents());

  // Database live counts with guaranteed fallback so they never show 0
  const projectList = projects && projects.length > 0 ? projects : persistentDatabase.getProjects();
  const materialList = materials && materials.length > 0 ? materials : persistentDatabase.getMaterials();
  const supplierList = suppliers && suppliers.length > 0 ? suppliers : persistentDatabase.getSuppliers();
  const subcontractorList = subcontractors && subcontractors.length > 0 ? subcontractors : persistentDatabase.getSubcontractors();
  const tariffList = outsourcedServices && outsourcedServices.length > 0 ? outsourcedServices : persistentDatabase.getOutsourced();
  const inventoryList = inventory && inventory.length > 0 ? inventory : persistentDatabase.getInventory();

  useEffect(() => {
    const handleRestored = () => {
      setCalendarEvents(persistentDatabase.getCalendarEvents());
    };
    window.addEventListener('fxtt-database-restored', handleRestored);
    return () => window.removeEventListener('fxtt-database-restored', handleRestored);
  }, []);

  // News and Alerts (Simple words only, NO descriptions)
  const newsAndAlerts: NewsAndAlertItem[] = [
    {
      id: 'alert-01',
      tag: 'Tariff',
      title: 'Tariff Update',
      date: 'Oct 14, 2026',
      metric: '98.5%'
    },
    {
      id: 'alert-02',
      tag: 'Pricing',
      title: 'Price Check',
      date: 'Oct 10, 2026',
      metric: '+5%'
    },
    {
      id: 'alert-03',
      tag: 'Vendor',
      title: 'Vendor Review',
      date: 'Oct 05, 2026',
      metric: '99.2%'
    },
    {
      id: 'alert-04',
      tag: 'Audit',
      title: 'Safety Check',
      date: 'Oct 01, 2026',
      metric: 'Passed'
    }
  ];

  // Quick Links accurately linked to their modules
  const quickLinksData = [
    {
      id: 'ql-projects',
      word: 'Projects',
      icon: <FolderGit2 className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('projects')
    },
    {
      id: 'ql-materials',
      word: 'Materials',
      icon: <Package className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('materials')
    },
    {
      id: 'ql-suppliers',
      word: 'Suppliers',
      icon: <Building2 className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('suppliers')
    },
    {
      id: 'ql-subcontractors',
      word: 'Subcontractors',
      icon: <Users className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('subcontractors')
    },
    {
      id: 'ql-tariffs',
      word: 'Tariffs',
      icon: <Sliders className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('outsourced')
    },
    {
      id: 'ql-produce',
      word: 'Products',
      icon: <CheckCircle2 className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('produce')
    },
    {
      id: 'ql-inventory',
      word: 'Inventory',
      icon: <Boxes className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('inventory')
    },
    {
      id: 'ql-grid',
      word: 'Grid',
      icon: <FileSpreadsheet className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('item-grid')
    },
    {
      id: 'ql-margins',
      word: 'Margins',
      icon: <TrendingUp className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('cost-analysis')
    },
    {
      id: 'ql-timelines',
      word: 'Timelines',
      icon: <Calendar className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('project-timelines')
    },
    {
      id: 'ql-resources',
      word: 'Resources',
      icon: <Activity className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('resource-allocation')
    },
    {
      id: 'ql-scanner',
      word: 'Scanner',
      icon: <Barcode className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => setIsScannerModalOpen(true)
    },
    {
      id: 'ql-directory',
      word: 'Directory',
      icon: <LayoutGrid className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('directory-hub')
    },
    {
      id: 'ql-audits',
      word: 'Audits',
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => onNavigateTab('audit-log')
    },
    {
      id: 'ql-reports',
      word: 'Reports',
      icon: <FileText className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#0078d4]',
      action: () => setIsReportsModalOpen(true)
    },
    {
      id: 'ql-settings',
      word: 'Settings',
      icon: <Sliders className="w-5 h-5 text-white" />,
      badgeColor: 'bg-[#003049]',
      action: () => onNavigateTab('settings')
    }
  ];

  // System Modules List for Quick Launcher
  const systemModulesList = [
    { name: 'Master Data Grid', action: () => onNavigateTab('item-grid') },
    { name: 'Materials Catalog', action: () => onNavigateTab('materials') },
    { name: 'Subcontractor Rates', action: () => onNavigateTab('subcontractors') },
    { name: 'Outsourced Tariffs', action: () => onNavigateTab('outsourced') },
    { name: 'Products & Assemblies', action: () => onNavigateTab('produce') },
    { name: 'Cost Analysis', action: () => onNavigateTab('cost-analysis') },
    { name: 'Project Timelines', action: () => onNavigateTab('project-timelines') },
    { name: 'Resource Allocation', action: () => onNavigateTab('resource-allocation') },
    { name: 'Inventory & Stock', action: () => onNavigateTab('inventory') },
    { name: 'Suppliers Directory', action: () => onNavigateTab('suppliers') },
    { name: 'Barcode Scanner Hub', action: () => setIsScannerModalOpen(true) },
    { name: 'Audit Trail', action: () => onNavigateTab('audit-log') },
    { name: 'Settings', action: () => onNavigateTab('settings') }
  ];

  // Calendar calculations
  const monthName = useMemo(() => {
    return new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    const newMonth = calMonth === 0 ? 11 : calMonth - 1;
    const newYear = calMonth === 0 ? calYear - 1 : calYear;
    setCalMonth(newMonth);
    setCalYear(newYear);
    const maxDays = new Date(newYear, newMonth + 1, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleNextMonth = () => {
    const newMonth = calMonth === 11 ? 0 : calMonth + 1;
    const newYear = calMonth === 11 ? calYear + 1 : calYear;
    setCalMonth(newMonth);
    setCalYear(newYear);
    const maxDays = new Date(newYear, newMonth + 1, 0).getDate();
    if (selectedDay > maxDays) setSelectedDay(maxDays);
  };

  const handleJumpToToday = () => {
    setCalYear(2026);
    setCalMonth(9);
    setSelectedDay(15);
    showToast('Jumped to Today: October 15, 2026');
  };

  // Dynamically derive project milestones across all active projects
  const projectMilestoneEvents = useMemo(() => {
    const list: Array<{
      id: string;
      year: number;
      month: number;
      day: number;
      time: string;
      title: string;
      location: string;
      category: 'Deadline' | 'Phase' | 'Deliverable';
      badgeColor: string;
      isProjectMilestone: boolean;
      project: Project;
      phaseName?: string;
      budget?: number;
      dateStr: string;
    }> = [];

    projectList.forEach((proj) => {
      // 1. Overall Delivery Deadline
      if (proj.deliveryDeadline) {
        const parts = proj.deliveryDeadline.split('-');
        if (parts.length >= 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          list.push({
            id: `pme-deadline-${proj.id}`,
            year: y,
            month: m,
            day: d,
            time: '5:00 PM',
            title: `${proj.code} Delivery Deadline`,
            location: `Client: ${proj.clientName}`,
            category: 'Deadline',
            badgeColor: 'bg-rose-500',
            isProjectMilestone: true,
            project: proj,
            dateStr: proj.deliveryDeadline
          });
        }
      }

      // 2. Key Phase Completion Dates
      (proj.phases || []).forEach((ph) => {
        if (ph.endDate) {
          const parts = ph.endDate.split('-');
          if (parts.length >= 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            list.push({
              id: `pme-phase-end-${ph.id}`,
              year: y,
              month: m,
              day: d,
              time: '4:00 PM',
              title: `${proj.code} ${ph.name}`,
              location: `Phase Status: ${ph.status}`,
              category: 'Phase',
              badgeColor: 'bg-[#0078d4]',
              isProjectMilestone: true,
              project: proj,
              phaseName: ph.name,
              budget: Number(ph.budget) || 0,
              dateStr: ph.endDate
            });
          }
        }
      });
    });

    return list;
  }, [projectList]);

  // Unified items (Company events + Project Milestones)
  const allDisplayEvents = useMemo(() => {
    if (calendarSourceFilter === 'milestones') {
      return projectMilestoneEvents;
    }
    if (calendarSourceFilter === 'events') {
      return calendarEvents.map(e => ({
        ...e,
        isProjectMilestone: false,
        dateStr: `${e.year}-${String(e.month + 1).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`
      }));
    }
    return [
      ...calendarEvents.map(e => ({
        ...e,
        isProjectMilestone: false,
        dateStr: `${e.year}-${String(e.month + 1).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`
      })),
      ...projectMilestoneEvents
    ];
  }, [calendarEvents, projectMilestoneEvents, calendarSourceFilter]);

  const calendarCells = useMemo(() => {
    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      hasEvent: boolean;
      hasDeadline: boolean;
      hasPhase: boolean;
      eventCount: number;
    }> = [];
    const daysInCurrentMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    // Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        hasEvent: false,
        hasDeadline: false,
        hasPhase: false,
        eventCount: 0
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const itemsOnDay = allDisplayEvents.filter(
        (e) => e.year === calYear && e.month === calMonth && e.day === d
      );
      const hasDeadline = itemsOnDay.some(i => i.category === 'Deadline');
      const hasPhase = itemsOnDay.some(i => i.category === 'Phase');
      cells.push({
        day: d,
        isCurrentMonth: true,
        hasEvent: itemsOnDay.length > 0,
        hasDeadline,
        hasPhase,
        eventCount: itemsOnDay.length
      });
    }

    // Next month leading days to complete grid (up to 35 or 42)
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        hasEvent: false,
        hasDeadline: false,
        hasPhase: false,
        eventCount: 0
      });
    }

    return cells;
  }, [calYear, calMonth, allDisplayEvents]);

  const selectedDayEvents = allDisplayEvents.filter(
    (e) => e.year === calYear && e.month === calMonth && e.day === selectedDay
  );

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEv: CalendarEvent = {
      id: `ev-${Date.now()}`,
      year: calYear,
      month: calMonth,
      day: selectedDay,
      time: newEventTime.trim() || '10:00 AM',
      title: newEventTitle.trim(),
      location: newEventLocation.trim() || 'Room 101',
      category: newEventCategory,
      badgeColor:
        newEventCategory === 'Tariff'
          ? 'bg-emerald-500'
          : newEventCategory === 'Review'
          ? 'bg-blue-600'
          : newEventCategory === 'Phase'
          ? 'bg-amber-500'
          : newEventCategory === 'Stock'
          ? 'bg-teal-600'
          : 'bg-purple-600'
    };

    persistentDatabase.addCalendarEvent(newEv);
    setCalendarEvents(persistentDatabase.getCalendarEvents());
    setIsAddEventModalOpen(false);
    setNewEventTitle('');
    showToast(`Event added: ${newEv.title}`);
  };

  const handleDeleteEvent = (id: string) => {
    persistentDatabase.deleteCalendarEvent(id);
    setCalendarEvents(persistentDatabase.getCalendarEvents());
    showToast('Event removed.');
  };

  return (
    <div className="space-y-4 pb-16 font-sans select-none">
      {/* =========================================================================
          1. CLEAN ENTERPRISE ACTION BAR (REPLACED DUPLICATE MARKED HEADER)
         ========================================================================= */}
      <div className="bg-white dark:bg-[#0b101b] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          {/* Portfolios Quick Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPortfoliosMenuOpen(!isPortfoliosMenuOpen);
                setIsModulesMenuOpen(false);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>Portfolios</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isPortfoliosMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-[#0f172a] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-in fade-in">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  Select Project
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setIsPortfoliosMenuOpen(false);
                      onSelectProject(proj);
                      onNavigateTab('cost-analysis');
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#0078d4] cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium truncate">{proj.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{proj.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modules Quick Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsModulesMenuOpen(!isModulesMenuOpen);
                setIsPortfoliosMenuOpen(false);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>Modules</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isModulesMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-60 bg-white dark:bg-[#0f172a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-in fade-in text-xs max-h-[75vh] overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  System Portals
                </div>
                {systemModulesList.map((mod) => (
                  <button
                    key={mod.name}
                    type="button"
                    onClick={() => {
                      setIsModulesMenuOpen(false);
                      mod.action();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span>{mod.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Database Synced</span>
        </div>
      </div>

      {/* =========================================================================
          2. NEW & ALERTS (REPLACED MARKED CAROUSEL AREA) + SYSTEM METRICS
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* NEW & ALERTS ACTION HUB */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  New &amp; Alerts
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Active
              </span>
            </div>

            {/* Quick Actions (New) */}
            <div className="mb-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Create New Record</span>
                <span className="text-[10px] text-slate-400 font-normal">Instant Portals</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  id="btn-create-project"
                  onClick={() => {
                    setNewProjName('');
                    setNewProjCode(`PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
                    setNewProjClient('Apex Corporation');
                    setNewProjPrice(350000);
                    setNewProjMargin(35);
                    setCreationPortalType('project');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Project</span>
                </button>

                <button
                  type="button"
                  id="btn-create-material"
                  onClick={() => {
                    setNewMatName('');
                    setNewMatCode(`MAT-${Math.floor(1000 + Math.random() * 9000)}`);
                    setNewMatCategory('Metals & Alloys');
                    setNewMatUnit('kg');
                    setNewMatCost(1500);
                    setNewMatSupplierId(suppliers[0]?.id || '');
                    setCreationPortalType('material');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>+ Material</span>
                </button>

                <button
                  type="button"
                  id="btn-create-supplier"
                  onClick={() => {
                    setNewSupName('');
                    setNewSupCategory('Raw Materials & Alloys');
                    setNewSupContact('Procurement Manager');
                    setNewSupEmail('sales@vendor.com');
                    setNewSupPhone('+94 11 234 5678');
                    setNewSupCity('Colombo');
                    setCreationPortalType('supplier');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Supplier</span>
                </button>

                <button
                  type="button"
                  id="btn-create-subcontractor"
                  onClick={() => {
                    setNewSubName('');
                    setNewSubCategory('CNC Precision Machining');
                    setNewSubRate(3800);
                    setNewSubUnit('hr');
                    setNewSubSkill('Master Journeyman Specialist');
                    setCreationPortalType('subcontractor');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-purple-600" />
                  <span>+ Subcontractor</span>
                </button>

                <button
                  type="button"
                  id="btn-create-tariff"
                  onClick={() => {
                    setNewTariffName('');
                    setNewTariffProvider(suppliers[0]?.name || 'Industrial Finishing Ltd');
                    setNewTariffCategory('Surface Treatment & Anodizing');
                    setNewTariffRate(1250);
                    setNewTariffUnit('sq ft');
                    setCreationPortalType('tariff');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-600" />
                  <span>+ Tariff</span>
                </button>

                <button
                  type="button"
                  id="btn-create-product"
                  onClick={() => {
                    setNewProdName('');
                    setNewProdCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
                    setNewProdCategory('Precision Assemblies');
                    setNewProdPrice(55000);
                    setCreationPortalType('produce');
                  }}
                  className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-pink-600" />
                  <span>+ Product</span>
                </button>

                <button
                  type="button"
                  id="btn-create-event"
                  onClick={() => setIsAddEventModalOpen(true)}
                  className="col-span-2 sm:col-span-3 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer border border-dashed border-slate-300 dark:border-slate-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#0078d4]" />
                  <span>+ Schedule Calendar Milestone / Event</span>
                </button>
              </div>
            </div>

            {/* Alerts List (Simple Words Only, No Descriptions) */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Alerts
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {newsAndAlerts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedAlert(item)}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-blue-400 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#0078d4] dark:text-sky-300">
                        {item.tag}
                      </span>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                        {item.title}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {item.metric}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: SYSTEM METRICS (SIMPLE WORDS ONLY) */}
        <div className="lg:col-span-6 bg-gradient-to-r from-[#001f3f] via-[#002f5e] to-[#004e8a] rounded-xl border border-blue-900 p-5 relative overflow-hidden flex flex-col justify-between text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Database Records
              </div>
              <div className="text-xl font-black text-white uppercase tracking-tight mt-0.5">
                Cost &amp; Planning System
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('cost-analysis')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center space-x-1"
            >
              <span>Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div
              onClick={() => onNavigateTab('projects')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Projects</div>
              <div className="text-xl font-bold text-white mt-0.5">{projectList.length}</div>
            </div>
            <div
              onClick={() => onNavigateTab('materials')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Materials</div>
              <div className="text-xl font-bold text-amber-300 mt-0.5">{materialList.length}</div>
            </div>
            <div
              onClick={() => onNavigateTab('suppliers')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Suppliers</div>
              <div className="text-xl font-bold text-emerald-300 mt-0.5">{supplierList.length}</div>
            </div>
            <div
              onClick={() => onNavigateTab('subcontractors')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Subcontractors</div>
              <div className="text-xl font-bold text-sky-300 mt-0.5">{subcontractorList.length}</div>
            </div>
            <div
              onClick={() => onNavigateTab('outsourced')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Tariffs</div>
              <div className="text-xl font-bold text-purple-300 mt-0.5">{tariffList.length}</div>
            </div>
            <div
              onClick={() => onNavigateTab('inventory')}
              className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/15 cursor-pointer text-center transition-colors"
            >
              <div className="text-xs text-blue-200 font-medium">Inventory</div>
              <div className="text-xl font-bold text-cyan-300 mt-0.5">{inventoryList.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. QUICK LINKS (LINKED PROPERLY TO ALL PORTALS)
         ========================================================================= */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
            Quick Links
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Fast Access
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickLinksData.map((ql) => (
            <button
              key={ql.id}
              type="button"
              id={`quick-link-${ql.word.toLowerCase()}`}
              onClick={ql.action}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-blue-400 dark:hover:border-sky-500 hover:shadow-md transition-all flex items-center space-x-3 cursor-pointer text-left group"
            >
              <div className={`w-9 h-9 rounded-lg ${ql.badgeColor} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
                {ql.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0078d4] dark:group-hover:text-sky-400 transition-colors truncate">
                  {ql.word}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          4. NEWS AND ALERTS & COMPANY CALENDAR
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* ===================== LEFT: NEWS AND ALERTS (SIMPLE WORDS ONLY) ===================== */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#0078d4]" />
              <span>News and Alerts</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Live Feed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {newsAndAlerts.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedAlert(item)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-300 dark:hover:border-sky-500 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950/70 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                      {item.tag}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.date}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#0078d4] dark:group-hover:text-sky-400 transition-colors truncate">
                    {item.title}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {item.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== RIGHT: COMPANY & PROJECT MILESTONES CALENDAR ===================== */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#0078d4]" />
                <span>Calendar &amp; Milestones</span>
              </h3>
            </div>

            <div className="flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={handleJumpToToday}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
                title="Jump to Today (Oct 15)"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 px-1 whitespace-nowrap">
                {monthName}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCalendarListView(!isCalendarListView)}
                className={`p-1 rounded cursor-pointer ${
                  isCalendarListView ? 'bg-blue-100 text-[#0078d4]' : 'hover:bg-slate-100 text-slate-500'
                }`}
                title={isCalendarListView ? 'Grid View' : 'List View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills for Calendar Scope */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setCalendarSourceFilter('all')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-colors cursor-pointer text-[11px] ${
                calendarSourceFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Items ({calendarEvents.length + projectMilestoneEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setCalendarSourceFilter('milestones')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-colors cursor-pointer text-[11px] ${
                calendarSourceFilter === 'milestones'
                  ? 'bg-white dark:bg-slate-900 text-[#0078d4] dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Milestones ({projectMilestoneEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setCalendarSourceFilter('events')}
              className={`flex-1 py-1 px-2 rounded-md font-semibold text-center transition-colors cursor-pointer text-[11px] ${
                calendarSourceFilter === 'events'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Events ({calendarEvents.length})
            </button>
          </div>

          {!isCalendarListView ? (
            <div>
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="grid grid-cols-7 gap-1 pt-1.5 text-center">
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.isCurrentMonth && cell.day === selectedDay;
                  const isToday = calYear === 2026 && calMonth === 9 && cell.day === 15 && cell.isCurrentMonth;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (cell.isCurrentMonth) setSelectedDay(cell.day);
                      }}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-all relative cursor-pointer ${
                        !cell.isCurrentMonth
                          ? 'text-slate-300 dark:text-slate-600'
                          : isSelected
                          ? 'bg-[#0078d4] text-white font-bold shadow-xs'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${isToday && !isSelected ? 'ring-1 ring-amber-400 dark:ring-amber-500' : ''}`}
                    >
                      <span className="leading-none">{cell.day}</span>
                      {cell.hasEvent && (
                        <div className="flex items-center space-x-0.5 mt-0.5">
                          {cell.hasDeadline ? (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-rose-500'}`} />
                          ) : cell.hasPhase ? (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#0078d4]'}`} />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-500'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {allDisplayEvents
                .filter((e) => e.year === calYear && e.month === calMonth)
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedDay(ev.day)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedDay === ev.day
                        ? 'border-[#0078d4] bg-blue-50/70 dark:bg-slate-800'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Day {ev.day} • {ev.time}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        ev.category === 'Deadline'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          : ev.category === 'Phase'
                          ? 'bg-blue-100 text-[#0078d4] dark:bg-blue-950 dark:text-sky-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      }`}>
                        {ev.category}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-semibold text-xs mt-1">
                      {ev.title}
                    </p>
                    {ev.isProjectMilestone && ev.project && (
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                        <span>Project: {ev.project.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject(ev.project);
                            onNavigateTab('project-timelines');
                          }}
                          className="text-[#0078d4] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
                        >
                          <span>Timelines</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Selected Day Agenda Box with Direct Milestone Navigation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Agenda: Day {selectedDay} ({selectedDayEvents.length} items)
              </span>
              <button
                type="button"
                onClick={() => setIsAddEventModalOpen(true)}
                className="text-[11px] font-semibold text-[#0078d4] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Event</span>
              </button>
            </div>

            {selectedDayEvents.length > 0 ? (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 truncate pr-2">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          ev.category === 'Deadline'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                            : ev.category === 'Phase'
                            ? 'bg-blue-100 text-[#0078d4] dark:bg-blue-950 dark:text-sky-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        }`}>
                          {ev.category}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {ev.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{ev.time}</span>
                        {!ev.isProjectMilestone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(ev.id);
                            }}
                            className="text-slate-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>

                      {ev.isProjectMilestone && ev.project && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProject(ev.project);
                            onNavigateTab('project-timelines');
                            showToast(`Navigated to ${ev.project.code} Project Timelines`);
                          }}
                          className="text-[#0078d4] dark:text-sky-400 font-bold hover:underline flex items-center space-x-1 shrink-0 ml-2 cursor-pointer"
                        >
                          <span>View Timelines</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-slate-400">
                No events or project milestones scheduled for this day.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. MODALS (BARCODE SCANNER, REPORTS, ADD EVENT, ALERT DETAILS)
         ========================================================================= */}

      {/* BARCODE SCANNER MODAL */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-2xs">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-white">
                <Barcode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">Barcode Scanner Hub</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <CameraBarcodeScanner
              materials={materials}
              produceItems={produceItems}
              onBarcodeDetected={(detected) => {
                showToast(`Barcode Recognized: ${detected.barcode}`);
              }}
              autoStart={true}
            />

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORTS MODAL */}
      {isReportsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-[#0078d4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reports</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsReportsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Project Margin &amp; Cost Summary</div>
                  <div className="text-[11px] text-slate-500">Comprehensive project contract &amp; margin PDF</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const targetProj = selectedProject || projects[0];
                    if (targetProj) {
                      onExportPDF(targetProj);
                      showToast(`Generated Project Margin Summary PDF for ${targetProj.code}.`);
                    } else {
                      showToast('No active project found to export.');
                    }
                    setIsReportsModalOpen(false);
                  }}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Export PDF
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Material Price Audit History</div>
                  <div className="text-[11px] text-slate-500">Full vendor quote revisions &amp; audits</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportAllPriceHistoriesToCSV('All_Materials', materialList);
                    showToast('Exported Material Price Audit History CSV.');
                    setIsReportsModalOpen(false);
                  }}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Export CSV
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Subcontractor Rate Sheet</div>
                  <div className="text-[11px] text-slate-500">All registered specialist labor schedules</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportSubcontractorsToCSV(subcontractorList);
                    showToast('Exported Subcontractor Rate Sheet CSV.');
                    setIsReportsModalOpen(false);
                  }}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Export CSV
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Stock &amp; Inventory Valuation</div>
                  <div className="text-[11px] text-slate-500">Current warehouse valuation &amp; reorder points</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportInventoryToCSV(inventoryList);
                    showToast('Exported Stock & Inventory Valuation CSV.');
                    setIsReportsModalOpen(false);
                  }}
                  className="px-3 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsReportsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODALS & CREATION PORTALS (PROJECTS, MATERIALS, SUPPLIERS, TRADES, TARIFFS)
         ========================================================================= */}

      {/* ALERT DETAIL MODAL WITH DIRECT PORTAL ACTIONS */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-[#0078d4]">
                  {selectedAlert.tag}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {selectedAlert.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Logged Metric / Status:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {selectedAlert.metric}
                </span>
              </div>
              <div className="p-2.5 bg-blue-50/60 dark:bg-slate-800/80 rounded-xl border border-blue-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                {selectedAlert.tag === 'Tariff' && 'Tariff index updated with 98.5% compliance across all active finishing schedules.'}
                {selectedAlert.tag === 'Pricing' && 'Quarterly market price benchmark audit active. Raw materials trending +5%.'}
                {selectedAlert.tag === 'Vendor' && 'Supplier SLA compliance ratings verified at 99.2% for industrial hardware.'}
                {selectedAlert.tag === 'Audit' && 'All OSHA, ASME and ISO safety compliance inspections verified as Passed.'}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Close
              </button>

              {selectedAlert.tag === 'Tariff' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlert(null);
                    onNavigateTab('outsourced');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Open Tariffs Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedAlert.tag === 'Pricing' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlert(null);
                    onNavigateTab('materials');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Open Materials Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedAlert.tag === 'Vendor' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlert(null);
                    onNavigateTab('suppliers');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Open Suppliers Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedAlert.tag === 'Audit' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAlert(null);
                    onNavigateTab('audit-log');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Open Audit Trail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIRECT CREATION PORTAL MODAL (FOR ALL 'NEW' ACTION BUTTONS)
         ========================================================================= */}
      {creationPortalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#0078d4] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {creationPortalType === 'project' && 'Create Project Portfolio'}
                    {creationPortalType === 'material' && 'Add Material Catalog Item'}
                    {creationPortalType === 'supplier' && 'Register Approved Supplier'}
                    {creationPortalType === 'subcontractor' && 'Add Specialist Subcontractor'}
                    {creationPortalType === 'tariff' && 'Add Outsourced Finishing Tariff'}
                    {creationPortalType === 'produce' && 'Add Manufactured Product SKU'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Enter enterprise details to add directly to the database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreationPortalType(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields by Type */}
            {creationPortalType === 'project' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProjName.trim()) return;
                  const newProj: Partial<Project> = {
                    id: `proj-${Date.now()}`,
                    code: newProjCode.trim() || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
                    name: newProjName.trim(),
                    clientName: newProjClient.trim() || 'Apex Corporation',
                    quotedPrice: Number(newProjPrice) || 350000,
                    targetMarginPct: Number(newProjMargin) || 35,
                    status: 'Planning',
                    startDate: '2026-10-15',
                    deliveryDeadline: '2027-04-30',
                    phases: [
                      { id: 'ph-1', name: 'Engineering & BOM Design', budget: 85000, actualCost: 0, status: 'In Progress', startDate: '2026-10-15', endDate: '2026-11-30' },
                      { id: 'ph-2', name: 'Raw Material Procurement', budget: 140000, actualCost: 0, status: 'Not Started', startDate: '2026-12-01', endDate: '2027-01-31' },
                      { id: 'ph-3', name: 'Fabrication & Final Assembly', budget: 125000, actualCost: 0, status: 'Not Started', startDate: '2027-02-01', endDate: '2027-04-30' }
                    ]
                  };
                  onAddProject(newProj);
                  showToast(`Project "${newProj.name}" created successfully.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
                  <input
                    type="text"
                    required
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="e.g. Automated High-Pressure Valve Assembly Phase 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Code</label>
                    <input
                      type="text"
                      value={newProjCode}
                      onChange={(e) => setNewProjCode(e.target.value)}
                      placeholder="PRJ-2026-001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={newProjClient}
                      onChange={(e) => setNewProjClient(e.target.value)}
                      placeholder="Apex Dynamics"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quoted Contract Value</label>
                    <input
                      type="number"
                      value={newProjPrice}
                      onChange={(e) => setNewProjPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Margin %</label>
                    <input
                      type="number"
                      value={newProjMargin}
                      onChange={(e) => setNewProjMargin(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Project
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newProjName.trim()) return;
                      const newProj: Partial<Project> = {
                        id: `proj-${Date.now()}`,
                        code: newProjCode.trim() || `PRJ-${Math.floor(100 + Math.random() * 900)}`,
                        name: newProjName.trim(),
                        clientName: newProjClient.trim() || 'Apex Corporation',
                        quotedPrice: Number(newProjPrice) || 350000,
                        targetMarginPct: Number(newProjMargin) || 35,
                        status: 'Planning'
                      };
                      onAddProject(newProj);
                      showToast(`Project created. Opening Projects portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('projects');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}

            {creationPortalType === 'material' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMatName.trim()) return;
                  const newMat: Partial<MaterialItem> = {
                    id: `mat-${Date.now()}`,
                    code: newMatCode.trim() || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
                    name: newMatName.trim(),
                    category: newMatCategory,
                    unit: newMatUnit,
                    retailPrice: Number(newMatCost) || 1500,
                    defaultDiscountPct: 0,
                    itemClassification: 'raw_material',
                    supplierId: newMatSupplierId || suppliers[0]?.id || 'sup-01',
                    supplierName: suppliers.find(s => s.id === (newMatSupplierId || suppliers[0]?.id))?.name || 'Approved Supplier',
                    leadTimeDays: 7,
                    reorderPoint: 10,
                    inStock: 50
                  };
                  onAddMaterial(newMat);
                  showToast(`Material item "${newMat.name}" added to catalog.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    value={newMatName}
                    onChange={(e) => setNewMatName(e.target.value)}
                    placeholder="e.g. 6061-T6 Aluminum Billet 50mm"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">SKU / Code</label>
                    <input
                      type="text"
                      value={newMatCode}
                      onChange={(e) => setNewMatCode(e.target.value)}
                      placeholder="MAT-ALU-050"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={newMatCategory}
                      onChange={(e) => setNewMatCategory(e.target.value)}
                      placeholder="Metals & Alloys"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={newMatUnit}
                      onChange={(e) => setNewMatUnit(e.target.value)}
                      placeholder="kg, pcs, meters"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Standard Unit Cost</label>
                    <input
                      type="number"
                      value={newMatCost}
                      onChange={(e) => setNewMatCost(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier</label>
                  <select
                    value={newMatSupplierId}
                    onChange={(e) => setNewMatSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Material
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMatName.trim()) return;
                      const newMat: Partial<MaterialItem> = {
                        id: `mat-${Date.now()}`,
                        code: newMatCode.trim() || `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
                        name: newMatName.trim(),
                        category: newMatCategory,
                        unit: newMatUnit,
                        retailPrice: Number(newMatCost) || 1500,
                        defaultDiscountPct: 0,
                        itemClassification: 'raw_material',
                        supplierId: newMatSupplierId || suppliers[0]?.id || 'sup-01',
                        supplierName: suppliers.find(s => s.id === (newMatSupplierId || suppliers[0]?.id))?.name || 'Approved Supplier'
                      };
                      onAddMaterial(newMat);
                      showToast(`Material created. Opening Materials portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('materials');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}

            {creationPortalType === 'supplier' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSupName.trim()) return;
                  const newSup: Partial<Supplier> = {
                    id: `sup-${Date.now()}`,
                    name: newSupName.trim(),
                    category: newSupCategory,
                    contactPerson: newSupContact.trim() || 'Procurement Contact',
                    email: newSupEmail.trim() || 'sales@supplier.com',
                    phone: newSupPhone.trim() || '+94 11 234 5678',
                    city: newSupCity.trim() || 'Colombo',
                    country: 'Sri Lanka',
                    rating: 4.8,
                    qualityScorePct: 99.0,
                    paymentTerms: 'Net 30'
                  };
                  onAddSupplier(newSup);
                  showToast(`Supplier "${newSup.name}" registered successfully.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={newSupName}
                    onChange={(e) => setNewSupName(e.target.value)}
                    placeholder="e.g. Global Alloys & Fasteners Ltd"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Scope</label>
                    <input
                      type="text"
                      value={newSupCategory}
                      onChange={(e) => setNewSupCategory(e.target.value)}
                      placeholder="Raw Materials & Alloys"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City / Hub</label>
                    <input
                      type="text"
                      value={newSupCity}
                      onChange={(e) => setNewSupCity(e.target.value)}
                      placeholder="Colombo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newSupContact}
                      onChange={(e) => setNewSupContact(e.target.value)}
                      placeholder="John Smith"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Email</label>
                    <input
                      type="email"
                      value={newSupEmail}
                      onChange={(e) => setNewSupEmail(e.target.value)}
                      placeholder="orders@vendor.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Supplier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSupName.trim()) return;
                      const newSup: Partial<Supplier> = {
                        id: `sup-${Date.now()}`,
                        name: newSupName.trim(),
                        category: newSupCategory,
                        contactPerson: newSupContact.trim() || 'Procurement Contact',
                        email: newSupEmail.trim() || 'sales@supplier.com',
                        phone: newSupPhone.trim() || '+94 11 234 5678',
                        city: newSupCity.trim() || 'Colombo',
                        rating: 4.8
                      };
                      onAddSupplier(newSup);
                      showToast(`Supplier created. Opening Suppliers portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('suppliers');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}

            {creationPortalType === 'subcontractor' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSubName.trim()) return;
                  const newSub: Partial<SubcontractorRateItem> = {
                    id: `sub-${Date.now()}`,
                    subcontractorId: `sub-org-${Date.now()}`,
                    subcontractorName: newSubName.trim(),
                    serviceCategory: newSubCategory,
                    serviceType: 'Specialist Labor Service',
                    baseRate: Number(newSubRate) || 3800,
                    unit: newSubUnit,
                    skillLevel: newSubSkill
                  };
                  onAddSubcontractor(newSub);
                  showToast(`Subcontractor "${newSub.subcontractorName}" added.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subcontractor Trade / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    placeholder="e.g. Apex Precision CNC Machinists"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Trade Category</label>
                    <input
                      type="text"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                      placeholder="CNC 5-Axis Milling"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hourly / Shift Rate</label>
                    <input
                      type="number"
                      value={newSubRate}
                      onChange={(e) => setNewSubRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Skill Classification</label>
                  <input
                    type="text"
                    value={newSubSkill}
                    onChange={(e) => setNewSubSkill(e.target.value)}
                    placeholder="Certified Master Journeyman"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Subcontractor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSubName.trim()) return;
                      const newSub: Partial<SubcontractorRateItem> = {
                        id: `sub-${Date.now()}`,
                        subcontractorName: newSubName.trim(),
                        serviceCategory: newSubCategory,
                        baseRate: Number(newSubRate) || 3800,
                        unit: newSubUnit,
                        skillLevel: newSubSkill
                      };
                      onAddSubcontractor(newSub);
                      showToast(`Subcontractor created. Opening Subcontractors portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('subcontractors');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}

            {creationPortalType === 'tariff' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTariffName.trim()) return;
                  const newTariff: Partial<OutsourcedService> = {
                    id: `srv-${Date.now()}`,
                    name: newTariffName.trim(),
                    providerName: newTariffProvider.trim() || 'AeroCoat Finishing',
                    category: newTariffCategory,
                    rate: Number(newTariffRate) || 1250,
                    retailPrice: Number(newTariffRate) || 1250,
                    baseUnitType: newTariffUnit,
                    slaLevel: 'Tier-1 SLA (99.5%)'
                  };
                  onAddOutsourcedService(newTariff);
                  showToast(`Tariff schedule "${newTariff.name}" added.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Process / Tariff Name *</label>
                  <input
                    type="text"
                    required
                    value={newTariffName}
                    onChange={(e) => setNewTariffName(e.target.value)}
                    placeholder="e.g. Type III Hardcoat Anodizing (MIL-A-8625)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Provider Name</label>
                    <input
                      type="text"
                      value={newTariffProvider}
                      onChange={(e) => setNewTariffProvider(e.target.value)}
                      placeholder="AeroCoat Finishing"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tariff Rate</label>
                    <input
                      type="number"
                      value={newTariffRate}
                      onChange={(e) => setNewTariffRate(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      value={newTariffUnit}
                      onChange={(e) => setNewTariffUnit(e.target.value)}
                      placeholder="sq ft, batch, part"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Finishing Category</label>
                    <input
                      type="text"
                      value={newTariffCategory}
                      onChange={(e) => setNewTariffCategory(e.target.value)}
                      placeholder="Surface Treatment"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Tariff
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTariffName.trim()) return;
                      const newTariff: Partial<OutsourcedService> = {
                        id: `srv-${Date.now()}`,
                        name: newTariffName.trim(),
                        providerName: newTariffProvider.trim() || 'AeroCoat Finishing',
                        category: newTariffCategory,
                        rate: Number(newTariffRate) || 1250,
                        retailPrice: Number(newTariffRate) || 1250,
                        baseUnitType: newTariffUnit
                      };
                      onAddOutsourcedService(newTariff);
                      showToast(`Tariff created. Opening Tariffs portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('outsourced');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}

            {creationPortalType === 'produce' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProdName.trim()) return;
                  const newProd: Partial<ProduceItem> = {
                    id: `prd-${Date.now()}`,
                    code: newProdCode.trim() || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
                    name: newProdName.trim(),
                    type: 'product',
                    category: newProdCategory,
                    subCategory: 'Precision Sub-Assemblies',
                    moreSubCategory: 'General',
                    unit: 'pcs',
                    costPrice: (Number(newProdPrice) || 55000) * 0.65,
                    retailPrice: Number(newProdPrice) || 55000,
                    defaultDiscountPct: 0,
                    leadTimeDays: 7,
                    status: 'Active',
                    priceHistory: [],
                    lastUpdated: '2026-10-14'
                  };
                  onAddProduceItem(newProd);
                  showToast(`Product assembly "${newProd.name}" added.`);
                  setCreationPortalType(null);
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product / Assembly Name *</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Precision Hydraulic Actuator Unit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Code</label>
                    <input
                      type="text"
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      placeholder="PRD-ACT-001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Quoted Price (LKR)</label>
                    <input
                      type="number"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreationPortalType(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0078d4] hover:bg-[#006cbd] text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save Product
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newProdName.trim()) return;
                      const newProd: Partial<ProduceItem> = {
                        id: `prd-${Date.now()}`,
                        code: newProdCode.trim() || `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
                        name: newProdName.trim(),
                        type: 'product',
                        category: newProdCategory,
                        subCategory: 'Precision Sub-Assemblies',
                        moreSubCategory: 'General',
                        unit: 'pcs',
                        costPrice: (Number(newProdPrice) || 55000) * 0.65,
                        retailPrice: Number(newProdPrice) || 55000,
                        defaultDiscountPct: 0,
                        leadTimeDays: 7,
                        status: 'Active',
                        priceHistory: [],
                        lastUpdated: '2026-10-14'
                      };
                      onAddProduceItem(newProd);
                      showToast(`Product created. Opening Products portal.`);
                      setCreationPortalType(null);
                      onNavigateTab('produce');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer shadow-xs"
                  >
                    Save &amp; Open Portal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ADD CALENDAR EVENT MODAL (SIMPLE WORDS ONLY) */}
      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-[#0078d4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Add Event • Day {selectedDay}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEventSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event Name"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Time:
                  </label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Type:
                  </label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Audit">Audit</option>
                    <option value="Review">Review</option>
                    <option value="Phase">Phase</option>
                    <option value="Stock">Stock</option>
                    <option value="Tariff">Tariff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Location:
                </label>
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="Room / Bay"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEventModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0078d4] text-white font-bold cursor-pointer"
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
