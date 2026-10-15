/**
 * Excel (.xlsx, .xls) and CSV Import Utility using SheetJS (xlsx)
 * Supports parsing, validation, column normalization, and template generation
 */

import * as XLSX from 'xlsx';
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

export type ImportEntityType =
  | 'materials'
  | 'produce'
  | 'suppliers'
  | 'subcontractors'
  | 'outsourced'
  | 'inventory'
  | 'price_history'
  | 'project_cost_items';

export interface ImportProcessingOptions {
  mode?: 'master' | 'subcategory';
  category?: string;
  subCategory?: string;
  moreSubCategory?: string;
  forceSubcategory?: boolean;
}

export interface ParsedImportResult<T = any> {
  success: boolean;
  totalRows: number;
  validRows: T[];
  errors: string[];
  rawHeaders: string[];
  samplePreview: any[];
  targetCategory?: string;
  targetSubCategory?: string;
}

/**
 * Normalizes an object's keys to lowercase alphanumeric with no spaces/symbols
 */
function normalizeRowKeys(raw: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    const cleanKey = k
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    normalized[cleanKey] = v;
  }
  return normalized;
}

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Read and parse an Excel (.xlsx, .xls) or CSV File with a strict 10MB size limit
 */
export async function parseSpreadsheetFile(file: File): Promise<{
  sheetName: string;
  rawHeaders: string[];
  rawRows: Record<string, any>[];
}> {
  // Validate file existence
  if (!file) {
    throw new Error('No file was provided for upload.');
  }

  // Strict 10MB file size limit check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `File size (${sizeMB} MB) exceeds the 10 MB maximum upload limit. Please select a CSV or Excel file under 10 MB from your device.`
    );
  }

  // Validate non-empty file
  if (file.size === 0) {
    throw new Error('The selected file is empty (0 bytes). Please select a valid CSV or spreadsheet file.');
  }

  const buffer = await file.arrayBuffer();
  // Pass codepage 65001 for UTF-8 CSV compatibility
  const workbook = XLSX.read(buffer, { type: 'array', codepage: 65001, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No worksheets found in uploaded file');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse rows as array of objects using headers from first row
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  // Extract raw headers from row 1
  const headerData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const rawHeaders: string[] = (headerData[0] || []).map(h => String(h).trim());

  return {
    sheetName: firstSheetName,
    rawHeaders,
    rawRows
  };
}

/**
 * 1. Transform raw rows into typed MaterialItems
 */
export function processMaterialsImport(
  rawRows: Record<string, any>[],
  options?: ImportProcessingOptions
): ParsedImportResult<Partial<MaterialItem>> {
  const validRows: Partial<MaterialItem>[] = [];
  const errors: string[] = [];

  const targetCategory = options?.category;
  const targetSubCategory = options?.subCategory;
  const targetMoreSubCategory = options?.moreSubCategory;
  const force = options?.forceSubcategory || false;

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const code = norm['itemcode'] || norm['code'] || norm['sku'] || norm['id'] || `MAT-IMP-${Date.now() + idx}`;
    const name = norm['itemname'] || norm['name'] || norm['title'] || norm['description'];

    if (!name) {
      errors.push(`Row ${idx + 2}: Missing required Item Name`);
      return;
    }

    const price = Number(norm['retailprice'] || norm['price'] || norm['unitcost'] || norm['rate'] || 100);
    const inStock = Number(norm['instock'] || norm['stock'] || norm['quantity'] || 50);

    const resolvedCategory = (force && targetCategory)
      ? targetCategory
      : norm['category'] || targetCategory || 'Metals & Structural Alloys';

    const resolvedSubCategory = (force && targetSubCategory)
      ? targetSubCategory
      : norm['subcategory'] || targetSubCategory || 'General Specification';

    const resolvedMoreSubCategory = (force && targetMoreSubCategory)
      ? targetMoreSubCategory
      : norm['moresubcategory'] || targetMoreSubCategory || resolvedSubCategory;

    const item: Partial<MaterialItem> = {
      id: `mat-imp-${Date.now()}-${idx}`,
      code: String(code).trim(),
      name: String(name).trim(),
      category: resolvedCategory,
      subCategory: resolvedSubCategory,
      moreSubCategory: resolvedMoreSubCategory,
      itemClassification: norm['classification'] === 'final_product' ? 'final_product' : 'raw_material',
      supplierName: norm['suppliername'] || norm['supplier'] || 'Standard Industrial Supplier',
      unit: norm['unit'] || 'pcs',
      retailPrice: isNaN(price) ? 100 : price,
      defaultDiscountPct: Number(norm['defaultdiscountpct'] || norm['discount'] || 5),
      inStock: isNaN(inStock) ? 50 : inStock,
      reorderPoint: Number(norm['reorderpoint'] || 15),
      leadTimeDays: Number(norm['leadtimedays'] || norm['leadtime'] || 7),
      lastUpdated: new Date().toISOString().slice(0, 10),
      priceHistory: [
        {
          id: `hist-imp-${Date.now()}-${idx}`,
          date: new Date().toISOString().slice(0, 10),
          previousPrice: isNaN(price) ? 100 : price,
          newPrice: isNaN(price) ? 100 : price,
          changePct: 0,
          reason: options?.mode === 'subcategory' ? `Imported into ${resolvedSubCategory}` : 'Imported via Excel / CSV batch data ingestion',
          updatedBy: 'Import Wizard'
        }
      ]
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5),
    targetCategory,
    targetSubCategory
  };
}

