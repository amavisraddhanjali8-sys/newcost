import React, { useState, useMemo } from 'react';
import {
  FolderGit2,
  X,
  Search,
  CheckCircle2,
  Circle,
  Building2,
  Tag,
  ArrowRight,
  DollarSign,
  Layers,
  Calendar,
  Sparkles,
  Check
} from 'lucide-react';
import { Project } from '../types';
import { formatLKR } from '../utils/currency';

interface SelectProjectForExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProject: Project | null;
  mode?: 'enterprise' | 'quote';
  onConfirmAndOpenExport: (project: Project | null) => void;
  onConfirmQuoteExport?: (project: Project) => void;
}

export const SelectProjectForExportModal: React.FC<SelectProjectForExportModalProps> = ({
  isOpen,
  onClose,
  projects,
  selectedProject,
  mode = 'enterprise',
  onConfirmAndOpenExport,
  onConfirmQuoteExport
}) => {
  // Local temporary selection: for quote mode, default to the first project if none selected
  const [tempSelectedProjectId, setTempSelectedProjectId] = useState<string | null>(
    selectedProject ? selectedProject.id : (projects.length > 0 ? projects[0].id : null)
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize initial state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (selectedProject) {
        setTempSelectedProjectId(selectedProject.id);
      } else if (projects.length > 0) {
        setTempSelectedProjectId(projects[0].id);
      } else {
        setTempSelectedProjectId(null);
      }
    }
  }, [isOpen, selectedProject, projects, mode]);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const term = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.clientName.toLowerCase().includes(term) ||
        (p.productCategory && p.productCategory.toLowerCase().includes(term))
    );
  }, [projects, searchTerm]);

  const portfolioTotalVal = useMemo(() => {
    return projects.reduce((sum, p) => sum + (p.quotedPrice || 0), 0);
  }, [projects]);

  const activeCount = useMemo(() => {
    return projects.filter((p) => p.status === 'In Progress' || p.status === 'Planning').length;
  }, [projects]);

  if (!isOpen) return null;

  const currentChosenProject = tempSelectedProjectId
    ? projects.find((p) => p.id === tempSelectedProjectId) || null
    : null;

  const handleProceed = () => {
    if (mode === 'quote') {
      const proj = currentChosenProject || projects[0];
      if (proj && onConfirmQuoteExport) {
        onConfirmQuoteExport(proj);
      } else {
        onConfirmAndOpenExport(proj);
      }
    } else {
      onConfirmAndOpenExport(currentChosenProject);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#003049]/10 text-[#003049] flex items-center justify-center shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'quote'
                  ? 'Select Project for Executive PDF Quote'
                  : 'Select Project for Enterprise Export'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'quote'
                  ? 'Choose a project from the existing database to generate and export an ISO/ASME client quotation dossier.'
                  : 'Choose an active project from the existing database to generate tailored PDF audits, BOM cost sheets, and CSV datasets in LKR.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects by code (PRJ-001), name, client, or category..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#003049] focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Project Selection Area */}
        <div className="overflow-y-auto pr-1 space-y-3 py-2 flex-1">
          {/* Option A: Entire Enterprise Portfolio (Only in enterprise mode) */}
          {mode === 'enterprise' && (
            <div
              id="opt-entire-portfolio"
              onClick={() => setTempSelectedProjectId(null)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                tempSelectedProjectId === null
                  ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049]'
                  : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-slate-700">
                    {tempSelectedProjectId === null ? (
                      <CheckCircle2 className="w-5 h-5 text-[#003049]" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">
                        Entire Enterprise Portfolio (All Projects)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {projects.length} Projects Total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Export aggregated company-wide master dataset, consolidated contracts portfolio & system metrics.
                    </p>
                  </div>
                </div>

                <div className="text-right pl-3 shrink-0 hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">
                    {formatLKR(portfolioTotalVal, { compact: true })}
                  </div>
                  <div className="text-[10px] text-slate-500">{activeCount} Active / In Progress</div>
                </div>
              </div>
            </div>
          )}

          {/* Section Divider */}
          <div className="flex items-center justify-between pt-1 pb-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {mode === 'quote'
                ? `Available Projects in Database (${filteredProjects.length})`
                : `Existing Projects in Database (${filteredProjects.length})`}
            </span>
            <span className="text-[10px] text-slate-400">
              {mode === 'quote'
                ? 'Select project to compile quote'
                : 'Click to select target project for itemized export'}
            </span>
          </div>

          {/* Individual Projects List */}
          {filteredProjects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No matching projects found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try adjusting your search keywords or clear the filter.
              </p>
            </div>
          ) : (
            filteredProjects.map((prj) => {
              const isSelected = tempSelectedProjectId === prj.id;
              const phasesCount = prj.phases?.length || 0;
              const costItemsCount = prj.selectedItems?.length || 0;

              let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
              if (prj.status === 'In Progress') {
                statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              } else if (prj.status === 'Planning') {
                statusBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
              } else if (prj.status === 'Completed') {
                statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
              }

              return (
                <div
                  key={prj.id}
                  id={`project-select-card-${prj.code}`}
                  onClick={() => setTempSelectedProjectId(prj.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049] shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className="pt-0.5 text-slate-700 shrink-0">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-[#003049]" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Row 1: Code & Status */}
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                            {prj.code}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}
                          >
                            {prj.status}
                          </span>
                          {prj.productCategory && (
                            <span className="text-[10px] text-slate-500 flex items-center space-x-1 truncate">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{prj.productCategory}</span>
                            </span>
                          )}
                        </div>

                        {/* Row 2: Project Title */}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                          {prj.name}
                        </h3>

                        {/* Row 3: Client & Deadline */}
                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                          <span className="flex items-center space-x-1 font-medium text-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Client: {prj.clientName}</span>
                          </span>
                          {prj.deliveryDeadline && (
                            <span className="flex items-center space-x-1 text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>Due {prj.deliveryDeadline}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics on Right */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {formatLKR(prj.quotedPrice)}
                      </div>
                      <div className="flex items-center justify-end space-x-1 text-[11px] font-semibold text-emerald-600 mt-0.5">
                        <span>{prj.targetMarginPct}% Margin</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {phasesCount} Phases • {costItemsCount} Cost Lines
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-600 w-full sm:w-auto">
            {currentChosenProject ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Target:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  [{currentChosenProject.code}] {currentChosenProject.name.slice(0, 24)}...
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Target:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  Entire Enterprise Portfolio (All {projects.length} Projects)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-confirm-project-export"
              onClick={handleProceed}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#003049] hover:bg-[#002235] shadow-sm hover:shadow-md flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>
                {mode === 'quote' ? 'Generate Executive PDF Quote' : 'Continue to Export Options'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
