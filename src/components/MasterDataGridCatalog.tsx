import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  RotateCw,
  Edit,
  Plus,
  Download,
  Upload,
  Mail,
  CheckSquare,
  Square,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  History,
  DollarSign,
  Layers,
  Boxes,
  Truck,
  Cpu,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  FolderPlus,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Info,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Sliders,
  HelpCircle,
  Check,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { MaterialItem, OutsourcedService, SubcontractorRateItem, Supplier, Project, ProduceItem, PriceHistoryRecord } from '../types';
import { ItemImageViewerModal } from './ItemImageViewerModal';
import { ItemGridCard, ItemGridCardData } from './ItemGridCard';
import { FXTTPriceAuditLogFullScreenModal } from './FXTTPriceAuditLogFullScreenModal';
import { parseSmartSearch, evaluateSmartSearch, SearchableField } from '../utils/smartSearch';
import { ItemDetailsAndPriceAuditModal } from './ItemDetailsAndPriceAuditModal';
import { downloadCSV } from '../utils/csvExport';
import { parseSpreadsheetFile, MAX_FILE_SIZE_BYTES } from '../utils/excelImport';
import { GoogleSearchPreviewModal, GoogleSearchPreviewItem } from './GoogleSearchPreviewModal';
import { DataImportExportModal } from './DataImportExportModal';

export interface CatalogGridItem {
  id: string;
  code: string;
  name: string;
  classification: 'product' | 'material' | 'service' | 'labour';
  category: string;
  subCategory: string;
  rate: number;
  unit: string;
  stockOrSla: string;
  inStockNumber?: number;
  supplierName: string;
  supplierCountry: string;
  status: 'In Stock' | 'Active' | 'Read only' | 'Enabled' | 'Lead Exist' | 'Under Review' | 'Low Stock';
  email: string;
  phone: string;
  createdTime: string;
  assignedTo: string;
  rawType: 'material' | 'service' | 'subcontractor' | 'product';
  rawItem: any;
  priceHistory?: PriceHistoryRecord[];
  imageUrl?: string;
}

interface MasterDataGridCatalogProps {
  materials: MaterialItem[];
  services: OutsourcedService[];
  subcontractors: SubcontractorRateItem[];
  suppliers: Supplier[];
  projects: Project[];
  produceItems?: ProduceItem[];
  selectedProject?: Project | null;
  onUpdateMaterialPrice?: (id: string, newPrice: number, reason: string) => void;
  onUpdateServiceRate?: (id: string, newRate: number, reason: string, updatedBy: string) => void;
  onAddItemToProject?: (projectId: string, item: any) => void;
  onAddNewItem?: (item: any) => void;
  onEditRecord?: (rawType: 'material' | 'service' | 'subcontractor' | 'product', item: any) => void;
  onDeleteRecord?: (rawType: 'material' | 'service' | 'subcontractor' | 'product', id: string) => void;
  initialFilterTab?: string;
  embeddedMode?: boolean; // When used inside MaterialsView or ServicesView
}

