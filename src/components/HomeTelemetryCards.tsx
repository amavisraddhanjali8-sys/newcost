import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Building2,
  Users,
  Truck,
  Boxes,
  FolderGit2,
  MoreVertical,
  Table,
  Plus,
  ExternalLink,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import {
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem,
  Project
} from '../types';
import { ActiveTab } from './TopNavbar';

export interface FXTTOpenPayload {
  cardType:
    | 'material_category'
    | 'product_category'
    | 'service_category'
    | 'service_provider'
    | 'outsourced'
    | 'supplier'
    | 'project'
    | 'subcontractor'
    | 'client'
    | 'produce';
  cardId?: string;
  cardTitle: string;
  cardSubtitle?: string;
  cardTag?: string;
}

interface HomeTelemetryCardsProps {
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  produceItems: ProduceItem[];
  projects: Project[];
  onOpenFXTT: (payload: FXTTOpenPayload) => void;
  onOpenAddModal: (portalType: string) => void;
  onNavigateTab: (tabId: ActiveTab) => void;
  showToast: (msg: string) => void;
}

interface TelemetryCardItem {
  id: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  iconBg: string;
  hasActiveDot?: boolean;
  activeDotColor?: string;
  trendText: string;
  trendColor: string;
  strokeColor: string;
  wavePath: string;
  fxttPayload: FXTTOpenPayload;
  addPortalType: string;
  entityName: string;
}