/**
 * 2. Transform raw rows into ProduceItems (Master Dataset or Subcategory)
 */
export function processProduceImport(
  rawRows: Record<string, any>[],
  options?: ImportProcessingOptions
): ParsedImportResult<Partial<ProduceItem>> {
  const validRows: Partial<ProduceItem>[] = [];
  const errors: string[] = [];

  const targetCategory = options?.category;
  const targetSubCategory = options?.subCategory;
  const targetMoreSubCategory = options?.moreSubCategory;
  const force = options?.forceSubcategory || false;

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const code = norm['productcode'] || norm['code'] || norm['id'] || `PRD-IMP-${Date.now() + idx}`;
    const name = norm['itemname'] || norm['name'] || norm['productname'] || norm['title'];

    if (!name) {
      errors.push(`Row ${idx + 2}: Missing required Product Name`);
      return;
    }

    const cost = Number(norm['costprice'] || norm['cost'] || 5000);
    const retail = Number(norm['retailprice'] || norm['retail'] || norm['quotedprice'] || (cost * 1.35));

    const resolvedCategory = (force && targetCategory)
      ? targetCategory
      : norm['category'] || targetCategory || 'Industrial Automation & Robotics';

    const resolvedSubCategory = (force && targetSubCategory)
      ? targetSubCategory
      : norm['subcategory'] || targetSubCategory || 'Turnkey Machinery Systems';

    const resolvedMoreSubCategory = (force && targetMoreSubCategory)
      ? targetMoreSubCategory
      : norm['moresubcategory'] || targetMoreSubCategory || resolvedSubCategory;

    const item: Partial<ProduceItem> = {
      id: `prod-imp-${Date.now()}-${idx}`,
      code: String(code).trim(),
      name: String(name).trim(),
      type: (norm['type'] || 'product').toLowerCase().includes('serv') ? 'service' : 'product',
      category: resolvedCategory,
      subCategory: resolvedSubCategory,
      moreSubCategory: resolvedMoreSubCategory,
      unit: norm['unit'] || 'system',
      costPrice: isNaN(cost) ? 5000 : cost,
      retailPrice: isNaN(retail) ? 7500 : retail,
      defaultDiscountPct: Number(norm['defaultdiscountpct'] || norm['discount'] || 5),
      leadTimeDays: Number(norm['leadtimedays'] || norm['leadtime'] || 30),
      status: 'Active',
      lastUpdated: new Date().toISOString().slice(0, 10),
      priceHistory: [
        {
          id: `pph-imp-${Date.now()}-${idx}`,
          date: new Date().toISOString().slice(0, 10),
          previousPrice: isNaN(retail) ? 7500 : retail,
          newPrice: isNaN(retail) ? 7500 : retail,
          changePct: 0,
          reason: options?.mode === 'subcategory' ? `Imported into ${resolvedSubCategory}` : 'Initial import via Excel / CSV batch sheet',
          updatedBy: 'Commercial Import Wizard'
        }
      ]
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5)
  };
}