export const MasterDataGridCatalog: React.FC<MasterDataGridCatalogProps> = ({
  materials,
  services,
  subcontractors,
  suppliers,
  projects,
  produceItems = [],
  selectedProject,
  onUpdateMaterialPrice,
  onUpdateServiceRate,
  onAddItemToProject,
  onAddNewItem,
  onEditRecord,
  onDeleteRecord,
  initialFilterTab = 'ALL',
  embeddedMode = false
}) => {
  // Top Filter Tabs (matching FXTT style)
  const [activeTab, setActiveTab] = useState<string>(initialFilterTab);

  // Smart Search & Multiple Filtering Settings State
  const [globalSmartSearch, setGlobalSmartSearch] = useState('');
  const [showSearchHelp, setShowSearchHelp] = useState(false);
  const [isFilterSettingsOpen, setIsFilterSettingsOpen] = useState(false);
  const [activeSmartPreset, setActiveSmartPreset] = useState<string>('all');
  const [filterLogicMode, setFilterLogicMode] = useState<'AND' | 'OR'>('AND');
  const [googleSearchItem, setGoogleSearchItem] = useState<GoogleSearchPreviewItem | null>(null);

  // Granular Filter Settings
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rateMin, setRateMin] = useState<string>('');
  const [rateMax, setRateMax] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'high_stock'>('all');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [hasPriceHistoryOnly, setHasPriceHistoryOnly] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Grid Column Customization & Density Settings
  const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact'>('compact');
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    info: true,
    name: true,
    classification: true,
    category: true,
    rate: true,
    stockOrSla: true,
    supplierName: true,
    status: true,
    createdTime: true,
    actions: true
  });

  // Search & Filtering State
  const [filterByField, setFilterByField] = useState<string>('all');
  const [columnSearch, setColumnSearch] = useState({
    code: '',
    name: '',
    classification: 'all',
    category: '',
    maxRate: '',
    supplier: 'all',
    status: 'all',
    date: '',
    assignedTo: ''
  });

  // Status operator filter popup state (Equals, Starts with, Contains, Not equal to, Does not contain)
  const [statusOperator, setStatusOperator] = useState<string>('Contains');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof CatalogGridItem>('code');
  const [sortAsc, setSortAsc] = useState(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination (matching bottom bar)
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(15);

  // Expandable isolated price history list per item
  const [expandedGridHistoryIds, setExpandedGridHistoryIds] = useState<Set<string>>(new Set());

  const toggleGridHistory = (id: string) => {
    setExpandedGridHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Modals & Display Mode
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [fullScreenAuditItem, setFullScreenAuditItem] = useState<ItemGridCardData | null>(null);
  const [detailsModalItem, setDetailsModalItem] = useState<{ item: ItemGridCardData; tab: 'details' | 'audit' } | null>(null);
  const [editItem, setEditItem] = useState<CatalogGridItem | null>(null);
  const [viewDetailItem, setViewDetailItem] = useState<CatalogGridItem | null>(null);
  const [addToProjectItem, setAddToProjectItem] = useState<CatalogGridItem | null>(null);
  const [activeImageViewerItem, setActiveImageViewerItem] = useState<CatalogGridItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Quick Edit form state
  const [editName, setEditName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editSubCategory, setEditSubCategory] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('pcs');
  const [editRate, setEditRate] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('Active');
  const [editStock, setEditStock] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');

  // Delete Confirmation States
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<CatalogGridItem | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState<boolean>(false);

  // Add to Project State
  const [targetProjectId, setTargetProjectId] = useState<string>(selectedProject?.id || projects[0]?.id || '');
  const [addQuantity, setAddQuantity] = useState<number>(1);

  // Add New Item State
  const [newItemType, setNewItemType] = useState<'material' | 'product' | 'service'>('material');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemRate, setNewItemRate] = useState<number>(100);
  const [newItemUnit, setNewItemUnit] = useState('pcs');
  const [newItemSupplier, setNewItemSupplier] = useState(suppliers[0]?.name || 'Apex Metallurgy Corp');

  // Trigger temporary notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // CSV Device Import Modal State (Strict 10MB limit)
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedItems, setCsvParsedItems] = useState<any[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [isCsvProcessing, setIsCsvProcessing] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const resetCsvModal = () => {
    setCsvFile(null);
    setCsvParsedItems([]);
    setCsvError(null);
    setIsCsvDragging(false);
    setIsCsvProcessing(false);
    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
  };

  const handleDeviceCsvFileSelect = async (file: File) => {
    setCsvError(null);
    if (!file) return;

    // Strict 10MB maximum limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setCsvError(
        `Selected file "${file.name}" (${sizeMb} MB) exceeds the 10 MB maximum limit. Please select a CSV under 10 MB.`
      );
      setCsvFile(null);
      setCsvParsedItems([]);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    if (file.size === 0) {
      setCsvError(`Selected file "${file.name}" is empty (0 bytes).`);
      setCsvFile(null);
      setCsvParsedItems([]);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
      return;
    }

    setCsvFile(file);
    setIsCsvProcessing(true);

    try {
      const { rawRows } = await parseSpreadsheetFile(file);
      if (!rawRows || rawRows.length === 0) {
        throw new Error('CSV file contains no data rows.');
      }

      const parsedItems: any[] = [];
      rawRows.forEach((row, idx) => {
        const cleanRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          cleanRow[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
        }

        const name = cleanRow['itemname'] || cleanRow['name'] || cleanRow['title'] || cleanRow['description'];
        if (!name) return;

        const code = cleanRow['itemcode'] || cleanRow['code'] || cleanRow['sku'] || cleanRow['id'] || `CAT-IMP-${Date.now() + idx}`;
        const category = cleanRow['category'] || 'General Industrial';
        const subCategory = cleanRow['subcategory'] || 'General Catalog Spec';
        const classification = cleanRow['classification'] === 'product' || cleanRow['classification'] === 'final_product' ? 'final_product' : 'raw_material';
        const rate = Number(cleanRow['retailprice'] || cleanRow['price'] || cleanRow['rate'] || cleanRow['unitcost'] || 100);
        const unit = cleanRow['unit'] || 'pcs';
        const supplierName = cleanRow['suppliername'] || cleanRow['supplier'] || (suppliers[0]?.name || 'Apex Metallurgy Corp');
        const inStock = Number(cleanRow['instock'] || cleanRow['stock'] || cleanRow['quantity'] || 50);

        parsedItems.push({
          id: `cat-imp-${Date.now()}-${idx}`,
          code: String(code).trim(),
          name: String(name).trim(),
          category: String(category).trim(),
          subCategory: String(subCategory).trim(),
          itemClassification: classification,
          supplierName: String(supplierName).trim(),
          unit: String(unit).trim(),
          retailPrice: isNaN(rate) ? 100 : rate,
          defaultDiscountPct: Number(cleanRow['discount'] || cleanRow['defaultdiscountpct'] || 5),
          inStock: isNaN(inStock) ? 50 : inStock,
          reorderPoint: 15,
          leadTimeDays: 7,
          lastUpdated: new Date().toISOString().slice(0, 10),
          priceHistory: [
            {
              id: `hist-imp-${Date.now()}-${idx}`,
              date: new Date().toISOString().slice(0, 10),
              previousPrice: isNaN(rate) ? 100 : rate,
              newPrice: isNaN(rate) ? 100 : rate,
              changePct: 0,
              reason: 'Imported from local device CSV',
              updatedBy: 'Catalog Ingestion'
            }
          ]
        });
      });

      if (parsedItems.length === 0) {
        throw new Error('No valid item records found. Please ensure the CSV contains an "Item Name" column.');
      }

      setCsvParsedItems(parsedItems);
    } catch (err: any) {
      setCsvError(err.message || 'Failed to read CSV file. Please check format.');
      setCsvParsedItems([]);
    } finally {
      setIsCsvProcessing(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const headers = [
      'Item Code',
      'Item Name',
      'Category',
      'SubCategory',
      'Classification',
      'Supplier Name',
      'Retail Price',
      'Unit',
      'In Stock'
    ];
    const sampleRows = [
      ['MET-TIT-01', 'Grade 5 Titanium Alloy Plate 10mm', 'Metals & Structural Alloys', 'Plate & Bar Stock', 'raw_material', 'Apex Metallurgy Corp', 420, 'sqm', 85],
      ['HYD-VAL-02', 'High-Pressure Directional Valve 350 Bar', 'Fluid Power & Hydraulics', 'Valves & Actuators', 'raw_material', 'Precision Hydraulics Ltd', 1250, 'pcs', 30],
      ['PRD-ARM-01', 'Articulated 6-Axis Robotic Arm Station', 'Industrial Automation & Robotics', 'Robotics Systems', 'final_product', 'Nexus Robotics Systems', 45000, 'system', 6],
      ['ELC-MOD-04', 'Integrated Motion Servo Controller 48V', 'Electronics & Power', 'Drives & Controllers', 'raw_material', 'Vanguard Electronics', 680, 'unit', 110]
    ];
    downloadCSV('item_master_catalog_sample.csv', headers, sampleRows);
  };

  const handleConfirmCsvImport = () => {
    if (csvParsedItems.length === 0) return;
    csvParsedItems.forEach((item) => {
      if (onAddNewItem) {
        onAddNewItem(item);
      }
    });
    showToast(`Successfully imported ${csvParsedItems.length} item(s) from device CSV into catalog.`);
    resetCsvModal();
    setIsImportModalOpen(false);
  };

  // Harmonize all items into single uniform CatalogGridItem model
  const allItems: CatalogGridItem[] = useMemo(() => {
    const list: CatalogGridItem[] = [];

    // 1. Materials & Products from materials prop
    materials.forEach((mat, idx) => {
      const isProduct = mat.itemClassification === 'final_product';
      const sup = suppliers.find((s) => s.id === mat.supplierId || s.name === mat.supplierName);
      list.push({
        id: mat.id,
        code: mat.code || `ACC100${15840 + idx}`,
        name: mat.name,
        classification: isProduct ? 'product' : 'material',
        category: mat.category,
        subCategory: mat.subCategory,
        rate: mat.retailPrice,
        unit: mat.unit,
        stockOrSla: `${mat.inStock} ${mat.unit}s`,
        inStockNumber: mat.inStock,
        supplierName: mat.supplierName || 'Apex Metallurgy Corp',
        supplierCountry: sup?.country || 'United States',
        status: mat.inStock > 50 ? 'In Stock' : mat.inStock > 0 ? 'Lead Exist' : 'Under Review',
        email: sup?.email || 'procurement@apexmetals.com',
        phone: sup?.phone || '+1 415 890 2100',
        createdTime: mat.lastUpdated || '',
        assignedTo: isProduct ? 'Engineering Team' : 'Procurement Lead',
        rawType: 'material',
        rawItem: mat,
        priceHistory: mat.priceHistory || []
      });
    });

    // 1b. Finished Products (Produce Items) with their isolated priceHistory
    if (produceItems && produceItems.length > 0) {
      produceItems.forEach((prd) => {
        list.push({
          id: prd.id,
          code: prd.code,
          name: prd.name,
          classification: 'product',
          category: prd.category,
          subCategory: prd.subCategory,
          rate: prd.retailPrice,
          unit: prd.unit,
          stockOrSla: `${prd.stockQuantity} ${prd.unit}s`,
          inStockNumber: prd.stockQuantity,
          supplierName: prd.assemblyFacility || 'Precision Production Plant',
          supplierCountry: 'United States',
          status: prd.stockQuantity > 0 ? 'In Stock' : 'Lead Exist',
          email: 'production@crm-itemmaster.com',
          phone: '+1 800 555 0199',
          createdTime: prd.lastUpdated || '',
          assignedTo: 'Lead Systems Architect',
          rawType: 'product',
          rawItem: prd,
          priceHistory: prd.priceHistory || []
        });
      });
    }

    // 2. Outsourced Services with isolated priceHistory
    services.forEach((svc, idx) => {
      const sup = suppliers.find((s) => s.id === svc.providerId || s.name === svc.providerName);
      list.push({
        id: svc.id,
        code: `SVC-OS-${100 + idx}`,
        name: svc.name,
        classification: 'service',
        category: svc.category,
        subCategory: svc.subCategory,
        rate: svc.retailPrice || svc.rate,
        unit: svc.baseUnitType.replace('_', ' '),
        stockOrSla: svc.slaLevel || 'Premium 99.9%',
        supplierName: svc.providerName,
        supplierCountry: sup?.country || 'United States',
        status: 'Active',
        email: sup?.email || 'ops@globalservices.net',
        phone: sup?.phone || '+1 312 670 3490',
        createdTime: svc.lastUpdated || '',
        assignedTo: 'Operations Director',
        rawType: 'service',
        rawItem: svc,
        priceHistory: svc.priceHistory || []
      });
    });

    // 3. Subcontractors & Labour Rates with isolated rateHistory/priceHistory
    subcontractors.forEach((sub, idx) => {
      list.push({
        id: sub.id,
        code: sub.code || `LAB-SUB-${200 + idx}`,
        name: sub.nicheServiceName || sub.serviceType || 'Specialized Engineering Labour',
        classification: 'labour',
        category: sub.serviceCategory || sub.serviceType || 'Fabrication & Machining',
        subCategory: sub.serviceSubCategory || 'Precision Labour',
        rate: sub.baseRate,
        unit: sub.unit.replace('_', ' '),
        stockOrSla: sub.skillLevel || 'Certified Specialist',
        supplierName: sub.subcontractorName,
        supplierCountry: 'United States',
        status: 'Enabled',
        email: 'labour@titanfab.com',
        phone: '+1 216 430 1845',
        createdTime: sub.lastUpdated || '',
        assignedTo: 'Site Construction Manager',
        rawType: 'subcontractor',
        rawItem: sub,
        priceHistory: sub.priceHistory || sub.rateHistory || []
      });
    });

    return list;
  }, [materials, services, subcontractors, suppliers, produceItems]);

  // Extract facet statistics for the multiple filter settings panel
  const facetStats = useMemo(() => {
    const cats = new Map<string, number>();
    const sups = new Map<string, number>();
    const classifications: Record<string, number> = { product: 0, material: 0, service: 0, labour: 0 };
    const statuses = new Map<string, number>();

    allItems.forEach((item) => {
      if (item.category) {
        cats.set(item.category, (cats.get(item.category) || 0) + 1);
      }
      if (item.supplierName) {
        sups.set(item.supplierName, (sups.get(item.supplierName) || 0) + 1);
      }
      if (classifications[item.classification] !== undefined) {
        classifications[item.classification]++;
      }
      if (item.status) {
        statuses.set(item.status, (statuses.get(item.status) || 0) + 1);
      }
    });

    return {
      categories: Array.from(cats.entries()).map(([name, count]) => ({ name, count })),
      suppliers: Array.from(sups.entries()).map(([name, count]) => ({ name, count })),
      classifications,
      statuses: Array.from(statuses.entries()).map(([name, count]) => ({ name, count }))
    };
  }, [allItems]);

  // Count active filter criteria
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (globalSmartSearch) count++;
    if (activeSmartPreset !== 'all') count++;
    if (selectedClassifications.length > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (rateMin || rateMax) count++;
    if (stockFilter !== 'all') count++;
    if (selectedSuppliers.length > 0) count++;
    if (selectedStatuses.length > 0) count++;
    if (hasPriceHistoryOnly) count++;
    if (dateRangePreset !== 'all') count++;
    if (columnSearch.code) count++;
    if (columnSearch.name) count++;
    if (columnSearch.classification !== 'all') count++;
    if (columnSearch.category) count++;
    if (columnSearch.maxRate) count++;
    if (columnSearch.supplier !== 'all') count++;
    if (columnSearch.status !== 'all') count++;
    return count;
  }, [
    globalSmartSearch,
    activeSmartPreset,
    selectedClassifications,
    selectedCategories,
    rateMin,
    rateMax,
    stockFilter,
    selectedSuppliers,
    selectedStatuses,
    hasPriceHistoryOnly,
    dateRangePreset,
    columnSearch
  ]);

  // Multi-Filter Pipeline & Smart Search Evaluator
  const filteredItemsWithScores = useMemo(() => {
    const parsedQuery = parseSmartSearch(globalSmartSearch);

    return allItems.map((item) => {
      // 1. Top Tab Filtering
      if (activeTab === 'PRODUCTS' && item.classification !== 'product') return null;
      if (activeTab === 'MATERIALS' && item.classification !== 'material') return null;
      if (activeTab === 'SERVICES' && item.classification !== 'service') return null;
      if (activeTab === 'SUBCONTRACTORS' && item.classification !== 'labour') return null;
      if (activeTab === 'TODAY') {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (!item.createdTime || !item.createdTime.startsWith(todayStr)) return null;
      }
      if (activeTab === 'LAST 7 DAYS') {
        if (!item.createdTime) return null;
        const itemDate = new Date(item.createdTime.split(' ')[0]);
        if (isNaN(itemDate.getTime())) return null;
        const now = new Date();
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < 0) return null;
      }
      if (activeTab === 'FUNDED ACCOUNTS' || activeTab === 'IN STOCK') {
        if (item.status !== 'In Stock' && item.status !== 'Enabled') return null;
      }

      // 2. Active Quick Smart Preset
      if (activeSmartPreset === 'low_stock') {
        const stock = item.inStockNumber ?? 999;
        if (stock > 20) return null;
      } else if (activeSmartPreset === 'high_value') {
        if (item.rate < 1000) return null;
      } else if (activeSmartPreset === 'raw_materials') {
        if (item.classification !== 'material') return null;
      } else if (activeSmartPreset === 'finished_products') {
        if (item.classification !== 'product') return null;
      } else if (activeSmartPreset === 'outsourced_services') {
        if (item.classification !== 'service' && item.classification !== 'labour') return null;
      }

      // 3. Granular Filter Settings Evaluation
      // Check if any granular setting is active
      const hasGranularSettings =
        selectedClassifications.length > 0 ||
        selectedCategories.length > 0 ||
        rateMin !== '' ||
        rateMax !== '' ||
        stockFilter !== 'all' ||
        selectedSuppliers.length > 0 ||
        selectedStatuses.length > 0 ||
        hasPriceHistoryOnly ||
        dateRangePreset !== 'all';

      if (hasGranularSettings) {
        const condClass = selectedClassifications.length === 0 || selectedClassifications.includes(item.classification);
        const condCat = selectedCategories.length === 0 || selectedCategories.includes(item.category);
        const condRateMin = !rateMin || item.rate >= Number(rateMin);
        const condRateMax = !rateMax || item.rate <= Number(rateMax);
        const condRate = condRateMin && condRateMax;

        let condStock = true;
        const numStock = item.inStockNumber !== undefined ? item.inStockNumber : (item.status === 'In Stock' ? 50 : 0);
        if (stockFilter === 'in_stock') condStock = numStock > 0;
        else if (stockFilter === 'low_stock') condStock = numStock > 0 && numStock <= 20;
        else if (stockFilter === 'out_of_stock') condStock = numStock === 0;
        else if (stockFilter === 'high_stock') condStock = numStock > 100;

        const condSup = selectedSuppliers.length === 0 || selectedSuppliers.includes(item.supplierName);
        const condStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
        const condHistory = !hasPriceHistoryOnly || (item.priceHistory && item.priceHistory.length > 0);

        let condDate = true;
        const todayStr = new Date().toISOString().slice(0, 10);
        if (dateRangePreset === 'today') {
          condDate = Boolean(item.createdTime && item.createdTime.startsWith(todayStr));
        } else if (dateRangePreset === '7days') {
          if (!item.createdTime) {
            condDate = false;
          } else {
            const itemDate = new Date(item.createdTime.split(' ')[0]);
            const now = new Date();
            const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
            condDate = !isNaN(itemDate.getTime()) && diffDays <= 7 && diffDays >= 0;
          }
        } else if (dateRangePreset === '30days') {
          if (!item.createdTime) {
            condDate = false;
          } else {
            const itemDate = new Date(item.createdTime.split(' ')[0]);
            const now = new Date();
            const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
            condDate = !isNaN(itemDate.getTime()) && diffDays <= 30 && diffDays >= 0;
          }
        }

        if (filterLogicMode === 'AND') {
          if (!condClass || !condCat || !condRate || !condStock || !condSup || !condStatus || !condHistory || !condDate) {
            return null;
          }
        } else {
          // OR mode: at least one active condition must match
          const activeConds: boolean[] = [];
          if (selectedClassifications.length > 0) activeConds.push(condClass);
          if (selectedCategories.length > 0) activeConds.push(condCat);
          if (rateMin !== '' || rateMax !== '') activeConds.push(condRate);
          if (stockFilter !== 'all') activeConds.push(condStock);
          if (selectedSuppliers.length > 0) activeConds.push(condSup);
          if (selectedStatuses.length > 0) activeConds.push(condStatus);
          if (hasPriceHistoryOnly) activeConds.push(condHistory);
          if (dateRangePreset !== 'all') activeConds.push(condDate);

          if (activeConds.length > 0 && !activeConds.some(Boolean)) {
            return null;
          }
        }
      }

      // 4. Column-Level Inline Search
      if (columnSearch.code && !item.code.toLowerCase().includes(columnSearch.code.toLowerCase())) {
        return null;
      }
      if (columnSearch.name && !item.name.toLowerCase().includes(columnSearch.name.toLowerCase())) {
        return null;
      }
      if (columnSearch.classification !== 'all' && item.classification !== columnSearch.classification) {
        return null;
      }
      if (columnSearch.category && !item.category.toLowerCase().includes(columnSearch.category.toLowerCase())) {
        return null;
      }
      if (columnSearch.maxRate && item.rate > Number(columnSearch.maxRate)) {
        return null;
      }
      if (columnSearch.supplier !== 'all' && !item.supplierName.toLowerCase().includes(columnSearch.supplier.toLowerCase())) {
        return null;
      }

      // Status operator logic
      if (columnSearch.status !== 'all') {
        const itemStatus = item.status.toLowerCase();
        const targetStatus = columnSearch.status.toLowerCase();

        switch (statusOperator) {
          case 'Equals':
            if (itemStatus !== targetStatus) return null;
            break;
          case 'Not equal to':
            if (itemStatus === targetStatus) return null;
            break;
          case 'Starts with':
            if (!itemStatus.startsWith(targetStatus)) return null;
            break;
          case 'Ends with':
            if (!itemStatus.endsWith(targetStatus)) return null;
            break;
          case 'Does not contain':
            if (itemStatus.includes(targetStatus)) return null;
            break;
          case 'Contains':
          default:
            if (!itemStatus.includes(targetStatus)) return null;
            break;
        }
      }

      if (columnSearch.date && !item.createdTime.includes(columnSearch.date)) {
        return null;
      }
      if (columnSearch.assignedTo && !item.assignedTo.toLowerCase().includes(columnSearch.assignedTo.toLowerCase())) {
        return null;
      }

      // 5. Smart Search Engine Evaluation
      if (parsedQuery.raw) {
        const searchableFields: SearchableField[] = [
          { name: 'code', value: item.code, weight: 3 },
          { name: 'id', value: item.code, weight: 3 },
          { name: 'name', value: item.name, weight: 2.5 },
          { name: 'classification', value: item.classification, weight: 2 },
          { name: 'type', value: item.classification, weight: 2 },
          { name: 'category', value: item.category, weight: 2 },
          { name: 'subCategory', value: item.subCategory, weight: 1.5 },
          { name: 'supplier', value: item.supplierName, weight: 1.5 },
          { name: 'supplierName', value: item.supplierName, weight: 1.5 },
          { name: 'country', value: item.supplierCountry, weight: 1 },
          { name: 'status', value: item.status, weight: 1 },
          { name: 'rate', value: item.rate, isNumeric: true },
          { name: 'price', value: item.rate, isNumeric: true },
          { name: 'stock', value: item.inStockNumber ?? (item.stockOrSla || 0), isNumeric: true },
          { name: 'stockOrSla', value: item.stockOrSla, weight: 1 },
          { name: 'assignedTo', value: item.assignedTo, weight: 0.8 }
        ];

        const match = evaluateSmartSearch(parsedQuery, searchableFields);
        if (!match.matches) return null;
        return { item, score: match.score };
      }

      return { item, score: 1 };
    }).filter(Boolean) as Array<{ item: CatalogGridItem; score: number }>;
  }, [
    allItems,
    activeTab,
    activeSmartPreset,
    globalSmartSearch,
    filterLogicMode,
    selectedClassifications,
    selectedCategories,
    rateMin,
    rateMax,
    stockFilter,
    selectedSuppliers,
    selectedStatuses,
    hasPriceHistoryOnly,
    dateRangePreset,
    columnSearch,
    statusOperator
  ]);

  const filteredItems = useMemo(() => {
    return filteredItemsWithScores.map(f => f.item);
  }, [filteredItemsWithScores]);

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItemsWithScores].sort((a, b) => {
      // If smart search is active and sort is still on default 'code', sort by relevance score
      if (globalSmartSearch.trim() && sortField === 'code' && b.score !== a.score) {
        return b.score - a.score;
      }

      let valA = a.item[sortField];
      let valB = b.item[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      if (strA < strB) return sortAsc ? -1 : 1;
      if (strA > strB) return sortAsc ? 1 : -1;
      return 0;
    }).map(s => s.item);
  }, [filteredItemsWithScores, sortField, sortAsc, globalSmartSearch]);

  // Paginate items
  const totalRecords = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedItems.slice(start, start + recordsPerPage);
  }, [sortedItems, currentPage, recordsPerPage]);

  // Toggle sorting
  const handleSort = (field: keyof CatalogGridItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Multi-select handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCurrentIds = new Set(paginatedItems.map((item) => item.id));
      setSelectedIds(allCurrentIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Reset all filters & search settings
  const handleResetFilters = () => {
    setGlobalSmartSearch('');
    setActiveSmartPreset('all');
    setSelectedClassifications([]);
    setSelectedCategories([]);
    setRateMin('');
    setRateMax('');
    setStockFilter('all');
    setSelectedSuppliers([]);
    setSelectedStatuses([]);
    setHasPriceHistoryOnly(false);
    setDateRangePreset('all');
    setFilterLogicMode('AND');
    setColumnSearch({
      code: '',
      name: '',
      classification: 'all',
      category: '',
      maxRate: '',
      supplier: 'all',
      status: 'all',
      date: '',
      assignedTo: ''
    });
    setStatusOperator('Contains');
    setCurrentPage(1);
    showToast('All filters & settings reset to default');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const itemsToExport = selectedIds.size > 0
      ? allItems.filter((i) => selectedIds.has(i.id))
      : sortedItems;

    const headers = ['ID', 'Name', 'Classification', 'Category', 'Rate', 'Unit', 'Stock/SLA', 'Supplier', 'Status', 'Created Time'];
    const rows = itemsToExport.map((i) => [
      `"${i.code}"`,
      `"${i.name.replace(/"/g, '""')}"`,
      `"${i.classification}"`,
      `"${i.category}"`,
      i.rate,
      `"${i.unit}"`,
      `"${i.stockOrSla}"`,
      `"${i.supplierName}"`,
      `"${i.status}"`,
      `"${i.createdTime}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalog_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${itemsToExport.length} records to CSV`);
  };

  // Quick Edit Submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    if (onEditRecord) {
      const updatedItem = {
        ...(editItem.rawItem || {}),
        id: editItem.id,
        name: editName.trim() || editItem.name,
        category: editCategory.trim() || editItem.category,
        subCategory: editSubCategory.trim() || editItem.subCategory,
        unit: editUnit.trim() || editItem.unit,
        retailPrice: editRate,
        baseRate: editRate,
        rate: editRate,
        costPrice: editItem.rawItem?.costPrice ?? editRate * 0.7,
        inStock: editStock,
        status: editStatus,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      onEditRecord(editItem.rawType, updatedItem);
    } else {
      if (editItem.rawType === 'material' && onUpdateMaterialPrice) {
        onUpdateMaterialPrice(editItem.id, editRate, editReason || 'Rate update from Master Data Grid');
      } else if (editItem.rawType === 'service' && onUpdateServiceRate) {
        onUpdateServiceRate(editItem.id, editRate, editReason || 'Service rate adjustment', 'Master Grid Operator');
      }
    }

    showToast(`Saved updates for ${editItem.code}: ${editName || editItem.name}`);
    setEditItem(null);
  };

  // Add Item to Project Submit
  const handleAddProjectItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addToProjectItem || !onAddItemToProject) return;

    onAddItemToProject(targetProjectId, {
      name: addToProjectItem.name,
      category: addToProjectItem.classification === 'product' ? 'Equipment' : addToProjectItem.classification === 'service' ? 'Subcontractor' : 'Materials',
      subCategory: addToProjectItem.subCategory,
      quantity: addQuantity,
      unit: addToProjectItem.unit,
      unitCost: addToProjectItem.rate * 0.85,
      unitPrice: addToProjectItem.rate,
      supplierId: 'sup-01',
      supplierName: addToProjectItem.supplierName,
      status: 'Active'
    });

    showToast(`Added ${addQuantity}x ${addToProjectItem.code} to project`);
    setAddToProjectItem(null);
  };

  // Add New Item Submit
  const handleCreateNewItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName) return;

    const generatedCode = newItemCode || (newItemType === 'product' ? `PRD-NEW-${Math.floor(Math.random() * 9000 + 1000)}` : newItemType === 'service' ? `SVC-NEW-${Math.floor(Math.random() * 9000 + 1000)}` : `MAT-NEW-${Math.floor(Math.random() * 9000 + 1000)}`);

    if (onAddNewItem) {
      onAddNewItem({
        id: `item-cust-${Date.now()}`,
        code: generatedCode,
        name: newItemName,
        category: newItemCategory || 'General Engineering',
        subCategory: 'Standard Spec',
        itemClassification: newItemType === 'product' ? 'final_product' : 'raw_material',
        supplierName: newItemSupplier,
        unit: newItemUnit,
        retailPrice: Number(newItemRate),
        defaultDiscountPct: 5,
        inStock: 100,
        reorderPoint: 20,
        leadTimeDays: 7,
        lastUpdated: new Date().toISOString().slice(0, 10)
      });
    }

    showToast(`Created new ${newItemType}: ${generatedCode}`);
    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemCode('');
  };

  return (
    <div className="space-y-2 select-none">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#003049] text-white px-3 py-2 rounded shadow-lg text-xs flex items-center space-x-2 border border-blue-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP HEADER & ACTION CONTROLS (Direct replication of uploaded image) */}
      <div className="bg-white border border-slate-200 rounded p-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Left Segmented Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'ALL', label: 'ALL' },
            { id: 'PRODUCTS', label: 'PRODUCTS' },
            { id: 'MATERIALS', label: 'MATERIALS' },
            { id: 'SERVICES', label: 'SERVICES' },
            { id: 'SUBCONTRACTORS', label: 'LABOUR / SUBS' },
            { id: 'TODAY', label: 'TODAY' },
            { id: 'LAST 7 DAYS', label: 'LAST 7 DAYS' },
            { id: 'IN STOCK', label: 'IN STOCK' },
            { id: 'CUSTOM TAB', label: 'CUSTOM TAB' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-normal uppercase transition-all rounded ${
                  isActive
                    ? 'bg-[#003049] text-white shadow-2xs font-medium'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Action Icons Bar (Matching icons in image) */}
        <div className="flex items-center space-x-1.5">
          {/* View Mode Toggle: Table List vs Cards Grid */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => setDisplayMode('list')}
              className={`p-1 rounded transition-colors ${
                displayMode === 'list'
                  ? 'bg-white text-[#003049] shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('grid')}
              className={`p-1 rounded transition-colors ${
                displayMode === 'grid'
                  ? 'bg-white text-[#003049] shadow-2xs font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              handleResetFilters();
              showToast('Data grid refreshed');
            }}
            title="Refresh Data"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Filter by Dropdown */}
          <div className="relative flex items-center text-xs">
            <select
              value={filterByField}
              onChange={(e) => {
                setFilterByField(e.target.value);
                if (e.target.value === 'products') setActiveTab('PRODUCTS');
                else if (e.target.value === 'materials') setActiveTab('MATERIALS');
                else if (e.target.value === 'services') setActiveTab('SERVICES');
                else if (e.target.value === 'in_stock') setActiveTab('IN STOCK');
                else if (e.target.value === 'all') setActiveTab('ALL');
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 py-1 pl-2 pr-6 rounded text-xs focus:outline-none focus:border-[#003049] appearance-none"
            >
              <option value="all">Filter by: All Master</option>
              <option value="products">Filter by: Finished Products</option>
              <option value="materials">Filter by: Raw Materials</option>
              <option value="services">Filter by: Utility & Logistics</option>
              <option value="in_stock">Filter by: Available in Stock</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* Edit Mode Toggle (Light cyan/blue button in image) */}
          <button
            onClick={() => {
              const target = selectedIds.size > 0 
                ? allItems.find((i) => i.id === Array.from(selectedIds)[0])
                : paginatedItems[0];
              if (target) {
                setEditItem(target);
                setEditName(target.name);
                setEditCategory(target.category);
                setEditSubCategory(target.subCategory);
                setEditUnit(target.unit);
                setEditRate(target.rate);
                setEditStatus(target.status);
                setEditStock(target.inStockNumber || 0);
                setEditReason('');
              }
            }}
            title="Edit Item"
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#3a86ff] hover:bg-[#2563eb] text-white rounded text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Delete Button (Red button for selected items or prompt) */}
          <button
            onClick={() => {
              if (selectedIds.size > 0) {
                setIsBulkDeleteOpen(true);
              } else if (paginatedItems[0]) {
                setDeleteConfirmItem(paginatedItems[0]);
              } else {
                showToast('No record selected to delete.');
              }
            }}
            title={selectedIds.size > 0 ? `Delete ${selectedIds.size} selected records` : 'Delete record'}
            className="flex items-center space-x-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
          </button>

          {/* Plus Add Button (Cyan button with + in image) */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            title="Create New Item / Product / Service"
            className="flex items-center justify-center p-1.5 bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Export Button (Download icon) */}
          <button
            onClick={handleExportCSV}
            title="Export Records to CSV"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Import Button (Upload icon) */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            title="Import Records (CSV / Sheet)"
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Quick Email / Action icon */}
          <button
            onClick={() => {
              if (selectedIds.size === 0) {
                showToast('Select items first to email quote or RFQ');
              } else {
                showToast(`Generated RFQ for ${selectedIds.size} selected item(s)`);
              }
            }}
            title="RFQ / Supplier Dispatch"
            className="p-1.5 bg-[#0077b6] hover:bg-[#023e8a] text-white rounded transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Bulk Actions Bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="bg-[#eef4f8] border border-[#bcd3e6] px-3 py-1.5 rounded flex items-center justify-between text-xs text-[#003049]">
          <div className="flex items-center space-x-2">
            <span className="font-normal px-2 py-0.5 bg-white rounded border border-[#bcd3e6]">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <span className="text-slate-500">Bulk Actions:</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleExportCSV}
              className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 flex items-center space-x-1"
            >
              <Download className="w-3 h-3" />
              <span>Export Selected</span>
            </button>

            {onAddItemToProject && (
              <button
                onClick={() => {
                  const firstId = Array.from(selectedIds)[0];
                  const itm = allItems.find((i) => i.id === firstId);
                  if (itm) {
                    setAddToProjectItem(itm);
                    setAddQuantity(1);
                  }
                }}
                className="px-2 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded flex items-center space-x-1"
              >
                <FolderPlus className="w-3 h-3" />
                <span>Add to Project</span>
              </button>
            )}

            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* SMART SEARCH & MULTIPLE FILTER SETTINGS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded p-2.5 space-y-2 shadow-2xs">
        {/* Row 1: Smart Search Input + Filter Settings Button + Density + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Smart Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={globalSmartSearch}
              onChange={(e) => {
                setGlobalSmartSearch(e.target.value);
                setCurrentPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredItems.length > 0) {
                    showToast(
                      `Found ${filteredItems.length} records matching "${globalSmartSearch}"! Top: [${filteredItems[0].code}] ${filteredItems[0].name}`
                    );
                  } else {
                    showToast(`No records found matching "${globalSmartSearch}".`);
                  }
                }
              }}
              placeholder='Smart search: e.g. "titanium" code:ALU rate:>100 status:active supplier:Apex -scrap'
              className="w-full pl-9 pr-16 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049] transition-colors"
            />
            <div className="absolute right-2 top-1.5 flex items-center space-x-1">
              {globalSmartSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSmartSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSearchHelp(!showSearchHelp)}
                className={`p-1 rounded transition-colors ${
                  showSearchHelp ? 'text-[#003049] bg-blue-50' : 'text-slate-400 hover:text-[#003049]'
                }`}
                title="Search syntax guide & tips"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Filter Settings Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFilterSettingsOpen(!isFilterSettingsOpen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                isFilterSettingsOpen
                  ? 'bg-[#003049] text-white border-[#003049]'
                  : activeFiltersCount > 0
                  ? 'bg-blue-50 text-[#003049] border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter Settings</span>
              {activeFiltersCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-semibold ${
                  isFilterSettingsOpen ? 'bg-white/25 text-white' : 'bg-[#003049] text-white'
                }`}>
                  {activeFiltersCount}
                </span>
              )}
              {isFilterSettingsOpen ? (
                <ChevronUp className="w-3 h-3 ml-0.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-0.5" />
              )}
            </button>

            {/* Density Selector */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setGridDensity('compact')}
                className={`px-2 py-1 rounded transition-colors ${
                  gridDensity === 'compact' ? 'bg-white text-[#003049] font-medium shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compact Grid View (dense rows)"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setGridDensity('comfortable')}
                className={`px-2 py-1 rounded transition-colors ${
                  gridDensity === 'comfortable' ? 'bg-white text-[#003049] font-medium shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Comfortable Grid View (spacious rows)"
              >
                Comfort
              </button>
            </div>

            {/* Reset All Filters */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                title="Reset all search queries and filter settings"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Quick Filter Presets Row */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 text-xs text-slate-600">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap mr-1">Filter Presets:</span>
          {[
            { id: 'all', label: 'All Records' },
            { id: 'low_stock', label: 'Low Stock Alert (≤ 20)' },
            { id: 'high_value', label: 'High Value (≥ $1,000)' },
            { id: 'raw_materials', label: 'Raw Materials' },
            { id: 'finished_products', label: 'Finished Goods' },
            { id: 'outsourced_services', label: 'Services & Subs' }
          ].map((preset) => {
            const isActive = activeSmartPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setActiveSmartPreset(preset.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-[#003049] text-white border-[#003049] font-medium shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* SEARCH SYNTAX HELP POPOVER */}
        {showSearchHelp && (
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between font-medium text-slate-900 border-b border-slate-200 pb-1">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#003049]" />
                <span>Smart Search Engine Syntax & Field Qualifiers</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSearchHelp(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="font-semibold text-[#003049] mb-1">Keywords & Exact Phrases</div>
                <p className="text-slate-500">Multiple terms match anywhere: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">titanium alloy</code></p>
                <p className="text-slate-500 mt-1">Exact phrase matching: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">"Grade 5"</code></p>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="font-semibold text-[#003049] mb-1">Field Qualifiers</div>
                <p className="text-slate-500">Filter by Item ID: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">code:PRD-</code></p>
                <p className="text-slate-500 mt-1">Filter by Supplier: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">supplier:Apex</code></p>
                <p className="text-slate-500 mt-1">Filter by Category: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">category:Metallurgy</code></p>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="font-semibold text-[#003049] mb-1">Numeric Ranges</div>
                <p className="text-slate-500">Price over $100: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">rate:&gt;100</code></p>
                <p className="text-slate-500 mt-1">Price under $500: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">price:&lt;500</code></p>
                <p className="text-slate-500 mt-1">Low Stock: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">stock:&lt;20</code></p>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <div className="font-semibold text-[#003049] mb-1">Exclusions & Negation</div>
                <p className="text-slate-500">Exclude word: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">-scrap</code></p>
                <p className="text-slate-500 mt-1">Exclude field: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">!status:readonly</code></p>
              </div>
            </div>
          </div>
        )}

        {/* EXPANDABLE FILTER SETTINGS PANEL */}
        {isFilterSettingsOpen && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 space-y-3.5 text-xs">
            {/* Header with Mode Selection */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#003049]" />
                <span className="font-semibold text-slate-900 text-xs">Data Grid Filter Settings & Preferences</span>
              </div>

              {/* Match Mode Selector: AND vs OR */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 text-[11px]">Condition Logic:</span>
                <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterLogicMode('AND')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterLogicMode === 'AND'
                        ? 'bg-[#003049] text-white font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Match ALL (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLogicMode('OR')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      filterLogicMode === 'OR'
                        ? 'bg-[#003049] text-white font-medium'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Match ANY (OR)
                  </button>
                </div>
              </div>
            </div>

            {/* Granular Filter Settings Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* SETTING 1: Classification / Type */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>1. Item Classification</span>
                  {selectedClassifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedClassifications([])}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1 text-[11px]">
                  {[
                    { id: 'product', label: 'Finished Products', count: facetStats.classifications.product },
                    { id: 'material', label: 'Raw Materials', count: facetStats.classifications.material },
                    { id: 'service', label: 'Utility & Services', count: facetStats.classifications.service },
                    { id: 'labour', label: 'Labour & Subs', count: facetStats.classifications.labour }
                  ].map((t) => {
                    const checked = selectedClassifications.includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center justify-between hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <span className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedClassifications((prev) =>
                                checked ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-slate-700">{t.label}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({t.count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SETTING 2: Price / Rate Brackets */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>2. Rate & Price Brackets</span>
                  {(rateMin || rateMax) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRateMin('');
                        setRateMax('');
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-slate-400 text-[10px]">$</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={rateMin}
                      onChange={(e) => {
                        setRateMin(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:bg-white focus:border-[#003049]"
                    />
                  </div>
                  <span className="text-slate-400 text-xs">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-slate-400 text-[10px]">$</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={rateMax}
                      onChange={(e) => {
                        setRateMax(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-5 pr-1 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-none focus:bg-white focus:border-[#003049]"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {[
                    { label: '< $50', min: '', max: '50' },
                    { label: '$50-$200', min: '50', max: '200' },
                    { label: '$200-$1k', min: '200', max: '1000' },
                    { label: '> $1k', min: '1000', max: '' }
                  ].map((bracket, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setRateMin(bracket.min);
                        setRateMax(bracket.max);
                        setCurrentPage(1);
                      }}
                      className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] transition-colors"
                    >
                      {bracket.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SETTING 3: Stock & Inventory Levels */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>3. Stock & Availability</span>
                  {stockFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setStockFilter('all')}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="space-y-1 text-[11px]">
                  {[
                    { id: 'all', label: 'All Inventory Levels' },
                    { id: 'in_stock', label: 'In Stock Only (> 0)' },
                    { id: 'low_stock', label: 'Low Stock Alert (≤ 20)' },
                    { id: 'out_of_stock', label: 'Out of Stock (= 0)' },
                    { id: 'high_stock', label: 'Surplus Stock (> 100)' }
                  ].map((s) => (
                    <label key={s.id} className="flex items-center space-x-1.5 hover:bg-slate-50 p-1 rounded cursor-pointer">
                      <input
                        type="radio"
                        name="stockFilterSetting"
                        checked={stockFilter === s.id}
                        onChange={() => {
                          setStockFilter(s.id as any);
                          setCurrentPage(1);
                        }}
                        className="text-[#003049] cursor-pointer"
                      />
                      <span className="text-slate-700">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SETTING 4: Category Filtering */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>4. Categories ({facetStats.categories.length})</span>
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {facetStats.categories.map((c) => {
                    const checked = selectedCategories.includes(c.name);
                    return (
                      <label key={c.name} className="flex items-center justify-between hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <span className="flex items-center space-x-1.5 truncate max-w-[140px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedCategories((prev) =>
                                checked ? prev.filter((x) => x !== c.name) : [...prev, c.name]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-slate-700 truncate" title={c.name}>{c.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({c.count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Second Row of Granular Filter Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {/* SETTING 5: Suppliers & Providers */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>5. Suppliers & Providers</span>
                  {selectedSuppliers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSuppliers([])}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {facetStats.suppliers.map((s) => {
                    const checked = selectedSuppliers.includes(s.name);
                    return (
                      <label key={s.name} className="flex items-center justify-between hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <span className="flex items-center space-x-1.5 truncate max-w-[170px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSuppliers((prev) =>
                                checked ? prev.filter((x) => x !== s.name) : [...prev, s.name]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-slate-700 truncate" title={s.name}>{s.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({s.count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SETTING 6: Statuses & Verification */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>6. Lifecycle Status</span>
                  {selectedStatuses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatuses([])}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {facetStats.statuses.map((st) => {
                    const checked = selectedStatuses.includes(st.name);
                    return (
                      <label key={st.name} className="flex items-center justify-between hover:bg-slate-50 p-1 rounded cursor-pointer">
                        <span className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedStatuses((prev) =>
                                checked ? prev.filter((x) => x !== st.name) : [...prev, st.name]
                              );
                              setCurrentPage(1);
                            }}
                            className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-slate-700">{st.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">({st.count})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SETTING 7: Column Visibility Settings */}
              <div className="bg-white p-2.5 rounded border border-slate-200 space-y-2">
                <div className="font-medium text-slate-800 text-[11px] flex items-center justify-between">
                  <span>7. Grid Columns Visibility</span>
                  <button
                    type="button"
                    onClick={() => {
                      const allVisible: Record<string, boolean> = {};
                      Object.keys(visibleColumns).forEach((k) => (allVisible[k] = true));
                      setVisibleColumns(allVisible);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Show All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  {[
                    { id: 'code', label: 'Item ID' },
                    { id: 'info', label: 'Photo/Info' },
                    { id: 'name', label: 'Item Name' },
                    { id: 'classification', label: 'Type' },
                    { id: 'category', label: 'Category' },
                    { id: 'rate', label: 'Rate/Price' },
                    { id: 'stockOrSla', label: 'Stock/SLA' },
                    { id: 'supplierName', label: 'Supplier' },
                    { id: 'status', label: 'Status' },
                    { id: 'createdTime', label: 'Date' }
                  ].map((col) => (
                    <label key={col.id} className="flex items-center space-x-1 hover:bg-slate-50 p-0.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.id] !== false}
                        onChange={(e) =>
                          setVisibleColumns({ ...visibleColumns, [col.id]: e.target.checked })
                        }
                        className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                      />
                      <span className="text-slate-700 text-[10px]">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer with summary and action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
              <span className="text-slate-500 text-[11px]">
                Active configuration matches <strong className="text-slate-800 font-semibold">{filteredItems.length}</strong> of <span className="font-semibold">{allItems.length}</span> total catalog items
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 transition-colors"
                >
                  Reset Settings
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterSettingsOpen(false)}
                  className="px-3 py-1 bg-[#003049] hover:bg-[#002235] text-white rounded font-medium transition-colors"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE FILTER CHIPS ROW */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 text-[10px] font-medium uppercase mr-0.5">Active Filters:</span>

            {globalSmartSearch && (
              <span className="inline-flex items-center space-x-1 bg-[#003049]/10 text-[#003049] px-2 py-0.5 rounded border border-[#003049]/20">
                <span>Query: "{globalSmartSearch}"</span>
                <button type="button" onClick={() => setGlobalSmartSearch('')} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeSmartPreset !== 'all' && (
              <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                <span>Preset: {activeSmartPreset.replace('_', ' ')}</span>
                <button type="button" onClick={() => setActiveSmartPreset('all')} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedClassifications.map((cl) => (
              <span key={cl} className="inline-flex items-center space-x-1 bg-blue-50 text-blue-900 px-2 py-0.5 rounded border border-blue-200">
                <span>Type: {cl}</span>
                <button
                  type="button"
                  onClick={() => setSelectedClassifications((prev) => prev.filter((x) => x !== cl))}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedCategories.map((cat) => (
              <span key={cat} className="inline-flex items-center space-x-1 bg-purple-50 text-purple-900 px-2 py-0.5 rounded border border-purple-200">
                <span>Cat: {cat}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories((prev) => prev.filter((x) => x !== cat))}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {(rateMin || rateMax) && (
              <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                <span>Rate: {rateMin ? `$${rateMin}` : '$0'} - {rateMax ? `$${rateMax}` : 'Any'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setRateMin('');
                    setRateMax('');
                  }}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {stockFilter !== 'all' && (
              <span className="inline-flex items-center space-x-1 bg-sky-50 text-sky-900 px-2 py-0.5 rounded border border-sky-200">
                <span>Stock: {stockFilter.replace('_', ' ')}</span>
                <button type="button" onClick={() => setStockFilter('all')} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSuppliers.map((sup) => (
              <span key={sup} className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                <span>Supplier: {sup}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSuppliers((prev) => prev.filter((x) => x !== sup))}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {selectedStatuses.map((st) => (
              <span key={st} className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                <span>Status: {st}</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatuses((prev) => prev.filter((x) => x !== st))}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {columnSearch.code && (
              <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                <span>Col ID: {columnSearch.code}</span>
                <button type="button" onClick={() => setColumnSearch({ ...columnSearch, code: '' })} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {columnSearch.name && (
              <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                <span>Col Name: {columnSearch.name}</span>
                <button type="button" onClick={() => setColumnSearch({ ...columnSearch, name: '' })} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-red-600 hover:text-red-800 hover:underline font-medium text-[10px] ml-1"
            >
              Clear All ({activeFiltersCount})
            </button>
          </div>
        )}
      </div>

      {/* MAIN DATA TABLE OR CARDS GRID */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-2xs">
        {displayMode === 'grid' ? (
          <div className="p-4 bg-slate-50/50 min-h-[460px]">
            {paginatedItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="text-sm font-medium text-slate-600 mb-1">No items found matching active filters</div>
                <p className="text-xs text-slate-400">Try adjusting your search criteria or resetting filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
                {paginatedItems.map((item) => {
                  const cardData: ItemGridCardData = {
                    id: item.id,
                    code: item.code,
                    name: item.name,
                    category: item.category,
                    subCategory: item.subCategory,
                    classification: item.classification,
                    rate: item.rate,
                    unit: item.unit,
                    supplierName: item.supplierName,
                    imageUrl: item.imageUrl,
                    priceHistory: item.priceHistory,
                    rawItem: item.rawItem || item
                  };
                  return (
                    <ItemGridCard
                      key={item.id}
                      item={cardData}
                      isSelected={selectedIds.has(item.id)}
                      onSelectToggle={handleToggleRow}
                      onViewDetailsAndAudit={(cardItem, tab) => {
                        setDetailsModalItem({ item: cardItem, tab: tab || 'details' });
                      }}
                      onViewAuditLogFXTT={(cardItem) => {
                        setFullScreenAuditItem(cardItem);
                      }}
                      onOpenImageViewer={() => {
                        setActiveImageViewerItem(item);
                      }}
                      onEdit={() => {
                        setEditItem(item);
                        setEditRate(item.rate);
                        setEditStatus(item.status);
                        setEditStock(item.inStockNumber || 0);
                        setEditReason('');
                      }}
                      onDelete={() => {
                        if (confirm(`Remove item ${item.code} - ${item.name}?`)) {
                          showToast(`Item ${item.code} marked for archival`);
                        }
                      }}
                      onShowNotification={(msg) => showToast(msg)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto min-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            {/* TIER 1: Column Titles with Sort Arrows */}
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-600 select-none">
              <tr>
                {/* Select All Checkbox */}
                <th className="w-8 px-2 py-2 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={paginatedItems.length > 0 && selectedIds.size === paginatedItems.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* Item ID / Code */}
                {visibleColumns.code !== false && (
                  <th
                    onClick={() => handleSort('code')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 whitespace-nowrap min-w-[120px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Item ID</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Info Column */}
                {visibleColumns.info !== false && (
                  <th
                    className="px-2 py-2 font-normal text-center border-r border-slate-200 whitespace-nowrap w-12 text-slate-700 select-none"
                    title="View Item Photo & Image"
                  >
                    <span>Info</span>
                  </th>
                )}

                {/* Item Name */}
                {visibleColumns.name !== false && (
                  <th
                    onClick={() => handleSort('name')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[200px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Item Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Classification / Type */}
                {visibleColumns.classification !== false && (
                  <th
                    onClick={() => handleSort('classification')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[100px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Type</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Category */}
                {visibleColumns.category !== false && (
                  <th
                    onClick={() => handleSort('category')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Rate / Unit Price */}
                {visibleColumns.rate !== false && (
                  <th
                    onClick={() => handleSort('rate')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[110px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Rate / Price</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Stock / SLA */}
                {visibleColumns.stockOrSla !== false && (
                  <th
                    onClick={() => handleSort('stockOrSla')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[110px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Stock / SLA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Supplier / Provider */}
                {visibleColumns.supplierName !== false && (
                  <th
                    onClick={() => handleSort('supplierName')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[150px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Supplier / Provider</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Status (with operator menu in image) */}
                {visibleColumns.status !== false && (
                  <th
                    onClick={() => handleSort('status')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[110px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Created / Updated Time */}
                {visibleColumns.createdTime !== false && (
                  <th
                    onClick={() => handleSort('createdTime')}
                    className="px-2.5 py-2 font-normal cursor-pointer hover:bg-slate-100 border-r border-slate-200 min-w-[130px]"
                  >
                    <div className="flex items-center justify-between">
                      <span>Created Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                )}

                {/* Actions (End of the row buttons) */}
                {visibleColumns.actions !== false && (
                  <th className="px-2.5 py-2 font-normal text-right min-w-[130px]">
                    <span>Actions</span>
                  </th>
                )}
              </tr>

              {/* TIER 2: Inline Column Search & Filter Row (Matching screenshot inputs) */}
              <tr className="bg-white border-t border-slate-200 text-slate-700">
                {/* Clear Row Button */}
                <th className="px-2 py-1 text-center border-r border-slate-200">
                  <button
                    onClick={handleResetFilters}
                    title="Clear inline column filters"
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </th>

                {/* Search by ID */}
                {visibleColumns.code !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1.5" />
                      <input
                        type="text"
                        placeholder="Search by ID..."
                        value={columnSearch.code}
                        onChange={(e) => setColumnSearch({ ...columnSearch, code: e.target.value })}
                        className="w-full pl-5 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                      />
                    </div>
                  </th>
                )}

                {/* Info Column Spacer */}
                {visibleColumns.info !== false && (
                  <th className="p-1 border-r border-slate-200 text-center text-slate-300 text-[10px] select-none font-normal">
                    -
                  </th>
                )}

                {/* Search by Name */}
                {visibleColumns.name !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1.5" />
                      <input
                        type="text"
                        placeholder="Search by name..."
                        value={columnSearch.name}
                        onChange={(e) => setColumnSearch({ ...columnSearch, name: e.target.value })}
                        className="w-full pl-5 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                      />
                    </div>
                  </th>
                )}

                {/* Select Type */}
                {visibleColumns.classification !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <select
                      value={columnSearch.classification}
                      onChange={(e) => setColumnSearch({ ...columnSearch, classification: e.target.value })}
                      className="w-full py-0.5 px-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-[#003049]"
                    >
                      <option value="all">All Types</option>
                      <option value="product">Product</option>
                      <option value="material">Material</option>
                      <option value="service">Service</option>
                      <option value="labour">Labour</option>
                    </select>
                  </th>
                )}

                {/* Search Category */}
                {visibleColumns.category !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="Search category..."
                      value={columnSearch.category}
                      onChange={(e) => setColumnSearch({ ...columnSearch, category: e.target.value })}
                      className="w-full px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                    />
                  </th>
                )}

                {/* Filter Max Rate */}
                {visibleColumns.rate !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <input
                      type="number"
                      placeholder="Max rate..."
                      value={columnSearch.maxRate}
                      onChange={(e) => setColumnSearch({ ...columnSearch, maxRate: e.target.value })}
                      className="w-full px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                    />
                  </th>
                )}

                {/* Stock Search */}
                {visibleColumns.stockOrSla !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <span className="text-[10px] text-slate-400 px-1">Any stock</span>
                  </th>
                )}

                {/* Supplier Filter */}
                {visibleColumns.supplierName !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <select
                      value={columnSearch.supplier}
                      onChange={(e) => setColumnSearch({ ...columnSearch, supplier: e.target.value })}
                      className="w-full py-0.5 px-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 focus:outline-none focus:border-[#003049]"
                    >
                      <option value="all">All Suppliers</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </th>
                )}

                {/* Search by Status with Operator Menu (Matching screenshot popup) */}
                {visibleColumns.status !== false && (
                  <th className="p-1 border-r border-slate-200 relative">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        title="Filter condition operator"
                        className="p-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-600"
                      >
                        <Filter className="w-2.5 h-2.5 text-[#003049]" />
                      </button>
                      <input
                        type="text"
                        placeholder="Search status..."
                        value={columnSearch.status === 'all' ? '' : columnSearch.status}
                        onChange={(e) => setColumnSearch({ ...columnSearch, status: e.target.value || 'all' })}
                        className="w-full px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                      />
                    </div>

                    {/* Status Operator Popup (Visible when clicked, exactly as in image) */}
                    {isStatusMenuOpen && (
                      <div className="absolute left-0 top-8 z-30 bg-white border border-slate-300 rounded shadow-lg p-2 text-xs w-40 text-slate-700">
                        <div className="font-normal text-[10px] text-slate-400 uppercase pb-1 mb-1 border-b border-slate-100">
                          Match Operator
                        </div>
                        {['Equals', 'Not equal to', 'Starts with', 'Ends with', 'Does not contain', 'Contains'].map((op) => (
                          <label
                            key={op}
                            className="flex items-center space-x-2 py-1 px-1 rounded hover:bg-slate-100 cursor-pointer"
                            onClick={() => {
                              setStatusOperator(op);
                              setIsStatusMenuOpen(false);
                            }}
                          >
                            <input
                              type="radio"
                              name="statusOp"
                              checked={statusOperator === op}
                              onChange={() => {}}
                              className="text-[#003049]"
                            />
                            <span className="text-[11px]">{op}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                )}

                {/* Search by Date */}
                {visibleColumns.createdTime !== false && (
                  <th className="p-1 border-r border-slate-200">
                    <input
                      type="text"
                      placeholder="Search by date..."
                      value={columnSearch.date}
                      onChange={(e) => setColumnSearch({ ...columnSearch, date: e.target.value })}
                      className="w-full px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#003049]"
                    />
                  </th>
                )}

                {/* Reset Action */}
                {visibleColumns.actions !== false && (
                  <th className="p-1 text-right">
                    <button
                      onClick={handleResetFilters}
                      className="text-[10px] text-[#003049] hover:underline px-1"
                    >
                      Reset
                    </button>
                  </th>
                )}
              </tr>
            </thead>

            {/* DATA ROWS: "in the raw of this dont put long details just few detailm can identify" */}
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No matching items found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const rowPyClass = gridDensity === 'compact' ? 'py-1' : 'py-2';

                  // Classification badge styling
                  let typeBg = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (item.classification === 'product') typeBg = 'bg-blue-50 text-blue-800 border-blue-200';
                  else if (item.classification === 'material') typeBg = 'bg-amber-50 text-amber-900 border-amber-200';
                  else if (item.classification === 'service') typeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  else if (item.classification === 'labour') typeBg = 'bg-purple-50 text-purple-800 border-purple-200';

                  // Status badge styling
                  let statusBg = 'bg-slate-100 text-slate-700';
                  if (item.status === 'In Stock' || item.status === 'Active' || item.status === 'Enabled') {
                    statusBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                  } else if (item.status === 'Lead Exist' || item.status === 'Under Review') {
                    statusBg = 'bg-amber-50 text-amber-700 border border-amber-200';
                  } else if (item.status === 'Read only') {
                    statusBg = 'bg-slate-100 text-slate-600 border border-slate-200';
                  }

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`hover:bg-[#f8fafd] transition-colors ${
                          isChecked ? 'bg-[#f0f7fa]' : 'bg-white'
                        }`}
                      >
                      {/* Checkbox */}
                      <td className={`px-2 ${rowPyClass} text-center border-r border-slate-100`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          className="rounded border-slate-300 text-[#003049] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Item ID / Code */}
                      {visibleColumns.code !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap`}>
                          <button
                            onClick={() => setViewDetailItem(item)}
                            className="text-[#003049] hover:underline font-medium text-[11px] text-left"
                          >
                            {item.code}
                          </button>
                        </td>
                      )}

                      {/* Info Column: Info Icon to View Image */}
                      {visibleColumns.info !== false && (
                        <td className={`px-1.5 ${rowPyClass} border-r border-slate-100 text-center whitespace-nowrap`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveImageViewerItem(item);
                            }}
                            className="p-1 text-slate-400 hover:text-[#003049] hover:bg-sky-50 rounded-full transition-all inline-flex items-center justify-center cursor-pointer group"
                            title={`View image for ${item.name || item.code}`}
                          >
                            <Info className="w-3.5 h-3.5 text-[#003049] group-hover:scale-115 transition-transform" />
                          </button>
                        </td>
                      )}

                      {/* Item Name (Concise) with Search Icon next to it */}
                      {visibleColumns.name !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100`}>
                          <div className="flex items-center justify-between gap-1 group/name">
                            <div
                              className="text-slate-900 font-normal text-xs truncate max-w-[220px]"
                              title={item.name}
                            >
                              {item.name}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGoogleSearchItem({
                                  id: item.id,
                                  code: item.code,
                                  name: item.name,
                                  category: item.category,
                                  supplierName: item.supplierName,
                                  rate: item.rate,
                                  unit: item.unit
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-[#0078d4] hover:bg-sky-50 rounded transition-colors cursor-pointer shrink-0"
                              title={`Quick Google & Lens Search for "${item.name}"`}
                            >
                              <Search className="w-3.5 h-3.5 text-[#0078d4]" />
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Type Badge */}
                      {visibleColumns.classification !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap`}>
                          <span className={`px-1.5 py-0.5 text-[10px] uppercase rounded border ${typeBg}`}>
                            {item.classification}
                          </span>
                        </td>
                      )}

                      {/* Category */}
                      {visibleColumns.category !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100`}>
                          <div className="text-slate-600 text-[11px] truncate max-w-[160px]" title={item.category}>
                            {item.category}
                          </div>
                        </td>
                      )}

                      {/* Rate / Price */}
                      {visibleColumns.rate !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap`}>
                          <span className="font-normal text-slate-900">
                            ${item.rate.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-1">/{item.unit}</span>
                        </td>
                      )}

                      {/* Stock / SLA */}
                      {visibleColumns.stockOrSla !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap`}>
                          <span className="text-slate-700 text-[11px]">{item.stockOrSla}</span>
                        </td>
                      )}

                      {/* Supplier / Provider */}
                      {visibleColumns.supplierName !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100`}>
                          <div
                            className="text-slate-800 text-[11px] truncate max-w-[160px]"
                            title={item.supplierName}
                          >
                            {item.supplierName}
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap`}>
                          <span className={`px-1.5 py-0.5 text-[10px] rounded ${statusBg}`}>
                            {item.status}
                          </span>
                        </td>
                      )}

                      {/* Created Time */}
                      {visibleColumns.createdTime !== false && (
                        <td className={`px-2.5 ${rowPyClass} border-r border-slate-100 whitespace-nowrap text-slate-500 text-[11px]`}>
                          {item.createdTime || '—'}
                        </td>
                      )}

                      {/* "end of the raw put other buttons" - Row Actions */}
                      {visibleColumns.actions !== false && (
                        <td className={`px-2 ${rowPyClass} text-right whitespace-nowrap`}>
                          <div className="flex items-center justify-end space-x-1">
                            {/* Edit button (Pencil icon as in image) */}
                            <button
                              onClick={() => {
                                setEditItem(item);
                                setEditName(item.name);
                                setEditCategory(item.category);
                                setEditSubCategory(item.subCategory);
                                setEditUnit(item.unit);
                                setEditRate(item.rate);
                                setEditStatus(item.status);
                                setEditStock(item.inStockNumber || 0);
                                setEditReason('');
                              }}
                              title="Edit Record"
                              className="p-1 text-slate-500 hover:text-[#003049] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete button (Trash icon) */}
                            <button
                              onClick={() => setDeleteConfirmItem(item)}
                              title="Delete Record"
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>

                            {/* Quick View Details */}
                            <button
                              onClick={() => setViewDetailItem(item)}
                              title="View Full Specifications"
                              className="p-1 text-slate-500 hover:text-[#003049] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Add to Active Project */}
                            {onAddItemToProject && (
                              <button
                                onClick={() => {
                                  setAddToProjectItem(item);
                                  setAddQuantity(1);
                                }}
                                title="Add to Cost Analysis / Project"
                                className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Price Audit History Toggle */}
                            <button
                              onClick={() => toggleGridHistory(item.id)}
                              title={`Toggle Price History (${item.priceHistory?.length || 0})`}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                expandedGridHistoryIds.has(item.id)
                                  ? 'bg-[#003049] text-white'
                                  : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* INLINE EXPANDABLE ITEM-ISOLATED PRICE REVISION LIST */}
                    {expandedGridHistoryIds.has(item.id) && (
                      <tr key={`${item.id}-isolated-history`} className="bg-[#f8fafc] border-b border-slate-200">
                        <td colSpan={13} className="p-3">
                          <div className="bg-white rounded border border-slate-200 p-3 shadow-xs space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-normal text-[#003049] bg-[#fdf0d5] px-1.5 py-0.5 rounded border border-[#ecd5a8]">
                                  {item.code}
                                </span>
                                <span className="text-xs font-normal text-slate-900">
                                  Historical Rate Revisions: <span className="text-[#003049]">{item.name}</span>
                                </span>
                                <span className="text-[10px] uppercase font-normal bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                                  Isolated {item.classification} History ({item.priceHistory?.length || 0} entries)
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 italic">
                                * Strictly isolated: Displays only price revision history belonging to this specific {item.classification} item.
                              </div>
                            </div>

                            {item.priceHistory && item.priceHistory.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-[#fdf0d5] text-[#003049] uppercase text-[10px] border-b border-[#ecd5a8]">
                                    <tr>
                                      <th className="py-1.5 px-2.5 font-normal">Revision Date</th>
                                      <th className="py-1.5 px-2.5 font-normal">Previous Rate</th>
                                      <th className="py-1.5 px-2.5 font-normal">New Rate</th>
                                      <th className="py-1.5 px-2.5 font-normal">Change %</th>
                                      <th className="py-1.5 px-2.5 font-normal">Price Adjustment Justification</th>
                                      <th className="py-1.5 px-2.5 font-normal">Authorized Agent</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {item.priceHistory.map((hist, hIdx) => (
                                      <tr key={hist.id || hIdx} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-2.5 font-mono text-slate-600 whitespace-nowrap">{hist.date}</td>
                                        <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">${Number(hist.previousPrice).toFixed(2)} / {item.unit}</td>
                                        <td className="py-1.5 px-2.5 font-normal text-[#003049] whitespace-nowrap">${Number(hist.newPrice).toFixed(2)} / {item.unit}</td>
                                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-normal ${
                                            hist.changePct > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                                            hist.changePct < 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                            'bg-slate-100 text-slate-600'
                                          }`}>
                                            {hist.changePct > 0 ? `+${hist.changePct}%` : `${hist.changePct}%`}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-800">{hist.reason}</td>
                                        <td className="py-1.5 px-2.5 text-slate-500 text-[11px] whitespace-nowrap">{hist.updatedBy}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-2 text-xs text-slate-400 italic">
                                No previous price revisions recorded for this specific item.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
            </tbody>
          </table>
        </div>
        )}

        {/* BOTTOM STATUS & PAGINATION BAR (Exact match to uploaded image footer) */}
        <div className="bg-[#f8fafc] border-t border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 select-none">
          {/* Left: System Attribution */}
          <div className="text-[11px] text-slate-500">
            © 2026 Enterprise Quoting CRM & Item Master v2.0 • Data Grid
          </div>

          {/* Right: Records per page & Page Navigation */}
          <div className="flex items-center space-x-4">
            {/* Records per page */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-500">Records per page</span>
              <select
                value={recordsPerPage}
                onChange={(e) => {
                  setRecordsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-[#003049]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page Jump and Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Current Page Pill */}
              <div className="flex items-center space-x-1 text-xs px-1">
                <span className="w-6 h-5 flex items-center justify-center bg-white border border-slate-300 rounded text-slate-900 font-normal">
                  {currentPage}
                </span>
                <span className="text-slate-500">of {totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Quick Edit Rate & Status Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <Edit className="w-4 h-4 text-[#003049] dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Catalog Item: <span className="font-mono text-[#003049] dark:text-sky-400">{editItem.code}</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Item Title / Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sub-Category</label>
                  <input
                    type="text"
                    value={editSubCategory}
                    onChange={(e) => setEditSubCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Rate / Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editRate}
                    onChange={(e) => setEditRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Unit</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    placeholder="e.g. pcs, kg, m"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Active">Active</option>
                    <option value="Lead Exist">Lead Exist</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Read only">Read only</option>
                    <option value="Enabled">Enabled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Adjustment Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Q1 update or cost revision"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#003049]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const itemToDelete = editItem;
                    setEditItem(null);
                    setDeleteConfirmItem(itemToDelete);
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditItem(null)}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#003049] hover:bg-[#002235] text-white rounded-lg font-semibold shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: Delete Confirmation Modal for Single Record */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-full bg-rose-50 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Catalog Record</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{deleteConfirmItem.name}</div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                Code: {deleteConfirmItem.code} • Classification: {deleteConfirmItem.classification}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteRecord) {
                    onDeleteRecord(deleteConfirmItem.rawType, deleteConfirmItem.id);
                  }
                  showToast(`Deleted ${deleteConfirmItem.code} (${deleteConfirmItem.name}) from catalog`);
                  setDeleteConfirmItem(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1C: Bulk Delete Confirmation Modal */}
      {isBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 rounded-full bg-rose-50 dark:bg-rose-950/60">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete {selectedIds.size} Selected Records</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove selected records from catalog.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete these {selectedIds.size} records from the master catalog? This action will remove them permanently from active catalogs.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedIds.forEach((id) => {
                    const itm = allItems.find((i) => i.id === id);
                    if (itm && onDeleteRecord) {
                      onDeleteRecord(itm.rawType, itm.id);
                    }
                  });
                  showToast(`Deleted ${selectedIds.size} records from catalog`);
                  setSelectedIds(new Set());
                  setIsBulkDeleteOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedIds.size} Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Item Technical Details & Specs */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#003049]" />
                <h3 className="text-sm font-normal text-slate-900">
                  Item Details & Specification
                </h3>
              </div>
              <button
                onClick={() => setViewDetailItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-normal text-[#003049] text-sm">{viewDetailItem.code}</span>
                  <span className="px-1.5 py-0.5 uppercase text-[10px] rounded bg-[#003049] text-white">
                    {viewDetailItem.classification}
                  </span>
                </div>
                <div className="text-slate-900 font-normal text-sm">{viewDetailItem.name}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  {viewDetailItem.category} &gt; {viewDetailItem.subCategory}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500">Retail Unit Rate</div>
                  <div className="text-sm font-normal text-slate-900">${viewDetailItem.rate.toFixed(2)} / {viewDetailItem.unit}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500">Stock / SLA Level</div>
                  <div className="text-sm font-normal text-slate-900">{viewDetailItem.stockOrSla}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-500">Lifecycle Status</div>
                  <div className="text-sm font-normal text-slate-900">{viewDetailItem.status}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-2.5 space-y-1">
                <div className="text-[11px] font-normal text-slate-700 uppercase">Supplier & Partner Info</div>
                <div className="flex items-center space-x-2 text-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-[#003049]" />
                  <span>{viewDetailItem.supplierName}</span>
                  <span className="text-slate-400">({viewDetailItem.supplierCountry})</span>
                </div>
                <div className="text-slate-500 text-[11px] pl-5">
                  Email: {viewDetailItem.email} • Tel: {viewDetailItem.phone}
                </div>
              </div>

              {/* ISOLATED PRICE REVISION HISTORY LIST */}
              <div className="border border-slate-200 rounded p-2.5 space-y-1.5 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-800">
                    <History className="w-3.5 h-3.5 text-[#003049]" />
                    <span>Price & Rate Adjustment History</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-normal">
                    Strictly Scoped to {viewDetailItem.code}
                  </span>
                </div>

                {viewDetailItem.priceHistory && viewDetailItem.priceHistory.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto bg-white rounded border border-slate-200">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#fdf0d5] text-[#003049] uppercase text-[9px] sticky top-0 border-b border-[#ecd5a8]">
                        <tr>
                          <th className="py-1 px-2 font-normal">Date</th>
                          <th className="py-1 px-2 font-normal">Previous</th>
                          <th className="py-1 px-2 font-normal">New Rate</th>
                          <th className="py-1 px-2 font-normal">Change</th>
                          <th className="py-1 px-2 font-normal">Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewDetailItem.priceHistory.map((h, hIdx) => (
                          <tr key={h.id || hIdx} className="hover:bg-slate-50">
                            <td className="py-1 px-2 font-mono text-slate-500 whitespace-nowrap">{h.date}</td>
                            <td className="py-1 px-2 text-slate-500 whitespace-nowrap">${Number(h.previousPrice).toFixed(2)}</td>
                            <td className="py-1 px-2 font-medium text-[#003049] whitespace-nowrap">${Number(h.newPrice).toFixed(2)}</td>
                            <td className="py-1 px-2 whitespace-nowrap">
                              <span className={`px-1 py-0.2 rounded text-[10px] font-normal ${
                                h.changePct > 0 ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'
                              }`}>
                                {h.changePct > 0 ? `+${h.changePct}%` : `${h.changePct}%`}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-slate-700 truncate max-w-[120px]" title={h.reason}>{h.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic py-1 text-center bg-white rounded border border-slate-100">
                    No historical rate adjustments on file for this item.
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500">
                Audit Timestamp: {viewDetailItem.createdTime || '—'} • Assigned: {viewDetailItem.assignedTo}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {onAddItemToProject && (
                <button
                  onClick={() => {
                    setAddToProjectItem(viewDetailItem);
                    setViewDetailItem(null);
                  }}
                  className="px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white text-xs rounded"
                >
                  Add to Active Project
                </button>
              )}
              <button
                onClick={() => setViewDetailItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Add to Project Selector */}
      {addToProjectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-[#003049]" />
                <h3 className="text-sm font-normal text-slate-900">
                  Add to Project Cost Analysis
                </h3>
              </div>
              <button
                onClick={() => setAddToProjectItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProjectItemSubmit} className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <div className="font-normal text-slate-900">{addToProjectItem.name}</div>
                <div className="text-slate-500 text-[11px]">
                  {addToProjectItem.code} • ${addToProjectItem.rate.toFixed(2)} / {addToProjectItem.unit}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Target Project</label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Quantity ({addToProjectItem.unit}s)</label>
                <input
                  type="number"
                  min="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                  required
                />
              </div>

              <div className="text-slate-600 text-right">
                Estimated Line Cost:{' '}
                <span className="font-normal text-slate-900">
                  ${(addQuantity * addToProjectItem.rate).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddToProjectItem(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white rounded font-normal"
                >
                  Confirm & Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create New Master Item (+ Button) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-[#003049]" />
                <h3 className="text-sm font-normal text-slate-900">
                  Create New Catalog Record
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItemSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Item Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['material', 'product', 'service'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewItemType(t)}
                      className={`py-1 text-center rounded border capitalize ${
                        newItemType === t
                          ? 'bg-[#003049] text-white border-[#003049]'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Inconel 718 Bar or 5-Axis Milling Machine Module"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Custom Code / ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={newItemCode}
                    onChange={(e) => setNewItemCode(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Structural Metals"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1">Retail Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="pcs, kg, sheet, per_hour"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Assigned Supplier / Partner</label>
                <select
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#003049]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#003049] hover:bg-[#002235] text-white rounded font-normal"
                >
                  Create Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL & CSV BULK IMPORT WIZARD (MASTER DATASETS & SUBCATEGORY WISE) */}
      <DataImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        defaultEntity="materials"
        categoryScope={columnSearch.category || selectedCategories[0] || ''}
        materials={materials}
        produceItems={produceItems}
        suppliers={suppliers}
        subcontractors={subcontractors}
        outsourcedServices={services}
        onImportMaterials={(items) => {
          items.forEach((m) => {
            if (onAddNewItem) {
              onAddNewItem(m);
            }
          });
          showToast(`Imported ${items.length} materials into catalog`);
        }}
        onImportProduce={(items) => {
          items.forEach((p) => {
            if (onAddNewItem) onAddNewItem(p);
          });
          showToast(`Imported ${items.length} produce products / assemblies`);
        }}
        onImportSubcontractors={(subs) => {
          subs.forEach((s) => {
            if (onAddNewItem) onAddNewItem(s);
          });
          showToast(`Imported ${subs.length} subcontractor labor rates`);
        }}
        onImportOutsourced={(svcs) => {
          svcs.forEach((s) => {
            if (onAddNewItem) onAddNewItem(s);
          });
          showToast(`Imported ${svcs.length} outsourced services`);
        }}
        onNotification={(msg) => showToast(msg)}
      />

      {/* Item Image Lightbox Modal */}
      <ItemImageViewerModal
        isOpen={!!activeImageViewerItem}
        onClose={() => setActiveImageViewerItem(null)}
        item={activeImageViewerItem}
        onImageUpdated={(newUrl) => {
          if (activeImageViewerItem) {
            activeImageViewerItem.imageUrl = newUrl;
          }
          setNotification('Item image updated successfully');
          setTimeout(() => setNotification(null), 3000);
        }}
      />

      {/* FULL-SCREEN PRICE CHANGES AUDIT LOG FXTT GRID VIEW */}
      {fullScreenAuditItem && (
        <FXTTPriceAuditLogFullScreenModal
          isOpen={!!fullScreenAuditItem}
          onClose={() => setFullScreenAuditItem(null)}
          item={fullScreenAuditItem}
          onOpenItemDetails={(cardItem) => {
            setFullScreenAuditItem(null);
            setDetailsModalItem({ item: cardItem, tab: 'details' });
          }}
        />
      )}

      {/* ITEM DETAILS & PRICE AUDIT DETAILS MODAL */}
      {detailsModalItem && (
        <ItemDetailsAndPriceAuditModal
          isOpen={!!detailsModalItem}
          onClose={() => setDetailsModalItem(null)}
          item={detailsModalItem.item}
          initialTab={detailsModalItem.tab}
          onUpdatePrice={(id, newPrice, reason) => {
            if (onUpdateMaterialPrice) {
              onUpdateMaterialPrice(id, newPrice, reason);
            } else if (onUpdateServiceRate) {
              onUpdateServiceRate(id, newPrice, reason, 'Master Grid Pricing Lead');
            }
            showToast(`Price updated for item ${id}`);
          }}
        />
      )}

      {/* GOOGLE & GOOGLE LENS QUICK SEARCH PREVIEW MODAL */}
      {googleSearchItem && (
        <GoogleSearchPreviewModal
          isOpen={Boolean(googleSearchItem)}
          onClose={() => setGoogleSearchItem(null)}
          item={googleSearchItem}
        />
      )}
    </div>
  );
};
