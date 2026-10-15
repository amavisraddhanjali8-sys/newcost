import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  FolderGit2,
  TrendingUp,
  Calendar,
  Users,
  Check,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Project } from '../types';
import { formatCurrency } from '../utils/currency';

interface SelectProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedProjectId?: string;
  onSelectProject: (project: Project, targetTab?: 'cost-analysis' | 'project-timelines' | 'resource-allocation') => void;
  targetFeature?: 'margins' | 'timelines' | 'resources' | 'general';
}

export const SelectProjectModal: React.FC<SelectProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  selectedProjectId,
  onSelectProject,
  targetFeature = 'general'
}) => {
  const [query, setQuery] = useState('');

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return projects;
    const q = query.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.clientName?.toLowerCase().includes(q) ||
        p.targetProduct?.toLowerCase().includes(q)
    );
  }, [projects, query]);

  if (!isOpen) return null;

  const getTargetTitle = () => {
    switch (targetFeature) {
      case 'margins':
        return 'Marginal Analysis';
      case 'timelines':
        return 'Project Timelines';
      case 'resources':
        return 'Resource Allocation';
      default:
        return 'Project Workspace';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Simple Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#003049] dark:bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <FolderGit2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Select Project
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Open for {getTargetTitle()} • Connect database
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simple Search Box */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f172a]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Search project, code, or client..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#003049] dark:focus:border-sky-500 focus:bg-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Project List */}
        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No projects found matching "{query}"
            </div>
          ) : (
            filteredProjects.map((proj) => {
              const isSelected = proj.id === selectedProjectId;
              const phasesCount = proj.phases?.length || 0;
              const itemsCount = proj.selectedItems?.length || 0;
              const budgetFormatted = formatCurrency(proj.quotedPrice, proj.currency);

              return (
                <div
                  key={proj.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-sky-950/30 border-[#003049] dark:border-sky-500 shadow-xs ring-1 ring-[#003049]/20'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {/* Left: Code, Name, Client */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-[#003049] dark:text-sky-400 bg-[#fdf0d5] dark:bg-amber-950/50 px-1.5 py-0.2 rounded border border-[#ecd5a8] dark:border-amber-800">
                        {proj.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {proj.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#003049] dark:bg-sky-600 text-white px-1.5 py-0.2 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{proj.clientName || 'Client'}</span>
                      </span>
                      <span>•</span>
                      <span>Budget: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{budgetFormatted}</strong></span>
                      <span>•</span>
                      <span>{phasesCount} Phases</span>
                      <span>•</span>
                      <span>{itemsCount} Cost Items</span>
                    </div>
                  </div>

                  {/* Right Action Buttons: Simple 1-word buttons */}
                  <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                    {/* Primary Select for Target View */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(proj);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#003049] dark:bg-sky-600 hover:bg-[#002235] text-white text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {/* Quick Access to other 2 features */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(proj, 'cost-analysis');
                        onClose();
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Marginal Analysis"
                    >
                      <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="hidden sm:inline">Margins</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(proj, 'project-timelines');
                        onClose();
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Project Timelines"
                    >
                      <Calendar className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="hidden sm:inline">Timelines</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(proj, 'resource-allocation');
                        onClose();
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Resource Allocation"
                    >
                      <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span className="hidden sm:inline">Resources</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Simple Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
          <span>{filteredProjects.length} projects connected</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