export const HomeTelemetryCards: React.FC<HomeTelemetryCardsProps> = ({
  materials,
  suppliers,
  subcontractors,
  outsourcedServices,
  produceItems,
  projects,
  onOpenFXTT,
  onOpenAddModal,
  onNavigateTab,
  showToast
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute live values and stats
  const activeProjectsCount = projects.filter(
    (p) => p.status === 'In Progress' || p.status === 'Planning'
  ).length || projects.length;

  const cardsData: TelemetryCardItem[] = [
    {
      id: 'materials',
      label: 'Total Materials',
      count: materials.length,
      icon: <Layers className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#5b5ee7] shadow-sm shadow-indigo-100',
      hasActiveDot: false,
      trendText: `+${materials.length} Stocked`,
      trendColor: 'text-[#3b82f6]',
      strokeColor: '#3b82f6',
      wavePath: 'M 2 20 C 14 6, 24 24, 38 12 C 50 2, 60 18, 78 8',
      fxttPayload: {
        cardType: 'material_category',
        cardId: 'all',
        cardTitle: 'Materials & Parts Directory',
        cardSubtitle: `${materials.length} Raw Materials, Alloys, Fasteners & Parts`,
        cardTag: 'MATERIALS & PARTS'
      },
      addPortalType: 'material',
      entityName: 'Material Item'
    },
    {
      id: 'suppliers',
      label: 'Active Suppliers',
      count: suppliers.length,
      icon: <Building2 className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#48bb78] shadow-sm shadow-emerald-100',
      hasActiveDot: true,
      activeDotColor: 'bg-[#68d391]',
      trendText: `+${suppliers.length} Verified`,
      trendColor: 'text-[#10b981]',
      strokeColor: '#10b981',
      wavePath: 'M 2 22 C 16 26, 28 8, 44 14 C 56 18, 64 2, 78 12',
      fxttPayload: {
        cardType: 'supplier',
        cardId: 'all',
        cardTitle: 'Suppliers Directory & Vendor Catalog',
        cardSubtitle: `${suppliers.length} Approved Enterprise Vendors & Active Procured Items`,
        cardTag: 'SUPPLIERS'
      },
      addPortalType: 'supplier',
      entityName: 'Supplier'
    },
    {
      id: 'subcontractors',
      label: 'Specialist Labor',
      count: subcontractors.length,
      icon: <Users className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#6c5ce7] shadow-sm shadow-purple-100',
      hasActiveDot: false,
      trendText: `+${subcontractors.length} Trade Crews`,
      trendColor: 'text-[#6c5ce7]',
      strokeColor: '#6c5ce7',
      wavePath: 'M 2 12 C 14 2, 28 22, 42 16 C 54 10, 64 22, 78 10',
      fxttPayload: {
        cardType: 'subcontractor',
        cardId: 'all',
        cardTitle: 'Specialist Labor Roster & Subcontractors',
        cardSubtitle: `${subcontractors.length} Trade Specialists, Shift Multipliers & Field Crews`,
        cardTag: 'LABOR ROSTER'
      },
      addPortalType: 'subcontractor',
      entityName: 'Subcontractor'
    },
    {
      id: 'finishing',
      label: 'Finishing Tariffs',
      count: outsourcedServices.length,
      icon: <Truck className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#f59e0b] shadow-sm shadow-amber-100',
      hasActiveDot: false,
      trendText: `+${outsourcedServices.length} Tariffs`,
      trendColor: 'text-[#d97706]',
      strokeColor: '#f59e0b',
      wavePath: 'M 2 18 C 16 8, 26 22, 42 10 C 56 0, 66 16, 78 12',
      fxttPayload: {
        cardType: 'service_provider',
        cardId: 'all',
        cardTitle: 'Outsourced Finishing & Surface Treatment Tariffs',
        cardSubtitle: `${outsourcedServices.length} Active Industrial Finishing Processes & Tariffs`,
        cardTag: 'FINISHING TARIFFS'
      },
      addPortalType: 'outsourced',
      entityName: 'Finishing Service'
    },
    {
      id: 'produce',
      label: 'Products & BOM',
      count: produceItems.length,
      icon: <Boxes className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#ec4899] shadow-sm shadow-pink-100',
      hasActiveDot: false,
      trendText: `+${produceItems.length} Assemblies`,
      trendColor: 'text-[#db2777]',
      strokeColor: '#ec4899',
      wavePath: 'M 2 16 C 14 4, 26 24, 44 14 C 54 8, 64 22, 78 8',
      fxttPayload: {
        cardType: 'produce',
        cardId: 'all',
        cardTitle: 'Manufactured Products & Assembly SKUs',
        cardSubtitle: `${produceItems.length} Finished Good SKUs, Target Quoted Prices & Specs`,
        cardTag: 'PRODUCTS CATALOG'
      },
      addPortalType: 'produce',
      entityName: 'Product SKU'
    },
    {
      id: 'projects',
      label: 'Active Projects',
      count: projects.length,
      icon: <FolderGit2 className="w-5 h-5 text-white" />,
      iconBg: 'bg-[#0ea5e9] shadow-sm shadow-sky-100',
      hasActiveDot: true,
      activeDotColor: 'bg-[#38bdf8]',
      trendText: `+${activeProjectsCount} Active`,
      trendColor: 'text-[#0284c7]',
      strokeColor: '#0ea5e9',
      wavePath: 'M 2 22 C 18 10, 30 24, 46 8 C 58 -2, 66 18, 78 6',
      fxttPayload: {
        cardType: 'project',
        cardId: 'all',
        cardTitle: 'Capital Projects Portfolio & Quotations',
        cardSubtitle: `${projects.length} Active Industrial Deliverables & Commercial Contracts`,
        cardTag: 'PROJECTS'
      },
      addPortalType: 'project',
      entityName: 'Project'
    }
  ];

  return (
    <div className="space-y-2.5">
      {/* Realtime Telemetry Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Realtime Enterprise Telemetry & Direct FXTT Grids
          </span>
          <span className="text-[11px] text-slate-400 hidden md:inline font-normal">
            • Live dynamic figures across materials, supply chains, labor & deliverables
          </span>
        </div>

        <span className="text-[11px] text-slate-500 font-medium bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
          Click any card to open instant FXTT data grid
        </span>
      </div>

      {/* Cards Grid */}
      <div
        id="home-telemetry-cards-container"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4"
      >
        {cardsData.map((item) => (
          <div
            key={item.id}
            id={`telemetry-card-${item.id}`}
            onClick={() => onOpenFXTT(item.fxttPayload)}
            className="group relative bg-white rounded-[22px] p-4 sm:p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between select-none"
          >
            {/* Top Row: Icon Container & Three-Dots Menu */}
            <div className="flex items-start justify-between mb-4">
              {/* Rounded Square Icon Badge */}
              <div
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.iconBg} transition-transform duration-200 group-hover:scale-105`}
              >
                {item.icon}
                {item.hasActiveDot && (
                  <span
                    className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      item.activeDotColor || 'bg-emerald-400'
                    } shadow-xs`}
                  />
                )}
              </div>

              {/* Three-Dots Menu */}
              <div className="relative" ref={openMenuId === item.id ? menuRef : null}>
                <button
                  id={`btn-card-menu-${item.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === item.id ? null : item.id);
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-slate-500 hover:!text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Card Options"
                  aria-label={`Options for ${item.label}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown Popover */}
                {openMenuId === item.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onOpenFXTT(item.fxttPayload);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Table className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Open FXTT Grid</span>
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onOpenAddModal(item.addPortalType);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Add New {item.entityName}</span>
                    </button>
                    <button
                      onClick={() => {
                        setOpenMenuId(null);
                        onNavigateTab('directory-hub');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-sky-600 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                      <span>View in Directory Hub</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Figure & Label on Left, Wave & Trend on Right */}
            <div className="flex items-end justify-between gap-2 pt-1">
              {/* Left Column: Number & Label */}
              <div className="min-w-0 flex-1">
                <div
                  id={`stat-count-${item.id}`}
                  className="text-2xl sm:text-[30px] font-extrabold text-slate-900 tracking-tight leading-none tabular-nums"
                >
                  {item.count}
                </div>
                <div className="text-xs sm:text-[13px] font-medium text-slate-500 mt-1.5 truncate">
                  {item.label}
                </div>
              </div>

              {/* Right Column: Flowing Wave Sparkline & Dynamic Trend */}
              <div className="flex flex-col items-end shrink-0 pl-1">
                <svg
                  className="w-16 sm:w-20 h-7 overflow-visible"
                  viewBox="0 0 80 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id={`wave-gradient-${item.id}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={item.strokeColor} stopOpacity="1" />
                      <stop offset="100%" stopColor={item.strokeColor} stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  <path
                    d={item.wavePath}
                    stroke={`url(#wave-gradient-${item.id})`}
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className={`text-[11px] sm:text-xs font-semibold mt-1 tracking-tight text-right ${item.trendColor}`}
                >
                  {item.trendText}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
