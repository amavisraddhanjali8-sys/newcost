import React, { useState, useEffect } from 'react';
import {
  FileDown,
  X,
  CheckSquare,
  Square,
  FileType,
  FileSpreadsheet,
  CheckCircle2,
  Boxes,
  Truck,
  Users,
  Cpu,
  Layers,
  FolderGit2,
  PackageCheck,
  AlertCircle,
  Building2,
  ArrowRightLeft,
  ChevronDown
} from 'lucide-react';
import {
  MaterialItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  ProduceItem,
  Project,
  InventoryItem,
  CompanyDetails
} from '../types';
import {
  generateMaterialsCSV,
  generateSuppliersCSV,
  generateSubcontractorsCSV,
  generateOutsourcedCSV,
  generateProduceCSV,
  generateProjectsCSV,
  generateProjectCostItemsCSV,
  generateInventoryCSV,
  generateEnterpriseMasterPDF,
  triggerDownload
} from '../utils/enterpriseExport';
import { formatLKR } from '../utils/currency';

interface ExportEnterpriseDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  suppliers: Supplier[];
  subcontractors: SubcontractorRateItem[];
  outsourcedServices: OutsourcedService[];
  produceItems: ProduceItem[];
  projects: Project[];
  inventory: InventoryItem[];
  companyDetails?: CompanyDetails;
  onToast?: (message: string) => void;
  selectedProject?: Project | null;
  onSelectProject?: (p: Project | null) => void;
  onRequestChangeProject?: () => void;
}

