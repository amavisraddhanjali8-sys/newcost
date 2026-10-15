import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Plus,
  Building2,
  Package,
  HardHat,
  Truck,
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { Project, BudgetaryPlan, ProjectCostItem } from '../../types';
import { clonePlanFromOtherProject, cloneCostItems } from '../../utils/planTemplates';

interface ImportPlanFromOtherProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  allProjects: Project[];
  onImportPlan: (newPlan: BudgetaryPlan) => void;
}

export const ImportPlanFromOtherProjectModal: React.FC<ImportPlanFromOtherProjectModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  allProjects,
  onImportPlan
}) => {
  // Candidate projects (excluding current project)
  const candidateProjects = useMemo(() => {
    return allProjects.filter(p => p.id !== currentProject.id);
  }, [allProjects, currentProject.id]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    candidateProjects[0]?.id || ''
  );
  const [searchFilter, setSearchFilter] = useState('');

  // Selected source project
  const sourceProject = useMemo(() => {
    return allProjects.find(p => p.id === selectedProjectId) || candidateProjects[0];
  }, [allProjects, selectedProjectId, candidateProjects]);

  // Plans of source project
  const sourcePlans = useMemo(() => {
    if (!sourceProject) return [];
    if (sourceProject.budgetaryPlans && sourceProject.budgetaryPlans.length > 0) {
      return sourceProject.budgetaryPlans;
    }
    // Fallback baseline plan + value scenario if none explicitly defined
    const baselineItems = sourceProject.selectedItems || [];
    const planBItems = baselineItems.map((item, idx) => ({
      ...item,
      id: `pB-${item.id}-${idx}`,
      unitCost: Number((item.unitCost * 0.88).toFixed(2)),
      totalCost: Number((item.quantity * item.unitCost * 0.88).toFixed(2)),
      supplierOrProvider: `${item.supplierOrProvider} (Domestic Direct)`
    }));

    return [
      {
        id: 'plan-01',
        name: 'Plan A: Certified Enterprise Sourcing (Baseline)',
        description: 'Primary baseline using AS9100D certified mills, ISO 9001 vendors and verified subcontractors.',
        isBaseline: true,
        targetMarginPct: sourceProject.targetMarginPct || 35,
        overheadPct: sourceProject.overheadPct || 8.5,
        contingencyPct: sourceProject.contingencyPct || 5.0,
        selectedItems: baselineItems,
        createdAt: '2026-03-01'
      },
      {
        id: 'plan-02',
        name: 'Plan B: Value-Engineered Domestic Alternative',
        description: 'Domestic tier-2 suppliers with expedited turnaround and direct contract pricing.',
        isBaseline: false,
        targetMarginPct: (sourceProject.targetMarginPct || 35) + 3.5,
        overheadPct: 7.5,
        contingencyPct: 4.0,
        selectedItems: planBItems,
        createdAt: '2026-03-05'
      }
    ];
  }, [sourceProject]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  // Set initial selected plan whenever source project changes
  const activeSourcePlan = useMemo(() => {
    if (!sourcePlans.length) return null;
    const found = sourcePlans.find(p => p.id === selectedPlanId);
    return found || sourcePlans[0];
  }, [sourcePlans, selectedPlanId]);

  // Working copy of items for modification (add/delete/edit before importing)
  const [workingItems, setWorkingItems] = useState<ProjectCostItem[]>([]);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState(35);
  const [overheadPct, setOverheadPct] = useState(8.5);
  const [contingencyPct, setContingencyPct] = useState(5.0);

  // New item quick-add state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'material' | 'subcontractor' | 'outsourced'>('material');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemCost, setNewItemCost] = useState(100);
  const [newItemSupplier, setNewItemSupplier] = useState('');

  // Sync working items and plan name when source plan changes
  const targetPhaseId = currentProject.phases?.[0]?.id || 'phase-01';
  const defaultTargetMargin = currentProject.targetMarginPct || 35;
  const defaultOverhead = currentProject.overheadPct || 8.5;
  const defaultContingency = currentProject.contingencyPct || 5.0;

  React.useEffect(() => {
    if (activeSourcePlan && sourceProject) {
      const cloned = cloneCostItems(activeSourcePlan.selectedItems || [], targetPhaseId);
      setWorkingItems(cloned);
      setPlanName(`${activeSourcePlan.name} (from ${sourceProject.code})`);
      setPlanDescription(
        `Imported from ${sourceProject.name} (${sourceProject.clientName}). Unique isolated plan copy.`
      );
      setTargetMarginPct(activeSourcePlan.targetMarginPct || defaultTargetMargin);
      setOverheadPct(activeSourcePlan.overheadPct || defaultOverhead);
      setContingencyPct(activeSourcePlan.contingencyPct || defaultContingency);
    }
  }, [activeSourcePlan?.id, sourceProject?.id, targetPhaseId]);

  // Delete item from working items
  const handleDeleteItem = (id: string) => {
    setWorkingItems(prev => prev.filter(i => i.id !== id));
  };

  // Modify quantity or cost
  const handleUpdateItemQty = (id: string, qty: number) => {
    setWorkingItems(prev =>
      prev.map(i => {
        if (i.id === id) {
          const total = qty * i.unitCost * (1 - (i.discountPct || 0) / 100);
          return { ...i, quantity: qty, totalCost: Number(total.toFixed(2)) };
        }
        return i;
      })
    );
  };

  const handleUpdateItemCost = (id: string, cost: number) => {
    setWorkingItems(prev =>
      prev.map(i => {
        if (i.id === id) {
          const total = i.quantity * cost * (1 - (i.discountPct || 0) / 100);
          return { ...i, unitCost: cost, totalCost: Number(total.toFixed(2)) };
        }
        return i;
      })
    );
  };

  // Add new item to working copy
  const handleQuickAddItem = () => {
    if (!newItemName.trim()) return;
    const total = newItemQty * newItemCost;
    const newItem: ProjectCostItem = {
      id: `item-quick-${Date.now()}`,
      phaseId: currentProject.phases?.[0]?.id || 'phase-01',
      type: newItemType,
      itemId: `mat-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemType === 'material' ? 'Custom Materials' : newItemType === 'subcontractor' ? 'Contract Machining' : 'Logistics & Services',
      supplierOrProvider: newItemSupplier.trim() || 'Direct Vendor',
      quantity: newItemQty,
      unit: newItemUnit,
      unitCost: newItemCost,
      discountPct: 0,
      totalCost: total,
      selectedOptionIndex: 0,
      alternativeOptions: []
    };

    setWorkingItems(prev => [newItem, ...prev]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemCost(100);
    setNewItemSupplier('');
    setIsAddingItem(false);
  };

  // Direct cost total of working items
  const directCostTotal = useMemo(() => {
    return workingItems.reduce((sum, i) => sum + (i.totalCost || (i.quantity * i.unitCost)), 0);
  }, [workingItems]);

  // Import final plan
  const handleImport = () => {
    if (!planName.trim()) return;

    const newPlanId = `plan-${Date.now()}`;
    const newPlan: BudgetaryPlan = {
      id: newPlanId,
      name: planName.trim(),
      description: planDescription.trim() || 'Unique separated plan imported from another project.',
      isBaseline: false,
      createdAt: new Date().toISOString().split('T')[0],
      targetMarginPct,
      overheadPct,
      contingencyPct,
      selectedItems: workingItems,
      themeId: activeSourcePlan?.themeId || 'pacific-sky',
      customGradient: activeSourcePlan?.customGradient,
      sourceProjectId: sourceProject?.id,
      sourceProjectCode: sourceProject?.code
    };

    onImportPlan(newPlan);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden">
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Import Plan</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
          {candidateProjects.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-normal text-slate-700">No other projects found in your portfolio.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Create additional projects first to cross-import budgetary scenarios.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Source Project and Source Plan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Project selector */}
                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                    Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={e => {
                      setSelectedProjectId(e.target.value);
                      setSelectedPlanId('');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  >
                    {candidateProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.code} • {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                    Plan
                  </label>
                  <select
                    value={activeSourcePlan?.id || ''}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  >
                    {sourcePlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* New Plan Configuration */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={e => setPlanName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                      Parameters
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[9px] text-slate-500">Margin %</span>
                        <input
                          type="number"
                          value={targetMarginPct}
                          onChange={e => setTargetMarginPct(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500">Overhead %</span>
                        <input
                          type="number"
                          step="0.5"
                          value={overheadPct}
                          onChange={e => setOverheadPct(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500">Contingency %</span>
                        <input
                          type="number"
                          step="0.5"
                          value={contingencyPct}
                          onChange={e => setContingencyPct(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-700 font-normal mb-1">
                    Plan Strategic Scope &amp; Notes
                  </label>
                  <textarea
                    rows={2}
                    value={planDescription}
                    onChange={e => setPlanDescription(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              {/* Step 3: Interactive Items Customization (Add / Delete / Edit Items) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-normal text-slate-900 flex items-center space-x-1.5">
                      <span>Customize Items in this Plan</span>
                      <span className="bg-[#003049] text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                        {workingItems.length} items
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      Add, delete, or modify quantities and rates. Changes will not affect the source project.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingItem(!isAddingItem)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
                    <span>{isAddingItem ? 'Cancel Add' : '+ Add Extra Item'}</span>
                  </button>
                </div>

                {/* Inline Quick Add Form */}
                {isAddingItem && (
                  <div className="bg-[#fdf0d5]/40 border border-[#ecd5a8] p-3 rounded-lg space-y-2 animate-in fade-in duration-150">
                    <span className="font-normal text-[#780000] text-xs block">
                      Add New Item to Imported Plan
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-600">Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Precision Linear Rail Set"
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600">Type</label>
                        <select
                          value={newItemType}
                          onChange={e => setNewItemType(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        >
                          <option value="material">Material</option>
                          <option value="subcontractor">Subcontractor</option>
                          <option value="outsourced">Outsourced Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600">Supplier / Vendor</label>
                        <input
                          type="text"
                          placeholder="Vendor name"
                          value={newItemSupplier}
                          onChange={e => setNewItemSupplier(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          value={newItemQty}
                          onChange={e => setNewItemQty(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600">Unit Rate ($)</label>
                        <input
                          type="number"
                          value={newItemCost}
                          onChange={e => setNewItemCost(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleQuickAddItem}
                          disabled={!newItemName.trim()}
                          className="w-full py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded transition-colors disabled:opacity-50"
                        >
                          Insert Item
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Table with Quantity & Cost Editing, and Trash Button */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200 text-[10px] uppercase font-normal">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Supplier</th>
                        <th className="p-2 w-20">Qty</th>
                        <th className="p-2 w-24">Rate ($)</th>
                        <th className="p-2 text-right">Total ($)</th>
                        <th className="p-2 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {workingItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400 text-xs">
                            No items in this plan. Use "+ Add Extra Item" above to add items.
                          </td>
                        </tr>
                      ) : (
                        workingItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-2">
                              <span className="font-normal text-slate-900 block truncate max-w-[200px]">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-normal uppercase ${
                                  item.type === 'material'
                                    ? 'bg-[#003049] text-[#fdf0d5]'
                                    : item.type === 'subcontractor'
                                    ? 'bg-[#669bbc] text-white'
                                    : 'bg-[#780000] text-white'
                                }`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600 truncate max-w-[140px]">
                              {item.supplierOrProvider}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => handleUpdateItemQty(item.id, Math.max(1, Number(e.target.value)))}
                                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={item.unitCost}
                                onChange={e => handleUpdateItemCost(item.id, Number(e.target.value))}
                                className="w-20 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                              />
                            </td>
                            <td className="p-2 text-right font-normal text-[#003049]">
                              ${(item.totalCost || (item.quantity * item.unitCost)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-slate-400 hover:text-[#c1121f] p-1 rounded hover:bg-slate-100 transition-colors"
                                title="Delete item from this plan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Direct Cost Rollup Badge */}
                <div className="bg-[#fdf0d5]/60 border border-[#ecd5a8] p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-normal text-[#780000]">Total Direct Sourcing Cost:</span>
                    <span className="text-slate-600 font-mono">({workingItems.length} active cost lines)</span>
                  </div>
                  <span className="font-normal text-[#003049] text-sm">
                    ${directCostTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Target Project: <span className="font-mono text-slate-800 font-normal">{currentProject.code}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!planName.trim() || candidateProjects.length === 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>Import as New Unique Scenario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