/**
 * 3. Transform raw rows into Suppliers
 */
export function processSuppliersImport(rawRows: Record<string, any>[]): ParsedImportResult<Partial<Supplier>> {
  const validRows: Partial<Supplier>[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const name = norm['companyname'] || norm['name'] || norm['suppliername'] || norm['supplier'];

    if (!name) {
      errors.push(`Row ${idx + 2}: Missing required Company Name`);
      return;
    }

    const item: Partial<Supplier> = {
      id: `sup-imp-${Date.now()}-${idx}`,
      name: String(name).trim(),
      contactPerson: norm['contactperson'] || norm['contact'] || 'Procurement Representative',
      email: norm['email'] || 'contact@supplier.com',
      phone: norm['phone'] || '+1 (555) 000-0000',
      category: (norm['category'] as any) || 'Materials',
      supplyScope: (norm['supplyscope'] as any) || 'materials',
      paymentTerms: norm['paymentterms'] || norm['terms'] || 'Net 30',
      rating: Number(norm['rating'] || 4.8),
      onTimeDeliveryPct: Number(norm['ontimedeliverypct'] || norm['ontime'] || 96),
      qualityScorePct: Number(norm['qualityscorepct'] || norm['quality'] || 98),
      status: 'Active',
      country: norm['country'] || 'United States',
      city: norm['city'] || 'Chicago, IL',
      notes: norm['notes'] || 'Imported supplier partner record'
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5)
  };
}

/**
 * 4. Transform raw rows into SubcontractorRateItem
 */
export function processSubcontractorsImport(
  rawRows: Record<string, any>[],
  options?: ImportProcessingOptions
): ParsedImportResult<Partial<SubcontractorRateItem>> {
  const validRows: Partial<SubcontractorRateItem>[] = [];
  const errors: string[] = [];

  const targetCategory = options?.category;
  const targetSubCategory = options?.subCategory;
  const force = options?.forceSubcategory || false;

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const serviceName = norm['servicename'] || norm['name'] || norm['trade'] || norm['title'];

    if (!serviceName) {
      errors.push(`Row ${idx + 2}: Missing required Trade / Service Name`);
      return;
    }

    const rate = Number(norm['hourlybaserate'] || norm['rate'] || norm['baserate'] || norm['cost'] || 120);
    const retail = Number(norm['retailquotedrate'] || norm['retailrate'] || norm['quotedrate'] || (rate * 1.3));

    const resolvedCategory = (force && targetCategory)
      ? targetCategory
      : norm['tradecategory'] || norm['category'] || targetCategory || 'Fabrication';

    const resolvedSubCategory = (force && targetSubCategory)
      ? targetSubCategory
      : norm['tradesubcategory'] || norm['subcategory'] || targetSubCategory || 'Specialist Labour';

    const item: Partial<SubcontractorRateItem> = {
      id: `sub-imp-${Date.now()}-${idx}`,
      code: norm['ratecode'] || norm['code'] || `SUB-IMP-${Date.now() + idx}`,
      name: String(serviceName).trim(),
      serviceType: String(serviceName).trim(),
      subcontractorName: norm['subcontractorfirm'] || norm['subcontractor'] || norm['firm'] || 'Certified Contracting Group',
      category: resolvedCategory,
      subCategory: resolvedSubCategory,
      baseRate: isNaN(rate) ? 120 : rate,
      rate: isNaN(rate) ? 120 : rate,
      retailRate: isNaN(retail) ? 150 : retail,
      unit: norm['billingunit'] || norm['unit'] || 'per_hour',
      skillLevel: norm['skilllevel'] || 'Certified Senior Specialist',
      lastUpdated: new Date().toISOString().slice(0, 10),
      priceHistory: [
        {
          id: `sub-hist-imp-${Date.now()}-${idx}`,
          date: new Date().toISOString().slice(0, 10),
          previousRate: isNaN(rate) ? 120 : rate,
          newRate: isNaN(rate) ? 120 : rate,
          reason: options?.mode === 'subcategory' ? `Imported into ${resolvedSubCategory}` : 'Imported via labour tariff batch',
          updatedBy: 'Labour Estimator'
        }
      ]
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5),
    targetCategory,
    targetSubCategory
  };
}

