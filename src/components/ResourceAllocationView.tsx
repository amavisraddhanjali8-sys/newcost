import React, { useState, useMemo } from 'react';
import {
  Users,
  Cpu,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Search,
  Filter,
  ArrowRight,
  FolderGit2,
  AlertTriangle,
  Sliders,
  Sparkles,
  BarChart3,
  Check,
  ChevronDown,
  X,
  Edit2,
  Info,
  Trash2,
  Plus,
  RotateCcw
} from 'lucide-react';
import { Project, SubcontractorRateItem, OutsourcedService, Supplier, AppUser, ProjectPhase, ProjectCostItem } from '../types';
import { formatCurrency } from '../utils/currency';
import { SubcontractorCapacityBarChart } from './SubcontractorCapacityBarChart';
import {
  calculatePhaseCapacityMetrics,
  ProjectCapacitySummary,
  PhaseCapacityMetric
} from '../utils/capacityCalculation';

interface ResourceAllocationViewProps {
  selectedProject?: Project | null;
  projects: Project[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  suppliers: Supplier[];
  currentUser?: AppUser;
  onSelectProject?: (proj: Project) => void;
  onOpenProjectPicker?: () => void;
  onNavigateToSubcontractors: () => void;
  onNavigateToOutsourced: () => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

export const ResourceAllocationView: React.FC<ResourceAllocationViewProps> = ({
  selectedProject,
  projects,
  subcontractors,
  outsourcedServices,
  suppliers,
  currentUser,
  onSelectProject,
  onOpenProjectPicker,
  onNavigateToSubcontractors,
  onNavigateToOutsourced,
  onUpdateProject
}) => {
  const [scope, setScope] = useState<'selected' | 'all'>('selected');
  const [filterType, setFilterType] = useState<'all' | 'subcontractor' | 'outsourced' | 'material'>('all');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>('all');
  const [selectedCapacityFilter, setSelectedCapacityFilter] = useState<'all' | 'over_allocated' | 'near_capacity' | 'within_capacity'>('all');
  const [search, setSearch] = useState('');
  
  // Phase capacity edit modal state
  const [isEditCapacityModalOpen, setIsEditCapacityModalOpen] = useState(false);
  const [editingCapacities, setEditingCapacities] = useState<Record<string, number>>({});
  const [isAddingNewPhase, setIsAddingNewPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseCapacity, setNewPhaseCapacity] = useState(160);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Resource Edit Modal state
  const [isEditResourceModalOpen, setIsEditResourceModalOpen] = useState(false);
  const [editingResourceData, setEditingResourceData] = useState<{
    id: string;
    name: string;
    type: 'subcontractor' | 'outsourced' | 'material';
    phaseId: string;
    providerName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    notes?: string;
  } | null>(null);

  // Add Resource Modal state
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [newResourceData, setNewResourceData] = useState<{
    name: string;
    type: 'subcontractor' | 'outsourced' | 'material';
    phaseId: string;
    providerName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    notes?: string;
  }>({
    name: '',
    type: 'subcontractor',
    phaseId: '',
    providerName: '',
    quantity: 40,
    unit: 'hr',
    unitCost: 75,
    notes: ''
  });

  // Resource Delete Confirmation state
  const [resourceToDelete, setResourceToDelete] = useState<{ id: string; name: string } | null>(null);

  // Target project to inspect
  const activeProj = selectedProject || projects[0] || null;

  // Calculate live D3 capacity metrics from real application data
  const capacitySummary: ProjectCapacitySummary = useMemo(() => {
    if (!activeProj) {
      return {
        projectCode: 'N/A',
        projectName: 'No Project Selected',
        totalCapacityHours: 0,
        totalAllocatedHours: 0,
        totalRemainingHours: 0,
        totalOverAllocatedHours: 0,
        overallUtilizationPct: 0,
        overAllocatedPhaseCount: 0,
        totalPhaseCount: 0,
        phases: []
      };
    }
    return calculatePhaseCapacityMetrics(activeProj);
  }, [activeProj]);

  // Roll up allocations with phase associations
  const allocations = useMemo(() => {
    const list: Array<{
      id: string;
      phaseId?: string;
      phaseName?: string;
      resourceName: string;
      providerName: string;
      type: 'subcontractor' | 'outsourced' | 'material';
      allocatedHours?: number;
      allocatedProjects: Array<{
        projectCode: string;
        projectName: string;
        phaseName?: string;
        qty: number;
        unit: string;
        totalSpend: number;
        currency?: string;
      }>;
      baseRate: number;
      unit: string;
      totalSpend: number;
      skillOrSla: string;
      currency?: string;
    }> = [];

    const targetProjects = (scope === 'selected' && activeProj) ? [activeProj] : projects;

    targetProjects.forEach((proj) => {
      (proj.selectedItems || []).forEach((item) => {
        const itemType = (item.type === 'subcontractor' || item.type === 'outsourced' || item.type === 'material')
          ? item.type
          : 'material';

        const phaseObj = (proj.phases || []).find((p) => p.id === item.phaseId);
        const existing = list.find((a) => a.resourceName.toLowerCase() === item.name.toLowerCase() && a.phaseId === item.phaseId);
        const itemSpend = typeof item.totalCost === 'number' ? item.totalCost : ((item.quantity || 1) * (item.unitCost || 0));
        const hours = item.type === 'subcontractor' ? Number(item.quantity) || 0 : undefined;

        if (existing) {
          existing.allocatedProjects.push({
            projectCode: proj.code,
            projectName: proj.name,
            phaseName: phaseObj ? phaseObj.name.split(':')[0] : 'Phase 1',
            qty: item.quantity,
            unit: item.unit,
            totalSpend: itemSpend,
            currency: proj.currency
          });
          existing.totalSpend += itemSpend;
          if (hours && existing.allocatedHours !== undefined) {
            existing.allocatedHours += hours;
          }
        } else {
          list.push({
            id: item.id,
            phaseId: item.phaseId,
            phaseName: phaseObj ? phaseObj.name.split(':')[0] : 'General',
            resourceName: item.name,
            providerName: item.supplierOrProvider || 'Assigned Provider',
            type: itemType,
            baseRate: item.unitCost || 0,
            unit: item.unit || 'unit',
            totalSpend: itemSpend,
            allocatedHours: hours,
            currency: proj.currency,
            skillOrSla:
              itemType === 'subcontractor'
                ? 'Certified Specialist Labor'
                : itemType === 'outsourced'
                ? 'Standard 99.9% SLA'
                : 'Raw Material Supplier Stock',
            allocatedProjects: [
              {
                projectCode: proj.code,
                projectName: proj.name,
                phaseName: phaseObj ? phaseObj.name.split(':')[0] : 'Phase 1',
                qty: item.quantity,
                unit: item.unit,
                totalSpend: itemSpend,
                currency: proj.currency
              }
            ]
          });
        }
      });
    });

    return list;
  }, [projects, activeProj, scope]);

  // Filtered allocations based on search, type, and selected phase from chart
  const filtered = useMemo(() => {
    // Phases matching selectedCapacityFilter
    const matchingPhaseIds = new Set(
      capacitySummary.phases
        .filter((p) => {
          if (selectedCapacityFilter === 'all') return true;
          if (selectedCapacityFilter === 'over_allocated') return p.isOverAllocated || p.statusCategory === 'zero_capacity';
          if (selectedCapacityFilter === 'near_capacity') return p.statusCategory === 'near_capacity';
          if (selectedCapacityFilter === 'within_capacity') return p.statusCategory === 'within_capacity' && !p.isOverAllocated;
          return true;
        })
        .map((p) => p.phaseId)
    );

    return allocations.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (selectedPhaseFilter !== 'all' && a.phaseId !== selectedPhaseFilter) return false;
      if (selectedCapacityFilter !== 'all' && a.phaseId && !matchingPhaseIds.has(a.phaseId)) return false;
      if (
        search &&
        !a.resourceName.toLowerCase().includes(search.toLowerCase()) &&
        !a.providerName.toLowerCase().includes(search.toLowerCase()) &&
        !(a.phaseName || '').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allocations, filterType, selectedPhaseFilter, selectedCapacityFilter, search, capacitySummary.phases]);

  const totalAllocatedSpend = allocations.reduce((sum, a) => sum + a.totalSpend, 0);

  // Open capacity editor modal
  const handleOpenCapacityEditor = () => {
    if (!activeProj) return;
    const initialMap: Record<string, number> = {};
    (activeProj.phases || []).forEach((phase) => {
      const metric = capacitySummary.phases.find((p) => p.phaseId === phase.id);
      initialMap[phase.id] = typeof phase.capacityHours === 'number' ? phase.capacityHours : (metric?.capacityHours || 160);
    });
    setEditingCapacities(initialMap);
    setIsEditCapacityModalOpen(true);
  };

  // Save updated capacity hours to active project
  const handleSaveCapacities = () => {
    if (!activeProj || !onUpdateProject) return;

    const updatedPhases: ProjectPhase[] = (activeProj.phases || []).map((phase) => {
      const newCap = editingCapacities[phase.id];
      return {
        ...phase,
        capacityHours: typeof newCap === 'number' ? Math.max(0, newCap) : phase.capacityHours
      };
    });

    onUpdateProject({
      ...activeProj,
      phases: updatedPhases
    });

    setIsEditCapacityModalOpen(false);
    setSaveSuccess('Project phase working hours capacity updated successfully.');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Reset / Clear capacity for a phase
  const handleResetPhaseCapacity = (phaseId: string) => {
    setEditingCapacities((prev) => ({ ...prev, [phaseId]: 0 }));
  };

  // Delete phase completely from project
  const handleDeletePhaseFromProject = (phaseId: string) => {
    if (!activeProj || !onUpdateProject) return;
    const phaseToDelete = activeProj.phases?.find((p) => p.id === phaseId);
    const updatedPhases = (activeProj.phases || []).filter((p) => p.id !== phaseId);

    const updatedCapacities = { ...editingCapacities };
    delete updatedCapacities[phaseId];
    setEditingCapacities(updatedCapacities);

    onUpdateProject({
      ...activeProj,
      phases: updatedPhases
    });

    setSaveSuccess(`Phase "${phaseToDelete?.name || phaseId}" deleted.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Add new phase directly to active project
  const handleAddNewPhaseToProject = () => {
    if (!activeProj || !onUpdateProject || !newPhaseName.trim()) return;

    const newPhase: ProjectPhase = {
      id: `phase-${Date.now()}`,
      phaseNumber: (activeProj.phases?.length || 0) + 1,
      name: newPhaseName.trim(),
      capacityHours: Math.max(0, newPhaseCapacity),
      actualCost: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'In Progress',
      items: []
    };

    const updatedPhases = [...(activeProj.phases || []), newPhase];
    onUpdateProject({
      ...activeProj,
      phases: updatedPhases
    });

    setEditingCapacities((prev) => ({ ...prev, [newPhase.id]: newPhase.capacityHours || 160 }));
    setNewPhaseName('');
    setIsAddingNewPhase(false);
    setSaveSuccess(`Phase "${newPhase.name}" added successfully.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Start editing a resource
  const handleStartEditResource = (item: {
    id: string;
    phaseId?: string;
    resourceName: string;
    providerName: string;
    type: 'subcontractor' | 'outsourced' | 'material';
    baseRate: number;
    unit: string;
    allocatedHours?: number;
    allocatedProjects: Array<{ qty: number; unit: string }>;
  }) => {
    setEditingResourceData({
      id: item.id,
      name: item.resourceName,
      type: item.type,
      phaseId: item.phaseId || (activeProj?.phases?.[0]?.id || ''),
      providerName: item.providerName,
      quantity: item.allocatedHours ?? item.allocatedProjects[0]?.qty ?? 1,
      unit: item.unit || 'hr',
      unitCost: item.baseRate || 0,
      notes: ''
    });
    setIsEditResourceModalOpen(true);
  };

  // Save edited resource
  const handleSaveEditedResource = () => {
    if (!activeProj || !onUpdateProject || !editingResourceData) return;

    const updatedSelectedItems = (activeProj.selectedItems || []).map((item) => {
      if (item.id === editingResourceData.id) {
        const qty = Math.max(0, Number(editingResourceData.quantity) || 0);
        const cost = Math.max(0, Number(editingResourceData.unitCost) || 0);
        return {
          ...item,
          name: editingResourceData.name,
          type: editingResourceData.type,
          phaseId: editingResourceData.phaseId,
          supplierOrProvider: editingResourceData.providerName,
          quantity: qty,
          unit: editingResourceData.unit,
          unitCost: cost,
          totalCost: qty * cost
        };
      }
      return item;
    });

    onUpdateProject({
      ...activeProj,
      selectedItems: updatedSelectedItems
    });

    setIsEditResourceModalOpen(false);
    setEditingResourceData(null);
    setSaveSuccess(`Resource "${editingResourceData.name}" updated successfully.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Delete resource
  const handleConfirmDeleteResource = () => {
    if (!activeProj || !onUpdateProject || !resourceToDelete) return;

    const updatedSelectedItems = (activeProj.selectedItems || []).filter(
      (item) => item.id !== resourceToDelete.id
    );

    onUpdateProject({
      ...activeProj,
      selectedItems: updatedSelectedItems
    });

    const deletedName = resourceToDelete.name;
    setResourceToDelete(null);
    setSaveSuccess(`Resource "${deletedName}" deleted from project.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Add new allocated resource
  const handleSaveNewResource = () => {
    if (!activeProj || !onUpdateProject || !newResourceData.name.trim()) return;

    const qty = Math.max(0, Number(newResourceData.quantity) || 0);
    const cost = Math.max(0, Number(newResourceData.unitCost) || 0);
    const targetPhaseId = newResourceData.phaseId || (activeProj.phases?.[0]?.id || 'phase-1');

    const newItem: ProjectCostItem = {
      id: `res-${Date.now()}`,
      name: newResourceData.name.trim(),
      type: newResourceData.type,
      phaseId: targetPhaseId,
      supplierOrProvider: newResourceData.providerName.trim() || 'Assigned Provider',
      quantity: qty,
      unit: newResourceData.unit || (newResourceData.type === 'subcontractor' ? 'hr' : 'pcs'),
      unitCost: cost,
      totalCost: qty * cost,
      notes: newResourceData.notes
    };

    onUpdateProject({
      ...activeProj,
      selectedItems: [newItem, ...(activeProj.selectedItems || [])]
    });

    setIsAddResourceModalOpen(false);
    setNewResourceData({
      name: '',
      type: 'subcontractor',
      phaseId: activeProj.phases?.[0]?.id || '',
      providerName: '',
      quantity: 40,
      unit: 'hr',
      unitCost: 75,
      notes: ''
    });
    setSaveSuccess(`New resource "${newItem.name}" allocated successfully.`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  if (!activeProj && projects.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#003049] dark:text-purple-400 mx-auto flex items-center justify-center">
          <Users className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Select Project</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a project to inspect allocated contractors, specialized labor, materials, and providers.
          </p>
        </div>
        {onOpenProjectPicker && (
          <button
            type="button"
            onClick={onOpenProjectPicker}
            className="px-4 py-2 bg-[#003049] dark:bg-sky-600 hover:bg-[#002235] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Select Project
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Save Toast Notification */}
      {saveSuccess && (
        <div className="bg-[#003049] dark:bg-slate-800 border border-[#0078d4] text-white px-4 py-2 rounded-xl text-xs flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">{saveSuccess}</span>
          </div>
          <button type="button" onClick={() => setSaveSuccess(null)} className="text-white/70 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & PROJECT SWITCHER BAR - Simple UI like Home tab */}
      <div className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-[#0078d4]/10 text-[#0078d4]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resources
              </h2>
              {activeProj && (
                <span className="font-mono text-xs font-bold text-[#0078d4] dark:text-sky-400 uppercase">
                  {activeProj.code}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              <span>Spend: </span>
              <strong className="text-slate-900 dark:text-slate-100 font-bold">
                {formatCurrency(totalAllocatedSpend, activeProj?.currency)}
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Scope Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setScope('selected')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                scope === 'selected'
                  ? 'bg-white dark:bg-[#0f172a] text-[#0078d4] dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Project
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
                scope === 'all'
                  ? 'bg-white dark:bg-[#0f172a] text-[#0078d4] dark:text-sky-300 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All
            </button>
          </div>

          {/* Simple Project Selector Box */}
          {activeProj && (
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Project:</span>
              <select
                value={activeProj.id}
                onChange={(e) => {
                  const found = projects.find(p => p.id === e.target.value);
                  if (found && onSelectProject) {
                    onSelectProject(found);
                    setScope('selected');
                  }
                }}
                className="bg-transparent text-xs font-bold text-[#0078d4] dark:text-sky-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-900 bg-white">
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
          )}

          {activeProj && onUpdateProject && (
            <>
              <button
                type="button"
                onClick={handleOpenCapacityEditor}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-[#0078d4]" />
                <span>Capacity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewResourceData({
                    name: '',
                    type: 'subcontractor',
                    phaseId: activeProj.phases?.[0]?.id || '',
                    providerName: '',
                    quantity: 40,
                    unit: 'hr',
                    unitCost: 75,
                    notes: ''
                  });
                  setIsAddResourceModalOpen(true);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#0078d4] hover:bg-[#006cbd] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Resource</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onNavigateToSubcontractors}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <Cpu className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Subcontractors</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToOutsourced}
            className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <Truck className="w-3.5 h-3.5 text-[#0078d4]" />
            <span>Outsourced</span>
          </button>
        </div>
      </div>

      {/* 2. SUBCONTRACTOR CAPACITY SUMMARY METRICS - Simple clean stat cards */}
      {activeProj && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Total Capacity Hours */}
          <div
            onClick={() => setSelectedCapacityFilter('all')}
            className={`p-3 rounded-xl border shadow-2xs cursor-pointer transition-all ${
              selectedCapacityFilter === 'all'
                ? 'bg-slate-50 dark:bg-slate-900 border-[#0078d4] ring-1 ring-[#0078d4]'
                : 'bg-white dark:bg-[#0b101b] border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Capacity
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                {capacitySummary.totalCapacityHours.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">hrs</span>
            </div>
          </div>

          {/* Allocated Hours */}
          <div className="bg-white dark:bg-[#0b101b] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Allocated
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className={`text-lg font-bold font-mono ${capacitySummary.totalOverAllocatedHours > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#0078d4] dark:text-sky-300'}`}>
                {capacitySummary.totalAllocatedHours.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">hrs</span>
            </div>
          </div>

          {/* Remaining Capacity Hours */}
          <div
            onClick={() => setSelectedCapacityFilter(selectedCapacityFilter === 'within_capacity' ? 'all' : 'within_capacity')}
            className={`p-3 rounded-xl border shadow-2xs cursor-pointer transition-all ${
              selectedCapacityFilter === 'within_capacity'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-white dark:bg-[#0b101b] border-slate-200 dark:border-slate-800 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Remaining
              </span>
              {selectedCapacityFilter === 'within_capacity' && (
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Filtered</span>
              )}
            </div>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {capacitySummary.totalRemainingHours.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">hrs</span>
            </div>
          </div>

          {/* Overall Utilization % */}
          <div className="bg-white dark:bg-[#0b101b] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Utilization
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className={`text-lg font-bold font-mono ${
                capacitySummary.overallUtilizationPct > 100
                  ? 'text-red-600 dark:text-red-400'
                  : capacitySummary.overallUtilizationPct >= 90
                  ? 'text-amber-500'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {capacitySummary.overallUtilizationPct.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Over-Allocated Phases Alert */}
          <div
            onClick={() => setSelectedCapacityFilter(selectedCapacityFilter === 'over_allocated' ? 'all' : 'over_allocated')}
            className={`p-3 rounded-xl border shadow-2xs cursor-pointer transition-all ${
              selectedCapacityFilter === 'over_allocated'
                ? 'bg-red-100/70 dark:bg-red-950/70 border-red-500 ring-2 ring-red-500'
                : capacitySummary.overAllocatedPhaseCount > 0
                ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 hover:border-red-400'
                : 'bg-white dark:bg-[#0b101b] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                Over-Allocated
              </span>
              {selectedCapacityFilter === 'over_allocated' && (
                <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">Filtered</span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {capacitySummary.overAllocatedPhaseCount > 0 && (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className={`text-lg font-bold font-mono ${capacitySummary.overAllocatedPhaseCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {capacitySummary.overAllocatedPhaseCount}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">/ {capacitySummary.totalPhaseCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. D3.JS INTERACTIVE BAR CHART COMPONENT CONTAINER */}
      {activeProj && (
        <div className="bg-white dark:bg-[#0b101b] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          {/* Chart Toolbar & Interactive Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Phase:
                </span>
                <select
                  value={selectedPhaseFilter}
                  onChange={(e) => setSelectedPhaseFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0078d4] cursor-pointer"
                >
                  <option value="all">All Project Phases ({capacitySummary.phases.length})</option>
                  {capacitySummary.phases.map((p) => (
                    <option key={p.phaseId} value={p.phaseId}>
                      {p.phaseName} ({p.allocatedHours}h / {p.capacityHours}h) {p.isOverAllocated ? '⚠️ Over' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCapacityFilter('all')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                    selectedCapacityFilter === 'all'
                      ? 'bg-white dark:bg-[#0f172a] text-[#003049] dark:text-sky-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({capacitySummary.phases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCapacityFilter('over_allocated')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                    selectedCapacityFilter === 'over_allocated'
                      ? 'bg-red-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-red-600'
                  }`}
                >
                  Over ({capacitySummary.overAllocatedPhaseCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCapacityFilter('near_capacity')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                    selectedCapacityFilter === 'near_capacity'
                      ? 'bg-amber-500 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                  }`}
                >
                  Near Limit
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCapacityFilter('within_capacity')}
                  className={`px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                    selectedCapacityFilter === 'within_capacity'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                  }`}
                >
                  Within Limit
                </button>
              </div>

              {(selectedPhaseFilter !== 'all' || selectedCapacityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhaseFilter('all');
                    setSelectedCapacityFilter('all');
                  }}
                  className="text-xs text-[#0078d4] hover:underline font-semibold cursor-pointer ml-1"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* D3 Chart Element */}
          <SubcontractorCapacityBarChart
            capacityData={capacitySummary}
            selectedPhaseId={selectedPhaseFilter === 'all' ? null : selectedPhaseFilter}
            onSelectPhase={(phaseId) => setSelectedPhaseFilter(phaseId || 'all')}
            highlightCategory={selectedCapacityFilter}
            height={320}
          />
        </div>
      )}

      {/* 4. RESOURCE ALLOCATION SEARCH & FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#0b101b] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search resource or trade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#0078d4] w-48 sm:w-64"
            />
          </div>

          <div className="flex items-center space-x-1">
            {(['all', 'subcontractor', 'outsourced', 'material'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  filterType === t
                    ? 'bg-[#0078d4] text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'all' ? 'All' : t === 'subcontractor' ? 'Subcontractors' : t === 'outsourced' ? 'Outsourced' : 'Materials'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            <strong className="text-slate-900 dark:text-slate-100">{filtered.length}</strong> items
          </span>
          {activeProj && onUpdateProject && (
            <button
              type="button"
              onClick={() => {
                setNewResourceData({
                  name: '',
                  type: 'subcontractor',
                  phaseId: activeProj.phases?.[0]?.id || '',
                  providerName: '',
                  quantity: 40,
                  unit: 'hr',
                  unitCost: 75,
                  notes: ''
                });
                setIsAddResourceModalOpen(true);
              }}
              className="px-2.5 py-1 bg-[#0078d4] hover:bg-[#006cbd] text-white font-semibold rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. ALLOCATIONS GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-[#0b101b] rounded-xl border border-slate-200 dark:border-slate-800">
            No allocated resources found matching your current filter.
          </div>
        ) : (
          filtered.map((item) => {
            const isSub = item.type === 'subcontractor';
            const isOut = item.type === 'outsourced';

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#0b101b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isSub
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : isOut
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-sky-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.type}
                        </span>
                        {item.phaseName && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {item.phaseName}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {item.resourceName}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{item.providerName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase">Rate</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(item.baseRate, item.currency)} / {item.unit}
                      </div>
                    </div>
                  </div>

                  {/* Allocated Projects and Quantities */}
                  <div className="mt-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Connected Allocations
                    </div>
                    {item.allocatedProjects.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-[#0078d4] dark:text-sky-400">
                          {p.projectCode}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px] font-mono">
                          {p.qty} {p.unit}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(p.totalSpend, p.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">{item.skillOrSla}</span>
                  <div className="flex items-center space-x-2">
                    <div className="font-bold text-[#0078d4] dark:text-sky-400 font-mono">
                      Total: {formatCurrency(item.totalSpend, item.currency)}
                    </div>
                    {activeProj && onUpdateProject && (
                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => handleStartEditResource(item)}
                          className="p-1 text-slate-500 hover:text-[#0078d4] dark:hover:text-sky-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Edit Resource Allocation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResourceToDelete({ id: item.id, name: item.resourceName })}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Delete Resource Allocation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. CONFIGURE PHASE CAPACITIES MODAL */}
      {isEditCapacityModalOpen && activeProj && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1424] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Configure Phase Capacity Hours
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCapacityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto text-xs">
              <p className="text-slate-500 dark:text-slate-400">
                Define the available subcontractor working hours capacity for each phase in{' '}
                <strong className="text-slate-800 dark:text-slate-200">{activeProj.name}</strong>.
                The D3.js chart updates instantly to visualize allocations against these thresholds.
              </p>

              <div className="space-y-3">
                {(activeProj.phases || []).map((phase, idx) => {
                  const metric = capacitySummary.phases.find((p) => p.phaseId === phase.id);
                  const currentVal = editingCapacities[phase.id] ?? 160;
                  const allocated = metric?.allocatedHours || 0;
                  const willOverAllocate = currentVal > 0 && allocated > currentVal;

                  return (
                    <div
                      key={phase.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-[#0078d4] font-mono font-bold uppercase block">
                            Phase {phase.phaseNumber || idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {phase.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-500">
                          Allocated: <strong className={willOverAllocate ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>{allocated}h</strong>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            Capacity Hours:
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={currentVal}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setEditingCapacities((prev) => ({ ...prev, [phase.id]: val }));
                            }}
                            className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0078d4]"
                          />
                          <span className="text-slate-400 text-xs">hours</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleResetPhaseCapacity(phase.id)}
                            className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Reset capacity to zero"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhaseFromProject(phase.id)}
                            className="px-2 py-1 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete phase from project"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {willOverAllocate && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Will be over-allocated by +{allocated - currentVal} hours</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add New Phase Section */}
                {isAddingNewPhase ? (
                  <div className="p-3 rounded-xl border border-dashed border-[#0078d4] bg-sky-50/50 dark:bg-sky-950/20 space-y-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Add New Phase</div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Phase Name (e.g., Phase 4: Precision Finishing)"
                        value={newPhaseName}
                        onChange={(e) => setNewPhaseName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#0078d4]"
                      />
                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Capacity Hours:</label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={newPhaseCapacity}
                          onChange={(e) => setNewPhaseCapacity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewPhase(false)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddNewPhaseToProject}
                        disabled={!newPhaseName.trim()}
                        className="px-3 py-1 bg-[#0078d4] text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        Save Phase
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewPhase(true)}
                    className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-[#0078d4] hover:border-[#0078d4] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Project Phase</span>
                  </button>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditCapacityModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCapacities}
                className="px-4 py-1.5 text-xs font-bold bg-[#0078d4] hover:bg-[#006cbd] text-white rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Save Capacity Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. EDIT RESOURCE ALLOCATION MODAL */}
      {isEditResourceModalOpen && editingResourceData && activeProj && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1424] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#0078d4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Edit Resource Allocation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditResourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Resource Name
                </label>
                <input
                  type="text"
                  value={editingResourceData.name}
                  onChange={(e) => setEditingResourceData({ ...editingResourceData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={editingResourceData.type}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, type: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                  >
                    <option value="subcontractor">Subcontractor (Hours)</option>
                    <option value="outsourced">Outsourced Service</option>
                    <option value="material">Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Assigned Phase
                  </label>
                  <select
                    value={editingResourceData.phaseId}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, phaseId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                  >
                    {(activeProj.phases || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Provider / Supplier Name
                </label>
                <input
                  type="text"
                  value={editingResourceData.providerName}
                  onChange={(e) => setEditingResourceData({ ...editingResourceData, providerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Quantity / Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingResourceData.quantity}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editingResourceData.unit}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, unit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rate / Unit Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={editingResourceData.unitCost}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Total Commitment:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency((editingResourceData.quantity || 0) * (editingResourceData.unitCost || 0), activeProj.currency)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditResourceModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedResource}
                className="px-4 py-1.5 text-xs font-bold bg-[#0078d4] text-white rounded-lg shadow-sm hover:bg-[#006cbd] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DELETE RESOURCE CONFIRMATION MODAL */}
      {resourceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1424] w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete Resource</h4>
                <p className="text-xs text-slate-500">This action will remove the allocation from the project.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <strong className="font-bold">{resourceToDelete.name}</strong> from project {activeProj?.code}?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setResourceToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteResource}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                Delete Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ALLOCATE NEW RESOURCE MODAL */}
      {isAddResourceModalOpen && activeProj && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0d1424] w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Allocate Resource to {activeProj.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddResourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Resource / Trade Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master CNC Machining Specialist"
                  value={newResourceData.name}
                  onChange={(e) => setNewResourceData({ ...newResourceData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-semibold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={newResourceData.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewResourceData({
                        ...newResourceData,
                        type: t,
                        unit: t === 'subcontractor' ? 'hr' : t === 'outsourced' ? 'day' : 'pcs'
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                  >
                    <option value="subcontractor">Subcontractor (Hours)</option>
                    <option value="outsourced">Outsourced Service</option>
                    <option value="material">Material</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Target Phase *
                  </label>
                  <select
                    value={newResourceData.phaseId}
                    onChange={(e) => setNewResourceData({ ...newResourceData, phaseId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                  >
                    {(activeProj.phases || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Provider / Contractor Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Precision Engineering Ltd"
                  value={newResourceData.providerName}
                  onChange={(e) => setNewResourceData({ ...newResourceData, providerName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Quantity / Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newResourceData.quantity}
                    onChange={(e) => setNewResourceData({ ...newResourceData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newResourceData.unit}
                    onChange={(e) => setNewResourceData({ ...newResourceData, unit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rate / Cost ({activeProj.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={newResourceData.unitCost}
                    onChange={(e) => setNewResourceData({ ...newResourceData, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Total Commitment:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency((newResourceData.quantity || 0) * (newResourceData.unitCost || 0), activeProj.currency)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddResourceModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewResource}
                disabled={!newResourceData.name.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Allocate to Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
