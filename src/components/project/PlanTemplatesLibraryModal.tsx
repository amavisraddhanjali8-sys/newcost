import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bookmark,
  Sparkles,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  HardHat,
  Truck,
  Layers,
  Building2,
  Plus,
  Copy
} from 'lucide-react';
import { PlanTemplate, BudgetaryPlan, ProjectCostItem, Project } from '../../types';
import {
  getAllPlanTemplates,
  deletePlanTemplate,
  createPlanFromTemplate,
  cloneCostItems
} from '../../utils/planTemplates';

interface PlanTemplatesLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project;
  onApplyTemplate: (newPlan: BudgetaryPlan) => void;
  onOpenSaveCurrentPlan?: () => void;
}

export const PlanTemplatesLibraryModal: React.FC<PlanTemplatesLibraryModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onApplyTemplate,
  onOpenSaveCurrentPlan
}) => {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Template Customizer State when applying
  const [activeCustomizingTemplate, setActiveCustomizingTemplate] = useState<PlanTemplate | null>(null);
  const [customPlanName, setCustomPlanName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customMargin, setCustomMargin] = useState(35);
  const [customOverhead, setCustomOverhead] = useState(8.5);
  const [customContingency, setCustomContingency] = useState(5.0);
  const [workingItems, setWorkingItems] = useState<ProjectCostItem[]>([]);

  // Inline Quick Add Item in Customizer
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'material' | 'subcontractor' | 'outsourced'>('material');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCost, setNewItemCost] = useState(100);
  const [newItemSupplier, setNewItemSupplier] = useState('');

  const loadTemplates = () => {
    setTemplates(getAllPlanTemplates());
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setActiveCustomizingTemplate(null);
    }
  }, [isOpen]);

  // Listen to template updates
  useEffect(() => {
    const handleUpdated = () => {
      loadTemplates();
    };
    window.addEventListener('fxtt-plan-templates-updated', handleUpdated);
    return () => window.removeEventListener('fxtt-plan-templates-updated', handleUpdated);
  }, []);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return ['ALL', ...Array.from(cats)];
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())));
      return matchesCat && matchesSearch;
    });
  }, [templates, selectedCategory, search]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this template from your library?')) {
      deletePlanTemplate(id);
      loadTemplates();
    }
  };

  // Start customizing template for current project
  const handleStartApply = (template: PlanTemplate) => {
    setActiveCustomizingTemplate(template);
    setCustomPlanName(`${template.name} (Plan)`);
    setCustomDescription(template.description);
    setCustomMargin(template.targetMarginPct || 35);
    setCustomOverhead(template.overheadPct || 8.5);
    setCustomContingency(template.contingencyPct || 5.0);
    setWorkingItems(cloneCostItems(template.items || [], currentProject.phases?.[0]?.id || 'phase-01'));
  };

  // Delete item from working items
  const handleDeleteWorkingItem = (id: string) => {
    setWorkingItems(prev => prev.filter(i => i.id !== id));
  };

  // Update item quantity or rate
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

  // Quick add item
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
      unit: 'pcs',
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

  const totalDirectCost = useMemo(() => {
    return workingItems.reduce((sum, i) => sum + (i.totalCost || (i.quantity * i.unitCost)), 0);
  }, [workingItems]);

  // Final apply to project
  const handleFinalApply = () => {
    if (!customPlanName.trim() || !activeCustomizingTemplate) return;

    const newPlan: BudgetaryPlan = {
      id: `plan-${Date.now()}`,
      name: customPlanName.trim(),
      description: customDescription.trim(),
      isBaseline: false,
      createdAt: new Date().toISOString().split('T')[0],
      targetMarginPct: customMargin,
      overheadPct: customOverhead,
      contingencyPct: customContingency,
      selectedItems: workingItems,
      themeId: activeCustomizingTemplate.themeId || 'pacific-sky',
      customGradient: activeCustomizingTemplate.customGradient,
      templateId: activeCustomizingTemplate.id
    };

    onApplyTemplate(newPlan);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden">
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {activeCustomizingTemplate ? 'Customize Template' : 'Templates'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View 1: Template Customizer Mode (when applying a template) */}
        {activeCustomizingTemplate ? (
          <div className="p-4 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Based on Template
                </span>
                <span className="font-normal text-slate-900 text-xs">
                  {activeCustomizingTemplate.name} ({activeCustomizingTemplate.category})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomizingTemplate(null)}
                className="text-xs text-[#003049] hover:underline"
              >
                &larr; Back to Templates List
              </button>
            </div>

            {/* Plan Info Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-700 font-normal mb-1">
                  Plan Name in {currentProject.code} *
                </label>
                <input
                  type="text"
                  value={customPlanName}
                  onChange={e => setCustomPlanName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-700 font-normal mb-1">
                  Target Margins &amp; Multipliers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[9px] text-slate-500">Margin %</span>
                    <input
                      type="number"
                      value={customMargin}
                      onChange={e => setCustomMargin(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500">Overhead %</span>
                    <input
                      type="number"
                      step="0.5"
                      value={customOverhead}
                      onChange={e => setCustomOverhead(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-500">Contingency %</span>
                    <input
                      type="number"
                      step="0.5"
                      value={customContingency}
                      onChange={e => setCustomContingency(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Plan Description &amp; Scope
              </label>
              <textarea
                rows={2}
                value={customDescription}
                onChange={e => setCustomDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>

            {/* Items Management Section */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-normal text-slate-900 flex items-center space-x-1.5">
                    <span>Template Items Customizer</span>
                    <span className="bg-[#003049] text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
                      {workingItems.length} items
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Add or delete items, modify quantities, and adjust unit rates for this project.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingItem(!isAddingItem)}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#fdf0d5]" />
                  <span>{isAddingItem ? 'Cancel Add' : '+ Add Item'}</span>
                </button>
              </div>

              {/* Quick Add Form */}
              {isAddingItem && (
                <div className="bg-[#fdf0d5]/40 border border-[#ecd5a8] p-3 rounded-lg space-y-2 animate-in fade-in duration-150">
                  <span className="font-normal text-[#780000] text-xs block">
                    Add Extra Item to Plan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-600">Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Linear Guide Rails"
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
                        <option value="outsourced">Outsourced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600">Supplier / Vendor</label>
                      <input
                        type="text"
                        placeholder="Vendor"
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

              {/* Items Table */}
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
                          No items left in this plan. Use "+ Add Item" above to add cost items.
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
                              onClick={() => handleDeleteWorkingItem(item.id)}
                              className="text-slate-400 hover:text-[#c1121f] p-1 rounded hover:bg-slate-100 transition-colors"
                              title="Delete item"
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

              {/* Direct Cost Rollup */}
              <div className="bg-[#fdf0d5]/60 border border-[#ecd5a8] p-2.5 rounded-lg flex items-center justify-between text-xs">
                <span className="font-normal text-[#780000]">Total Direct Sourcing Cost:</span>
                <span className="font-normal text-[#003049] text-sm">
                  ${totalDirectCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Customizer Footer Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveCustomizingTemplate(null)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalApply}
                disabled={!customPlanName.trim()}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
                <span>Create Plan from Custom Template</span>
              </button>
            </div>
          </div>
        ) : (
          /* View 2: Template Catalog Grid View */
          <div className="p-4 space-y-3.5 text-xs max-h-[78vh] overflow-y-auto">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search templates by title, description, or tags..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              </div>

              {onOpenSaveCurrentPlan && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSaveCurrentPlan();
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-normal rounded-lg border border-slate-200 transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#c1121f]" />
                  <span>+ Save Current Plan as Template</span>
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-normal whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#003049] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-normal text-slate-600">No templates found matching your search.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Try adjusting your filters or save a plan from your projects as a new template.
                  </p>
                </div>
              ) : (
                filteredTemplates.map(tmpl => {
                  const isExpanded = expandedTemplateId === tmpl.id;
                  const directCost = (tmpl.items || []).reduce(
                    (sum, i) => sum + (i.totalCost || (i.quantity * i.unitCost)),
                    0
                  );
                  const matCount = (tmpl.items || []).filter(i => i.type === 'material').length;
                  const subCount = (tmpl.items || []).filter(i => i.type === 'subcontractor').length;
                  const outCount = (tmpl.items || []).filter(i => i.type === 'outsourced').length;

                  return (
                    <div
                      key={tmpl.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Tag & Badges */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-normal uppercase tracking-wider text-[#003049] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {tmpl.category}
                            </span>
                            {tmpl.isBuiltIn ? (
                              <span className="text-[9px] text-[#780000] bg-[#fdf0d5] border border-[#ecd5a8] px-1.5 py-0.2 rounded font-normal">
                                Enterprise Standard
                              </span>
                            ) : (
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-normal">
                                Custom Saved
                              </span>
                            )}
                          </div>

                          {!tmpl.isBuiltIn && (
                            <button
                              type="button"
                              onClick={e => handleDelete(tmpl.id, e)}
                              className="text-slate-400 hover:text-[#c1121f] p-1 rounded hover:bg-slate-100 transition-colors"
                              title="Delete template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-normal text-slate-900 leading-tight">
                          {tmpl.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {tmpl.description}
                        </p>

                        {/* Key Metrics Strip */}
                        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-[11px]">
                          <div>
                            <span className="text-slate-400 block text-[9px]">Direct Cost</span>
                            <span className="font-normal text-slate-900">
                              ${directCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Target Margin</span>
                            <span className="font-normal text-[#003049]">{tmpl.targetMarginPct}%</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">Items</span>
                            <span className="font-normal text-slate-700">
                              {tmpl.items?.length || 0} items
                            </span>
                          </div>
                        </div>

                        {/* Item counts breakdown */}
                        <div className="mt-2 flex items-center space-x-2 text-[10px] text-slate-500">
                          <span>{matCount} Materials</span>
                          <span>•</span>
                          <span>{subCount} Machining</span>
                          <span>•</span>
                          <span>{outCount} Outsourced</span>
                        </div>

                        {/* Expand items detail toggle */}
                        {isExpanded && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 max-h-36 overflow-y-auto text-[11px] space-y-1">
                            {(tmpl.items || []).map(i => (
                              <div
                                key={i.id}
                                className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-50"
                              >
                                <span className="truncate max-w-[180px]">{i.name}</span>
                                <span className="text-slate-500 font-mono">
                                  {i.quantity} {i.unit} @ ${i.unitCost}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setExpandedTemplateId(isExpanded ? null : tmpl.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center space-x-0.5"
                        >
                          <span>{isExpanded ? 'Hide Items' : 'Inspect Items'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartApply(tmpl)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#fdf0d5]" />
                          <span>Use &amp; Customize</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Catalog Footer */}
        {!activeCustomizingTemplate && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Active Project: <span className="font-mono text-slate-800 font-normal">{currentProject.code}</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