export const ExportEnterpriseDataModal: React.FC<ExportEnterpriseDataModalProps> = ({
  isOpen,
  onClose,
  materials,
  suppliers,
  subcontractors,
  outsourcedServices,
  produceItems,
  projects,
  inventory,
  companyDetails,
  onToast,
  selectedProject = null,
  onSelectProject,
  onRequestChangeProject
}) => {
  const [targetProject, setTargetProject] = useState<Project | null>(selectedProject);
  const [exportFormat, setExportFormat] = useState<'both' | 'pdf' | 'csv'>('both');

  // Synchronize targetProject when modal opens or selectedProject prop changes
  useEffect(() => {
    if (isOpen) {
      setTargetProject(selectedProject || null);
    }
  }, [isOpen, selectedProject]);

  const [selection, setSelection] = useState({
    materials: true,
    suppliers: true,
    subcontractors: true,
    outsourced: true,
    produce: true,
    projects: true,
    projectCostBreakdown: true,
    inventory: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleAll = (selectVal: boolean) => {
    setSelection({
      materials: selectVal,
      suppliers: selectVal,
      subcontractors: selectVal,
      outsourced: selectVal,
      produce: selectVal,
      projects: selectVal,
      projectCostBreakdown: selectVal,
      inventory: selectVal
    });
  };

  const handleSelectProjectChange = (projectId: string) => {
    if (projectId === 'all') {
      setTargetProject(null);
      if (onSelectProject) onSelectProject(null);
    } else {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setTargetProject(found);
        if (onSelectProject) onSelectProject(found);
      }
    }
  };

  // Compute active datasets depending on whether a project is selected
  const activeDatasets = [
    ...(targetProject
      ? [
          {
            id: 'projectCostBreakdown',
            label: `[${targetProject.code}] Cost Items & BOM Breakdown`,
            desc: `Itemized materials, specialist labor & finishing lines for ${targetProject.name}`,
            count: `${targetProject.selectedItems?.length || targetProject.phases?.length || 0} cost lines`,
            icon: FolderGit2,
            color: 'text-sky-600 bg-sky-50 border-sky-200'
          }
        ]
      : []),
    {
      id: 'projects',
      label: targetProject
        ? `Target Project Overview [${targetProject.code}]`
        : 'Capital Projects Portfolio',
      desc: targetProject
        ? `Quotation sheet, milestones & terms for Client: ${targetProject.clientName}`
        : 'Commercial contracts, client quotations, budgets & milestones',
      count: targetProject ? `1 Contract (${formatLKR(targetProject.quotedPrice, { compact: true })})` : `${projects.length} contracts`,
      icon: FolderGit2,
      color: 'text-teal-600 bg-teal-50 border-teal-200'
    },
    {
      id: 'materials',
      label: 'Materials & Raw Stock Catalog',
      desc: 'Raw stock specs, volume tiers, stock levels & unit rates',
      count: `${materials.length} items`,
      icon: Boxes,
      color: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      id: 'suppliers',
      label: 'Approved Enterprise Suppliers',
      desc: 'Vendor profiles, supply scope, ratings & payment terms',
      count: `${suppliers.length} vendors`,
      icon: Truck,
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      id: 'subcontractors',
      label: 'Subcontractor Labor Specialists',
      desc: 'Trade specialist rosters, shift multipliers & billable rates',
      count: `${subcontractors.length} specialists`,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      id: 'outsourced',
      label: 'Outsourced Finishing & Treatment Tariffs',
      desc: 'Surface coating, plating, heat treatment & partner tariffs',
      count: `${outsourcedServices.length} processes`,
      icon: Cpu,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      id: 'produce',
      label: 'Manufactured Products & Assembly SKUs',
      desc: 'Finished good SKUs, target sale pricing & multi-tier BOM',
      count: `${produceItems.length} SKUs`,
      icon: Layers,
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock Valuations',
      desc: 'Warehouse batch balances, reorder points & asset valuation',
      count: `${inventory.length} lots`,
      icon: PackageCheck,
      color: 'text-sky-600 bg-sky-50 border-sky-200'
    }
  ];

  const selectedCount = activeDatasets.filter((d) => (selection as any)[d.id]).length;

  const handleExecuteExport = () => {
    if (selectedCount === 0) {
      if (onToast) onToast('Please select at least one dataset to export.');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const downloadTasks: Array<() => void> = [];

      // 1. PDF download task if requested
      if (exportFormat === 'pdf' || exportFormat === 'both') {
        downloadTasks.push(() => {
          const pdfDoc = generateEnterpriseMasterPDF(
            {
              materials,
              suppliers,
              subcontractors,
              outsourcedServices,
              produceItems,
              projects,
              inventory,
              companyDetails,
              selectedProject: targetProject
            },
            {
              includeMaterials: selection.materials,
              includeSuppliers: selection.suppliers,
              includeSubcontractors: selection.subcontractors,
              includeOutsourced: selection.outsourced,
              includeProduce: selection.produce,
              includeProjects: selection.projects,
              includeInventory: selection.inventory,
              includeProjectCostBreakdown: selection.projectCostBreakdown
            }
          );
          const pdfName = targetProject
            ? `Enterprise-Audit-Report-${targetProject.code}-LKR-${dateStr}.pdf`
            : `Enterprise-Audit-Report-LKR-${dateStr}.pdf`;
          pdfDoc.save(pdfName);
        });
      }

      // 2. CSV download tasks if requested
      if (exportFormat === 'csv' || exportFormat === 'both') {
        // Project specific cost breakdown CSV
        if (targetProject && selection.projectCostBreakdown) {
          downloadTasks.push(() =>
            triggerDownload(
              generateProjectCostItemsCSV(targetProject),
              `Project-${targetProject.code}-CostBreakdown-LKR-${dateStr}.csv`
            )
          );
        }

        if (selection.projects) {
          if (targetProject) {
            downloadTasks.push(() =>
              triggerDownload(
                generateProjectsCSV([targetProject]),
                `Project-${targetProject.code}-Overview-LKR-${dateStr}.csv`
              )
            );
          } else {
            downloadTasks.push(() =>
              triggerDownload(generateProjectsCSV(projects), `Projects-Portfolio-LKR-${dateStr}.csv`)
            );
          }
        }

        if (selection.materials) {
          downloadTasks.push(() =>
            triggerDownload(generateMaterialsCSV(materials), `Materials-Catalog-LKR-${dateStr}.csv`)
          );
        }
        if (selection.suppliers) {
          downloadTasks.push(() =>
            triggerDownload(generateSuppliersCSV(suppliers), `Suppliers-Directory-LKR-${dateStr}.csv`)
          );
        }
        if (selection.subcontractors) {
          downloadTasks.push(() =>
            triggerDownload(generateSubcontractorsCSV(subcontractors), `Subcontractors-Labor-LKR-${dateStr}.csv`)
          );
        }
        if (selection.outsourced) {
          downloadTasks.push(() =>
            triggerDownload(generateOutsourcedCSV(outsourcedServices), `Outsourced-Finishing-LKR-${dateStr}.csv`)
          );
        }
        if (selection.produce) {
          downloadTasks.push(() =>
            triggerDownload(generateProduceCSV(produceItems), `Products-Assemblies-LKR-${dateStr}.csv`)
          );
        }
        if (selection.inventory) {
          downloadTasks.push(() =>
            triggerDownload(generateInventoryCSV(inventory), `Inventory-Valuation-LKR-${dateStr}.csv`)
          );
        }
      }

      // Stagger download tasks so the browser doesn't block parallel downloads
      downloadTasks.forEach((task, index) => {
        setTimeout(task, index * 260);
      });

      setExportSuccess(true);
      if (onToast) {
        onToast(
          targetProject
            ? `Export started for ${targetProject.code} (${targetProject.name}) in Sri Lanka Rupees (LKR)!`
            : `Successfully exported ${selectedCount} dataset(s) in Sri Lanka Rupees (LKR)!`
        );
      }
      setTimeout(() => {
        setIsExporting(false);
      }, downloadTasks.length * 260 + 500);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      if (onToast) onToast('Failed to generate export file(s).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#003049]/10 text-[#003049] flex items-center justify-center shrink-0">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Enterprise Data (PDF / CSV)</h2>
              <p className="text-xs text-slate-500">
                Choose the target format and select individual datasets to generate and download.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Project Scope Banner with Switcher */}
        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#003049] text-white flex items-center justify-center shrink-0">
                <FolderGit2 className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Target Project Scope
                </div>
                <div className="text-xs font-bold text-slate-900 truncate flex items-center space-x-1.5 mt-0.5">
                  {targetProject ? (
                    <>
                      <span className="font-mono bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px]">
                        {targetProject.code}
                      </span>
                      <span className="truncate">{targetProject.name}</span>
                      <span className="text-slate-500 font-normal hidden md:inline">
                        • Client: {targetProject.clientName}
                      </span>
                    </>
                  ) : (
                    <span>Entire Enterprise Portfolio (All {projects.length} Projects)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Switcher Select and Picker trigger */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto shrink-0 justify-end">
              <select
                id="select-export-target-project"
                value={targetProject?.id || 'all'}
                onChange={(e) => handleSelectProjectChange(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#003049] cursor-pointer"
              >
                <option value="all">🌐 All Projects (Portfolio-wide)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 [{p.code}] {p.name} ({p.clientName})
                  </option>
                ))}
              </select>

              {onRequestChangeProject && (
                <button
                  type="button"
                  onClick={onRequestChangeProject}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#003049] transition-colors cursor-pointer flex items-center space-x-1"
                  title="Browse projects database"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span className="hidden sm:inline">Browse</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Currency Notice */}
        <div className="mt-3 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <span className="font-semibold px-2 py-0.5 bg-amber-200/80 rounded-md text-amber-900 text-[11px]">
              LKR
            </span>
            <span>
              All exported pricing, tariffs, valuations, and contract figures are formatted in{' '}
              <strong>Sri Lanka Rupees (LKR / Rs.)</strong>.
            </span>
          </div>
        </div>

        {/* Format Selection Buttons */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-2">Select Export Format</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setExportFormat('both')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === 'both'
                  ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049]'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-900">Both PDF & CSV</span>
                <FileType className="w-4 h-4 text-[#003049]" />
              </div>
              <p className="text-[11px] text-slate-500">Master PDF dossier plus raw CSV tables</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('pdf')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === 'pdf'
                  ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049]'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-900">PDF Report Only</span>
                <FileType className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-[11px] text-slate-500">Formatted executive summary document</p>
            </button>

            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                exportFormat === 'csv'
                  ? 'border-[#003049] bg-[#003049]/5 ring-1 ring-[#003049]'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-900">CSV Spreadsheets</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[11px] text-slate-500">Spreadsheet tables ready for Excel</p>
            </button>
          </div>
        </div>

        {/* Datasets Selection */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">
              Select Datasets to Export ({selectedCount} of {activeDatasets.length} selected)
            </label>
            <div className="space-x-2 text-[11px]">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="text-[#003049] hover:underline font-semibold cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="text-slate-500 hover:underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {activeDatasets.map((item) => {
              const Icon = item.icon;
              const isChecked = (selection as any)[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() =>
                    setSelection((prev) => ({ ...prev, [item.id]: !(prev as any)[item.id] }))
                  }
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-slate-700">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[#003049]" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className={`p-1.5 rounded-lg border ${item.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {item.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={selectedCount === 0 || isExporting}
            onClick={handleExecuteExport}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold text-white flex items-center space-x-2 transition-all cursor-pointer ${
              selectedCount === 0 || isExporting
                ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                : 'bg-[#003049] hover:bg-[#002235] shadow-sm hover:shadow-md'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Files...</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Download Started!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                <span>
                  Export Selected {exportFormat === 'both' ? '(PDF + CSV)' : exportFormat.toUpperCase()}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