/**
 * 5. Transform raw rows into OutsourcedService
 */
export function processOutsourcedImport(
  rawRows: Record<string, any>[],
  options?: ImportProcessingOptions
): ParsedImportResult<Partial<OutsourcedService>> {
  const validRows: Partial<OutsourcedService>[] = [];
  const errors: string[] = [];

  const targetCategory = options?.category;
  const targetSubCategory = options?.subCategory;
  const force = options?.forceSubcategory || false;

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const name = norm['servicename'] || norm['name'] || norm['title'];

    if (!name) {
      errors.push(`Row ${idx + 2}: Missing required Service Name`);
      return;
    }

    const rate = Number(norm['basecontractrate'] || norm['rate'] || norm['tariff'] || 5);
    const retail = Number(norm['retailprice'] || norm['retail'] || (rate * 1.25));

    const resolvedCategory = (force && targetCategory)
      ? targetCategory
      : norm['sectorcategory'] || norm['category'] || targetCategory || 'Heavy Transportation & Logistics';

    const resolvedSubCategory = (force && targetSubCategory)
      ? targetSubCategory
      : norm['subcategory'] || targetSubCategory || 'Freight & Haulage';

    const item: Partial<OutsourcedService> = {
      id: `svc-imp-${Date.now()}-${idx}`,
      code: norm['servicecode'] || norm['code'] || `SRV-IMP-${Date.now() + idx}`,
      name: String(name).trim(),
      providerName: norm['providername'] || norm['provider'] || 'Global Utility Logistics',
      category: resolvedCategory,
      subCategory: resolvedSubCategory,
      baseUnitType: norm['unittype'] || norm['unit'] || 'per_km',
      rate: isNaN(rate) ? 5 : rate,
      retailPrice: isNaN(retail) ? 6.5 : retail,
      slaLevel: norm['slalevel'] || norm['sla'] || 'Premium 99.9%',
      lastUpdated: new Date().toISOString().slice(0, 10),
      priceHistory: [
        {
          id: `out-hist-${Date.now()}-${idx}`,
          date: new Date().toISOString().slice(0, 10),
          oldRate: isNaN(rate) ? 5 : rate,
          newRate: isNaN(rate) ? 5 : rate,
          reason: options?.mode === 'subcategory' ? `Imported into ${resolvedSubCategory}` : 'Tariff imported via bulk file',
          updatedBy: 'SLA Auditor'
        }
      ]
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5),
    targetCategory,
    targetSubCategory
  };
}

/**
 * 6. Transform raw rows into InventoryItem
 */
export function processInventoryImport(rawRows: Record<string, any>[]): ParsedImportResult<Partial<InventoryItem>> {
  const validRows: Partial<InventoryItem>[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const sku = norm['sku'] || norm['code'] || `SKU-IMP-${Date.now() + idx}`;
    const name = norm['itemname'] || norm['name'] || 'Inventory Item Spec';

    const onHand = Number(norm['currentonhand'] || norm['onhand'] || norm['stock'] || 100);
    const cost = Number(norm['unitcost'] || norm['cost'] || norm['price'] || 50);

    const item: Partial<InventoryItem> = {
      id: `inv-imp-${Date.now()}-${idx}`,
      sku: String(sku).trim(),
      itemName: String(name).trim(),
      name: String(name).trim(),
      category: norm['category'] || 'Structural Raw Metals',
      onHand: isNaN(onHand) ? 100 : onHand,
      currentStock: isNaN(onHand) ? 100 : onHand,
      reserved: Number(norm['allocatedreserved'] || norm['reserved'] || 0),
      available: isNaN(onHand) ? 100 : onHand,
      reorderLevel: Number(norm['reorderlevel'] || 20),
      unitCost: isNaN(cost) ? 50 : cost,
      location: norm['location'] || 'Warehouse Bay 4B',
      status: 'Optimal Stock',
      lastMovementDate: new Date().toISOString().slice(0, 10)
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5)
  };
}

/**
 * 7. Transform raw rows into Price History Records (for existing items)
 */
