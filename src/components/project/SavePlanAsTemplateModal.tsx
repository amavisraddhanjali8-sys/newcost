import React, { useState } from 'react';
import { X, Bookmark, CheckCircle2, Package, HardHat, Truck, Sparkles, Check } from 'lucide-react';
import { BudgetaryPlan, ProjectCostItem, PlanTemplate } from '../../types';
import { savePlanTemplate } from '../../utils/planTemplates';

interface SavePlanAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: BudgetaryPlan;
  projectCode?: string;
  projectName?: string;
  clientName?: string;
  onSaved?: (template: PlanTemplate) => void;
}

const COMMON_CATEGORIES = [
  'Aerospace & Defense',
  'Industrial Automation',
  'Robotics & Automation',
  'Value Engineering',
  'Heavy Machinery',
  'Prototyping & Speed',
  'Tooling & Precision Extrusions',
  'Contract Machining'
];

export const SavePlanAsTemplateModal: React.FC<SavePlanAsTemplateModalProps> = ({
  isOpen,
  onClose,
  plan,
  projectCode,
  projectName,
  clientName,
  onSaved
}) => {
  const [templateName, setTemplateName] = useState(
    plan.name.replace(/^Plan [A-Z]:\s*/i, '') + ' Template'
  );
  const [description, setDescription] = useState(
    plan.description || `Reusable sourcing and labor scenario derived from ${projectCode || 'Project'}.`
  );
  const [category, setCategory] = useState('Industrial Automation');
  const [customCategory, setCustomCategory] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState(plan.targetMarginPct || 35);
  const [overheadPct, setOverheadPct] = useState(plan.overheadPct || 8.5);
  const [contingencyPct, setContingencyPct] = useState(plan.contingencyPct || 5.0);

  // Items selection state: allow unchecking items to exclude from template
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() =>
    (plan.selectedItems || []).map(i => i.id)
  );

  const allItems = plan.selectedItems || [];

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedItemIds(allItems.map(i => i.id));
  const deselectAll = () => setSelectedItemIds([]);

  // Calculate direct cost of selected items
  const selectedItems = allItems.filter(i => selectedItemIds.includes(i.id));
  const totalCost = selectedItems.reduce((sum, i) => sum + (i.totalCost || (i.quantity * i.unitCost)), 0);

  const handleSave = () => {
    if (!templateName.trim()) return;

    const finalCategory = category === 'custom' ? (customCategory.trim() || 'General') : category;

    const newTemplate = savePlanTemplate({
      name: templateName.trim(),
      description: description.trim(),
      category: finalCategory,
      tags: [finalCategory, `${selectedItems.length} items`],
      targetMarginPct,
      overheadPct,
      contingencyPct,
      items: selectedItems,
      themeId: plan.themeId || 'pacific-sky',
      customGradient: plan.customGradient,
      sourcePlanName: plan.name,
      sourceProjectCode: projectCode,
      sourceClientName: clientName
    });

    if (onSaved) onSaved(newTemplate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden">
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Save Template</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Template Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Template Title *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="e.g. Domestic Titanium Airframe Sourcing"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-700 font-normal mb-1">
                Industry / Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              >
                {COMMON_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="custom">+ Custom Category...</option>
              </select>
              {category === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom category name..."
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  className="mt-1.5 w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
                />
              )}
            </div>
          </div>

          {/* Scope & Description */}
          <div>
            <label className="block text-[11px] text-slate-700 font-normal mb-1">
              Template Description &amp; Intended Scope
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe when to use this template, supplier specifications, or target savings..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
            />
          </div>

          {/* Financial Parameters */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[10px] text-slate-600 mb-0.5">Target Margin (%)</label>
              <input
                type="number"
                value={targetMarginPct}
                onChange={e => setTargetMarginPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-0.5">Overhead (%)</label>
              <input
                type="number"
                step="0.5"
                value={overheadPct}
                onChange={e => setOverheadPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 mb-0.5">Contingency (%)</label>
              <input
                type="number"
                step="0.5"
                value={contingencyPct}
                onChange={e => setContingencyPct(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-[#003049]"
              />
            </div>
          </div>

          {/* Items Checklist to Include/Exclude */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-700 font-normal">
                Select Items to Include in Template ({selectedItems.length} of {allItems.length} selected)
              </label>
              <div className="space-x-2 text-[10px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[#003049] hover:underline"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-500 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100">
              {allItems.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">
                  This plan has no items yet. A blank template with configured margins will be saved.
                </div>
              ) : (
                allItems.map(item => {
                  const isChecked = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                        isChecked ? 'bg-slate-50/80 hover:bg-slate-100' : 'bg-white opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#003049] focus:ring-[#003049]"
                        />
                        <div className="truncate">
                          <span className="font-normal text-slate-900 block truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {item.supplierOrProvider} • {item.quantity} {item.unit} @ ${item.unitCost}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-normal uppercase mr-2 ${
                            item.type === 'material'
                              ? 'bg-[#003049] text-[#fdf0d5]'
                              : item.type === 'subcontractor'
                              ? 'bg-[#669bbc] text-white'
                              : 'bg-[#780000] text-white'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-normal text-[#003049] text-xs">
                          ${item.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-2 bg-[#fdf0d5]/60 border border-[#ecd5a8] p-2 rounded-lg flex items-center justify-between text-xs">
                <span className="text-[#780000] font-normal">
                  Total Direct Cost of Template Items:
                </span>
                <span className="text-[#003049] font-normal">
                  ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Source: <span className="font-mono text-slate-700">{projectCode || 'PRJ'}</span> ({plan.name})
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!templateName.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs font-normal rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#fdf0d5]" />
              <span>Save to Template Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
