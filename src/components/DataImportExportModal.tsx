import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  ArrowRight,
  Database,
  History,
  Sparkles,
  FolderTree,
  Tag,
  Plus,
  Check,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import {
  ImportEntityType,
  ImportProcessingOptions,
  parseSpreadsheetFile,
  processMaterialsImport,
  processProduceImport,
  processSuppliersImport,
  processSubcontractorsImport,
  processOutsourcedImport,
  processInventoryImport,
  processPriceHistoryImport,
  processProjectCostItemsImport,
  downloadSampleTemplate,
  ParsedImportResult
} from '../utils/excelImport';
import {
  MaterialItem,
  ProduceItem,
  Supplier,
  SubcontractorRateItem,
  OutsourcedService,
  InventoryItem,
  PriceHistoryRecord,
  ProjectCostItem
} from '../types';

interface DataImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: ImportEntityType;
  targetType?: ImportEntityType;
  categoryScope?: string;
  subCategoryScope?: string;
  materials?: MaterialItem[];
  produceItems?: ProduceItem[];
  suppliers?: Supplier[];
  subcontractors?: SubcontractorRateItem[];
  outsourcedServices?: OutsourcedService[];
  onImportMaterials?: (items: Partial<MaterialItem>[]) => void;
  onImportProduce?: (items: Partial<ProduceItem>[]) => void;
  onImportSuppliers?: (items: Partial<Supplier>[]) => void;
  onImportSubcontractors?: (items: Partial<SubcontractorRateItem>[]) => void;
  onImportOutsourced?: (items: Partial<OutsourcedService>[]) => void;
  onImportInventory?: (items: Partial<InventoryItem>[]) => void;
  onImportPriceHistory?: (records: { itemCode: string; record: PriceHistoryRecord }[]) => void;
  onImportProjectCostItems?: (items: ProjectCostItem[]) => void;
  onNotification?: (msg: string) => void;
}

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const DataImportExportModal: React.FC<DataImportExportModalProps> = ({
  isOpen,
  onClose,
  defaultEntity = 'materials',
  targetType,
  categoryScope,
  subCategoryScope,
  materials = [],
  produceItems = [],
  suppliers = [],
  subcontractors = [],
  outsourcedServices = [],
  onImportMaterials,
  onImportProduce,
  onImportSuppliers,
  onImportSubcontractors,
  onImportOutsourced,
  onImportInventory,
  onImportPriceHistory,
  onImportProjectCostItems,
  onNotification
}) => {
  const initialEntity = targetType || defaultEntity;
  const [entityType, setEntityType] = useState<ImportEntityType>(initialEntity);
  const [importMode, setImportMode] = useState<'master' | 'subcategory'>(
    categoryScope || subCategoryScope ? 'subcategory' : 'master'
  );

  // Selected Category & Subcategory
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [customSubCategory, setCustomSubCategory] = useState<string>('');
  const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
  const [moreSubCategory, setMoreSubCategory] = useState<string>('');

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Build unique category-to-subcategories map from all database items
  const categoryTree = useMemo(() => {
    const map = new Map<string, Set<string>>();

    const addEntry = (cat?: string, sub?: string) => {
      const cleanCat = (cat || '').trim();
      const cleanSub = (sub || '').trim();
      if (!cleanCat) return;
      if (!map.has(cleanCat)) {
        map.set(cleanCat, new Set<string>());
      }
      if (cleanSub) {
        map.get(cleanCat)!.add(cleanSub);
      }
    };

    // Materials
    materials.forEach((m) => addEntry(m.category, m.subCategory));
    // Products
    produceItems.forEach((p) => addEntry(p.category, p.subCategory));
    // Subcontractors
    subcontractors.forEach((s) => addEntry(s.category, s.subCategory));
    // Outsourced Services
    outsourcedServices.forEach((o) => addEntry(o.category, o.subCategory));

    // Ensure common industrial baselines exist
    addEntry('Metals & Structural Alloys', 'Aircraft & Marine Alloys');
    addEntry('Metals & Structural Alloys', 'Titanium & Refractory');
    addEntry('Metals & Structural Alloys', 'Stainless Steels');
    addEntry('Metals & Structural Alloys', 'Alloy Tool Steels');
    addEntry('Polymers & Engineering Plastics', 'High Performance Polymers');
    addEntry('Polymers & Engineering Plastics', 'Composite Materials');
    addEntry('Fasteners & Precision Hardware', 'Cap Screws & Studs');
    addEntry('Industrial Automation & Machinery', 'Robotics & Motion Control');
    addEntry('Industrial Automation & Machinery', 'Hydraulic Presses & Pumps');
    addEntry('Fabrication & Specialized Labour', 'Robotic Welding & Assembly');
    addEntry('Fabrication & Specialized Labour', 'Precision 5-Axis CNC Machining');
    addEntry('Heavy Transportation & Logistics', 'Specialized Flatbed Haulage');
    addEntry('Heavy Transportation & Logistics', 'Hazardous Cargo Freight');
    addEntry('Quality & NDT Inspection', 'Spectrometry & Stress Testing');

    return map;
  }, [materials, produceItems, subcontractors, outsourcedServices]);

  const categoriesList = useMemo(() => {
    return Array.from(categoryTree.keys()).sort();
  }, [categoryTree]);

  const subCategoriesList = useMemo(() => {
    if (!selectedCategory || !categoryTree.has(selectedCategory)) {
      return [];
    }
    return Array.from(categoryTree.get(selectedCategory)!).sort();
  }, [selectedCategory, categoryTree]);

  // Synchronize on modal open or categoryScope/subCategoryScope change
  useEffect(() => {
    const target = targetType || defaultEntity;
    setEntityType(target);
    setFile(null);
    setParsedResult(null);
    setErrorMsg(null);

    if (categoryScope || subCategoryScope) {
      setImportMode('subcategory');

      if (categoryScope && subCategoryScope) {
        setSelectedCategory(categoryScope);
        setSelectedSubCategory(subCategoryScope);
      } else if (categoryScope) {
        // Check if categoryScope matches an existing category
        if (categoryTree.has(categoryScope)) {
          setSelectedCategory(categoryScope);
          const subs = Array.from(categoryTree.get(categoryScope)!);
          setSelectedSubCategory(subs[0] || 'General Specification');
        } else {
          // Check if categoryScope is a subcategory in any category
          let foundCat = '';
          let foundSub = '';
          for (const [cat, subs] of categoryTree.entries()) {
            if (subs.has(categoryScope)) {
              foundCat = cat;
              foundSub = categoryScope;
              break;
            }
          }

          if (foundCat) {
            setSelectedCategory(foundCat);
            setSelectedSubCategory(foundSub);
          } else {
            // Default to first category and use categoryScope as custom subcategory
            const firstCat = categoriesList[0] || 'Metals & Structural Alloys';
            setSelectedCategory(firstCat);
            setSelectedSubCategory(categoryScope);
          }
        }
      } else if (subCategoryScope) {
        let foundCat = '';
        for (const [cat, subs] of categoryTree.entries()) {
          if (subs.has(subCategoryScope)) {
            foundCat = cat;
            break;
          }
        }
        setSelectedCategory(foundCat || categoriesList[0] || 'Metals & Structural Alloys');
        setSelectedSubCategory(subCategoryScope);
      }
    } else {
      if (!selectedCategory && categoriesList.length > 0) {
        setSelectedCategory(categoriesList[0]);
        const subs = Array.from(categoryTree.get(categoriesList[0]) || []);
        setSelectedSubCategory(subs[0] || 'General Specification');
      }
    }
  }, [isOpen, defaultEntity, targetType, categoryScope, subCategoryScope, categoriesList, categoryTree]);

  // When selectedCategory changes, update selectedSubCategory to first valid
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setIsCustomSubCategory(false);
    setCustomSubCategory('');
    const subs = Array.from(categoryTree.get(newCat) || []);
    setSelectedSubCategory(subs[0] || 'General Specification');
    // Clear previous parse result when subcategory changes
    if (parsedResult) {
      setParsedResult(null);
      setFile(null);
    }
  };

  const activeSubCategoryName = isCustomSubCategory
    ? customSubCategory.trim() || 'Custom Specification'
    : selectedSubCategory || 'General Specification';

  const processingOptions: ImportProcessingOptions = useMemo(() => {
    return {
      mode: importMode,
      category: selectedCategory,
      subCategory: activeSubCategoryName,
      moreSubCategory: moreSubCategory.trim() || undefined,
      forceSubcategory: importMode === 'subcategory'
    };
  }, [importMode, selectedCategory, activeSubCategoryName, moreSubCategory]);

  if (!isOpen) return null;

  const handleFileSelected = async (selectedFile: File) => {
    setErrorMsg(null);
    if (!selectedFile) return;

    if (selectedFile.size > MAX_CSV_SIZE_BYTES) {
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      setErrorMsg(
        `File "${selectedFile.name}" (${sizeMb} MB) exceeds the 10 MB maximum limit. Please choose a file up to 10 MB.`
      );
      setFile(null);
      setParsedResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size === 0) {
      setErrorMsg(`File "${selectedFile.name}" is empty (0 bytes). Please upload a valid CSV or spreadsheet.`);
      setFile(null);
      setParsedResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const { rawRows } = await parseSpreadsheetFile(selectedFile);
      if (rawRows.length === 0) {
        throw new Error('Spreadsheet contains no data rows.');
      }

      let res: ParsedImportResult;
      switch (entityType) {
        case 'materials':
          res = processMaterialsImport(rawRows, processingOptions);
          break;
        case 'produce':
          res = processProduceImport(rawRows, processingOptions);
          break;
        case 'suppliers':
          res = processSuppliersImport(rawRows);
          break;
        case 'subcontractors':
          res = processSubcontractorsImport(rawRows, processingOptions);
          break;
        case 'outsourced':
          res = processOutsourcedImport(rawRows, processingOptions);
          break;
        case 'inventory':
          res = processInventoryImport(rawRows);
          break;
        case 'price_history':
          res = processPriceHistoryImport(rawRows);
          break;
        case 'project_cost_items':
          res = processProjectCostItemsImport(rawRows, processingOptions);
          break;
        default:
          res = processMaterialsImport(rawRows, processingOptions);
      }

      if (!res.success || res.validRows.length === 0) {
        throw new Error(
          res.errors[0] || 'Unable to parse valid records. Please verify column headers against the template.'
        );
      }

      setParsedResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file. Please upload a valid Excel or CSV file.');
      setParsedResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedResult || parsedResult.validRows.length === 0) return;

    try {
      switch (entityType) {
        case 'materials':
          onImportMaterials?.(parsedResult.validRows);
          break;
        case 'produce':
          onImportProduce?.(parsedResult.validRows);
          break;
        case 'suppliers':
          onImportSuppliers?.(parsedResult.validRows);
          break;
        case 'subcontractors':
          onImportSubcontractors?.(parsedResult.validRows);
          break;
        case 'outsourced':
          onImportOutsourced?.(parsedResult.validRows);
          break;
        case 'inventory':
          onImportInventory?.(parsedResult.validRows);
          break;
        case 'price_history':
          onImportPriceHistory?.(parsedResult.validRows);
          break;
        case 'project_cost_items':
          onImportProjectCostItems?.(parsedResult.validRows);
          break;
      }

      const count = parsedResult.validRows.length;
      const targetLabel =
        importMode === 'subcategory'
          ? `into subcategory "${activeSubCategoryName}"`
          : 'into the master database';
      const msg = `Imported ${count} ${entityType} records ${targetLabel}!`;
      onNotification?.(msg);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving imported records.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Simple Top Row - Header removed as requested */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Import Data</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. IMPORT MODE SELECTOR: MASTER DATASETS VS SUBCATEGORY WISE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Import Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setImportMode('master');
                  setParsedResult(null);
                  setFile(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  importMode === 'master'
                    ? 'border-[#0077b6] bg-blue-50/70 text-[#003049] shadow-2xs ring-1 ring-[#0077b6]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    importMode === 'master' ? 'bg-[#0077b6] text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Master Data Sets</span>
                    {importMode === 'master' && <Check className="w-3.5 h-3.5 text-[#0077b6]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Bulk import across all categories. Categories are read from the spreadsheet columns.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportMode('subcategory');
                  setParsedResult(null);
                  setFile(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  importMode === 'subcategory'
                    ? 'border-[#0077b6] bg-blue-50/70 text-[#003049] shadow-2xs ring-1 ring-[#0077b6]'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    importMode === 'subcategory' ? 'bg-[#0077b6] text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Subcategory Wise</span>
                    {importMode === 'subcategory' && <Check className="w-3.5 h-3.5 text-[#0077b6]" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Directly assign all imported items into a selected subcategory.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. SUBCATEGORY PICKER (When in subcategory mode) */}
          {importMode === 'subcategory' && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Target Subcategory Assignment</span>
                </span>
                {categoryScope && (
                  <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                    Current View: {categoryScope}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Category Select */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Parent Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0077b6] cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory Select or Custom Entry */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700">Subcategory</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubCategory(!isCustomSubCategory)}
                      className="text-[10px] text-[#0077b6] hover:underline font-medium cursor-pointer"
                    >
                      {isCustomSubCategory ? 'Choose Existing' : '+ New Subcategory'}
                    </button>
                  </div>

                  {isCustomSubCategory ? (
                    <input
                      type="text"
                      value={customSubCategory}
                      onChange={(e) => {
                        setCustomSubCategory(e.target.value);
                        if (parsedResult) {
                          setParsedResult(null);
                          setFile(null);
                        }
                      }}
                      placeholder="Enter new subcategory name..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0077b6]"
                    />
                  ) : (
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => {
                        setSelectedSubCategory(e.target.value);
                        if (parsedResult) {
                          setParsedResult(null);
                          setFile(null);
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0077b6] cursor-pointer"
                    >
                      {subCategoriesList.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      {subCategoriesList.length === 0 && (
                        <option value="General Specification">General Specification</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {/* Active Target Banner */}
              <div className="p-2.5 bg-white/90 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    All imported items will be placed into:{' '}
                    <strong className="text-slate-900">{selectedCategory}</strong> ›{' '}
                    <strong className="text-[#0077b6]">{activeSubCategoryName}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. TARGET ENTITY SELECTOR */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Item Type to Import
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'materials', label: 'Materials', icon: Layers },
                { id: 'project_cost_items', label: 'Project Cost Items', icon: SlidersHorizontal },
                { id: 'produce', label: 'Products & Assemblies', icon: Sparkles },
                { id: 'subcontractors', label: 'Subcontractor Labor', icon: FileText },
                { id: 'outsourced', label: 'Outsourced Services', icon: Database },
                { id: 'suppliers', label: 'Suppliers Directory', icon: Database },
                { id: 'inventory', label: 'Inventory Stock', icon: Layers },
                { id: 'price_history', label: 'Price History', icon: History }
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = entityType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setEntityType(item.id as ImportEntityType);
                      setParsedResult(null);
                      setFile(null);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center space-x-2 p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0077b6] bg-blue-50/70 text-[#0077b6] font-semibold shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#0077b6]' : 'text-slate-400'}`} />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. DOWNLOAD TEMPLATE BUTTONS */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div>
              <div className="text-xs font-bold text-slate-800">Need a template?</div>
              <div className="text-[11px] text-slate-500">
                {importMode === 'subcategory'
                  ? `Download template prefilled with "${activeSubCategoryName}" subcategory.`
                  : 'Download standard template with sample rows and column headers.'}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadSampleTemplate(entityType, 'csv', processingOptions)}
                className="px-2.5 py-1.5 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Sample CSV</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSampleTemplate(entityType, 'xlsx', processingOptions)}
                className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Sample Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* 5. DROP ZONE / FILE UPLOADER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <Upload className="w-3.5 h-3.5 text-[#0077b6]" />
                <span>Upload Excel or CSV File</span>
              </span>
              <span className="text-[11px] text-slate-400">Max 10 MB</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#0077b6] bg-blue-50/50 scale-[0.99]'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div
                  className={`p-3 rounded-full ${
                    file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#0077b6]'
                  }`}
                >
                  {file ? <CheckCircle2 className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">
                    {file ? file.name : 'Choose CSV or Excel file'}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {file ? (
                      <span className="text-emerald-700 font-medium">
                        {(file.size / 1024).toFixed(1)} KB • Ready to import
                      </span>
                    ) : (
                      'Drag and drop files here, or click to browse'
                    )}
                  </p>
                </div>

                {!file && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-1 px-3.5 py-1.5 text-xs font-semibold bg-[#0077b6] hover:bg-[#005f94] text-white rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-white" />
                    <span>Browse Files</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedResult && parsedResult.validRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Ready to import: {parsedResult.validRows.length} valid item(s)
                  </span>
                </div>
                {importMode === 'subcategory' && (
                  <span className="text-[11px] bg-sky-100 text-[#0077b6] font-semibold px-2 py-0.5 rounded">
                    Assigned to: {activeSubCategoryName}
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Row</th>
                      <th className="py-2 px-3 font-semibold">Code</th>
                      <th className="py-2 px-3 font-semibold">Name</th>
                      <th className="py-2 px-3 font-semibold">Category</th>
                      <th className="py-2 px-3 font-semibold">Subcategory</th>
                      <th className="py-2 px-3 font-semibold text-right">Price / Rate ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedResult.samplePreview.map((r: any, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono text-[#0077b6]">{r.code || r.sku || r.itemCode}</td>
                        <td className="py-1.5 px-3 text-slate-800 font-medium truncate max-w-xs">
                          {r.name || r.itemName || r.serviceName}
                        </td>
                        <td className="py-1.5 px-3 text-slate-600 truncate">{r.category || selectedCategory}</td>
                        <td className="py-1.5 px-3 text-slate-600 truncate font-semibold">
                          {r.subCategory || activeSubCategoryName}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                          ${r.retailPrice || r.retailRate || r.rate || r.unitCost || r.costPrice || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parsedResult ? `${parsedResult.validRows.length} records ready` : 'No file chosen'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!parsedResult || parsedResult.validRows.length === 0}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                parsedResult && parsedResult.validRows.length > 0
                  ? 'bg-[#0077b6] hover:bg-[#005f94] text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>
                {importMode === 'subcategory'
                  ? `Import to "${activeSubCategoryName}"`
                  : 'Confirm & Import Records'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