export function processPriceHistoryImport(rawRows: Record<string, any>[]): ParsedImportResult<{
  itemCode: string;
  record: PriceHistoryRecord;
}> {
  const validRows: { itemCode: string; record: PriceHistoryRecord }[] = [];
  const errors: string[] = [];

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const itemCode = norm['itemcode'] || norm['code'] || norm['skucode'] || norm['sku'];

    if (!itemCode) {
      errors.push(`Row ${idx + 2}: Missing required Item Code`);
      return;
    }

    const prevPrice = Number(norm['previousrate'] || norm['previousprice'] || norm['oldprice'] || norm['oldrate'] || 0);
    const newPrice = Number(norm['newapprovedrate'] || norm['newrate'] || norm['newprice'] || norm['rate'] || norm['price'] || 0);
    const changePct = Number(
      norm['variance'] ||
      norm['variation'] ||
      (prevPrice > 0 ? (((newPrice - prevPrice) / prevPrice) * 100).toFixed(2) : 0)
    );

    const record: PriceHistoryRecord = {
      id: `hist-imp-${Date.now()}-${idx}`,
      date: norm['revisiondate'] || norm['date'] || new Date().toISOString().slice(0, 10),
      previousPrice: isNaN(prevPrice) ? 0 : prevPrice,
      newPrice: isNaN(newPrice) ? 0 : newPrice,
      changePct: isNaN(changePct) ? 0 : changePct,
      reason: norm['changereasonbusinessjustification'] || norm['reason'] || norm['justification'] || 'Bulk audited price adjustment',
      updatedBy: norm['authorizedauditorapprovedby'] || norm['auditor'] || norm['updatedby'] || 'Import Audit Engine'
    };

    validRows.push({
      itemCode: String(itemCode).trim(),
      record
    });
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5)
  };
}

/**
 * 8. Transform raw rows into typed ProjectCostItems for Project Budgetary Plans
 */
