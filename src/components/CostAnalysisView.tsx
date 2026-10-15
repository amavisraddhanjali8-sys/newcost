import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  FileDown,
  LayoutDashboard,
  SlidersHorizontal,
  FolderGit2,
  Calendar,
  Building2,
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingUp,
  Flame,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import {
  Project,
  MaterialItem,
  ProduceItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService
} from '../types';
import { ProjectDashboardTab } from './project/ProjectDashboardTab';
import { ProjectCostControlsTab } from './project/ProjectCostControlsTab';
import { MarginalProfitAnalysisPortal } from './project/MarginalProfitAnalysisPortal';
import { VarianceHeatmap } from './project/VarianceHeatmap';
import { HistoricalMarginTrendChart } from './project/HistoricalMarginTrendChart';
import { analyzeProjectBudgetWarnings } from '../utils/budgetWarningEngine';

interface CostAnalysisViewProps {
  project: Project | null;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onOpenProjectPicker?: () => void;
  materials?: MaterialItem[];
  produceItems?: ProduceItem[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  onUpdateProject?: (updatedProject: Project) => void;
  onAddProduceItem?: (item: ProduceItem) => void;
  onAddMaterial?: (mat: MaterialItem) => void;
  onRefreshAnalytics: () => void;
  onExportPDF: () => void;
  onNavigateToProjects: () => void;
  initialTab?: 'margins' | 'trend' | 'dashboard' | 'cost-controls' | 'variance-heatmap';
}

export const CostAnalysisView: React.FC<CostAnalysisViewProps> = ({
  project,
  projects = [],
  onSelectProject,
  onOpenProjectPicker,
  materials = [],
  produceItems = [],
  suppliers = [],
  subcontractors = [],
  outsourcedServices = [],
  onUpdateProject = () => {},
  onAddProduceItem,
  onAddMaterial,
  onRefreshAnalytics,
  onExportPDF,
  onNavigateToProjects,
  initialTab = 'margins'
}) => {
  // Five tabs:
  // Tab 1: 'margins' - Marginal Profit Analysis
  // Tab 2: 'trend' - Historical Margin Trend (Recharts Line Chart)
  // Tab 3: 'dashboard' - Project Dashboard
  // Tab 4: 'cost-controls' - Cost Controls & Budget Items
  // Tab 5: 'variance-heatmap' - Variance Heatmap
  const [activeTab, setActiveTab] = useState<'margins' | 'trend' | 'dashboard' | 'cost-controls' | 'variance-heatmap'>(initialTab);

  const effectiveProjects = projects.length > 0 ? projects : project ? [project] : [];
  const currentProject = project || effectiveProjects[0] || null;

  // Real-time calculation of phase budget overruns based on current consumption rates
  const warnings = useMemo(() => {
    if (!currentProject) return null;
    return analyzeProjectBudgetWarnings(currentProject, currentProject.selectedItems, currentProject.currency || 'USD');
  }, [currentProject]);

  const handleSelectProj = (proj: Project) => {
    if (onSelectProject) {
      onSelectProject(proj);
    }
  };

  const activePlanName = currentProject?.budgetaryPlans?.find(p => p.id === currentProject.activePlanId)?.name || 'Plan A (Baseline)';

  return (
    <div className="space-y-4">
      {/* Top Project Breadcrumb & Quick Switcher Box */}
      <div className="bg-white dark:bg-[#0b101b] p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {currentProject ? (
          <div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono text-[#0078d4] font-bold uppercase">{currentProject.code}</span>
              <span>•</span>
              <span>{currentProject.productCategory || currentProject.category || 'Engineering'}</span>
              <span>•</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentProject.clientName || currentProject.client || 'Client'}</span>
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center space-x-2">
              <span>{currentProject.name}</span>
              {currentProject.targetProduct && (
                <span className="text-xs text-slate-500 font-normal">({currentProject.targetProduct})</span>
              )}
            </h2>
          </div>
        ) : (
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Project Planning & Margins</h2>
            <p className="text-xs text-slate-500">Select a project to connect all database cost items.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Simple Project Selector Box */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Project:</span>
            <select
              value={currentProject?.id || ''}
              onChange={(e) => {
                const found = effectiveProjects.find(p => p.id === e.target.value);
                if (found && onSelectProject) onSelectProject(found);
              }}
              className="bg-transparent text-xs font-bold text-[#003049] dark:text-sky-300 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {effectiveProjects.map(p => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {onOpenProjectPicker && (
              <button
                type="button"
                onClick={onOpenProjectPicker}
                className="text-xs font-semibold text-[#0078d4] dark:text-sky-400 hover:underline ml-1 cursor-pointer"
              >
                Browse
              </button>
            )}
          </div>

          {/* Active Plan Pill */}
          {currentProject && (
            <div className="hidden sm:flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/60 text-[#0078d4] dark:text-sky-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#0078d4]" />
              <span>{activePlanName}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefreshAnalytics}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Recalculate analytics"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Recalculate</span>
          </button>

          <button
            type="button"
            onClick={onExportPDF}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-white" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Warning Banner - Simple UI */}
      {warnings && warnings.hasOverruns && (
        <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-900 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/60 text-red-600 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-red-900 dark:text-red-200">
                Budget Warning: {warnings.criticalItemCount} items over budget by ${Math.abs(Math.round(warnings.totalVariance)).toLocaleString()}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('variance-heatmap')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <span>View Heatmap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation Bar - Simple Words like Home Tab */}
      <div className="bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 flex flex-wrap items-center justify-start gap-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('margins')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'margins'
              ? 'bg-[#0078d4] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Margins</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trend')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trend'
              ? 'bg-[#0078d4] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>Margin Trend</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#0078d4] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cost-controls')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cost-controls'
              ? 'bg-[#0078d4] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Cost Controls</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('variance-heatmap')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
            activeTab === 'variance-heatmap'
              ? 'bg-[#0078d4] text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Flame className={`w-4 h-4 ${warnings?.hasOverruns ? 'text-red-500' : 'text-amber-500'}`} />
          <span>Variance</span>
          {warnings && warnings.criticalItemCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {warnings.criticalItemCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'margins' ? (
        <MarginalProfitAnalysisPortal
          projects={effectiveProjects}
          selectedProject={currentProject}
          onSelectProject={handleSelectProj}
          onUpdateProject={onUpdateProject}
          produceItems={produceItems}
          materials={materials}
          subcontractors={subcontractors}
          outsourcedServices={outsourcedServices}
          suppliers={suppliers}
        />
      ) : activeTab === 'trend' ? (
        currentProject ? (
          <HistoricalMarginTrendChart
            project={currentProject}
            currency={currentProject.currency}
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-normal text-slate-800">No project selected</h3>
            <p className="text-slate-500 text-xs mt-1">Please select a project to view its historical margin trend.</p>
          </div>
        )
      ) : activeTab === 'dashboard' ? (
        currentProject ? (
          <ProjectDashboardTab
            project={currentProject}
            produceItems={produceItems}
            materials={materials}
            onUpdateProject={onUpdateProject}
            onAddProduceItem={onAddProduceItem}
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-normal text-slate-800">No project selected</h3>
            <p className="text-slate-500 text-xs mt-1">Please select a project to view its dashboard.</p>
          </div>
        )
      ) : activeTab === 'cost-controls' ? (
        currentProject ? (
          <ProjectCostControlsTab
            project={currentProject}
            materials={materials}
            suppliers={suppliers}
            subcontractors={subcontractors}
            outsourcedServices={outsourcedServices}
            onUpdateProject={onUpdateProject}
            onAddMaterial={onAddMaterial}
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-normal text-slate-800">No project selected</h3>
            <p className="text-slate-500 text-xs mt-1">Please select a project to configure cost controls.</p>
          </div>
        )
      ) : (
        currentProject ? (
          <VarianceHeatmap
            project={currentProject}
            onUpdateProject={onUpdateProject}
            activePlanId={currentProject.activePlanId}
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 m-4 shadow-sm">
            <FolderGit2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-normal text-slate-800">No project selected</h3>
            <p className="text-slate-500 text-xs mt-1">Please select a project to view its variance heatmap.</p>
          </div>
        )
      )}
    </div>
  );
};