export function processProjectCostItemsImport(
  rawRows: Record<string, any>[],
  options?: ImportProcessingOptions & { defaultPhaseId?: string }
): ParsedImportResult<ProjectCostItem> {
  const validRows: ProjectCostItem[] = [];
  const errors: string[] = [];

  const targetCategory = options?.category;
  const targetSubCategory = options?.subCategory;
  const force = options?.forceSubcategory || false;
  const phaseId = options?.defaultPhaseId || 'phase-01';

  rawRows.forEach((row, idx) => {
    const norm = normalizeRowKeys(row);
    const code = norm['itemcode'] || norm['code'] || norm['sku'] || `ITEM-PLAN-${Date.now() + idx}`;
    const name = norm['itemname'] || norm['name'] || norm['description'] || norm['title'];

    if (!name) {
      errors.push(`Row ${idx + 2}: Missing required Item Name`);
      return;
    }

    // Determine type: material, subcontractor, or outsourced
    const rawType = (norm['type'] || norm['itemtype'] || norm['classification'] || 'material').toLowerCase();
    let type: 'material' | 'subcontractor' | 'outsourced' = 'material';
    if (rawType.includes('sub') || rawType.includes('labor') || rawType.includes('trade')) {
      type = 'subcontractor';
    } else if (rawType.includes('out') || rawType.includes('serv') || rawType.includes('tariff')) {
      type = 'outsourced';
    } else {
      type = 'material';
    }

    const resolvedCategory = (force && targetCategory)
      ? targetCategory
      : norm['category'] || targetCategory || 'Engineering Materials';

    const resolvedSubCategory = (force && targetSubCategory)
      ? targetSubCategory
      : norm['subcategory'] || targetSubCategory || 'Direct Specifications';

    const qty = Math.max(0.001, Number(norm['quantity'] || norm['qty'] || 1));
    const unitCost = Math.max(0, Number(norm['unitcost'] || norm['rate'] || norm['cost'] || norm['price'] || 0));
    const discountPct = Math.max(0, Math.min(100, Number(norm['discountpct'] || norm['discount'] || 0)));
    const totalCost = Number((qty * unitCost * (1 - discountPct / 100)).toFixed(2));
    const markupPct = Number(norm['markuppct'] || norm['markup'] || 25);
    const billableRate = Number((unitCost * (1 + markupPct / 100)).toFixed(2));
    const totalRevenue = Number((qty * billableRate).toFixed(2));
    const grossProfit = Number((totalRevenue - totalCost).toFixed(2));

    const item: ProjectCostItem = {
      id: `cost-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      phaseId,
      type,
      itemId: String(code).trim(),
      name: String(name).trim(),
      category: `${resolvedCategory} — ${resolvedSubCategory}`,
      supplierOrProvider: norm['supplierorprovider'] || norm['supplier'] || norm['provider'] || norm['vendor'] || 'Approved Vendor',
      quantity: qty,
      unit: norm['unit'] || (type === 'subcontractor' ? 'hr' : 'pcs'),
      unitCost,
      discountPct,
      totalCost,
      billableRate,
      totalRevenue,
      grossProfit,
      markupPct
    };

    validRows.push(item);
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
    rawHeaders: Object.keys(rawRows[0] || {}),
    samplePreview: validRows.slice(0, 5),
    targetCategory,
    targetSubCategory
  };
}

/**
 * Download a Starter Sample CSV or Excel Template
 */
export function downloadSampleTemplate(
  type: ImportEntityType,
  format: 'csv' | 'xlsx' = 'csv',
  options?: ImportProcessingOptions
): void {
  let headers: string[] = [];
  let sampleRows: (string | number)[][] = [];
  let filename = `Template_${type}`;

  const isSubMode = options?.mode === 'subcategory';
  const sampleCat = options?.category || 'Metals & Structural Alloys';
  const sampleSub = options?.subCategory || 'Aircraft & Marine Alloys';

  switch (type) {
    case 'project_cost_items':
      headers = [
        'Item Code',
        'Item Name',
        'Type',
        'Category',
        'SubCategory',
        'Supplier or Provider',
        'Quantity',
        'Unit',
        'Unit Cost',
        'Discount %',
        'Markup %'
      ];
      sampleRows = [
        ['MAT-ALUM-7075-T6', `Aerospace 7075 Billet (${sampleSub})`, 'material', sampleCat, sampleSub, 'Apex Alloy Mills', 10, 'kg', 145.00, 5, 30],
        ['SUB-CNC-5AXIS', '5-Axis Precision Milling Machinist', 'subcontractor', 'Fabrication & Specialized Labour', 'Precision 5-Axis CNC Machining', 'Titan Precision Trade', 24, 'hr', 120.00, 0, 35],
        ['SRV-ANODIZE-HARD', 'Type III Hardcoat Mil-A-8625 Anodizing', 'outsourced', 'Quality & NDT Inspection', 'Surface Finishing Tariffs', 'Veritas Surface Technologies', 10, 'pcs', 65.00, 0, 25]
      ];
      filename = isSubMode ? `Project_Cost_Items_Subcategory_${sampleSub.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Project_Plan_Cost_Items_Template';
      break;
    case 'materials':
      headers = [
        'Item Code',
        'Item Name',
        'Category',
        'SubCategory',
        'Classification',
        'Supplier Name',
        'Retail Price',
        'Unit',
        'Default Discount %',
        'In Stock',
        'Reorder Point',
        'Lead Time Days'
      ];
      sampleRows = [
        ['MAT-001', `Premium Stock Item A (${sampleSub})`, sampleCat, sampleSub, 'raw_material', 'Standard Supplier Ltd', 340.50, 'pcs', 5, 85, 20, 7],
        ['MAT-002', `Standard Stock Item B (${sampleSub})`, sampleCat, sampleSub, 'raw_material', 'Certified Industrial Vendor', 680.00, 'pcs', 7.5, 40, 10, 14]
      ];
      filename = isSubMode ? `Materials_Subcategory_${sampleSub.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Materials_Import_Template';
      break;

    case 'produce':
      headers = [
        'Product Code',
        'Item Name',
        'Type',
        'Category',
        'SubCategory',
        'Unit',
        'Cost Price',
        'Retail / Quoted Price',
        'Lead Time Days'
      ];
      sampleRows = [
        ['PRD-001', `Standard Produced Unit 1 (${sampleSub})`, 'product', sampleCat, sampleSub, 'unit', 4500, 6800, 21],
        ['PRD-002', `Precision Calibrated Unit 2 (${sampleSub})`, 'product', sampleCat, sampleSub, 'unit', 8500, 12500, 30]
      ];
      filename = isSubMode ? `Products_Subcategory_${sampleSub.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Produce_Products_Services_Template';
      break;

    case 'suppliers':
      headers = [
        'Company Name',
        'Category',
        'Supply Scope',
        'Contact Person',
        'Email',
        'Phone',
        'Country',
        'City',
        'Payment Terms',
        'Rating'
      ];
      sampleRows = [
        ['Titan Heavy Metallurgy LLC', 'Materials', 'materials', 'Robert Sterling', 'r.sterling@titanheavy.com', '+1 (415) 890-2100', 'United States', 'Pittsburgh, PA', 'Net 30', 4.9],
        ['Precision Global Logistics', 'Outsourced', 'service', 'Maria Elena Santos', 'ops@precisionglobal.com', '+1 (713) 555-8921', 'United States', 'Houston, TX', 'Net 15', 4.8]
      ];
      filename = 'Suppliers_Directory_Template';
      break;

    case 'subcontractors':
      headers = [
        'Rate Code',
        'Service Name',
        'Trade Category',
        'Trade SubCategory',
        'Subcontractor Firm',
        'Hourly / Base Rate',
        'Retail Quoted Rate',
        'Billing Unit',
        'Skill Level'
      ];
      sampleRows = [
        ['SUB-001', `Certified Specialist Trade 1 (${sampleSub})`, sampleCat, sampleSub, 'Alliance Heavy Contracting', 145, 185, 'per_hour', 'ASME Section IX Certified'],
        ['SUB-002', `Certified Senior Specialist 2 (${sampleSub})`, sampleCat, sampleSub, 'Apex Technical Services', 160, 210, 'per_hour', 'Master Specialist']
      ];
      filename = isSubMode ? `Subcontractors_Subcategory_${sampleSub.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Subcontractor_Labour_Rates_Template';
      break;

    case 'outsourced':
      headers = [
        'Service Code',
        'Service Name',
        'Sector / Category',
        'SubCategory',
        'Provider Name',
        'Unit Type',
        'Base Contract Rate',
        'Retail Price',
        'SLA Level'
      ];
      sampleRows = [
        ['SRV-001', `Dedicated Outsourced Service 1 (${sampleSub})`, sampleCat, sampleSub, 'Trans-Continental Haulers', 'per_km', 6.80, 8.50, 'Premium 99.9%'],
        ['SRV-002', `High-Precision Outsourced Service 2 (${sampleSub})`, sampleCat, sampleSub, 'Veritas Analytical Labs', 'per_test', 450, 600, 'Mission Critical 24/7']
      ];
      filename = isSubMode ? `Outsourced_Subcategory_${sampleSub.replace(/[^a-zA-Z0-9]/g, '_')}` : 'Outsourced_Services_Template';
      break;

    case 'inventory':
      headers = [
        'SKU',
        'Item Name',
        'Category',
        'Current On Hand',
        'Allocated / Reserved',
        'Reorder Level',
        'Unit Cost',
        'Location'
      ];
      sampleRows = [
        ['SKU-ALUM-6061-T6', '6061-T6 Aluminum Billet (120mm)', 'Structural Raw Metals', 150, 25, 30, 48.50, 'Warehouse Sector 2 - Rack A3'],
        ['SKU-SS-316L-PIPE', '316L Seamless Stainless Hydraulic Tubing', 'Plumbing & Hydraulic Tubing', 80, 10, 15, 92.00, 'Warehouse Sector 4 - Bin 12']
      ];
      filename = 'Inventory_Stock_Template';
      break;

    case 'price_history':
      headers = [
        'Item Code',
        'Revision Date',
        'Previous Rate ($)',
        'New Approved Rate ($)',
        'Variance (%)',
        'Change Reason / Business Justification',
        'Authorized Auditor / Approved By'
      ];
      sampleRows = [
        ['MAT-ALUM-7075', '2026-03-01', 320.00, 340.50, 6.4, 'London Metal Exchange aluminum index baseline escalation', 'Sarah Jenkins (Chief Auditor)'],
        ['MAT-TIT-GR5', '2026-02-15', 650.00, 680.00, 4.6, 'Aerospace alloy raw sponge supply tariff adjustment', 'Marcus Vance (Commercial Director)']
      ];
      filename = 'Price_History_Audit_Template';
      break;
  }

  if (format === 'xlsx') {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } else {
    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(','),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
